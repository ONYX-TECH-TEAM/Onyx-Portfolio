const DEFAULT_PROJECT_COUNT = 5

export const PROJECT_HOLD_PROGRESS = 0.995

function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum,
    )
}

export function getSceneHoldScrollY(
    state,
    {
        viewportHeight,
        scrollHeight,
        transitionViewports = 1,
        projectStepViewports = 1,
        projectCount = DEFAULT_PROJECT_COUNT,
        domainCount = DEFAULT_PROJECT_COUNT,
    },
) {
    const safeProjectCount = Math.max(
        Math.floor(projectCount),
        1,
    )
    const finalProjectPosition = Math.min(
        safeProjectCount,
        domainCount,
    )
    const introDistance =
        viewportHeight * transitionViewports
    const maxScrollY = Math.max(
        scrollHeight - viewportHeight,
        0,
    )

    if (state === 'close') {
        return clamp(
            introDistance,
            0,
            maxScrollY,
        )
    }

    const projectNumber = Number(
        state?.replace('project', ''),
    )
    const projectIndex = projectNumber - 1

    if (
        !Number.isInteger(projectNumber) ||
        projectIndex < 0 ||
        projectIndex >= finalProjectPosition
    ) {
        return clamp(
            introDistance - 1,
            0,
            maxScrollY,
        )
    }

    const projectPosition =
        projectIndex === finalProjectPosition - 1
            ? finalProjectPosition
            : projectIndex + PROJECT_HOLD_PROGRESS

    return clamp(
        introDistance +
            projectPosition *
                viewportHeight *
                projectStepViewports,
        0,
        maxScrollY,
    )
}

export function getSceneHoldProgress(
    state,
    options,
) {
    const viewportHeight = Math.max(
        options.viewportHeight,
        1,
    )
    const safeProjectCount = Math.max(
        Math.floor(options.projectCount ?? DEFAULT_PROJECT_COUNT),
        1,
    )
    const introDistance =
        viewportHeight *
        (options.transitionViewports ?? 1)
    const projectStepDistance =
        viewportHeight *
        (options.projectStepViewports ?? 1)
    const scrollY = getSceneHoldScrollY(
        state,
        {
            ...options,
            viewportHeight,
            projectCount: safeProjectCount,
        },
    )
    const projectProgress = clamp(
        (scrollY - introDistance) /
            Math.max(
                projectStepDistance * safeProjectCount,
                1,
            ),
        0,
        1,
    )
    const projectTimelineProgress =
        projectProgress * safeProjectCount
    const projectIndex = Math.min(
        Math.floor(projectTimelineProgress),
        safeProjectCount - 1,
    )

    return {
        scrollProgress: clamp(
            scrollY / Math.max(introDistance, 1),
            0,
            1,
        ),
        projectTimelineProgress,
        projectIndex,
        projectLocalProgress:
            projectTimelineProgress - projectIndex,
    }
}
