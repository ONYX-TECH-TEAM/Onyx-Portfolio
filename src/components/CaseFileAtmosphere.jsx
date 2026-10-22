import Grainient from './Grainient.jsx'

const CASE_FILE_PALETTES = {
    'ai-solutions': [
        '#0B090B',
        '#21110C',
        '#7C2D12',
        '#F47A32',
        '#FED7AA',
    ],

    'product-development': [
        '#0B0812',
        '#1D102C',
        '#6336A5',
        '#C084FF',
        '#E9D5FF',
    ],

    'ui-ux-design': [
        '#06110D',
        '#0B2820',
        '#047857',
        '#10B981',
        '#A7F3D0',
    ],

    'social-media-marketing': [
        '#12070B',
        '#2A0B14',
        '#881337',
        '#E11D48',
        '#FDA4AF',
    ],

    'branding-logo-design': [
        '#070D16',
        '#0B1E36',
        '#1D4ED8',
        '#60A5FA',
        '#BFDBFE',
    ],
}

function CaseFileAtmosphere({
    domainSlug,
    visible = true,
}) {
    const colors =
        CASE_FILE_PALETTES[domainSlug] ??
        CASE_FILE_PALETTES['ai-solutions']

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                opacity: visible ? 0.88 : 0,
                transition:
                    'opacity 850ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
        >
            <Grainient
                colors={colors}
                type="linear"
                angle={55}
                speed={0.12}
                flow={0.2}
                scale={1.05}
                softness={0.8}
                silk={0.18}
                grainAmount={0.025}
                grainAnimated={false}
                interactive={false}
                stir={0}
                clickSwirl={false}
                intro
                contrast={1.05}
                saturation={0.9}
                dpr={1}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `
                        linear-gradient(
                            90deg,
                            rgba(5, 5, 8, 0.58),
                            rgba(5, 5, 8, 0.12) 55%,
                            rgba(5, 5, 8, 0.42)
                        ),
                        linear-gradient(
                            0deg,
                            rgba(5, 5, 8, 0.45),
                            transparent 50%
                        )
                    `,
                    pointerEvents: 'none',
                }}
            />
        </div>
    )
}

export default CaseFileAtmosphere