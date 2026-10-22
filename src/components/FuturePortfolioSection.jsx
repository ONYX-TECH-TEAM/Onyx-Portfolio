import {
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    useLocation,
    useNavigate,
} from 'react-router'

import DomainScan from './DomainScan.jsx'

const DOMAIN_SCAN_DURATION = 320
const DOMAIN_SCAN_FADE_DURATION = 420
const DOMAIN_SCAN_REVEAL_DURATION = 1100

const CASE_FILE_BUTTON_REVEAL_DELAY = 1020
const CASE_FILE_BUTTON_REVEAL_DURATION = 300
const CASE_FILE_BUTTON_EXIT_DURATION = 220

const PORTFOLIO_SCROLL_STORAGE_KEY =
    'onyx-portfolio-return-scroll-y'

const PORTFOLIO_SYSTEM_STORAGE_KEY =
    'onyx-portfolio-return-system'

const SYSTEM_SCAN_DATA = [
    // 01 — AI SYSTEMS & AUTOMATION
    [
        {
            profile:
                'Automates repetitive form completion by extracting information and mapping it to the correct fields.',
            coreFunction:
                'EXTRACTION · FIELD MAPPING · AUTOFILL',
            environment:
                'WEB FORMS · DOCUMENTS · WORKFLOWS',
            capabilities: [
                'OCR',
                'FIELD EXTRACTION',
                'DATA MAPPING',
                'FORM POPULATION',
            ],
        },
        {
            profile:
                'A conversational interface that answers questions, retrieves relevant information, and guides users through defined tasks.',
            coreFunction:
                'CONVERSATION · RETRIEVAL · RESPONSE',
            environment:
                'WEB · KNOWLEDGE BASE · SUPPORT',
            capabilities: [
                'NATURAL-LANGUAGE Q&A',
                'KNOWLEDGE RETRIEVAL',
                'INTENT ROUTING',
                'SUPPORT HANDOFF',
            ],
        },
        {
            profile:
                'Analyzes customer reviews to identify sentiment, recurring themes, and opportunities to improve the customer experience.',
            coreFunction:
                'SENTIMENT · THEMES · INSIGHTS',
            environment:
                'CUSTOMER REVIEWS · ANALYTICS',
            capabilities: [
                'SENTIMENT ANALYSIS',
                'THEME DETECTION',
                'REVIEW SUMMARIES',
                'TREND INSIGHTS',
            ],
        },
        {
            profile:
                'Transforms a topic or creative brief into structured short-form video concepts and production-ready scene prompts.',
            coreFunction:
                'IDEATION · SCRIPTING · SCENE PLANNING',
            environment:
                'INSTAGRAM REELS · SHORT-FORM VIDEO',
            capabilities: [
                'TOPIC-TO-SCRIPT',
                'SCENE PROMPTS',
                'VISUAL CONTINUITY',
                'REEL STRUCTURING',
            ],
        },
    ],

    // 02 — PRODUCT DEVELOPMENT
    [
        {
            profile:
                'A centralized client workspace for accessing project updates, deliverables, and important project resources.',
            coreFunction:
                'CLIENT ACCESS · STATUS · DELIVERABLES',
            environment:
                'WEB · CLIENT WORKSPACE',
            capabilities: [
                'PROJECT DASHBOARD',
                'STATUS TRACKING',
                'FILE HANDOFF',
                'CLIENT COMMUNICATION',
            ],
        },
        {
            profile:
                'A review management workspace for organizing customer feedback, coordinating responses, and monitoring review activity.',
            coreFunction:
                'ORGANIZATION · RESPONSE · MONITORING',
            environment:
                'BUSINESS DASHBOARD · REVIEW CHANNELS',
            capabilities: [
                'REVIEW ORGANIZATION',
                'RESPONSE WORKFLOWS',
                'STATUS TRACKING',
                'PERFORMANCE OVERVIEW',
            ],
        },
        {
            profile:
                'An NFC-enabled review card that takes customers directly to a review destination with a simple tap.',
            coreFunction:
                'NFC TAP · LINK ROUTING · REVIEW ACCESS',
            environment:
                'NFC CARD · MOBILE WEB · REVIEW PLATFORM',
            capabilities: [
                'TAP-TO-OPEN',
                'REVIEW DESTINATION',
                'MOBILE-FIRST FLOW',
                'CONTACTLESS ACCESS',
            ],
        },
        {
            profile:
                'A focused first version of a digital product, built around essential features and validated through iterative development.',
            coreFunction:
                'PRODUCT SCOPE · CORE FLOWS · ITERATION',
            environment:
                'WEB · MOBILE · API INTEGRATIONS',
            capabilities: [
                'REQUIREMENTS SCOPING',
                'CORE FEATURE BUILD',
                'API INTEGRATION',
                'MVP VALIDATION',
            ],
        },
    ],

    // 03 — UI/UX DESIGN
    [
        {
            profile:
                'Purpose-built product interfaces that make essential tasks clear, intuitive, and efficient for users.',
            coreFunction:
                'LAYOUT · INTERACTION · USABILITY',
            environment:
                'WEB · MOBILE · DIGITAL PRODUCTS',
            capabilities: [
                'INTERFACE LAYOUTS',
                'VISUAL HIERARCHY',
                'INTERACTION DESIGN',
                'RESPONSIVE SCREENS',
            ],
        },
        {
            profile:
                'A reusable collection of design foundations and components that keeps product interfaces consistent as they grow.',
            coreFunction:
                'TOKENS · COMPONENTS · CONSISTENCY',
            environment:
                'DESIGN LIBRARY · PRODUCT UI',
            capabilities: [
                'DESIGN TOKENS',
                'REUSABLE COMPONENTS',
                'STYLE GUIDELINES',
                'UI CONSISTENCY',
            ],
        },
        {
            profile:
                'Interactive prototypes that demonstrate how a product behaves and allow key interactions to be evaluated before development.',
            coreFunction:
                'PROTOTYPING · INTERACTION · VALIDATION',
            environment:
                'DESIGN TOOLS · INTERACTIVE FLOWS',
            capabilities: [
                'CLICKABLE FLOWS',
                'INTERACTION STATES',
                'USER TESTING',
                'DESIGN VALIDATION',
            ],
        },
        {
            profile:
                'Structured user journeys that connect screens and decisions into a coherent, low-friction experience.',
            coreFunction:
                'JOURNEYS · DECISIONS · USABILITY',
            environment:
                'WEB · MOBILE · SERVICE FLOWS',
            capabilities: [
                'USER JOURNEY MAPPING',
                'TASK FLOWS',
                'FRICTION REDUCTION',
                'NAVIGATION LOGIC',
            ],
        },
    ],

    // 04 — SOCIAL MEDIA MARKETING
    [
        {
            profile:
                'An organized framework for planning, creating, and coordinating consistent brand content across social platforms.',
            coreFunction:
                'CONTENT PLANNING · FORMATS · PUBLISHING',
            environment:
                'INSTAGRAM · LINKEDIN · TIKTOK',
            capabilities: [
                'CONTENT CALENDARS',
                'FORMAT PLANNING',
                'PUBLISHING WORKFLOWS',
                'CONTENT CONSISTENCY',
            ],
        },
        {
            profile:
                'A structured approach to coordinating campaign objectives, creative assets, publishing activities, and performance tracking.',
            coreFunction:
                'PLANNING · EXECUTION · TRACKING',
            environment:
                'SOCIAL PLATFORMS · CAMPAIGN ASSETS',
            capabilities: [
                'CAMPAIGN PLANNING',
                'ASSET COORDINATION',
                'EXECUTION TRACKING',
                'PERFORMANCE REVIEW',
            ],
        },
        {
            profile:
                'A repeatable content workflow that connects creative briefs, production, review, and approved brand content.',
            coreFunction:
                'BRIEFING · CREATION · APPROVAL',
            environment:
                'CONTENT WORKFLOWS · SOCIAL CHANNELS',
            capabilities: [
                'CREATIVE BRIEFS',
                'CONTENT PRODUCTION',
                'REVIEW AND APPROVAL',
                'ASSET ORGANIZATION',
            ],
        },
        {
            profile:
                'A reporting framework for understanding social content performance, audience engagement, and changes over time.',
            coreFunction:
                'PERFORMANCE · AUDIENCE · TRENDS',
            environment:
                'PLATFORM INSIGHTS · CAMPAIGN REPORTING',
            capabilities: [
                'ENGAGEMENT TRACKING',
                'AUDIENCE INSIGHTS',
                'CONTENT COMPARISON',
                'TREND REPORTING',
            ],
        },
    ],

    // 05 — BRANDING & LOGO DESIGN
    [
        {
            profile:
                'A coherent logo identity built around a recognizable mark, considered variations, and consistent application.',
            coreFunction:
                'LOGO CONCEPT · VARIATIONS · USAGE',
            environment:
                'DIGITAL · PRINT · BRAND TOUCHPOINTS',
            capabilities: [
                'LOGO CONCEPTS',
                'LOGO VARIATIONS',
                'CLEAR-SPACE RULES',
                'APPLICATION GUIDANCE',
            ],
        },
        {
            profile:
                'A practical reference for applying a brand consistently across typography, colors, imagery, and visual assets.',
            coreFunction:
                'RULES · TYPOGRAPHY · COLOR · USAGE',
            environment:
                'BRAND DOCUMENTATION · CREATIVE ASSETS',
            capabilities: [
                'COLOR PALETTES',
                'TYPOGRAPHY RULES',
                'LOGO USAGE',
                'BRAND CONSISTENCY',
            ],
        },
        {
            profile:
                'A distinctive visual language that connects art direction, graphic elements, and visual decisions into a coherent identity.',
            coreFunction:
                'ART DIRECTION · GRAPHIC STYLE · CONSISTENCY',
            environment:
                'DIGITAL · PRINT · CAMPAIGNS',
            capabilities: [
                'ART DIRECTION',
                'GRAPHIC ELEMENTS',
                'IMAGE DIRECTION',
                'VISUAL CONSISTENCY',
            ],
        },
        {
            profile:
                'A coordinated collection of branded social assets and templates designed for recognizable, consistent publishing.',
            coreFunction:
                'SOCIAL TEMPLATES · ASSETS · CONSISTENCY',
            environment:
                'INSTAGRAM · LINKEDIN · SOCIAL CHANNELS',
            capabilities: [
                'POST TEMPLATES',
                'STORY ASSETS',
                'BRANDED GRAPHICS',
                'REUSABLE LAYOUTS',
            ],
        },
    ],
]

// Map each domain to its dedicated project-page URL.
const DOMAIN_ROUTE_SLUGS = [
    'ai-solutions',
    'product-development',
    'ui-ux-design',
    'social-media-marketing',
    'branding-logo-design',
]

function getCaseFilePath(system) {
    const domainSlug =
        DOMAIN_ROUTE_SLUGS[system.domainIndex]

    if (!domainSlug) {
        return '/'
    }

    return `/projects/${domainSlug}/${system.id}`
}

// Preload the case-file page and its imported JavaScript modules.
// This lets the browser fetch them while the user is still viewing
// the system profile, before the camera transition finishes.
let caseFilePagePreloadPromise = null

function preloadCaseFilePage() {
    if (!caseFilePagePreloadPromise) {
        caseFilePagePreloadPromise = import(
            '../pages/CaseFilePage.jsx'
        ).catch((error) => {
            console.warn(
                '[ONYX] Case-file preloading failed. ' +
                'The normal navigation will still be attempted.',
                error,
            )

            // Allow another attempt if this preload failed.
            caseFilePagePreloadPromise = null

            return null
        })
    }

    return caseFilePagePreloadPromise
}

function SystemScan({
    system,
    onAccessCaseFile,
    onReturn,
    caseFileTransitioning,
}) {
    const [phase, setPhase] = useState('hidden')

    const [caseFileButtonRevealed, setCaseFileButtonRevealed] =
        useState(false)

    const [caseFileButtonExiting, setCaseFileButtonExiting] =
        useState(false)

    const [caseFileButtonHovered, setCaseFileButtonHovered] =
        useState(false)

    const [caseFileButtonFocused, setCaseFileButtonFocused] =
        useState(false)

    const returnTimerRef = useRef(null)

    const details =
        SYSTEM_SCAN_DATA[system.domainIndex]?.[
            Number(system.id) - 1
        ]

    // Restore the CTA after returning from the case-file page.
    useEffect(() => {
        if (!caseFileTransitioning) {
            setCaseFileButtonExiting(false)
        }
    }, [caseFileTransitioning])

    // Start loading the case-file page as soon as the profile appears.
    // Do not wait for the user to click ACCESS CASE FILE.
    useEffect(() => {
        if (phase !== 'profile') {
            setCaseFileButtonRevealed(false)
            return
        }

        void preloadCaseFilePage()

        const revealTimer = window.setTimeout(() => {
            setCaseFileButtonRevealed(true)
        }, CASE_FILE_BUTTON_REVEAL_DELAY)

        return () => {
            window.clearTimeout(revealTimer)
        }
    }, [phase])

    useEffect(() => {
        setPhase('hidden')

        let profileTimer

        const animationFrame =
            window.requestAnimationFrame(() => {
                setPhase('scanning')

                profileTimer = window.setTimeout(
                    () => setPhase('profile'),
                    DOMAIN_SCAN_DURATION,
                )
            })

        return () => {
            window.cancelAnimationFrame(animationFrame)

            if (profileTimer) {
                window.clearTimeout(profileTimer)
            }

            if (returnTimerRef.current !== null) {
                window.clearTimeout(returnTimerRef.current)
                returnTimerRef.current = null
            }
        }
    }, [system])

    const handleCaseFileAccess = () => {
        if (
            !onAccessCaseFile ||
            phase !== 'profile' ||
            !caseFileButtonRevealed ||
            caseFileButtonExiting ||
            caseFileTransitioning
        ) {
            return
        }

        // Let the CTA exit while the camera journey begins immediately.
        setCaseFileButtonHovered(false)
        setCaseFileButtonFocused(false)
        setCaseFileButtonExiting(true)
        onAccessCaseFile(system)
    }

    const handleReturn = () => {
        if (
            returnTimerRef.current !== null ||
            caseFileTransitioning
        ) {
            return
        }

        setCaseFileButtonHovered(false)
        setCaseFileButtonFocused(false)
        setCaseFileButtonExiting(true)
        setPhase('exiting')

        returnTimerRef.current = window.setTimeout(() => {
            returnTimerRef.current = null
            onReturn?.()
        }, DOMAIN_SCAN_REVEAL_DURATION)
    }

    if (!details) {
        return null
    }

    const isVisible = phase !== 'hidden'
    const isProfileVisible = phase === 'profile'

    const metadata = [
        {
            label: 'DOMAIN',
            value: system.domainName,
        },
        {
            label: 'CORE FUNCTION',
            value: details.coreFunction,
        },
        {
            label: 'ENVIRONMENT',
            value: details.environment,
        },
    ]

    const caseFileButtonInteractive =
        isProfileVisible &&
        caseFileButtonRevealed &&
        !caseFileButtonExiting &&
        !caseFileTransitioning

    const caseFileButtonHighlighted =
        caseFileButtonHovered ||
        caseFileButtonFocused

    return (
        <div
            className="domain-scan-overlay"
            data-phase={phase}
            aria-hidden={!isProfileVisible}
            style={{
                position: 'fixed',
                zIndex: 21,
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
                transition: `transform ${DOMAIN_SCAN_FADE_DURATION}ms ease`,
                fontFamily: 'inherit',
            }}
        >
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
                    opacity: phase === 'scanning' ? 1 : 0,
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

            {/* SYSTEM HEADER */}
            <div
                style={{
                    marginTop: '14px',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '16px',
                    opacity: isProfileVisible ? 1 : 0,
                    transform: isProfileVisible
                        ? 'translateY(0)'
                        : 'translateY(8px)',
                    transition:
                        'opacity 450ms ease, transform 450ms ease',
                }}
            >
                <span
                    style={{
                        fontSize: '7.84px',
                        letterSpacing: '0.16em',
                        color: system.accentColor,
                    }}
                >
                    {system.domainNumber}.{system.id}
                </span>

                <span
                    style={{
                        fontSize: '15.12px',
                        lineHeight: 1.2,
                        letterSpacing: '0.075em',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {system.name}
                </span>
            </div>

            {/* POINTER LINE */}
            <div
                style={{
                    marginTop: '20px',
                    width: isProfileVisible
                        ? 'min(360px, 58vw)'
                        : '0%',
                    height: '1px',
                    background: `${system.accentColor}66`,
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
                    {details.profile}
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
                {metadata.map((item) => (
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
                    {details.capabilities.map((capability) => (
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

            {/* CASE FILE ENTRY POINT */}
            <div
                style={{
                    marginTop: '30px',
                    opacity: caseFileButtonInteractive ? 1 : 0,
                    transform: caseFileButtonInteractive
                        ? 'translateX(0)'
                        : caseFileButtonExiting
                            ? 'translateX(-15px)'
                            : 'translateX(-10px)',
                    clipPath: caseFileButtonInteractive
                        ? 'inset(0 0 0 0)'
                        : 'inset(0 100% 0 0)',
                    pointerEvents: caseFileButtonInteractive
                        ? 'auto'
                        : 'none',
                    transition:
                        `opacity ${caseFileButtonExiting || caseFileTransitioning ? CASE_FILE_BUTTON_EXIT_DURATION : CASE_FILE_BUTTON_REVEAL_DURATION}ms ease, transform ${caseFileButtonExiting || caseFileTransitioning ? CASE_FILE_BUTTON_EXIT_DURATION : CASE_FILE_BUTTON_REVEAL_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), clip-path ${caseFileButtonExiting || caseFileTransitioning ? CASE_FILE_BUTTON_EXIT_DURATION : CASE_FILE_BUTTON_REVEAL_DURATION}ms ease`,
                }}
            >
                <button
                    type="button"
                    onClick={handleCaseFileAccess}
                    disabled={
                        !caseFileButtonInteractive ||
                        !onAccessCaseFile
                    }
                    onMouseEnter={() =>
                        setCaseFileButtonHovered(true)
                    }
                    onMouseLeave={() =>
                        setCaseFileButtonHovered(false)
                    }
                    onFocus={() =>
                        setCaseFileButtonFocused(true)
                    }
                    onBlur={() =>
                        setCaseFileButtonFocused(false)
                    }
                    style={{
                        appearance: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                        margin: 0,
                        border: 0,
                        background: 'transparent',
                        font: 'inherit',
                        fontSize: '6px',
                        lineHeight: 1.6,
                        letterSpacing: '0.12em',
                        color: caseFileButtonHighlighted
                            ? '#f2f0eb'
                            : system.accentColor,
                        textShadow: caseFileButtonHighlighted
                            ? `0 0 8px ${system.accentColor}55`
                            : 'none',
                        cursor: caseFileButtonInteractive
                            ? 'pointer'
                            : 'default',
                        outline: 'none',
                        transition:
                            'color 160ms ease, text-shadow 160ms ease',
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            display: 'inline-block',
                            width: '7px',
                            flexShrink: 0,
                            color: system.accentColor,
                            opacity: caseFileButtonHighlighted ? 1 : 0,
                            transform: caseFileButtonHighlighted
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
                            borderBottom: caseFileButtonHighlighted
                                ? `1px solid ${system.accentColor}`
                                : '1px solid transparent',
                            transition: 'border-color 160ms ease',
                        }}
                    >
                        ACCESS CASE FILE
                    </span>
                </button>
            </div>

            {/* RETURN TO SYSTEM LIST */}
            <div
                style={{
                    marginTop: '18px',
                    opacity: isProfileVisible ? 1 : 0,
                    transform: isProfileVisible
                        ? 'translateY(0)'
                        : 'translateY(8px)',
                    transition:
                        'opacity 500ms ease 420ms, transform 500ms ease 420ms',
                }}
            >
                <button
                    type="button"
                    onClick={handleReturn}
                    style={{
                        appearance: 'none',
                        display: 'block',
                        padding: 0,
                        margin: 0,
                        border: 0,
                        background: 'transparent',
                        font: 'inherit',
                        fontSize: '6px',
                        lineHeight: 1.4,
                        letterSpacing: '0.12em',
                        color: 'rgba(242, 240, 235, 0.48)',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        textAlign: 'left',
                    }}
                >
                    VIEW ALL SYSTEMS
                </button>
            </div>
        </div>
    )
}

function readSavedSystem() {
    try {
        const savedSystem = sessionStorage.getItem(
            PORTFOLIO_SYSTEM_STORAGE_KEY,
        )

        if (!savedSystem) {
            return null
        }

        const parsedSystem = JSON.parse(savedSystem)

        if (
            !parsedSystem ||
            typeof parsedSystem.id !== 'string' ||
            !Number.isInteger(parsedSystem.domainIndex)
        ) {
            return null
        }

        return parsedSystem
    } catch {
        return null
    }
}

function FuturePortfolioSection({
    scrollViewports,
    projectTimelineProgress,
    caseFileTransitionRef,
}) {
    const navigate = useNavigate()
    const location = useLocation()

    // Track the previous route so browser Back can be distinguished
    // from ordinary navigation to the portfolio.
    const previousPathnameRef = useRef(location.pathname)

    const [selectedSystem, setSelectedSystem] =
        useState(readSavedSystem)

    const [domainScanKey, setDomainScanKey] =
        useState(0)

    const [systemScanReplayKey, setSystemScanReplayKey] =
        useState(0)

    const [caseFileTransitioning, setCaseFileTransitioning] =
        useState(false)

    // Restore the original SystemScan and reverse the camera journey.
    // Supports both the custom return button and browser Back.
    useEffect(() => {
        const previousPathname = previousPathnameRef.current
        const currentPathname = location.pathname

        // Record the current route before handling this navigation.
        previousPathnameRef.current = currentPathname

        const isPortfolioRoute = currentPathname === '/'

        const hasExplicitReverseSignal =
            isPortfolioRoute &&
            location.state?.reverseCaseFile === true

        const returnedFromCaseFile =
            isPortfolioRoute &&
            previousPathname.startsWith('/projects/')

        // Ignore navigation that isn't a case-file return.
        if (
            !hasExplicitReverseSignal &&
            !returnedFromCaseFile
        ) {
            return
        }

        const controller =
            caseFileTransitionRef?.current

        const restoredSystem =
            selectedSystem ?? readSavedSystem()

        if (restoredSystem) {
            setSelectedSystem(restoredSystem)
        }

        setCaseFileTransitioning(true)

        if (
            controller?.mode === 'open' &&
            !controller.request
        ) {
            controller.request = {
                type: 'return',

                onComplete: () => {
                    if (restoredSystem) {
                        setSelectedSystem(restoredSystem)
                    }

                    // Restart the scan's entrance animation after
                    // the camera has completed its return journey.
                    setSystemScanReplayKey(
                        (currentKey) => currentKey + 1,
                    )

                    setCaseFileTransitioning(false)

                    try {
                        sessionStorage.removeItem(
                            PORTFOLIO_SCROLL_STORAGE_KEY,
                        )

                        sessionStorage.removeItem(
                            PORTFOLIO_SYSTEM_STORAGE_KEY,
                        )
                    } catch {
                        // Animation does not depend on storage cleanup.
                    }
                },
            }
        } else {
            setCaseFileTransitioning(false)
        }

        // Consume only our custom return signal.
        // Browser Back has already changed the route, so do not
        // navigate again or create another history operation.
        if (hasExplicitReverseSignal) {
            navigate('/', {
                replace: true,
                state: null,
            })
        }
    }, [
        location.pathname,
        location.state,
        navigate,
        caseFileTransitionRef,
        selectedSystem,
    ])

    // Consume the saved system after its initial restoration.
    useEffect(() => {
        try {
            sessionStorage.removeItem(
                PORTFOLIO_SYSTEM_STORAGE_KEY,
            )
        } catch {
            // Navigation can still work if session storage is unavailable.
        }
    }, [])

    const returnToDomain = () => {
        setSelectedSystem(null)
        setCaseFileTransitioning(false)

        setDomainScanKey((currentKey) => currentKey + 1)
    }

    const handleAccessCaseFile = (system) => {
        const controller =
            caseFileTransitionRef?.current

        if (
            !controller ||
            controller.mode !== 'idle' ||
            controller.request ||
            !system ||
            caseFileTransitioning
        ) {
            return
        }

        // Make sure the page preload is underway before the transition.
        // The camera transition itself does not wait for this promise.
        const caseFilePageReady = preloadCaseFilePage()

        try {
            sessionStorage.setItem(
                PORTFOLIO_SCROLL_STORAGE_KEY,
                String(window.scrollY),
            )

            sessionStorage.setItem(
                PORTFOLIO_SYSTEM_STORAGE_KEY,
                JSON.stringify(system),
            )
        } catch (error) {
            console.warn(
                'Could not save the portfolio return state.',
                error,
            )
        }

        setCaseFileTransitioning(true)

        // The camera journey and shard dissolve continue without waiting
        // for the page download. Navigation happens after CameraRig's
        // completion callback and after the preload settles.
        controller.request = {
            type: 'enter',
            systemIndex: system.domainIndex,

            onComplete: async () => {
                await caseFilePageReady

                navigate(getCaseFilePath(system), {
                    state: {
                        fromPortfolio: true,
                    },
                })
            },
        }
    }

    return (
        <section
            className="future-portfolio-section"
            aria-label="Portfolio"
            style={{
                '--portfolio-scroll-viewports':
                    scrollViewports + 1,
            }}
        >
            <div
                style={{
                    display: selectedSystem
                        ? 'none'
                        : 'contents',
                }}
            >
                <DomainScan
                    key={domainScanKey}
                    projectTimelineProgress={
                        projectTimelineProgress
                    }
                    onSystemSelect={setSelectedSystem}
                    onDomainChange={() =>
                        setSelectedSystem(null)
                    }
                />
            </div>

            {selectedSystem && (
                <div
                    style={{
                        opacity: caseFileTransitioning ? 0 : 1,
                        transition: caseFileTransitioning
                            ? 'opacity 420ms ease'
                            : 'none',
                        pointerEvents: caseFileTransitioning
                            ? 'none'
                            : 'auto',
                    }}
                >
                    <SystemScan
                        key={`${selectedSystem.domainIndex}-${selectedSystem.id}-${systemScanReplayKey}`}
                        system={selectedSystem}
                        onAccessCaseFile={handleAccessCaseFile}
                        onReturn={returnToDomain}
                        caseFileTransitioning={
                            caseFileTransitioning
                        }
                    />
                </div>
            )}
        </section>
    )
}

export default FuturePortfolioSection