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

export function MultiKpiRectChart({
  title,
  data = [],
  series = [],
  objectives = [],
  unit = '%'
}) {
  if (!data.length || !series.length) {
    return <EmptyChart title={title} />
  }

  return (
    <div className="card chart-rect-card">
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body chart-rect-body" style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <div
          style={{
            width: 190,
            minWidth: 190,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 12,
            background: '#f8fafc'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
            Objectifs
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {objectives.map((item) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  fontSize: 12
                }}
              >
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: '#334155' }}>{item.target}{item.unit || unit}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
            Couleurs: lignes de production
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
            Axe X: TRG / FOR / FPY
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="kpi"
                stroke="#475569"
                tick={{ fontSize: 12 }}
                tickMargin={8}
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
                labelFormatter={(label) => `KPI: ${label}`}
              />
              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />

              {series.map((line) => (
                <Bar
                  key={line.key}
                  name={line.label}
                  dataKey={line.key}
                  fill={line.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
