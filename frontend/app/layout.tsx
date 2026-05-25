import type { Metadata } from 'next'
import './globals.css'
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
// Phase Ω.3.1 — global confirmation dialog (replaces window.confirm)
import { ConfirmProvider } from "@/components/ConfirmDialog";
// Phase 39 — global workspace context (current workspace + permissions)
import { WorkspaceProvider } from "@/features/workspaces/WorkspaceContext";
import { inter, allFontClassNames } from './fonts';

export const metadata: Metadata = {
  title: 'Pitchonix - AI-Powered Presentation Generator',
  description: 'Generate professional business presentations with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Every template font is registered as a CSS variable here so families can
    // reference them via the resolveFontStack() helper.
    <html lang="en" className={cn("font-sans", allFontClassNames)} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <ConfirmProvider>
              <ErrorBoundary>
                <WorkspaceProvider>
                  {children}
                </WorkspaceProvider>
                <Toaster />
              </ErrorBoundary>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
