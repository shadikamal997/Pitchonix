// Focused-page layout — bypasses the project layout's app shell (sidebar + topnav)
// so the slide editor gets the full viewport. The editor has its own top bar.

export default function SlideEditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
