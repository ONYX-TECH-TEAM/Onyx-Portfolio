import { WebGLRenderTarget } from 'three'

import {
    snapshotResources,
    startWarmupDiagnostic,
} from './webglWarmupDiagnostics.js'

function collectTextures(root) {
    const textures = new Set()

    root.traverse((object) => {
        if (!object.isMesh || !object.material) return

        const materials = Array.isArray(object.material)
            ? object.material
            : [object.material]

        for (const material of materials) {
            for (const value of Object.values(material)) {
                if (value?.isTexture) textures.add(value)
            }
        }
    })

    return textures
}

function temporarilyShow(object, visibility) {
    if (!visibility.has(object)) visibility.set(object, object.visible)
    object.visible = true
    object.children.forEach((child) => temporarilyShow(child, visibility))
}

/** Compile, initialize textures, and submit the mounted production path. */
export async function warmProductionRenderPath({
    name,
    renderer,
    scene,
    camera,
    extraObjects = [],
    extraLights = [],
}) {
    const finishDiagnostic = startWarmupDiagnostic(
        name,
        scene,
        renderer,
        {
            target: 'mounted production scene and candidate state resources',
            extraObjects: extraObjects.map((object) => object.uuid),
            extraLights: extraLights.map((light) => light.uuid),
            beforeResources: snapshotResources(scene, renderer),
        },
    )

    const visibility = new Map()
    const frustumCulling = new Map()
    const textures = new Set()
    let renderTarget = null
    const previousRenderTarget = renderer.getRenderTarget()
    const previousAutoClear = renderer.autoClear
    let succeeded = false
    let warmedResources = null

    const rememberVisibility = (object) => {
        if (!visibility.has(object)) visibility.set(object, object.visible)
    }

    try {
        for (const object of extraObjects) {
            if (!object) continue
            temporarilyShow(object, visibility)
            object.traverse((child) => {
                if (child.isMesh) {
                    frustumCulling.set(child, child.frustumCulled)
                    child.frustumCulled = false
                }
            })
        }

        for (const light of extraLights) {
            if (!light) continue
            rememberVisibility(light)
            light.visible = true
        }

        const compileReady = renderer.compileAsync(scene, camera, scene)
        for (const texture of collectTextures(scene)) textures.add(texture)
        for (const object of extraObjects) {
            if (object) {
                for (const texture of collectTextures(object)) textures.add(texture)
            }
        }
        for (const texture of textures) renderer.initTexture(texture)

        renderer.autoClear = true
        renderTarget = new WebGLRenderTarget(1, 1)
        renderer.setRenderTarget(renderTarget)
        renderer.render(scene, camera)
        renderer.autoClear = previousAutoClear
        warmedResources = snapshotResources(scene, renderer)
        succeeded = true

        // Visibility is restored before waiting for async shader readiness.
        for (const [object, visible] of visibility) object.visible = visible
        visibility.clear()

        await compileReady
    } catch (error) {
        console.warn(`[GPU warm-up] ${name} failed`, error)
    } finally {
        for (const [object, visible] of visibility) object.visible = visible
        for (const [mesh, wasCulled] of frustumCulling) mesh.frustumCulled = wasCulled
        renderer.setRenderTarget(previousRenderTarget)
        renderer.autoClear = previousAutoClear
        renderTarget?.dispose()

        finishDiagnostic({
            succeeded,
            meshCount: extraObjects.reduce((count, object) => {
                if (!object) return count
                let meshes = 0
                object.traverse((child) => {
                    if (child.isMesh) meshes += 1
                })
                return count + meshes
            }, 0),
            textureInitializationCalls: textures.size,
            extraObjectResources: extraObjects
                .filter(Boolean)
                .map((object) => snapshotResources(object, renderer)),
            sceneResourcesAfterWarmup: snapshotResources(scene, renderer),
            warmedResources,
        })
    }
}
