import {
  Bar,
  BarChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'

function EmptyChart({ title }) {
  return (
    <div className="card">
      <div className="card-header"><h3>{title}</h3></div>
      <div
        className="card-body"
        style={{
          minHeight: '230px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#718096'
        }}
      >
        Aucune donnée disponible
      </div>
    </div>
  )
}

export function LineColorLegend({ lines = [] }) {
  if (!lines.length) return null

  return (
    <div className="line-legend">
      {lines.map((line) => (
        <div key={line.id} className="line-legend-item">
          <span
            className="line-legend-dot"
            style={{ backgroundColor: line.color }}
            aria-hidden="true"
          />
          <span>{line.nom}</span>
        </div>
      ))}
    </div>
  )
}

export function KpiRectChart({
  title,
  unit = '%',
  target,
  series = [],
  data = []
}) {
  if (!data.length || !series.length) {
    return <EmptyChart title={title} />
  }

  return (
    <div className="card chart-rect-card">
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body chart-rect-body">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data} margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              stroke="#475569"
              tick={{ fontSize: 12 }}
              tickMargin={8}
              minTickGap={18}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#475569"
              tick={{ fontSize: 12 }}
              tickMargin={8}
              width={42}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
              formatter={(value) => `${value}${unit}`}
            />
            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />

            {typeof target === 'number' && (
              <ReferenceLine
                y={target}
                stroke="#d69e2e"
                strokeDasharray="6 4"
                label={{
                  value: `Objectif ${target}${unit}`,
                  fill: '#b45309',
                  fontSize: 11,
                  position: 'insideTopRight'
                }}
              />
            )}

            {series.map((line) => (
              <Line
                key={line.key}
                name={line.label}
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: line.color }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function ProductionLineChart({
  title,
  data = [],
  unit = '%'
}) {
  if (!data.length) {
    return <EmptyChart title={title} />
  }

  const keys = Object.keys(data[0] || {}).filter((key) => key !== 'date')
  if (!keys.length) {
    return <EmptyChart title={title} />
  }

  const colors = ['#1d4ed8', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#059669']
  const productLabels = ['DIW', 'SI2X', 'NOS', 'SI', 'DEC']

  return (
    <div className="card chart-rect-card">
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body chart-rect-body">
        <div className="production-line-legend" aria-label={`${title} - légende des lignes`}>
          {keys.map((key, index) => {
            const lineNumber = index + 1
            const color = colors[index % colors.length]
            const productLabel = productLabels[index] || key

            return (
              <div key={key} className="production-line-legend-item">
                <div className="production-line-legend-line">Ligne {lineNumber}</div>
                <div className="production-line-legend-product">
                  <span className="line-legend-dot" style={{ backgroundColor: color }} aria-hidden="true" />
                  <span>{productLabel}</span>
                </div>
              </div>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={data} margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              stroke="#475569"
              tick={{ fontSize: 12 }}
              tickMargin={8}
              minTickGap={18}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#475569"
              tick={{ fontSize: 12 }}
              tickMargin={8}
              width={42}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
              formatter={(value) => `${value}${unit}`}
            />

            {keys.map((key, index) => {
              const color = colors[index % colors.length]

              return (
                <Line
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function MultiKpiRectChart({
  title,
  data = [],
  series = [],
  objectives = [],
  unit = '%',
  chartHeight = 260,
  compact = false
}) {
  if (!data.length || !series.length) {
    return <EmptyChart title={title} />
  }

  return (
    <div className="card chart-rect-card">
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className={`card-body chart-rect-body chart-multi-kpi-body${compact ? ' is-compact' : ''}`}>
        <div className="chart-objectives-panel">
          <div className="chart-objectives-header">Objectifs</div>
          <div className="chart-objectives-list">
            {objectives.map((item) => (
              <div key={item.name} className="chart-objective-item">
                <span className="chart-objective-name">{item.name}</span>
                <span className="chart-objective-value">{item.target}{item.unit || unit}</span>
              </div>
            ))}
          </div>
          <div className="chart-objectives-hint">
            <span>Couleurs → lignes</span>
            <span>Axe X → KPI</span>
          </div>
        </div>

        <div className="chart-bars-area" style={{ minHeight: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 10, bottom: 18 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" vertical={false} />
              <XAxis
                dataKey="kpi"
                tick={{ fontSize: 12, fontWeight: 700, fill: '#1f2937' }}
                tickMargin={6}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#334155' }}
                tickMargin={6}
                width={36}
                domain={[0, 100]}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                tickCount={6}
              />
              <Tooltip
                contentStyle={{
                  background: '#0d1f3c',
                  border: '1px solid rgba(23,124,244,0.3)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  boxShadow: '0 8px 24px rgba(13,31,60,0.35)'
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginBottom: 2 }}
                itemStyle={{ color: '#ffffff', fontSize: 11, fontWeight: 600 }}
                formatter={(value, name) => [`${value}${unit}`, name]}
                labelFormatter={(label) => label}
                cursor={{ fill: 'rgba(23,124,244,0.05)' }}
              />
              {series.map((line) => (
                <Bar
                  key={line.key}
                  name={line.label}
                  dataKey={line.key}
                  fill={line.color}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={14}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
