import { useFrame } from '@react-three/fiber'
import { Color, MathUtils } from 'three'
import { useRef } from 'react'

const LIGHT_COLOR = new Color('#ffd6a0')

export default function ProjectSelectionLight({
  selectionStrength = 0,
  position = [0, -0.55, 0],
}) {
  const lightRef = useRef(null)

  useFrame((_, delta) => {
    if (!lightRef.current) return

    const targetIntensity =
      selectionStrength * 3.2

    const targetDistance =
      1.8 +
      selectionStrength * 2.2

    lightRef.current.intensity =
      MathUtils.damp(
        lightRef.current.intensity,
        targetIntensity,
        6,
        delta,
      )

    lightRef.current.distance =
      MathUtils.damp(
        lightRef.current.distance,
        targetDistance,
        5,
        delta,
      )
  })

  return (
    <pointLight
      ref={lightRef}
      position={position}
      color={LIGHT_COLOR}
      intensity={0}
      distance={1.8}
      decay={2}
    />
  )
}