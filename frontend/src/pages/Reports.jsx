import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, RefreshCw } from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'
import { KpiRectChart, LineColorLegend } from '../components/Charts'
import { buildLineColorMap, getLineColor } from '../utils/lineColors'
import { API_URL } from '../config/api'

function normalizeDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function Reports() {
  const { getAuthHeader } = useAuth()
  const authHeader = useMemo(() => getAuthHeader(), [getAuthHeader])

  const [loading, setLoading] = useState(false)
  const [ateliers, setAteliers] = useState([])
  const [lignes, setLignes] = useState([])
  const [kpis, setKpis] = useState([])
  const [history, setHistory] = useState([])
  const [exportingPdf, setExportingPdf] = useState(false)

  const [filters, setFilters] = useState({
    atelierId: '',
    ligneId: '',
    kpiId: '',
    startDate: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [ateliersRes, lignesRes, kpisRes] = await Promise.all([
          fetch(`${API_URL}/ateliers`, { headers: authHeader }),
          fetch(`${API_URL}/lignes`, { headers: authHeader }),
          fetch(`${API_URL}/kpis`, { headers: authHeader })
        ])

        const [ateliersData, lignesData, kpisData] = await Promise.all([
          ateliersRes.json(),
          lignesRes.json(),
          kpisRes.json()
        ])

        setAteliers(ateliersData)
        setLignes(lignesData)
        setKpis(kpisData)

        if (!filters.atelierId && ateliersData.length) {
          setFilters((prev) => ({ ...prev, atelierId: String(ateliersData[0].id) }))
        }
      } catch (error) {
        console.error('Erreur chargement historique:', error)
      }
    }

    fetchInitial()
  }, [])

  const lineColorMap = useMemo(() => buildLineColorMap(lignes), [lignes])

  const filteredLignes = useMemo(
    () => lignes.filter((line) => !filters.atelierId || Number(line.atelier_id) === Number(filters.atelierId)),
    [lignes, filters.atelierId]
  )

  const filteredKpis = useMemo(
    () => kpis.filter((kpi) => !filters.atelierId || Number(kpi.atelier_id) === Number(filters.atelierId)),
    [kpis, filters.atelierId]
  )

  const fetchHistory = async () => {
    if (!filters.atelierId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        atelier_id: filters.atelierId,
        start_date: filters.startDate,
        end_date: filters.endDate
      })
      if (filters.ligneId) params.append('ligne_id', filters.ligneId)
      if (filters.kpiId) params.append('kpi_id', filters.kpiId)

      const response = await fetch(`${API_URL}/kpi-history?${params.toString()}`, { headers: authHeader })
      const data = await response.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur fetch historique KPI:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAtelierHistory = async (atelierId) => {
    const params = new URLSearchParams({
      atelier_id: String(atelierId),
      start_date: filters.startDate,
      end_date: filters.endDate
    })

    if (filters.kpiId) params.append('kpi_id', filters.kpiId)

    const response = await fetch(`${API_URL}/kpi-history?${params.toString()}`, { headers: authHeader })
    if (!response.ok) {
      throw new Error(`Erreur API (${response.status})`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  }

  const isCms2OrIntegration = (name) => {
    const normalized = String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    return normalized.includes('cms2') || normalized.includes('integr')
  }

  const exportCms2IntegrationPdf = async () => {
    try {
      setExportingPdf(true)

      const targetAteliers = ateliers.filter((a) => isCms2OrIntegration(a.nom))
      if (targetAteliers.length === 0) {
        alert('Ateliers CMS2/Integration introuvables.')
        return
      }

      const atelierData = await Promise.all(
        targetAteliers.map(async (atelier) => ({
          atelier,
          rows: await fetchAtelierHistory(atelier.id)
        }))
      )

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      doc.setFontSize(14)
      doc.text('Historique KPI - CMS2 et Integration', 14, 14)
      doc.setFontSize(10)
      doc.text(`Periode: ${filters.startDate} au ${filters.endDate}`, 14, 20)

      let y = 26

      atelierData.forEach(({ atelier, rows }, index) => {
        if (index > 0) {
          doc.addPage('a4', 'landscape')
          y = 14
        }

        doc.setFontSize(12)
        doc.text(`Atelier: ${atelier.nom}`, 14, y)

        const tableBody = rows.map((row) => [
          row.date ? new Date(row.date).toLocaleDateString('fr-FR') : '-',
          row.kpi_name || '-',
          row.ligne_nom || '-',
          row.value ?? '-',
          row.objective ?? '-',
          row.unit || '%'
        ])

        doc.autoTable({
          startY: y + 4,
          head: [['Date', 'KPI', 'Ligne', 'Valeur', 'Objectif', 'Unite']],
          body: tableBody.length > 0 ? tableBody : [['-', 'Aucune donnee', '-', '-', '-', '-']],
          styles: { fontSize: 8 },
          headStyles: { fillColor: [37, 99, 235] }
        })
      })

      const fileDate = new Date().toISOString().slice(0, 10)
      doc.save(`historique_cms2_integration_${fileDate}.pdf`)
    } catch (error) {
      console.error('Erreur export PDF:', error)
      alert('Echec de generation du PDF.')
    } finally {
      setExportingPdf(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [filters.atelierId, filters.ligneId, filters.kpiId, filters.startDate, filters.endDate])

  const groupedByKpi = useMemo(() => {
    const map = new Map()

    for (const row of history) {
      if (!map.has(row.kpi_id)) {
        map.set(row.kpi_id, {
          kpi: {
            id: row.kpi_id,
            name: row.kpi_name,
            objective: Number(row.objective),
            unit: row.unit || '%'
          },
          rows: []
        })
      }
      map.get(row.kpi_id).rows.push(row)
    }

    return Array.from(map.values())
  }, [history])

  const buildChartData = (rows) => {
    const byDate = new Map()
    rows.forEach((row) => {
      const d = normalizeDate(row.date)
      if (!byDate.has(d)) byDate.set(d, { date: d })
      byDate.get(d)[`line_${row.ligne_id}`] = Number(row.value || 0)
    })
    return Array.from(byDate.values())
  }

  const buildSeries = (rows) => {
    const uniq = new Map()
    rows.forEach((row) => {
      if (!uniq.has(row.ligne_id)) {
        const color = row.ligne_color || lineColorMap[row.ligne_id] || getLineColor({ id: row.ligne_id })
        uniq.set(row.ligne_id, {
          key: `line_${row.ligne_id}`,
          label: row.ligne_nom,
          color
        })
      }
    })
    return Array.from(uniq.values())
  }

  const globalLegend = useMemo(
    () => filteredLignes.map((line) => ({ ...line, color: lineColorMap[line.id] || getLineColor(line) })),
    [filteredLignes, lineColorMap]
  )

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Historique KPI</h2>
          <p className="text-secondary">Evolution des KPI avec cohérence visuelle des lignes de production</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={fetchHistory}>
            <RefreshCw size={16} className={loading ? 'loading-spinner' : ''} />
            Actualiser
          </button>
          <button
            className="btn btn-primary"
            onClick={exportCms2IntegrationPdf}
            disabled={exportingPdf || loading || ateliers.length === 0}
          >
            <Download size={16} className={exportingPdf ? 'loading-spinner' : ''} />
            {exportingPdf ? 'Generation PDF...' : 'Exporter PDF CMS2 + Integration'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3><Filter size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Filtres</h3></div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Atelier</label>
              <select
                className="form-select"
                value={filters.atelierId}
                onChange={(e) => setFilters((prev) => ({ ...prev, atelierId: e.target.value, ligneId: '', kpiId: '' }))}
              >
                <option value="">Selectionner</option>
                {ateliers.map((a) => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ligne</label>
              <select
                className="form-select"
                value={filters.ligneId}
                onChange={(e) => setFilters((prev) => ({ ...prev, ligneId: e.target.value }))}
              >
                <option value="">Toutes</option>
                {filteredLignes.map((l) => (
                  <option key={l.id} value={l.id}>{l.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">KPI</label>
              <select
                className="form-select"
                value={filters.kpiId}
                onChange={(e) => setFilters((prev) => ({ ...prev, kpiId: e.target.value }))}
              >
                <option value="">Tous</option>
                {filteredKpis.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Debut</label>
              <input
                type="date"
                className="form-input"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fin</label>
              <input
                type="date"
                className="form-input"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3>Legende globale des lignes</h3></div>
        <div className="card-body">
          <LineColorLegend lines={globalLegend} />
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="loading-spinner" /></div>
      ) : groupedByKpi.length === 0 ? (
        <div className="card"><div className="card-body">Aucune donnee sur cette periode.</div></div>
      ) : (
        <div className="dashboard-grid">
          {groupedByKpi.map(({ kpi, rows }) => (
            <div className="dashboard-half" key={kpi.id}>
              <KpiRectChart
                title={`${kpi.name} - Historique`}
                unit={kpi.unit || '%'}
                target={kpi.objective}
                data={buildChartData(rows)}
                series={buildSeries(rows)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Reports
