
import {
    useEffect,
    useRef,
    useState,
} from 'react'

const DOMAIN_DATA = [
    {
        number: '01',
        name: 'AI SYSTEMS & AUTOMATION',
        accentColor: '#F47A32',
        profile:
            'Intelligent systems built to automate workflows, analyze information, and generate useful outputs.',
        metadata: [
            { label: 'DOMAIN', value: 'AI SYSTEMS' },
            {
                label: 'CORE FUNCTION',
                value: 'AUTOMATION · ANALYSIS · GENERATION',
            },
            {
                label: 'ENVIRONMENT',
                value: 'WEB · WORKFLOW · CONVERSATIONAL',
            },
        ],
        capabilities: [
            'OCR',
            'LLM INTEGRATION',
            'WORKFLOW AUTOMATION',
            'CONTENT GENERATION',
        ],
        systems: [
            'ONYX AUTOFILL',
            'AI CHATBOT',
            'REVIEW INTELLIGENCE',
            'AI REELS GENERATOR',
        ],
    },
    {
        number: '02',
        name: 'PRODUCT DEVELOPMENT',
        accentColor: '#C084FF',
        profile:
            'Digital products engineered from concept to launch, combining thoughtful architecture, interaction, and scalable implementation.',
        metadata: [
            {
                label: 'DOMAIN',
                value: 'PRODUCT DEVELOPMENT',
            },
            {
                label: 'CORE FUNCTION',
                value: 'ARCHITECTURE · ENGINEERING · DELIVERY',
            },
            {
                label: 'ENVIRONMENT',
                value: 'WEB · MOBILE · DIGITAL PRODUCTS',
            },
        ],
        capabilities: [
            'PRODUCT STRATEGY',
            'API INTEGRATION',
            'NFC INTEGRATION',
            'REVIEW INTELLIGENCE',
        ],
        systems: [
            'CLIENT PORTAL',
            'REVIEW ANALYSIS & MANAGEMENT',
            'NFC REVIEW CARD SYSTEM',
            'MVP / PRODUCT BUILD',
        ],
    },
    {
        number: '03',
        name: 'UI/UX DESIGN',
        accentColor: '#39D98A',
        profile:
            'Digital interfaces designed around clarity, usability, and interaction, turning complex ideas into refined user experiences.',
        metadata: [
            { label: 'DOMAIN', value: 'UI/UX DESIGN' },
            {
                label: 'CORE FUNCTION',
                value: 'INTERACTION · SYSTEMS · EXPERIENCE',
            },
            {
                label: 'ENVIRONMENT',
                value: 'WEB · MOBILE · DIGITAL PRODUCTS',
            },
        ],
        capabilities: [
            'INTERFACE DESIGN',
            'UX FLOWS',
            'DESIGN SYSTEMS',
            'PROTOTYPING',
        ],
        systems: [
            'PRODUCT INTERFACES',
            'DESIGN SYSTEMS',
            'INTERACTIVE PROTOTYPES',
            'UX EXPERIENCE FLOWS',
        ],
    },
    {
        number: '04',
        name: 'SOCIAL MEDIA MARKETING',
        accentColor: '#E5484D',
        profile:
            'Social systems built to shape digital presence, connect brands with audiences, and turn content into consistent growth.',
        metadata: [
            { label: 'DOMAIN', value: 'SOCIAL MEDIA' },
            {
                label: 'CORE FUNCTION',
                value: 'STRATEGY · CONTENT · GROWTH',
            },
            {
                label: 'ENVIRONMENT',
                value: 'INSTAGRAM · LINKEDIN · TIKTOK',
            },
        ],
        capabilities: [
            'CONTENT STRATEGY',
            'SOCIAL CAMPAIGNS',
            'CONTENT PRODUCTION',
            'AUDIENCE GROWTH',
        ],
        systems: [
            'SOCIAL CONTENT SYSTEM',
            'CAMPAIGN MANAGEMENT',
            'BRAND CONTENT PIPELINE',
            'SOCIAL ANALYTICS',
        ],
    },
    {
        number: '05',
        name: 'BRANDING & LOGO DESIGN',
        accentColor: '#3B82F6',
        profile:
            'Distinct visual identities built to give brands clarity, recognition, and a consistent presence across every touchpoint.',
        metadata: [
            {
                label: 'DOMAIN',
                value: 'BRANDING & IDENTITY',
            },
            {
                label: 'CORE FUNCTION',
                value: 'IDENTITY · DIRECTION · CONSISTENCY',
            },
            {
                label: 'ENVIRONMENT',
                value: 'DIGITAL · PRINT · SOCIAL',
            },
        ],
        capabilities: [
            'LOGO DESIGN',
            'VISUAL IDENTITY',
            'BRAND SYSTEMS',
            'ART DIRECTION',
        ],
        systems: [
            'LOGO IDENTITY SYSTEM',
            'BRAND GUIDELINES',
            'VISUAL LANGUAGE',
            'SOCIAL BRAND KIT',
        ],
    },
]

const DOMAIN_STATE_ARRIVAL_PROGRESS = 0.92
const DOMAIN_SCAN_DURATION = 320
const DOMAIN_SCAN_FADE_DURATION = 420
const DOMAIN_SCAN_REVEAL_DURATION = 1100

const PROJECT_TIMELINE_EPSILON = 0.0005

function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
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

/**
 * Convert the absolute project timeline into the same
 * project index/local progress convention used by the
 * scroll timeline.
 *
 * Timeline 0 = CLOSE, with no active domain.
 * Timeline 0.92 = approaching the end of domain 01's arrival.
 * Timeline 1 = the exact boundary after domain 01.
 * Timeline 1.5 = halfway through domain 02.
 * Timeline 5 = the end of domain 05.
 */
function getProjectProgressFromTimeline(
    projectTimelineProgress,
) {
    const timelineValue =
        projectTimelineProgress?.current ??
        projectTimelineProgress

    if (!Number.isFinite(timelineValue)) {
        return {
            projectIndex: -1,
            localProgress: 0,
        }
    }

    const timelinePosition = clamp(
        timelineValue,
        0,
        DOMAIN_DATA.length,
    )

    // Keep CLOSE completely inactive.
    // Also avoid treating a tiny positive value near zero
    // as an exact boundary of the first project.
    if (
        timelinePosition <=
        PROJECT_TIMELINE_EPSILON
    ) {
        return {
            projectIndex: -1,
            localProgress: 0,
        }
    }

    const roundedPosition =
        Math.round(timelinePosition)

    const isExactBoundary =
        Math.abs(
            timelinePosition - roundedPosition,
        ) <= PROJECT_TIMELINE_EPSILON

    if (isExactBoundary) {
        return {
            projectIndex: Math.min(
                roundedPosition - 1,
                DOMAIN_DATA.length - 1,
            ),
            localProgress: 1,
        }
    }

    const projectIndex = Math.min(
        Math.floor(timelinePosition),
        DOMAIN_DATA.length - 1,
    )

    return {
        projectIndex,
        localProgress: clamp(
            timelinePosition - projectIndex,
            0,
            1,
        ),
    }
}

function DomainScan({
    projectTimelineProgress,
    onSystemSelect,
    onDomainChange,
}) {
    const [phase, setPhase] =
        useState('hidden')

    const [activeDomainIndex, setActiveDomainIndex] =
        useState(-1)

    // Clicked selection persists after the pointer leaves.
    const [selectedSystem, setSelectedSystem] =
        useState(null)

    // Hover and keyboard focus are temporary visual states.
    const [hoveredSystem, setHoveredSystem] =
        useState(null)

    const [focusedSystem, setFocusedSystem] =
        useState(null)

    // Latest domain requested by the scroll journey.
    const activeDomainRef =
        useRef(-1)

    // Domain whose content is currently mounted.
    const displayedDomainRef =
        useRef(-1)

    const scanTimerRef =
        useRef(null)

    const systemSelectionTimerRef =
        useRef(null)

    const transitionTimerRef =
        useRef(null)

    // Prevent rapid scroll changes from restarting an
    // exit animation that's already in progress.
    const exitInProgressRef =
        useRef(false)

    // A selection belongs only to its current domain.
    useEffect(() => {
        setSelectedSystem(null)
        setHoveredSystem(null)
        setFocusedSystem(null)
    }, [activeDomainIndex])

    useEffect(() => {
        return () => {
            if (scanTimerRef.current) {
                window.clearTimeout(
                    scanTimerRef.current,
                )
            }

            if (systemSelectionTimerRef.current) {
                window.clearTimeout(
                    systemSelectionTimerRef.current,
                )
            }

            if (transitionTimerRef.current) {
                window.clearTimeout(
                    transitionTimerRef.current,
                )
            }

            exitInProgressRef.current = false
        }
    }, [])

    useEffect(() => {
        let animationFrameId
        let previousProjectIndex = null
        let previousLocalProgress = null

        const update = () => {
            // Both the active domain and its local progress
            // come from the camera's absolute timeline.
            const {
                projectIndex: activeProjectIndex,
                localProgress,
            } = getProjectProgressFromTimeline(
                projectTimelineProgress,
            )

            // Avoid processing an unchanged timeline state.
            if (
                activeProjectIndex ===
                    previousProjectIndex &&
                localProgress ===
                    previousLocalProgress
            ) {
                animationFrameId =
                    window.requestAnimationFrame(
                        update,
                    )

                return
            }

            previousProjectIndex =
                activeProjectIndex

            previousLocalProgress =
                localProgress

            /*
             * Wait until the domain transition is almost
             * settled before activating its Domain Scan.
             */
            const arrivalProgress = clamp(
                localProgress /
                    DOMAIN_STATE_ARRIVAL_PROGRESS,
                0,
                1,
            )

            const focusProgress = smoothStep(
                arrivalProgress,
            )

            const nextDomainIndex =
                activeProjectIndex >= 0 &&
                activeProjectIndex <
                    DOMAIN_DATA.length &&
                focusProgress >= 0.999
                    ? activeProjectIndex
                    : -1

            /* -------------------------------------------------- */
            /* ENTER / CHANGE DOMAIN FOCUS                        */
            /* -------------------------------------------------- */

            if (
                nextDomainIndex !==
                activeDomainRef.current
            ) {
                // Close the selected System Scan when the domain changes.
                onDomainChange?.()

                // Cancel a pending system selection if scrolling resumes.
                if (systemSelectionTimerRef.current) {
                    window.clearTimeout(
                        systemSelectionTimerRef.current,
                    )

                    systemSelectionTimerRef.current = null
                    exitInProgressRef.current = false
                }

                // Track the latest requested destination.
                activeDomainRef.current =
                    nextDomainIndex

                if (scanTimerRef.current) {
                    window.clearTimeout(
                        scanTimerRef.current,
                    )

                    scanTimerRef.current = null
                }

                /*
                 * Switch content only after the previous
                 * glass fade-out has completed.
                 */
                const enterDomain = (
                    domainIndex,
                ) => {
                    setActiveDomainIndex(
                        domainIndex,
                    )

                    displayedDomainRef.current =
                        domainIndex

                    if (domainIndex >= 0) {
                        setPhase('scanning')

                        // Preserve the existing scan delay.
                        scanTimerRef.current =
                            window.setTimeout(
                                () => {
                                    scanTimerRef.current = null

                                    // Ignore stale callbacks.
                                    if (
                                        activeDomainRef.current !==
                                        domainIndex
                                    ) {
                                        return
                                    }

                                    setPhase('profile')
                                },
                                DOMAIN_SCAN_DURATION,
                            )
                    } else {
                        setPhase('hidden')
                    }
                }

                if (exitInProgressRef.current) {
                    /*
                     * An exit is already running. Keep its
                     * existing deadline, then enter whichever
                     * domain is current when that deadline ends.
                     */
                } else if (
                    displayedDomainRef.current >= 0
                ) {
                    exitInProgressRef.current = true

                    /*
                     * Keep the existing scan mounted.
                     * CSS changes data-phase to "exiting",
                     * which fades the shared glass layer out.
                     */
                    setPhase('exiting')

                    transitionTimerRef.current =
                        window.setTimeout(
                            () => {
                                transitionTimerRef.current = null
                                exitInProgressRef.current = false

                                // Resolve the destination at the
                                // end of the exit, not at its start.
                                enterDomain(
                                    activeDomainRef.current,
                                )
                            },
                            DOMAIN_SCAN_REVEAL_DURATION,
                        )
                } else {
                    // First entrance from the hidden state.
                    enterDomain(
                        nextDomainIndex,
                    )
                }
            }

            animationFrameId =
                window.requestAnimationFrame(
                    update,
                )
        }

        animationFrameId =
            window.requestAnimationFrame(
                update,
            )

        return () => {
            window.cancelAnimationFrame(
                animationFrameId,
            )

            if (scanTimerRef.current) {
                window.clearTimeout(
                    scanTimerRef.current,
                )

                scanTimerRef.current = null
            }

            /*
             * Do not cancel a running exit timer here.
             * Its completion remains responsible for
             * restoring the latest requested domain.
             */
        }
    }, [projectTimelineProgress])

    const domain =
        activeDomainIndex >= 0
            ? DOMAIN_DATA[activeDomainIndex]
            : null

    const isVisible =
        (
            phase === 'scanning' ||
            phase === 'profile'
        ) &&
        domain !== null

    const isProfileVisible =
        phase === 'profile' &&
        domain !== null

    const selectSystem = (system, index) => {
        if (
            systemSelectionTimerRef.current ||
            !isProfileVisible
        ) {
            return
        }

        const selection = {
            id: String(index + 1).padStart(2, '0'),
            name: system,
            domainIndex: activeDomainIndex,
            domainNumber: domain?.number,
            domainName: domain?.name,
            accentColor: domain?.accentColor,
        }

        setSelectedSystem(system)

        exitInProgressRef.current = true
        setPhase('exiting')

        systemSelectionTimerRef.current =
            window.setTimeout(
                () => {
                    systemSelectionTimerRef.current = null
                    exitInProgressRef.current = false

                    onSystemSelect?.(selection)
                },
                DOMAIN_SCAN_REVEAL_DURATION,
            )
    }

    return (
        <div
            className="domain-scan-overlay"
            data-phase={phase}
            aria-hidden={!isProfileVisible}
            style={{
                position: 'fixed',
                zIndex: 20,
                left: 'clamp(24px, 6.2vw, 112px)',
                top: '150px',
                width: 'min(620px, calc(100vw - 48px))',
                pointerEvents: 'none',
                color: '#f2f0eb',
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                    ? 'scale(1.12) translateY(0)'
                    : 'scale(1.12) translateY(10px)',
                transformOrigin: 'top left',
                transition:
                    `opacity ${DOMAIN_SCAN_FADE_DURATION}ms ease, ` +
                    `transform ${DOMAIN_SCAN_FADE_DURATION}ms ease`,
                fontFamily: 'inherit',
            }}
        >
            {/* Shared glass layer behind all scan content. */}
            <div
                className="domain-scan-glass"
                aria-hidden="true"
            />

            {/* SCANNING */}
            <div
                style={{
                    fontSize: '5.6px',
                    lineHeight: 1,
                    letterSpacing: '0.24em',
                    color: 'rgba(242, 240, 235, 0.48)',
                    opacity:
                        phase === 'scanning' ? 1 : 0,
                    transform:
                        phase === 'scanning'
                            ? 'translateY(0)'
                            : 'translateY(-4px)',
                    transition:
                        'opacity 220ms ease, transform 220ms ease',
                }}
            >
                SCANNING...
            </div>

            {/* DOMAIN HEADER */}
            <div
                style={{
                    marginTop: '14px',
                    opacity: isProfileVisible ? 1 : 0,
                    transform: isProfileVisible
                        ? 'translateY(0)'
                        : 'translateY(8px)',
                    transition:
                        'opacity 450ms ease, transform 450ms ease',
                }}
            >
                <div
                    style={{
                        fontSize: '6.16px',
                        lineHeight: 1,
                        letterSpacing: '0.22em',
                        color: 'rgba(242, 240, 235, 0.44)',
                    }}
                >
                    DOMAIN
                </div>

                <div
                    style={{
                        marginTop: '11px',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '16px',
                    }}
                >
                    <span
                        style={{
                            fontSize: '7.84px',
                            letterSpacing: '0.16em',
                            color:
                                domain?.accentColor ??
                                'rgba(242, 240, 235, 0.42)',
                        }}
                    >
                        {domain?.number}
                    </span>

                    <span
                        style={{
                            fontSize: '15.12px',
                            lineHeight: 1.1,
                            letterSpacing: '0.075em',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {domain?.name}
                    </span>
                </div>
            </div>

            {/* SCAN LINE */}
            <div
                style={{
                    marginTop: '20px',
                    width: isProfileVisible
                        ? 'min(360px, 58vw)'
                        : '0%',
                    height: '1px',
                    background: domain?.accentColor
                        ? `${domain.accentColor}66`
                        : 'rgba(242, 240, 235, 0.28)',
                    transition:
                        'width 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
            />

            {/* SYSTEM PROFILE */}
            <div
                style={{
                    marginTop: '20px',
                    maxWidth: 'min(360px, 58vw)',
                    opacity: isProfileVisible ? 1 : 0,
                    transform: isProfileVisible
                        ? 'translateY(0)'
                        : 'translateY(8px)',
                    transition:
                        'opacity 500ms ease 120ms, transform 500ms ease 120ms',
                }}
            >
                <div
                    style={{
                        fontSize: '5.6px',
                        lineHeight: 1,
                        letterSpacing: '0.22em',
                        color: 'rgba(242, 240, 235, 0.42)',
                    }}
                >
                    SYSTEM PROFILE
                </div>

                <p
                    style={{
                        margin: '11px 0 0',
                        maxWidth: '560px',
                        fontSize: '8.4px',
                        lineHeight: 1.65,
                        letterSpacing: '0.005em',
                        color: 'rgba(242, 240, 235, 0.78)',
                    }}
                >
                    {domain?.profile}
                </p>
            </div>

            {/* METADATA */}
            <div
                style={{
                    marginTop: '26px',
                    display: 'grid',
                    gap: '12px',
                    opacity: isProfileVisible ? 1 : 0,
                    transform: isProfileVisible
                        ? 'translateY(0)'
                        : 'translateY(8px)',
                    transition:
                        'opacity 500ms ease 220ms, transform 500ms ease 220ms',
                }}
            >
                {domain?.metadata.map((item) => (
                    <div
                        key={item.label}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '125px max-content',
                            columnGap: '20px',
                            alignItems: 'baseline',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '5.6px',
                                lineHeight: 1.5,
                                letterSpacing: '0.18em',
                                color: 'rgba(242, 240, 235, 0.34)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {item.label}
                        </span>

                        <span
                            style={{
                                fontSize: '7px',
                                lineHeight: 1.5,
                                letterSpacing: '0.11em',
                                color: 'rgba(242, 240, 235, 0.66)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* CAPABILITIES */}
            <div
                style={{
                    marginTop: '28px',
                    opacity: isProfileVisible ? 1 : 0,
                    transform: isProfileVisible
                        ? 'translateY(0)'
                        : 'translateY(8px)',
                    transition:
                        'opacity 500ms ease 320ms, transform 500ms ease 320ms',
                }}
            >
                <div
                    style={{
                        fontSize: '5.6px',
                        lineHeight: 1,
                        letterSpacing: '0.22em',
                        color: 'rgba(242, 240, 235, 0.42)',
                    }}
                >
                    CAPABILITIES
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'nowrap',
                        gap: '16px',
                        marginTop: '12px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                    }}
                >
                    {domain?.capabilities.map((capability) => (
                        <span
                            key={capability}
                            style={{
                                fontSize: '6.72px',
                                lineHeight: 1.4,
                                letterSpacing: '0.1em',
                                color: 'rgba(242, 240, 235, 0.68)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            {capability}
                        </span>
                    ))}
                </div>
            </div>

            {/* IDENTIFIED SYSTEMS */}
            <div
                style={{
                    marginTop: '24px',
                    opacity: isProfileVisible ? 1 : 0,
                    transform: isProfileVisible
                        ? 'translateY(0)'
                        : 'translateY(8px)',
                    transition:
                        'opacity 500ms ease 420ms, transform 500ms ease 420ms',
                }}
            >
                <div
                    style={{
                        fontSize: '5.6px',
                        lineHeight: 1,
                        letterSpacing: '0.22em',
                        color: 'rgba(242, 240, 235, 0.42)',
                    }}
                >
                    IDENTIFIED SYSTEMS
                </div>

                <div
                    style={{
                        marginTop: '6px',
                        fontSize: '6px',
                        lineHeight: 1.2,
                        letterSpacing: '0.12em',
                        color:
                            domain?.accentColor ??
                            'rgba(242, 240, 235, 0.48)',
                    }}
                >
                    SELECT A SYSTEM TO INSPECT
                </div>

                <div
                    style={{
                        marginTop: '5px',
                        display: 'grid',
                        gap: '4px',
                    }}
                >
                    {domain?.systems.map((system, index) => {
                        const isSelected =
                            selectedSystem === system

                        const isHovered =
                            hoveredSystem === system

                        const isFocused =
                            focusedSystem === system

                        const isEmphasized =
                            isSelected ||
                            isHovered ||
                            isFocused

                        const staggerDelay =
                            520 + index * 90

                        return (
                            <button
                                key={system}
                                type="button"
                                aria-pressed={isSelected}
                                tabIndex={isProfileVisible ? 0 : -1}
                                onClick={() =>
                                    selectSystem(system, index)
                                }
                                onMouseEnter={() =>
                                    setHoveredSystem(system)
                                }
                                onMouseLeave={() =>
                                    setHoveredSystem(null)
                                }
                                onFocus={() =>
                                    setFocusedSystem(system)
                                }
                                onBlur={() =>
                                    setFocusedSystem(null)
                                }
                                style={{
                                    appearance: 'none',
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '13px',
                                    width: 'fit-content',
                                    maxWidth: '100%',
                                    padding: 0,
                                    margin: 0,
                                    border: 0,
                                    background: 'transparent',
                                    color: 'inherit',
                                    font: 'inherit',
                                    textAlign: 'left',
                                    cursor: isProfileVisible
                                        ? 'pointer'
                                        : 'default',
                                    pointerEvents: isProfileVisible
                                        ? 'auto'
                                        : 'none',
                                    outline: 'none',
                                    opacity: isProfileVisible ? 1 : 0,
                                    transform: isProfileVisible
                                        ? 'translateX(0)'
                                        : 'translateX(-8px)',
                                    transition:
                                        `opacity 420ms ease ${staggerDelay}ms, ` +
                                        `transform 420ms ease ${staggerDelay}ms`,
                                }}
                            >
                                {/* System index */}
                                <span
                                    style={{
                                        width: '20px',
                                        flexShrink: 0,
                                        fontSize: '5.6px',
                                        letterSpacing: '0.1em',
                                        color: isEmphasized
                                            ? domain?.accentColor
                                            : 'rgba(242, 240, 235, 0.38)',
                                        fontWeight: isEmphasized
                                            ? 600
                                            : 400,
                                        textShadow:
                                            isEmphasized && domain?.accentColor
                                                ? `0 0 8px ${domain.accentColor}55`
                                                : 'none',
                                        transition:
                                            'color 180ms ease, text-shadow 180ms ease',
                                    }}
                                >
                                    {String(index + 1).padStart(2, '0')}
                                </span>

                                {/* Reusable terminal-style hover treatment */}
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'baseline',
                                        gap: '5px',
                                        minWidth: 0,
                                    }}
                                >
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            display: 'inline-block',
                                            width: '7px',
                                            flexShrink: 0,
                                            color: domain?.accentColor,
                                            opacity: isEmphasized ? 1 : 0,
                                            transform: isEmphasized
                                                ? 'translateX(0)'
                                                : 'translateX(-3px)',
                                            transition:
                                                'opacity 160ms ease, transform 160ms ease',
                                        }}
                                    >
                                        ›
                                    </span>

                                    <span
                                        style={{
                                            fontSize: '7px',
                                            letterSpacing: '0.1em',
                                            color: isEmphasized
                                                ? '#FFFFFF'
                                                : 'rgba(242, 240, 235, 0.48)',
                                            fontWeight: isSelected
                                                ? 600
                                                : isEmphasized
                                                    ? 500
                                                    : 400,
                                            whiteSpace: 'nowrap',
                                            borderBottom: isEmphasized
                                                ? `1px solid ${domain?.accentColor ?? '#F47A32'}`
                                                : '1px solid transparent',
                                            textShadow:
                                                isEmphasized && domain?.accentColor
                                                    ? `0 0 8px ${domain.accentColor}55`
                                                    : 'none',
                                            transition:
                                                'color 180ms ease, border-color 180ms ease, text-shadow 180ms ease',
                                        }}
                                    >
                                        {system}
                                    </span>
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default DomainScan
