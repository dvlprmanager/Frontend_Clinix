import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'

const ChartContext = React.createContext(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }
  return context
}

function ChartContainer({ id, className, children, config, ...props }) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border [&_.recharts-sector[stroke="#fff"]]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none',
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }) {
  const colorConfig = Object.entries(config || {}).filter(([, cfg]) => cfg?.color || cfg?.theme)
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, cfg]) => {
    const color = cfg.theme?.light || cfg.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join('\n')}
}
`,
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  formatter,
  labelFormatter,
  hideLabel = false,
  hideIndicator = false,
  indicator = 'dot',
  ...props
}) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  const label = payload[0]?.name || payload[0]?.payload?.name

  return (
    <div className={cn('grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl', className)} {...props}>
      {!hideLabel ? (
        <div className="font-medium text-foreground">
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = item.dataKey || item.name || 'value'
          const chartCfg = config?.[key] || {}
          const indicatorColor = item.color || `var(--color-${key})`

          return (
            <div key={`${key}-${index}`} className="flex w-full items-center gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5">
              {!hideIndicator ? (
                <div
                  className={cn('shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]', {
                    'h-2.5 w-2.5': indicator === 'dot',
                    'w-1': indicator === 'line',
                  })}
                  style={{
                    '--color-bg': indicatorColor,
                    '--color-border': indicatorColor,
                  }}
                />
              ) : null}
              <div className="flex flex-1 items-center justify-between leading-none">
                <span className="text-muted-foreground">{chartCfg.label || item.name}</span>
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {formatter ? formatter(item.value, item.name, item, index, item.payload) : item.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({ className, payload, verticalAlign = 'bottom' }) {
  const { config } = useChart()

  if (!payload?.length) return null

  return (
    <div className={cn('flex items-center justify-center gap-4', verticalAlign === 'top' ? 'pb-3' : 'pt-3', className)}>
      {payload.map((item) => {
        const key = item.dataKey || item.value
        const chartCfg = config?.[key]
        return (
          <div key={key} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{chartCfg?.label || item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
}
