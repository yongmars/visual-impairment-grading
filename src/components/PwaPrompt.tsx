import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaPrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span>新しいバージョンを利用できます</span>
      <button type="button" onClick={() => updateServiceWorker(true)}><RefreshCw />更新</button>
      <button className="icon-button" type="button" aria-label="閉じる" onClick={() => setNeedRefresh(false)}><X /></button>
    </div>
  )
}
