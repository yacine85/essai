import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, LabelList,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { BarChart2, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const KPI_KEYS = ['TRG', 'FOR', 'FPY']

const KPI_META = {
  TRG: { color: '#16a34a', bg: '#dcfce7', text: '#166534' },
  FOR: { color: '#2563eb', bg: '#dbeafe', text: '#1e40af' },
  FPY: { color: '#ea580c', bg: '#ffedd5', text: '#9a3412' },
}

const PERIODS = [
  { value: 'day-1',   label: 'Jour -1',  days: 1  },
  { value: 'week-1',  label: 'Sem. -1',  days: 7  },
  { value: 'month-1', label: 'Mois -1',  days: 30 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period) {
  const opt = PERIODS.find((p) => p.value === period) || PERIODS[1]
  const fmt = (d) => d.toISOString().split('T')[0]
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - opt.days)
  return { start: fmt(start), end: fmt(end) }
}

function normalizeText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Renvoie uniquement le premier atelier CMS et le premier atelier INTEG */
function filterTargetAteliers(list) {
  const cms   = list.find((a) => normalizeText(a.nom).includes('cms'))
  const integ = list.find((a) => normalizeText(a.nom).includes('integr'))
  return [cms, integ].filter(Boolean)
}

function parseLineNumber(nom) {
  const m = String(nom || '').match(/ligne\s*([1-5])/i)
  return m ? Number(m[1]) : null
}

function parseProductName(nom) {
  const m = String(nom || '').match(/ligne\s*[1-5]\s*[-:|]\s*(.+)/i)
  return m ? String(m[1]).trim() : String(nom || '').trim()
}

function avg(arr) {
  if (!arr || arr.length === 0) return null
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function pct(v) {
  return v !== null && v !== undefined ? `${Number(v).toFixed(1)}%` : '—'
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '10px 14px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', minWidth: 155,
    }}>
      <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 8px', fontSize: 12 }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
          <span style={{ color: '#64748b', fontSize: 11, flex: 1 }}>{entry.name}</span>
          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 11 }}>
            {entry.value !== null ? `${Number(entry.value).toFixed(1)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Reports() {
  const { getAuthHeader } = useAuth()
  const authHeader = useMemo(() => getAuthHeader(), [getAuthHeader])

  const [allAteliers,     setAllAteliers]     = useState([])
  const [lignes,          setLignes]          = useState([])
  const [history,         setHistory]         = useState([])
  const [selectedAtelier, setSelectedAtelier] = useState('')
  const [mode,            setMode]            = useState('line')
  const [selectedIds,     setSelectedIds]     = useState(new Set())
  const [period,          setPeriod]          = useState('week-1')
  const [loading,         setLoading]         = useState(true)
  const [loadingData,     setLoadingData]     = useState(false)
  const [error,           setError]           = useState('')

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, lRes] = await Promise.all([
          fetch(`${API_URL}/ateliers`, { headers: authHeader }),
          fetch(`${API_URL}/lignes`,   { headers: authHeader }),
        ])
        const [a, l] = await Promise.all([aRes.json(), lRes.json()])
        const full = Array.isArray(a) ? a : []
        setAllAteliers(full)
        setLignes(Array.isArray(l) ? l : [])
        const targets = filterTargetAteliers(full)
        if (targets.length > 0) setSelectedAtelier(String(targets[0].id))
      } catch {
        setError('Erreur de chargement des données.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authHeader])

  // ── Reset selection on atelier change ────────────────────────────────────────
  useEffect(() => { setSelectedIds(new Set()) }, [selectedAtelier])

  // ── Fetch KPI history ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedAtelier) return
    const { start, end } = getDateRange(period)
    const ctrl = new AbortController()

    const fetchHistory = async () => {
      setLoadingData(true)
      setError('')
      try {
        const params = new URLSearchParams({ atelier_id: selectedAtelier, start_date: start, end_date: end })
        const res = await fetch(`${API_URL}/kpi-history?${params}`, { headers: authHeader, signal: ctrl.signal })
        const data = await res.json()
        setHistory(Array.isArray(data) ? data : [])
      } catch (e) {
        if (e.name !== 'AbortError') setError("Erreur de chargement de l'historique KPI.")
      } finally {
        setLoadingData(false)
      }
    }

    fetchHistory()
    return () => ctrl.abort()
  }, [authHeader, selectedAtelier, period])

  // ── Derived ──────────────────────────────────────────────────────────────────

  /** Seuls CMS2 et INTEG, dédupliqués */
  const ateliers = useMemo(() => filterTargetAteliers(allAteliers), [allAteliers])

  const atelierLignes = useMemo(() => (
    lignes
      .filter((l) => String(l.atelier_id) === selectedAtelier)
      .sort((a, b) => (parseLineNumber(a.nom) ?? 99) - (parseLineNumber(b.nom) ?? 99))
  ), [lignes, selectedAtelier])

  const toggleId = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const displayedLignes = useMemo(() => (
    selectedIds.size === 0 ? atelierLignes : atelierLignes.filter((l) => selectedIds.has(String(l.id)))
  ), [atelierLignes, selectedIds])

  const chartData = useMemo(() => {
    const byLigne = {}
    for (const row of history) {
      const lid = String(row.ligne_id)
      const kpi = String(row.kpi_name || '').toUpperCase()
      if (!KPI_KEYS.includes(kpi)) continue
      if (!byLigne[lid]) byLigne[lid] = { TRG: [], FOR: [], FPY: [] }
      byLigne[lid][kpi].push(Number(row.value ?? 0))
    }
    return displayedLignes.map((ligne) => {
      const lid = String(ligne.id)
      const d   = byLigne[lid] || {}
      const num = parseLineNumber(ligne.nom)
      return {
        name: mode === 'line'
          ? `Ligne ${num ?? '?'}`
          : (parseProductName(ligne.nom) || `Ligne ${num}`),
        TRG: avg(d.TRG),
        FOR: avg(d.FOR),
        FPY: avg(d.FPY),
      }
    })
  }, [history, displayedLignes, mode])

  const summaryAvg = useMemo(() => {
    const pool = { TRG: [], FOR: [], FPY: [] }
    for (const row of chartData) {
      for (const k of KPI_KEYS) { if (row[k] !== null) pool[k].push(row[k]) }
    }
    return { TRG: avg(pool.TRG), FOR: avg(pool.FOR), FPY: avg(pool.FPY) }
  }, [chartData])

  const hasData = chartData.some((row) => KPI_KEYS.some((k) => row[k] !== null))
  const atelierName = ateliers.find((a) => String(a.id) === selectedAtelier)?.nom || ''
  const periodLabel = PERIODS.find((p) => p.value === period)?.label || ''

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="reports-viewport" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#f1f5f9',
      overflow: 'hidden',
      gap: 0,
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexShrink: 0,
        boxShadow: '0 2px 16px rgba(15,23,42,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}>
            <BarChart2 size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ color: '#fff', margin: 0, fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              Rapport KPI
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: 11 }}>
              TRG · FOR · FPY — {periodLabel}
            </p>
          </div>
        </div>

        {/* Atelier tabs — seulement CMS2 et INTEG */}
        <div style={{ display: 'flex', gap: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: 3 }}>
          {ateliers.map((at) => {
            const active = String(at.id) === selectedAtelier
            const name = normalizeText(at.nom).includes('cms') ? 'CMS 2' : 'INTEG'
            return (
              <button
                key={at.id}
                onClick={() => setSelectedAtelier(String(at.id))}
                style={{
                  padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12.5, transition: 'all 0.18s',
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#0f172a' : 'rgba(255,255,255,0.6)',
                  boxShadow: active ? '0 1px 6px rgba(0,0,0,0.14)' : 'none',
                }}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 16px 12px', overflow: 'hidden', minHeight: 0 }}>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 14px', color: '#991b1b', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
            {error}
          </div>
        )}

        {/* ── FILTER BAR ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '10px 16px',
          boxShadow: '0 1px 4px rgba(15,23,42,0.06)', border: '1px solid #f1f5f9',
          display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center',
          flexShrink: 0,
        }}>
          {/* Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Mode</span>
            <div style={pillGroupStyle}>
              {[{ v: 'line', l: 'Par Ligne' }, { v: 'product', l: 'Par Produit' }].map(({ v, l }) => (
                <button key={v} onClick={() => setMode(v)} style={modeBtn(mode === v)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Ligne / Produit selector */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={labelStyle}>{mode === 'line' ? 'Lignes' : 'Produits'}</span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
              {atelierLignes.map((ligne) => {
                const num   = parseLineNumber(ligne.nom)
                const label = mode === 'line' ? `Ligne ${num ?? '?'}` : (parseProductName(ligne.nom) || `Ligne ${num}`)
                const sel   = selectedIds.has(String(ligne.id))
                return (
                  <button
                    key={ligne.id}
                    onClick={() => toggleId(String(ligne.id))}
                    style={{
                      padding: '4px 11px', borderRadius: 7,
                      border: `1.5px solid ${sel ? '#2563eb' : '#e2e8f0'}`,
                      cursor: 'pointer', fontWeight: 600, fontSize: 11,
                      transition: 'all 0.16s',
                      background: sel ? '#eff6ff' : '#fafafa',
                      color: sel ? '#2563eb' : '#64748b',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 10.5, fontWeight: 600, background: '#fafafa', color: '#94a3b8' }}
                >
                  Tout
                </button>
              )}
            </div>
          </div>

          {/* Period */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Période</span>
            <div style={pillGroupStyle}>
              {PERIODS.map((p) => (
                <button key={p.value} onClick={() => setPeriod(p.value)} style={periodBtn(period === p.value)}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI SUMMARY CARDS ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, flexShrink: 0 }}>
          {KPI_KEYS.map((kpi) => {
            const meta = KPI_META[kpi]
            const val  = summaryAvg[kpi]
            return (
              <div key={kpi} style={{
                background: '#fff', borderRadius: 14,
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 6px rgba(15,23,42,0.05)',
                overflow: 'hidden',
              }}>
                <div style={{ height: 3, background: meta.color }} />
                <div style={{ padding: '10px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 9px', borderRadius: 6,
                      background: meta.bg, color: meta.text,
                      fontWeight: 800, fontSize: 11, letterSpacing: 0.4,
                    }}>
                      {kpi}
                    </span>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', lineHeight: 1.1, marginTop: 4 }}>
                      {pct(val)}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 1 }}>
                      Moy. {atelierName} · {periodLabel}
                    </div>
                  </div>
                  <TrendingUp size={18} color={meta.color} style={{ flexShrink: 0 }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* ── CHART CARD ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
          boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
          display: 'flex', flexDirection: 'column',
          flex: 1, minHeight: 0, overflow: 'hidden',
        }}>
          {/* Chart header */}
          <div style={{
            padding: '12px 20px 10px',
            borderBottom: '1px solid #f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8, flexShrink: 0,
          }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                Histogramme comparatif — TRG · FOR · FPY
              </h3>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8' }}>
                {atelierName} · {periodLabel} · {mode === 'line' ? 'Par ligne' : 'Par produit'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {KPI_KEYS.map((kpi) => (
                <div key={kpi} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: KPI_META[kpi].color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{kpi}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart body — prend tout l'espace restant */}
          <div style={{ flex: 1, minHeight: 0, padding: '8px 12px 8px 4px' }}>
            {loadingData ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div className="loading-spinner" />
              </div>
            ) : !hasData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                <BarChart2 size={38} color="#cbd5e1" strokeWidth={1.3} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                  Aucune donnée TRG / FOR / FPY pour cette période
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1' }}>
                  Modifiez les filtres ou saisissez des données dans le Dashboard
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 22, right: 16, left: 0, bottom: 4 }}
                  barGap={3}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc', radius: 6 }} />
                  <ReferenceLine
                    y={80} stroke="#e2e8f0" strokeDasharray="5 4"
                    label={{ value: 'Obj. 80%', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                  />
                  {KPI_KEYS.map((kpi) => (
                    <Bar key={kpi} dataKey={kpi} name={kpi} fill={KPI_META[kpi].color} radius={[6, 6, 0, 0]} maxBarSize={52}>
                      <LabelList
                        dataKey={kpi}
                        position="top"
                        formatter={(v) => (v !== null && v !== undefined ? `${Number(v).toFixed(0)}%` : '')}
                        style={{ fontSize: 9, fontWeight: 700, fill: KPI_META[kpi].text }}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Reports

// ─── Style helpers ────────────────────────────────────────────────────────────

const labelStyle = {
  fontSize: 9.5, fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: 0.8, display: 'block',
}

const pillGroupStyle = {
  display: 'flex', gap: 3,
  background: '#f1f5f9', borderRadius: 9, padding: 3,
}

const modeBtn = (active) => ({
  padding: '5px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
  fontWeight: 700, fontSize: 11, transition: 'all 0.16s',
  background: active ? '#fff' : 'transparent',
  color: active ? '#1e293b' : '#64748b',
  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
})

const periodBtn = (active) => ({
  padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
  fontWeight: 700, fontSize: 11, transition: 'all 0.16s',
  background: active ? '#0f172a' : 'transparent',
  color: active ? '#fff' : '#64748b',
})
