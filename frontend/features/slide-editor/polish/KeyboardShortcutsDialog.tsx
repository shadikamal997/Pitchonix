'use client';

import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

// =============================================================================
//  KeyboardShortcutsDialog (Phase 16)
//
//  Modal listing every keyboard shortcut in the editor / presenter, grouped
//  by area. Triggered via ⌘/Ctrl + / from anywhere in the editor (parent owns
//  the trigger and toggles `open`).
// =============================================================================

interface Props {
  open:    boolean;
  onClose: () => void;
}

type Shortcut = { keys: string[]; desc: string };
type Group    = { title: string; items: Shortcut[] };

const GROUPS: Group[] = [
  {
    title: 'Navigation',
    items: [
      { keys: ['⌘/Ctrl', '/'], desc: 'Show this help' },
      { keys: ['↑', '↓', '←', '→'], desc: 'Nudge selected element by 1%' },
      { keys: ['⇧', '+ arrow'], desc: 'Nudge selected element by 5%' },
      { keys: ['Esc'], desc: 'Deselect / cancel edit' },
    ],
  },
  {
    title: 'Editing',
    items: [
      { keys: ['Enter'], desc: 'Start editing the selected text/list element' },
      { keys: ['⌘/Ctrl', 'Z'], desc: 'Undo' },
      { keys: ['⌘/Ctrl', '⇧', 'Z'], desc: 'Redo' },
      { keys: ['⌘/Ctrl', 'C'], desc: 'Copy selection' },
      { keys: ['⌘/Ctrl', 'V'], desc: 'Paste (offset 2%)' },
      { keys: ['⌘/Ctrl', 'D'], desc: 'Duplicate selection' },
      { keys: ['Del / ⌫'], desc: 'Delete selection' },
    ],
  },
  {
    title: 'Selection & layers',
    items: [
      { keys: ['⌘/Ctrl', 'A'], desc: 'Select all elements on this slide' },
      { keys: ['⌘/Ctrl', '⇧', 'A'], desc: 'Select similar (same type)' },
      { keys: ['⌘/Ctrl', 'click'], desc: 'Add/remove element from selection' },
      { keys: ['⇧', 'click'], desc: 'Add/remove element from selection' },
      { keys: ['Alt', 'click'], desc: 'Select one element (bypass group)' },
      { keys: ['Drag empty area'], desc: 'Marquee multi-select' },
      { keys: ['⌘/Ctrl', 'G'], desc: 'Group selection' },
      { keys: ['⌘/Ctrl', '⇧', 'G'], desc: 'Ungroup' },
      { keys: ['⌘/Ctrl', ']'], desc: 'Bring forward (z-index +1)' },
      { keys: ['⌘/Ctrl', '['], desc: 'Send backward (z-index -1)' },
    ],
  },
  {
    title: 'Presenter mode',
    items: [
      { keys: ['→', 'Space', 'PgDn'], desc: 'Next slide' },
      { keys: ['←', 'PgUp'], desc: 'Previous slide' },
      { keys: ['Home', 'End'], desc: 'First / last slide' },
      { keys: ['F'], desc: 'Toggle fullscreen' },
      { keys: ['L'], desc: 'Toggle laser pointer' },
      { keys: ['N'], desc: 'Toggle speaker notes' },
      { keys: ['P'], desc: 'Pause / resume timer' },
      { keys: ['R'], desc: 'Reset timer' },
    ],
  },
];

export const KeyboardShortcutsDialog: React.FC<Props> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-dialog-title"
      className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <header className="h-12 border-b border-[#E3E1DA] px-4 flex items-center gap-3 flex-shrink-0">
          <Keyboard className="w-4 h-4 text-[#4F7563]" />
          <h2 id="kbd-dialog-title" className="text-sm font-bold text-[#111111]">Keyboard shortcuts</h2>
          <button onClick={onClose} className="ml-auto p-1 rounded text-[#9A9A9A] hover:bg-[#F1F0EC]" aria-label="Close shortcuts">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-x-6 gap-y-5">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">{g.title}</h3>
              <ul className="space-y-1.5">
                {g.items.map((it, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-[#111111] flex-1 min-w-0">{it.desc}</span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      {it.keys.map((k, j) => (
                        <kbd key={j} className="px-1.5 py-0.5 bg-[#F1F0EC] border border-[#E3E1DA] rounded text-[10px] font-mono text-[#111111]">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="h-10 border-t border-[#E3E1DA] px-4 flex items-center text-[11px] text-[#9A9A9A] flex-shrink-0">
          Press <kbd className="mx-1 px-1.5 py-0.5 bg-[#F1F0EC] border border-[#E3E1DA] rounded font-mono">Esc</kbd> to close.
        </footer>
      </div>
    </div>
  );
};
