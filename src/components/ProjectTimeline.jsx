import {
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    getSceneHoldScrollY,
} from '../utils/sceneHoldProgress.js'

const NAV_MIN_DURATION = 900

const NAV_MAX_DURATION = 1800

const TIMELINE_STATE_ARRIVAL_PROGRESS = 0.7

const TIMELINE_HANDOFF_WINDOW = 0.18

const DOMAIN_ACTIVE_THRESHOLD = 0.999

const ONYX_TIMELINE = {
    id: 'onyx',
    title: 'ONYX',
    color: '#D4A62A',
    coreColor: '#FFF4C7',
    glowColor: '#D4A62A',
}

const DOMAIN_TIMELINE = [
    {
        id: 'ai-solutions',
        title: 'AI SYSTEMS',
        color: '#F47A32',
        coreColor: '#FFF0E6',
        glowColor: '#F47A32',
    },
    {
        id: 'product-development',
        title: 'PRODUCT DEV',
        color: '#C084FF',
        coreColor: '#F1ECFF',
        glowColor: '#C084FF',
    },
    {
        id: 'ui-ux',
        title: 'UI / UX',
        color: '#39D98A',
        coreColor: '#E7FFF4',
        glowColor: '#39D98A',
    },
    {
        id: 'social-media-marketing',
        title: 'SOCIAL MARKETING',
        color: '#E5484D',
        coreColor: '#FFE7EC',
        glowColor: '#E5484D',
    },
    {
        id: 'branding',
        title: 'BRANDING',
        color: '#3B82F6',
        coreColor: '#E6F8FF',
        glowColor: '#3B82F6',
    },
]

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

function getTimelineFocus(
    projectTimeline,
    domainIndex,
) {
    const start =
        domainIndex

    const arrivalEnd =
        start +
        TIMELINE_STATE_ARRIVAL_PROGRESS

    if (
        projectTimeline <
        start
    ) {
        return 0
    }

    /*
     * Domain is approaching:
     *
     * 0 → 70%
     *
     * White → domain color
     */
    if (
        projectTimeline <=
        arrivalEnd
    ) {
        const arrivalProgress =
            clamp(
                (
                    projectTimeline -
                    start
                ) /
                TIMELINE_STATE_ARRIVAL_PROGRESS,
                0,
                1,
            )

        return smoothStep(
            arrivalProgress,
        )
    }

    /*
     * Domain has arrived.
     *
     * It stays fully active until the
     * next domain boundary begins.
     */
    const handoffProgress =
        clamp(
            1 -
            (
                projectTimeline -
                (start + 1)
            ) /
            TIMELINE_HANDOFF_WINDOW,
            0,
            1,
        )

    return smoothStep(
        handoffProgress,
    )
}

function ProjectTimeline({
    introProgress,
    projectIndex,
    projectCount,
    projectLocalProgress,
    timelineConfig,
}) {
    const [
        activeItem,
        setActiveItem,
    ] = useState(null)

    const timelineRef =
        useRef(null)

    const markerRefs =
        useRef([])

    const navigationFrame =
        useRef(null)

    const navigationCancelled =
        useRef(false)

    const activeNavigation =
        useRef(null)

    useEffect(() => {
        let frameId

        let previousIntro = null

        let previousProjectIndex =
            null

        let previousLocalProgress =
            null

        const update = () => {
            const intro = clamp(
                introProgress?.current ??
                0,
                0,
                1,
            )

            const rawProjectIndex =
                projectIndex?.current ??
                -1

            const localProgress =
                clamp(
                    projectLocalProgress
                        ?.current ?? 0,
                    0,
                    1,
                )

            if (
                intro ===
                previousIntro &&
                rawProjectIndex ===
                previousProjectIndex &&
                localProgress ===
                previousLocalProgress
            ) {
                frameId =
                    window.requestAnimationFrame(
                        update,
                    )

                return
            }

            previousIntro =
                intro

            previousProjectIndex =
                rawProjectIndex

            previousLocalProgress =
                localProgress

            const safeCount =
                Math.min(
                    safeProjectCount(
                        projectCount,
                    ),
                    DOMAIN_TIMELINE.length,
                )

            /*
             * Convert the current state into one
             * continuous project timeline value.
             *
             * 0 = CLOSE
             * 1 = PROJECT 01
             * 2 = PROJECT 02
             * 3 = PROJECT 03
             * 4 = PROJECT 04
             * 5 = PROJECT 05
             */
            const projectTimeline =
                rawProjectIndex >= 0
                    ? rawProjectIndex +
                    localProgress
                    : 0

            /*
             * --------------------------------------------------------
             * ACTIVE STATE
             * --------------------------------------------------------
             *
             * Active domain follows the exact same
             * 70% arrival point used by the rest
             * of the domain system.
             */

            let nextActiveItem = null

            if (
                rawProjectIndex < 0
            ) {
                if (
                    intro >= 0.7
                ) {
                    nextActiveItem =
                        'onyx'
                }
            } else if (
                rawProjectIndex <
                safeCount
            ) {
                const currentFocus =
                    getTimelineFocus(
                        projectTimeline,
                        rawProjectIndex,
                    )

                if (
                    currentFocus >=
                    DOMAIN_ACTIVE_THRESHOLD
                ) {
                    nextActiveItem =
                        `project-${rawProjectIndex}`
                } else if (
                    rawProjectIndex ===
                    0
                ) {
                    nextActiveItem =
                        'onyx'
                } else {
                    nextActiveItem =
                        `project-${rawProjectIndex -
                        1
                        }`
                }
            }

            setActiveItem(
                (previous) =>
                    previous ===
                        nextActiveItem
                        ? previous
                        : nextActiveItem,
            )

            /*
             * --------------------------------------------------------
             * TIMELINE VISIBILITY
             * --------------------------------------------------------
             */

            if (
                timelineRef.current
            ) {
                const visibilityProgress =
                    smoothStep(
                        clamp(
                            (
                                intro -
                                0.52
                            ) /
                            0.14,
                            0,
                            1,
                        ),
                    )

                timelineRef.current.style.opacity =
                    String(
                        visibilityProgress,
                    )
                timelineRef.current.style.setProperty(
                    '--timeline-visibility-offset',
                    String(8 - visibilityProgress * 8) + 'px',
                )

                timelineRef.current.style.pointerEvents =
                    visibilityProgress >
                        0.5
                        ? 'auto'
                        : 'none'
            }

            /*
             * --------------------------------------------------------
             * RESET MARKER FOCUS
             * --------------------------------------------------------
             */

            for (
                let index = 0;
                index <=
                safeCount;
                index += 1
            ) {
                const marker =
                    markerRefs.current[
                    index
                    ]

                if (!marker) {
                    continue
                }

                marker.style.setProperty(
                    '--timeline-focus',
                    '0',
                )

                const item =
                    marker.parentElement

                if (item) {
                    item.style.setProperty(
                        '--timeline-focus',
                        '0',
                    )
                }
            }

            /*
             * --------------------------------------------------------
             * REST → ONYX
             * --------------------------------------------------------
             */

            if (
                rawProjectIndex < 0
            ) {
                const onyxMarker =
                    markerRefs.current[0]

                if (onyxMarker) {
                    const onyxFocus =
                        smoothStep(
                            clamp(
                                (
                                    intro -
                                    0.56
                                ) /
                                (
                                    0.7 -
                                    0.56
                                ),
                                0,
                                1,
                            ),
                        )

                    onyxMarker.style.setProperty(
                        '--timeline-focus',
                        String(
                            onyxFocus,
                        ),
                    )

                    const onyxItem =
                        onyxMarker.parentElement

                    if (onyxItem) {
                        onyxItem.style.setProperty(
                            '--timeline-focus',
                            String(
                                onyxFocus,
                            ),
                        )
                    }
                }
            }

            /*
             * --------------------------------------------------------
             * DOMAIN MARKERS
             *
             * Every crystal is driven independently
             * from the same continuous timeline.
             *
             * This also makes reverse travel behave
             * correctly.
             * --------------------------------------------------------
             */

            if (
                rawProjectIndex >= 0 &&
                rawProjectIndex <
                safeCount
            ) {
                for (
                    let index = 0;
                    index < safeCount;
                    index += 1
                ) {
                    const marker =
                        markerRefs.current[
                        index + 1
                        ]

                    if (!marker) {
                        continue
                    }

                    const focus =
                        getTimelineFocus(
                            projectTimeline,
                            index,
                        )

                    marker.style.setProperty(
                        '--timeline-focus',
                        String(focus),
                    )

                    const item =
                        marker.parentElement

                    if (item) {
                        item.style.setProperty(
                            '--timeline-focus',
                            String(
                                focus,
                            ),
                        )
                    }
                }
            }

            frameId =
                window.requestAnimationFrame(
                    update,
                )
        }

        update()

        return () => {
            window.cancelAnimationFrame(
                frameId,
            )
        }
    }, [
        introProgress,
        projectIndex,
        projectCount,
        projectLocalProgress,
        timelineConfig,
    ])

    useEffect(() => {
        const cancelNavigation = () => {
            navigationCancelled.current =
                true

            activeNavigation.current =
                null

            if (
                navigationFrame.current !==
                null
            ) {
                window.cancelAnimationFrame(
                    navigationFrame.current,
                )

                navigationFrame.current =
                    null
            }
        }

        window.addEventListener(
            'wheel',
            cancelNavigation,
            {
                passive: true,
            },
        )

        window.addEventListener(
            'touchstart',
            cancelNavigation,
            {
                passive: true,
            },
        )

        let previousViewportHeight =
            Math.max(
                window.innerHeight,
                1,
            )

        const preserveNavigationOnResize = () => {
            const nextViewportHeight =
                Math.max(
                    window.innerHeight,
                    1,
                )

            const resizeScale =
                nextViewportHeight /
                previousViewportHeight

            if (
                Number.isFinite(resizeScale) &&
                resizeScale > 0 &&
                activeNavigation.current
            ) {
                activeNavigation.current.startScrollY *=
                    resizeScale
                activeNavigation.current.destination *=
                    resizeScale
            }

            previousViewportHeight =
                nextViewportHeight
        }

        window.addEventListener(
            'resize',
            preserveNavigationOnResize,
        )

        return () => {
            window.removeEventListener(
                'wheel',
                cancelNavigation,
            )

            window.removeEventListener(
                'touchstart',
                cancelNavigation,
            )

            window.removeEventListener(
                'resize',
                preserveNavigationOnResize,
            )
        }
    }, [])

    const navigateToScroll = (
        destination,
    ) => {
        const currentScrollY =
            window.scrollY

        const distance = Math.abs(
            destination -
            currentScrollY,
        )

        if (distance < 4) {
            window.scrollTo(
                0,
                destination,
            )

            return
        }

        if (
            navigationFrame.current !==
            null
        ) {
            window.cancelAnimationFrame(
                navigationFrame.current,
            )
        }

        navigationCancelled.current =
            false

        const viewportHeight =
            window.innerHeight

        const viewportDistance =
            distance /
            Math.max(
                viewportHeight,
                1,
            )

        const duration = clamp(
            NAV_MIN_DURATION +
            viewportDistance *
            220,
            NAV_MIN_DURATION,
            NAV_MAX_DURATION,
        )

        const navigation = {
            startScrollY: currentScrollY,
            destination,
            startTime: performance.now(),
            duration,
        }

        activeNavigation.current =
            navigation

        const animate = (now) => {
            if (
                navigationCancelled.current ||
                activeNavigation.current !== navigation
            ) {
                navigationFrame.current =
                    null

                return
            }

            const elapsed =
                now -
                navigation.startTime

            const rawProgress =
                clamp(
                    elapsed /
                    navigation.duration,
                    0,
                    1,
                )

            const easedProgress =
                easeInOutCubic(
                    rawProgress,
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

            if (
                rawProgress < 1
            ) {
                navigationFrame.current =
                    window.requestAnimationFrame(
                        animate,
                    )
            } else {
                window.scrollTo(
                    0,
                    navigation.destination,
                )

                navigationFrame.current =
                    null

                activeNavigation.current =
                    null
            }
        }

        navigationFrame.current =
            window.requestAnimationFrame(
                animate,
            )
    }

    const navigateToProject = (
        index,
    ) => {
        const viewportHeight =
            window.innerHeight

        const introViewports =
            timelineConfig
                ?.transitionViewports ??
            1

        const projectStepViewports =
            timelineConfig
                ?.projectStepViewports ??
            1

        const destination =
            getSceneHoldScrollY(
                `project${String(
                    index + 1,
                ).padStart(
                    2,
                    '0',
                )}`,
                {
                    viewportHeight,
                    scrollHeight:
                        document
                            .documentElement
                            .scrollHeight,
                    transitionViewports:
                        introViewports,
                    projectStepViewports,
                    projectCount:
                        safeProjectCount(
                            projectCount,
                        ),
                    domainCount:
                        DOMAIN_TIMELINE.length,
                },
            )

        navigateToScroll(
            destination,
        )
    }

    const navigateToOnyx = () => {
        const viewportHeight =
            window.innerHeight

        const introViewports =
            timelineConfig
                ?.transitionViewports ??
            1

        const destination =
            getSceneHoldScrollY(
                'close',
                {
                    viewportHeight,
                    scrollHeight:
                        document
                            .documentElement
                            .scrollHeight,
                    transitionViewports:
                        introViewports,
                    projectCount:
                        safeProjectCount(
                            projectCount,
                        ),
                    domainCount:
                        DOMAIN_TIMELINE.length,
                },
            )

        navigateToScroll(
            destination,
        )
    }

    const onyxIsActive =
        activeItem === 'onyx'

    const safeCount =
        Math.min(
            safeProjectCount(
                projectCount,
            ),
            DOMAIN_TIMELINE.length,
        )

    return (
       <nav
    ref={timelineRef}
    className="project-timeline"
    aria-label="Domain navigation"
    style={{
        position: 'fixed',
        opacity: 0,
        pointerEvents: 'none',
    }}
>
            <div
    className="project-timeline__track"
>
                <button
                    type="button"
                    className={
                        onyxIsActive
                            ? 'project-timeline__item project-timeline__item--active'
                            : 'project-timeline__item'
                    }
                    style={{
                        '--domain-color':
                            ONYX_TIMELINE.color,
                        '--domain-core':
                            ONYX_TIMELINE.coreColor,
                        '--domain-glow':
                            ONYX_TIMELINE.glowColor,
                    }}
                    onClick={
                        navigateToOnyx
                    }
                    aria-label="Go to Onyx"
                    aria-current={
                        onyxIsActive
                            ? 'true'
                            : undefined
                    }
                >
                    <span
                        ref={(element) => {
                            markerRefs.current[0] =
                                element
                        }}
                        className="project-timeline__marker"
                    >
                        <span className="project-timeline__marker-base" />
                        <span className="project-timeline__marker-color" />
                    </span>

                    <span className="project-timeline__label">
                        {
                            ONYX_TIMELINE.title
                        }
                    </span>
                </button>

                {DOMAIN_TIMELINE
                    .slice(
                        0,
                        safeCount,
                    )
                    .map(
                        (
                            domain,
                            index,
                        ) => {
                            const isActive =
                                activeItem ===
                                `project-${index}`

                            return (
                                <button
                                    key={
                                        domain.id
                                    }
                                    type="button"
                                    className={
                                        isActive
                                            ? 'project-timeline__item project-timeline__item--active'
                                            : 'project-timeline__item'
                                    }
                                    style={{
                                        '--domain-color':
                                            domain.color,
                                        '--domain-core':
                                            domain.coreColor,
                                        '--domain-glow':
                                            domain.glowColor,
                                    }}
                                    onClick={() =>
                                        navigateToProject(
                                            index,
                                        )
                                    }
                                    aria-label={`Go to ${domain.title}`}
                                    aria-current={
                                        isActive
                                            ? 'true'
                                            : undefined
                                    }
                                >
                                    <span
                                        ref={(element) => {
                                            markerRefs.current[
                                                index +
                                                1
                                            ] =
                                                element
                                        }}
                                        className="project-timeline__marker"
                                    >
                                        <span className="project-timeline__marker-base" />
                                        <span className="project-timeline__marker-color" />
                                    </span>

                                    <span className="project-timeline__label">
                                        {
                                            domain.title
                                        }
                                    </span>
                                </button>
                            )
                        },
                    )}
            </div>
        </nav>
    )
}

function safeProjectCount(
    projectCount,
) {
    return Math.max(
        Math.floor(
            projectCount ?? 0,
        ),
        0,
    )
}

export default ProjectTimeline
