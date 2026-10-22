import {
    useLayoutEffect,
    useRef,
} from 'react'

import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useLocation,
} from 'react-router'

import FuturePortfolioSection from './components/FuturePortfolioSection.jsx'
import HeroSection from './components/HeroSection.jsx'
import CaseFilePage from './pages/CaseFilePage.jsx'
import { useScrollTimeline } from './hooks/useScrollProgress.js'

export const PORTFOLIO_SCROLL_STORAGE_KEY =
    'onyx-portfolio-return-scroll-y'

export const PORTFOLIO_SYSTEM_STORAGE_KEY =
    'onyx-portfolio-return-system'

const PROJECT_TIMELINE = Object.freeze({
    transitionViewports: 1,
    projectCount: 5,
    projectStepViewports: 1,
})

function PortfolioHome({
    restoreReturnScroll,
    isPortfolioPage,
}) {
    const caseFileTransitionRef = useRef({
        request: null,
        mode: 'idle',
    })

    const initialScrollHandledRef = useRef(false)

    useLayoutEffect(() => {
        // Restore the saved scroll position only when returning
        // from a case file through the reverse transition.
        if (restoreReturnScroll) {
            initialScrollHandledRef.current = true

            let savedPosition

            try {
                savedPosition = sessionStorage.getItem(
                    PORTFOLIO_SCROLL_STORAGE_KEY,
                )
            } catch {
                return
            }

            if (savedPosition === null) {
                return
            }

            const scrollY = Number(savedPosition)

            if (!Number.isFinite(scrollY)) {
                try {
                    sessionStorage.removeItem(
                        PORTFOLIO_SCROLL_STORAGE_KEY,
                    )
                } catch {
                    // Storage may be unavailable.
                }

                return
            }

            // Consume the position so a later ordinary reload
            // cannot restore this old journey position.
            try {
                sessionStorage.removeItem(
                    PORTFOLIO_SCROLL_STORAGE_KEY,
                )
            } catch {
                // The position can still be restored this time.
            }

            window.scrollTo(0, scrollY)
            window.dispatchEvent(new Event('scroll'))

            const frame = window.requestAnimationFrame(() => {
                window.scrollTo(0, scrollY)
                window.dispatchEvent(new Event('scroll'))
            })

            return () => {
                window.cancelAnimationFrame(frame)
            }
        }

        // Ordinary portfolio entry always starts at the far HERO.
        if (
            !initialScrollHandledRef.current &&
            isPortfolioPage
        ) {
            initialScrollHandledRef.current = true

            try {
                sessionStorage.removeItem(
                    PORTFOLIO_SCROLL_STORAGE_KEY,
                )
            } catch {
                // Storage may be unavailable.
            }

            window.scrollTo(0, 0)
            window.dispatchEvent(new Event('scroll'))
        }
    }, [restoreReturnScroll, isPortfolioPage])

    const timeline = useScrollTimeline(
        PROJECT_TIMELINE,
    )

    const projectScrollViewports =
        PROJECT_TIMELINE.projectCount *
        PROJECT_TIMELINE.projectStepViewports

    return (
        <main className="app">
            <HeroSection
                caseFileTransitionRef={caseFileTransitionRef}
                scrollProgress={timeline.introProgress}
                projectTimelineProgress={
                    timeline.projectTimelineProgress
                }
                projectLocalProgress={
                    timeline.projectLocalProgress
                }
                projectIndex={timeline.projectIndex}
                projectCount={PROJECT_TIMELINE.projectCount}
                timelineConfig={PROJECT_TIMELINE}
            />

            <FuturePortfolioSection
    caseFileTransitionRef={caseFileTransitionRef}
    scrollViewports={projectScrollViewports}
    projectTimelineProgress={
        timeline.projectTimelineProgress
    }
/>
        </main>
    )
}

function AppRoutes() {
    const location = useLocation()
    const isPortfolioPage = location.pathname === '/'

    /*
     * Capture the initial document-load information once.
     *
     * If the browser refreshes on a case-file URL, clear the
     * saved return position and saved domain selection before
     * PortfolioHome and FuturePortfolioSection initialize.
     */
    const initialDocumentRouteRef = useRef(null)

    if (initialDocumentRouteRef.current === null) {
        let navigationType = 'navigate'

        try {
            navigationType =
                window.performance
                    ?.getEntriesByType('navigation')?.[0]?.type
                ?? 'navigate'
        } catch {
            // Fall back to normal navigation if unavailable.
        }

        const shouldResetCaseFileOnReload =
            navigationType === 'reload' &&
            location.pathname.startsWith('/projects/')

        initialDocumentRouteRef.current = {
            pathname: location.pathname,
            key: location.key,
            shouldResetCaseFileOnReload,
        }

        // This is a one-time startup reset, not a reset on
        // ordinary in-app navigation or case-file return.
        if (shouldResetCaseFileOnReload) {
            try {
                sessionStorage.removeItem(
                    PORTFOLIO_SCROLL_STORAGE_KEY,
                )
                sessionStorage.removeItem(
                    PORTFOLIO_SYSTEM_STORAGE_KEY,
                )
            } catch {
                // Session storage may be unavailable.
            }
        }
    }

    const initialDocumentRoute =
        initialDocumentRouteRef.current

    const shouldRedirectReloadedCaseFile =
        initialDocumentRoute.shouldResetCaseFileOnReload &&
        location.pathname === initialDocumentRoute.pathname &&
        location.key === initialDocumentRoute.key

    // Prevent browser-native scroll restoration from competing
    // with the portfolio's own scroll and camera journey.
    useLayoutEffect(() => {
        const browserHistory = window.history

        if (!('scrollRestoration' in browserHistory)) {
            return
        }

        const previousScrollRestoration =
            browserHistory.scrollRestoration

        browserHistory.scrollRestoration = 'manual'

        return () => {
            browserHistory.scrollRestoration =
                previousScrollRestoration
        }
    }, [])

    const restoreReturnScroll =
        isPortfolioPage &&
        location.state?.reverseCaseFile === true

    return (
        <>
            {/* Keep the 3D portfolio mounted behind case-file pages. */}
            <div
                aria-hidden={!isPortfolioPage}
                style={{
                    visibility: 'visible',
                    pointerEvents: isPortfolioPage
                        ? 'auto'
                        : 'none',
                }}
            >
                <PortfolioHome
                    isPortfolioPage={isPortfolioPage}
                    restoreReturnScroll={restoreReturnScroll}
                />
            </div>

            <Routes>
                <Route
                    path="/"
                    element={null}
                />

                <Route
                    path="/projects/:domainSlug/:systemId"
                    element={
                        shouldRedirectReloadedCaseFile
                            ? (
                                <Navigate
                                    to="/"
                                    replace
                                    state={null}
                                />
                            )
                            : (
                                <CaseFilePage />
                            )
                    }
                />

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />
            </Routes>
        </>
    )
}

function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    )
}

export default App