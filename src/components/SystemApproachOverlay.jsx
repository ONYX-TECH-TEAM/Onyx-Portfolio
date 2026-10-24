
import { useEffect, useRef } from 'react'

const TITLE_MOVE_END = 0.56
const TITLE_CLOSE_SCALE = 0.68

function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum,
    )
}

function lerp(start, end, amount) {
    return start + (end - start) * amount
}

function smoothStep(value) {
    return value * value * (3 - 2 * value)
}

function SystemApproachOverlay({ transitionViewports = 1 }) {
    const overlay = useRef(null)

    useEffect(() => {
        const update = () => {
            if (!overlay.current) return

            const width = window.innerWidth
            const height = window.innerHeight
            const progress = clamp(
                window.scrollY /
                    Math.max(height * transitionViewports, 1),
                0,
                1,
            )
            const titleProgress = smoothStep(
                clamp(progress / TITLE_MOVE_END, 0, 1),
            )
            const titleScale = lerp(1, TITLE_CLOSE_SCALE, titleProgress)
            const isMobile = width < 640
            const endpointLeft = isMobile ? 24 : 35
            const endpointTop = isMobile ? 32 : 60

            overlay.current.style.setProperty(
                '--system-progress',
                progress.toFixed(4),
            )

            overlay.current.style.setProperty(
                '--title-left',
                `${lerp(width / 2, endpointLeft, titleProgress).toFixed(2)}px`,
            )

            overlay.current.style.setProperty(
                '--title-top',
                `${lerp(height / 2, endpointTop, titleProgress).toFixed(2)}px`,
            )

            overlay.current.style.setProperty(
                '--title-translate',
                `${(-50 * (1 - titleProgress)).toFixed(2)}%`,
            )

            overlay.current.style.setProperty(
                '--title-scale',
                titleScale.toFixed(4),
            )
        }

        update()

        window.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)

        return () => {
            window.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
        }
    }, [transitionViewports])

    return (
        <div
            ref={overlay}
            className="system-approach-overlay"
            aria-hidden="true"
        >
            <div className="system-nebula" />
            <div className="system-stars system-stars--near" />
            <div className="system-stars system-stars--far" />
            <div
                className="system-title"
                style={{
                    scale: 'var(--title-scale)',
                }}
            >
                Onyx Tech House
            </div>
        </div>
    )
}

export default SystemApproachOverlay
