import { useProgress } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'

function LoadingScreen() {
  const { active, progress } = useProgress()
  const hasStartedRef = useRef(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  useEffect(() => {
    if (initialLoadComplete) return

    if (active) {
      hasStartedRef.current = true
    } else if (hasStartedRef.current) {
      setInitialLoadComplete(true)
    }
  }, [active, initialLoadComplete])

  // drei's global loader becomes active for later LOD/model requests too.
  // The full-screen loader is only for the initial scene load.
  if (!active || initialLoadComplete) return null

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
