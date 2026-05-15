import { useEffect, useRef } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import { Layout } from '@/ui/Layout'
import { pluginLoader } from '@/plugin/loader'
import { usePluginStore } from '@/store/plugins'
import { useUpdateStore } from '@/store/update'
import { checkForUpdate } from '@/lib/updater'
import { UpdateBanner } from '@/ui/UpdateBanner'

function App() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const { enabledPlugins } = usePluginStore.getState()

    // Register built-in plugins
    const builtinPlugins = [
      {
        path: () => import('@/plugin/examples/word-count'),
        enableByDefault: true,
      },
    ]

    for (const builtin of builtinPlugins) {
      builtin.path().then((mod) => {
        const manifest = mod.manifest
        usePluginStore.getState().registerManifest(manifest)

        const shouldLoad = enabledPlugins.includes(manifest.id) || builtin.enableByDefault

        if (shouldLoad) {
          if (!enabledPlugins.includes(manifest.id)) {
            usePluginStore.getState().enablePlugin(manifest.id)
          }
          pluginLoader.load(manifest, mod.default)
        }
      })
    }

    // Auto-update check
    if (useUpdateStore.getState().shouldCheck()) {
      getVersion()
        .then((version) => checkForUpdate(version))
        .then((info) => {
          if (!info) return
          const currentStore = useUpdateStore.getState()
          if (currentStore.dismissedVersion === info.version) return
          currentStore.setUpdateInfo(info)
        })
        .catch(() => {})
    }
  }, [])

  const { updateInfo, dismiss } = useUpdateStore()

  return (
    <>
      {updateInfo && <UpdateBanner update={updateInfo} onDismiss={dismiss} />}
      <Layout />
    </>
  )
}

export default App
