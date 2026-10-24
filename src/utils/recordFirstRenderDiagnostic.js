export function recordFirstRenderDiagnostic(...args) {
    if (!import.meta.env.DEV) return

    void import('./webglWarmupDiagnostics.js').then(
        ({ beginFirstRenderDiagnostic }) => {
            beginFirstRenderDiagnostic(...args)
        },
    )
}
