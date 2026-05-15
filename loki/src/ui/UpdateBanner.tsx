import { useEffect, useRef } from 'react'
import { open } from '@tauri-apps/plugin-shell'
import type { UpdateInfo } from '@/lib/updater'

interface UpdateBannerProps {
  update: UpdateInfo
  onDismiss: () => void
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ update, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 30_000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  const handleViewUpdate = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    open(update.htmlUrl)
  }

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    onDismiss()
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-blue-600 text-white">
      <span className="text-sm">
        新版本 <span className="font-bold">v{update.version}</span> 可用
      </span>
      <div className="flex gap-2">
        <button
          className="px-3 py-0.5 text-sm bg-white text-blue-600 rounded hover:bg-blue-50 transition-colors"
          onClick={handleViewUpdate}
        >
          查看更新
        </button>
        <button
          className="px-3 py-0.5 text-sm border border-white/30 rounded hover:bg-blue-500 transition-colors"
          onClick={handleDismiss}
        >
          忽略
        </button>
      </div>
    </div>
  )
}
