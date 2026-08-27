import { useEffect, useId, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { APP_VERSION, UPDATE_LAST_SEEN_KEY } from '../lib/appVersion'

const updateHistory = [
  {
    version: '1.0.3',
    date: '2026年8月28日',
    changes: [
      '判定結果画面から、視力・視野の等級判定基準を確認できるようにしました。',
      '判定結果と認定基準を照らし合わせながら確認しやすくなりました。',
    ],
  },
  {
    version: '1.0.2',
    date: '2026年8月23日',
    changes: [
      'ゴールドマン型視野計の入力画面を見直しました。',
      '周辺視野 I/4 と中心視野 I/2 を分け、左右眼をまとめて入力できるようにしました。',
      '各眼の視野角度総和を、その場で確認できるようにしました。',
      '両眼中心視野角度の計算式と結果を表示できるようにしました。',
      '自動視野計でも、両眼中心視野視認点数の計算式と結果を表示できるようにしました。',
    ],
  },
  {
    version: '1.0.1',
    date: '2026年8月20日',
    changes: [
      '判定画面の補助説明を追加しました。',
      '両眼を同時に使用できない複視の特殊条件に対応しました。',
      'ゴールドマン型視野計の「両眼による視野が2分の1以上欠損」について、説明を確認できるようにしました。',
      'ゴールドマン型視野計の視野角度の算出方法を確認できるようにしました。',
      '合計指数から総合等級を求める早見表を確認できるようにしました。',
    ],
  },
  {
    version: '1.0.0',
    date: '2026年8月15日',
    changes: [
      '視覚障害等級判定アプリを公開しました。',
      '視力障害の等級判定に対応しました。',
      '視野障害の等級判定に対応しました。',
      'ゴールドマン型視野計、自動視野計による判定に対応しました。',
      '視力障害指数と視野障害指数から、総合等級を判定できるようにしました。',
      '判定結果と判定根拠を確認できるようにしました。',
      '判定結果を保存して、あとから見返せるようにしました。',
    ],
  },
] as const

const hasSeenCurrentUpdate = () => {
  try {
    return localStorage.getItem(UPDATE_LAST_SEEN_KEY) === APP_VERSION
  } catch {
    return false
  }
}

export function UpdateInfoDialog() {
  const [open, setOpen] = useState(false)
  const [isNew, setIsNew] = useState(() => !hasSeenCurrentUpdate())
  const titleId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const show = () => {
    try {
      localStorage.setItem(UPDATE_LAST_SEEN_KEY, APP_VERSION)
    } catch {
      // Storage may be unavailable, but the dialog should remain usable.
    }
    setIsNew(false)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'Tab') {
        event.preventDefault()
        closeRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open]) // close only uses stable state setters and refs

  return (
    <>
      <button ref={triggerRef} className="card update-info-card" type="button" onClick={show}>
        <Info aria-hidden="true" />
        <span>アップデート情報</span>
        {isNew && <b className="new-badge">NEW</b>}
        <strong>Ver. {APP_VERSION}</strong>
      </button>
      {open && createPortal(
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
          <section className="help-dialog update-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header>
              <h2 id={titleId}>アップデート情報</h2>
              <button ref={closeRef} type="button" aria-label="アップデート情報を閉じる" onClick={close}><X /></button>
            </header>
            <div className="help-dialog-body update-dialog-body">
              {updateHistory.map((update, index) => (
                <article className={`update-entry${index === 0 ? ' latest' : ''}`} key={update.version}>
                  <header>
                    <h3>Ver. {update.version}</h3>
                    {index === 0 && <span>最新</span>}
                    <time>{update.date}</time>
                  </header>
                  <ul>{update.changes.map((change) => <li key={change}>{change}</li>)}</ul>
                </article>
              ))}
            </div>
            <footer><button type="button" onClick={close}>閉じる</button></footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
