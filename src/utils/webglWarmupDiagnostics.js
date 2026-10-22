const DIAGNOSTICS_KEY =
    '__onyxGpuWarmupDiagnostics'

function getDiagnostics() {
    if (typeof window === 'undefined') {
        return null
    }

    if (!window[DIAGNOSTICS_KEY]) {
        window[DIAGNOSTICS_KEY] = {
            warmups: {},
            firstRenders: {},
            activeWarmups: new Set(),
            events: [],
            phase: null,
            context: null,
            restore: null,
            counters: {},
            nativeIds: new WeakMap(),
            textureObjectsByUuid: new Map(),
            textureUuidsByNativeId: new Map(),
            geometryUuidsByBufferId: new Map(),
            geometryCandidatesByByteLength: new Map(),
            boundTextures: new Map(),
            boundBuffers: new Map(),
            currentDraw: null,
            currentDrawMaterial: null,
            apiCounts: new Map(),
        }
    }

    return window[DIAGNOSTICS_KEY]
}

function nextMarkName(name) {
    const diagnostics = getDiagnostics()
    const count =
        (diagnostics.counters[name] ?? 0) + 1

    diagnostics.counters[name] = count

    return count === 1
        ? name
        : `${name}-${count}`
}

function getNativeId(diagnostics, object, prefix) {
    if (!object || typeof object !== 'object') {
        return null
    }

    let id = diagnostics.nativeIds.get(object)

    if (!id) {
        const key = `${prefix}Id`
        diagnostics.counters[key] =
            (diagnostics.counters[key] ?? 0) + 1
        id = `${prefix}${diagnostics.counters[key]}`
        diagnostics.nativeIds.set(object, id)
    }

    return id
}

function collectTextures(
    value,
    textures,
    textureReferences,
    visited,
) {
    if (!value || typeof value !== 'object') {
        return
    }

    if (value.isTexture) {
        textures.set(value.uuid, {
            uuid: value.uuid,
            type: value.constructor?.name ?? 'Texture',
            name: value.name ?? '',
            image: value.image
                ? {
                      width: value.image.width ?? null,
                      height: value.image.height ?? null,
                  }
                : null,
        })
        textureReferences.set(value.uuid, value)
        return
    }

    if (visited.has(value)) {
        return
    }
    visited.add(value)

    if (Array.isArray(value)) {
        for (const item of value) {
            collectTextures(
                item,
                textures,
                textureReferences,
                visited,
            )
        }
        return
    }

    if ('value' in value) {
        collectTextures(
            value.value,
            textures,
            textureReferences,
            visited,
        )
    }
}

export function snapshotResources(root, renderer) {
    const meshes = []
    const materials = new Map()
    const textures = new Map()
    const textureReferences = new Map()
    const geometries = new Map()
    const lights = []
    const textureNativeIds = []
    const geometryBufferIds = []
    const visited = new WeakSet()
    const diagnostics = getDiagnostics()

    if (!root) {
        return {
            meshes,
            lights,
            materials: [],
            textures: [],
            geometries: [],
            textureNativeIds,
            geometryBufferIds,
        }
    }

    root.traverseVisible((object) => {
        if (object.isLight) {
            lights.push({
                uuid: object.uuid,
                type: object.type,
                name: object.name ?? '',
                intensity: object.intensity ?? null,
            })
        }

        if (object.isMesh || object.isPoints || object.isLine) {
            const geometry = object.geometry
            const materialList = Array.isArray(object.material)
                ? object.material
                : [object.material]

            meshes.push({
                name: object.name || object.type,
                uuid: object.uuid,
                type: object.type,
                geometryUuid: geometry?.uuid ?? null,
                materialUuids: materialList
                    .filter(Boolean)
                    .map((material) => material.uuid),
            })

            if (geometry) {
                const attributeByteLengths = [
                    ...Object.entries(geometry.attributes ?? {}).map(
                        ([name, attribute]) => ({
                            name,
                            byteLength:
                                attribute.array?.byteLength ?? null,
                        }),
                    ),
                    ...(geometry.index
                        ? [{
                              name: 'index',
                              byteLength:
                                  geometry.index.array?.byteLength ?? null,
                          }]
                        : []),
                ]
                const attributes = [
                    ...Object.values(geometry.attributes ?? {}),
                    geometry.index,
                ].filter(Boolean)
                const bufferIds = []

                for (const attribute of attributes) {
                    const buffer = renderer?.properties
                        ?.get(attribute)?.buffer
                    const bufferId = getNativeId(
                        getDiagnostics(),
                        buffer,
                        'buffer',
                    )

                    if (bufferId) {
                        bufferIds.push(bufferId)
                        const geometryUuids =
                            diagnostics.geometryUuidsByBufferId.get(
                                bufferId,
                            ) ?? []
                        geometryUuids.push(geometry.uuid)
                        diagnostics.geometryUuidsByBufferId.set(
                            bufferId,
                            geometryUuids,
                        )
                    }
                }

                geometries.set(geometry.uuid, {
                    uuid: geometry.uuid,
                    type: geometry.type,
                    name: geometry.name ?? '',
                    attributes: Object.keys(
                        geometry.attributes ?? {},
                    ),
                    indexCount: geometry.index?.count ?? 0,
                    attributeByteLengths,
                    bufferIds,
                })
                for (const attribute of attributeByteLengths) {
                    if (!attribute.byteLength) continue
                    const candidates =
                        diagnostics.geometryCandidatesByByteLength.get(
                            attribute.byteLength,
                        ) ?? []
                    if (
                        !candidates.some(
                            (candidate) =>
                                candidate.geometryUuid === geometry.uuid &&
                                candidate.attribute === attribute.name,
                        )
                    ) {
                        candidates.push({
                            geometryUuid: geometry.uuid,
                            geometryName: geometry.name ?? '',
                            attribute: attribute.name,
                        })
                        diagnostics.geometryCandidatesByByteLength.set(
                            attribute.byteLength,
                            candidates,
                        )
                    }
                }
                geometryBufferIds.push(...bufferIds)
            }

            for (const material of materialList) {
                if (!material) continue

                const materialProperties =
                    renderer?.properties?.get(material)
                const materialPrograms =
                    materialProperties?.programs
                        ? [...materialProperties.programs].map(
                              (program) => ({
                                  nativeProgramId: getNativeId(
                                      diagnostics,
                                      program.program,
                                      'program',
                                  ),
                                  name: program.name,
                                  cacheKey: program.cacheKey,
                                  usedTimes: program.usedTimes,
                              }),
                          )
                        : []

                materials.set(material.uuid, {
                    uuid: material.uuid,
                    type: material.type,
                    name: material.name ?? '',
                    programCount:
                        materialPrograms.length,
                    programs: materialPrograms,
                })

                for (const value of Object.values(material)) {
                    collectTextures(
                        value,
                        textures,
                        textureReferences,
                        visited,
                    )
                }
                collectTextures(
                    material.uniforms,
                    textures,
                    textureReferences,
                    visited,
                )
            }
        }
    })

    for (const texture of textures.values()) {
        diagnostics.textureObjectsByUuid.set(
            texture.uuid,
            textureReferences.get(texture.uuid),
        )
        const nativeTexture = renderer?.properties
            ?.get(textureReferences.get(texture.uuid))
            ?.__webglTexture

        const nativeId = getNativeId(
            diagnostics,
            nativeTexture,
            'texture',
        )

        if (nativeId) {
            diagnostics.textureUuidsByNativeId.set(
                nativeId,
                texture.uuid,
            )
            textureNativeIds.push({
                uuid: texture.uuid,
                nativeId,
            })
        }
    }

    return {
        meshes,
        lights,
        materials: [...materials.values()],
        textures: [...textures.values()],
        geometries: [...geometries.values()],
        textureNativeIds,
        geometryBufferIds,
    }
}

function getRendererPrograms(renderer) {
    const diagnostics = getDiagnostics()

    return (renderer.info.programs ?? []).map((program) => ({
        nativeProgramId: getNativeId(
            diagnostics,
            program.program,
            'program',
        ),
        name: program.name,
        cacheKey: program.cacheKey,
        usedTimes: program.usedTimes,
        diagnostics: program.diagnostics,
    }))
}

function installContextHooks(renderer) {
    const diagnostics = getDiagnostics()
    if (!diagnostics || diagnostics.restore) return

    const context = renderer.getContext()
    diagnostics.context = context
    diagnostics.renderer = renderer
    const restorers = []

    if (typeof renderer.renderBufferDirect === 'function') {
        const originalDraw = renderer.renderBufferDirect
        renderer.renderBufferDirect = function (...args) {
            if (
                !diagnostics.phase &&
                diagnostics.activeWarmups.size === 0
            ) {
                return originalDraw.apply(this, args)
            }

            const previousDraw = diagnostics.currentDraw
            const previousMaterial =
                diagnostics.currentDrawMaterial
            const [, , geometry, material, object] = args
            diagnostics.currentDraw = {
                object: {
                    name: object?.name ?? object?.type ?? '',
                    uuid: object?.uuid ?? null,
                },
                geometry: {
                    name: geometry?.name ?? '',
                    uuid: geometry?.uuid ?? null,
                },
                material: {
                    name: material?.name ?? '',
                    uuid: material?.uuid ?? null,
                    type: material?.type ?? '',
                },
            }
            diagnostics.currentDrawMaterial = material

            try {
                return originalDraw.apply(this, args)
            } finally {
                diagnostics.currentDraw = previousDraw
                diagnostics.currentDrawMaterial =
                    previousMaterial
            }
        }
        restorers.push(() => {
            renderer.renderBufferDirect = originalDraw
        })
    }

    const record = (method, args, result) => {
        const frame = diagnostics.phase
        const phases = [...diagnostics.activeWarmups]
        if (!frame && phases.length === 0) return

        const bucket = frame ?? phases.join(',')
        const countKey = `${bucket}:${method}`
        const methodCount =
            (diagnostics.apiCounts.get(countKey) ?? 0) + 1
        diagnostics.apiCounts.set(countKey, methodCount)

        const event = {
            method,
            frame,
            phases,
            at: performance.now(),
            currentDraw: diagnostics.currentDraw,
        }

        const currentProgram = diagnostics.currentDrawMaterial
            ? renderer.properties
                  ?.get(diagnostics.currentDrawMaterial)
                  ?.currentProgram
            : null
        if (currentProgram) {
            event.currentProgram = {
                nativeProgramId: getNativeId(
                    diagnostics,
                    currentProgram.program,
                    'program',
                ),
                name: currentProgram.name,
                cacheKey: currentProgram.cacheKey,
                usedTimes: currentProgram.usedTimes,
            }
        }

        if (method === 'createProgram') {
            event.objectId = getNativeId(
                diagnostics,
                result,
                'program',
            )
        } else if (method === 'linkProgram' || method === 'getProgramInfoLog') {
            event.objectId = getNativeId(
                diagnostics,
                args[0],
                'program',
            )
        } else if (method === 'createShader') {
            event.objectId = getNativeId(
                diagnostics,
                result,
                'shader',
            )
        } else if (method === 'getShaderInfoLog') {
            event.objectId = getNativeId(
                diagnostics,
                args[0],
                'shader',
            )
        } else if (method === 'bindTexture') {
            const id = getNativeId(
                diagnostics,
                args[1],
                'texture',
            )
            diagnostics.boundTextures.set(args[0], id)
            for (const [uuid, texture] of diagnostics.textureObjectsByUuid) {
                if (
                    renderer.properties?.get(texture)
                        ?.__webglTexture === args[1]
                ) {
                    diagnostics.textureUuidsByNativeId.set(
                        id,
                        uuid,
                    )
                }
            }
        } else if (method === 'texSubImage2D') {
            const textureId = diagnostics.boundTextures.get(args[0])
            event.nativeTextureId = textureId ?? null
            event.textureUuid = textureId
                ? diagnostics.textureUuidsByNativeId.get(textureId) ?? null
                : null
            event.arguments = args.slice(0, 8).map((value) =>
                typeof value === 'object' ? '[object]' : value,
            )
        } else if (method === 'bindBuffer') {
            const id = getNativeId(
                diagnostics,
                args[1],
                'buffer',
            )
            diagnostics.boundBuffers.set(args[0], id)
        } else if (method === 'bufferData') {
            const bufferId = diagnostics.boundBuffers.get(args[0])
            event.nativeBufferId = bufferId ?? null
            event.geometryUuids = bufferId
                ? diagnostics.geometryUuidsByBufferId.get(bufferId) ?? []
                : []
            event.byteLength =
                typeof args[1] === 'number'
                    ? args[1]
                    : args[1]?.byteLength ?? null
            const candidates =
                diagnostics.geometryCandidatesByByteLength.get(
                    event.byteLength,
                ) ?? []
            event.candidateGeometryCount = candidates.length
            event.candidateGeometries = candidates.slice(0, 20)
        }

        if (
            (
                method === 'getProgramInfoLog' ||
                method === 'getShaderInfoLog' ||
                method === 'texSubImage2D' ||
                method === 'bufferData' ||
                method === 'linkProgram'
            ) &&
            methodCount <= 3
        ) {
            event.stack = new Error().stack
                ?.split('\n')
                .slice(2, 9)
        }

        if (diagnostics.events.length < 2000) {
            diagnostics.events.push(event)
        }
    }

    const methods = [
        'createProgram',
        'linkProgram',
        'getProgramInfoLog',
        'createShader',
        'getShaderInfoLog',
        'bindTexture',
        'texSubImage2D',
        'bindBuffer',
        'bufferData',
    ]

    for (const method of methods) {
        const original = context[method]
        if (typeof original !== 'function') continue

        const ownDescriptor = Object.getOwnPropertyDescriptor(
            context,
            method,
        )
        const wrapped = function (...args) {
            const result = original.apply(this, args)
            record(method, args, result)
            return result
        }

        try {
            Object.defineProperty(context, method, {
                configurable: true,
                writable: true,
                value: wrapped,
            })
            restorers.push(() => {
                if (ownDescriptor) {
                    Object.defineProperty(
                        context,
                        method,
                        ownDescriptor,
                    )
                } else {
                    delete context[method]
                }
            })
        } catch (error) {
            console.warn(
                `[Onyx GPU diagnostics] could not instrument ${method}`,
                error,
            )
        }
    }

    diagnostics.restore = () => {
        for (const restore of restorers.reverse()) restore()
        diagnostics.restore = null
        diagnostics.context = null
        diagnostics.renderer = null
    }
}

export function installWebGLWarmupDiagnostics(renderer) {
    installContextHooks(renderer)
}

export function startWarmupDiagnostic(name, root, renderer, details = {}) {
    const diagnostics = getDiagnostics()
    if (!diagnostics) return () => {}

    const startMark = nextMarkName(`${name}-warmup-start`)
    performance.mark(startMark)

    const resources = snapshotResources(root, renderer)
    diagnostics.activeWarmups.add(name)
    diagnostics.warmups[name] = {
        startMark,
        startedAt: performance.now(),
        startResources: resources,
        details,
        rendererProgramsAtStart:
            getRendererPrograms(renderer),
    }

    console.info(`[${name} warm-up] start`, {
        mark: startMark,
        ...details,
        resources,
    })

    return (completeDetails = {}) => {
        const warmup = diagnostics.warmups[name]
        const completeMark = nextMarkName(
            `${name}-warmup-complete`,
        )
        performance.mark(completeMark)
        performance.measure(
            `${name}-warmup-duration`,
            startMark,
            completeMark,
        )
        diagnostics.activeWarmups.delete(name)

        const completed = {
            ...warmup,
            completedAt: performance.now(),
            completeMark,
            endResources:
                completeDetails.warmedResources ??
                snapshotResources(root, renderer),
            rendererInfo: {
                programCount:
                    renderer.info.programs?.length ?? null,
                programs: getRendererPrograms(renderer),
                memory: { ...renderer.info.memory },
            },
            completeDetails,
            events: diagnostics.events.filter((event) =>
                event.phases?.includes(name),
            ),
        }
        diagnostics.warmups[name] = completed

        console.info(`[${name} warm-up] complete`, {
            mark: completeMark,
            elapsedMs:
                completed.completedAt - completed.startedAt,
            details: completeDetails,
            resources: completed.endResources,
            webglCalls: completed.events,
        })
    }
}

export function beginFirstRenderDiagnostic(
    name,
    visibleScene,
    renderer,
) {
    const diagnostics = getDiagnostics()
    if (!diagnostics || diagnostics.firstRenders[name]) return

    const mark = nextMarkName(
        `${name}-first-render-start`,
    )
    const resources = snapshotResources(
        visibleScene,
        renderer,
    )
    const startedAt = performance.now()
    const matchingWarmup = diagnostics.warmups[name] ?? null
    const warmupSnapshot = matchingWarmup
        ? {
              startedAt: matchingWarmup.startedAt,
              completedAt: matchingWarmup.completedAt ?? null,
              endResources: matchingWarmup.endResources ?? null,
          }
        : null
    const warmupCompletedBeforeRender = Boolean(
        warmupSnapshot?.completedAt !== null &&
        warmupSnapshot?.completedAt <= startedAt,
    )
    const firstRender = {
        mark,
        startedAt,
        resources,
        rendererInfo: {
            programs: getRendererPrograms(renderer),
            memory: { ...renderer.info.memory },
        },
    }

    if (warmupSnapshot) {
        Object.assign(firstRender, {
            warmupName: name,
            warmupSnapshot,
            warmupCompletedBeforeRender,
            warmupComparison: warmupCompletedBeforeRender
                ? compareResources(warmupSnapshot.endResources, resources)
                : null,
        })
    }

    diagnostics.firstRenders[name] = firstRender

    performance.mark(mark)
    diagnostics.phase = name

    requestAnimationFrame(() => {
        diagnostics.phase = null
        const endMark = nextMarkName(
            `${name}-first-render-end`,
        )
        performance.mark(endMark)
        performance.measure(
            `${name}-first-render-frame-window`,
            mark,
            endMark,
        )

        const result = diagnostics.firstRenders[name]
        result.completedAt = performance.now()
        result.endMark = endMark
        result.events = diagnostics.events.filter(
            (event) => event.frame === name,
        )
        result.rendererInfoAfter = {
            programs: getRendererPrograms(renderer),
            memory: { ...renderer.info.memory },
        }
        result.resourcesAfter = snapshotResources(
            visibleScene,
            renderer,
        )

        console.info(`[${name}] first visible render`, {
            mark,
            endMark,
            ...(result.warmupSnapshot
                ? {
                      warmupName: result.warmupName,
                      warmupCompletedBeforeRender:
                          result.warmupCompletedBeforeRender,
                      warmupCompletedAt:
                          result.warmupSnapshot.completedAt,
                      warmupComparison:
                          result.warmupComparison,
                  }
                : {}),
            ...result,
        })
    })
}

function compareResources(warmup = {}, actual = {}) {
    const difference = (field) => {
        const warmed = new Set(
            (warmup[field] ?? []).map((resource) =>
                typeof resource === 'string'
                    ? resource
                    : resource.uuid,
            ),
        )
        return (actual[field] ?? []).filter((resource) => {
            const id =
                typeof resource === 'string'
                    ? resource
                    : resource.uuid
            return !warmed.has(id)
        })
    }

    return {
        actualMeshesNotInWarmup: difference('meshes'),
        actualMaterialsNotInWarmup: difference('materials'),
        actualTexturesNotInWarmup: difference('textures'),
        actualGeometriesNotInWarmup: difference('geometries'),
    }
}

export function markFirstUserScroll() {
    const diagnostics = getDiagnostics()
    if (!diagnostics || diagnostics.firstScrollMarked) return

    diagnostics.firstScrollMarked = true
    performance.mark('onyx-first-user-scroll')
    console.info('[Onyx GPU diagnostics] first wheel input', {
        mark: 'onyx-first-user-scroll',
        at: performance.now(),
        warmups: Object.fromEntries(
            Object.entries(diagnostics.warmups).map(
                ([name, warmup]) => [
                    name,
                    {
                        startedAt: warmup.startedAt,
                        completedAt: warmup.completedAt ?? null,
                    },
                ],
            ),
        ),
    })
}
