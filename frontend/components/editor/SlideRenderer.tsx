'use client';

interface Slide {
  id: string;
  type: string;
  order: number;
  title: string;
  subtitle?: string;
  content: any;
  speakerNotes?: string;
}

interface SlideRendererProps {
  slide: Slide | null;
  themeOverride?: string;
}

const THEME_STYLES: Record<string, { bg: string; text: string; accent: string }> = {
  tech:         { bg: '#0F172A', text: '#F8FAFC', accent: '#38BDF8' },
  modern:       { bg: '#1E1B4B', text: '#F8FAFC', accent: '#818CF8' },
  professional: { bg: '#1E293B', text: '#F8FAFC', accent: '#38BDF8' },
  bold:         { bg: '#18181B', text: '#FAFAFA', accent: '#F97316' },
  corporate:    { bg: '#1E3A5F', text: '#F8FAFC', accent: '#60A5FA' },
  creative:     { bg: '#4C1D95', text: '#F8FAFC', accent: '#F0ABFC' },
  minimal:      { bg: '#FFFFFF', text: '#111827', accent: '#6B7280' },
};

export default function SlideRenderer({ slide, themeOverride }: SlideRendererProps) {
  if (!slide) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <p className="text-gray-500 text-sm">No slide selected</p>
      </div>
    );
  }

  const theme = THEME_STYLES[themeOverride || 'modern'] || THEME_STYLES.modern;

  const bullets: string[] = Array.isArray(slide.content?.bullets)
    ? slide.content.bullets
    : typeof slide.content?.body === 'string'
      ? slide.content.body.split('\n').filter(Boolean)
      : [];

  return (
    <div
      className="w-full h-full flex flex-col p-12"
      style={{ backgroundColor: theme.bg, color: theme.text, aspectRatio: '16/9' }}
    >
      {/* Accent bar */}
      <div className="w-16 h-1 rounded-full mb-6" style={{ backgroundColor: theme.accent }} />

      {/* Title */}
      <h1 className="text-4xl font-bold mb-4 leading-tight" style={{ color: theme.text }}>
        {slide.title}
      </h1>

      {/* Subtitle */}
      {slide.subtitle && (
        <p className="text-xl mb-6 opacity-70" style={{ color: theme.text }}>
          {slide.subtitle}
        </p>
      )}

      {/* Bullets */}
      {bullets.length > 0 && (
        <ul className="space-y-3 mt-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.accent }} />
              <span className="text-lg opacity-85" style={{ color: theme.text }}>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Slide number */}
      <div className="mt-auto text-sm opacity-30" style={{ color: theme.text }}>
        {slide.order}
      </div>
    </div>
  );
}
