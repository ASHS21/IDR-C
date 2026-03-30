'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info, Shield, Clock, Wifi, Loader2, Check, Eye, Search, RefreshCw, Play } from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllRead } from '@/lib/hooks/use-notifications'
import { formatRelativeTime } from '@/lib/utils/formatters'
import type { Notification } from '@/lib/hooks/use-notifications'
import { useRouter } from 'next/navigation'

const SEVERITY_STYLES: Record<string, { dot: string; icon: string }> = {
  critical: { dot: 'bg-[var(--color-critical)]', icon: 'text-[var(--color-critical)]' },
  high: { dot: 'bg-[var(--color-high)]', icon: 'text-[var(--color-high)]' },
  medium: { dot: 'bg-[var(--color-medium)]', icon: 'text-[var(--color-medium)]' },
  low: { dot: 'bg-[var(--color-low)]', icon: 'text-[var(--color-low)]' },
  info: { dot: 'bg-[var(--color-info)]', icon: 'text-[var(--color-info)]' },
}

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  violation_detected: AlertTriangle,
  certification_due: Clock,
  sync_failed: Wifi,
  exception_expiring: Shield,
  ai_analysis_complete: Info,
  system: AlertCircle,
  threat_detected: AlertCircle,
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: typeof Check
  label: string
  onClick: (e: React.MouseEvent) => void
  variant?: 'default' | 'primary'
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading || success) return
    setLoading(true)
    try {
      await onClick(e)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch {
      // error handled by caller
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-micro font-medium transition-colors disabled:opacity-50 ${
        variant === 'primary'
          ? 'bg-[var(--color-info)] text-white hover:opacity-90'
          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
      }`}
    >
      {loading ? (
        <Loader2 size={10} className="animate-spin" />
      ) : success ? (
        <Check size={10} className="text-green-500" />
      ) : (
        <Icon size={10} />
      )}
      {label}
    </button>
  )
}

function NotificationActions({
  notification,
  onActionComplete,
}: {
  notification: Notification
  onActionComplete: () => void
}) {
  const router = useRouter()

  const handleAcknowledge = async () => {
    const violationId = (notification.metadata as any)?.violationId
    if (!violationId) return
    const res = await fetch('/api/actions/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ violationId }),
    })
    if (!res.ok) throw new Error('Failed to acknowledge')
    onActionComplete()
  }

  const handleContain = async () => {
    const threatId = (notification.metadata as any)?.threatId
    if (!threatId) return
    const res = await fetch(`/api/threats/${threatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'contained' }),
    })
    if (!res.ok) throw new Error('Failed to contain threat')
    onActionComplete()
  }

  const handleRetrySync = async () => {
    const sourceId = (notification.metadata as any)?.integrationId || (notification.metadata as any)?.sourceId
    if (!sourceId) return
    const res = await fetch(`/api/sync/${sourceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Failed to retry sync')
    onActionComplete()
  }

  switch (notification.type) {
    case 'violation_detected':
      return (
        <div className="flex items-center gap-1.5 mt-1.5">
          <ActionButton icon={Check} label="Acknowledge" onClick={handleAcknowledge} />
          <ActionButton
            icon={Eye}
            label="View"
            onClick={(e) => {
              e.stopPropagation()
              const violationId = (notification.metadata as any)?.violationId
              const identityId = (notification.metadata as any)?.identityId
              if (identityId) {
                router.push(`/dashboard/identities/${identityId}`)
              } else {
                router.push('/dashboard/violations')
              }
              onActionComplete()
            }}
          />
        </div>
      )

    case 'threat_detected':
      return (
        <div className="flex items-center gap-1.5 mt-1.5">
          <ActionButton
            icon={Search}
            label="Investigate"
            onClick={(e) => {
              e.stopPropagation()
              const threatId = (notification.metadata as any)?.threatId
              if (threatId) router.push(`/dashboard/threats/${threatId}`)
              else router.push('/dashboard/threats')
              onActionComplete()
            }}
          />
          <ActionButton icon={Shield} label="Contain" onClick={handleContain} variant="primary" />
        </div>
      )

    case 'certification_due':
      return (
        <div className="flex items-center gap-1.5 mt-1.5">
          <ActionButton
            icon={Play}
            label="Start Review"
            onClick={(e) => {
              e.stopPropagation()
              router.push('/dashboard/certifications')
              onActionComplete()
            }}
            variant="primary"
          />
        </div>
      )

    case 'sync_failed':
      return (
        <div className="flex items-center gap-1.5 mt-1.5">
          <ActionButton icon={RefreshCw} label="Retry Sync" onClick={handleRetrySync} variant="primary" />
        </div>
      )

    default:
      return null
  }
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  const router = useRouter()
  const severity = SEVERITY_STYLES[notification.severity] || SEVERITY_STYLES.info
  const Icon = TYPE_ICONS[notification.type] || Info

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleActionComplete = () => {
    if (!notification.read) {
      onRead(notification.id)
    }
  }

  return (
    <div
      className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-[var(--bg-secondary)] ${
        !notification.read ? 'bg-[var(--bg-secondary)]/50' : ''
      }`}
    >
      <button onClick={handleClick} className="w-full text-left">
        <div className="flex items-start gap-2.5">
          <div className={`mt-0.5 ${severity.icon}`}>
            <Icon size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={`text-caption leading-tight truncate ${
                !notification.read
                  ? 'font-semibold text-[var(--text-primary)]'
                  : 'font-medium text-[var(--text-secondary)]'
              }`}>
                {notification.title}
              </p>
              {!notification.read && (
                <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${severity.dot}`} />
              )}
            </div>
            <p className="text-micro text-[var(--text-tertiary)] mt-0.5 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-micro text-[var(--text-tertiary)] mt-1">
              {formatRelativeTime(notification.createdAt)}
            </p>
          </div>
        </div>
      </button>
      <NotificationActions notification={notification} onActionComplete={handleActionComplete} />
    </div>
  )
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { data: unreadCount = 0 } = useUnreadCount()
  const { data: notificationsData } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllRead()

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open])

  const handleMarkRead = (id: string) => {
    markRead.mutate(id)
  }

  const handleMarkAllRead = () => {
    markAllRead.mutate()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors relative"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[var(--color-critical)] text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg z-50 overflow-hidden"
          style={{ boxShadow: 'var(--shadow-dropdown)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-default)]">
            <h3 className="text-caption font-semibold text-[var(--text-primary)]">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1.5 text-micro font-medium text-[var(--text-tertiary)]">
                  ({unreadCount} unread)
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-micro text-[var(--color-info)] hover:underline disabled:opacity-50"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--border-default)]">
            {!notificationsData?.data?.length ? (
              <div className="py-8 text-center">
                <Bell size={24} className="mx-auto mb-2 text-[var(--text-tertiary)] opacity-40" />
                <p className="text-caption text-[var(--text-tertiary)]">No notifications yet</p>
              </div>
            ) : (
              notificationsData.data.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkRead}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notificationsData && notificationsData.total > notificationsData.data.length && (
            <div className="border-t border-[var(--border-default)] px-3 py-2 text-center">
              <button
                onClick={() => { setOpen(false) }}
                className="text-micro text-[var(--color-info)] hover:underline"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
