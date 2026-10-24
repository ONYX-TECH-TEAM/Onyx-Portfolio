import { Center, useGLTF } from '@react-three/drei'

import {
    useFrame,
    useThree,
} from '@react-three/fiber'

import {
    useMemo,
    useRef,
} from 'react'

import {
    Color,
    MathUtils,
    Vector3,
} from 'three'

import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { recordFirstRenderDiagnostic } from '../utils/recordFirstRenderDiagnostic.js'

const MODEL_URL =
    '/models/onyx-rock.glb'

const MODEL_SCALE = 1.08

const FLOAT_AMPLITUDE = 0.055
const FLOAT_SPEED = 0.38

const ROTATION_SPEED = 0.052
const ROTATION_VARIATION = 0.022

const DRIFT_AMPLITUDE = 0.025
const DRIFT_SPEED = 0.2

const ENTRANCE_DURATION = 1.8
const ENTRANCE_START_SCALE = 0.9

const ENTRANCE_START_DEPTH_OFFSET =
    -0.3

const ENTRANCE_START_VERTICAL_OFFSET =
    -0.07

const VISUAL_OFFSET = [
    -0.12,
    -0.02,
    0,
]

/* -------------------------------------------------------------------------- */
/* CLOSE-STATE ONYX HIGHLIGHT                                                 */
/* -------------------------------------------------------------------------- */

const ONYX_HIGHLIGHT_COLOR =
    new Color('#ffd2a1')

const ONYX_HIGHLIGHT_OFFSET = [
    0,
    -1.15,
    0.75,
]

const ONYX_HIGHLIGHT_MAX_INTENSITY =
    10

const ONYX_HIGHLIGHT_BASE_DISTANCE =
    2.0

const ONYX_HIGHLIGHT_DISTANCE =
    4.0

const ONYX_HIGHLIGHT_DECAY =
    2

function OnyxModel({
    onyxRef,
    introProgress,
    projectLocalProgress,
    projectIndex,
    sceneStates,
    previewState,
}) {
    const group =
        useRef(null)

    const onyxLightRef =
        useRef(null)

    const entranceStartTime =
        useRef(null)

    const closeFirstRenderCaptured =
        useRef(false)

    const gl = useThree((state) => state.gl)
    const renderScene = useThree((state) => state.scene)

    const lightWorldPosition =
        useMemo(
            () => new Vector3(),
            [],
        )

    const { scene } =
        useGLTF(
            MODEL_URL,
            true,
            true,
            (loader) => {
                loader.setMeshoptDecoder(
                    MeshoptDecoder,
                )
            },
        )

    const onyx =
        useMemo(() => {
            const source =
                scene.getObjectByName(
                    'Onyx_web',
                )

            return source?.clone(true)
        }, [scene])

    useFrame((state, delta) => {
        if (!group.current) {
            return
        }

        const elapsed =
            state.clock.getElapsedTime()

        if (
            entranceStartTime.current ===
            null
        ) {
            entranceStartTime.current =
                elapsed
        }

        const entranceProgress =
            Math.min(
                (
                    elapsed -
                    entranceStartTime.current
                ) /
                    ENTRANCE_DURATION,
                1,
            )

        const easedEntrance =
            1 -
            Math.pow(
                1 -
                    entranceProgress,
                3,
            )

        /* ------------------------------------------------------------------ */
        /* FLOAT                                                               */
        /* ------------------------------------------------------------------ */

        const floatY =
            Math.sin(
                elapsed *
                    FLOAT_SPEED,
            ) *
                FLOAT_AMPLITUDE +
            Math.sin(
                elapsed *
                    FLOAT_SPEED *
                    0.43,
            ) *
                FLOAT_AMPLITUDE *
                0.25

        const driftX =
            Math.sin(
                elapsed *
                    DRIFT_SPEED,
            ) *
            DRIFT_AMPLITUDE

        const driftZ =
            Math.cos(
                elapsed *
                    DRIFT_SPEED *
                    0.7,
            ) *
            DRIFT_AMPLITUDE *
            0.4

        /* ------------------------------------------------------------------ */
        /* ROTATION                                                            */
        /* ------------------------------------------------------------------ */

        group.current.rotation.y =
            elapsed *
                ROTATION_SPEED +
            Math.sin(
                elapsed * 0.19,
            ) *
                ROTATION_VARIATION

        group.current.rotation.x =
            Math.sin(
                elapsed * 0.16,
            ) *
            0.018

        group.current.rotation.z =
            Math.sin(
                elapsed * 0.11,
            ) *
            0.012

        /* ------------------------------------------------------------------ */
        /* POSITION                                                            */
        /* ------------------------------------------------------------------ */

        group.current.position.set(
            VISUAL_OFFSET[0] +
                driftX,

            VISUAL_OFFSET[1] +
                floatY +
                (
                    1 -
                    easedEntrance
                ) *
                    ENTRANCE_START_VERTICAL_OFFSET,

            VISUAL_OFFSET[2] +
                driftZ +
                (
                    1 -
                    easedEntrance
                ) *
                    ENTRANCE_START_DEPTH_OFFSET,
        )

        /* ------------------------------------------------------------------ */
        /* CONTINUOUS PROJECT TIMELINE                                         */
        /* ------------------------------------------------------------------ */

        const entranceScale =
            ENTRANCE_START_SCALE +
            (
                1 -
                ENTRANCE_START_SCALE
            ) *
                easedEntrance

        const activeProjectIndex =
            projectIndex?.current ??
            projectIndex ??
            -1

        const projectLocal =
            Math.max(
                0,
                Math.min(
                    projectLocalProgress?.current ??
                        0,
                    1,
                ),
            )

        /*
         * One continuous project position:
         *
         * CLOSE / REST:
         *   0
         *
         * PROJECT 01:
         *   0 → 1
         *
         * PROJECT 02:
         *   1 → 2
         *
         * At the Project 01 → Project 02 boundary,
         * the value remains exactly 1 instead of resetting.
         */

        const projectTimeline =
            activeProjectIndex >= 0
                ? activeProjectIndex +
                  projectLocal
                : 0

        /* ------------------------------------------------------------------ */
        /* SCALE                                                               */
        /* ------------------------------------------------------------------ */

        const closeScale =
            sceneStates.close.onyx.scale

        const project01Scale =
            sceneStates.project01.onyx.scale

        const project02Scale =
            sceneStates.project02?.onyx?.scale ??
            project01Scale

        let scaleStart =
            closeScale

        let scaleTarget =
            closeScale

        let scaleAmount = 0

        if (previewState) {
            scaleStart =
                closeScale

            scaleTarget =
                sceneStates[
                    previewState
                ]?.onyx?.scale ??
                closeScale

            scaleAmount = 1
        } else if (
            projectTimeline <= 1
        ) {
            /*
             * CLOSE → PROJECT 01
             */
            scaleStart =
                closeScale

            scaleTarget =
                project01Scale

            scaleAmount =
                Math.max(
                    0,
                    Math.min(
                        projectTimeline,
                        1,
                    ),
                )
        } else {
            /*
             * PROJECT 01 → PROJECT 02
             */
            scaleStart =
                project01Scale

            scaleTarget =
                project02Scale

            scaleAmount =
                Math.max(
                    0,
                    Math.min(
                        projectTimeline - 1,
                        1,
                    ),
                )
        }

        const scaleMultiplier =
            scaleStart +
            (
                scaleTarget -
                scaleStart
            ) *
                scaleAmount

        group.current.scale.setScalar(
            MODEL_SCALE *
                entranceScale *
                scaleMultiplier,
        )

        /* ------------------------------------------------------------------ */
        /* ONYX SELECTION LIGHT                                                */
        /* ------------------------------------------------------------------ */

        if (
            onyxLightRef.current
        ) {
            let selectionStrength =
                0

            if (previewState) {
                selectionStrength =
                    previewState ===
                    'close'
                        ? 1
                        : 0
            } else {
                const intro =
                    introProgress?.current ??
                    0

                const closeStrength =
                    MathUtils.smoothstep(
                        intro,
                        0.82,
                        0.98,
                    )

                /*
                 * ONYX remains active through the beginning
                 * of Project 01, then fades continuously.
                 *
                 * At projectTimeline = 0:
                 *   full CLOSE influence
                 *
                 * At projectTimeline = 1:
                 *   zero ONYX influence
                 *
                 * Project 02:
                 *   remains zero
                 */

                const projectFade =
                    Math.max(
                        0,
                        Math.min(
                            1 -
                                projectTimeline,
                            1,
                        ),
                    )

                selectionStrength =
                    closeStrength *
                    projectFade
            }

            const lightActive =
                selectionStrength >
                0.005

            /*
             * Only calculate the world-space light position
             * while the light is actually contributing.
             */
            if (lightActive) {
                group.current.getWorldPosition(
                    lightWorldPosition,
                )

                onyxLightRef.current.position.set(
                    lightWorldPosition.x +
                        ONYX_HIGHLIGHT_OFFSET[0],

                    lightWorldPosition.y +
                        ONYX_HIGHLIGHT_OFFSET[1],

                    lightWorldPosition.z +
                        ONYX_HIGHLIGHT_OFFSET[2],
                )
            }

            onyxLightRef.current.visible =
                lightActive

            const targetIntensity =
                selectionStrength *
                ONYX_HIGHLIGHT_MAX_INTENSITY

            const targetDistance =
                ONYX_HIGHLIGHT_BASE_DISTANCE +
                selectionStrength *
                    (
                        ONYX_HIGHLIGHT_DISTANCE -
                        ONYX_HIGHLIGHT_BASE_DISTANCE
                    )

            onyxLightRef.current.intensity =
                MathUtils.damp(
                    onyxLightRef.current.intensity,
                    targetIntensity,
                    7,
                    delta,
                )

            onyxLightRef.current.distance =
                MathUtils.damp(
                    onyxLightRef.current.distance,
                    targetDistance,
                    7,
                    delta,
                )

            if (
                lightActive &&
                !closeFirstRenderCaptured.current
            ) {
                closeFirstRenderCaptured.current =
                    true
                recordFirstRenderDiagnostic(
                    'close',
                    renderScene,
                    gl,
                )
            }
        }
    })

    if (!onyx) {
        return null
    }

    return (
        <>
            <group
                ref={(node) => {
                    group.current =
                        node

                    if (onyxRef) {
                        onyxRef.current = node
                    }
                }}
                scale={MODEL_SCALE}
                position={VISUAL_OFFSET}
            >
                <Center>
                    <primitive
                        object={onyx}
                    />
                </Center>
            </group>

            <pointLight
                ref={onyxLightRef}
                position={[
                    VISUAL_OFFSET[0] +
                        ONYX_HIGHLIGHT_OFFSET[0],

                    VISUAL_OFFSET[1] +
                        ONYX_HIGHLIGHT_OFFSET[1],

                    VISUAL_OFFSET[2] +
                        ONYX_HIGHLIGHT_OFFSET[2],
                ]}
                color={ONYX_HIGHLIGHT_COLOR}
                intensity={0}
                distance={
                    ONYX_HIGHLIGHT_BASE_DISTANCE
                }
                decay={ONYX_HIGHLIGHT_DECAY}
                visible={false}
            />
        </>
    )
}

useGLTF.preload(
    MODEL_URL,
    true,
    true,
    (loader) => {
        loader.setMeshoptDecoder(
            MeshoptDecoder,
        )
    },
)

export default OnyxModel
