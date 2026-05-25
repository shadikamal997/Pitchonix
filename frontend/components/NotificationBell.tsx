'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (_) {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      const n = notifications.find((x) => x.id === id);
      setNotifications((prev) => prev.filter((x) => x.id !== id));
      if (n && !n.read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#111111] hover:bg-[#F7F6F2] shadow-[0_8px_18px_rgba(0,0,0,0.04)] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#D96A6A] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-[#E3E1DA]/60 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F0EC]">
            <h3 className="font-semibold text-sm text-[#111111]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#4F7563] hover:text-[#355846] font-semibold flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F0EC]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#9A9A9A] animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#9A9A9A]">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-[#F7F6F2] transition-colors ${!n.read ? 'bg-[#EEF5F1]/50' : ''}`}
                >
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4F7563] mt-2 flex-shrink-0" />
                  )}
                  <div className={`flex-1 min-w-0 ${n.read ? 'ml-3.5' : ''}`}>
                    <p className="text-xs font-semibold text-[#111111] leading-snug">{n.title}</p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-[#9A9A9A] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    {n.link && (
                      <Link href={n.link} className="text-[10px] text-[#4F7563] hover:underline mt-0.5 inline-block font-semibold">
                        View →
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} title="Mark read" className="p-1 rounded-full hover:bg-[#EEF5F1] text-[#9A9A9A] hover:text-[#4F7563] transition-colors">
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => deleteNotification(n.id)} title="Delete" className="p-1 rounded-full hover:bg-[#F7E3E3]/60 text-[#9A9A9A] hover:text-[#9a3737] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
