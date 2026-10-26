'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ExternalLink, Inbox } from 'lucide-react';
import { useRealtimeNotifications, NotificationItem } from '@/hooks/useRealtimeNotifications';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

const TYPE_STYLES = {
  success: 'border-l-teal-500 bg-teal-500/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  error: 'border-l-red-500 bg-red-500/5',
  info: 'border-l-blue-500 bg-blue-500/5',
};

export function NotificationBell({ userId }: { userId?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllAsRead, markAsRead, loading } =
    useRealtimeNotifications(userId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!userId) return null;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white px-1 shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Inbox className="w-7 h-7 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-semibold text-foreground">No notifications yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Alerts for task changes, milestone approvals, and deadlines will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item: NotificationItem) => {
                const borderClass =
                  TYPE_STYLES[item.type] || 'border-l-slate-400 bg-transparent';
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.is_read) markAsRead(item.id);
                    }}
                    className={`p-3.5 text-left border-l-2 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 ${borderClass} ${
                      item.is_read ? 'opacity-65' : 'font-medium'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {item.message}
                    </p>
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          if (!item.is_read) markAsRead(item.id);
                        }}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View details <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
