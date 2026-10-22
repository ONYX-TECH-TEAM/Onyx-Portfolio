const baseFields = [
    ['camera.position.0', 'Camera X'],
    ['camera.position.1', 'Camera Y'],
    ['camera.position.2', 'Camera Z'],
    ['camera.target.0', 'Target X'],
    ['camera.target.1', 'Target Y'],
    ['camera.target.2', 'Target Z'],
    ['camera.fov', 'FOV'],
    ['orbit.rotationY', 'Orbit rotation Y'],
    ['onyx.scale', 'Onyx scale'],
    ['project01.scale', 'Project 01 scale'],
    ['project02.scale', 'Project 02 scale'],
    ['project03.scale', 'Project 03 scale'],
    ['project04.scale', 'Project 04 scale'],
    ['project05.scale', 'Project 05 scale'],
]

const projectRotationFields = {
    project01: [
        ['project01.rotation.0', 'Shard 01 rotation X'],
        ['project01.rotation.1', 'Shard 01 rotation Y'],
        ['project01.rotation.2', 'Shard 01 rotation Z'],
    ],

    project02: [
        ['project02.rotation.0', 'Shard 02 rotation X'],
        ['project02.rotation.1', 'Shard 02 rotation Y'],
        ['project02.rotation.2', 'Shard 02 rotation Z'],
    ],

    project03: [
        ['project03.rotation.0', 'Shard 03 rotation X'],
        ['project03.rotation.1', 'Shard 03 rotation Y'],
        ['project03.rotation.2', 'Shard 03 rotation Z'],
    ],

    project04: [
        ['project04.rotation.0', 'Shard 04 rotation X'],
        ['project04.rotation.1', 'Shard 04 rotation Y'],
        ['project04.rotation.2', 'Shard 04 rotation Z'],
    ],

    project05: [
        ['project05.rotation.0', 'Shard 05 rotation X'],
        ['project05.rotation.1', 'Shard 05 rotation Y'],
        ['project05.rotation.2', 'Shard 05 rotation Z'],
    ],
}

const nebulaTransformFields = [
    ['nebula.position.0', 'Nebula position X'],
    ['nebula.position.1', 'Nebula position Y'],
    ['nebula.position.2', 'Nebula position Z'],
    ['nebula.rotation.0', 'Nebula rotation X'],
    ['nebula.rotation.1', 'Nebula rotation Y'],
    ['nebula.rotation.2', 'Nebula rotation Z'],
    ['nebula.intensity', 'Nebula intensity'],
]

const nebulaColorFields = [
    ['nebula.primaryColor', 'Nebula primary color'],
    ['nebula.secondaryColor', 'Nebula secondary color'],
]

const PROJECT_KEYS = [
    'close',
    'project01',
    'project02',
    'project03',
    'project04',
    'project05',
]

function read(object, path) {
    return path
        .split('.')
        .reduce(
            (value, key) =>
                value?.[key],
            object,
        )
}

function getProfileLabel(key) {
    if (key === 'close') {
        return 'CLOSE'
    }

    if (key === 'project01') {
        return 'PROJECT 01'
    }

    if (key === 'project02') {
        return 'PROJECT 02'
    }

    if (key === 'project03') {
        return 'PROJECT 03'
    }

    if (key === 'project04') {
        return 'PROJECT 04'
    }

    if (key === 'project05') {
        return 'PROJECT 05'
    }

    return key.toUpperCase()
}

function getProjectNumber(key) {
    if (!key.startsWith('project')) {
        return null
    }

    return Number(
        key.replace(
            'project',
            '',
        ),
    )
}

function OnyxSceneEditor({
    open,
    selected,
    states,
    onOpenChange,
    onSelectedChange,
    onValueChange,
    onSave,
}) {
    if (!import.meta.env.DEV) {
        return null
    }

    const selectedProjectNumber =
        getProjectNumber(selected)

    const fields =
        selected === 'close'
            ? [
                ...baseFields,
                ...nebulaTransformFields,
            ]
            : [
                ...baseFields,
                ...(
                    projectRotationFields[
                    selected
                    ] ?? []
                ),
                ...nebulaTransformFields,
            ]

    const selectedState =
        states?.[selected]

    const selectedLabel =
        getProfileLabel(selected)

    const hasTravelDirection =
        selectedProjectNumber !== null &&
        selectedProjectNumber >= 2

    const travelDirection =
        selectedState?.orbit
            ?.travelDirection ?? -1

    const handleValueChange = (
        path,
        value,
    ) => {
        /*
         * This is intentionally ONLY a live-preview
         * update.
         *
         * The parent should update its in-memory
         * scene state here, but should NOT write to
         * localStorage.
         */
        onValueChange?.(
            path,
            value,
        )
    }

    const handleSave = () => {
        /*
         * This is the explicit persistence action.
         *
         * The parent onSave handler should be the
         * ONLY place that writes sceneStates to
         * localStorage.
         */
        onSave?.(
            selected,
            selectedState,
        )
    }

    return (
        <aside className="onyx-scene-editor">
            <button
                type="button"
                onClick={() =>
                    onOpenChange(
                        !open,
                    )
                }
            >
                {open
                    ? 'Close editor'
                    : 'Edit mode'}
            </button>

            {open && (
                <div className="onyx-scene-editor__panel">
                    <div className="onyx-scene-editor__states">
                        {PROJECT_KEYS.map(
                            (key) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={
                                        key ===
                                            selected
                                            ? 'is-active'
                                            : ''
                                    }
                                    onClick={() =>
                                        onSelectedChange(
                                            key,
                                        )
                                    }
                                >
                                    {getProfileLabel(
                                        key,
                                    )}
                                </button>
                            ),
                        )}
                    </div>

                    {selected ===
                        'project01' && (
                            <p>
                                Target values offset
                                the actual Project 01
                                world position.
                                Rotation controls
                                which shard face is
                                presented to the
                                camera.
                            </p>
                        )}

                    {selected ===
                        'project02' && (
                            <p>
                                Target values offset
                                the actual Project 02
                                world position.
                                Rotation controls
                                which shard face is
                                presented to the
                                camera.
                            </p>
                        )}

                    {selected ===
                        'project03' && (
                            <p>
                                Target values offset
                                the actual Project 03
                                world position.
                                Rotation controls
                                which shard face is
                                presented to the
                                camera.
                            </p>
                        )}

                    {selected ===
                        'project04' && (
                            <p>
                                Target values offset
                                the actual Project 04
                                world position.
                                Rotation controls
                                which shard face is
                                presented to the
                                camera.
                            </p>
                        )}

                    {selected ===
                        'project05' && (
                            <p>
                                Target values offset
                                the actual Project 05
                                world position.
                                Rotation controls
                                which shard face is
                                presented to the
                                camera.
                            </p>
                        )}

                    {hasTravelDirection && (
                        <label>
                            Orbit travel

                            <select
                                value={
                                    travelDirection
                                }
                                onChange={(event) =>
                                    handleValueChange(
                                        'orbit.travelDirection',
                                        Number(
                                            event
                                                .target
                                                .value,
                                        ),
                                    )
                                }
                            >
                                <option value={-1}>
                                    BACK
                                </option>

                                <option value={1}>
                                    FRONT
                                </option>
                            </select>
                        </label>
                    )}

                    {fields.map(
                        ([path, label]) => (
                            <label
                                key={path}
                            >
                                {label}

                                <input
                                    type="number"
                                    step="0.01"
                                    value={
                                        read(
                                            selectedState,
                                            path,
                                        ) ?? ''
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        handleValueChange(
                                            path,
                                            Number(
                                                event
                                                    .target
                                                    .value,
                                            ),
                                        )
                                    }
                                />
                            </label>
                        ),
                    )}

                    {nebulaColorFields.map(
                        ([path, label]) => (
                            <label
                                key={path}
                            >
                                {label}

                                <input
                                    type="color"
                                    value={
                                        read(
                                            selectedState,
                                            path,
                                        ) ?? '#000000'
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        handleValueChange(
                                            path,
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                />
                            </label>
                        ),
                    )}

                    <button
                        type="button"
                        onClick={
                            handleSave
                        }
                    >
                        Save {selectedLabel}
                    </button>
                </div>
            )}
        </aside>
    )
}

export default OnyxSceneEditor