import LoadingScreen from './LoadingScreen.jsx'
import OnyxScene from './OnyxScene.jsx'
import SystemApproachOverlay from './SystemApproachOverlay.jsx'
import ProjectTimeline from './ProjectTimeline.jsx'

function HeroSection({
scrollProgress,
projectTimelineProgress,
projectLocalProgress,
projectIndex,
projectCount,
timelineConfig,
caseFileTransitionRef,

}) {
return ( <section
         className="hero-section"
         aria-label="Onyx introduction"
     >
<SystemApproachOverlay
scrollProgress={
scrollProgress
}
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

        <OnyxScene
            caseFileTransitionRef={caseFileTransitionRef}
            scrollProgress={
                scrollProgress
            }
            projectTimelineProgress={
                projectTimelineProgress
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

        <LoadingScreen />
    </section>
)


}

export default HeroSection
