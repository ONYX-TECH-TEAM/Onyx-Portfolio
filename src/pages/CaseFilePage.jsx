import {
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    useLocation,
    useNavigate,
    useParams,
} from 'react-router'

import CaseFileAtmosphere from '../components/CaseFileAtmosphere.jsx'

const CASE_FILE_BACKGROUND_DURATION = 850
const CASE_FILE_CONTENT_DURATION = 700

const DOMAIN_NAMES = {
    'ai-solutions': 'AI Solutions',
    'product-development': 'Product Development',
    'ui-ux-design': 'UI/UX Design',
    'social-media-marketing': 'Social Media Marketing',
    'branding-logo-design': 'Branding & Logo Design',
}

function CaseFilePage() {
    const { domainSlug, systemId } = useParams()

    const navigate = useNavigate()
    const location = useLocation()

    const [entered, setEntered] = useState(false)
    const [exiting, setExiting] = useState(false)

    const exitTimerRef = useRef(null)

    useEffect(() => {
        // Begin the entry animation on the next animation frame.
        const frame = window.requestAnimationFrame(() => {
            setEntered(true)
        })

        return () => {
            window.cancelAnimationFrame(frame)

            if (exitTimerRef.current !== null) {
                window.clearTimeout(exitTimerRef.current)
                exitTimerRef.current = null
            }
        }
    }, [])

    const handleBackToPortfolio = () => {
        // Prevent repeated clicks while the exit transition runs.
        if (exiting || exitTimerRef.current !== null) {
            return
        }

        // Fade out the content and reveal the environment underneath.
        setExiting(true)

        exitTimerRef.current = window.setTimeout(() => {
            exitTimerRef.current = null

            if (location.state?.fromPortfolio) {
                // The mounted portfolio receives this signal and
                // reverses the existing camera transition.
                navigate('/', {
                    replace: true,
                    state: {
                        reverseCaseFile: true,
                    },
                })
            } else {
                // A directly opened project has no saved camera
                // transition to reverse.
                navigate('/', {
                    replace: true,
                })
            }
        }, CASE_FILE_BACKGROUND_DURATION)
    }

    const domainName =
        DOMAIN_NAMES[domainSlug] ?? 'Project'

    const isVisible = entered && !exiting

    return (
        <main
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                isolation: 'isolate',
                overflowY: 'auto',
                minHeight: '100vh',
                boxSizing: 'border-box',
                padding: '40px clamp(24px, 6.2vw, 112px)',

                // Keep the existing background transition as a fallback.
                backgroundColor:
                    isVisible
                        ? '#08090b'
                        : 'rgba(8, 9, 11, 0)',

                transition:
                    `background-color ${CASE_FILE_BACKGROUND_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,

                pointerEvents: exiting ? 'none' : 'auto',
            }}
        >
            <CaseFileAtmosphere
                domainSlug={domainSlug}
                visible={isVisible}
            />

            {/* Existing case-file content remains above the background. */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: 1100,
                    margin: '0 auto',

                    opacity: isVisible ? 1 : 0,

                    transform: isVisible
                        ? 'translateY(0)'
                        : 'translateY(12px)',

                    transition:
                        `opacity ${CASE_FILE_CONTENT_DURATION}ms ease, transform ${CASE_FILE_CONTENT_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
            >
                <button
                    type="button"
                    onClick={handleBackToPortfolio}
                    disabled={exiting}
                    style={{
                        display: 'inline-block',
                        padding: 0,
                        border: 0,
                        background: 'transparent',
                        color: 'rgba(242, 240, 235, 0.6)',
                        fontFamily: 'inherit',
                        fontSize: 11,
                        letterSpacing: '0.12em',
                        textAlign: 'left',
                        cursor: exiting ? 'default' : 'pointer',
                    }}
                >
                    ← BACK TO SYSTEM SCAN
                </button>

                <div
                    style={{
                        marginTop: 100,
                        fontSize: 11,
                        letterSpacing: '0.18em',
                        color: 'rgba(242, 240, 235, 0.5)',
                    }}
                >
                    ONYX / PROJECT CASE FILE
                </div>

                <p
                    style={{
                        marginTop: 32,
                        fontSize: 12,
                        letterSpacing: '0.12em',
                        color: 'rgba(242, 240, 235, 0.55)',
                    }}
                >
                    {domainName}
                </p>

                <h1
                    style={{
                        marginTop: 16,
                        fontSize: 'clamp(36px, 6vw, 76px)',
                        fontWeight: 400,
                        lineHeight: 1.1,
                        letterSpacing: '-0.035em',
                    }}
                >
                    Project {systemId}
                </h1>

                <p
                    style={{
                        maxWidth: 540,
                        marginTop: 24,
                        fontSize: 14,
                        lineHeight: 1.8,
                        color: 'rgba(242, 240, 235, 0.65)',
                    }}
                >
                    This is the dedicated project page.
                    The final case-study experience will be
                    designed separately.
                </p>
            </div>
        </main>
    )
}

export default CaseFilePage
