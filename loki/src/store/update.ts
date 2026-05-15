import { create } from 'zustand'
import type { UpdateInfo } from '@/lib/updater'

const CHECK_INTERVAL = 24 * 60 * 60 * 1000

interface UpdateState {
  updateInfo: UpdateInfo | null
  dismissedVersion: string | null
  lastChecked: number

  setUpdateInfo: (info: UpdateInfo | null) => void
  dismiss: () => void
  shouldCheck: () => boolean
}

const STORE_KEY = 'loki-update'

function loadPersisted(): { dismissedVersion?: string | null; lastChecked?: number } {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function persist(state: UpdateState) {
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      dismissedVersion: state.dismissedVersion,
      lastChecked: state.lastChecked,
    }),
  )
}

const persisted = loadPersisted()

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateInfo: null,
  dismissedVersion: persisted.dismissedVersion ?? null,
  lastChecked: persisted.lastChecked ?? 0,

  setUpdateInfo: (info: UpdateInfo | null) => {
    set({ updateInfo: info, lastChecked: Date.now() })
    persist(get())
  },

  dismiss: () => {
    const { updateInfo } = get()
    set({ dismissedVersion: updateInfo?.version ?? null })
    persist(get())
  },

  shouldCheck: (): boolean => {
    return Date.now() - get().lastChecked > CHECK_INTERVAL
  },
}))
