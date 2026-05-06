'use client';

import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command on Mac
  action: () => void;
  description: string;
}

/**
 * Keyboard Shortcuts Hook
 * Handles global keyboard shortcuts for the app
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = !shortcut.ctrl || event.ctrlKey;
        const matchesShift = !shortcut.shift || event.shiftKey;
        const matchesAlt = !shortcut.alt || event.altKey;
        const matchesMeta = !shortcut.meta || event.metaKey;

        if (
          matchesKey &&
          matchesCtrl &&
          matchesShift &&
          matchesAlt &&
          matchesMeta
        ) {
          // Check if it's EXACTLY what we want (not more modifiers)
          const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !(event.ctrlKey || event.metaKey);
          const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
          const altMatch = shortcut.alt ? event.altKey : !event.altKey;

          if (ctrlMatch && shiftMatch && altMatch) {
            event.preventDefault();
            shortcut.action();
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Global Keyboard Shortcuts Component
 * Displays available shortcuts in a modal
 */
export function KeyboardShortcutsHelp({
  shortcuts,
  isOpen,
  onClose,
}: {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const keys: string[] = [];

    if (shortcut.ctrl || shortcut.meta) {
      keys.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    }
    if (shortcut.shift) keys.push('Shift');
    if (shortcut.alt) keys.push('Alt');
    keys.push(shortcut.key.toUpperCase());

    return keys.join(' + ');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Boost your productivity with these keyboard shortcuts
          </p>
        </div>

        <div className="p-6 space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-gray-700 dark:text-gray-300">
                {shortcut.description}
              </span>
              <kbd className="px-3 py-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm">
                {formatShortcut(shortcut)}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Default shortcuts for the app
 */
export const defaultShortcuts: KeyboardShortcut[] = [
  {
    key: 'k',
    ctrl: true,
    description: 'Open command palette',
    action: () => console.log('Command palette'),
  },
  {
    key: 's',
    ctrl: true,
    description: 'Save document',
    action: () => console.log('Save'),
  },
  {
    key: 'p',
    ctrl: true,
    description: 'Print / Export PDF',
    action: () => console.log('Print'),
  },
  {
    key: 'n',
    ctrl: true,
    description: 'New document',
    action: () => console.log('New document'),
  },
  {
    key: 'f',
    ctrl: true,
    description: 'Search in document',
    action: () => console.log('Search'),
  },
  {
    key: '/',
    ctrl: true,
    description: 'Show keyboard shortcuts',
    action: () => console.log('Show shortcuts'),
  },
  {
    key: 'd',
    ctrl: true,
    description: 'Toggle dark mode',
    action: () => console.log('Toggle dark mode'),
  },
  {
    key: 'b',
    ctrl: true,
    description: 'Toggle sidebar',
    action: () => console.log('Toggle sidebar'),
  },
  {
    key: 'z',
    ctrl: true,
    description: 'Undo',
    action: () => console.log('Undo'),
  },
  {
    key: 'z',
    ctrl: true,
    shift: true,
    description: 'Redo',
    action: () => console.log('Redo'),
  },
];
