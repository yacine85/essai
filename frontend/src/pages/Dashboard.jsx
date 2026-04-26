import { useMemo, useState, useEffect } from 'react'
import { RefreshCw, Plus, Trash2, Save, Edit, RotateCcw, PieChart as PieChartIcon, X } from 'lucide-react'
import { BarChart, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis, Bar, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { LineColorLegend, MultiKpiRectChart } from '../components/Charts'
import { buildLineColorMap, getLineColor, isHexColor, getFallbackColors } from '../utils/lineColors'
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

const STATUS_META = {
  en_attente: {
    key: 'en_attente',
    label: 'En attente de validation',
    color: '#f59e0b'
  },
  en_cours: {
    key: 'en_cours',
    label: 'En cours',
    color: '#2563eb'
  },
  cloture: {
    key: 'cloture',
    label: 'Clôturé',
    color: '#0f766e'
  },
  refuse: {
    key: 'refuse',
    label: 'Refusé',
    color: '#dc2626'
  },
  cloture_valide: {
    key: 'cloture_valide',
    label: 'Clôturé et validé',
    color: '#16a34a'
  }
}

const STATUS_KEYS = ['en_attente', 'en_cours', 'cloture', 'refuse', 'cloture_valide']
const FIXED_LINE_NUMBERS = [1, 2, 3, 4, 5]

function parseLineDescriptor(lineName = '') {
  const value = String(lineName || '').trim()
  const match = value.match(/^ligne\s*([1-5])\s*[-:|]\s*(.+)$/i)
  if (match) {
    return {
      lineNumber: Number(match[1]),
      productName: String(match[2] || '').trim() || value
    }
  }

  const startsWithLine = value.match(/^ligne\s*([1-5])$/i)
  if (startsWithLine) {
    return {
      lineNumber: Number(startsWithLine[1]),
      productName: value
    }
  }

  return {
    lineNumber: null,
    productName: value
  }
}

function buildLineDescriptor(lineNumber, productName) {
  return `Ligne ${lineNumber} - ${String(productName || '').trim()}`
}

function getDefaultProductLabel(atelierName = '', lineNumber) {
  const normalized = normalizeText(atelierName)
  if (!normalized.includes('integr')) return ''
  if (Number(lineNumber) === 4) return 'SII'
  if (Number(lineNumber) === 5) return 'SED'
  return ''
}

const ROLE_SERVICE_MAP = {
  pilote_test: 'test',
  pilote_test_sec: 'test',
  pilote_maintenance: 'maintenance',
  pilote_maintenance_sec: 'maintenance',
  pilote_depannage: 'depannage',
  pilote_depannage_sec: 'depannage',
  pilote_info_trace: 'info_trace',
  pilote_info_trace_sec: 'info_trace',
  pilote_qualite: 'qualite',
  pilote_qualite_sec: 'qualite',
  pilote_logistique: 'logistique',
  pilote_logistique_sec: 'logistique',
  pilote_cms2: 'cms2',
  pilote_cms2_sec: 'cms2',
  pilote_methode: 'methode',
  pilote_methode_sec: 'methode',
  pilote_process: 'process',
  pilote_process_sec: 'process',
  pilote_integration: 'integration',
  pilote_integration_sec: 'integration'
}

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

function formatDate(dateValue) {
  if (!dateValue) return '-'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return String(dateValue)
  return date.toLocaleDateString('fr-FR')
}

function formatEfficiency(value) {
  if (value === 1 || value === '1') return 'Efficace'
  if (value === 0 || value === '0') return 'Inefficace'
  return '-'
}

const DISPLAY_LINE_SLOTS = [
  { key: 1, label: 'Ligne1 DIW' },
  { key: 2, label: 'Ligne2 SI2X' },
  { key: 3, label: 'Ligne3 NOS' },
  { key: 4, label: 'Ligne4 SI' },
  { key: 5, label: 'Ligne5 DEC' }
]

function StatusDetailsModal({ open, onClose, title, rows }) {
  if (!open) return null

  return (
    <div className="modal-overlay action-details-overlay" onClick={onClose}>
      <div className="modal action-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose} title="Fermer">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body action-details-modal-body">
          <div className="table-container action-details-table-wrap">
            <table className="data-table action-details-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Statut</th>
                  <th>Atelier</th>
                  <th>KPI</th>
                  <th>Ligne</th>
                  <th>Écart</th>
                  <th>Causes</th>
                  <th>Actions</th>
                  <th>Impact</th>
                  <th>Service</th>
                  <th>Pilote</th>
                  <th>Délai</th>
                  <th>Efficacité</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center' }}>Aucune action pour ce statut</td>
                  </tr>
                ) : rows.map((action, index) => (
                  <tr key={action.id || index}>
                    <td>{action.id || index + 1}</td>
                    <td>
                      <span className="status-pill" style={{ backgroundColor: `${STATUS_META[action.statut]?.color || '#94a3b8'}1f`, color: STATUS_META[action.statut]?.color || '#64748b' }}>
                        {STATUS_META[action.statut]?.label || action.statut || '-'}</span>
                    </td>
                    <td>{action.atelier_nom || '-'}</td>
                    <td>{action.kpi_nom || '-'}</td>
                    <td>{action.ligne_nom || '-'}</td>
                    <td>{Number(action.ecart ?? 0)}</td>
                    <td title={action.causes || '-'}>{action.causes || '-'}</td>
                    <td title={action.actions || '-'}>{action.actions || '-'}</td>
                    <td>{Number(action.impact ?? 0)}</td>
                    <td>{action.service_code || '-'}</td>
                    <td title={action.pilot_names || '-'}>{action.pilot_names || '-'}</td>
                    <td>{formatDate(action.deadline || action.date)}</td>
                    <td>{formatEfficiency(action.efficacite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompactAtelierTable({ atelier, lines, kpis, matrix, isAdmin, onCellChange, onRenameLine, onUpdateKpi, onDeleteKpi, onAddLine, selectedDate }) {
  const [editMode, setEditMode] = useState(false)
  const [draftLines, setDraftLines] = useState({})
  const [draftKpis, setDraftKpis] = useState({})
  const [draftEmptySlots, setDraftEmptySlots] = useState({})

  useEffect(() => {
    if (!editMode) return

    const nextDraftLines = {}
    for (const line of lines) {
      nextDraftLines[line.id] = parseLineDescriptor(line.nom).productName || line.nom || ''
    }

    const nextDraftKpis = {}
    for (const kpi of kpis) {
      nextDraftKpis[kpi.id] = {
        name: String(kpi.name || ''),
        objective: String(kpi.objective ?? 0),
        alert_threshold: String(kpi.alert_threshold ?? 0)
      }
    }

    const slots = DISPLAY_LINE_SLOTS.map((slot) => ({ ...slot, line: null }))
    const unassignedInit = []
    for (const line of lines) {
      const descriptor = parseLineDescriptor(line.nom)
      if (descriptor.lineNumber != null && descriptor.lineNumber >= 1 && descriptor.lineNumber <= 5) {
        const slot = slots.find((s) => s.key === descriptor.lineNumber)
        if (slot && !slot.line) { slot.line = line; continue }
      }
      unassignedInit.push(line)
    }
    for (const line of unassignedInit) {
      const empty = slots.find((s) => !s.line)
      if (!empty) break
      empty.line = line
    }
    const nextDraftEmptySlots = {}
    for (const slot of slots) {
      if (!slot.line) {
        nextDraftEmptySlots[slot.key] = getDefaultProductLabel(atelier.nom, slot.key) || slot.label.replace(/^Ligne\s*\d+\s*/i, '').trim()
      }
    }

    setDraftLines(nextDraftLines)
    setDraftKpis(nextDraftKpis)
    setDraftEmptySlots(nextDraftEmptySlots)
  }, [editMode, lines, kpis])

  const sortedKpis = useMemo(() => {
    const order = ['TRG', 'FOR', 'FPY', 'QTE', 'QTES', 'DMH']
    return [...kpis].sort((a, b) => {
      const aName = String(a.name || '').toUpperCase()
      const bName = String(b.name || '').toUpperCase()
      const aIndex = order.indexOf(aName)
      const bIndex = order.indexOf(bName)
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'fr')
    })
  }, [kpis])

  const displaySlots = useMemo(() => {
    const slots = DISPLAY_LINE_SLOTS.map((slot) => ({ ...slot, line: null }))
    const unassigned = []
    for (const line of lines) {
      const descriptor = parseLineDescriptor(line.nom)
      if (descriptor.lineNumber != null && descriptor.lineNumber >= 1 && descriptor.lineNumber <= 5) {
        const slot = slots.find((s) => s.key === descriptor.lineNumber)
        if (slot && !slot.line) { slot.line = line; continue }
      }
      unassigned.push(line)
    }
    for (const line of unassigned) {
      const empty = slots.find((s) => !s.line)
      if (!empty) break
      empty.line = line
    }
    return slots
  }, [lines])

  const resolveProductLabel = (line, lineNumber, fallbackLabel = '') => {
    const descriptor = parseLineDescriptor(line?.nom || '')
    return descriptor.productName || (getDefaultProductLabel(atelier.nom, lineNumber) || fallbackLabel || `Produit ${lineNumber}`)
  }

  const commitLineProduct = async (line, lineNumber, nextProduct) => {
    if (!isAdmin || !onRenameLine) return
    const trimmed = String(nextProduct || '').trim()
    if (!trimmed) return

    const currentProduct = parseLineDescriptor(line.nom).productName || line.nom || ''
    if (trimmed === currentProduct) return

    await onRenameLine(line, buildLineDescriptor(lineNumber, trimmed))
  }

  const commitEmptySlot = async (slotKey, value) => {
    if (!isAdmin || !onAddLine) return
    const trimmed = String(value || '').trim()
    if (!trimmed) return
    await onAddLine({ nom: buildLineDescriptor(slotKey, trimmed) })
  }

  const commitKpiField = async (kpi, nextDraft) => {
    if (!isAdmin || !onUpdateKpi) return

    const nextName = String(nextDraft?.name ?? kpi.name ?? '').trim()
    const nextObjective = Number(nextDraft?.objective ?? kpi.objective ?? 0)
    const nextAlert = Number(nextDraft?.alert_threshold ?? kpi.alert_threshold ?? 0)

    if (!nextName) return

    const unchanged =
      nextName === String(kpi.name || '') &&
      nextObjective === Number(kpi.objective ?? 0) &&
      nextAlert === Number(kpi.alert_threshold ?? 0)

    if (unchanged) return

    await onUpdateKpi({
      ...kpi,
      name: nextName,
      objective: nextObjective,
      alert_threshold: nextAlert
    })
  }

  return (
    <div className="card chart-rect-card compact-kpi-card">
      <div className="card-header compact-kpi-header">
        <div className="compact-kpi-title-row">
          <span className="compact-kpi-title">{atelier.nom.toUpperCase().includes('CMS') ? 'CMS 2 - Vue Synthétique' : 'INTEG - Vue Synthétique'}</span>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-sm btn-outline compact-edit-btn"
              onClick={() => {
                setEditMode((value) => {
                  const nextValue = !value
                  if (!nextValue) {
                    setDraftLines({})
                    setDraftKpis({})
                    setDraftEmptySlots({})
                  }
                  return nextValue
                })
              }}
            >
              {editMode ? <Save size={14} /> : <Edit size={14} />}
              {editMode ? 'Sauvegarder' : 'Modifier'}
            </button>
          )}
        </div>
      </div>
      <div className="card-body compact-kpi-body">
        <div className="compact-line-legend" aria-label={`Légende lignes ${atelier.nom}`}>
          {displaySlots.map((slot, index) => {
            const line = slot.line
            const defaultLabel = getDefaultProductLabel(atelier.nom, slot.key) || slot.label.replace(/^Ligne\s*\d+\s*/i, '').trim()
            const productLabel = line ? (draftLines[line.id] ?? (parseLineDescriptor(line.nom).productName || '')) : defaultLabel
            const lineNumberMatch = slot.label.match(/^Ligne(\d)/)
            const lineNumberPart = lineNumberMatch ? `Ligne ${lineNumberMatch[1]}` : slot.label

            return (
              <div key={slot.key} className="compact-line-legend-item">
                <div className="compact-line-number">{lineNumberPart}</div>
                <div className="compact-line-product">
                  <span className="line-legend-dot" style={{ backgroundColor: slot.line?.color || '#94a3b8' }} aria-hidden="true" />
                  {editMode && isAdmin && line ? (
                    <input
                      className="compact-line-input"
                      value={productLabel}
                      onChange={(e) => setDraftLines((prev) => ({
                        ...prev,
                        [line.id]: e.target.value
                      }))}
                      onBlur={() => commitLineProduct(line, slot.key, draftLines[line.id] ?? productLabel)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                    />
                  ) : editMode && isAdmin && !line ? (
                    <input
                      className="compact-line-input"
                      value={draftEmptySlots[slot.key] ?? defaultLabel}
                      onChange={(e) => setDraftEmptySlots((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                      onBlur={() => commitEmptySlot(slot.key, draftEmptySlots[slot.key] ?? defaultLabel)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                    />
                  ) : (
                    productLabel
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="table-container compact-table-container compact-scroll-shell">
          <table className="performance-table compact-performance-table compact-kpi-table">
            <thead>
              <tr>
                <th rowSpan="2">Produit/KPI</th>
                <th rowSpan="2">Objectif</th>
                <th rowSpan="2">Alerte</th>
                {displaySlots.map((slot, index) => {
                  const lineNumberMatch = slot.label.match(/^Ligne(\d)/)
                  const lineNumberPart = lineNumberMatch ? `Ligne ${lineNumberMatch[1]}` : slot.label

                  return (
                    <th key={`line-${slot.key}`} className="compact-line-header-cell">
                      {lineNumberPart}
                    </th>
                  )
                })}
              </tr>
              <tr>
                {displaySlots.map((slot, index) => {
                  const line = slot.line
                  const fallbackProductLabel = getDefaultProductLabel(atelier.nom, slot.key) || slot.label.replace(/^Ligne\s*\d+\s*/i, '').trim()
                  const productLabel = line
                    ? (draftLines[line.id] ?? resolveProductLabel(line, slot.key, fallbackProductLabel))
                    : fallbackProductLabel
                  const lineColor = slot.line?.color || '#94a3b8'

                  return (
                    <th key={`product-${slot.key}`} className="compact-product-header-cell">
                      <div className="compact-product-header-inner">
                        <span className="line-legend-dot" style={{ backgroundColor: lineColor }} aria-hidden="true" />
                        {editMode && isAdmin && line ? (
                          <input
                            className="compact-line-input"
                            value={productLabel}
                            onChange={(e) => setDraftLines((prev) => ({
                              ...prev,
                              [line.id]: e.target.value
                            }))}
                            onBlur={() => commitLineProduct(line, slot.key, draftLines[line.id] ?? productLabel)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                            }}
                          />
                        ) : editMode && isAdmin && !line ? (
                          <input
                            className="compact-line-input"
                            value={draftEmptySlots[slot.key] ?? fallbackProductLabel}
                            onChange={(e) => setDraftEmptySlots((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                            onBlur={() => commitEmptySlot(slot.key, draftEmptySlots[slot.key] ?? fallbackProductLabel)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                            }}
                          />
                        ) : (
                          <span className="compact-product-header-text">{productLabel}</span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedKpis.map((kpi) => {
                const kpiCode = String(kpi.name || '').toUpperCase()
                const isDMH = kpiCode === 'DMH'
                const draftKpi = draftKpis[kpi.id] || {}

                return (
                  <tr key={kpi.id}>
                    <td className="kpi-name-cell">
                      {editMode && isAdmin ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            className="compact-kpi-text-input"
                            value={draftKpi.name ?? kpi.name ?? ''}
                            onChange={(e) => setDraftKpis((prev) => ({
                              ...prev,
                              [kpi.id]: { ...(prev[kpi.id] || {}), name: e.target.value }
                            }))}
                            onBlur={() => commitKpiField(kpi, draftKpi)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                            }}
                          />
                          {onDeleteKpi && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '2px 5px', flexShrink: 0 }}
                              title={`Supprimer KPI ${kpi.name}`}
                              onClick={() => onDeleteKpi(kpi)}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      ) : (
                        kpi.name
                      )}
                    </td>
                    <td>
                      {editMode && isAdmin ? (
                        <input
                          type="number"
                          className="compact-kpi-input"
                          value={draftKpi.objective ?? kpi.objective ?? 0}
                          onChange={(e) => setDraftKpis((prev) => ({
                            ...prev,
                            [kpi.id]: { ...(prev[kpi.id] || {}), objective: e.target.value }
                          }))}
                          onBlur={() => commitKpiField(kpi, draftKpi)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                        />
                      ) : (
                        <>{kpi.objective}{kpi.unit || ''}</>
                      )}
                    </td>
                    <td>
                      {editMode && isAdmin ? (
                        <input
                          type="number"
                          className="compact-kpi-input"
                          value={draftKpi.alert_threshold ?? kpi.alert_threshold ?? 0}
                          onChange={(e) => setDraftKpis((prev) => ({
                            ...prev,
                            [kpi.id]: { ...(prev[kpi.id] || {}), alert_threshold: e.target.value }
                          }))}
                          onBlur={() => commitKpiField(kpi, draftKpi)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                        />
                      ) : (
                        <>{kpi.alert_threshold}{kpi.unit || ''}</>
                      )}
                    </td>
                    {displaySlots.map((slot) => {
                      const line = slot.line
                      if (!line) {
                        return <td key={`${slot.key}-${kpi.id}`} className="kpi-empty-cell">-</td>
                      }

                      const currentValue = matrix[`${line.id}-${kpi.id}`] ?? 0
                      const displayValue = isDMH ? `${currentValue}h` : `${currentValue}%`
                      const styleClass = getCellClass(currentValue, kpi.objective, kpi.alert_threshold, kpi.inverse)

                      return (
                        <td key={`${slot.key}-${kpi.id}`} className={styleClass}>
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
                              className="compact-kpi-input"
                            />
                          ) : (
                            <button
                              type="button"
                              className={`kpi-value-btn ${styleClass}`}
                            >
                              {displayValue}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CompactAtelierGroup({ atelier, atelierLines, atelierKpis, valueMatrix, isAdmin, onCellChange, onRenameLine, onUpdateKpi, onDeleteKpi, onAddLine, selectedDate }) {
  const isCms = atelier.nom.toUpperCase().includes('CMS')
  const badgeLabel = isCms ? 'CMS 2' : 'INTEG'

  return (
    <div className="dashboard-qrqc-atelier-group">
      <div className="dashboard-qrqc-group-badge-wrap">
        <span className={`compact-badge ${isCms ? 'is-cms' : 'is-integ'}`}>{badgeLabel}</span>
      </div>

      <div className="dashboard-qrqc-atelier-group-grid">
        <CompactAtelierTable
          atelier={atelier}
          lines={atelierLines}
          kpis={atelierKpis}
          matrix={valueMatrix}
          isAdmin={isAdmin}
          onCellChange={onCellChange}
          onRenameLine={onRenameLine}
          onUpdateKpi={onUpdateKpi}
          onDeleteKpi={onDeleteKpi}
          onAddLine={onAddLine}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  )
}

function DashboardFooterLegend({ lines }) {
  return (
    <div className="dashboard-footer-bar">
      <div className="dashboard-footer-left">
        <strong>Légende globale des lignes</strong>
        <div className="dashboard-footer-dots">
          {lines.map((line, index) => (
            <span key={line.id || index} className="dashboard-footer-dot-item">
              <span className="line-legend-dot" style={{ backgroundColor: line.color || '#94a3b8' }} aria-hidden="true" />
              {index + 1}
            </span>
          ))}
        </div>
      </div>
      <a href="/reports" className="dashboard-footer-link">Cohérence Dashboard / Historique / Tableaux</a>
    </div>
  )
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

function GapActionModal({ show, onClose, onSave, ateliers, lignes, initialData, saving, isAdmin }) {
  const [form, setForm] = useState({
    atelier_id: '',
    ligne_id: '',
    service_code: '',
    kpi_nom: '',
    ecart: '',
    causes: '',
    actions: '',
    impact: '',
    deadline: '',
    efficacite: ''
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
        deadline: '',
        efficacite: initialData?.efficacite === 0 || initialData?.efficacite === 1 ? String(initialData.efficacite) : ''
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

          {isAdmin && (
            <div className="form-group">
              <label className="form-label">Efficacité (admin)</label>
              <select
                className="form-select"
                value={form.efficacite}
                onChange={(e) => setForm((prev) => ({ ...prev, efficacite: e.target.value }))}
                disabled={!['cloture', 'cloture_valide'].includes(String(initialData?.statut || ''))}
              >
                <option value="">Non définie</option>
                <option value="1">1 - Efficace</option>
                <option value="0">0 - Inefficace</option>
              </select>
              {!['cloture', 'cloture_valide'].includes(String(initialData?.statut || '')) && (
                <p className="text-small text-secondary" style={{ marginTop: 6 }}>
                  Disponible après clôture de l'action.
                </p>
              )}
            </div>
          )}
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

function ActionDetailsModal({ open, onClose, statusLabel, actions }) {
  if (!open) return null

  return (
    <div className="modal-overlay action-details-overlay" onClick={onClose}>
      <div className="modal action-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Détails actions - {statusLabel}</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body action-details-modal-body">
          <div className="table-container action-details-table-wrap">
            <table className="data-table action-details-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Statut</th>
                  <th>Atelier</th>
                  <th>KPI</th>
                  <th>Ligne</th>
                  <th>Écart</th>
                  <th>Causes</th>
                  <th>Actions</th>
                  <th>Impact</th>
                  <th>Service Pilote</th>
                  <th>Délai</th>
                  <th>Efficacité</th>
                </tr>
              </thead>
              <tbody>
                {actions.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center' }}>Aucune action pour ce statut</td>
                  </tr>
                ) : (
                  actions.map((action, idx) => (
                    <tr key={action.id || idx}>
                      <td>{action.id || idx + 1}</td>
                      <td>{STATUS_META[action.statut]?.label || action.statut || '-'}</td>
                      <td>{action.atelier_nom || '-'}</td>
                      <td>{action.kpi_nom || '-'}</td>
                      <td>{action.ligne_nom || '-'}</td>
                      <td>{Number(action.ecart ?? 0)}</td>
                      <td title={action.causes || '-'}>{action.causes || '-'}</td>
                      <td title={action.actions || '-'}>{action.actions || '-'}</td>
                      <td>{Number(action.impact ?? 0)}</td>
                      <td title={action.pilot_names || action.service_code || '-'}>{action.pilot_names || action.service_code || '-'}</td>
                      <td>{formatDate(action.deadline || action.date)}</td>
                      <td>{formatEfficiency(action.efficacite)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompactAtelierChart({ atelier, atelierKpis, atelierLines, valueMatrix }) {
  const chartRows = ['TRG', 'FOR', 'FPY']
    .map((kpiName) => {
      const kpi = atelierKpis.find((item) => String(item.name || '').toUpperCase() === kpiName)
      if (!kpi) return null

      const row = {
        kpi: kpiName,
        objectif: Number(kpi.objective || 0)
      }

      for (const line of atelierLines) {
        row[`line_${line.id}`] = Number(valueMatrix[`${line.id}-${kpi.id}`] ?? 0)
      }

      return row
    })
    .filter(Boolean)

  const hasData = chartRows.length > 0

  return (
    <div className="atelier-compact-chart card">
      <div className="card-header">
        <h3>{atelier.nom} - TRG / FOR / FPY</h3>
      </div>
      <div className="card-body">
        {hasData ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartRows} margin={{ top: 8, right: 10, left: 6, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ef" />
              <XAxis dataKey="kpi" stroke="#334155" tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {atelierLines.map((line) => (
                <Bar
                  key={line.id}
                  dataKey={`line_${line.id}`}
                  name={parseLineDescriptor(line.nom).productName || line.nom}
                  fill={line.color}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={16}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-small text-secondary" style={{ padding: '58px 8px', textAlign: 'center' }}>
            KPI TRG/FOR/FPY manquants pour cet atelier.
          </div>
        )}
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
  onRenameLine,
  onDeleteLine,
  onAddKpi,
  onDeleteKpi,
  onReset,
  onOpenGapAction
}) {
  const [showKpiModal, setShowKpiModal] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const legendLines = useMemo(
    () => lines.map((line) => {
      const descriptor = parseLineDescriptor(line.nom)
      return {
        ...line,
        nom: descriptor.productName || line.nom,
        color: getLineColor(line)
      }
    }),
    [lines]
  )

  const slotColumns = useMemo(() => {
    const slots = FIXED_LINE_NUMBERS.map((lineNumber) => ({
      lineNumber,
      line: null
    }))

    const unassigned = []

    for (const line of lines) {
      const descriptor = parseLineDescriptor(line.nom)
      if (descriptor.lineNumber && descriptor.lineNumber >= 1 && descriptor.lineNumber <= 5) {
        const slot = slots.find((item) => item.lineNumber === descriptor.lineNumber)
        if (slot && !slot.line) {
          slot.line = line
          continue
        }
      }
      unassigned.push(line)
    }

    for (const line of unassigned) {
      const emptySlot = slots.find((slot) => !slot.line)
      if (!emptySlot) break
      emptySlot.line = line
    }

    return slots
  }, [lines])

  const sortedKpis = useMemo(() => {
    const rankByCode = {
      TRG: 1,
      FOR: 2,
      FPY: 3,
      QTE: 4,
      QTES: 4,
      DMH: 5
    }

    return [...kpis].sort((a, b) => {
      const aCode = normalizeText(a.name || '').toUpperCase()
      const bCode = normalizeText(b.name || '').toUpperCase()
      const aRank = rankByCode[aCode] || 99
      const bRank = rankByCode[bCode] || 99
      if (aRank !== bRank) return aRank - bRank
      return String(a.name || '').localeCompare(String(b.name || ''), 'fr')
    })
  }, [kpis])

  const handleRenameLine = (line, nextName) => {
    if (!isAdmin) return
    const trimmed = String(nextName || '').trim()
    if (!trimmed || trimmed === line.nom) return
    onRenameLine(line, trimmed)
  }

  const handleModifyLineAndProduct = async () => {
    if (!isAdmin) return

    const nextLineRaw = window.prompt('Numero de ligne (1 a 5)', '1')
    if (!nextLineRaw) return
    const nextLineNumber = Number(nextLineRaw)
    if (!Number.isInteger(nextLineNumber) || nextLineNumber < 1 || nextLineNumber > 5) {
      alert('Le numero de ligne doit etre entre 1 et 5.')
      return
    }

    const existingSlot = slotColumns.find((entry) => Number(entry.lineNumber) === Number(nextLineNumber))
    const existingProduct = parseLineDescriptor(existingSlot?.line?.nom || '').productName || ''

    const nextProduct = window.prompt('Nom du produit', existingProduct)
    if (!nextProduct) return
    const nextProductTrimmed = String(nextProduct).trim()
    if (!nextProductTrimmed) {
      alert('Le nom du produit est obligatoire.')
      return
    }

    const descriptor = buildLineDescriptor(nextLineNumber, nextProductTrimmed)

    try {
      if (existingSlot?.line) {
        await onRenameLine(existingSlot.line, descriptor)
      } else {
        await onAddLine({ nom: descriptor })
      }
    } catch (error) {
      alert(error.message || 'Erreur modification ligne/produit')
    }
  }

  return (
    <div className="card compact-atelier-card" style={{ marginBottom: 0 }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3>{atelier.nom}</h3>
        <div className="btn-group">
          {isAdmin && (
            <>
              <button className="btn btn-sm btn-outline" onClick={handleModifyLineAndProduct}>
                <Edit size={14} /> Modifier
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
        <div className="table-container compact-table-container kpi-scroll-wrap" style={{ marginTop: 8 }}>
          <table className="performance-table compact-performance-table production-double-header-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ textAlign: 'left', minWidth: 95 }}>Produit / KPI</th>
                <th rowSpan={2}>Objectif</th>
                <th rowSpan={2}>Alerte</th>
                {slotColumns.map((slot) => (
                  <th key={`line-${slot.lineNumber}`} style={{ textAlign: 'center', fontSize: 12, letterSpacing: 0.2, fontWeight: 700 }}>
                    Ligne {slot.lineNumber}
                  </th>
                ))}
              </tr>
              <tr>
                {slotColumns.map((slot) => {
                  const line = slot.line
                  const descriptor = parseLineDescriptor(line?.nom || '')
                  const productLabel = line ? (descriptor.productName || `Produit ${slot.lineNumber}`) : '-'
                  const dotColor = line ? getLineColor(line) : '#cbd5e1'

                  return (
                    <th key={`product-${slot.lineNumber}`}>
                      <div className="production-header-cell">
                        <span className="line-legend-dot" style={{ backgroundColor: dotColor }} />
                        <span className="production-name" title={productLabel}>{productLabel}</span>
                        {isAdmin && editMode && line && (
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
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedKpis.map((kpi) => (
                <tr key={kpi.id}>
                  <td style={{ textAlign: 'left', fontWeight: 600 }}>
                    <span>{kpi.name}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{kpi.objective}{kpi.unit}</td>
                  <td style={{ textAlign: 'center' }}>{kpi.alert_threshold}{kpi.unit}</td>
                  {slotColumns.map((slot) => {
                    const line = slot.line
                    if (!line) {
                      return (
                        <td key={`empty-${slot.lineNumber}-${kpi.id}`} style={{ textAlign: 'center', color: '#94a3b8' }}>
                          -
                        </td>
                      )
                    }

                    const key = `${line.id}-${kpi.id}`
                    const currentValue = matrix[key] ?? 0
                    const cls = getCellClass(currentValue, kpi.objective, kpi.alert_threshold, Boolean(kpi.inverse))

                    return (
                      <td key={key} style={{ textAlign: 'center' }}>
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
                            style={{ width: 36, textAlign: 'center' }}
                          />
                        ) : (
                          <button
                            className={`kpi-value-btn ${cls}`}
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
  const { getAuthHeader, hasRole, user } = useAuth()
  const isAdmin = hasRole('admin')
  const isManagement = hasRole('management')
  const userService = user?.role ? ROLE_SERVICE_MAP[user.role] : null

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const [ateliers, setAteliers] = useState([])
  const [lignes, setLignes] = useState([])
  const [kpis, setKpis] = useState([])
  const [kpiValues, setKpiValues] = useState([])
  const [gapActions, setGapActions] = useState([])
  const [showGapModal, setShowGapModal] = useState(false)
  const [savingGapAction, setSavingGapAction] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [gapActionInitialData, setGapActionInitialData] = useState(null)
  const [activePieStatusKey, setActivePieStatusKey] = useState('en_attente')
  const [showActionDetailsModal, setShowActionDetailsModal] = useState(false)

  const authHeader = useMemo(() => getAuthHeader(), [getAuthHeader])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [ateliersRes, lignesRes, kpisRes, valuesRes, actionsRes] = await Promise.all([
        fetch(`${API_URL}/ateliers`, { headers: authHeader }),
        fetch(`${API_URL}/lignes`, { headers: authHeader }),
        fetch(`${API_URL}/kpis`, { headers: authHeader }),
        fetch(`${API_URL}/kpi-values?date=${selectedDate}`, { headers: authHeader }),
        fetch(`${API_URL}/gap-analysis`, { headers: authHeader })
      ])

      const [ateliersData, lignesData, kpisData, valuesData, actionsData] = await Promise.all([
        ateliersRes.json(),
        lignesRes.json(),
        kpisRes.json(),
        valuesRes.json(),
        actionsRes.json()
      ])

      setAteliers(ateliersData)
      setLignes(lignesData)
      setKpis(kpisData)
      setKpiValues(valuesData)
      setGapActions(Array.isArray(actionsData) ? actionsData : [])
    } catch (error) {
      console.error('Erreur de chargement dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [selectedDate])

  const lineColorMap = useMemo(() => {
    const FALLBACK = getFallbackColors()
    const map = {}
    const byAtelier = {}
    for (const line of lignes) {
      const aid = Number(line.atelier_id)
      if (!byAtelier[aid]) byAtelier[aid] = []
      byAtelier[aid].push(line)
    }
    for (const atelierLines of Object.values(byAtelier)) {
      atelierLines.forEach((line, fallbackIndex) => {
        const descriptor = parseLineDescriptor(line.nom)
        if (descriptor.lineNumber != null && descriptor.lineNumber >= 1) {
          map[line.id] = FALLBACK[(descriptor.lineNumber - 1) % FALLBACK.length]
          return
        }
        if (isHexColor(line.color)) { map[line.id] = line.color; return }
        const colorIndex = fallbackIndex
        map[line.id] = FALLBACK[colorIndex % FALLBACK.length]
      })
    }
    return map
  }, [lignes])

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

  const scopedGapActions = useMemo(() => {
    if (isAdmin || isManagement) return gapActions
    if (!userService) return []
    return gapActions.filter((action) => action.service_code === userService)
  }, [gapActions, isAdmin, isManagement, userService])

  const statusPieData = useMemo(() => {
    return STATUS_KEYS.map((statusKey) => {
      const value = scopedGapActions.filter((action) => action.statut === statusKey).length
      const meta = STATUS_META[statusKey]
      return {
        ...meta,
        value
      }
    })
  }, [scopedGapActions])

  const selectedStatusMeta = STATUS_META[activePieStatusKey] || STATUS_META.en_attente

  const selectedStatusActions = useMemo(() => {
    return scopedGapActions
      .filter((action) => action.statut === activePieStatusKey)
      .sort((a, b) => {
        const aTs = new Date(a.created_at || a.date || 0).getTime()
        const bTs = new Date(b.created_at || b.date || 0).getTime()
        if (aTs !== bTs) return bTs - aTs
        return Number(b.id || 0) - Number(a.id || 0)
      })
  }, [scopedGapActions, activePieStatusKey])

  useEffect(() => {
    const hasDataForCurrent = statusPieData.some((entry) => entry.key === activePieStatusKey && entry.value > 0)
    if (hasDataForCurrent) return

    const fallback = statusPieData.find((entry) => entry.value > 0)
    if (fallback?.key) {
      setActivePieStatusKey(fallback.key)
    }
  }, [statusPieData, activePieStatusKey])

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

  const renameLine = async (line, newName) => {
    try {
      const res = await fetch(`${API_URL}/lignes/${line.id}`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: newName })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erreur modification ligne')

      setLignes((prev) => prev.map((item) => (
        Number(item.id) === Number(line.id) ? { ...item, nom: newName } : item
      )))
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

  const updateKpi = async (kpi) => {
    try {
      const res = await fetch(`${API_URL}/kpis/${kpi.id}`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: kpi.name,
          objective: kpi.objective,
          alert_threshold: kpi.alert_threshold,
          inverse: kpi.inverse,
          unit: kpi.unit
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erreur modification KPI')

      setKpis((prev) => prev.map((item) => (
        Number(item.id) === Number(kpi.id) ? { ...item, ...data.kpi, name: data.kpi?.name ?? kpi.name } : item
      )))
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
        deadline: form.deadline || null,
        efficacite: form.efficacite === '' ? null : Number(form.efficacite)
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
      await fetchAll()
      alert('Action enregistree dans le plan d\'actions')
    } catch (error) {
      alert(error.message)
    } finally {
      setSavingGapAction(false)
    }
  }

  const totalActions = scopedGapActions.length

  const ateliersDataForLayout = ateliersByTarget.map((atelier) => {
    const atelierLines = lignes
      .filter((line) => Number(line.atelier_id) === Number(atelier.id))
      .map((line) => ({ ...line, color: lineColorMap[line.id] || getLineColor(line) }))
    const atelierKpis = kpis.filter((kpi) => Number(kpi.atelier_id) === Number(atelier.id))
    return {
      atelier,
      atelierLines,
      atelierKpis
    }
  })

  const atelierKpiCharts = ateliersDataForLayout.map(({ atelier, atelierLines, atelierKpis }) => {
    const targetKpis = ['TRG', 'FOR', 'FPY']
      .map((kpiName) => atelierKpis.find((item) => String(item.name || '').toUpperCase() === kpiName))
      .filter(Boolean)

    const data = targetKpis.map((kpi) => {
      const row = {
        kpi: String(kpi.name || '').toUpperCase()
      }

      atelierLines.forEach((line) => {
        row[`line_${line.id}`] = Number(valueMatrix[`${line.id}-${kpi.id}`] ?? 0)
      })

      return row
    })

    const series = atelierLines.map((line) => ({
      key: `line_${line.id}`,
      label: parseLineDescriptor(line.nom).productName || line.nom,
      color: line.color
    }))

    const objectives = targetKpis.map((kpi) => ({
      name: String(kpi.name || '').toUpperCase(),
      target: Number(kpi.objective || 0),
      unit: kpi.unit || '%'
    }))

    return {
      atelier,
      data,
      series,
      objectives
    }
  })

  const openStatusDetails = (statusKey) => {
    setActivePieStatusKey(statusKey)
    setShowActionDetailsModal(true)
  }

  return (
    <div className="fade-in dashboard-qrqc-shell">
      <div className="dashboard-qrqc-grid">
        <header className="dashboard-qrqc-header">
          <div className="dashboard-qrqc-header-left">
            <h2>Dashboard QRQC</h2>
            <p>Vue compacte CMS2 + INTEG, conçue pour rester entièrement visible dans 100vh.</p>
          </div>

          <div className="dashboard-qrqc-header-right">
            <div className="dashboard-qrqc-date-chip" title={selectedDate}>
              {formatDate(selectedDate)}
            </div>
            {isAdmin && (
              <button className="btn dashboard-qrqc-template-btn" onClick={applyTemplateV0} disabled={applyingTemplate}>
                <Plus size={14} className={applyingTemplate ? 'loading-spinner' : ''} />
                {applyingTemplate ? 'Template...' : '+ Template v0 CMS2 + INTEG'}
              </button>
            )}
            <button className="btn dashboard-qrqc-refresh-btn" onClick={refresh}>
              <RefreshCw size={14} className={refreshing ? 'loading-spinner' : ''} />
              Actualiser
            </button>
          </div>
        </header>

        {loading ? (
          <div className="loading-screen dashboard-loading-screen"><div className="loading-spinner" /></div>
        ) : (
          <main className="dashboard-qrqc-main">
            <section className="dashboard-qrqc-bottom-row">
              {ateliersDataForLayout.map(({ atelier, atelierLines, atelierKpis }) => (
                <div className="dashboard-qrqc-bottom-cell" key={atelier.id}>
                  <CompactAtelierGroup
                    atelier={atelier}
                    atelierLines={atelierLines}
                    atelierKpis={atelierKpis}
                    valueMatrix={valueMatrix}
                    isAdmin={isAdmin}
                    onCellChange={upsertCell}
                    onRenameLine={renameLine}
                    onUpdateKpi={updateKpi}
                    onDeleteKpi={deleteKpi}
                    onAddLine={(payload) => addLine(atelier, payload)}
                    selectedDate={selectedDate}
                  />
                </div>
              ))}
            </section>

            <section className="dashboard-qrqc-top-row">
              <div className="dashboard-qrqc-card dashboard-qrqc-status-card">
                <div className="card-header dashboard-qrqc-card-header">
                  <h3>
                    <PieChartIcon size={16} />
                    Répartition des actions par statut
                  </h3>
                  <button className="dashboard-qrqc-total-chip" onClick={() => openStatusDetails(selectedStatusMeta.key)}>
                    Total {totalActions}
                  </button>
                </div>

                <div className="card-body dashboard-qrqc-status-body">
                  <div className="dashboard-qrqc-donut-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          {statusPieData.map((entry) => (
                            <linearGradient key={entry.key} id={`status-grad-${entry.key}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                              <stop offset="100%" stopColor={entry.color} stopOpacity={0.72} />
                            </linearGradient>
                          ))}
                        </defs>
                        <Pie
                          data={statusPieData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={70}
                          paddingAngle={4}
                          onClick={(_, index) => {
                            const clicked = statusPieData[index]
                            if (!clicked?.key) return
                            openStatusDetails(clicked.key)
                          }}
                          isAnimationActive
                          animationDuration={450}
                        >
                          {statusPieData.map((entry) => (
                            <Cell
                              key={entry.key}
                              fill={`url(#status-grad-${entry.key})`}
                              stroke="#ffffff"
                              strokeWidth={1}
                              style={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}`, 'Actions']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="dashboard-qrqc-donut-center">
                      <strong>{totalActions}</strong>
                      <span>Actions</span>
                    </div>
                  </div>

                  <div className="dashboard-qrqc-status-legend" aria-label="Légende des statuts">
                    {statusPieData.map((entry) => (
                      <button
                        key={entry.key}
                        type="button"
                        className={`dashboard-qrqc-status-legend-item ${entry.key === activePieStatusKey ? 'is-active' : ''}`}
                        onClick={() => openStatusDetails(entry.key)}
                        title={entry.label}
                      >
                        <span
                          className="line-legend-dot"
                          style={{ backgroundColor: entry.color }}
                          aria-hidden="true"
                        />
                        <span className="dashboard-qrqc-status-legend-label">{entry.label}</span>
                        <span className="dashboard-qrqc-status-legend-value">{entry.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="dashboard-qrqc-card dashboard-qrqc-status-graphs-card">
                <div className="card-header dashboard-qrqc-card-header">
                  <h3>FOR / TRG / FPY - CMS2 & INTEG</h3>
                </div>
                <div className="card-body dashboard-qrqc-status-graphs-body">
                  {atelierKpiCharts.map(({ atelier, data, series, objectives }) => (
                    <MultiKpiRectChart
                      key={atelier.id}
                      title={atelier.nom.toUpperCase().includes('CMS') ? 'CMS2' : 'INTEG'}
                      data={data}
                      series={series}
                      objectives={objectives}
                      unit="%"
                      chartHeight={185}
                      compact
                    />
                  ))}
                </div>
              </div>

            </section>

            <footer className="dashboard-qrqc-footer">
              <DashboardFooterLegend lines={lignes.slice(0, 5).map((line) => ({ ...line, color: lineColorMap[line.id] || getLineColor(line) }))} />
            </footer>
          </main>
        )}
      </div>

      <StatusDetailsModal
        open={showActionDetailsModal}
        onClose={() => setShowActionDetailsModal(false)}
        title={selectedStatusMeta.label}
        rows={selectedStatusActions}
      />

      <GapActionModal
        show={showGapModal}
        onClose={() => setShowGapModal(false)}
        onSave={saveGapAction}
        ateliers={ateliersByTarget}
        lignes={lignes}
        initialData={gapActionInitialData}
        saving={savingGapAction}
        isAdmin={isAdmin}
      />
    </div>
  )
}

export default Dashboard
