import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CircleHelp, X } from 'lucide-react'
import { createPortal } from 'react-dom'

export function HelpDialog({ title, triggerLabel, children }: {
  title: string
  triggerLabel: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

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
      <button ref={triggerRef} className="help-button" type="button" aria-label={triggerLabel} onClick={() => setOpen(true)}>
        <CircleHelp aria-hidden="true" />
      </button>
      {open && createPortal(
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header><h2 id={titleId}>{title}</h2><button ref={closeRef} type="button" aria-label="ヘルプを閉じる" onClick={close}><X /></button></header>
            <div className="help-dialog-body">{children}</div>
            <footer><button type="button" onClick={close}>閉じる</button></footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
