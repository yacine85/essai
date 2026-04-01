import { useMemo, useState, useEffect } from 'react'
import { RefreshCw, Plus, Trash2, Save, Edit, RotateCcw, Settings2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { LineColorLegend, MultiKpiRectChart } from '../components/Charts'
import { buildLineColorMap, getLineColor } from '../utils/lineColors'
import { API_URL } from '../config/api'

const SERVICE_OPTIONS = [
  { value: 'test', label: 'Test' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'depannage', label: 'Depannage' },
  { value: 'info_trace', label: 'Information et Tracabilite' },
  { value: 'qualite', label: 'Qualite' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'cms2', label: 'Atelier CMS2' },
  { value: 'methode', label: 'Methode' },
  { value: 'process', label: 'Process' },
  { value: 'integration', label: 'Atelier Integration' }
]

const TEMPLATE_V0 = {
  cms2: {
    kpis: [
      { name: 'QTE', objective: 800, alert_threshold: 700, inverse: false, unit: '', default_value: 800 },
      { name: 'DMH', objective: 8, alert_threshold: 10, inverse: true, unit: 'h', default_value: 8 }
    ]
  },
  integration: {
    kpis: [
      { name: 'QTE', objective: 800, alert_threshold: 700, inverse: false, unit: '', default_value: 800 },
      { name: 'DMH', objective: 8, alert_threshold: 10, inverse: true, unit: 'h', default_value: 8 }
    ]
  }
}

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getAtelierTemplateKey(atelierName = '') {
  const normalized = normalizeText(atelierName)
  if (normalized.includes('cms')) return 'cms2'
  if (normalized.includes('integr')) return 'integration'
  return ''
}

function inferDefaultService(atelierName = '') {
  const lower = String(atelierName).toLowerCase()
  if (lower.includes('cms')) return 'cms2'
  if (lower.includes('int')) return 'integration'
  return ''
}

function getCellClass(value, objective, alert, inverse) {
  if (inverse) {
    if (value <= objective) return 'cell-success'
    if (value <= alert) return 'cell-warning'
    return 'cell-danger'
  }

  if (value >= objective) return 'cell-success'
  if (value >= alert) return 'cell-warning'
  return 'cell-danger'
}

function LineModal({ show, onClose, onSave }) {
  const [nom, setNom] = useState('')

  useEffect(() => {
    if (show) setNom('')
  }, [show])

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Ajouter une ligne de production</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nom de la ligne</label>
            <input
              className="form-input"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: EE PRO"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            disabled={!nom.trim()}
            onClick={() => onSave({ nom: nom.trim() })}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiModal({ show, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    objective: 95,
    alert_threshold: 90,
    inverse: false,
    unit: '%'
  })

  useEffect(() => {
    if (show) {
      setForm({ name: '', objective: 95, alert_threshold: 90, inverse: false, unit: '%' })
    }
  }, [show])

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>Ajouter un KPI</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nom KPI</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: TRG"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Objectif (vert)</label>
              <input
                type="number"
                className="form-input"
                value={form.objective}
                onChange={(e) => setForm((prev) => ({ ...prev, objective: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alerte (orange)</label>
              <input
                type="number"
                className="form-input"
                value={form.alert_threshold}
                onChange={(e) => setForm((prev) => ({ ...prev, alert_threshold: Number(e.target.value || 0) }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unité</label>
              <input
                className="form-input"
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                placeholder="%"
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: 26 }}>
              <input
                id="kpiInverse"
                type="checkbox"
                checked={form.inverse}
                onChange={(e) => setForm((prev) => ({ ...prev, inverse: e.target.checked }))}
              />
              <label htmlFor="kpiInverse" style={{ marginLeft: 8 }}>Inverse (plus petit = mieux)</label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            disabled={!form.name.trim()}
            onClick={() => onSave({ ...form, name: form.name.trim() })}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

function GapActionModal({ show, onClose, onSave, ateliers, lignes, initialData, saving }) {
  const [form, setForm] = useState({
    atelier_id: '',
    ligne_id: '',
    service_code: '',
    kpi_nom: '',
    ecart: '',
    causes: '',
    actions: '',
    impact: '',
    deadline: ''
  })

  useEffect(() => {
    if (show) {
      setForm({
        atelier_id: initialData?.atelier_id?.toString() || '',
        ligne_id: initialData?.ligne_id?.toString() || '',
        service_code: initialData?.service_code || '',
        kpi_nom: initialData?.kpi_nom || '',
        ecart: initialData?.ecart?.toString() || '',
        causes: '',
        actions: '',
        impact: '',
        deadline: ''
      })
    }
  }, [show, initialData])

  if (!show) return null

  const filteredLignes = lignes.filter((ligne) => Number(ligne.atelier_id) === Number(form.atelier_id))

  const submit = () => {
    if (!form.atelier_id || !form.ligne_id || !form.service_code) {
      alert('Atelier, ligne et service pilote sont obligatoires')
      return
    }
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <div className="modal-header">
          <h3>Nouvelle action corrective</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Atelier</label>
              <select
                className="form-select"
                value={form.atelier_id}
                onChange={(e) => setForm((prev) => ({ ...prev, atelier_id: e.target.value, ligne_id: '' }))}
              >
                <option value="">Selectionner</option>
                {ateliers.map((atelier) => (
                  <option key={atelier.id} value={atelier.id}>{atelier.nom}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ligne</label>
              <select
                className="form-select"
                value={form.ligne_id}
                onChange={(e) => setForm((prev) => ({ ...prev, ligne_id: e.target.value }))}
              >
                <option value="">Selectionner</option>
                {filteredLignes.map((ligne) => (
                  <option key={ligne.id} value={ligne.id}>{ligne.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Service Pilote (obligatoire)</label>
              <select
                className="form-select"
                value={form.service_code}
                onChange={(e) => setForm((prev) => ({ ...prev, service_code: e.target.value }))}
              >
                <option value="">Selectionner</option>
                {SERVICE_OPTIONS.map((service) => (
                  <option key={service.value} value={service.value}>{service.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">KPI</label>
              <input
                className="form-input"
                value={form.kpi_nom}
                onChange={(e) => setForm((prev) => ({ ...prev, kpi_nom: e.target.value }))}
                placeholder="Ex: TRG"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ecart (%)</label>
              <input
                type="number"
                className="form-input"
                value={form.ecart}
                onChange={(e) => setForm((prev) => ({ ...prev, ecart: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Impact (%)</label>
              <input
                type="number"
                className="form-input"
                value={form.impact}
                onChange={(e) => setForm((prev) => ({ ...prev, impact: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Causes</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.causes}
              onChange={(e) => setForm((prev) => ({ ...prev, causes: e.target.value }))}
              placeholder="Causes de l'ecart"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Actions a mener</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={form.actions}
              onChange={(e) => setForm((prev) => ({ ...prev, actions: e.target.value }))}
              placeholder="Actions correctives a lancer"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Delai</label>
            <input
              type="date"
              className="form-input"
              value={form.deadline}
              onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder dans le plan d\'actions'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DynamicAtelierTable({
  atelier,
  lines,
  kpis,
  matrix,
  selectedDate,
  isAdmin,
  onCellChange,
  onAddLine,
  onDeleteLine,
  onAddKpi,
  onDeleteKpi,
  onReset,
  onOpenGapAction
}) {
  const [showLineModal, setShowLineModal] = useState(false)
  const [showKpiModal, setShowKpiModal] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const legendLines = useMemo(
    () => lines.map((line) => ({ ...line, color: getLineColor(line) })),
    [lines]
  )

  return (
    <div className="card compact-atelier-card" style={{ marginBottom: 10 }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3>{atelier.nom}</h3>
        <div className="btn-group">
          {isAdmin && (
            <>
              <button className="btn btn-sm btn-outline" onClick={() => setShowLineModal(true)}>
                <Plus size={14} /> Ligne
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setShowKpiModal(true)}>
                <Plus size={14} /> KPI
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setEditMode((v) => !v)}>
                {editMode ? <Save size={14} /> : <Edit size={14} />}
              </button>
              <button className="btn btn-sm btn-outline" onClick={onReset} title="Reset configuration">
                <RotateCcw size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card-body compact-atelier-body" style={{ paddingTop: 8 }}>
        <LineColorLegend lines={legendLines} />
        <div className="table-container compact-table-container" style={{ marginTop: 8 }}>
          <table className="performance-table compact-performance-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: 120 }}>KPI</th>
                <th>Objectif</th>
                <th>Alerte</th>
                {legendLines.map((line) => (
                  <th key={line.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span className="line-legend-dot" style={{ backgroundColor: line.color }} />
                      <span>{line.nom}</span>
                      {isAdmin && editMode && (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '2px 6px' }}
                          title="Supprimer ligne"
                          onClick={() => onDeleteLine(line)}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpis.map((kpi) => (
                <tr key={kpi.id}>
                  <td style={{ textAlign: 'left', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{kpi.name}</span>
                      {isAdmin && editMode && (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: 4 }}
                          title="Supprimer KPI"
                          onClick={() => onDeleteKpi(kpi)}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{kpi.objective}{kpi.unit}</td>
                  <td style={{ textAlign: 'center' }}>{kpi.alert_threshold}{kpi.unit}</td>
                  {legendLines.map((line) => {
                    const key = `${line.id}-${kpi.id}`
                    const currentValue = matrix[key] ?? 0
                    const cls = getCellClass(currentValue, kpi.objective, kpi.alert_threshold, Boolean(kpi.inverse))

                    return (
                      <td key={key} className={cls} style={{ textAlign: 'center' }}>
                        {editMode && isAdmin ? (
                          <input
                            type="number"
                            value={currentValue}
                            onChange={(e) => onCellChange({
                              date: selectedDate,
                              atelier_id: atelier.id,
                              ligne_id: line.id,
                              kpi_id: kpi.id,
                              value: Number(e.target.value || 0)
                            })}
                            style={{ width: 48, textAlign: 'center' }}
                          />
                        ) : (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ minWidth: 72, border: 'none', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => onOpenGapAction({ atelier, line, kpi, value: currentValue })}
                            title="Creer une action corrective"
                          >
                            {currentValue}{kpi.unit}
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LineModal
        show={showLineModal}
        onClose={() => setShowLineModal(false)}
        onSave={(payload) => {
          onAddLine(payload)
          setShowLineModal(false)
        }}
      />

      <KpiModal
        show={showKpiModal}
        onClose={() => setShowKpiModal(false)}
        onSave={(payload) => {
          onAddKpi(payload)
          setShowKpiModal(false)
        }}
      />
    </div>
  )
}

function Dashboard() {
  const { getAuthHeader, hasRole } = useAuth()
  const isAdmin = hasRole('admin')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const [ateliers, setAteliers] = useState([])
  const [lignes, setLignes] = useState([])
  const [kpis, setKpis] = useState([])
  const [kpiValues, setKpiValues] = useState([])
  const [kpiHistory, setKpiHistory] = useState([])
  const [showGapModal, setShowGapModal] = useState(false)
  const [savingGapAction, setSavingGapAction] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [gapActionInitialData, setGapActionInitialData] = useState(null)

  const authHeader = useMemo(() => getAuthHeader(), [getAuthHeader])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [ateliersRes, lignesRes, kpisRes, valuesRes] = await Promise.all([
        fetch(`${API_URL}/ateliers`, { headers: authHeader }),
        fetch(`${API_URL}/lignes`, { headers: authHeader }),
        fetch(`${API_URL}/kpis`, { headers: authHeader }),
        fetch(`${API_URL}/kpi-values?date=${selectedDate}`, { headers: authHeader })
      ])

      const [ateliersData, lignesData, kpisData, valuesData] = await Promise.all([
        ateliersRes.json(),
        lignesRes.json(),
        kpisRes.json(),
        valuesRes.json()
      ])

      setAteliers(ateliersData)
      setLignes(lignesData)
      setKpis(kpisData)
      setKpiValues(valuesData)

      const historyRequests = ateliersData.map((atelier) =>
        fetch(`${API_URL}/kpi-history?atelier_id=${atelier.id}&start_date=${selectedDate}&end_date=${selectedDate}`, { headers: authHeader })
          .then((r) => r.json())
          .catch(() => [])
      )

      const historyGroups = await Promise.all(historyRequests)
      setKpiHistory(historyGroups.flat())
    } catch (error) {
      console.error('Erreur de chargement dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [selectedDate])

  const lineColorMap = useMemo(() => buildLineColorMap(lignes), [lignes])

  const valueMatrix = useMemo(() => {
    const matrix = {}
    for (const item of kpiValues) {
      matrix[`${item.ligne_id}-${item.kpi_id}`] = Number(item.value || 0)
    }
    return matrix
  }, [kpiValues])

  const ateliersByTarget = useMemo(() => {
    const cms2 = ateliers.find((a) => String(a.nom || '').toLowerCase().includes('cms'))
    const integration = ateliers.find((a) => String(a.nom || '').toLowerCase().includes('int'))
    return [cms2, integration].filter(Boolean)
  }, [ateliers])

  const applyTemplateV0 = async () => {
    if (!isAdmin) return

    setApplyingTemplate(true)
    try {
      if (ateliersByTarget.length === 0) {
        alert('Ateliers CMS2/Integration introuvables')
        return
      }

      for (const atelier of ateliersByTarget) {
        const templateKey = getAtelierTemplateKey(atelier.nom)
        const template = TEMPLATE_V0[templateKey]
        if (!template) continue

        const atelierLines = lignes.filter((line) => Number(line.atelier_id) === Number(atelier.id))
        const finalLines = [...atelierLines]

        const normalizeKpiCode = (value) => {
          const normalized = normalizeText(value).toUpperCase()
          if (normalized === 'QTES' || normalized === 'QTE') return 'QTE'
          return normalized
        }

        const atelierKpis = kpis.filter((kpi) => Number(kpi.atelier_id) === Number(atelier.id))
        const finalKpis = [...atelierKpis]
        const existingKpiNames = new Set(atelierKpis.map((kpi) => normalizeKpiCode(kpi.name)))

        for (const kpiDef of template.kpis) {
          const normalizedKpiName = normalizeKpiCode(kpiDef.name)
          if (existingKpiNames.has(normalizedKpiName)) continue

          const kpiRes = await fetch(`${API_URL}/kpis`, {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...kpiDef, atelier_id: atelier.id })
          })

          const kpiData = await kpiRes.json().catch(() => ({}))
          if (!kpiRes.ok) {
            throw new Error(kpiData.error || `Erreur creation KPI ${kpiDef.name}`)
          }

          if (kpiData?.kpi) {
            finalKpis.push(kpiData.kpi)
            existingKpiNames.add(normalizedKpiName)
          }
        }

        const alertValuesByKpiName = new Map(
          template.kpis.map((kpiDef) => [normalizeKpiCode(kpiDef.name), Number(kpiDef.alert_threshold ?? 0)])
        )

        for (const line of finalLines) {
          for (const kpi of finalKpis) {
            const fallbackAlert = Number(kpi.alert_threshold ?? 0)
            const alertValue = alertValuesByKpiName.get(normalizeKpiCode(kpi.name)) ?? fallbackAlert

            const valueRes = await fetch(`${API_URL}/kpi-values/upsert`, {
              method: 'POST',
              headers: { ...authHeader, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: selectedDate,
                atelier_id: atelier.id,
                ligne_id: line.id,
                kpi_id: kpi.id,
                value: alertValue
              })
            })

            const valueData = await valueRes.json().catch(() => ({}))
            if (!valueRes.ok) {
              throw new Error(valueData.error || `Erreur initialisation valeur ${kpi.name} / ${line.nom}`)
            }
          }
        }
      }

      await fetchAll()
      alert('Template v0 applique: toutes les cases CMS2/Integration sont reglees sur la valeur alerte (lignes inchangees)')
    } catch (error) {
      alert(error.message || 'Echec du chargement template v0')
    } finally {
      setApplyingTemplate(false)
    }
  }

  const buildCombinedKpiData = (atelierKpis, atelierLines) => {
    const targetKpis = ['TRG', 'FOR', 'FPY']

    return targetKpis
      .map((kpiName) => {
        const kpi = atelierKpis.find((item) => String(item.name || '').toUpperCase() === kpiName)
        if (!kpi) return null

        const row = { kpi: kpiName, objectif: Number(kpi.objective || 0) }
        atelierLines.forEach((line) => {
          row[`line_${line.id}`] = Number(valueMatrix[`${line.id}-${kpi.id}`] ?? 0)
        })

        return row
      })
      .filter(Boolean)
  }

  const buildCombinedSeries = (atelierLines) => {
    return atelierLines.map((line) => ({
      key: `line_${line.id}`,
      label: line.nom,
      color: line.color
    }))
  }

  const refresh = async () => {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }

  const upsertCell = async (payload) => {
    try {
      await fetch(`${API_URL}/kpi-values/upsert`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      setKpiValues((prev) => {
        const idx = prev.findIndex(
          (x) => x.date === payload.date && Number(x.ligne_id) === Number(payload.ligne_id) && Number(x.kpi_id) === Number(payload.kpi_id)
        )
        if (idx === -1) {
          return [...prev, { ...payload }]
        }
        const clone = [...prev]
        clone[idx] = { ...clone[idx], value: payload.value }
        return clone
      })
    } catch (error) {
      console.error('Erreur sauvegarde cellule KPI:', error)
    }
  }

  const addLine = async (atelier, payload) => {
    try {
      const res = await fetch(`${API_URL}/lignes`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ atelier_id: atelier.id, nom: payload.nom })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur ajout ligne')
      setLignes((prev) => [...prev, data.ligne])
    } catch (error) {
      alert(error.message)
    }
  }

  const deleteLine = async (line) => {
    try {
      const res = await fetch(`${API_URL}/lignes/${line.id}`, {
        method: 'DELETE',
        headers: authHeader
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409 && data?.canForceDelete) {
          const forceRes = await fetch(`${API_URL}/lignes/${line.id}?force=true`, {
            method: 'DELETE',
            headers: authHeader
          })
          const forceData = await forceRes.json().catch(() => ({}))
          if (!forceRes.ok) {
            throw new Error(forceData.error || 'Erreur suppression definitive ligne')
          }

          setLignes((prev) => prev.filter((x) => x.id !== line.id))
          setKpiValues((prev) => prev.filter((x) => Number(x.ligne_id) !== Number(line.id)))
          return
        }

        if (Array.isArray(data.details) && data.details.length > 0) {
          const breakdown = data.details
            .map((item) => `- ${item.label}: ${item.count}`)
            .join('\n')
          throw new Error(`${data.error || 'Erreur suppression ligne'}\n\nDetails:\n${breakdown}`)
        }
        throw new Error(data.error || 'Erreur suppression ligne')
      }
      setLignes((prev) => prev.filter((x) => x.id !== line.id))
      setKpiValues((prev) => prev.filter((x) => Number(x.ligne_id) !== Number(line.id)))
    } catch (error) {
      alert(error.message)
    }
  }

  const addKpi = async (atelier, payload) => {
    try {
      const res = await fetch(`${API_URL}/kpis`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, atelier_id: atelier.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur ajout KPI')
      setKpis((prev) => [...prev, data.kpi])
    } catch (error) {
      alert(error.message)
    }
  }

  const deleteKpi = async (kpi) => {
    if (!window.confirm(`Confirmer la suppression du KPI ${kpi.name} ?`)) return

    try {
      const res = await fetch(`${API_URL}/kpis/${kpi.id}`, {
        method: 'DELETE',
        headers: authHeader
      })
      if (!res.ok) throw new Error('Erreur suppression KPI')
      setKpis((prev) => prev.filter((x) => x.id !== kpi.id))
      setKpiValues((prev) => prev.filter((x) => Number(x.kpi_id) !== Number(kpi.id)))
    } catch (error) {
      alert(error.message)
    }
  }

  const resetAtelier = async (atelier) => {
    if (!window.confirm(`Réinitialiser la configuration de ${atelier.nom} pour ${selectedDate} ?`)) return

    const atelierLines = lignes.filter((line) => Number(line.atelier_id) === Number(atelier.id))
    const atelierKpis = kpis.filter((kpi) => Number(kpi.atelier_id) === Number(atelier.id))

    for (const line of atelierLines) {
      for (const kpi of atelierKpis) {
        await upsertCell({
          date: selectedDate,
          atelier_id: atelier.id,
          ligne_id: line.id,
          kpi_id: kpi.id,
          value: 0
        })
      }
    }

    await refresh()
  }

  const openGapActionModal = ({ atelier, line, kpi, value }) => {
    if (!isAdmin) {
      alert('Seul l\'administrateur peut creer une action')
      return
    }

    const currentValue = Number(value || 0)
    const objective = Number(kpi.objective || 0)
    const ecart = Boolean(kpi.inverse)
      ? Number((objective - currentValue).toFixed(2))
      : Number((currentValue - objective).toFixed(2))

    setGapActionInitialData({
      atelier_id: atelier.id,
      ligne_id: line.id,
      service_code: inferDefaultService(atelier.nom),
      kpi_nom: kpi.name,
      ecart
    })
    setShowGapModal(true)
  }

  const saveGapAction = async (form) => {
    setSavingGapAction(true)
    try {
      const payload = {
        date: selectedDate,
        atelier_id: Number(form.atelier_id),
        ligne_id: Number(form.ligne_id),
        kpi_nom: form.kpi_nom || '',
        ecart: Number(form.ecart || 0),
        causes: form.causes || '',
        actions: form.actions || '',
        impact: Number(form.impact || 0),
        service_code: form.service_code,
        deadline: form.deadline || null
      }

      const res = await fetch(`${API_URL}/gap-analysis`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la creation de l\'action')
      }

      setShowGapModal(false)
      setGapActionInitialData(null)
      alert('Action enregistree dans le plan d\'actions')
    } catch (error) {
      alert(error.message)
    } finally {
      setSavingGapAction(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="dashboard-toolbar">
        <div>
          <h2 style={{ marginBottom: 4 }}>Dashboard QRQC</h2>
          <p className="text-secondary">Gestion dynamique CMS2 / Intégration, KPI et historique cohérent des couleurs</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {isAdmin && (
            <button className="btn btn-primary" onClick={applyTemplateV0} disabled={applyingTemplate}>
              <Plus size={16} className={applyingTemplate ? 'loading-spinner' : ''} />
              {applyingTemplate ? 'Chargement template...' : 'Template v0 CMS2 + INTEG'}
            </button>
          )}
          <button className="btn btn-outline" onClick={refresh}>
            <RefreshCw size={16} className={refreshing ? 'loading-spinner' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="loading-spinner" /></div>
      ) : (
        <>
          {ateliersByTarget.map((atelier) => {
            const atelierLines = lignes
              .filter((line) => Number(line.atelier_id) === Number(atelier.id))
              .map((line) => ({ ...line, color: lineColorMap[line.id] || getLineColor(line) }))
            const atelierKpis = kpis.filter((kpi) => Number(kpi.atelier_id) === Number(atelier.id))

            return (
              <div key={atelier.id}>
                <DynamicAtelierTable
                  atelier={atelier}
                  lines={atelierLines}
                  kpis={atelierKpis}
                  matrix={valueMatrix}
                  selectedDate={selectedDate}
                  isAdmin={isAdmin}
                  onCellChange={upsertCell}
                  onAddLine={(payload) => addLine(atelier, payload)}
                  onDeleteLine={deleteLine}
                  onAddKpi={(payload) => addKpi(atelier, payload)}
                  onDeleteKpi={deleteKpi}
                  onReset={() => resetAtelier(atelier)}
                  onOpenGapAction={openGapActionModal}
                />

                <div style={{ marginBottom: 20 }}>
                  <MultiKpiRectChart
                    title={`${atelier.nom} - TRG / FOR / FPY`}
                    unit="%"
                    data={buildCombinedKpiData(atelierKpis, atelierLines)}
                    series={buildCombinedSeries(atelierLines)}
                    objectives={['TRG', 'FOR', 'FPY']
                      .map((kpiName) => {
                        const kpi = atelierKpis.find((item) => item.name.toUpperCase() === kpiName)
                        if (!kpi) return null
                        return {
                          name: kpiName,
                          target: Number(kpi.objective || 0),
                          unit: kpi.unit || '%',
                          color: kpiName === 'TRG' ? '#0f766e' : kpiName === 'FOR' ? '#b45309' : '#7c3aed'
                        }
                      })
                      .filter(Boolean)}
                  />
                </div>
              </div>
            )
          })}

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Légende globale des lignes</h3>
              <span className="text-small text-secondary"><Settings2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Cohérence Dashboard / Historique / Tableaux</span>
            </div>
            <div className="card-body">
              <LineColorLegend
                lines={lignes.map((line) => ({ ...line, color: lineColorMap[line.id] || getLineColor(line) }))}
              />
            </div>
          </div>
        </>
      )}

      <GapActionModal
        show={showGapModal}
        onClose={() => setShowGapModal(false)}
        onSave={saveGapAction}
        ateliers={ateliersByTarget}
        lignes={lignes}
        initialData={gapActionInitialData}
        saving={savingGapAction}
      />
    </div>
  )
}

export default Dashboard
