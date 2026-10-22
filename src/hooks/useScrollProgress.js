
import { useEffect, useRef } from 'react'

const INTRO_PROGRESS_SMOOTHING = 12

const INTRO_PROGRESS_EPSILON = 0.0005

const PROJECT_TIMELINE_EPSILON = 0.0005

const DEFAULT_PROJECT_COUNT = 5

const PROJECT_HOLD_PROGRESS = 0.995

const SCROLL_TRANSITION_DURATION = 900

const WHEEL_GESTURE_THRESHOLD = 24

const WHEEL_GESTURE_LOCK_DURATION =
    SCROLL_TRANSITION_DURATION + 120

const WHEEL_GESTURE_SEPARATION_DELAY = 180

const WHEEL_NOISE_FLOOR = 4

const WHEEL_FAST_REARM_MIN_DELTA = 32

const WHEEL_FAST_REARM_MAX_GAP = 50

const WHEEL_ACCUMULATOR_TIMEOUT = 120

const TOUCH_GESTURE_THRESHOLD = 28

const SCROLL_POSITION_EPSILON = 2

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

function easeInOutCubic(value) {
    return value < 0.5
        ? 4 *
              value *
              value *
              value
        : 1 -
              Math.pow(
                  -2 * value + 2,
                  3,
              ) /
                  2
}

export function useScrollTimeline({
    transitionViewports = 1,
    projectCount = DEFAULT_PROJECT_COUNT,
    projectStepViewports = 1,
} = {}) {
    const introProgress = useRef(0)

    // Raw scroll-derived intro value.
    const rawIntroProgress =
        useRef(0)

    const projectProgress =
        useRef(0)

    // Raw scroll-derived project timeline value.
    const rawProjectTimelineProgress =
        useRef(0)

    // Project timeline consumed directly by the scene.
    const projectTimelineProgress =
        useRef(0)

    // These represent the DIRECT project timeline.
    const projectIndex =
        useRef(0)

    const projectLocalProgress =
        useRef(0)

    useEffect(() => {
        const safeProjectCount =
            Math.max(
                Math.floor(
                    projectCount,
                ),
                1,
            )

        const updateProjectRefs =
            () => {
                const projectPosition =
                    clamp(
                        projectTimelineProgress.current,
                        0,
                        safeProjectCount,
                    )

                const roundedPosition =
                    Math.round(
                        projectPosition,
                    )

                const isExactBoundary =
                    projectPosition > 0 &&
                    Math.abs(
                        projectPosition -
                            roundedPosition,
                    ) <=
                        PROJECT_TIMELINE_EPSILON

                const currentProjectIndex =
                    isExactBoundary
                        ? Math.min(
                              roundedPosition -
                                  1,
                              safeProjectCount -
                                  1,
                          )
                        : Math.min(
                              Math.floor(
                                  projectPosition,
                              ),
                              safeProjectCount -
                                  1,
                          )

                projectIndex.current =
                    Math.max(
                        currentProjectIndex,
                        0,
                    )

                projectLocalProgress.current =
                    isExactBoundary
                        ? 1
                        : projectPosition -
                          currentProjectIndex
            }

        // ------------------------------------------------------------
        // DETERMINISTIC SCENE HOLDS
        //
        // 0 = REST
        // 1 = CLOSE / ONYX
        // 2 = PROJECT 01
        // 3 = PROJECT 02
        // 4 = PROJECT 03
        // 5 = PROJECT 04
        // 6 = PROJECT 05
        //
        // Browser scroll remains the progress source consumed by the
        // existing scene. Manual wheel/touch input simply chooses the
        // next or previous exact hold destination.
        // ------------------------------------------------------------

        const getHoldDestinations =
            (viewportHeight) => {
                const introDistance =
                    viewportHeight *
                    transitionViewports

                const projectStepDistance =
                    viewportHeight *
                    projectStepViewports

                const maxScrollY =
                    Math.max(
                        document
                            .documentElement
                            .scrollHeight -
                            viewportHeight,
                        0,
                    )

                const finalProjectPosition =
                    Math.min(
                        safeProjectCount,
                        DEFAULT_PROJECT_COUNT,
                    )

                const destinations = [
                    {
                        id: 'rest',
                        targetY: 0,
                    },
                    {
                        id: 'close',
                        targetY: clamp(
                            introDistance,
                            0,
                            maxScrollY,
                        ),
                    },
                ]

                for (
                    let index = 0;
                    index <
                    finalProjectPosition;
                    index += 1
                ) {
                    const projectPosition =
                        index ===
                        finalProjectPosition - 1
                            ? finalProjectPosition
                            : index +
                              PROJECT_HOLD_PROGRESS

                    destinations.push({
                        id: `project-${index}`,
                        targetY: clamp(
                            introDistance +
                                projectPosition *
                                    projectStepDistance,
                            0,
                            maxScrollY,
                        ),
                    })
                }

                return destinations
            }

        // ------------------------------------------------------------
        // CONTROLLED SCROLL TRANSITION
        // ------------------------------------------------------------

        let navigationFrameId =
            null

        let navigationCancelled =
            false

        let activeNavigation = null

        /*
         * Cache the last known viewport height and scroll position.
         *
         * When DevTools opens, closes, or changes docking position,
         * the browser can change the viewport before our resize handler
         * runs. These cached values let us preserve the previous
         * logical position instead of trusting an already-adjusted
         * window.scrollY value.
         */
        let previousViewportHeight =
            Math.max(
                window.innerHeight,
                1,
            )

        let previousScrollY =
            window.scrollY

        const cancelNavigation =
            () => {
                if (
                    navigationFrameId !==
                    null
                ) {
                    window.cancelAnimationFrame(
                        navigationFrameId,
                    )

                    navigationFrameId =
                        null
                }

                navigationCancelled =
                    true

                activeNavigation = null
            }

        const animateToDestination =
            (destination) => {
                const navigation = {
                    startScrollY:
                        window.scrollY,
                    destination,
                    startTime:
                        performance.now(),
                }

                const distance =
                    Math.abs(
                        navigation.destination -
                            navigation.startScrollY,
                    )

                if (
                    distance <=
                    SCROLL_POSITION_EPSILON
                ) {
                    window.scrollTo(
                        0,
                        destination,
                    )

                    previousScrollY =
                        destination

                    return false
                }

                if (
                    navigationFrameId !==
                    null
                ) {
                    cancelNavigation()
                }

                navigationCancelled =
                    false

                activeNavigation =
                    navigation

                const animate =
                    (timestamp) => {
                        if (
                            navigationCancelled ||
                            activeNavigation !== navigation
                        ) {
                            navigationFrameId =
                                null

                            return
                        }

                        const elapsed =
                            timestamp -
                            navigation.startTime

                        const progress =
                            clamp(
                                elapsed /
                                    SCROLL_TRANSITION_DURATION,
                                0,
                                1,
                            )

                        const easedProgress =
                            easeInOutCubic(
                                progress,
                            )

                        const nextScrollY =
                            navigation.startScrollY +
                            (
                                navigation.destination -
                                navigation.startScrollY
                            ) *
                                easedProgress

                        window.scrollTo(
                            0,
                            nextScrollY,
                        )

                        /*
                         * Keep the cached position current even if
                         * several scroll events are coalesced.
                         */
                        previousScrollY =
                            nextScrollY

                        if (
                            progress < 1
                        ) {
                            navigationFrameId =
                                window.requestAnimationFrame(
                                    animate,
                                )
                        } else {
                            window.scrollTo(
                                0,
                                navigation.destination,
                            )

                            previousScrollY =
                                navigation.destination

                            navigationFrameId =
                                null

                            activeNavigation = null
                        }
                    }

                navigationFrameId =
                    window.requestAnimationFrame(
                        animate,
                    )

                return true
            }

        // ------------------------------------------------------------
        // FIND NEXT / PREVIOUS STATE
        // ------------------------------------------------------------

        const navigateOneState =
            (direction) => {
                if (
                    direction === 0
                ) {
                    return false
                }

                const viewportHeight =
                    Math.max(
                        window.innerHeight,
                        1,
                    )

                const scrollY =
                    window.scrollY

                const destinations =
                    getHoldDestinations(
                        viewportHeight,
                    )

                const target =
                    direction > 0
                        ? destinations.find(
                              ({
                                  targetY,
                              }) =>
                                  targetY >
                                  scrollY +
                                      SCROLL_POSITION_EPSILON,
                          )
                        : [
                              ...destinations,
                          ]
                              .reverse()
                              .find(
                                  ({
                                      targetY,
                                  }) =>
                                      targetY <
                                      scrollY -
                                          SCROLL_POSITION_EPSILON,
                              )

                if (!target) {
                    return false
                }

                return animateToDestination(
                    target.targetY,
                )
            }

        // ------------------------------------------------------------
        // WHEEL GESTURE
        //
        // One physical wheel/trackpad gesture advances exactly one
        // scene state.
        //
        // Small input noise does not keep a gesture alive.
        // Partial accumulator values expire instead of carrying into
        // a later gesture.
        //
        // A locked gesture is evaluated only when a real wheel event
        // arrives. After the minimum lock, the remaining input must
        // first go quiet for the separation delay before another
        // gesture can be accepted.
        // ------------------------------------------------------------

        let wheelAccumulator = 0

        let wheelLocked = false

        let wheelLockUntil = 0

        let lastWheelEventTime = 0

        let lastStrongWheelEventTime = 0

        const normalizeWheelDelta =
            (event) => {
                if (
                    event.deltaMode === 1
                ) {
                    return (
                        event.deltaY * 16
                    )
                }

                if (
                    event.deltaMode === 2
                ) {
                    return (
                        event.deltaY *
                        Math.max(
                            window.innerHeight,
                            1,
                        )
                    )
                }

                return event.deltaY
            }

        const handleWheel =
            (event) => {
                if (event.ctrlKey) {
                    return
                }

                if (event.cancelable) {
                    event.preventDefault()
                }

                const delta =
                    normalizeWheelDelta(
                        event,
                    )

                const magnitude =
                    Math.abs(delta)

                // Tiny jitter and horizontal/noise input should never
                // extend or block a gesture.
                if (
                    magnitude <
                    WHEEL_NOISE_FLOOR
                ) {
                    return
                }

                const now =
                    performance.now()

                const quietFor =
                    now -
                    lastWheelEventTime

                const isStrongWheelEvent =
                    magnitude >=
                    WHEEL_FAST_REARM_MIN_DELTA

                const strongBurst =
                    isStrongWheelEvent &&
                    lastStrongWheelEventTime > 0 &&
                    now -
                        lastStrongWheelEventTime <=
                        WHEEL_FAST_REARM_MAX_GAP

                lastWheelEventTime =
                    now

                if (isStrongWheelEvent) {
                    lastStrongWheelEventTime =
                        now
                }

                if (wheelLocked) {
                    const lockExpired =
                        now >=
                        wheelLockUntil

                    const isNewGesture =
                        lockExpired &&
                        (
                            quietFor >=
                                WHEEL_GESTURE_SEPARATION_DELAY ||
                            strongBurst
                        )

                    if (!isNewGesture) {
                        return
                    }

                    wheelLocked = false

                    wheelAccumulator = 0
                } else if (
                    quietFor >
                    WHEEL_ACCUMULATOR_TIMEOUT
                ) {
                    // Discard a partial gesture that has gone stale.
                    wheelAccumulator = 0
                }

                // Opposite-direction input starts a fresh gesture rather
                // than allowing old momentum to cancel or combine with it.
                if (
                    wheelAccumulator !==
                        0 &&
                    Math.sign(delta) !==
                        Math.sign(
                            wheelAccumulator,
                        )
                ) {
                    wheelAccumulator = 0
                }

                wheelAccumulator +=
                    delta

                if (
                    Math.abs(
                        wheelAccumulator,
                    ) <
                    WHEEL_GESTURE_THRESHOLD
                ) {
                    return
                }

                const direction =
                    Math.sign(
                        wheelAccumulator,
                    )

                wheelAccumulator = 0

                const navigationStarted =
                    navigateOneState(
                        direction,
                    )

                if (!navigationStarted) {
                    return
                }

                wheelLocked = true

                wheelLockUntil =
                    now +
                    WHEEL_GESTURE_LOCK_DURATION
            }

        // ------------------------------------------------------------
        // TOUCH GESTURE
        // ------------------------------------------------------------

        let touchStartY = null

        let touchGestureActive =
            false

        const handleTouchStart =
            (event) => {
                touchStartY =
                    event.touches[0]
                        ?.clientY ??
                    null

                touchGestureActive =
                    false
            }

        const handleTouchMove =
            (event) => {
                const touchY =
                    event.touches[0]
                        ?.clientY

                if (
                    touchY ===
                        undefined ||
                    touchStartY === null
                ) {
                    return
                }

                if (event.cancelable) {
                    event.preventDefault()
                }

                if (
                    touchGestureActive
                ) {
                    return
                }

                const delta =
                    touchStartY -
                    touchY

                if (
                    Math.abs(delta) <
                    TOUCH_GESTURE_THRESHOLD
                ) {
                    return
                }

                const direction =
                    Math.sign(delta)

                touchGestureActive =
                    true

                navigateOneState(
                    direction,
                )
            }

        const endTouchGesture =
            () => {
                touchStartY = null

                touchGestureActive =
                    false
            }

        // ------------------------------------------------------------
        // APPLY SCROLL POSITION TO PROGRESS
        // ------------------------------------------------------------

        const applyProgressFromScroll =
            (
                scrollY,
                viewportHeight,
            ) => {
                const introDistance =
                    viewportHeight *
                    transitionViewports

                const projectDistance =
                    viewportHeight *
                    projectStepViewports *
                    safeProjectCount

                rawIntroProgress.current =
                    clamp(
                        scrollY /
                            Math.max(
                                introDistance,
                                1,
                            ),
                        0,
                        1,
                    )

                projectProgress.current =
                    clamp(
                        (
                            scrollY -
                            introDistance
                        ) /
                            Math.max(
                                projectDistance,
                                1,
                            ),
                        0,
                        1,
                    )

                rawProjectTimelineProgress.current =
                    projectProgress.current *
                    safeProjectCount
            }

        // ------------------------------------------------------------
        // SCROLL → PROGRESS
        //
        // If a scroll event arrives after the viewport has changed
        // but before the resize event, preserve the previous position
        // first. Do not calculate a new scene from a mismatched
        // viewport height and scroll offset.
        // ------------------------------------------------------------

        const updateProgress =
            () => {
                const viewportHeight =
                    Math.max(
                        window.innerHeight,
                        1,
                    )

                if (
                    viewportHeight !==
                    previousViewportHeight
                ) {
                    preserveProgressOnResize()

                    return
                }

                const scrollY =
                    window.scrollY

                previousScrollY =
                    scrollY

                applyProgressFromScroll(
                    scrollY,
                    viewportHeight,
                )
            }

                // ------------------------------------------------------------
        // RESIZE PRESERVATION
        //
        // Preserve the logical portfolio journey, not a cached pixel
        // offset that the browser may change during a viewport resize.
        //
        // REST  -> preserve raw intro progress.
        // CLOSE -> preserve intro progress = 1, project position = 0.
        // PROJECTS -> preserve the absolute project timeline position.
        // ------------------------------------------------------------

        const getScrollYFromProgress = (
            viewportHeight,
        ) => {
            const introDistance =
                viewportHeight *
                transitionViewports

            const projectPosition =
                clamp(
                    rawProjectTimelineProgress.current,
                    0,
                    safeProjectCount,
                )

            /*
             * Once the project journey has begun, its absolute timeline
             * position is the source of truth.
             */
            if (
                projectPosition >
                PROJECT_TIMELINE_EPSILON
            ) {
                return (
                    introDistance +
                    projectPosition *
                        viewportHeight *
                        projectStepViewports
                )
            }

            /*
             * Before the project journey begins, preserve the intro.
             *
             * At CLOSE:
             * rawIntroProgress = 1
             * projectPosition = 0
             *
             * Therefore, the restored scroll position is exactly the
             * new intro distance rather than REST.
             */
            return (
                clamp(
                    rawIntroProgress.current,
                    0,
                    1,
                ) *
                introDistance
            )
        }

        const preserveProgressOnResize = () => {
            const nextViewportHeight =
                Math.max(
                    window.innerHeight,
                    1,
                )

            const oldViewportHeight =
                previousViewportHeight

            const resizeScale =
                nextViewportHeight /
                oldViewportHeight

            const maxScrollY =
                Math.max(
                    document
                        .documentElement
                        .scrollHeight -
                        nextViewportHeight,
                    0,
                )

            /*
             * Rebase an active controlled-scroll animation into the
             * new viewport coordinate system without restarting it.
             */
            if (
                activeNavigation &&
                Number.isFinite(resizeScale) &&
                resizeScale > 0 &&
                resizeScale !== 1
            ) {
                activeNavigation.startScrollY =
                    clamp(
                        activeNavigation.startScrollY *
                            resizeScale,
                        0,
                        maxScrollY,
                    )

                activeNavigation.destination =
                    clamp(
                        activeNavigation.destination *
                            resizeScale,
                        0,
                        maxScrollY,
                    )
            }

            /*
             * Reconstruct the scroll coordinate from the most recently
             * known logical progress. Do not read window.scrollY here:
             * the browser may already have adjusted it during resizing.
             */
            const logicalScrollY =
                getScrollYFromProgress(
                    nextViewportHeight,
                )

            const nextScrollY =
                clamp(
                    logicalScrollY,
                    0,
                    maxScrollY,
                )

            /*
             * Update the cached dimensions before scrolling so the
             * resulting scroll event is not mistaken for another resize.
             */
            previousViewportHeight =
                nextViewportHeight

            previousScrollY =
                nextScrollY

            window.scrollTo(
                0,
                nextScrollY,
            )

            /*
             * Synchronize progress immediately rather than waiting
             * for the browser's subsequent scroll event.
             */
            applyProgressFromScroll(
                nextScrollY,
                nextViewportHeight,
            )
        }

        // ------------------------------------------------------------
        // INITIALIZE SCROLL PROGRESS
        // ------------------------------------------------------------

        applyProgressFromScroll(
            window.scrollY,
            previousViewportHeight,
        )

        previousScrollY =
            window.scrollY

        introProgress.current =
            rawIntroProgress.current

        projectTimelineProgress.current =
            rawProjectTimelineProgress.current

        updateProjectRefs()

        // ------------------------------------------------------------
        // SMOOTH INTRO ONLY
        //
        // Project timeline is consumed directly from scroll.
        // The controlled scroll transition remains the primary
        // smoothing mechanism for project navigation.
        // ------------------------------------------------------------

        let animationFrameId

        let lastTimestamp =
            performance.now()

        const smoothTimeline =
            (timestamp) => {
                const deltaSeconds =
                    Math.min(
                        (
                            timestamp -
                            lastTimestamp
                        ) /
                            1000,
                        0.05,
                    )

                lastTimestamp =
                    timestamp

                // ----------------------------------------------------
                // INTRO SMOOTHING
                // ----------------------------------------------------

                const currentIntro =
                    introProgress.current

                const targetIntro =
                    rawIntroProgress.current

                const introBlend =
                    1 -
                    Math.exp(
                        -INTRO_PROGRESS_SMOOTHING *
                            deltaSeconds,
                    )

                const nextIntro =
                    currentIntro +
                    (
                        targetIntro -
                        currentIntro
                    ) *
                        introBlend

                if (
                    Math.abs(
                        targetIntro -
                            nextIntro,
                    ) <=
                    INTRO_PROGRESS_EPSILON
                ) {
                    introProgress.current =
                        targetIntro
                } else {
                    introProgress.current =
                        nextIntro
                }

                // ----------------------------------------------------
                // PROJECT TIMELINE — DIRECT
                // ----------------------------------------------------

                projectTimelineProgress.current =
                    rawProjectTimelineProgress.current

                updateProjectRefs()

                animationFrameId =
                    window.requestAnimationFrame(
                        smoothTimeline,
                    )
            }

        // ------------------------------------------------------------
        // EVENTS
        // ------------------------------------------------------------

        window.addEventListener(
            'scroll',
            updateProgress,
            {
                passive: true,
            },
        )

        window.addEventListener(
            'resize',
            preserveProgressOnResize,
        )

        window.addEventListener(
            'wheel',
            handleWheel,
            {
                passive: false,
            },
        )

        window.addEventListener(
            'touchstart',
            handleTouchStart,
            {
                passive: true,
            },
        )

        window.addEventListener(
            'touchmove',
            handleTouchMove,
            {
                passive: false,
            },
        )

        window.addEventListener(
            'touchend',
            endTouchGesture,
            {
                passive: true,
            },
        )

        window.addEventListener(
            'touchcancel',
            endTouchGesture,
            {
                passive: true,
            },
        )

        animationFrameId =
            window.requestAnimationFrame(
                smoothTimeline,
            )

        return () => {
            window.removeEventListener(
                'scroll',
                updateProgress,
            )

            window.removeEventListener(
                'resize',
                preserveProgressOnResize,
            )

            window.removeEventListener(
                'wheel',
                handleWheel,
            )

            window.removeEventListener(
                'touchstart',
                handleTouchStart,
            )

            window.removeEventListener(
                'touchmove',
                handleTouchMove,
            )

            window.removeEventListener(
                'touchend',
                endTouchGesture,
            )

            window.removeEventListener(
                'touchcancel',
                endTouchGesture,
            )

            if (
                navigationFrameId !==
                null
            ) {
                window.cancelAnimationFrame(
                    navigationFrameId,
                )
            }

            window.cancelAnimationFrame(
                animationFrameId,
            )

            navigationCancelled = true
            activeNavigation = null
        }
    }, [
        transitionViewports,
        projectCount,
        projectStepViewports,
    ])

    return {
        introProgress,
        projectProgress,
        projectTimelineProgress,
        projectIndex,
        projectLocalProgress,
    }
}
