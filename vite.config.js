import react from '@vitejs/plugin-react'
import { defineConfig, transformWithOxc } from 'vite'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sceneStateKeys = [
  'close',
  'project01',
  'project02',
  'project03',
  'project04',
  'project05',
]

function getMarkedProfile(source, key) {
  const startMarker = `/* SCENE_STATE_START: ${key} */`
  const endMarker = `/* SCENE_STATE_END: ${key} */`
  const startIndex = source.indexOf(startMarker)
  const endIndex = source.indexOf(endMarker)

  if (
    startIndex < 0 ||
    endIndex < 0 ||
    source.indexOf(startMarker, startIndex + 1) >= 0 ||
    source.indexOf(endMarker, endIndex + 1) >= 0 ||
    endIndex <= startIndex
  ) {
    throw new Error(`Invalid or missing scene-state markers for ${key}`)
  }

  const bodyStart = source.indexOf('\n', startIndex) + 1
  const bodyEnd = source.lastIndexOf('\n', endIndex) + 1
  const body = source.slice(bodyStart, bodyEnd)

  if (
    bodyStart <= startIndex ||
    bodyEnd <= bodyStart ||
    !body.startsWith(`        ${key}: {`)
  ) {
    throw new Error(`Scene-state marker body does not contain top-level ${key}`)
  }

  return {
    body,
    bodyEnd,
    bodyStart,
    endIndex,
    startIndex,
  }
}

function validateSceneStateSource(source, selected, previousSource) {
  const declarationIndex = source.indexOf('export const defaultSceneStates')
  if (declarationIndex < 0) {
    throw new Error('defaultSceneStates declaration was not found')
  }

  const profiles = sceneStateKeys.map((key) => {
    const profile = getMarkedProfile(source, key)
    if (profile.startIndex < declarationIndex) {
      throw new Error(`Scene-state markers for ${key} are outside defaultSceneStates`)
    }
    return { key, ...profile }
  })

  for (let index = 1; index < profiles.length; index += 1) {
    if (profiles[index - 1].startIndex >= profiles[index].startIndex) {
      throw new Error('Scene-state markers are not in the expected profile order')
    }
  }

  const previousProfiles = previousSource
    ? sceneStateKeys.map((key) => ({ key, ...getMarkedProfile(previousSource, key) }))
    : null

  if (previousProfiles) {
    for (let index = 0; index < profiles.length; index += 1) {
      if (
        profiles[index].key !== selected &&
        profiles[index].body !== previousProfiles[index].body
      ) {
        throw new Error(`Unexpected change to scene-state profile ${profiles[index].key}`)
      }
    }
  }

  return profiles
}

function serializeProfile(key, state) {
  const serialized = JSON.stringify(state, null, 4)
    .replace(/\n/g, '\n        ')
  return `        ${key}: ${serialized},\n`
}

function saveSceneStatePlugin() {
  let sceneStatesPath

  return {
    name: 'save-onyx-scene-state',
    apply: 'serve',
    configResolved(config) {
      sceneStatesPath = path.join(
        config.root,
        'src',
        'data',
        'sceneStates.js',
      )
    },
    configureServer(server) {
      server.middlewares.use(
        '/api/save-scene-state',
        async (req, res) => {
          const respond = (status, body) => {
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(body))
          }

          if (req.method !== 'POST') {
            respond(405, { success: false, error: 'Method not allowed' })
            return
          }

          try {
            let body = ''
            for await (const chunk of req) {
              body += chunk
              if (body.length > 1024 * 1024) {
                respond(413, { success: false, error: 'Request too large' })
                return
              }
            }

            const { selected, state } = JSON.parse(body)
            if (
              !sceneStateKeys.includes(selected) ||
              !state ||
              typeof state !== 'object' ||
              Array.isArray(state)
            ) {
              respond(400, { success: false, error: 'Invalid scene state' })
              return
            }

            const source = await readFile(sceneStatesPath, 'utf8')
            const profiles = validateSceneStateSource(source, selected)
            const selectedProfile = profiles.find(
              (profile) => profile.key === selected,
            )
            const replacement = serializeProfile(selected, state)
            const candidate =
              source.slice(0, selectedProfile.bodyStart) +
              replacement +
              source.slice(selectedProfile.bodyEnd)

            validateSceneStateSource(candidate, selected, source)
            await transformWithOxc(candidate, sceneStatesPath)

            const tempPath = `${sceneStatesPath}.tmp`
            try {
              await writeFile(tempPath, candidate, 'utf8')
              await rename(tempPath, sceneStatesPath)
            } catch (error) {
              await unlink(tempPath).catch(() => {})
              throw error
            }

            respond(200, { success: true })
          } catch (error) {
            respond(500, { success: false, error: error.message })
          }
        },
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), saveSceneStatePlugin()],
})
