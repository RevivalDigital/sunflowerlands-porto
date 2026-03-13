import React from 'react'
import { clsx } from 'clsx'

// ── PixelCard ─────────────────────────────────────────────────────────────
interface PixelCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue'
  title?: string
  headerAction?: React.ReactNode
}

export function PixelCard({ children, className, variant = 'default', title, headerAction }: PixelCardProps) {
  const variantClass = {
    default: 'pixel-border',
    gold:    'pixel-border-gold',
    green:   'pixel-border-green',
    red:     'pixel-border-red',
    blue:    'pixel-border-blue',
  }[variant]

  return (
    <div className={clsx('bg-pixel-panel', variantClass, className)}>
      {title && (
        <div className={clsx(
          'flex items-center justify-between px-4 py-2 border-b-2',
          variant === 'gold' ? 'border-pixel-gold' : 'border-pixel-border'
        )}>
          <h3 className={clsx(
            'font-pixel text-xs',
            variant === 'gold' ? 'text-pixel-gold' : 'text-pixel-text'
          )} style={{ fontSize: '9px' }}>
            {title}
          </h3>
          {headerAction}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon?: string
  trend?: number
  variant?: 'default' | 'gold' | 'green' | 'red'
}

export function StatCard({ label, value, sub, icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: { border: 'pixel-border',       text: 'text-pixel-text' },
    gold:    { border: 'pixel-border-gold',   text: 'text-pixel-gold glow-gold' },
    green:   { border: 'pixel-border-green',  text: 'text-pixel-green glow-green' },
    red:     { border: 'pixel-border-red',    text: 'text-pixel-red glow-red' },
  }[variant]

  return (
    <div className={clsx('bg-pixel-panel p-4', variantStyles.border)}>
      <div className="flex items-start justify-between mb-2">
        <p className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>{label}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className={clsx('font-pixel text-xl leading-tight', variantStyles.text)}
        style={{ fontSize: '18px' }}>
        {value}
      </p>
      {sub && <p className="font-body text-pixel-muted text-lg mt-1">{sub}</p>}
      {trend !== undefined && (
        <p className={clsx('font-pixel mt-1', trend >= 0 ? 'text-pixel-green' : 'text-pixel-red')}
          style={{ fontSize: '8px' }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(2)}%
        </p>
      )}
    </div>
  )
}

// ── PixelButton ───────────────────────────────────────────────────────────
interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'green' | 'red' | 'blue' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function PixelButton({ children, variant = 'gold', size = 'md', className, ...props }: PixelButtonProps) {
  const variantStyles = {
    gold:  'bg-pixel-gold text-pixel-bg border-2 border-pixel-gold hover:bg-yellow-300',
    green: 'bg-pixel-green text-white border-2 border-pixel-green hover:bg-green-400',
    red:   'bg-pixel-red text-white border-2 border-pixel-red hover:bg-red-400',
    blue:  'bg-pixel-blue text-white border-2 border-pixel-blue hover:bg-blue-400',
    ghost: 'bg-transparent text-pixel-muted border-2 border-pixel-border hover:border-pixel-text hover:text-pixel-text',
  }[variant]

  const shadowStyles = {
    gold:  { boxShadow: '3px 3px 0 #c9952a' },
    green: { boxShadow: '3px 3px 0 #1e7a2e' },
    red:   { boxShadow: '3px 3px 0 #8b1a1a' },
    blue:  { boxShadow: '3px 3px 0 #1a3a6e' },
    ghost: { boxShadow: '3px 3px 0 #000' },
  }[variant]

  const sizeStyles = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
  }[size]

  return (
    <button
      className={clsx(
        'pixel-btn font-pixel',
        variantStyles,
        sizeStyles,
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
      style={{ ...shadowStyles, fontSize: '9px' }}
      {...props}>
      {children}
    </button>
  )
}

// ── PixelBadge ────────────────────────────────────────────────────────────
interface PixelBadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function PixelBadge({ children, color = '#f7c948', className }: PixelBadgeProps) {
  return (
    <span
      className={clsx('pixel-badge inline-block', className)}
      style={{ color, borderColor: color, boxShadow: `2px 2px 0 #000` }}>
      {children}
    </span>
  )
}

// ── PixelTable ────────────────────────────────────────────────────────────
interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface PixelTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export function PixelTable<T extends { id: string }>({
  columns, data, emptyMessage = 'NO DATA', onRowClick
}: PixelTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="pixel-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.className}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8">
                <p className="font-pixel text-pixel-muted" style={{ fontSize: '9px' }}>
                  {emptyMessage}
                </p>
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer' : ''}>
                {columns.map(col => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── PixelSelect ───────────────────────────────────────────────────────────
interface PixelSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function PixelSelect({ label, options, className, ...props }: PixelSelectProps) {
  return (
    <div className={className}>
      {label && <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>{label}</label>}
      <select
        className="pixel-input appearance-none cursor-pointer"
        {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── PixelInput ────────────────────────────────────────────────────────────
interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function PixelInput({ label, className, ...props }: PixelInputProps) {
  return (
    <div className={className}>
      {label && <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>{label}</label>}
      <input className="pixel-input" {...props} />
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────────────
export function PageHeader({ icon, title, subtitle, action }: {
  icon: string; title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <h1 className="font-pixel text-pixel-gold glow-gold" style={{ fontSize: '14px' }}>{title}</h1>
        </div>
        {subtitle && (
          <p className="font-body text-pixel-muted text-xl mt-1 ml-9">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, message, action }: {
  icon: string; title: string; message: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-6xl mb-4 animate-float">{icon}</span>
      <h3 className="font-pixel text-pixel-muted mb-2" style={{ fontSize: '10px' }}>{title}</h3>
      <p className="font-body text-pixel-muted text-lg mb-4">{message}</p>
      {action}
    </div>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────
export function PixelLoading({ message = 'LOADING...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="font-pixel text-pixel-gold text-xs animate-pixel-blink mb-4">{message}</p>
      <div className="pixel-progress w-48">
        <div className="pixel-progress-fill animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  )
}
