'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store';

interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  color: string;
}

interface Props {
  documentId: string;
}

export function PresenceIndicator({ documentId }: Props) {
  const { user, token } = useAuthStore();
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !token || !documentId) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

    const socket = io(`${backendUrl}/presence`, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('presence:join', {
        documentId,
        name: user.name || user.email,
        email: user.email,
      });
    });

    socket.on('presence:update', (users: PresenceUser[]) => {
      setOthers(users.filter(u => u.userId !== user.id));
    });

    return () => {
      socket.emit('presence:leave');
      socket.disconnect();
    };
  }, [documentId, user, token]);

  if (others.length === 0) return null;

  const visible = others.slice(0, 4);
  const overflow = others.length - 4;

  return (
    <div className="flex items-center gap-1" title="People viewing this document">
      {visible.map((u, i) => (
        <div
          key={u.userId + i}
          className="relative"
          style={{ zIndex: visible.length - i }}
          title={u.name || u.email}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white shadow-sm"
            style={{ backgroundColor: u.color }}
          >
            {(u.name || u.email)[0]?.toUpperCase()}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 bg-gray-100 ring-2 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  );
}
