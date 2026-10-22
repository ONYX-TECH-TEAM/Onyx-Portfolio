/* eslint-disable react-hooks/immutability -- React Three Fiber camera is updated imperatively per frame. */

import { Center, useGLTF } from '@react-three/drei'
import {
    useFrame,
    useThree,
} from '@react-three/fiber'
import {
    Suspense,
    useMemo,
    useRef,
    useState,
} from 'react'
import {
    Color,
    MathUtils,
    Vector3,
} from 'three'
import {
    MeshoptDecoder,
} from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import {
    beginFirstRenderDiagnostic,
} from '../utils/webglWarmupDiagnostics.js'

const SHARD_01_URL =
    '/models/shard-01.glb'

const SHARD_02_URL =
    '/models/shard-02.glb'

const SHARD_03_URL =
    '/models/shard-03.glb'

const SHARD_04_URL =
    '/models/shard-04.glb'

const SHARD_05_URL =
    '/models/shard-05.glb'

const DEFAULT_POSITION = [
    4.5,
    1.8,
    -1.5,
]

const DEFAULT_SCALE = 0.65

const DEFAULT_ROTATION = [
    0,
    0,
    0,
]

const DEFAULT_FLOAT_AMPLITUDE =
    0.045

const DEFAULT_FLOAT_SPEED =
    0.32

const SELECTION_LIGHT_COLOR =
    new Color('#ffd2a1')

/* -------------------------------------------------------------------------- */
/* LOW-DETAIL VISUAL ATTENUATION                                              */
/* -------------------------------------------------------------------------- */

const LOW_DETAIL_COLOR_SCALE = 0.82
const LOW_DETAIL_EMISSIVE_SCALE = 0.70

/* -------------------------------------------------------------------------- */
/* LOD                                                                        */
/* -------------------------------------------------------------------------- */

const LOD_ENTER_DISTANCE = 7.0
const LOD_EXIT_DISTANCE = 8.0
const LOD_MOUNT_PROGRESS = 0.02
const LOD_SELECTION_THRESHOLD =
    0.10

function prepareShardScene(
    scene,
    colorScale = 1,
    emissiveScale = 1,
) {
    const shard =
        scene.clone(true)

    shard.traverse((object) => {
        if (
            !object.isMesh ||
            !object.material
        ) {
            return
        }

        if (
            Array.isArray(
                object.material,
            )
        ) {
            object.material =
                object.material.map(
                    (material) => {
                        const clone =
                            material.clone()

                        if (
                            clone.color
                        ) {
                            clone.color.multiplyScalar(
                                colorScale,
                            )
                        }

                        if (
                            'emissiveIntensity' in
                            clone
                        ) {
                            clone.emissiveIntensity *=
                                emissiveScale
                        }

                        return clone
                    },
                )
        } else {
            const material =
                object.material.clone()

            if (material.color) {
                material.color.multiplyScalar(
                    colorScale,
                )
            }

            if (
                'emissiveIntensity' in
                material
            ) {
                material.emissiveIntensity *=
                    emissiveScale
            }

            object.material =
                material
        }
    })

    return shard
}

// Keep each material's original settings so the shard can
// return to its normal appearance after the camera transition.
const shardMaterialBaselines = new WeakMap()

function setShardFade(root, fadeAmount) {
    if (!root) {
        return
    }

    const opacity = MathUtils.clamp(
        fadeAmount,
        0,
        1,
    )

    root.traverse((object) => {
        if (
            !object.isMesh ||
            !object.material
        ) {
            return
        }

        const materials = Array.isArray(
            object.material,
        )
            ? object.material
            : [object.material]

        for (const material of materials) {
            if (!shardMaterialBaselines.has(material)) {
                shardMaterialBaselines.set(
                    material,
                    {
                        opacity: material.opacity,
                        transparent: material.transparent,
                        depthWrite: material.depthWrite,
                    },
                )
            }

            const original =
                shardMaterialBaselines.get(material)

            const nextOpacity =
                original.opacity * opacity

            const nextTransparent =
                opacity < 0.999
                    ? true
                    : original.transparent

            if (
                material.transparent !== nextTransparent
            ) {
                material.transparent =
                    nextTransparent

                material.needsUpdate = true
            }

            material.opacity =
                nextOpacity

            material.depthWrite =
                opacity < 0.95
                    ? false
                    : original.depthWrite
        }
    })
}

function ShardVisual({
    scene,
    targetRef,
    visible,
    colorScale = 1,
    emissiveScale = 1,
    cloneScene = true,
}) {
    const shard =
        useMemo(
            () => {
                if (
                    !cloneScene &&
                    colorScale === 1 &&
                    emissiveScale === 1
                ) {
                    return scene
                }

                return prepareShardScene(
                    scene,
                    colorScale,
                    emissiveScale,
                )
            },
            [
                scene,
                colorScale,
                emissiveScale,
                cloneScene,
            ],
        )

    return (
        <group
            ref={targetRef}
            visible={visible}
        >
            <Center>
                <primitive
                    object={shard}
                />
            </Center>
        </group>
    )
}

function HighDetailShardVisual({
    url,
    targetRef,
    visible,
}) {
    const { scene } =
        useGLTF(
            url,
            true,
            true,
            (loader) => {
                loader.setMeshoptDecoder(
                    MeshoptDecoder,
                )
            },
        )

    return (
        <ShardVisual
            scene={scene}
            targetRef={targetRef}
            visible={visible}
            cloneScene={true}
        />
    )
}

function LowDetailShardVisual({
    url,
    targetRef,
    visible,
}) {
    const { scene } =
        useGLTF(
            url,
            true,
            true,
            (loader) => {
                loader.setMeshoptDecoder(
                    MeshoptDecoder,
                )
            },
        )

    return (
        <ShardVisual
            scene={scene}
            targetRef={targetRef}
            visible={visible}
            colorScale={
                LOW_DETAIL_COLOR_SCALE
            }
            emissiveScale={
                LOW_DETAIL_EMISSIVE_SCALE
            }
        />
    )
}

function Shard({
    url = SHARD_01_URL,
    lowUrl = null,
    position = DEFAULT_POSITION,
    scale = DEFAULT_SCALE,
    rotation = DEFAULT_ROTATION,
    floatAmplitude =
        DEFAULT_FLOAT_AMPLITUDE,
    floatSpeed =
        DEFAULT_FLOAT_SPEED,
    rotationSpeed = 0,
    rotationResetKey = '',
    rotationActive = true,
    settleProgress = null,
    selectionProgress = null,
    selectionEnabled = true,

    /*
     * Domain focus system.
     *
     * focusMode:
     *     true  = the active project controls
     *             high-detail mounting.
     *
     *     false = normal distance-based LOD.
     */
    focusMode = false,

    /*
     * Shared active project index from
     * FutureShardSystem.
     */
    focusProjectIndex = null,

    shardIndex = -1,

    caseFileTransitionRef,
}) {
    const {
        gl,
        scene: renderScene,
    } = useThree()

    const group =
        useRef(null)

    const highDetailRef =
        useRef(null)

    const lowDetailRef =
        useRef(null)

    const selectionLight =
        useRef(null)

    const firstVisibleRenderCaptured =
        useRef(false)

    const spinStartTime =
        useRef(null)

    const lastRotationResetKey =
        useRef(rotationResetKey)

    const lastRotation =
        useRef([
            rotation[0],
            rotation[1],
            rotation[2],
        ])

    const selectionLightOffset =
        useMemo(
            () =>
                new Vector3(
                    0,
                    -1.0,
                    0,
                ),
            [],
        )

    const cameraDistance =
        useMemo(
            () =>
                new Vector3(),
            [],
        )

    const worldPosition =
        useMemo(
            () =>
                new Vector3(),
            [],
        )

    const highDetailActive =
        useRef(true)

    const dissolveApplied =
        useRef(false)

    // Remember the last dissolve opacity applied to the shard.
    const lastDissolveOpacity =
        useRef(1)

    /*
     * IMPORTANT:
     *
     * In normal journey focus mode, the high-detail component
     * is not mounted until this shard is actually needed.
     *
     * In preview/editor mode, it starts mounted so the existing
     * distance-based LOD behavior remains available.
     */
    const [
        highDetailMounted,
        setHighDetailMounted,
    ] = useState(
        !focusMode,
    )

    /*
     * Track the mounted state synchronously. useFrame can run
     * many times before React processes a state update.
     */
    const highDetailMountedRef =
        useRef(!focusMode)

    const updateHighDetailMount =
        (shouldMount) => {
            if (
                highDetailMountedRef.current ===
                shouldMount
            ) {
                return
            }

            highDetailMountedRef.current =
                shouldMount

            setHighDetailMounted(
                shouldMount,
            )
        }

    useFrame((state, delta) => {
        if (!group.current) {
            return
        }

        const elapsed =
            state.clock.getElapsedTime()

        /* ---------------------------------------------------------- */
        /* ROTATION STATE                                             */
        /* ---------------------------------------------------------- */

        const rotationChanged =
            lastRotation.current[0] !==
                rotation[0] ||
            lastRotation.current[1] !==
                rotation[1] ||
            lastRotation.current[2] !==
                rotation[2]

        if (rotationChanged) {
            lastRotation.current[0] =
                rotation[0]

            lastRotation.current[1] =
                rotation[1]

            lastRotation.current[2] =
                rotation[2]

            spinStartTime.current =
                elapsed
        }

        const resetKeyChanged =
            lastRotationResetKey.current !==
            rotationResetKey

        if (resetKeyChanged) {
            lastRotationResetKey.current =
                rotationResetKey

            if (rotationActive) {
                spinStartTime.current =
                    elapsed
            }
        }

        if (
            spinStartTime.current ===
            null
        ) {
            spinStartTime.current =
                elapsed
        }

        const spinElapsed =
            elapsed -
            spinStartTime.current

        const spinningY =
            rotation[1] +
            spinElapsed *
                rotationSpeed

        const rawSettleProgress =
            settleProgress?.current ??
            0

        const clampedSettleProgress =
            MathUtils.clamp(
                rawSettleProgress,
                0,
                1,
            )

        const settleAmount =
            MathUtils.smoothstep(
                clampedSettleProgress,
                0,
                1,
            )

        const finalRotationY =
            MathUtils.lerp(
                spinningY,
                rotation[1],
                settleAmount,
            )

        /* ---------------------------------------------------------- */
        /* FLOAT                                                      */
        /* ---------------------------------------------------------- */

        group.current.position.set(
            position[0],
            position[1] +
                Math.sin(
                    elapsed *
                        floatSpeed,
                ) *
                    floatAmplitude,
            position[2],
        )

        /* ---------------------------------------------------------- */
        /* ROTATION                                                   */
        /* ---------------------------------------------------------- */

        group.current.rotation.set(
            rotation[0],
            finalRotationY,
            rotation[2],
        )

        /* ---------------------------------------------------------- */
        /* DETAIL STATE                                               */
        /* ---------------------------------------------------------- */

        const progress =
            selectionProgress?.current ??
            0

        const selectionStrength =
            selectionEnabled
                ? MathUtils.smoothstep(
                    progress,
                    0.82,
                    0.98,
                )
                : 0

        const activeProjectIndex =
            focusProjectIndex?.current ??
            focusProjectIndex ??
            -1

        const hasActiveProject =
            Number.isInteger(
                activeProjectIndex,
            ) &&
            activeProjectIndex >= 0

        const isFocusedShard =
            focusMode &&
            hasActiveProject &&
            activeProjectIndex ===
                shardIndex

        const isNextShard =
            focusMode &&
            hasActiveProject &&
            activeProjectIndex + 1 ===
                shardIndex

        /* ---------------------------------------------------------- */
        /* DOMAIN FOCUS MODE                                          */
        /* ---------------------------------------------------------- */

        if (
            focusMode &&
            hasActiveProject
        ) {
            const shouldShowHighDetail =
                isFocusedShard ||
                selectionStrength >
                    LOD_SELECTION_THRESHOLD

            const shouldMountHighDetail =
                isFocusedShard ||
                isNextShard ||
                progress >
                    LOD_MOUNT_PROGRESS

            updateHighDetailMount(
                shouldMountHighDetail,
            )

            const highDetailReady =
                Boolean(
                    highDetailRef.current,
                )

            const highDetailVisible =
                shouldShowHighDetail &&
                highDetailReady

            if (
                highDetailRef.current
            ) {
                highDetailRef.current.visible =
                    highDetailVisible
            }

            if (
                lowDetailRef.current
            ) {
                lowDetailRef.current.visible =
                    !highDetailVisible
            }
        }

        /* ---------------------------------------------------------- */
        /* DISTANCE-BASED FALLBACK                                    */
        /* ---------------------------------------------------------- */

        if (
            !focusMode &&
            lowUrl &&
            highDetailRef.current &&
            lowDetailRef.current
        ) {
            group.current.getWorldPosition(
                worldPosition,
            )

            cameraDistance.copy(
                state.camera.position,
            )

            const distance =
                cameraDistance.distanceTo(
                    worldPosition,
                )

            const shouldForceHighDetail =
                selectionStrength >
                LOD_SELECTION_THRESHOLD

            if (
                highDetailActive.current
            ) {
                if (
                    !shouldForceHighDetail &&
                    distance >
                        LOD_EXIT_DISTANCE
                ) {
                    highDetailActive.current =
                        false
                }
            } else {
                if (
                    shouldForceHighDetail ||
                    distance <
                        LOD_ENTER_DISTANCE
                ) {
                    highDetailActive.current =
                        true
                }
            }

            highDetailRef.current.visible =
                highDetailActive.current

            lowDetailRef.current.visible =
                !highDetailActive.current
        }

        /*
         * If we leave focus mode, make sure the high-detail
         * component is mounted again so the preview/editor LOD
         * can continue using it.
         */
        if (!focusMode) {
            updateHighDetailMount(true)
        }

        // ----------------------------------------------------------
        // CASE FILE: SELECTED SHARD DISSOLVE
        // ----------------------------------------------------------

        const transition =
            caseFileTransitionRef?.current

        const isActiveDissolveShard =
            transition?.activeShardIndex === shardIndex &&
            transition?.transitionPhase !== 'idle'

        if (isActiveDissolveShard) {
            const progress = MathUtils.clamp(
                transition.transitionProgress ?? 0,
                0,
                1,
            )

            // Preserve the existing dissolve timing.
            const fadeProgress = MathUtils.smoothstep(
                progress,
                0.56,
                0.78,
            )

            const opacity = 1 

            /*
             * Avoid traversing both mesh hierarchies every frame
             * when the effective dissolve opacity hasn't changed.
             */
            if (
                lastDissolveOpacity.current !== opacity
            ) {
                setShardFade(
                    highDetailRef.current,
                    opacity,
                )

                setShardFade(
                    lowDetailRef.current,
                    opacity,
                )

                lastDissolveOpacity.current =
                    opacity
            }

            // Only write visibility when the value actually changes.
            const shouldShowShard =
                opacity > 0.001

            if (
                group.current.visible !==
                shouldShowShard
            ) {
                group.current.visible =
                    shouldShowShard
            }

            dissolveApplied.current = true
        } else if (dissolveApplied.current) {
            // Restore the original materials after the transition.
            if (
                lastDissolveOpacity.current !== 1
            ) {
                setShardFade(
                    highDetailRef.current,
                    1,
                )

                setShardFade(
                    lowDetailRef.current,
                    1,
                )

                lastDissolveOpacity.current = 1
            }

            if (!group.current.visible) {
                group.current.visible = true
            }

            dissolveApplied.current = false
        }

        /* ---------------------------------------------------------- */
        /* SELECTION LIGHT                                            */
        /* ---------------------------------------------------------- */

        if (
            selectionLight.current
        ) {
            const lightActive =
                selectionStrength >
                0.005

            selectionLight.current.visible =
                lightActive

            selectionLight.current.position.set(
                group.current.position.x +
                    selectionLightOffset.x,
                group.current.position.y +
                    selectionLightOffset.y,
                group.current.position.z +
                    selectionLightOffset.z,
            )

            const targetIntensity =
                selectionStrength *
                12

            const targetDistance =
                1.2 +
                selectionStrength *
                    1.2

            selectionLight.current.intensity =
                MathUtils.damp(
                    selectionLight.current
                        .intensity,
                    targetIntensity,
                    7,
                    delta,
                )

            selectionLight.current.distance =
                MathUtils.damp(
                    selectionLight.current
                        .distance,
                    targetDistance,
                    7,
                    delta,
                )
        }

        if (
            focusMode &&
            highDetailRef.current
                ?.visible &&
            !firstVisibleRenderCaptured.current
        ) {
            firstVisibleRenderCaptured.current =
                true

            const projectName =
                `project${String(
                    shardIndex + 1,
                ).padStart(2, '0')}`

            beginFirstRenderDiagnostic(
                projectName,
                renderScene,
                gl,
            )
        }
    })

    return (
        <>
            <group
                ref={group}
                position={position}
                rotation={rotation}
                scale={scale}
            >
                {lowUrl && (
                    <LowDetailShardVisual
                        url={lowUrl}
                        targetRef={
                            lowDetailRef
                        }
                        visible={true}
                    />
                )}

                {highDetailMounted && (
                    <Suspense fallback={null}>
                        <HighDetailShardVisual
                            url={url}
                            targetRef={
                                highDetailRef
                            }
                            visible={false}
                        />
                    </Suspense>
                )}
            </group>

            <pointLight
                ref={selectionLight}
                position={[
                    position[0] +
                        selectionLightOffset.x,
                    position[1] +
                        selectionLightOffset.y,
                    position[2] +
                        selectionLightOffset.z,
                ]}
                color={
                    SELECTION_LIGHT_COLOR
                }
                intensity={0}
                distance={1.2}
                decay={2}
                visible={false}
            />
        </>
    )
}

/* -------------------------------------------------------------------------- */
/* HIGH-DETAIL PRELOADING                                                     */
/* -------------------------------------------------------------------------- */

useGLTF.preload(
    SHARD_01_URL,
    true,
    true,
    (loader) => {
        loader.setMeshoptDecoder(
            MeshoptDecoder,
        )
    },
)

useGLTF.preload(
    SHARD_02_URL,
    true,
    true,
    (loader) => {
        loader.setMeshoptDecoder(
            MeshoptDecoder,
        )
    },
)

useGLTF.preload(
    SHARD_03_URL,
    true,
    true,
    (loader) => {
        loader.setMeshoptDecoder(
            MeshoptDecoder,
        )
    },
)

useGLTF.preload(
    SHARD_04_URL,
    true,
    true,
    (loader) => {
        loader.setMeshoptDecoder(
            MeshoptDecoder,
        )
    },
)

useGLTF.preload(
    SHARD_05_URL,
    true,
    true,
    (loader) => {
        loader.setMeshoptDecoder(
            MeshoptDecoder,
        )
    },
)

export default Shard