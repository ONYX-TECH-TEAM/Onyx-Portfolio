import { useProgress } from '@react-three/drei'

function LoadingScreen() {
  const { active, progress } = useProgress()

  if (!active) return null

  return (
    <div
      className="loading-screen"
      role="status"
      aria-live="polite"
    >
      Loading onyx {Math.round(progress)}%
    </div>
  )
}

export default LoadingScreen