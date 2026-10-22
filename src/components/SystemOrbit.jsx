import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

import {
    BufferGeometry,
    Float32BufferAttribute,
    Line,
    LineBasicMaterial,
    MathUtils,
} from 'three'

const ORBIT_SEGMENTS = 96
const ORBIT_RADIUS_X = 3.35
const ORBIT_RADIUS_Z = 1.05

function smoothStep(value) {
    return value * value * (3 - 2 * value)
}

function SystemOrbit({
    scrollProgress,
    caseFileTransitionRef,
}) {
    const orbitRef = useRef(null)

    const orbit = useMemo(() => {
        const positions = []

        for (
            let index = 0;
            index <= ORBIT_SEGMENTS;
            index += 1
        ) {
            const angle =
                (index / ORBIT_SEGMENTS) *
                Math.PI *
                2

            positions.push(
                Math.cos(angle) * ORBIT_RADIUS_X,
                0,
                Math.sin(angle) * ORBIT_RADIUS_Z,
            )
        }

        const geometry = new BufferGeometry()

        geometry.setAttribute(
            'position',
            new Float32BufferAttribute(
                positions,
                3,
            ),
        )

        const lineMaterial = new LineBasicMaterial({
            color: '#5e5c59',
            transparent: true,
            opacity: 0,
            depthWrite: false,
        })

        const line = new Line(
            geometry,
            lineMaterial,
        )

        line.renderOrder = -1

        return line
    }, [])

    useFrame(() => {
        if (!orbitRef.current) {
            return
        }

        // Preserve the existing scroll-driven ring opacity.
        const baseOpacity =
            smoothStep(
                scrollProgress.current,
            ) * 0.42

        const transition =
            caseFileTransitionRef?.current

        const isCaseFileTransition =
            transition?.transitionPhase === 'entering' ||
            transition?.transitionPhase === 'exiting'

        const progress = MathUtils.clamp(
            transition?.transitionProgress ?? 0,
            0,
            1,
        )

        // Fade the ring early during entry.
        // Reverse the fade as the camera returns.
        const fadeProgress = isCaseFileTransition
            ? smoothStep(
                MathUtils.clamp(
                    (progress - 0.05) / 0.3,
                    0,
                    1,
                ),
            )
            : 0

        orbitRef.current.material.opacity =
            baseOpacity * (1 - fadeProgress)
    })

    return (
        <primitive
            ref={orbitRef}
            object={orbit}
        />
    )
}

export default SystemOrbit