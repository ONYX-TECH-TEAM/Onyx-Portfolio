import { lazy, Suspense } from 'react'

import LoadingScreen from './LoadingScreen.jsx'
import SystemApproachOverlay from './SystemApproachOverlay.jsx'
import ProjectTimeline from './ProjectTimeline.jsx'

const OnyxScene = lazy(() => import('./OnyxScene.jsx'))

function HeroSection({
scrollProgress,
projectTimelineProgress,
projectLocalProgress,
projectIndex,
projectCount,
timelineConfig,
transitionViewports,
caseFileTransitionRef,

}) {
return ( <section
         className="hero-section"
         aria-label="Onyx introduction"
     >
<SystemApproachOverlay
transitionViewports={transitionViewports}
/>


        <ProjectTimeline
            introProgress={
                scrollProgress
            }
            projectLocalProgress={
                projectLocalProgress
            }
            projectIndex={
                projectIndex
            }
            projectCount={
                projectCount
            }
            timelineConfig={
                timelineConfig
            }
        />

        <Suspense fallback={null}>
            <OnyxScene
                caseFileTransitionRef={caseFileTransitionRef}
                scrollProgress={scrollProgress}
                projectTimelineProgress={projectTimelineProgress}
                projectLocalProgress={projectLocalProgress}
                projectIndex={projectIndex}
                projectCount={projectCount}
                timelineConfig={timelineConfig}
            />
        </Suspense>

        <LoadingScreen />
    </section>
)


}

export default HeroSection
