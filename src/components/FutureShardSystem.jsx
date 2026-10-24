import { useFrame } from '@react-three/fiber'

import { useRef } from 'react'

import Shard from './Shard.jsx'

const radiusX = 3.35
const radiusZ = 1.05

/* -------------------------------------------------------------------------- */
/* PROJECT ORBIT POSITIONS                                                    */
/*                                                                            */
/* Top-down Three.js convention:                                              */
/*   +X = right                                                                 */
/*   -X = left                                                                  */
/*   +Z = front                                                                 */
/*   -Z = back                                                                  */
/*                                                                            */
/* Positive angle therefore travels counterclockwise visually:                 */
/*   0° → 72° → 144° → 216° → 288°                                             */
/*                                                                            */
/* -------------------------------------------------------------------------- */

function createOrbitPosition(
    angle,
    verticalOffset = 0,
) {
    const x =
        Math.cos(angle) *
        radiusX

    /*
     * Negative sine maps positive angles toward -Z,
     * which is the BACK of the scene.
     */
    const z =
        -Math.sin(angle) *
        radiusZ

    const normalX =
        x / radiusX ** 2

    const normalZ =
        z / radiusZ ** 2

    const normalLength =
        Math.hypot(
            normalX,
            normalZ,
        )

    return [
        x +
        (normalX / normalLength) *
        0.2,
        verticalOffset,
        z +
        (normalZ / normalLength) *
        0.2,
    ]
}

/* -------------------------------------------------------------------------- */
/* FIVE-SHARD ORBIT                                                            */
/*                                                                            */
/* Physical orbital positions are evenly spaced by 72°.                       */
/* Domain traversal advances by 144° counterclockwise, skipping one           */
/* position.                                                                  */
/*                                                                            */
/* Project 01 =   0°  → Right                                                */
/* Project 02 = 144°  → Back Left                                            */
/* Project 03 = 288°  → Front Right                                          */
/* Project 04 =  72°  → Back Right                                           */
/* Project 05 = 216°  → Front Left                                           */
/*                                                                            */
/* One-way traversal:                                                          */
/* Project 01 → 02 → 03 → 04 → 05 → END                                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

const project01Position =
    createOrbitPosition(
        0,
        0,
    )

const project02Position =
    createOrbitPosition(
        (Math.PI * 4) / 5,
        0.15,
    )

const project03Position =
    createOrbitPosition(
        (Math.PI * 8) / 5,
        0.05,
    )

const project04Position =
    createOrbitPosition(
        (Math.PI * 2) / 5,
        0.1,
    )

const project05Position =
    createOrbitPosition(
        (Math.PI * 6) / 5,
        0.05,
    )

const baseScale = 0.65

const HIGHLIGHT_HANDOFF_WINDOW =
    0.18

const PROJECT_STATE_ARRIVAL_PROGRESS =
    0.7

function clamp(
    value,
    minimum,
    maximum,
) {
    return Math.min(
        Math.max(
            value,
            minimum,
        ),
        maximum,
    )
}

function smoothStep(value) {
    return (
        value *
        value *
        (3 - 2 * value)
    )
}

function getStateScale(
    sceneStates,
    stateName,
    projectKey,
    fallback,
) {
    return (
        sceneStates?.[
            stateName
        ]?.[
            projectKey
        ]?.scale ??
        fallback
    )
}

function getProjectScale(
    sceneStates,
    projectKey,
    closeScale,
    projectTimeline,
    maxProjectIndex,
) {
    const safeTimeline =
        clamp(
            projectTimeline,
            0,
            maxProjectIndex,
        )

    const currentStateIndex =
        Math.floor(
            safeTimeline,
        )

    const nextStateIndex =
        Math.min(
            currentStateIndex + 1,
            maxProjectIndex,
        )

    const stateNames = [
        'project01',
        'project02',
        'project03',
        'project04',
        'project05',
    ]

    const fromStateName =
        currentStateIndex <= 0
            ? 'close'
            : stateNames[
            Math.min(
                currentStateIndex - 1,
                stateNames.length - 1,
            )
            ]

    const toStateName =
        currentStateIndex >=
            maxProjectIndex
            ? stateNames[
            Math.min(
                maxProjectIndex - 1,
                stateNames.length - 1,
            )
            ]
            : currentStateIndex === 0
                ? 'project01'
                : stateNames[
                Math.min(
                    nextStateIndex - 1,
                    stateNames.length - 1,
                )
                ]

    const fromScale =
        getStateScale(
            sceneStates,
            fromStateName,
            projectKey,
            closeScale,
        )

    const toScale =
        getStateScale(
            sceneStates,
            toStateName,
            projectKey,
            fromScale,
        )

    const localAmount =
        currentStateIndex >=
            maxProjectIndex
            ? 0
            : clamp(
                (
                    safeTimeline -
                    currentStateIndex
                ) /
                PROJECT_STATE_ARRIVAL_PROGRESS,
                0,
                1,
            )

    return (
        fromScale +
        (
            toScale -
            fromScale
        ) *
        localAmount
    )
}

function getSelectionProgress(
    projectTimeline,
    projectIndex,
) {
    const start =
        projectIndex

    const end =
        projectIndex + 1

    if (
        projectTimeline <
        start
    ) {
        return 0
    }

    if (
        projectTimeline <=
        end
    ) {
        const arrivalProgress =
            clamp(
                (
                    projectTimeline -
                    start
                ) /
                PROJECT_STATE_ARRIVAL_PROGRESS,
                0,
                1,
            )

        return smoothStep(
            arrivalProgress,
        )
    }

    const handoffProgress =
        clamp(
            1 -
            (
                projectTimeline -
                end
            ) /
            HIGHLIGHT_HANDOFF_WINDOW,
            0,
            1,
        )

    return smoothStep(
        handoffProgress,
    )
}

function FutureShardSystem({
    project01Ref,
    project02Ref,
    project03Ref,
    project04Ref,
    project05Ref,
    projectLocalProgress,
    projectIndex,
    sceneStates,
    previewState,
    caseFileTransitionRef,
}) {
    const project01SelectionProgress =
        useRef(0)

    const project02SelectionProgress =
        useRef(0)

    const project03SelectionProgress =
        useRef(0)

    const project04SelectionProgress =
        useRef(0)

    const project05SelectionProgress =
        useRef(0)

    const projectRefs = [
        project01Ref,
        project02Ref,
        project03Ref,
        project04Ref,
        project05Ref,
    ]

    const projectPositions = [
        project01Position,
        project02Position,
        project03Position,
        project04Position,
        project05Position,
    ]

    const projectKeys = [
        'project01',
        'project02',
        'project03',
        'project04',
        'project05',
    ]

    const selectionRefs = [
        project01SelectionProgress,
        project02SelectionProgress,
        project03SelectionProgress,
        project04SelectionProgress,
        project05SelectionProgress,
    ]

    useFrame((state) => {
        const activeProjectIndex =
            projectIndex?.current ??
            projectIndex ??
            -1

        const projectProgress =
            clamp(
                projectLocalProgress
                    ?.current ?? 0,
                0,
                1,
            )

        /*
         * Continuous project timeline:
         *
         * 0 → 1 = Project 01
         * 1 → 2 = Project 02
         * 2 → 3 = Project 03
         * 3 → 4 = Project 04
         * 4 → 5 = Project 05
         */
        const projectTimeline =
            activeProjectIndex >= 0
                ? activeProjectIndex +
                projectProgress
                : 0

        const elapsedTime =
            state.clock.getElapsedTime()

        for (
            let index = 0;
            index <
            projectRefs.length;
            index += 1
        ) {
            const projectRef =
                projectRefs[index]

            if (
                !projectRef?.current
            ) {
                continue
            }

            const position =
                projectPositions[index]

            const projectKey =
                projectKeys[index]

            const closeScale =
                getStateScale(
                    sceneStates,
                    'close',
                    projectKey,
                    1,
                )

            const projectScale =
                getProjectScale(
                    sceneStates,
                    projectKey,
                    closeScale,
                    projectTimeline,
                    5,
                )

            projectRef.current.position.set(
                position[0],
                position[1] +
                Math.sin(
                    elapsedTime *
                    (
                        0.16 +
                        index *
                        0.01
                    ),
                ) *
                0.025,
                position[2],
            )

            /*
             * Preview mode uses the selected scene
             * state directly.
             */
            if (previewState) {
                const previewScale =
                    getStateScale(
                        sceneStates,
                        previewState,
                        projectKey,
                        closeScale,
                    )

                projectRef.current.scale.setScalar(
                    baseScale *
                    previewScale,
                )
            } else {
                projectRef.current.scale.setScalar(
                    baseScale *
                    projectScale,
                )
            }

            selectionRefs[
                index
            ].current =
                getSelectionProgress(
                    projectTimeline,
                    index,
                )
        }
    })

    const project01Rotation =
        sceneStates?.project01
            ?.project01?.rotation

    const project02Rotation =
        sceneStates?.project02
            ?.project02?.rotation

    const project03Rotation =
        sceneStates?.project03
            ?.project03?.rotation ??
        [0, 0, 0]

    const project04Rotation =
        sceneStates?.project04
            ?.project04?.rotation ??
        [0, 0, 0]

    const project05Rotation =
        sceneStates?.project05
            ?.project05?.rotation ??
        [0, 0, 0]

    /*
     * Normal journey mode uses the active project as the
     * visual focus for LOD.
     *
     * Preview/editor mode keeps the existing distance-based
     * LOD behavior so the editor does not interfere with
     * the focused journey presentation.
     */
    const focusMode =
        !previewState

    return (
        <>
            {/* ------------------------------------------------------------------ */}
            {/* PROJECT 01                                                         */}
            {/* ------------------------------------------------------------------ */}

            <group
                ref={project01Ref}
                position={
                    project01Position
                }
                scale={baseScale}
            >
                <Shard
                    caseFileTransitionRef={caseFileTransitionRef}

                    url="/models/shard-01.glb"
                    lowUrl="/models/shard-01-low.glb"
                    position={[
                        0,
                        0,
                        0,
                    ]}
                    scale={1}
                    rotation={
                        project01Rotation
                    }
                    floatAmplitude={0.045}
                    floatSpeed={0.32}
                    rotationSpeed={0.005}
                    selectionProgress={
                        project01SelectionProgress
                    }
                    selectionEnabled={
                        true
                    }
                    focusMode={
                        focusMode
                    }
                    focusProjectIndex={
                        projectIndex
                    }
                    shardIndex={0}
                />
            </group>

            {/* ------------------------------------------------------------------ */}
            {/* PROJECT 02                                                         */}
            {/* ------------------------------------------------------------------ */}

            <group
                ref={project02Ref}
                position={
                    project02Position
                }
                scale={baseScale}
            >
                <Shard
                    caseFileTransitionRef={caseFileTransitionRef}

                    url="/models/shard-02.glb"
                    lowUrl="/models/shard-02-low.glb"
                    position={[
                        0,
                        0,
                        0,
                    ]}
                    scale={1}
                    rotation={
                        project02Rotation
                    }
                    floatAmplitude={0.045}
                    floatSpeed={0.34}
                    rotationSpeed={0.005}
                    selectionProgress={
                        project02SelectionProgress
                    }
                    selectionEnabled={
                        true
                    }
                    focusMode={
                        focusMode
                    }
                    focusProjectIndex={
                        projectIndex
                    }
                    shardIndex={1}
                />
            </group>

            {/* ------------------------------------------------------------------ */}
            {/* PROJECT 03 — UI / UX                                               */}
            {/* ------------------------------------------------------------------ */}

            <group
                ref={project03Ref}
                position={
                    project03Position
                }
                scale={baseScale}
            >
                <Shard
                    caseFileTransitionRef={caseFileTransitionRef}

                    url="/models/shard-03.glb"
                    lowUrl="/models/shard-03-low.glb"
                    position={[
                        0,
                        0,
                        0,
                    ]}
                    scale={1}
                    rotation={
                        project03Rotation
                    }
                    floatAmplitude={0.045}
                    floatSpeed={0.35}
                    rotationSpeed={0.005}
                    selectionProgress={
                        project03SelectionProgress
                    }
                    selectionEnabled={
                        true
                    }
                    focusMode={
                        focusMode
                    }
                    focusProjectIndex={
                        projectIndex
                    }
                    shardIndex={2}
                />
            </group>

            {/* ------------------------------------------------------------------ */}
            {/* PROJECT 04 — SOCIAL MARKETING                                      */}
            {/* ------------------------------------------------------------------ */}

            <group
                ref={project04Ref}
                position={
                    project04Position
                }
                scale={baseScale}
            >
                <Shard
                    caseFileTransitionRef={caseFileTransitionRef}

                    url="/models/shard-04.glb"
                    lowUrl="/models/shard-04-low.glb"
                    position={[
                        0,
                        0,
                        0,
                    ]}
                    scale={1}
                    rotation={
                        project04Rotation
                    }
                    floatAmplitude={0.045}
                    floatSpeed={0.36}
                    rotationSpeed={0.005}
                    selectionProgress={
                        project04SelectionProgress
                    }
                    selectionEnabled={
                        true
                    }
                    focusMode={
                        focusMode
                    }
                    focusProjectIndex={
                        projectIndex
                    }
                    shardIndex={3}
                />
            </group>

            {/* ------------------------------------------------------------------ */}
            {/* PROJECT 05 — BRANDING                                              */}
            {/* ------------------------------------------------------------------ */}

            <group
                ref={project05Ref}
                position={
                    project05Position
                }
                scale={baseScale}
            >
                <Shard
                    caseFileTransitionRef={caseFileTransitionRef}

                    url="/models/shard-05.glb"
                    lowUrl="/models/shard-05-low.glb"
                    position={[
                        0,
                        0,
                        0,
                    ]}
                    scale={1}
                    rotation={
                        project05Rotation
                    }
                    floatAmplitude={0.045}
                    floatSpeed={0.37}
                    rotationSpeed={0.005}
                    selectionProgress={
                        project05SelectionProgress
                    }
                    selectionEnabled={
                        true
                    }
                    focusMode={
                        focusMode
                    }
                    focusProjectIndex={
                        projectIndex
                    }
                    shardIndex={4}
                />
            </group>
        </>
    )
}

export default FutureShardSystem
