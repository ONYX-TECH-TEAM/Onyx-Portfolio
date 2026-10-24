import {
    Canvas,
    useFrame,
    useThree,
} from '@react-three/fiber'

import {
    useEffect,
    Suspense,
    useMemo,
    useRef,
    useState,
} from 'react'

import { Perf } from 'r3f-perf'

import CameraRig from './CameraRig.jsx'
import FutureShardSystem from './FutureShardSystem.jsx'
import OnyxModel from './OnyxModel.jsx'
import OnyxSceneEditor from './OnyxSceneEditor.jsx'
import SpaceEnvironment from './SpaceEnvironment.jsx'

import {
    Box3,
    MathUtils,
    Vector3,
} from 'three'

import SystemOrbit from './SystemOrbit.jsx'

import {
    loadSceneStates,
    SCENE_STATE_STORAGE_KEY,
} from '../data/sceneStates.js'

import {
    getSceneHoldProgress,
} from '../utils/sceneHoldProgress.js'


const AMBIENT_ORBIT_ROTATION_SPEED =
    0.035

// ------------------------------------------------------------
// TEMPORARY DEVELOPMENT UI VISIBILITY
// ------------------------------------------------------------
//
// Set to true when working on the scene.
// Set to false for client-facing portfolio presentation.
//
// This hides only the visible developer entry points:
// - Edit Mode
// - FPS tracker
// - Camera debug panel
//
// The underlying tools remain in the project.
// ------------------------------------------------------------
const SHOW_DEV_TOOLS = false

// ------------------------------------------------------------
// INITIAL SYSTEM ENTRANCE
// ------------------------------------------------------------
//
// The whole Onyx system begins slightly behind the final
// resting position, then subtly moves forward and settles.
//
// OnyxModel keeps its own existing entrance animation,
// so both motions overlap for a smoother arrival.
// ------------------------------------------------------------
const SYSTEM_ENTRANCE_DURATION =
    1.8

const SYSTEM_ENTRANCE_START_Z =
    -0.48

const SYSTEM_ENTRANCE_START_SCALE =
    0.99

function smoothProjectProgress(value) {
    return (
        value *
        value *
        (3 -
            2 * value)
    )
}

function lerpAngle(
    start,
    end,
    amount,
) {
    const delta =
        Math.atan2(
            Math.sin(
                end - start,
            ),
            Math.cos(
                end - start,
            ),
        )

    return (
        start +
        delta * amount
    )
}

function InitialSystemEntrance({
    systemRef,
    previewState,
}) {
    const startTime =
        useRef(null)

    useFrame((state) => {
        if (
            !systemRef.current
        ) {
            return
        }

        if (previewState) {
            systemRef.current.position.z =
                0

            systemRef.current.scale.setScalar(
                1,
            )

            return
        }

        const elapsed =
            state.clock.getElapsedTime()

        if (
            startTime.current ===
            null
        ) {
            startTime.current =
                elapsed
        }

        const progress =
            Math.min(
                (
                    elapsed -
                    startTime.current
                ) /
                SYSTEM_ENTRANCE_DURATION,
                1,
            )

        // Smooth cubic-out arrival.
        const easedProgress =
            1 -
            Math.pow(
                1 - progress,
                3,
            )

        systemRef.current.position.z =
            SYSTEM_ENTRANCE_START_Z *
            (
                1 -
                easedProgress
            )

        systemRef.current.scale.setScalar(
            SYSTEM_ENTRANCE_START_SCALE +
            (
                1 -
                SYSTEM_ENTRANCE_START_SCALE
            ) *
            easedProgress,
        )
    })

    return null
}

function OrbitalSystem({
    scrollProgress,
    projectLocalProgress,
    projectIndex,
    orbitalSystemRef,
    project01Ref,
    project02Ref,
    project03Ref,
    project04Ref,
    project05Ref,
    sceneStates,
    previewState,
    caseFileTransitionRef,
}) {
    const restToCloseStart =
        useRef(null)

    const restToCloseTarget =
        useRef(null)

    const transitionState =
        useRef('rest')

    useFrame((state, delta) => {
        if (
            !orbitalSystemRef.current
        ) {
            return
        }

        // ------------------------------------------------------------
        // EDIT MODE
        // ------------------------------------------------------------

        if (previewState) {
            orbitalSystemRef.current.rotation.y =
                sceneStates[
                    previewState
                ].orbit.rotationY

            restToCloseStart.current =
                null

            restToCloseTarget.current =
                null

            transitionState.current =
                'rest'

            return
        }

        const introProgress =
            Math.max(
                0,
                Math.min(
                    scrollProgress.current,
                    1,
                ),
            )

        const projectProgress =
            Math.max(
                0,
                Math.min(
                    projectLocalProgress.current,
                    1,
                ),
            )

        const activeProjectIndex =
            projectIndex?.current ??
            projectIndex ??
            -1

        const closeRotation =
            sceneStates.close
                .orbit.rotationY

        // ------------------------------------------------------------
        // REST
        // ------------------------------------------------------------

        if (
            introProgress <= 0 &&
            projectProgress <= 0
        ) {
            if (
                transitionState.current ===
                'project-return-close' &&
                introProgress > 0
            ) {
                orbitalSystemRef.current.rotation.y =
                    closeRotation

                return
            }
            if (
                transitionState.current !==
                'rest'
            ) {
                restToCloseStart.current =
                    null

                restToCloseTarget.current =
                    null

                transitionState.current =
                    'rest'
            }

            orbitalSystemRef.current.rotation.y +=
                delta *
                AMBIENT_ORBIT_ROTATION_SPEED

            return
        }

        // ------------------------------------------------------------
        // REST → CLOSE
        // ------------------------------------------------------------

        if (
            introProgress > 0 &&
            projectProgress <= 0
        ) {
            /*
             * If we are returning from a project, the project
             * segment below has already reached CLOSE exactly.
             *
             * Do not start a new interpolation here; simply hold
             * the already reached CLOSE rotation.
             */
            if (
                transitionState.current ===
                'project'
            ) {
                orbitalSystemRef.current.rotation.y =
                    closeRotation

                restToCloseStart.current =
                    null

                restToCloseTarget.current =
                    null

                transitionState.current =
                    'project-return-close'

                return
            }

            /*
             * Capture the live REST rotation once.
             *
             * The target is deliberately unwrapped so the CLOSE
             * angle is reached by rewinding backward from the
             * current autonomous orbit rather than taking the
             * shortest angular path.
             */
            if (
                transitionState.current ===
                'rest'
            ) {
                const startRotation =
                    orbitalSystemRef.current.rotation.y

                const rewindTurns =
                    Math.floor(
                        (
                            startRotation -
                            closeRotation
                        ) /
                        (Math.PI * 2),
                    )

                restToCloseStart.current =
                    startRotation

                restToCloseTarget.current =
                    closeRotation +
                    rewindTurns *
                    Math.PI *
                    2

                if (
                    restToCloseTarget.current >
                    startRotation
                ) {
                    restToCloseTarget.current -=
                        Math.PI * 2
                }

                transitionState.current =
                    'rest-to-close'
            }

            if (
                transitionState.current ===
                'project-return-close'
            ) {
                orbitalSystemRef.current.rotation.y =
                    closeRotation

                return
            }

            const closeProgress =
                smoothProjectProgress(
                    introProgress,
                )

            orbitalSystemRef.current.rotation.y =
                MathUtils.lerp(
                    restToCloseStart.current,
                    restToCloseTarget.current,
                    closeProgress,
                )

            if (
                closeProgress >= 1
            ) {
                transitionState.current =
                    'close'
            }

            return
        }

        // ------------------------------------------------------------
        // ACTIVE PROJECT NAVIGATION / FOCUS
        // ------------------------------------------------------------

        if (
            projectProgress > 0
        ) {
            /*
             * The project timeline is segmented like this:
             *
             * projectIndex = 0
             *   CLOSE → PROJECT 01
             *
             * projectIndex = 1
             *   PROJECT 01 → PROJECT 02
             *
             * projectIndex = 2
             *   PROJECT 02 → PROJECT 03
             *
             * projectIndex = 3
             *   PROJECT 03 → PROJECT 04
             *
             * projectIndex = 4
             *   PROJECT 04 → PROJECT 05
             *
             * This is deliberately endpoint-based rather than
             * transition-state-based.
             *
             * Therefore every boundary has exactly one rotation:
             *
             * P01 end = P01 start of next segment
             * P02 end = P02 start of next segment
             * etc.
             *
             * This makes forward and reverse traversal exact
             * mathematical reverses and removes the old reverse
             * boundary snap caused by local progress resetting
             * from ~0 to ~1.
             */
            transitionState.current =
                'project'

            const projectProgressEased =
                smoothProjectProgress(
                    projectProgress,
                )

            const currentProjectKey =
                activeProjectIndex >=
                    0 &&
                    activeProjectIndex < 5
                    ? `project${String(
                        activeProjectIndex +
                        1,
                    ).padStart(
                        2,
                        '0',
                    )}`
                    : null

            const projectRotation =
                currentProjectKey
                    ? (
                        sceneStates[
                            currentProjectKey
                        ]?.orbit
                            ?.rotationY ??
                        closeRotation
                    )
                    : closeRotation

            let startRotation =
                closeRotation

            /*
             * For Project 01, the segment starts at CLOSE.
             *
             * For Project 02+, the segment starts at the
             * previous project's saved rotation.
             */
            if (
                activeProjectIndex >
                0
            ) {
                const previousProjectKey =
                    `project${String(
                        activeProjectIndex,
                    ).padStart(
                        2,
                        '0',
                    )}`

                startRotation =
                    sceneStates[
                        previousProjectKey
                    ]?.orbit?.rotationY ??
                    closeRotation
            }

            orbitalSystemRef.current.rotation.y =
                lerpAngle(
                    startRotation,
                    projectRotation,
                    projectProgressEased,
                )

            return
        }
    })

    return (
        <group
            ref={orbitalSystemRef}
        >
            <SystemOrbit
                scrollProgress={
                    scrollProgress
                }
                caseFileTransitionRef={
                    caseFileTransitionRef
                }
            />

            <FutureShardSystem
                caseFileTransitionRef={caseFileTransitionRef}
                project01Ref={
                    project01Ref
                }
                project02Ref={
                    project02Ref
                }
                project03Ref={
                    project03Ref
                }
                project04Ref={
                    project04Ref
                }
                project05Ref={
                    project05Ref
                }
                projectLocalProgress={
                    projectLocalProgress
                }
                projectIndex={
                    projectIndex
                }
                sceneStates={
                    sceneStates
                }
                previewState={
                    previewState
                }
            />
        </group>
    )
}

function WebGLWarmupDiagnostics() {
    const gl = useThree(
        (state) => state.gl,
    )

    useEffect(() => {
        if (!import.meta.env.DEV) return undefined

        let cancelled = false
        let markFirstUserScroll
        import('../utils/webglWarmupDiagnostics.js').then((diagnostics) => {
            if (cancelled) return
            diagnostics.installWebGLWarmupDiagnostics(gl)
            markFirstUserScroll = diagnostics.markFirstUserScroll
            window.addEventListener('wheel', markFirstUserScroll, {
                once: true,
                passive: true,
            })
        })

        return () => {
            cancelled = true
            if (markFirstUserScroll) {
                window.removeEventListener('wheel', markFirstUserScroll)
            }
            window.__onyxGpuWarmupDiagnostics?.restore?.()
        }
    }, [gl])

    return null
}

function OnyxLayoutMeasurement({
    onyxRef,
}) {
    const {
        camera,
        gl,
        scene,
    } = useThree()

    const projectedCenter =
        useMemo(
            () =>
                new Vector3(),
            [],
        )

    useFrame(() => {
        if (
            !onyxRef.current
        ) {
            return
        }

        const rect =
            gl.domElement.getBoundingClientRect()

        const bounds =
            new Box3()

        scene.updateMatrixWorld(
            true,
        )

        const object =
            onyxRef.current.getObjectByName(
                'Onyx_web',
            ) ??
            onyxRef.current

        bounds.setFromObject(
            object,
        )

        bounds.getCenter(
            projectedCenter,
        )

        projectedCenter.project(
            camera,
        )

        window.__onyxLayoutMeasurement =
        {
            canvas: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
            },

            centerX:
                rect.left +
                (
                    (
                        projectedCenter.x +
                        1
                    ) /
                    2
                ) *
                rect.width,

            centerY:
                rect.top +
                (
                    (
                        1 -
                        projectedCenter.y
                    ) /
                    2
                ) *
                rect.height,
        }
    })

    return null
}

function OnyxScene({
    scrollProgress,
    projectTimelineProgress,
    projectLocalProgress,
    projectIndex,
    projectCount,
    timelineConfig,
    caseFileTransitionRef,

}) {
    const systemEntranceRef =
        useRef(null)

    const orbitalSystemRef =
        useRef(null)

    const project01Ref =
        useRef(null)

    const project02Ref =
        useRef(null)

    const project03Ref =
        useRef(null)

    const project04Ref =
        useRef(null)

    const project05Ref =
        useRef(null)

    const onyxRef =
        useRef(null)

    const cameraDebugElementRef =
        useRef(null)

    const [
        sceneStates,
        setSceneStates,
    ] = useState(
        loadSceneStates,
    )

    // Keep a synchronous reference to the latest
    // scene state for explicit Save actions.
    const sceneStatesRef =
        useRef(sceneStates)

    const [
        editorOpen,
        setEditorOpen,
    ] = useState(false)

    const [
        selectedState,
        setSelectedState,
    ] = useState('close')

    const previewState =
        editorOpen
            ? selectedState
            : null

    const previewHoldProgress =
        useMemo(() => {
            if (
                !previewState ||
                typeof window ===
                'undefined'
            ) {
                return null
            }

            const hold =
                getSceneHoldProgress(
                    previewState,
                    {
                        viewportHeight:
                            window
                                .innerHeight,

                        scrollHeight:
                            document
                                .documentElement
                                .scrollHeight,

                        transitionViewports:
                            timelineConfig
                                ?.transitionViewports ??
                            1,

                        projectStepViewports:
                            timelineConfig
                                ?.projectStepViewports ??
                            1,

                        projectCount:
                            projectCount ??
                            5,

                        domainCount:
                            projectCount ??
                            5,
                    },
                )

            return {
                scrollProgress: {
                    current:
                        hold.scrollProgress,
                },

                projectTimelineProgress: {
                    current:
                        hold.projectTimelineProgress,
                },

                projectIndex: {
                    current:
                        hold.projectIndex,
                },

                projectLocalProgress: {
                    current:
                        hold.projectLocalProgress,
                },
            }
        }, [
            previewState,
            projectCount,
            timelineConfig,
        ])

    const sceneScrollProgress =
        previewHoldProgress
            ?.scrollProgress ??
        scrollProgress

    const sceneProjectTimelineProgress =
        previewHoldProgress
            ?.projectTimelineProgress ??
        projectTimelineProgress

    const sceneProjectLocalProgress =
        previewHoldProgress
            ?.projectLocalProgress ??
        projectLocalProgress

    const sceneProjectIndex =
        previewHoldProgress
            ?.projectIndex ??
        projectIndex

    // ------------------------------------------------------------
    // EDITOR VALUE UPDATE
    // ------------------------------------------------------------

    const updateValue = (
        path,
        value,
    ) => {
        // Build from the synchronous latest state,
        // not from a potentially stale React render.
        const next =
            structuredClone(
                sceneStatesRef.current,
            )

        const keys =
            path.split('.')

        let destination =
            next[selectedState]

        keys
            .slice(
                0,
                -1,
            )
            .forEach(
                (key) => {
                    destination =
                        destination[key]
                },
            )

        destination[
            keys.at(-1)
        ] = value

        // Update the ref immediately.
        sceneStatesRef.current =
            next

        // Update React state for the live preview.
        setSceneStates(next)
    }

    // ------------------------------------------------------------
    // MANUAL SAVE SCENE STATES
    // ------------------------------------------------------------

    const saveSceneState =
        async (profile) => {
            const state =
                sceneStatesRef.current[
                profile
                ]

            // Update the existing loader cache only when explicitly saving.
            try {
                const saved =
                    JSON.parse(
                        window.localStorage.getItem(
                            SCENE_STATE_STORAGE_KEY,
                        ) ?? '{}',
                    )

                saved[profile] =
                    state

                window.localStorage.setItem(
                    SCENE_STATE_STORAGE_KEY,
                    JSON.stringify(
                        saved,
                    ),
                )
            } catch {
                // Source persistence remains authoritative.
            }

            const response =
                await fetch(
                    '/api/save-scene-state',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            selected:
                                profile,
                            state,
                        }),
                    },
                )

            const result =
                await response.json()

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.error ??
                    'Could not save scene state.',
                )
            }
        }

    // ------------------------------------------------------------
    // EDITOR OPEN / CLOSE
    // ------------------------------------------------------------

    const handleEditorOpenChange =
        (nextOpen) => {
            setEditorOpen(
                nextOpen,
            )
        }

   return (
    <div className="onyx-scene">
        {/* Hide portfolio overlays while previewing a saved scene state. */}
        {previewState && (
            <style>
                {`
                    .future-portfolio-section .domain-scan-overlay {
                        visibility: hidden !important;
                        opacity: 0 !important;
                        pointer-events: none !important;
                    }
                `}
            </style>
        )}

        <Canvas
          
                camera={{
                    position: [
                        0,
                        0.1,
                        7.4,
                    ],
                    fov: 36,
                }}
                dpr={[1, 1.5]}
                gl={{
                    alpha: true,
                    antialias: false,
                    powerPreference:
                        'high-performance',
                }}
            >
                <OnyxLayoutMeasurement
                    onyxRef={onyxRef}
                />

                <WebGLWarmupDiagnostics />

                {SHOW_DEV_TOOLS && (
                    <Perf
                        position="bottom-left"
                    />
                )}

                {/* -------------------------------------------------------- */}
                {/* SPACE ENVIRONMENT                                         */}
                {/* -------------------------------------------------------- */}

                <SpaceEnvironment
                    scrollProgress={sceneScrollProgress}
                    projectLocalProgress={sceneProjectLocalProgress}
                    projectIndex={sceneProjectIndex}
                    sceneStates={sceneStates}
                    previewState={previewState}
                />

                {/* -------------------------------------------------------- */}
                {/* LIGHTING                                                  */}
                {/* -------------------------------------------------------- */}

                <ambientLight
                    intensity={0.32}
                />

                <hemisphereLight
                    args={[
                        '#68778a',
                        '#020304',
                        0.9,
                    ]}
                />

                <directionalLight
                    position={[
                        4.5,
                        5.5,
                        6,
                    ]}
                    intensity={2.45}
                    color="#e4e9ed"
                />

                <directionalLight
                    position={[
                        -5.5,
                        2.5,
                        -3,
                    ]}
                    intensity={2.15}
                    color="#94a9c1"
                />

                <directionalLight
                    position={[
                        1.5,
                        -3,
                        4,
                    ]}
                    intensity={0.35}
                    color="#b77b49"
                />

                {/* -------------------------------------------------------- */}
                {/* INITIAL SYSTEM ENTRANCE                                   */}
                {/* -------------------------------------------------------- */}

                <InitialSystemEntrance
                    systemRef={
                        systemEntranceRef
                    }
                    previewState={
                        previewState
                    }
                />

                {/* -------------------------------------------------------- */}
                {/* ENTIRE ONYX SYSTEM                                         */}
                {/* -------------------------------------------------------- */}

                <group
                    ref={
                        systemEntranceRef
                    }
                    position={[
                        0,
                        0,
                        SYSTEM_ENTRANCE_START_Z,
                    ]}
                    scale={
                        SYSTEM_ENTRANCE_START_SCALE
                    }
                >
                    {/* ---------------------------------------------------- */}
                    {/* ONYX MODEL                                             */}
                    {/* ---------------------------------------------------- */}

                    <Suspense
                        fallback={null}
                    >
                        <OnyxModel
                            onyxRef={
                                onyxRef
                            }
                            introProgress={
                                sceneScrollProgress
                            }
                            projectLocalProgress={
                                sceneProjectLocalProgress
                            }
                            projectIndex={
                                sceneProjectIndex
                            }
                            sceneStates={
                                sceneStates
                            }
                            previewState={
                                previewState
                            }
                        />
                    </Suspense>

                    {/* ---------------------------------------------------- */}
                    {/* ORBITAL SYSTEM                                          */}
                    {/* ---------------------------------------------------- */}

            <OrbitalSystem
                        caseFileTransitionRef={caseFileTransitionRef}
                        scrollProgress={
                            sceneScrollProgress
                        }
                        projectLocalProgress={
                            sceneProjectLocalProgress
                        }
                        projectIndex={
                            sceneProjectIndex
                        }
                        orbitalSystemRef={
                            orbitalSystemRef
                        }
                        project01Ref={
                            project01Ref
                        }
                        project02Ref={
                            project02Ref
                        }
                        project03Ref={
                            project03Ref
                        }
                        project04Ref={
                            project04Ref
                        }
                        project05Ref={
                            project05Ref
                        }
                        sceneStates={
                            sceneStates
                        }
                        previewState={
                            previewState
                        }
                    />
                </group>

                {/* -------------------------------------------------------- */}
                {/* CAMERA                                                     */}
                {/* -------------------------------------------------------- */}

                <CameraRig
                    caseFileTransitionRef={caseFileTransitionRef}
                    scrollProgress={
                        sceneScrollProgress
                    }
                    projectTimelineProgress={
                        sceneProjectTimelineProgress
                    }
                    project01Ref={
                        project01Ref
                    }
                    project02Ref={
                        project02Ref
                    }
                    project03Ref={
                        project03Ref
                    }
                    project04Ref={
                        project04Ref
                    }
                    project05Ref={
                        project05Ref
                    }
                    sceneStates={
                        sceneStates
                    }
                    previewState={
                        previewState
                    }
                    debugElement={
                        cameraDebugElementRef
                    }
                />
            </Canvas>

            {SHOW_DEV_TOOLS &&
                import.meta.env.DEV && (
                    <div
                        ref={
                            cameraDebugElementRef
                        }
                        aria-hidden="true"
                        style={{
                            position:
                                'fixed',
                            top: 12,
                            left: 12,
                            zIndex: 1000,
                            padding:
                                '8px 10px',
                            color:
                                '#d8f3ff',
                            background:
                                'rgba(0, 8, 14, 0.82)',
                            border:
                                '1px solid rgba(126, 198, 224, 0.45)',
                            borderRadius: 4,
                            font:
                                '11px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace',
                            whiteSpace:
                                'pre',
                            pointerEvents:
                                'none',
                        }}
                    />
                )}

            {/* ---------------------------------------------------------- */}
            {/* LIVE SCENE EDITOR                                           */}
            {/* ---------------------------------------------------------- */}

            {SHOW_DEV_TOOLS && (
                <OnyxSceneEditor
                    open={
                        editorOpen
                    }
                    selected={
                        selectedState
                    }
                    states={
                        sceneStates
                    }
                    onOpenChange={
                        handleEditorOpenChange
                    }
                    onSelectedChange={
                        setSelectedState
                    }
                    onValueChange={
                        updateValue
                    }
                    onSave={
                        saveSceneState
                    }
                />
            )}
        </div>
    )
}

export default OnyxScene
