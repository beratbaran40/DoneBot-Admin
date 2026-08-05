import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SeriesPoint } from '../api/types'

interface TrendChartProps {
  title: string
  points: SeriesPoint[]
  /** 1-5, matching the validated --series-N tokens. Assigned in fixed order, never cycled. */
  slot: 1 | 2 | 3 | 4 | 5
}

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

/**
 * Props are declared locally rather than imported from Recharts. Its tooltip prop types have already
 * been reshaped once across a major version; describing only the three fields actually read here keeps
 * the component from breaking on the next one.
 */
interface TooltipRenderProps {
  active?: boolean
  payload?: { value?: number | string }[]
  label?: unknown
}

function CustomTooltip({ active, payload, label }: TooltipRenderProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="card"
      style={{ padding: '8px 12px', boxShadow: 'var(--shadow)', pointerEvents: 'none' }}
    >
      <div className="subtle" style={{ fontSize: 11 }}>
        {String(label)} UTC
      </div>
      <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{payload[0]?.value ?? 0}</div>
    </div>
  )
}

/**
 * One series per chart — small multiples, not five lines sharing an axis.
 *
 * New signups, active users and DoneBot requests differ by an order of magnitude, and putting them on
 * one plot would either flatten the small series into the baseline or force a second y-axis. A
 * dual-axis chart lets the author decide which line "wins" by choosing scales, so it is simply not an
 * option; separate panels let each series keep its own scale and stay honest.
 *
 * A single series also means no legend is needed: the title names it, which is exactly the direct
 * labelling that makes the palette's residual colour-vision warning acceptable.
 */
export function TrendChart({ title, points, slot }: TrendChartProps) {
  const colour = `var(--series-${slot})`
  const data = points.map((point) => ({
    ...point,
    label: dayFormat.format(new Date(`${point.date}T00:00:00Z`)),
  }))

  return (
    <div className="card">
      <p className="stat__label">{title}</p>
      <div style={{ height: 140, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
            {/* Recessive: the grid orients, it does not compete with the data. */}
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--muted)' }}
              tickLine={false}
              axisLine={false}
              // 30 labels would collide on a phone; show roughly one a week.
              interval={Math.max(0, Math.floor(data.length / 4) - 1)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--muted)' }}
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--grid)', strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colour}
              strokeWidth={2}
              dot={false}
              // Comfortably larger than the line, so the hovered point is unambiguous.
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
