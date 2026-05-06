'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ProgressUpdate {
  jobId: string;
  stage: 'outline' | 'slides' | 'design' | 'quality' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  details?: {
    currentSlide?: number;
    totalSlides?: number;
    slideTitle?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export function useProgressTracking(jobId?: string) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const newSocket = io(`${apiUrl}/progress`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to server');
      setConnected(false);
    });

    newSocket.on('progress', (update: ProgressUpdate) => {
      console.log('Progress update:', update);
      setProgress(update);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Subscribe to job updates
  const subscribeToJob = useCallback((newJobId: string) => {
    if (socket && connected) {
      socket.emit('subscribe', { jobId: newJobId });
      console.log('Subscribed to job:', newJobId);
    }
  }, [socket, connected]);

  // Unsubscribe from job updates
  const unsubscribeFromJob = useCallback((oldJobId: string) => {
    if (socket && connected) {
      socket.emit('unsubscribe', { jobId: oldJobId });
      console.log('Unsubscribed from job:', oldJobId);
    }
  }, [socket, connected]);

  // Auto-subscribe when jobId changes
  useEffect(() => {
    if (jobId && connected) {
      subscribeToJob(jobId);
      
      return () => {
        unsubscribeFromJob(jobId);
      };
    }
  }, [jobId, connected, subscribeToJob, unsubscribeFromJob]);

  const reset = useCallback(() => {
    setProgress(null);
    setError(null);
  }, []);

  return {
    progress,
    connected,
    error,
    subscribeToJob,
    unsubscribeFromJob,
    reset,
  };
}
