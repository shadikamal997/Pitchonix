'use client';

// =============================================================================
//  Pitchonix Dashboard Design System — shared primitives.
//
//  These components are the single source of truth for the redesigned
//  dashboard surface. Every dashboard page should consume them so the
//  product feels like one premium, unified app.
//
//  Tokens live in `tailwind.config.js` (colors / shadows) and
//  `app/globals.css` (CSS variables + .pn-* classes).
//
//  Palette summary:
//    page:           #EDEBE6  (warm beige background)
//    surface:        #FFFFFF  (cards, modals, primary surface)
//    surface-soft:   #F7F6F2  (panels, hover, soft sections)
//    surface-muted:  #F1F0EC  (chips, skeletons, muted backgrounds)
//    sage / sage-700/800/dark: #4F7563 / #355846 / #263F34
//    line:           #E3E1DA  (borders)
//    ok/warn/danger: #4F7563 / #D9A441 / #D96A6A
// =============================================================================

import React from 'react';
import { ChevronRight, Search, Bell, X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
//  <DashboardShell>
//  Page wrapper that sets the beige background + standard content padding.
// -----------------------------------------------------------------------------
export const DashboardShell: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** When true, removes the default 32px padding (use for canvas pages). */
  flush?: boolean;
}> = ({ children, className, flush }) => (
  <div className={cn('pn-page w-full', flush ? '' : 'p-6 lg:p-8', className)}>
    {children}
  </div>
);

// -----------------------------------------------------------------------------
//  <DashboardHeader>
//  Top header on every dashboard page: title, subtitle, optional icon,
//  pill search bar (optional), and right-side action slots.
// -----------------------------------------------------------------------------
export const DashboardHeader: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Optional search box. Pass `false` to hide. */
  search?: false | {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    onSubmit?: () => void;
  };
  actions?: React.ReactNode;
  /** Optional decorative element rendered above the title (e.g. greeting chip). */
  eyebrow?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon: Icon, search, actions, eyebrow, className }) => {
  return (
    <header className={cn('flex flex-col gap-5 mb-6 lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="flex items-start gap-4 min-w-0">
        {Icon ? (
          <div className="pn-icon-circle shrink-0 mt-1">
            <Icon className="w-5 h-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <div className="pn-label mb-1.5">{eyebrow}</div> : null}
          <h1 className="pn-h1 truncate">{title}</h1>
          {subtitle ? (
            <p className="pn-body text-[#6B6B6B] mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-4 flex-wrap">
        {search ? (
          <SearchPill
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder}
            onSubmit={search.onSubmit}
            className="hidden md:flex w-[280px] lg:w-[360px] xl:w-[420px]"
          />
        ) : null}
        {actions}
      </div>
    </header>
  );
};

// -----------------------------------------------------------------------------
//  <SearchPill>
//  Reference-style pill search bar with leading icon + dark submit button.
// -----------------------------------------------------------------------------
export const SearchPill: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search…', onSubmit, className }) => {
  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
      className={cn('relative flex items-center', className)}
    >
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pn-search-pill pl-12 pr-14"
        aria-label="Search"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 pn-icon-btn pn-icon-btn-dark pn-icon-btn-sm"
      >
        <Search className="w-4 h-4" />
      </button>
    </form>
  );
};

// -----------------------------------------------------------------------------
//  <DashboardCard>
//  Premium soft white card. Variants control padding / emphasis.
// -----------------------------------------------------------------------------
export const DashboardCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** Padding preset. */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** Use soft beige background instead of white. */
  tone?: 'surface' | 'soft' | 'muted';
  /** Make card hoverable (lift + cursor pointer). */
  interactive?: boolean;
  as?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
}> = ({ children, className, padding = 'md', tone = 'surface', interactive, as: Tag = 'div', onClick, role, tabIndex }) => {
  const padCls =
    padding === 'sm' ? 'p-5' :
    padding === 'lg' ? 'p-7 lg:p-8' :
    padding === 'none' ? '' :
    'p-6';
  const toneCls =
    tone === 'soft'  ? 'pn-card-soft' :
    tone === 'muted' ? 'bg-[#F1F0EC] border border-[#E3E1DA]/60 rounded-3xl' :
    'pn-card';
  const interactiveCls = interactive
    ? 'cursor-pointer transition hover:shadow-lifted hover:-translate-y-0.5'
    : '';
  const TagAny = Tag as any;
  return <TagAny className={cn(toneCls, padCls, interactiveCls, className)} onClick={onClick} role={role} tabIndex={tabIndex}>{children}</TagAny>;
};

// -----------------------------------------------------------------------------
//  <PageSection>
//  Vertical section with optional title row + action slot.
// -----------------------------------------------------------------------------
export const PageSection: React.FC<{
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, actions, children, className }) => (
  <section className={cn('flex flex-col gap-4', className)}>
    {(title || actions) ? (
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {title ? <h2 className="pn-h2">{title}</h2> : null}
          {description ? <p className="pn-body text-[#6B6B6B] mt-1">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
      </div>
    ) : null}
    {children}
  </section>
);

// -----------------------------------------------------------------------------
//  <MetricCard>
//  KPI card with label, big number, optional trend pill, optional sparkline.
// -----------------------------------------------------------------------------
export const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  hint?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ label, value, icon: Icon, trend, hint, className, children }) => {
  return (
    <DashboardCard className={cn('flex flex-col gap-3', className)} padding="md">
      <div className="flex items-center justify-between">
        <span className="pn-label uppercase">{label}</span>
        {Icon ? (
          <div className="pn-icon-circle" style={{ width: 36, height: 36 }}>
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="pn-metric">{value}</div>
        {trend ? (
          <StatusBadge tone={trend.direction === 'down' ? 'danger' : 'success'}>
            {trend.direction === 'down' ? '↓' : trend.direction === 'flat' ? '·' : '↑'} {trend.value}
          </StatusBadge>
        ) : null}
      </div>
      {hint ? <div className="pn-body text-[#6B6B6B]">{hint}</div> : null}
      {children}
    </DashboardCard>
  );
};

// -----------------------------------------------------------------------------
//  <SoftButton>
//  Standard dashboard button. Tones: primary (sage), secondary (white),
//  dark (black), danger.
// -----------------------------------------------------------------------------
export const SoftButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost';
    icon?: LucideIcon;
    iconRight?: LucideIcon;
    block?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
>(({ tone = 'primary', icon: Icon, iconRight: IconRight, block, size = 'md', className, children, ...rest }, ref) => {
  const toneCls =
    tone === 'secondary' ? 'pn-btn-secondary' :
    tone === 'dark'      ? 'pn-btn-dark' :
    tone === 'danger'    ? 'pn-btn-danger' :
    tone === 'ghost'     ? 'bg-transparent text-[#111111] hover:bg-[#F1F0EC]' :
    'pn-btn-primary';
  const sizeCls =
    size === 'sm' ? 'h-9 px-3.5 text-[13px] rounded-xl' :
    size === 'lg' ? 'h-12 px-6 text-[15px] rounded-2xl' :
    '';
  return (
    <button
      ref={ref}
      {...rest}
      className={cn('pn-btn', toneCls, sizeCls, block && 'w-full', className)}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
      {IconRight ? <IconRight className="w-4 h-4" /> : null}
    </button>
  );
});
SoftButton.displayName = 'SoftButton';

// -----------------------------------------------------------------------------
//  <SoftIconButton>
//  Circular icon button (48 / 40 px). Default uses white surface.
// -----------------------------------------------------------------------------
export const SoftIconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: LucideIcon;
    tone?: 'white' | 'dark' | 'sage';
    size?: 'sm' | 'md';
    label: string;
  }
>(({ icon: Icon, tone = 'white', size = 'md', label, className, ...rest }, ref) => {
  const toneCls =
    tone === 'dark' ? 'pn-icon-btn-dark' :
    tone === 'sage' ? 'bg-[#4F7563] text-white hover:bg-[#355846]' :
    '';
  const sizeCls = size === 'sm' ? 'pn-icon-btn-sm' : '';
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      {...rest}
      className={cn('pn-icon-btn', toneCls, sizeCls, className)}
    >
      <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
    </button>
  );
});
SoftIconButton.displayName = 'SoftIconButton';

// -----------------------------------------------------------------------------
//  <SoftInput>
//  Standard form input matching the design system.
// -----------------------------------------------------------------------------
export const SoftInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    className={cn(
      'pn-input',
      invalid && 'border-[#D96A6A] focus:border-[#D96A6A] focus:shadow-[0_0_0_3px_rgba(217,106,106,0.18)]',
      className,
    )}
  />
));
SoftInput.displayName = 'SoftInput';

// -----------------------------------------------------------------------------
//  <SoftTextarea>
//  Standard textarea matching the design system.
// -----------------------------------------------------------------------------
export const SoftTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => (
  <textarea
    ref={ref}
    {...rest}
    className={cn(
      'w-full px-4 py-3 bg-white border border-[#E3E1DA] rounded-[14px] text-sm text-[#111111] placeholder:text-[#9A9A9A]',
      'focus:outline-none focus:border-[#4F7563] focus:shadow-[0_0_0_3px_rgba(79,117,99,0.15)]',
      'transition',
      className,
    )}
  />
));
SoftTextarea.displayName = 'SoftTextarea';

// -----------------------------------------------------------------------------
//  <FormLabel>
//  Small uppercase label used for form fields.
// -----------------------------------------------------------------------------
export const FormLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, children, ...rest }) => (
  <label {...rest} className={cn('block text-xs font-semibold text-[#6B6B6B] mb-1.5', className)}>
    {children}
  </label>
);

// -----------------------------------------------------------------------------
//  <StatusBadge>
//  Small rounded pill used for statuses, trends, counts.
// -----------------------------------------------------------------------------
export const StatusBadge: React.FC<{
  tone?: 'success' | 'warn' | 'danger' | 'neutral' | 'sage';
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'neutral', className, children }) => {
  const toneCls =
    tone === 'success' ? 'pn-badge-success' :
    tone === 'warn'    ? 'pn-badge-warn' :
    tone === 'danger'  ? 'pn-badge-danger' :
    tone === 'sage'    ? 'bg-[#4F7563] text-white' :
    'pn-badge-neutral';
  return <span className={cn('pn-badge', toneCls, className)}>{children}</span>;
};

// -----------------------------------------------------------------------------
//  <SoftTable>
//  Tables rendered as soft cards. Pass `columns` + `rows`, or use it
//  generically with table children for full control.
// -----------------------------------------------------------------------------
export const SoftTable: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...rest }) => (
  <div {...rest} className={cn('pn-card overflow-hidden', className)}>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">{children}</table>
    </div>
  </div>
);

export const SoftTableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...rest }) => (
  <thead {...rest} className={cn('text-[#8A8A8A]', className)}>{children}</thead>
);

export const SoftTableHeader: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...rest }) => (
  <th {...rest} className={cn('text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A] border-b border-[#F1F0EC]', className)}>
    {children}
  </th>
);

export const SoftTableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className, ...rest }) => (
  <tr {...rest} className={cn('border-b border-[#F1F0EC] hover:bg-[#F7F6F2] transition-colors', className)}>{children}</tr>
);

export const SoftTableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...rest }) => (
  <td {...rest} className={cn('px-4 py-4 text-sm text-[#111111] align-middle', className)}>{children}</td>
);

// -----------------------------------------------------------------------------
//  <SoftEmptyState>
//  Premium empty-state card with icon circle, title, description, CTAs.
// -----------------------------------------------------------------------------
export const SoftEmptyState: React.FC<{
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  primaryCta?: { label: string; onClick: () => void; icon?: LucideIcon };
  secondaryCta?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}> = ({ icon: Icon, title, description, primaryCta, secondaryCta, className }) => (
  <DashboardCard padding="lg" className={cn('text-center flex flex-col items-center gap-4', className)}>
    {Icon ? (
      <div className="w-16 h-16 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
        <Icon className="w-7 h-7" />
      </div>
    ) : null}
    <div className="space-y-1.5 max-w-md">
      <h3 className="pn-h2">{title}</h3>
      {description ? <p className="pn-body text-[#6B6B6B]">{description}</p> : null}
    </div>
    {(primaryCta || secondaryCta) ? (
      <div className="flex gap-2 flex-wrap justify-center pt-2">
        {primaryCta ? (
          <SoftButton onClick={primaryCta.onClick} icon={primaryCta.icon}>
            {primaryCta.label}
          </SoftButton>
        ) : null}
        {secondaryCta ? (
          <SoftButton tone="secondary" onClick={secondaryCta.onClick} icon={secondaryCta.icon}>
            {secondaryCta.label}
          </SoftButton>
        ) : null}
      </div>
    ) : null}
  </DashboardCard>
);

// -----------------------------------------------------------------------------
//  <SoftSkeleton>
//  Skeleton block with shimmer.
// -----------------------------------------------------------------------------
export const SoftSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('pn-skeleton', className)} />
);

// -----------------------------------------------------------------------------
//  <SoftDivider>
// -----------------------------------------------------------------------------
export const SoftDivider: React.FC<{ className?: string }> = ({ className }) => (
  <hr className={cn('pn-divider', className)} />
);

// -----------------------------------------------------------------------------
//  <ActionToolbar>
//  Soft toolbar row sitting above tables / lists.
// -----------------------------------------------------------------------------
export const ActionToolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex items-center gap-2 flex-wrap', className)}>{children}</div>
);

// -----------------------------------------------------------------------------
//  <Crumb> / <SoftBreadcrumb>
// -----------------------------------------------------------------------------
export const SoftBreadcrumb: React.FC<{ items: { label: string; href?: string }[]; className?: string }> = ({ items, className }) => (
  <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-xs text-[#6B6B6B] min-w-0', className)}>
    {items.map((it, i) => {
      const last = i === items.length - 1;
      return (
        <React.Fragment key={i}>
          {i > 0 ? <ChevronRight className="w-3 h-3 text-[#C9C6BD] shrink-0" /> : null}
          {last || !it.href ? (
            <span className={cn('truncate', last && 'text-[#111111] font-semibold')}>{it.label}</span>
          ) : (
            <a href={it.href} className="hover:text-[#111111] truncate">{it.label}</a>
          )}
        </React.Fragment>
      );
    })}
  </nav>
);

// -----------------------------------------------------------------------------
//  <SoftModal>
//  Standard modal/dialog matching the design system.
//  Lightweight — for richer modals continue using ConfirmDialog / PreviewModal.
// -----------------------------------------------------------------------------
export const SoftModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  if (!open) return null;
  const sizeCls =
    size === 'sm' ? 'max-w-md' :
    size === 'lg' ? 'max-w-2xl' :
    size === 'xl' ? 'max-w-4xl' :
    'max-w-lg';
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn('relative w-full bg-white rounded-[28px] shadow-modal', sizeCls)}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-5 right-5 pn-icon-btn pn-icon-btn-sm"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-7 pr-16">
          <h2 className="pn-h2">{title}</h2>
          {description ? <p className="pn-body text-[#6B6B6B] mt-1.5">{description}</p> : null}
        </div>
        {children ? <div className="px-7 pb-5">{children}</div> : null}
        {footer ? (
          <div className="px-7 pb-7 pt-4 flex items-center justify-end gap-2 border-t border-[#F1F0EC]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
//  <SoftErrorCard>
//  Soft red error state card.
// -----------------------------------------------------------------------------
export const SoftErrorCard: React.FC<{
  title?: string;
  message?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}> = ({ title = 'Something went wrong', message, onRetry, className }) => (
  <div className={cn('rounded-3xl border border-[#F7E3E3] bg-[#FCF1F1] p-6 text-[#9a3737] flex flex-col gap-3', className)} role="alert">
    <h3 className="pn-h3 text-[#9a3737]">{title}</h3>
    {message ? <p className="pn-body text-[#a05858]">{message}</p> : null}
    {onRetry ? (
      <div>
        <SoftButton tone="secondary" size="sm" onClick={onRetry}>Retry</SoftButton>
      </div>
    ) : null}
  </div>
);

// -----------------------------------------------------------------------------
//  <NotificationButton>
//  Convenience: circular notification button.
// -----------------------------------------------------------------------------
export const NotificationButton: React.FC<{ count?: number; onClick?: () => void }> = ({ count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Notifications"
    className="relative pn-icon-btn"
  >
    <Bell className="w-5 h-5" />
    {count && count > 0 ? (
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#D96A6A] text-white text-[10px] font-bold flex items-center justify-center">
        {count > 99 ? '99+' : count}
      </span>
    ) : null}
  </button>
);

// -----------------------------------------------------------------------------
//  <Avatar>
// -----------------------------------------------------------------------------
export const SoftAvatar: React.FC<{
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ name, email, src, size = 'md', className }) => {
  const sizeCls =
    size === 'sm' ? 'w-8 h-8 text-xs' :
    size === 'lg' ? 'w-12 h-12 text-base' :
    'w-10 h-10 text-sm';
  const initial = (name || email || 'U').trim()[0]?.toUpperCase() ?? 'U';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || email || 'User'}
        className={cn('rounded-full object-cover ring-[3px] ring-white shadow-[0_8px_20px_rgba(0,0,0,0.08)]', sizeCls, className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full bg-[#EFEAE0] text-[#355846] font-semibold flex items-center justify-center ring-[3px] ring-white shadow-[0_8px_20px_rgba(0,0,0,0.08)]',
        sizeCls,
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
};

// =============================================================================
//  Re-export some commonly co-located atoms so pages can import from one path.
// =============================================================================
export const tokens = {
  page:           '#EDEBE6',
  surface:        '#FFFFFF',
  surfaceSoft:    '#F7F6F2',
  surfaceMuted:   '#F1F0EC',
  ink:            '#111111',
  inkSoft:        '#6B6B6B',
  inkMuted:       '#9A9A9A',
  line:           '#E3E1DA',
  sage:           '#4F7563',
  sageDark:       '#355846',
  sageDeep:       '#263F34',
  sageSoft:       '#DDE8E1',
  sagePale:       '#EEF5F1',
  ok:             '#4F7563',
  okSoft:         '#E6F0EA',
  warn:           '#D9A441',
  warnSoft:       '#FAEEDB',
  danger:         '#D96A6A',
  dangerSoft:     '#F7E3E3',
} as const;
