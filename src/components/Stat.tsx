import type { ReactNode } from 'react'
import { useT } from '../i18n'

interface StatProps {
  label: string
  /** `null` means "not measurable yet" and renders differently from a real zero. */
  value: number | string | null
  hint?: string
  format?: 'number' | 'percent' | 'duration'
  tone?: 'default' | 'good' | 'bad' | 'warn'
}

const numberFormat = new Intl.NumberFormat()

function formatValue(value: number | string, format: StatProps['format']): string {
  if (typeof value === 'string') return value
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`
    case 'duration':
      return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s`
    default:
      return numberFormat.format(value)
  }
}

/**
 * One number, its label, and — when it matters — why it might be missing.
 *
 * A null value renders as "not measured yet" rather than as 0. That distinction is the whole reason
 * this component takes `number | null` instead of defaulting: task completions were genuinely
 * unmeasurable before the completion timestamp shipped, and a confident 0 there would read as "nobody
 * finished anything today".
 */
export function Stat({ label, value, hint, format = 'number', tone = 'default' }: StatProps) {
  const { t } = useT()
  const toneColor =
    tone === 'good' ? 'var(--success)' : tone === 'bad' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : undefined

  return (
    <div className="card">
      <p className="stat__label">{label}</p>
      {value === null ? (
        <>
          <p className="stat__value" style={{ color: 'var(--muted)', fontSize: 18 }}>
            {t('notMeasuredYet')}
          </p>
          <p className="stat__hint">{t('notMeasuredYetHint')}</p>
        </>
      ) : (
        <>
          <p className="stat__value" style={toneColor ? { color: toneColor } : undefined}>
            {formatValue(value, format)}
          </p>
          {hint && <p className="stat__hint">{hint}</p>}
        </>
      )}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
