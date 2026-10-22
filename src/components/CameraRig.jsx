/* eslint-disable react-hooks/immutability -- React Three Fiber camera is updated imperatively per frame. */

import { useFrame, useThree } from '@react-three/fiber'

import {
    Box3,
    MathUtils,
    Raycaster,
    Sphere,
    Vector3,
} from 'three'

import { useRef } from 'react'

const HERO_CAMERA = {
    position: [0, 0.1, 15.25],
    target: [0, 0, 0],
}

const ORBIT_CAMERA = {
    position: [0, 0.62, 6.05],
    target: [0, 0.08, 0],
}

const HERO_CAMERA_POSITION =
    new Vector3(...HERO_CAMERA.position)

const HERO_CAMERA_TARGET =
    new Vector3(...HERO_CAMERA.target)

const ORBIT_CAMERA_POSITION =
    new Vector3(...ORBIT_CAMERA.position)

const PROJECT_CAMERA_RADIUS = 6.0
const PROJECT_CAMERA_ELEVATION = 0.8
const PROJECT_HOLD_PROGRESS = 0.995
const PROJECT_COUNT = 5

const CASE_OVERLAY_FADE_START_DISTANCE = 0.7
const CASE_OVERLAY_FADE_END_DISTANCE = 0.35

const CASE_FILE_ENTRY_DURATION = 0.9
const CASE_CONTACT_CLEARANCE = 0.30
const CASE_DISSOLVE_HOLD_PROGRESS = 0.55

// Number of frames before shard contact to begin the final transition.
const CASE_TRANSITION_EARLY_FRAMES = 4

const RESPONSIVE_FOV_ASPECT_START = 1.2
const RESPONSIVE_FOV_ASPECT_END = 0.02
const RESPONSIVE_FOV_MAX_MULTIPLIER = 1.7

const PROJECT_ROUTE_ANGLES = [
    0,
    (Math.PI * 4) / 5,
    (Math.PI * 8) / 5,
    (Math.PI * 12) / 5,
    (Math.PI * 16) / 5,
]

const PROJECT_TRAVEL_DIRECTION = 1

function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum,
    )
}

function smoothStep(value) {
    return value * value * (3 - 2 * value)
}

// Recover the unsmoothed timeline progress from a smoothStep value.
function inverseSmoothStep(value) {
    const target = clamp(value, 0, 1)

    if (target <= 0) return 0
    if (target >= 1) return 1

    let low = 0
    let high = 1

    for (let i = 0; i < 18; i += 1) {
        const middle = (low + high) / 2

        if (smoothStep(middle) < target) {
            low = middle
        } else {
            high = middle
        }
    }

    return (low + high) / 2
}

function collectVisibleMeshes(root, meshBuffer) {
    meshBuffer.length = 0

    if (!root) {
        return
    }

    root.traverse((object) => {
        if (!object.isMesh || !object.geometry) {
            return
        }

        let ancestor = object

        while (ancestor) {
            if (!ancestor.visible) {
                return
            }

            ancestor = ancestor.parent
        }

        meshBuffer.push(object)
    })
}

function getNearestVisibleSurfaceHit(
    root,
    raycaster,
    meshBuffer,
    origin,
    direction,
    maxDistance = Infinity,
    refreshScene = true,
) {
    if (!root) {
        return null
    }

    if (refreshScene) {
        root.updateWorldMatrix(true, true)
        collectVisibleMeshes(root, meshBuffer)
    }

    if (meshBuffer.length === 0) {
        return null
    }

    raycaster.near = 0
    raycaster.far = maxDistance

    raycaster.set(origin, direction)

    const intersections = raycaster.intersectObjects(
        meshBuffer,
        false,
    )

    return intersections[0] ?? null
}

function setCaseFileOverlayOpacity(
    transitionApi,
    opacity,
) {
    if (!transitionApi) {
        return
    }

    const nextOpacity = clamp(opacity, 0, 1)

    transitionApi.overlayOpacity = nextOpacity

    const overlay = transitionApi.overlayElement

    if (!overlay) {
        return
    }

    if (overlay.style.transition !== 'none') {
        overlay.style.transition = 'none'
    }

    const opacityValue = String(
        Number(nextOpacity.toFixed(3)),
    )

    if (overlay.style.opacity !== opacityValue) {
        overlay.style.opacity = opacityValue
    }
}

function getOrbitAngle(x, z) {
    return Math.atan2(-z, x)
}

function setOrbitPosition(out, angle, radius, y) {
    out.set(
        Math.cos(angle) * radius,
        y,
        -Math.sin(angle) * radius,
    )
}

function shortestAngleDelta(start, end) {
    return Math.atan2(
        Math.sin(end - start),
        Math.cos(end - start),
    )
}

function directedAngleDelta(start, end, direction) {
    const shortest =
        shortestAngleDelta(start, end)

    if (direction >= 0) {
        return shortest >= 0
            ? shortest
            : shortest + Math.PI * 2
    }

    return shortest <= 0
        ? shortest
        : shortest - Math.PI * 2
}

function getProjectKey(index) {
    return `project${String(
        index + 1,
    ).padStart(2, '0')}`
}

function getProjectState(
    sceneStates,
    index,
    fallbackState,
) {
    return (
        sceneStates?.[getProjectKey(index)] ??
        fallbackState
    )
}

function addArrayOffset(vector, offset) {
    vector.x += offset[0]
    vector.y += offset[1]
    vector.z += offset[2]
}

function getResponsiveFov(baseFov, aspect) {
    if (
        !Number.isFinite(aspect) ||
        aspect <= 0
    ) {
        return baseFov
    }

    const narrowStrength =
        1 -
        MathUtils.smoothstep(
            aspect,
            RESPONSIVE_FOV_ASPECT_END,
            RESPONSIVE_FOV_ASPECT_START,
        )

    const multiplier =
        MathUtils.lerp(
            1,
            RESPONSIVE_FOV_MAX_MULTIPLIER,
            narrowStrength,
        )

    const baseRadians =
        MathUtils.degToRad(baseFov)

    return MathUtils.radToDeg(
        2 * Math.atan(
            Math.tan(baseRadians / 2) * multiplier,
        ),
    )
}

function CameraRig({
    scrollProgress,
    projectTimelineProgress,
    project01Ref,
    project02Ref,
    project03Ref,
    project04Ref,
    project05Ref,
    sceneStates,
    previewState,
    debugElement,
    caseFileTransitionRef,
}) {
    const { camera, size } = useThree()

    const position = useRef(new Vector3())
    const target = useRef(new Vector3())

    const smoothedPosition = useRef(new Vector3())
    const smoothedTarget = useRef(new Vector3())

    const smoothedFov = useRef(0)
    const lastProjectionFov = useRef(null)
    const cameraInitializedRef = useRef(false)

    const heldProjectTarget = useRef(new Vector3())
    const heldProjectTargetIndex = useRef(-1)

    const initialSceneStates = useRef(sceneStates)

    const lastTravelDirection = useRef(
        PROJECT_TRAVEL_DIRECTION,
    )

    const wasTimelineStationary = useRef(true)
    const reverseRouteUpperIndex = useRef(null)

    const lastProjectPosition = useRef(
        projectTimelineProgress?.current ?? 0,
    )

    const projectWorldPositions = useRef(
        Array.from(
            { length: PROJECT_COUNT },
            () => new Vector3(),
        ),
    )

    const projectTargets = useRef(
        Array.from(
            { length: PROJECT_COUNT },
            () => new Vector3(),
        ),
    )

    const routeTargets = useRef(
        Array.from(
            { length: PROJECT_COUNT + 1 },
            () => new Vector3(),
        ),
    )

    const routeRadii = useRef(
        new Float32Array(PROJECT_COUNT + 1),
    )

    const routeYs = useRef(
        new Float32Array(PROJECT_COUNT + 1),
    )

    const routeAngles = useRef(
        new Float32Array(PROJECT_COUNT + 1),
    )

    const routeFovs = useRef(
        new Float32Array(PROJECT_COUNT + 1),
    )

    const closeTarget = useRef(new Vector3())
    const closeCameraPosition = useRef(new Vector3())

    const projectRefs = [
        project01Ref,
        project02Ref,
        project03Ref,
        project04Ref,
        project05Ref,
    ]

    // ------------------------------------------------------------
    // CASE FILE CAMERA TRANSITION STATE
    // ------------------------------------------------------------

    const caseTransitionRef = useRef({
        mode: 'idle',
        elapsed: 0,
        duration: CASE_FILE_ENTRY_DURATION,

        // Original entry path. These values are preserved even
        // when the camera stops before reaching the planned endpoint.
        entryStartPosition: new Vector3(),
        entryStartTarget: new Vector3(),
        entryStartFov: 36,

        // Actual camera pose held while the case-file page is open.
        entryContactPosition: new Vector3(),
        entryContactTarget: new Vector3(),
        entryContactFov: 36,
        reverseStartPending: false,

        entryPathEndPosition: new Vector3(),
        entryPathEndTarget: new Vector3(),
        entryPathEndFov: 36,

        // Raw timeline progress and elapsed time at actual contact.
        entryProgressAtContact: 1,
        entryElapsedAtContact: CASE_FILE_ENTRY_DURATION,

        // Diagnostics for the forward approach.
        entryFrameCount: 0,
        entryStartedAt: 0,
        previousEasedProgress: 0,

        fromPosition: new Vector3(),
        fromTarget: new Vector3(),
        fromFov: 36,

        toPosition: new Vector3(),
        toTarget: new Vector3(),
        toFov: 36,

        surfaceHitPosition: new Vector3(),

        returnPosition: new Vector3(),
        returnTarget: new Vector3(),
        returnFov: 36,

        onComplete: null,

        shard: null,
hasSurfaceHit: false,
contactPosition: new Vector3(),
contactTarget: new Vector3(),
    })

    const caseBoundsRef = useRef(new Box3())
    const caseSphereRef = useRef(new Sphere())
    const caseDirectionRef = useRef(new Vector3())
    const caseRaycasterRef = useRef(new Raycaster())
    const caseVisibleMeshesRef = useRef([])
    const caseNextPositionRef = useRef(new Vector3())

    useFrame((state, delta) => {
        // ============================================================
        // CASE FILE: ENTRY, HOLD, AND RETURN
        // ============================================================

        const transitionApi =
            caseFileTransitionRef?.current

        const caseTransition =
            caseTransitionRef.current

        const transitionRequest =
            transitionApi?.request

        // ------------------------------------------------------------
        // ENTRY INITIALIZATION
        // ------------------------------------------------------------

        if (
            transitionRequest?.type === 'enter' &&
            caseTransition.mode === 'idle'
        ) {
            const requestedShardIndex =
                Number(transitionRequest.systemIndex)

            const shardIndex = clamp(
                Number.isFinite(requestedShardIndex)
                    ? requestedShardIndex
                    : 0,
                0,
                PROJECT_COUNT - 1,
            )

            const shard =
                projectRefs[shardIndex]?.current

            if (shard) {
                transitionApi.request = null

                transitionApi.activeShardIndex =
                    shardIndex

                transitionApi.transitionProgress = 0
                transitionApi.transitionPhase = 'entering'
                transitionApi.overlayPhase = 'entering'

                setCaseFileOverlayOpacity(
                    transitionApi,
                    0,
                )

                // Save the exact camera starting point.
                caseTransition.returnPosition.copy(
                    camera.position,
                )

                caseTransition.returnTarget.copy(
                    smoothedTarget.current,
                )

                caseTransition.returnFov = camera.fov

                caseTransition.fromPosition.copy(
                    camera.position,
                )

                caseTransition.fromTarget.copy(
                    smoothedTarget.current,
                )

                caseTransition.fromFov = camera.fov

                caseTransition.entryStartPosition.copy(
                    camera.position,
                )

                caseTransition.entryStartTarget.copy(
                    smoothedTarget.current,
                )

                caseTransition.entryStartFov =
                    camera.fov

                caseTransition.entryProgressAtContact = 1

                caseTransition.entryElapsedAtContact =
                    CASE_FILE_ENTRY_DURATION

                caseTransition.previousEasedProgress = 0

                caseTransition.entryFrameCount = 0
                caseTransition.entryStartedAt =
                    performance.now()

                shard.updateWorldMatrix(true, true)

                caseBoundsRef.current.setFromObject(shard)

                caseBoundsRef.current.getBoundingSphere(
                    caseSphereRef.current,
                )

                caseTransition.toTarget.copy(
                    caseSphereRef.current.center,
                )

                const approachDirection =
                    caseDirectionRef.current
                        .copy(caseTransition.toTarget)
                        .sub(camera.position)

                if (approachDirection.lengthSq() < 0.00001) {
                    camera.getWorldDirection(
                        approachDirection,
                    )
                }

                approachDirection.normalize()

                const shardRadius =
                    caseSphereRef.current.radius > 0
                        ? caseSphereRef.current.radius
                        : 0.75

                caseTransition.shard = shard

                const centerDistance =
                    camera.position.distanceTo(
                        caseTransition.toTarget,
                    )

                const frontSurfaceHit =
                    getNearestVisibleSurfaceHit(
                        shard,
                        caseRaycasterRef.current,
                        caseVisibleMeshesRef.current,
                        camera.position,
                        approachDirection,
                        centerDistance + shardRadius + 0.1,
                    )

                caseTransition.hasSurfaceHit =
                    Boolean(frontSurfaceHit)

                if (frontSurfaceHit) {
                    caseTransition.surfaceHitPosition.copy(
                        frontSurfaceHit.point,
                    )

                    // Stop before the surface, not inside the shard.
                    caseTransition.contactPosition
                        .copy(frontSurfaceHit.point)
                        .addScaledVector(
                            approachDirection,
                            -CASE_CONTACT_CLEARANCE,
                        )

                    // Preserve the planned path through the surface.
                    caseTransition.toPosition
                        .copy(frontSurfaceHit.point)
                        .addScaledVector(
                            approachDirection,
                            CASE_CONTACT_CLEARANCE,
                        )
                } else {
                    // Safe fallback if the mesh cannot be raycast.
                    const thresholdDistance =
                        Math.max(
                            shardRadius + 0.08,
                            0.2,
                        )

                    caseTransition.toPosition
                        .copy(caseTransition.toTarget)
                        .addScaledVector(
                            approachDirection,
                            -thresholdDistance,
                        )

                    caseTransition.contactPosition.copy(
                        caseTransition.toPosition,
                    )
                }

                caseTransition.toFov = camera.fov

                // Store the planned endpoint before contact changes it.
                caseTransition.entryPathEndPosition.copy(
                    caseTransition.toPosition,
                )

                caseTransition.entryPathEndTarget.copy(
                    caseTransition.toTarget,
                )

                caseTransition.entryPathEndFov =
                    caseTransition.toFov

                caseTransition.elapsed = 0

                caseTransition.duration =
                    CASE_FILE_ENTRY_DURATION

                caseTransition.mode = 'entering'

                caseTransition.onComplete =
                    transitionRequest.onComplete ?? null

                transitionApi.mode = 'transitioning'
            }
        }

        // ------------------------------------------------------------
        // RETURN INITIALIZATION
        // ------------------------------------------------------------

        if (
            transitionRequest?.type === 'return' &&
            caseTransition.mode === 'open'
        ) {
            transitionApi.request = null
            transitionApi.overlayPhase = 'returning'

            setCaseFileOverlayOpacity(
                transitionApi,
                1,
            )

            // Restore the original portfolio destination.
            // Do not overwrite the saved forward-path endpoints.
            caseTransition.returnPosition.copy(
                caseTransition.entryStartPosition,
            )

            caseTransition.returnTarget.copy(
                caseTransition.entryStartTarget,
            )

            caseTransition.returnFov =
                caseTransition.entryStartFov

            // Start the reverse from the exact pose currently shown
            // during the open hold. Its animation advances from the next
            // rendered frame, avoiding a first-frame progress jump.
            caseTransition.elapsed = 0
            caseTransition.duration = Math.max(
                caseTransition.entryElapsedAtContact,
                0.12,
            )
            caseTransition.reverseStartPending = true

            caseTransition.mode = 'exiting'

            transitionApi.transitionPhase = 'exiting'

            caseTransition.onComplete =
                transitionRequest.onComplete ?? null

            transitionApi.mode = 'transitioning'
        }

        // ------------------------------------------------------------
        // CAMERA OWNERSHIP
        // ------------------------------------------------------------

        if (caseTransition.mode !== 'idle') {
            if (caseTransition.mode === 'open') {
                camera.position.copy(
                    caseTransition.entryContactPosition,
                )

                smoothedPosition.current.copy(
                    camera.position,
                )

                smoothedTarget.current.copy(
                    caseTransition.entryContactTarget,
                )

                camera.fov = caseTransition.entryContactFov

                camera.lookAt(
                    caseTransition.entryContactTarget,
                )
            } else {
                const frameDelta = Math.max(delta, 0)

                if (caseTransition.reverseStartPending) {
                    caseTransition.reverseStartPending = false
                } else {
                    caseTransition.elapsed += frameDelta
                }

                const progress = clamp(
                    caseTransition.elapsed /
                        caseTransition.duration,
                    0,
                    1,
                )

                const easedProgress =
                    smoothStep(progress)

                const isEntering =
                    caseTransition.mode === 'entering'

                if (isEntering) {
                    caseTransition.entryFrameCount += 1
                }

                // ----------------------------------------------------
                // CONTACT TIMING
                // ----------------------------------------------------

                let contactPathProgress = 1

                if (isEntering) {
                    const totalApproachDistance =
                        caseTransition.fromPosition.distanceTo(
                            caseTransition.toPosition,
                        )

                    const contactDistanceFromStart =
                        caseTransition.fromPosition.distanceTo(
                            caseTransition.contactPosition,
                        )

                    contactPathProgress =
                        totalApproachDistance > 0.000001
                            ? clamp(
                                contactDistanceFromStart /
                                    totalApproachDistance,
                                0,
                                1,
                            )
                            : 1

                    // Recover the exact point on the original timeline
                    // that corresponds to the safe contact position.
                    const rawContactProgress =
                        inverseSmoothStep(
                            contactPathProgress,
                        )

                    caseTransition.entryProgressAtContact =
                        rawContactProgress

                    caseTransition.entryElapsedAtContact =
                        Math.max(
                            rawContactProgress *
                                CASE_FILE_ENTRY_DURATION,
                            0.12,
                        )

                    const heldProgress = Math.min(
                        easedProgress,
                        CASE_DISSOLVE_HOLD_PROGRESS,
                    )

                    const easedProgressStep =
                        easedProgress -
                        caseTransition.previousEasedProgress

                    const estimatedFramesUntilContact =
                        easedProgressStep > 0.000001
                            ? Math.max(
                                0,
                                (
                                    contactPathProgress -
                                    easedProgress
                                ) / easedProgressStep,
                            )
                            : Infinity

                    let nextTransitionProgress =
                        heldProgress

                    // Start releasing the final transition phase
                    // a few rendered frames before camera contact.
                    if (
                        CASE_TRANSITION_EARLY_FRAMES > 0 &&
                        estimatedFramesUntilContact <=
                            CASE_TRANSITION_EARLY_FRAMES
                    ) {
                        const preImpactBlend = clamp(
                            1 -
                                estimatedFramesUntilContact /
                                    CASE_TRANSITION_EARLY_FRAMES,
                            0,
                            1,
                        )

                        const finalPhaseProgress =
                            CASE_DISSOLVE_HOLD_PROGRESS +
                            (1 - CASE_DISSOLVE_HOLD_PROGRESS) *
                                preImpactBlend

                        nextTransitionProgress = Math.max(
                            heldProgress,
                            finalPhaseProgress,
                        )
                    }

                    transitionApi.transitionProgress =
                        nextTransitionProgress

                    caseTransition.previousEasedProgress =
                        easedProgress
                }

                // ----------------------------------------------------
                // REVERSE PATH PROGRESS
                // ----------------------------------------------------

                // Reverse the same raw timeline used by the forward
                // approach, so its position, target, and FOV retrace
                // the saved entry path in the opposite direction.
                const reverseRawProgress =
                    caseTransition.entryProgressAtContact *
                    (1 - progress)

                const reverseEasedProgress =
                    smoothStep(reverseRawProgress)

                const motionProgress = isEntering
                    ? easedProgress
                    : reverseEasedProgress

                if (!isEntering) {
                    const contactEasedProgress =
                        smoothStep(
                            caseTransition.entryProgressAtContact,
                        )

                    const normalizedReturnProgress =
                        contactEasedProgress > 0.000001
                            ? reverseEasedProgress /
                                contactEasedProgress
                            : 1 - progress

                    // Fade the dissolve back out smoothly as the camera
                    // reverses away from the shard.
                    transitionApi.transitionProgress =
                        clamp(
                            normalizedReturnProgress,
                            0,
                            1,
                        )
                }

                // Forward uses its original path.
                // Return traces the same stored path backward.
                const nextCameraPosition =
                    isEntering
                        ? caseNextPositionRef.current.lerpVectors(
                            caseTransition.fromPosition,
                            caseTransition.toPosition,
                            motionProgress,
                        )
                        : caseNextPositionRef.current.lerpVectors(
                            caseTransition.entryStartPosition,
                            caseTransition.entryPathEndPosition,
                            motionProgress,
                        )

                // ----------------------------------------------------
                // CONTACT TEST
                // ----------------------------------------------------

                // Keep the current forward contact condition unchanged.
                const reachedContact =
                    isEntering &&
                    easedProgress >=
                        contactPathProgress - 0.000001

                if (reachedContact) {
                    camera.position.copy(
                        caseTransition.contactPosition,
                    )
                } else {
                    camera.position.copy(
                        nextCameraPosition,
                    )
                }

                smoothedPosition.current.copy(
                    camera.position,
                )

                // Forward target interpolation is unchanged.
                // Return follows the same target path in reverse.
                smoothedTarget.current.lerpVectors(
                    isEntering
                        ? caseTransition.fromTarget
                        : caseTransition.entryStartTarget,

                    isEntering
                        ? caseTransition.toTarget
                        : caseTransition.entryPathEndTarget,

                    reachedContact
                        ? contactPathProgress
                        : motionProgress,
                )

                // Forward FOV interpolation is unchanged.
                // Return follows the same FOV path in reverse.
                camera.fov = MathUtils.lerp(
                    isEntering
                        ? caseTransition.fromFov
                        : caseTransition.entryStartFov,

                    isEntering
                        ? caseTransition.toFov
                        : caseTransition.entryPathEndFov,

                    reachedContact
                        ? contactPathProgress
                        : motionProgress,
                )

                camera.lookAt(
                    smoothedTarget.current,
                )

                // ----------------------------------------------------
                // OVERLAY FADE
                // ----------------------------------------------------

                if (isEntering && !reachedContact) {
                    const distanceToContact =
                        camera.position.distanceTo(
                            caseTransition.contactPosition,
                        )

                    const overlayOpacity =
                        1 - MathUtils.smoothstep(
                            distanceToContact,
                            CASE_OVERLAY_FADE_END_DISTANCE,
                            CASE_OVERLAY_FADE_START_DISTANCE,
                        )

                    setCaseFileOverlayOpacity(
                        transitionApi,
                        overlayOpacity,
                    )
                } else if (
                    caseTransition.mode === 'exiting'
                ) {
                    const distanceFromContact =
                        camera.position.distanceTo(
                            caseTransition.contactPosition,
                        )

                    const overlayOpacity =
                        1 - MathUtils.smoothstep(
                            distanceFromContact,
                            CASE_OVERLAY_FADE_END_DISTANCE,
                            CASE_OVERLAY_FADE_START_DISTANCE,
                        )

                    setCaseFileOverlayOpacity(
                        transitionApi,
                        overlayOpacity,
                    )
                }

                // ----------------------------------------------------
                // ENTRY HANDOFF
                // ----------------------------------------------------

                if (
                    isEntering &&
                    (reachedContact || progress >= 1)
                ) {
                    setCaseFileOverlayOpacity(
                        transitionApi,
                        1,
                    )

                    transitionApi.overlayPhase = 'holding'
                    transitionApi.transitionProgress = 1

                    camera.position.copy(
                        caseTransition.contactPosition,
                    )

                    caseTransition.toPosition.copy(
                        caseTransition.contactPosition,
                    )

                    smoothedPosition.current.copy(
                        camera.position,
                    )

                    smoothedTarget.current.lerpVectors(
                        caseTransition.fromTarget,
                        caseTransition.toTarget,
                        contactPathProgress,
                    )

                    caseTransition.entryContactPosition.copy(
                        camera.position,
                    )

                    caseTransition.entryContactTarget.copy(
                        smoothedTarget.current,
                    )

                    caseTransition.entryContactFov = camera.fov

                    camera.lookAt(
                        smoothedTarget.current,
                    )

                    if (progress >= 1 && !reachedContact) {
                        console.warn(
                            '[ONYX CASE FILE] Entry reached its duration fallback.',
                        )
                    }

                    console.log(
                        '[ONYX CASE FILE APPROACH MEASURED]',
                        {
                            frameCount:
                                caseTransition.entryFrameCount,

                            elapsedMs: Math.round(
                                performance.now() -
                                    caseTransition.entryStartedAt,
                            ),

                            approachProgress: Number(
                                progress.toFixed(4),
                            ),

                            contactProgress: Number(
                                contactPathProgress.toFixed(4),
                            ),

                            currentTrigger:
                                reachedContact
                                    ? 'CONTACT PROGRESS'
                                    : 'DURATION FALLBACK',

                            cameraPosition:
                                camera.position
                                    .toArray()
                                    .map((value) =>
                                        Number(
                                            value.toFixed(4),
                                        ),
                                    ),

                            contactPosition:
                                caseTransition.contactPosition
                                    .toArray()
                                    .map((value) =>
                                        Number(
                                            value.toFixed(4),
                                        ),
                                    ),

                            viewport:
                                `${size.width}x${size.height}`,

                            surfaceHitFound:
                                caseTransition.hasSurfaceHit,

                            surfaceHitPosition:
                                caseTransition.hasSurfaceHit
                                    ? caseTransition.surfaceHitPosition
                                        .toArray()
                                        .map((value) =>
                                            Number(
                                                value.toFixed(4),
                                            ),
                                        )
                                    : null,
                        },
                    )

                    caseTransition.mode = 'open'
                    transitionApi.mode = 'open'

                    const onComplete =
                        caseTransition.onComplete

                    caseTransition.onComplete = null

                    onComplete?.()
                } else if (
                    !isEntering &&
                    progress >= 1 &&
                    caseTransition.mode === 'exiting'
                ) {
                    // ------------------------------------------------
                    // REVERSE TRANSITION COMPLETION
                    // ------------------------------------------------

                    camera.position.copy(
                        caseTransition.returnPosition,
                    )

                    camera.fov =
                        caseTransition.returnFov

                    camera.lookAt(
                        caseTransition.returnTarget,
                    )

                    position.current.copy(
                        caseTransition.returnPosition,
                    )

                    target.current.copy(
                        caseTransition.returnTarget,
                    )

                    smoothedPosition.current.copy(
                        caseTransition.returnPosition,
                    )

                    smoothedTarget.current.copy(
                        caseTransition.returnTarget,
                    )

                    smoothedFov.current =
                        caseTransition.returnFov

                    caseTransition.mode = 'idle'
                    caseTransition.shard = null
                    caseTransition.hasSurfaceHit = false

                    transitionApi.mode = 'idle'
                    transitionApi.activeShardIndex = null
                    transitionApi.transitionProgress = 0
                    transitionApi.transitionPhase = 'idle'
                    transitionApi.overlayPhase = 'return-complete'

                    const onComplete =
                        caseTransition.onComplete

                    caseTransition.onComplete = null

                    onComplete?.()
                }
            }

            if (
                lastProjectionFov.current !== camera.fov
            ) {
                camera.updateProjectionMatrix()

                lastProjectionFov.current =
                    camera.fov
            }

            // Do not let the scroll camera override the case-file transition.
            return
        }

        // ============================================================
        // EXISTING SCROLL-DRIVEN CAMERA
        // ============================================================

        const viewportAspect =
            size.width /
            Math.max(size.height, 1)

        const rawIntroProgress =
            clamp(
                scrollProgress.current,
                0,
                1,
            )

        const intro =
            smoothStep(rawIntroProgress)

        const close =
            sceneStates.close

        const isPreview =
            Boolean(previewState)

        const activePreviewState =
            previewState
                ? sceneStates?.[previewState]
                : null

        // ------------------------------------------------------------
        // WORLD POSITIONS
        // ------------------------------------------------------------

        for (
            let index = 0;
            index < PROJECT_COUNT;
            index += 1
        ) {
            const ref =
                projectRefs[index]

            if (ref?.current) {
                ref.current.getWorldPosition(
                    projectWorldPositions.current[index],
                )
            }
        }

        closeTarget.current.fromArray(
            close.camera.target,
        )

        closeCameraPosition.current.fromArray(
            close.camera.position,
        )

        for (
            let index = 0;
            index < PROJECT_COUNT;
            index += 1
        ) {
            const projectState =
                getProjectState(
                    sceneStates,
                    index,
                    close,
                )

            projectTargets.current[index].copy(
                projectWorldPositions.current[index],
            )

            addArrayOffset(
                projectTargets.current[index],
                projectState.camera.target,
            )
        }

        // ------------------------------------------------------------
        // PREVIEW
        // ------------------------------------------------------------

        if (
            isPreview &&
            activePreviewState
        ) {
            const savedCameraPosition =
                activePreviewState.camera.position

            const initialCameraPosition =
                initialSceneStates.current?.[
                    previewState
                ]?.camera?.position ??
                savedCameraPosition

            if (
                previewState?.startsWith('project')
            ) {
                const previewIndex = clamp(
                    Number(
                        previewState.replace('project', ''),
                    ) - 1,
                    0,
                    PROJECT_COUNT - 1,
                )

                setOrbitPosition(
                    position.current,
                    PROJECT_ROUTE_ANGLES[previewIndex],
                    PROJECT_CAMERA_RADIUS,
                    PROJECT_CAMERA_ELEVATION,
                )

                target.current.copy(
                    projectTargets.current[previewIndex],
                )
            } else {
                position.current.lerpVectors(
                    HERO_CAMERA_POSITION,
                    ORBIT_CAMERA_POSITION,
                    intro,
                )

                target.current.fromArray(
                    activePreviewState.camera.target,
                )
            }

            position.current.x +=
                savedCameraPosition[0] -
                initialCameraPosition[0]

            position.current.y +=
                savedCameraPosition[1] -
                initialCameraPosition[1]

            position.current.z +=
                savedCameraPosition[2] -
                initialCameraPosition[2]

            const previewFov =
                getResponsiveFov(
                    activePreviewState.camera.fov,
                    viewportAspect,
                )

            camera.position.copy(
                position.current,
            )

            camera.fov = previewFov

            camera.lookAt(
                target.current,
            )

            if (
                lastProjectionFov.current !== camera.fov
            ) {
                camera.updateProjectionMatrix()

                lastProjectionFov.current =
                    camera.fov
            }

            smoothedPosition.current.copy(
                camera.position,
            )

            smoothedTarget.current.copy(
                target.current,
            )

            smoothedFov.current = camera.fov

            cameraInitializedRef.current = true

            return
        }

        // ------------------------------------------------------------
        // CONTINUOUS PROJECT POSITION
        // ------------------------------------------------------------

        const projectPosition =
            clamp(
                projectTimelineProgress?.current ?? 0,
                0,
                PROJECT_COUNT,
            )

        const projectLocal =
            projectPosition -
            Math.floor(projectPosition)

        const previousProjectPosition =
            lastProjectPosition.current

        const projectDelta =
            projectPosition -
            previousProjectPosition

        // ------------------------------------------------------------
        // TRAVEL DIRECTION / REVERSE ROUTE LATCH
        // ------------------------------------------------------------

        if (
            Math.abs(projectDelta) > 0.00001
        ) {
            const nextTravelDirection =
                projectDelta < 0 ? -1 : 1

            if (nextTravelDirection < 0) {
                let nextReverseRouteUpperIndex =
                    reverseRouteUpperIndex.current

                if (
                    nextReverseRouteUpperIndex === null
                ) {
                    nextReverseRouteUpperIndex =
                        clamp(
                            Math.ceil(
                                projectPosition + 0.000001,
                            ),
                            1,
                            PROJECT_COUNT,
                        )
                }

                while (
                    nextReverseRouteUpperIndex > 1
                ) {
                    const lowerIndex =
                        nextReverseRouteUpperIndex - 1

                    const destinationHold =
                        lowerIndex +
                        PROJECT_HOLD_PROGRESS -
                        1

                    if (
                        projectPosition <= destinationHold
                    ) {
                        nextReverseRouteUpperIndex -= 1
                    } else {
                        break
                    }
                }

                reverseRouteUpperIndex.current =
                    nextReverseRouteUpperIndex
            }

            if (nextTravelDirection > 0) {
                reverseRouteUpperIndex.current = null
            }

            lastTravelDirection.current =
                nextTravelDirection

            wasTimelineStationary.current = false
        } else {
            wasTimelineStationary.current = true
        }

        const movingBackward =
            lastTravelDirection.current < 0

        let debugState = 'REST'

        // ------------------------------------------------------------
        // DEBUG STATE
        // ------------------------------------------------------------

        if (projectPosition > 0) {
            const forwardFromIndex =
                Math.min(
                    Math.floor(projectPosition),
                    PROJECT_COUNT - 1,
                )

            const segmentFromIndex =
                movingBackward &&
                reverseRouteUpperIndex.current !== null
                    ? reverseRouteUpperIndex.current - 1
                    : forwardFromIndex

            const segmentToIndex =
                movingBackward &&
                reverseRouteUpperIndex.current !== null
                    ? reverseRouteUpperIndex.current
                    : Math.min(
                        forwardFromIndex + 1,
                        PROJECT_COUNT,
                    )

            const segmentProgress =
                projectPosition - segmentFromIndex

            if (
                movingBackward &&
                projectPosition <= 0.000001
            ) {
                debugState = 'P01 → CLOSE'
            } else if (
                !movingBackward &&
                segmentProgress >= PROJECT_HOLD_PROGRESS
            ) {
                const heldIndex =
                    segmentToIndex

                debugState =
                    heldIndex <= 0
                        ? 'CLOSE'
                        : `P${String(
                            Math.min(
                                heldIndex,
                                PROJECT_COUNT,
                            ),
                        ).padStart(2, '0')} HOLD`
            } else {
                debugState =
                    movingBackward
                        ? segmentToIndex === 1
                            ? 'P01 → CLOSE'
                            : `P${String(
                                segmentToIndex,
                            ).padStart(2, '0')} → P${String(
                                segmentToIndex - 1,
                            ).padStart(2, '0')}`
                        : segmentToIndex === 1
                            ? 'CLOSE → P01'
                            : `P${String(
                                segmentToIndex - 1,
                            ).padStart(2, '0')} → P${String(
                                segmentToIndex,
                            ).padStart(2, '0')}`
            }
        } else if (rawIntroProgress >= 1) {
            debugState = 'CLOSE'
        }

        lastProjectPosition.current =
            projectPosition

        // ------------------------------------------------------------
        // BUILD THE SIX UNIFIED ROUTE WAYPOINTS
        // ------------------------------------------------------------

        routeTargets.current[0].copy(
            closeTarget.current,
        )

        routeFovs.current[0] =
            close.camera.fov

        routeYs.current[0] =
            close.camera.position[1]

        routeRadii.current[0] =
            Math.hypot(
                close.camera.position[0],
                close.camera.position[2],
            )

        routeAngles.current[0] =
            getOrbitAngle(
                close.camera.position[0],
                close.camera.position[2],
            )

        for (
            let index = 0;
            index < PROJECT_COUNT;
            index += 1
        ) {
            const stateData =
                getProjectState(
                    sceneStates,
                    index,
                    close,
                )

            const routeIndex =
                index + 1

            const cameraData =
                stateData.camera

            routeTargets.current[routeIndex].copy(
                projectTargets.current[index],
            )

            routeFovs.current[routeIndex] =
                cameraData.fov

            routeYs.current[routeIndex] =
                PROJECT_CAMERA_ELEVATION

            routeRadii.current[routeIndex] =
                PROJECT_CAMERA_RADIUS

            routeAngles.current[routeIndex] =
                PROJECT_ROUTE_ANGLES[index]
        }

        // ------------------------------------------------------------
        // INTRO / HERO → CLOSE
        // ------------------------------------------------------------

        let desiredFov =
            close.camera.fov

        position.current.lerpVectors(
            HERO_CAMERA_POSITION,
            closeCameraPosition.current,
            intro,
        )

        target.current.lerpVectors(
            HERO_CAMERA_TARGET,
            closeTarget.current,
            intro,
        )

        // ------------------------------------------------------------
        // ONE CONTINUOUS ROUTE
        // ------------------------------------------------------------

        if (projectPosition > 0) {
            const clampedPosition =
                clamp(
                    projectPosition,
                    0,
                    PROJECT_COUNT,
                )

            const forwardFromIndex =
                Math.min(
                    Math.floor(clampedPosition),
                    PROJECT_COUNT - 1,
                )

            const forwardToIndex =
                Math.min(
                    forwardFromIndex + 1,
                    PROJECT_COUNT,
                )

            let segmentFromIndex =
                forwardFromIndex

            let segmentToIndex =
                forwardToIndex

            if (
                movingBackward &&
                reverseRouteUpperIndex.current !== null
            ) {
                segmentToIndex =
                    reverseRouteUpperIndex.current

                segmentFromIndex =
                    segmentToIndex - 1
            }

            const segmentProgress =
                clampedPosition - segmentFromIndex

            const forwardTravelProgress =
                clamp(
                    segmentProgress / PROJECT_HOLD_PROGRESS,
                    0,
                    1,
                )

            const forwardRouteProgress =
                smoothStep(
                    forwardTravelProgress,
                )

            const routeProgress =
                movingBackward
                    ? 1 - forwardRouteProgress
                    : forwardRouteProgress

            const isProjectHold =
                movingBackward
                    ? projectPosition <=
                      (
                          segmentFromIndex +
                          PROJECT_HOLD_PROGRESS -
                          1
                      )
                    : segmentProgress >= PROJECT_HOLD_PROGRESS

            const startIndex =
                movingBackward
                    ? segmentToIndex
                    : segmentFromIndex

            const endIndex =
                movingBackward
                    ? segmentFromIndex
                    : segmentToIndex

            const startTarget =
                routeTargets.current[startIndex]

            const endTarget =
                routeTargets.current[endIndex]

            const startAngle =
                routeAngles.current[startIndex]

            let endAngle =
                routeAngles.current[endIndex]

            if (
                startIndex === 0 &&
                endIndex === 1
            ) {
                endAngle =
                    startAngle +
                    directedAngleDelta(
                        startAngle,
                        endAngle,
                        PROJECT_TRAVEL_DIRECTION,
                    )
            }

            if (
                movingBackward &&
                startIndex > 0 &&
                endIndex > 0
            ) {
                const desiredDelta =
                    directedAngleDelta(
                        startAngle,
                        endAngle,
                        -PROJECT_TRAVEL_DIRECTION,
                    )

                endAngle =
                    startAngle + desiredDelta
            }

            const currentAngle =
                MathUtils.lerp(
                    startAngle,
                    endAngle,
                    routeProgress,
                )

            const currentRadius =
                MathUtils.lerp(
                    routeRadii.current[startIndex],
                    routeRadii.current[endIndex],
                    routeProgress,
                )

            const currentY =
                MathUtils.lerp(
                    routeYs.current[startIndex],
                    routeYs.current[endIndex],
                    routeProgress,
                )

            setOrbitPosition(
                position.current,
                currentAngle,
                currentRadius,
                currentY,
            )

            if (isProjectHold) {
                const heldIndex =
                    endIndex

                if (
                    heldProjectTargetIndex.current !== heldIndex
                ) {
                    heldProjectTarget.current.copy(
                        routeTargets.current[heldIndex],
                    )

                    heldProjectTargetIndex.current =
                        heldIndex
                }

                target.current.copy(
                    heldProjectTarget.current,
                )
            } else {
                target.current.lerpVectors(
                    startTarget,
                    endTarget,
                    routeProgress,
                )
            }

            desiredFov =
                MathUtils.lerp(
                    routeFovs.current[startIndex],
                    routeFovs.current[endIndex],
                    routeProgress,
                )

            const parallax =
                intro *
                Math.sin(
                    (
                        movingBackward
                            ? routeProgress
                            : 1 - routeProgress
                    ) * Math.PI,
                )

            position.current.x +=
                state.pointer.x * 0.075 * parallax

            position.current.y +=
                state.pointer.y * 0.045 * parallax
        }

        // ------------------------------------------------------------
        // RESPONSIVE FIELD OF VIEW
        // ------------------------------------------------------------

        desiredFov =
            getResponsiveFov(
                desiredFov,
                viewportAspect,
            )

        // ------------------------------------------------------------
        // CAMERA DAMPING
        // ------------------------------------------------------------

        const cameraDamping =
            1 -
            Math.exp(
                -12 *
                Math.min(
                    Math.max(delta, 0),
                    0.05,
                ),
            )

        if (!cameraInitializedRef.current) {
            smoothedPosition.current.copy(
                camera.position,
            )

            smoothedTarget.current.copy(
                target.current,
            )

            smoothedFov.current =
                camera.fov

            cameraInitializedRef.current = true
        }

        smoothedPosition.current.lerp(
            position.current,
            cameraDamping,
        )

        camera.position.copy(
            smoothedPosition.current,
        )

        smoothedTarget.current.lerp(
            target.current,
            cameraDamping,
        )

        smoothedFov.current +=
            (
                desiredFov -
                smoothedFov.current
            ) * cameraDamping

        camera.fov =
            smoothedFov.current

        camera.lookAt(
            smoothedTarget.current,
        )

        if (
            lastProjectionFov.current !== camera.fov
        ) {
            camera.updateProjectionMatrix()

            lastProjectionFov.current =
                camera.fov
        }

        // ------------------------------------------------------------
        // DEVELOPMENT CAMERA DEBUG
        // ------------------------------------------------------------

        if (
            import.meta.env.DEV &&
            debugElement.current
        ) {
            const debugProjectIndex =
                Math.min(
                    Math.floor(projectPosition),
                    PROJECT_COUNT - 1,
                )

            debugElement.current.textContent =
                `SCROLL DEBUG\n` +
                `scrollY: ${window.scrollY.toFixed(1)}\n` +
                `introProgress: ${(scrollProgress.current ?? 0).toFixed(4)}\n` +
                `projectTimelineProgress: ${projectPosition.toFixed(4)}\n` +
                `projectIndex: ${debugProjectIndex}\n` +
                `projectLocalProgress: ${projectLocal.toFixed(4)}\n\n` +
                `CAMERA DEBUG\n` +
                `camera.position.z: ${camera.position.z.toFixed(3)}\n` +
                `camera.position.y: ${camera.position.y.toFixed(3)}\n` +
                `camera.fov: ${camera.fov.toFixed(2)}\n\n` +
                `STATE:\n${debugState}`
        }
    })

    return null
}

export default CameraRig
