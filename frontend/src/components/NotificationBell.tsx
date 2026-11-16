import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { ActionButton } from './index'
import { Notice, dateTime } from './client-shared'
import { providerService } from '../lib/provider-service'
import type { NotificationRow } from '../types/provider'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const r = await providerService.unreadNotificationCount()
        if (alive) setUnread(r.unread_count)
      } catch { /* silent */ }
    }
    tick()
    const id = window.setInterval(tick, 30000)
    return () => { alive = false; window.clearInterval(id) }
  }, [])

  useEffect(() => {
    if (!open) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unreadOnly])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await providerService.listNotifications({ unread_only: unreadOnly, limit: 20 })
      setItems(r.items)
    } catch (c) { setError((c as Error).message) } finally { setLoading(false) }
  }

  async function markRead(id: number) {
    try {
      await providerService.markNotificationRead(id)
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnread(u => Math.max(0, u - 1))
    } catch (c) { setError((c as Error).message) }
  }

  async function markAll() {
    try {
      await providerService.markAllNotificationsRead()
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnread(0)
    } catch (c) { setError((c as Error).message) }
  }

  return <div ref={wrapperRef} style={{ position: 'relative' }}>
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
      aria-expanded={open}
      style={{
        position: 'relative', width: 40, height: 40, borderRadius: 8,
        border: '1px solid #d8d8d8', background: 'white', cursor: 'pointer',
        display: 'grid', placeItems: 'center',
      }}
    >
      <Bell size={18} />
      {unread > 0 && <span style={{
        position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18,
        padding: '0 5px', borderRadius: 999, background: '#B93832', color: 'white',
        fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center',
      }}>{unread > 99 ? '99+' : unread}</span>}
    </button>

    {open && <div
      role="dialog"
      aria-label="Notifications"
      style={{
        position: 'absolute', right: 0, top: 48, width: 360, maxWidth: '90vw',
        background: 'white', border: '1px solid #d8d8d8', borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 60, overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: '1px solid #eaeaea',
      }}>
        <strong style={{ fontSize: 14 }}>Notifications</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setUnreadOnly(v => !v)}
            style={{
              fontSize: 12, padding: '4px 8px', borderRadius: 6,
              border: '1px solid #d8d8d8', background: unreadOnly ? '#22262B' : 'white',
              color: unreadOnly ? 'white' : '#22262B', cursor: 'pointer',
            }}
          >{unreadOnly ? 'Unread only' : 'All'}</button>
          <button
            type="button"
            onClick={markAll}
            disabled={unread === 0}
            style={{
              fontSize: 12, padding: '4px 8px', borderRadius: 6,
              border: '1px solid #d8d8d8', background: 'white',
              cursor: unread === 0 ? 'not-allowed' : 'pointer',
              opacity: unread === 0 ? 0.5 : 1,
            }}
          >Mark all read</button>
        </div>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {error && <div style={{ padding: 12 }}><Notice error>{error}</Notice></div>}
        {loading && <p style={{ padding: 14, fontSize: 13, color: '#666' }}>Loading…</p>}
        {!loading && !error && items.length === 0 && (
          <p style={{ padding: 14, fontSize: 13, color: '#666' }}>
            {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
        )}
        {!loading && items.map(n => (
          <button
            key={n.id}
            type="button"
            onClick={() => { if (!n.is_read) void markRead(n.id) }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 14px', borderBottom: '1px solid #f0f0f0',
              background: n.is_read ? 'white' : '#f7f9fb',
              cursor: n.is_read ? 'default' : 'pointer', border: 0,
              fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 13 }}>{n.title}</strong>
              {!n.is_read && <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#3b82f6', marginTop: 5, flexShrink: 0,
              }} />}
            </div>
            <p style={{ fontSize: 13, color: '#444', margin: '4px 0 2px' }}>{n.message}</p>
            <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
              {n.type} · {dateTime(n.created_at)}
            </p>
          </button>
        ))}
      </div>
    </div>}
  </div>
}