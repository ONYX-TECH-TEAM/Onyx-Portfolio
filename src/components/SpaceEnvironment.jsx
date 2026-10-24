import {
    useFrame,
} from '@react-three/fiber'
import {
    AdditiveBlending,
    BackSide,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    Line,
    LineBasicMaterial,
    Points,
    PointsMaterial,
    ShaderMaterial,
    Vector3,
} from 'three'
import {
    useEffect,
    useMemo,
    useRef,
} from 'react'

const FAR_STAR_COUNT = 90
const MID_STAR_COUNT = 90
const DUST_COUNT = 180

const FAR_STAR_SPREAD = [30, 18, 12]
const MID_STAR_SPREAD = [16, 10, 20]
const DUST_SPREAD = [12, 8, 14]

const NEBULA_STATE_ARRIVAL_PROGRESS = 0.7

const P04_NEBULA_FIELD_ROTATION = 2.286

/*
 * Project 04 is the only domain whose destination nebula
 * gets a minimum intensity override.
 *
 * All other project nebula intensities use their saved scene state.
 */
const PROJECT04_MIN_NEBULA_INTENSITY = 0.85

const DEFAULT_PRIMARY_COLOR =
    new Color(1.0, 0.23, 0.045)

const DEFAULT_SECONDARY_COLOR =
    new Color(0.045, 0.46, 0.16)

function setNebulaColor(
    color,
    value,
    fallback,
    cache,
    cacheKey,
) {
    const cachedValue = cache[cacheKey]

    if (
        cachedValue?.initialized &&
        cachedValue.value === value
    ) {
        return
    }

    cache[cacheKey] = {
        initialized: true,
        value,
    }

    const match =
        typeof value === 'string'
            ? /^#([0-9a-f]{6})$/i.exec(value)
            : null

    if (!match) {
        color.copy(fallback)
        return
    }

    const hex =
        Number.parseInt(match[1], 16)

    color.setRGB(
        ((hex >> 16) & 255) / 255,
        ((hex >> 8) & 255) / 255,
        (hex & 255) / 255,
    )
}

function createSeededRandom(seed) {
    let value = seed

    return () => {
        value =
            (value * 9301 + 49297) %
            233280

        return value / 233280
    }
}

function createPoints(
    count,
    spread,
    seed,
    zBias = 0,
) {
    const random =
        createSeededRandom(seed)

    const positions =
        new Float32Array(count * 3)

    for (
        let index = 0;
        index < count;
        index += 1
    ) {
        const offset = index * 3

        positions[offset] =
            (random() - 0.5) *
            spread[0]

        positions[offset + 1] =
            (random() - 0.5) *
            spread[1]

        positions[offset + 2] =
            zBias +
            (random() - 0.5) *
            spread[2]
    }

    const geometry =
        new BufferGeometry()

    geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
            positions,
            3,
        ),
    )

    return geometry
}

/* -------------------------------------------------------------------------- */
/*                       ROUND POINTS MATERIAL                                */
/* -------------------------------------------------------------------------- */

function createRoundPointsMaterial(
    parameters,
) {
    const material =
        new PointsMaterial(
            parameters,
        )

    material.onBeforeCompile =
        (shader) => {
            shader.fragmentShader =
                shader.fragmentShader.replace(
                    '#include <alphatest_fragment>',
                    `
                        float pointDistance =
                            distance(
                                gl_PointCoord,
                                vec2(0.5)
                            );

                        if (
                            pointDistance >
                            0.48
                        ) {
                            discard;
                        }

                        float pointSoftEdge =
                            1.0 -
                            smoothstep(
                                0.40,
                                0.48,
                                pointDistance
                            );

                        diffuseColor.a *=
                            pointSoftEdge;

                        #include <alphatest_fragment>
                    `,
                )
        }

    return material
}

/* -------------------------------------------------------------------------- */
/*                              NEBULA SHADER                                  */
/* -------------------------------------------------------------------------- */

const nebulaVertexShader = `
    varying vec3 vWorldPosition;

    void main() {
        vec4 worldPosition =
            modelMatrix *
            vec4(position, 1.0);

        vWorldPosition =
            worldPosition.xyz;

        gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
    }
`

const nebulaFragmentShader = `
    precision highp float;

    varying vec3 vWorldPosition;

    uniform float uTime;
    uniform float uOpacity;
    uniform float uSeed;
    uniform float uFieldRotationY;
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;

    /* ------------------------------------------------------------------------ */
    /* 3D NOISE                                                                 */
    /* ------------------------------------------------------------------------ */

    float hash31(vec3 p) {
        p = fract(p * 0.1031);

        p += dot(
            p,
            p.yzx + 33.33
        );

        return fract(
            (p.x + p.y) * p.z
        );
    }

    float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);

        f =
            f *
            f *
            (3.0 - 2.0 * f);

        float n000 =
            hash31(i);

        float n100 =
            hash31(
                i +
                vec3(
                    1.0,
                    0.0,
                    0.0
                )
            );

        float n010 =
            hash31(
                i +
                vec3(
                    0.0,
                    1.0,
                    0.0
                )
            );

        float n110 =
            hash31(
                i +
                vec3(
                    1.0,
                    1.0,
                    0.0
                )
            );

        float n001 =
            hash31(
                i +
                vec3(
                    0.0,
                    0.0,
                    1.0
                )
            );

        float n101 =
            hash31(
                i +
                vec3(
                    1.0,
                    0.0,
                    1.0
                )
            );

        float n011 =
            hash31(
                i +
                vec3(
                    0.0,
                    1.0,
                    1.0
                )
            );

        float n111 =
            hash31(
                i +
                vec3(
                    1.0,
                    1.0,
                    1.0
                )
            );

        float x00 =
            mix(
                n000,
                n100,
                f.x
            );

        float x10 =
            mix(
                n010,
                n110,
                f.x
            );

        float x01 =
            mix(
                n001,
                n101,
                f.x
            );

        float x11 =
            mix(
                n011,
                n111,
                f.x
            );

        float y0 =
            mix(
                x00,
                x10,
                f.y
            );

        float y1 =
            mix(
                x01,
                x11,
                f.y
            );

        return mix(
            y0,
            y1,
            f.z
        );
    }

    float fbm3D(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;

        for (
            int i = 0;
            i < 3;
            i++
        ) {
            value +=
                noise3D(p) *
                amplitude;

            p *= 2.0;
            amplitude *= 0.5;
        }

        return value;
    }

    /* ------------------------------------------------------------------------ */
    /* BOUNDED CONTINUOUS MOTION                                                */
    /* ------------------------------------------------------------------------ */

    vec3 boundedMotion(
        float time,
        vec3 speed,
        float amplitude
    ) {
        return vec3(
            sin(time * speed.x),
            sin(time * speed.y),
            sin(time * speed.z)
        ) * amplitude;
    }

    /* ------------------------------------------------------------------------ */
    /* CLOUD DENSITY                                                            */
    /* ------------------------------------------------------------------------ */

    float cloudDensity(vec3 p) {
        vec3 drift =
            boundedMotion(
                uTime,
                vec3(
                    0.004,
                    -0.002,
                    0.0015
                ),
                0.75
            );

        float warpX =
            fbm3D(
                p * 0.9 +
                drift +
                vec3(
                    uSeed,
                    0.0,
                    0.0
                )
            );

        float warpY =
            fbm3D(
                p * 0.9 -
                drift * 0.8 +
                vec3(
                    0.0,
                    uSeed,
                    0.0
                )
            );

        float warpZ =
            fbm3D(
                p * 0.9 +
                drift * 0.6 +
                vec3(
                    0.0,
                    0.0,
                    uSeed
                )
            );

        vec3 warped =
            p +
            (
                vec3(
                    warpX,
                    warpY,
                    warpZ
                ) - 0.5
            ) *
            0.85;

        float large =
            fbm3D(
                warped * 1.15 +
                drift
            );

        float medium =
            fbm3D(
                warped * 2.7 -
                drift * 1.3
            );

        float fine =
            fbm3D(
                warped * 6.0 +
                drift * 1.8
            );

        float density =
            large * 0.58 +
            medium * 0.30 +
            fine * 0.12;

        return smoothstep(
            0.34,
            0.68,
            density
        );
    }

    /* ------------------------------------------------------------------------ */
    /* MAIN                                                                     */
    /* ------------------------------------------------------------------------ */

    vec3 rotateY(vec3 p, float angle) {
        float c = cos(angle);
        float s = sin(angle);

        return vec3(
            c * p.x - s * p.z,
            p.y,
            s * p.x + c * p.z
        );
    }

    void main() {
        vec3 fieldPosition =
            rotateY(
                vWorldPosition,
                -uFieldRotationY
            );

        vec3 direction =
            normalize(
                fieldPosition
            );

        vec3 noisePosition =
            fieldPosition * 0.055;

        float density =
            cloudDensity(
                noisePosition
            );

        /* ---------------------------------------------------------------------- */
        /* ORANGE REGION                                                           */
        /* ---------------------------------------------------------------------- */

        vec3 orangeDirection =
            normalize(
                vec3(
                    -0.80,
                    0.16,
                    0.34
                )
            );

        float orangeAngular =
            max(
                dot(
                    direction,
                    orangeDirection
                ),
                0.0
            );

        float orangeRegion =
            pow(
                orangeAngular,
                2.1
            );

        vec3 rearDirection =
            normalize(
                vec3(
                    0.78,
                    -0.10,
                    -0.34
                )
            );

        float orangeRearAngular =
            max(
                dot(
                    direction,
                    rearDirection
                ),
                0.0
            );

        float orangeRearRegion =
            pow(
                orangeRearAngular,
                2.6
            );

        float orangeNoise =
            fbm3D(
                noisePosition * 2.2 +
                boundedMotion(
                    uTime,
                    vec3(
                        0.003,
                        -0.002,
                        0.0
                    ),
                    0.65
                ) +
                vec3(
                    0.0,
                    0.0,
                    0.001
                )
            );

        orangeNoise =
            smoothstep(
                0.28,
                0.68,
                orangeNoise
            );

        float orangeDensity =
            density *
            (
                orangeRegion +
                orangeRearRegion * 2.5
            ) *
            orangeNoise *
            1.25;

        /* ---------------------------------------------------------------------- */
        /* GREEN REGION                                                            */
        /* ---------------------------------------------------------------------- */

        vec3 greenDirection =
            normalize(
                vec3(
                    0.78,
                    -0.10,
                    -0.34
                )
            );

        float greenAngular =
            max(
                dot(
                    direction,
                    greenDirection
                ),
                0.0
            );

        float greenRegion =
            pow(
                greenAngular,
                4.2
            );

        float greenNoise =
            fbm3D(
                noisePosition * 2.0 -
                boundedMotion(
                    uTime,
                    vec3(
                        0.002,
                        0.003,
                        -0.001
                    ),
                    0.65
                )
            );

        greenNoise =
            smoothstep(
                0.29,
                0.69,
                greenNoise
            );

        float greenDensity =
            density *
            greenRegion *
            greenNoise *
            1.2;

        /* ---------------------------------------------------------------------- */
        /* GENERAL ATMOSPHERE                                                     */
        /* ---------------------------------------------------------------------- */

        float broadAtmosphere =
            fbm3D(
                noisePosition * 0.72 +
                boundedMotion(
                    uTime,
                    vec3(
                        -0.0015,
                        0.0008,
                        0.0
                    ),
                    0.45
                )
            );

        broadAtmosphere =
            smoothstep(
                0.38,
                0.66,
                broadAtmosphere
            );

        float atmosphere =
            broadAtmosphere *
            0.44;

        /* ---------------------------------------------------------------------- */
        /* FILAMENTS                                                               */
        /* ---------------------------------------------------------------------- */

        float filamentNoise =
            fbm3D(
                noisePosition * 5.5 -
                boundedMotion(
                    uTime,
                    vec3(
                        0.003,
                        -0.002,
                        0.001
                    ),
                    0.65
                )
            );

        float filaments =
            smoothstep(
                0.53,
                0.78,
                filamentNoise
            );

        filaments *=
            (
                orangeDensity +
                greenDensity
            ) *
            0.24;

        /* ---------------------------------------------------------------------- */
        /* HERO PROTECTION                                                         */
        /* ---------------------------------------------------------------------- */

        float heroProtection =
            smoothstep(
                0.78,
                0.16,
                length(
                    direction.xz
                )
            );

        float heroFade =
            mix(
                1.0,
                0.52,
                heroProtection
            );

        /* ---------------------------------------------------------------------- */
        /* COLORS                                                                  */
        /* ---------------------------------------------------------------------- */

        vec3 orange =
            uPrimaryColor;

        vec3 orangeDeep =
            vec3(
                0.30,
                0.045,
                0.012
            );

        vec3 green =
            uSecondaryColor;

        vec3 greenDeep =
            vec3(
                0.008,
                0.075,
                0.024
            );

        vec3 atmosphericWarm =
            vec3(
                0.18,
                0.055,
                0.018
            );

        vec3 atmosphericCool =
            vec3(
                0.014,
                0.11,
                0.040
            );

        vec3 color =
            vec3(0.0);

        color +=
            mix(
                orangeDeep,
                orange,
                orangeNoise
            ) *
            orangeDensity *
            1.05;

        color +=
            mix(
                greenDeep,
                green,
                greenNoise
            ) *
            greenDensity *
            0.96;

        color +=
            atmosphericWarm *
            atmosphere;

        color +=
            atmosphericCool *
            atmosphere;

        color +=
            vec3(
                0.82,
                0.30,
                0.08
            ) *
            filaments;

        /* ---------------------------------------------------------------------- */
        /* ALPHA                                                                   */
        /* ---------------------------------------------------------------------- */

        float alpha =
            orangeDensity * 0.88 +
            greenDensity * 0.42 +
            atmosphere * 0.17 +
            filaments * 0.28;

        alpha *=
            heroFade;

        alpha *=
            uOpacity;

        alpha =
            clamp(
                alpha,
                0.0,
                0.86
            );

        color *=
            0.92;

        gl_FragColor =
            vec4(
                color,
                alpha
            );
    }
`

function createNebulaMaterial(
    seed = 0,
    opacity = 1,
) {
    return new ShaderMaterial({
        vertexShader:
            nebulaVertexShader,

        fragmentShader:
            nebulaFragmentShader,

        uniforms: {
            uFieldRotationY: {
                value: 0,
            },

            uTime: {
                value: 0,
            },

            uOpacity: {
                value: opacity,
            },

            uSeed: {
                value: seed,
            },

            uPrimaryColor: {
                value: new Color(
                    1.0,
                    0.23,
                    0.045,
                ),
            },

            uSecondaryColor: {
                value: new Color(
                    0.045,
                    0.46,
                    0.16,
                ),
            },
        },

        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: AdditiveBlending,
        side: BackSide,
        toneMapped: false,
    })
}

/* -------------------------------------------------------------------------- */
/*                           SHOOTING STARS                                   */
/* -------------------------------------------------------------------------- */

function randomRange(
    minimum,
    maximum,
) {
    return (
        minimum +
        Math.random() *
        (maximum - minimum)
    )
}

function randomShootingStar(
    camera = null,
) {
    const start =
        new Vector3()

    const target =
        new Vector3()

    const corner =
        Math.floor(
            Math.random() * 4,
        )

    const xRange = 10
    const yRange = 7
    const cornerMargin = 1.2

    if (camera) {
        const startLocal =
            new Vector3()

        const targetLocal =
            new Vector3()

        const backgroundX = 8.2
        const backgroundY = 5.4
        const backgroundStartZ = -8.0
        const backgroundTargetZ = -6.5

        if (corner === 0) {
            startLocal.set(
                -backgroundX,
                backgroundY,
                backgroundStartZ,
            )
        } else if (corner === 1) {
            startLocal.set(
                backgroundX,
                backgroundY,
                backgroundStartZ,
            )
        } else if (corner === 2) {
            startLocal.set(
                backgroundX,
                -backgroundY,
                backgroundStartZ,
            )
        } else {
            startLocal.set(
                -backgroundX,
                -backgroundY,
                backgroundStartZ,
            )
        }

        targetLocal.set(
            randomRange(-1.8, 1.8),
            randomRange(-1.3, 1.3),
            backgroundTargetZ,
        )

        start.copy(
            camera.localToWorld(
                startLocal,
            ),
        )

        target.copy(
            camera.localToWorld(
                targetLocal,
            ),
        )
    } else {
        const startZ =
            randomRange(
                -12,
                -9,
            )

        const targetZ =
            startZ +
            randomRange(
                -1.5,
                1.5,
            )

        if (corner === 0) {
            start.set(
                -xRange -
                cornerMargin,
                yRange +
                cornerMargin,
                startZ,
            )
        } else if (corner === 1) {
            start.set(
                xRange +
                cornerMargin,
                yRange +
                cornerMargin,
                startZ,
            )
        } else if (corner === 2) {
            start.set(
                xRange +
                cornerMargin,
                -yRange -
                cornerMargin,
                startZ,
            )
        } else {
            start.set(
                -xRange -
                cornerMargin,
                -yRange -
                cornerMargin,
                startZ,
            )
        }

        target.set(
            randomRange(
                -2.2,
                2.2,
            ),
            randomRange(
                -1.6,
                1.6,
            ),
            targetZ,
        )
    }

    const direction =
        target
            .sub(start)
            .normalize()

    const duration =
        randomRange(
            1.7,
            2.1,
        )

    const speed =
        randomRange(
            4.0,
            5.0,
        )

    const trailLength =
        randomRange(
            0.62,
            0.88,
        )

    const brightness =
        randomRange(
            0.14,
            0.30,
        )

    const headBrightness =
        randomRange(
            0.28,
            0.52,
        )

    const lineGeometry =
        new BufferGeometry()

    lineGeometry.setAttribute(
        'position',
        new Float32BufferAttribute(
            new Float32Array(6),
            3,
        ),
    )

    const lineMaterial =
        new LineBasicMaterial({
            color: '#f2eee6',
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: true,
            blending: AdditiveBlending,
        })

    const line =
        new Line(
            lineGeometry,
            lineMaterial,
        )

    line.frustumCulled = false
    line.renderOrder = 0

    const headGeometry =
        new BufferGeometry()

    headGeometry.setAttribute(
        'position',
        new Float32BufferAttribute(
            new Float32Array(3),
            3,
        ),
    )

    const headSize =
        randomRange(
            0.03,
            0.045,
        )

    const headMaterial =
        new PointsMaterial({
            color: '#fff8ec',
            size: headSize,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: true,
            blending: AdditiveBlending,
            sizeAttenuation: true,
        })

    const head =
        new Points(
            headGeometry,
            headMaterial,
        )

    head.frustumCulled = false
    head.renderOrder = 1

    return {
        line,
        head,
        start,
        direction,
        duration,
        speed,
        trailLength,
        brightness,
        headBrightness,
        headSize,
        headPosition:
            new Vector3(),
        tailPosition:
            new Vector3(),
    }
}

function ShootingStars() {
    const star =
        useMemo(
            () =>
                randomShootingStar(),
            [],
        )

    const active =
        useRef(false)

    const spawnTime =
        useRef(0)

    useEffect(() => {
        return () => {
            star.line.geometry.dispose()
            star.line.material.dispose()
            star.head.geometry.dispose()
            star.head.material.dispose()
        }
    }, [star])

    const spawn = (
        elapsed,
        camera,
    ) => {
        const next =
            randomShootingStar(
                camera,
            )

        star.start.copy(
            next.start,
        )

        star.direction.copy(
            next.direction,
        )

        star.duration =
            next.duration

        star.speed =
            next.speed

        star.trailLength =
            next.trailLength

        star.brightness =
            next.brightness

        star.headBrightness =
            next.headBrightness

        star.head.material.size =
            next.headSize

        star.headPosition.set(
            0,
            0,
            0,
        )

        star.tailPosition.set(
            0,
            0,
            0,
        )

        star.line.material.opacity =
            0

        star.head.material.opacity =
            0

        next.line.geometry.dispose()
        next.line.material.dispose()
        next.head.geometry.dispose()
        next.head.material.dispose()

        spawnTime.current =
            elapsed

        active.current =
            true
    }

    useFrame((state) => {
        const elapsed =
            state.clock.elapsedTime

        if (!active.current) {
            if (
                elapsed >=
                spawnTime.current
            ) {
                spawn(
                    elapsed,
                    state.camera,
                )
            }

            return
        }

        const localTime =
            elapsed -
            spawnTime.current

        if (
            localTime >=
            star.duration
        ) {
            star.line.material.opacity =
                0

            star.head.material.opacity =
                0

            active.current =
                false

            spawnTime.current =
                elapsed +
                randomRange(
                    4.0,
                    8.0,
                )

            return
        }

        const fadeIn =
            Math.min(
                localTime / 0.12,
                1,
            )

        const fadeOut =
            Math.min(
                (
                    star.duration -
                    localTime
                ) / 0.55,
                1,
            )

        const fade =
            fadeIn *
            fadeOut

        const travelDistance =
            star.speed *
            localTime

        star.headPosition
            .copy(star.start)
            .addScaledVector(
                star.direction,
                travelDistance,
            )

        star.tailPosition
            .copy(
                star.headPosition,
            )
            .addScaledVector(
                star.direction,
                -star.trailLength,
            )

        const positionAttribute =
            star.line.geometry.getAttribute(
                'position',
            )

        positionAttribute.setXYZ(
            0,
            star.headPosition.x,
            star.headPosition.y,
            star.headPosition.z,
        )

        positionAttribute.setXYZ(
            1,
            star.tailPosition.x,
            star.tailPosition.y,
            star.tailPosition.z,
        )

        positionAttribute.needsUpdate =
            true

        star.head.position.copy(
            star.headPosition,
        )

        star.line.material.opacity =
            star.brightness *
            fade

        star.head.material.opacity =
            star.headBrightness *
            fade
    })

    return (
        <>
            <primitive
                object={star.line}
            />

            <primitive
                object={star.head}
            />
        </>
    )
}

/* -------------------------------------------------------------------------- */
/*                           SPACE ENVIRONMENT                                 */
/* -------------------------------------------------------------------------- */

function SpaceEnvironment({
    scrollProgress,
    projectLocalProgress,
    projectIndex,
    sceneStates,
    previewState,
}) {
    const environmentRef =
        useRef(null)

    const farRef =
        useRef(null)

    const midRef =
        useRef(null)

    const dustRef =
        useRef(null)

    const nebulaBackRef =
        useRef(null)

    const nebulaFrontRef =
        useRef(null)

    const primaryColor =
        useRef(
            new Color(),
        )

    const secondaryColor =
        useRef(
            new Color(),
        )

    const colorInputCache =
        useRef({})

    const startPrimaryColor =
        useRef(
            DEFAULT_PRIMARY_COLOR.clone(),
        )

    const endPrimaryColor =
        useRef(
            DEFAULT_PRIMARY_COLOR.clone(),
        )

    const startSecondaryColor =
        useRef(
            DEFAULT_SECONDARY_COLOR.clone(),
        )

    const endSecondaryColor =
        useRef(
            DEFAULT_SECONDARY_COLOR.clone(),
        )

    const farGeometry =
        useMemo(
            () =>
                createPoints(
                    FAR_STAR_COUNT,
                    FAR_STAR_SPREAD,
                    17,
                    -20,
                ),
            [],
        )

    const midGeometry =
        useMemo(
            () =>
                createPoints(
                    MID_STAR_COUNT,
                    MID_STAR_SPREAD,
                    41,
                    -4,
                ),
            [],
        )

    const dustGeometry =
        useMemo(
            () =>
                createPoints(
                    DUST_COUNT,
                    DUST_SPREAD,
                    73,
                    -1,
                ),
            [],
        )

    const farMaterial =
        useMemo(
            () =>
                createRoundPointsMaterial({
                    color: '#eee9df',
                    size: 0.04,
                    transparent: true,
                    opacity: 0.42,
                    depthWrite: false,
                    blending: AdditiveBlending,
                    sizeAttenuation: true,
                }),
            [],
        )

    const midMaterial =
        useMemo(
            () =>
                createRoundPointsMaterial({
                    color: '#faf6ed',
                    size: 0.055,
                    transparent: true,
                    opacity: 0.54, 
                    depthWrite: false,
                    blending: AdditiveBlending,
                    sizeAttenuation: true,
                }),
            [],
        )

    const dustMaterial =
        useMemo(
            () =>
                createRoundPointsMaterial({
                    color: '#b9b2a4',
                    size: 0.025,
                    transparent: true,
                    opacity: 0.16,
                    depthWrite: false,
                    blending: AdditiveBlending,
                    sizeAttenuation: true,
                }),
            [],
        )

    /* ------------------------------------------------------------------------ */
    /* 3D NEBULA MATERIALS                                                      */
    /* ------------------------------------------------------------------------ */

    const nebulaBackMaterial =
        useMemo(
            () =>
                createNebulaMaterial(
                    4.17,
                    0,
                ),
            [],
        )

    const nebulaFrontMaterial =
        useMemo(
            () =>
                createNebulaMaterial(
                    9.73,
                    0,
                ),
            [],
        )

    useFrame((state, delta) => {
        if (
            !environmentRef.current
        ) {
            return
        }

        const progress =
            Math.max(
                0,
                Math.min(
                    scrollProgress.current,
                    1,
                ),
            )

        const projectProgress =
            Math.max(
                0,
                Math.min(
                    projectLocalProgress?.current ?? 0,
                    1,
                ),
            )

        /* ---------------------------------------------------------------------- */
        /* ACTIVE PROJECT                                                         */
        /* ---------------------------------------------------------------------- */

        const activeProjectIndex =
            projectIndex?.current ??
            projectIndex ??
            -1

        let projectTimeline =
            activeProjectIndex >= 0
                ? activeProjectIndex + projectProgress
                : 0

        if (previewState) {
            const previewProjectNumber =
                Number(
                    previewState.match(/project(\d+)/i)?.[1],
                )

            projectTimeline =
                Number.isFinite(previewProjectNumber)
                    ? previewProjectNumber
                    : 0
        }

        const getNebulaFieldRotation = (timeline) => {
            if (timeline <= 3) {
                return 0
            }

            if (timeline >= 4) {
                return P04_NEBULA_FIELD_ROTATION
            }

            const amount = timeline - 3

            return amount * P04_NEBULA_FIELD_ROTATION
        }

        const nebulaFieldRotation =
            getNebulaFieldRotation(projectTimeline)

        nebulaBackMaterial.uniforms
            .uFieldRotationY.value =
            nebulaFieldRotation

        nebulaFrontMaterial.uniforms
            .uFieldRotationY.value =
            nebulaFieldRotation

        let startNebula =
            sceneStates.close.nebula

        let endNebula =
            startNebula

        let nebulaProgress = 0

        if (
            previewState &&
            sceneStates?.[
                previewState
            ]?.nebula
        ) {
            startNebula =
                sceneStates[
                    previewState
                ].nebula

            endNebula =
                startNebula

            nebulaProgress = 1
        } else if (
            activeProjectIndex >= 0 &&
            activeProjectIndex <= 4
        ) {
            const fromKey =
                activeProjectIndex === 0
                    ? 'close'
                    : `project${String(
                        activeProjectIndex,
                    ).padStart(2, '0')}`

            const toKey =
                `project${String(
                    activeProjectIndex + 1,
                ).padStart(2, '0')}`

            startNebula =
                sceneStates?.[
                    fromKey
                ]?.nebula ??
                sceneStates.close.nebula

            endNebula =
                sceneStates?.[
                    toKey
                ]?.nebula ??
                startNebula

            /*
             * Keep nebula arrival synchronized with the camera/shard
             * arrival point. The nebula reaches its destination by
             * 70% of the segment, but uses smoothstep easing so it
             * settles naturally instead of visibly snapping.
             */
            const nebulaArrivalProgress =
                Math.min(
                    projectProgress /
                    NEBULA_STATE_ARRIVAL_PROGRESS,
                    1,
                )

            nebulaProgress =
                nebulaArrivalProgress *
                nebulaArrivalProgress *
                (3 -
                    2 *
                    nebulaArrivalProgress)

            /*
             * Project 04 only:
             * preserve all existing saved intensity values, but never
             * let the Crimson destination become too weak at the hold.
             */
            if (
                toKey === 'project04' &&
                endNebula
            ) {
                endNebula = {
                    ...endNebula,
                    intensity: Math.max(
                        Number.isFinite(
                            Number(
                                endNebula.intensity,
                            ),
                        )
                            ? Number(
                                endNebula.intensity,
                            )
                            : 1,
                        PROJECT04_MIN_NEBULA_INTENSITY,
                    ),
                }
            }
        } else {
            startNebula =
                sceneStates.close.nebula

            endNebula =
                startNebula

            nebulaProgress = 0
        }

        const nebulaPositionX =
            startNebula.position[0] +
            (
                endNebula.position[0] -
                startNebula.position[0]
            ) *
            nebulaProgress

        const nebulaPositionY =
            startNebula.position[1] +
            (
                endNebula.position[1] -
                startNebula.position[1]
            ) *
            nebulaProgress

        const nebulaPositionZ =
            startNebula.position[2] +
            (
                endNebula.position[2] -
                startNebula.position[2]
            ) *
            nebulaProgress

        const nebulaRotationX =
            startNebula.rotation[0] +
            (
                endNebula.rotation[0] -
                startNebula.rotation[0]
            ) *
            nebulaProgress

        const nebulaRotationY =
            startNebula.rotation[1] +
            (
                endNebula.rotation[1] -
                startNebula.rotation[1]
            ) *
            nebulaProgress

        const nebulaRotationZ =
            startNebula.rotation[2] +
            (
                endNebula.rotation[2] -
                startNebula.rotation[2]
            ) *
            nebulaProgress

        const startIntensity =
            Number.isFinite(
                Number(
                    startNebula?.intensity,
                ),
            )
                ? Number(
                    startNebula.intensity,
                )
                : 1

        const endIntensity =
            Number.isFinite(
                Number(
                    endNebula?.intensity,
                ),
            )
                ? Number(
                    endNebula.intensity,
                )
                : 1

        const nebulaIntensity =
            startIntensity +
            (
                endIntensity -
                startIntensity
            ) *
            nebulaProgress

        setNebulaColor(
            startPrimaryColor.current,
            startNebula.primaryColor,
            DEFAULT_PRIMARY_COLOR,
            colorInputCache.current,
            'startPrimary',
        )

        setNebulaColor(
            endPrimaryColor.current,
            endNebula.primaryColor,
            DEFAULT_PRIMARY_COLOR,
            colorInputCache.current,
            'endPrimary',
        )

        primaryColor.current.lerpColors(
            startPrimaryColor.current,
            endPrimaryColor.current,
            nebulaProgress,
        )

        setNebulaColor(
            startSecondaryColor.current,
            startNebula.secondaryColor,
            DEFAULT_SECONDARY_COLOR,
            colorInputCache.current,
            'startSecondary',
        )

        setNebulaColor(
            endSecondaryColor.current,
            endNebula.secondaryColor,
            DEFAULT_SECONDARY_COLOR,
            colorInputCache.current,
            'endSecondary',
        )

        secondaryColor.current.lerpColors(
            startSecondaryColor.current,
            endSecondaryColor.current,
            nebulaProgress,
        )

        const pointerX =
            state.pointer.x

        const pointerY =
            state.pointer.y

        /* ---------------------------------------------------------------------- */
        /* STAR / DUST PARALLAX                                                   */
        /* ---------------------------------------------------------------------- */

        if (farRef.current) {
            farRef.current.position.x = 0
            farRef.current.position.y = 0
        }

        if (midRef.current) {
            midRef.current.position.x = 0
            midRef.current.position.y = 0
        }

        if (dustRef.current) {
            const targetY =
                pointerY * 0.016

            const targetX =
                pointerX * 0.032 +
                progress * 0.012

            dustRef.current.rotation.y +=
                (
                    targetX -
                    dustRef.current.rotation.y
                ) *
                0.05

            dustRef.current.rotation.x +=
                (
                    targetY -
                    dustRef.current.rotation.x
                ) *
                0.05
        }

        /* ---------------------------------------------------------------------- */
        /* 3D NEBULA MOTION                                                       */
        /* ---------------------------------------------------------------------- */

        const elapsedTime =
            state.clock.elapsedTime

        if (
            nebulaBackRef.current
        ) {
            nebulaBackRef.current.position.set(
                nebulaPositionX,
                nebulaPositionY,
                nebulaPositionZ,
            )

            nebulaBackRef.current.rotation.x =
                nebulaRotationX +
                Math.sin(
                    elapsedTime * 0.0007,
                ) *
                0.015

            nebulaBackRef.current.rotation.y =
                nebulaRotationY +
                elapsedTime * 0.0012

            nebulaBackRef.current.rotation.z =
                nebulaRotationZ
        }

        if (
            nebulaFrontRef.current
        ) {
            nebulaFrontRef.current.position.set(
                nebulaPositionX,
                nebulaPositionY,
                nebulaPositionZ,
            )

            nebulaFrontRef.current.rotation.x =
                nebulaRotationX

            nebulaFrontRef.current.rotation.y =
                nebulaRotationY -
                elapsedTime * 0.0018

            nebulaFrontRef.current.rotation.z =
                nebulaRotationZ +
                Math.sin(
                    elapsedTime * 0.0005,
                ) *
                0.012
        }

        /* ---------------------------------------------------------------------- */
        /* ENVIRONMENT REVEAL                                                     */
        /* ---------------------------------------------------------------------- */

        farMaterial.opacity =
            0.32

        midMaterial.opacity =
            0.42

        dustMaterial.opacity =
            0.16 +
            progress * 0.14

        /* ---------------------------------------------------------------------- */
        /* NEBULA REVEAL                                                          */
        /* ---------------------------------------------------------------------- */

        const nebulaScroll =
            Math.max(
                0,
                Math.min(
                    progress / 0.24,
                    1,
                ),
            )

        const nebulaReveal =
            nebulaScroll *
            nebulaScroll *
            (3 -
                2 *
                nebulaScroll)

        nebulaBackMaterial.uniforms
            .uTime.value =
            elapsedTime

        nebulaFrontMaterial.uniforms
            .uTime.value =
            elapsedTime

        nebulaBackMaterial.uniforms
            .uPrimaryColor.value.copy(
                primaryColor.current,
            )

        nebulaFrontMaterial.uniforms
            .uPrimaryColor.value.copy(
                primaryColor.current,
            )

        nebulaBackMaterial.uniforms
            .uSecondaryColor.value.copy(
                secondaryColor.current,
            )

        nebulaFrontMaterial.uniforms
            .uSecondaryColor.value.copy(
                secondaryColor.current,
            )

        nebulaBackMaterial.uniforms
            .uOpacity.value =
            0.68 *
            nebulaReveal *
            nebulaIntensity

        nebulaFrontMaterial.uniforms
            .uOpacity.value =
            0.36 *
            nebulaReveal *
            nebulaIntensity

        /* ---------------------------------------------------------------------- */
        /* SAFE NEBULA VISIBILITY OPTIMIZATION                                    */
        /* ---------------------------------------------------------------------- */

        const nebulaVisible =
            nebulaReveal *
            Math.max(
                nebulaIntensity,
                0,
            ) >
            0.005

        if (
            nebulaBackRef.current &&
            nebulaBackRef.current.visible !==
            nebulaVisible
        ) {
            nebulaBackRef.current.visible =
                nebulaVisible
        }

        if (
            nebulaFrontRef.current &&
            nebulaFrontRef.current.visible !==
            nebulaVisible
        ) {
            nebulaFrontRef.current.visible =
                nebulaVisible
        }
    })

    return (
        <group
            ref={environmentRef}
        >
            {/* FAR STARS */}
            <points
                ref={farRef}
                geometry={farGeometry}
                material={farMaterial}
            />

            {/* MID STARS */}
            <points
                ref={midRef}
                geometry={midGeometry}
                material={midMaterial}
            />

            {/* DUST */}
            <points
                ref={dustRef}
                geometry={dustGeometry}
                material={dustMaterial}
            />

            <ShootingStars />

            {/* OUTER ATMOSPHERIC SHELL */}
            <mesh
                ref={nebulaBackRef}
                visible={false}
                position={[0, 0, 0]}
                renderOrder={-20}
            >
                <sphereGeometry
                    args={[
                        42,
                        40,
                        24,
                    ]}
                />

                <primitive
                    object={
                        nebulaBackMaterial
                    }
                    attach="material"
                />
            </mesh>

            {/* INNER ATMOSPHERIC SHELL */}
            <mesh
                ref={nebulaFrontRef}
                visible={false}
                position={[0, 0, 0]}
                renderOrder={-19}
            >
                <sphereGeometry
                    args={[
                        27,
                        40,
                        24,
                    ]}
                />

                <primitive
                    object={
                        nebulaFrontMaterial
                    }
                    attach="material"
                />
            </mesh>
        </group>
    )
}

export default SpaceEnvironment



