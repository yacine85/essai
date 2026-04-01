import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  RefreshCw,
  Edit,
  Save,
  Plus,
  Trash2,
  Settings,
  GripVertical,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/api'

const SERVICE_OPTIONS = [
  { value: 'test', label: 'Test' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'depannage', label: 'Dépannage' },
  { value: 'info_trace', label: 'Information et Traçabilité' },
  { value: 'qualite', label: 'Qualité' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'cms2', label: 'Atelier CMS2' },
  { value: 'methode', label: 'Méthode' },
  { value: 'process', label: 'Process' },
  { value: 'integration', label: 'Atelier Intégration' }
]

// Couleur selon la performance
function getCellColor(value, objective, alert, inverse = false) {
  if (inverse) {
    if (value <= objective) return 'cell-success'
    if (value <= alert) return 'cell-warning'
    return 'cell-danger'
  }
  if (value >= objective) return 'cell-success'
  if (value >= alert) return 'cell-warning'
  return 'cell-danger'
}

function getStatusIndicator(value, objective, alert, inverse = false) {
  if (inverse) {
    if (value <= objective) return 'success'
    if (value <= alert) return 'warning'
    return 'danger'
  }
  if (value >= objective) return 'success'
  if (value >= alert) return 'warning'
  return 'danger'
}

// Modal pour ajouter/modifier un indicateur
function IndicatorModal({ show, onClose, onSave, indicator = null }) {
  const [formData, setFormData] = useState({
    name: '',
    objective: 100,
    alert: 90,
    inverse: false,
    unit: '%'
  })

  useEffect(() => {
    if (indicator) {
      setFormData({
        name: indicator.name,
        objective: indicator.objective,
        alert: indicator.alert || indicator.objective * 0.9,
        inverse: indicator.inverse || false,
        unit: indicator.unit || '%'
      })
    } else {
      setFormData({ name: '', objective: 100, alert: 90, inverse: false, unit: '%' })
    }
  }, [indicator, show])

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3>{indicator ? 'Modifier l\'indicateur' : 'Nouvel indicateur'}</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nom de l'indicateur</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: TRG, FPY, Qtés..."
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Objectif (Vert)</label>
              <input 
                type="number" 
                className="form-input" 
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alerte (Orange)</label>
              <input 
                type="number" 
                className="form-input" 
                value={formData.alert}
                onChange={(e) => setFormData({ ...formData, alert: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unité</label>
              <select 
                className="form-select"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="%">%</option>
                <option value="">Nombre</option>
                <option value="€">€</option>
                <option value="min">Minutes</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
              <input 
                type="checkbox" 
                id="inverse"
                checked={formData.inverse}
                onChange={(e) => setFormData({ ...formData, inverse: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              <label htmlFor="inverse">Inversé (plus petit = mieux)</label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button 
            className="btn btn-primary" 
            onClick={() => onSave(formData)}
            disabled={!formData.name.trim()}
          >
            {indicator ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal pour ajouter une ligne de production
function LineModal({ show, onClose, onSave, atelierId }) {
  const [formData, setFormData] = useState({ nom: '' })

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Nouvelle Ligne de Production</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nom de la ligne</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: EE PRO, Claro, Wawoo, OPL..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button 
            className="btn btn-primary" 
            onClick={() => onSave(formData)}
            disabled={!formData.nom.trim()}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

// Tableau de performance performant
function PerformanceTable({ 
  title, 
  data, 
  loading, 
  isAdmin, 
  editMode, 
  onEdit, 
  onValueChange, 
  onAddIndicator,
  onDeleteIndicator,
  onAddLine,
  onDeleteLine,
  atelierId 
}) {
  const [showIndicatorModal, setShowIndicatorModal] = useState(false)
  const [showLineModal, setShowLineModal] = useState(false)
  const [editingIndicator, setEditingIndicator] = useState(null)

  if (loading) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header"><h3>{title}</h3></div>
        <div className="card-body"><p>Chargement...</p></div>
      </div>
    )
  }

  if (!data || !data.lines || data.lines.length === 0) {
    return (
      <div className="card" style={{ height: '100%' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{title}</h3>
          {isAdmin && atelierId && (
            <button className="btn btn-sm btn-primary" onClick={() => setShowLineModal(true)}>
              <Plus size={14} /> Ligne
            </button>
          )}
        </div>
        <div className="card-body">
          <p className="text-secondary">Aucune ligne de production. Ajoutez une ligne pour commencer.</p>
        </div>
        <LineModal 
          show={showLineModal} 
          onClose={() => setShowLineModal(false)} 
          onSave={(formData) => { onAddLine(formData); setShowLineModal(false); }}
          atelierId={atelierId}
        />
      </div>
    )
  }

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{title}</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <>
              <button className="btn btn-sm btn-outline" onClick={() => setShowLineModal(true)}>
                <Plus size={14} /> Ligne
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => { setEditingIndicator(null); setShowIndicatorModal(true); }}>
                <Plus size={14} /> Indicateur
              </button>
              <button className={`btn btn-sm ${editMode ? 'btn-success' : 'btn-outline'}`} onClick={onEdit}>
                {editMode ? <><Save size={14} /> Sauvegarder</> : <><Edit size={14} /> Modifier</>}
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="card-body table-container" style={{ overflowX: 'auto' }}>
        <table className="performance-table" style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ minWidth: '150px', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                Indicateur
              </th>
              <th style={{ minWidth: '80px', background: '#f5f5f5' }}>Objectif</th>
              <th style={{ minWidth: '80px', background: '#f5f5f5' }}>Alerte</th>
              {data.lines.map((line, idx) => (
                <th key={idx} style={{ minWidth: '100px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    {line.nom}
                    {isAdmin && editMode && (
                      <button 
                        className="btn btn-danger btn-sm" 
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={() => onDeleteLine(line.id)}
                        title="Supprimer la ligne"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.indicators.map((indicator, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 500, position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{indicator.name}</span>
                    {isAdmin && editMode && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button 
                          className="btn btn-sm" 
                          style={{ padding: '2px' }}
                          onClick={() => { setEditingIndicator(indicator); setShowIndicatorModal(true); }}
                          title="Modifier"
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: '2px' }}
                          onClick={() => onDeleteIndicator(idx)}
                          title="Supprimer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ background: '#f5f5f5', textAlign: 'center', fontWeight: 500, color: '#22c55e' }}>
                  {indicator.objective}{indicator.unit}
                </td>
                <td style={{ background: '#fef3c7', textAlign: 'center', color: '#f59e0b', fontWeight: 500 }}>
                  {indicator.alert}{indicator.unit}
                </td>
                {indicator.values.map((value, vIdx) => {
                  return (
                    <td 
                      key={vIdx} 
                      className={getCellColor(value, indicator.objective, indicator.alert, indicator.inverse)}
                      style={{ textAlign: 'center' }}
                    >
                      {editMode ? (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => onValueChange(idx, vIdx, parseFloat(e.target.value) || 0)}
                          style={{ 
                            width: '70px', 
                            padding: '4px', 
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span className={`status-dot ${getStatusIndicator(value, indicator.objective, indicator.alert, indicator.inverse)}`}></span>
                          <span>{value}{indicator.unit}</span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <IndicatorModal 
        show={showIndicatorModal} 
        onClose={() => { setShowIndicatorModal(false); setEditingIndicator(null); }} 
        onSave={(formData) => { onAddIndicator(formData, editingIndicator); setShowIndicatorModal(false); }}
        indicator={editingIndicator}
      />
      <LineModal 
        show={showLineModal} 
        onClose={() => setShowLineModal(false)} 
        onSave={(formData) => { onAddLine(formData); setShowLineModal(false); }}
        atelierId={atelierId}
      />
    </div>
  )
}

// Modal pour nouvelle analyse d'écart
function GapModal({ show, onClose, onSave, ateliers, lignes }) {
  const [formData, setFormData] = useState({
    atelier_id: '',
    ligne_id: '',
    kpi_nom: '',
    ecart: '',
    causes: '',
    actions: '',
    impact: '',
    service_code: '',
    deadline: '',
    realize: false
  })

  if (!show) return null

  const filteredLignes = lignes.filter(l => l.atelier_id === parseInt(formData.atelier_id))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3>Nouvelle Analyse d'Écart</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Atelier</label>
              <select className="form-select" value={formData.atelier_id} onChange={(e) => setFormData({ ...formData, atelier_id: e.target.value, ligne_id: '' })}>
                <option value="">Sélectionner</option>
                {ateliers.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ligne</label>
              <select className="form-select" value={formData.ligne_id} onChange={(e) => setFormData({ ...formData, ligne_id: e.target.value })} disabled={!formData.atelier_id}>
                <option value="">Sélectionner</option>
                {filteredLignes.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">KPI</label>
              <input type="text" className="form-input" value={formData.kpi_nom} onChange={(e) => setFormData({ ...formData, kpi_nom: e.target.value })} placeholder="Ex: TRG, FPY, Qtés..." />
            </div>
            <div className="form-group">
              <label className="form-label">Écart (%)</label>
              <input type="number" className="form-input" value={formData.ecart} onChange={(e) => setFormData({ ...formData, ecart: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Causes</label>
            <textarea className="form-textarea" value={formData.causes} onChange={(e) => setFormData({ ...formData, causes: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Actions à mener</label>
            <textarea className="form-textarea" value={formData.actions} onChange={(e) => setFormData({ ...formData, actions: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Impact (%)</label>
              <input type="number" className="form-input" value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Service Pilote</label>
              <select className="form-select" value={formData.service_code} onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}>
                <option value="">Sélectionner</option>
                {SERVICE_OPTIONS.map(service => <option key={service.value} value={service.value}>{service.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Délai</label>
              <input type="date" className="form-input" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '28px' }}>
              <input 
                type="checkbox" 
                id="realize"
                checked={formData.realize}
                onChange={(e) => setFormData({ ...formData, realize: e.target.checked })}
                style={{ marginRight: '8px', width: '18px', height: '18px' }}
              />
              <label htmlFor="realize" style={{ fontWeight: 500 }}>Réalisé</label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onSave(formData)}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// Section Analyse des écarts
function GapAnalysisSection({ data, loading, isAdmin, onAdd, onUpdate, onDelete, ateliers, lignes }) {
  const [showGapModal, setShowGapModal] = useState(false)
  
  if (loading) {
    return <div className="card"><div className="card-header"><h3>Analyse des Écarts</h3></div><div className="card-body"><p>Chargement...</p></div></div>
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Analyse des Écarts</h3>
        {isAdmin && <button className="btn btn-sm btn-primary" onClick={() => setShowGapModal(true)}><Plus size={14} /> Nouvelle Action</button>}
      </div>
      <div className="card-body table-container">
        <table className="gap-analysis-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>N°</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Écart</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Atelier</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>KPI</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Ligne</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Causes</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Actions</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Impact</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Service Pilote</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Délai</th>
              <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Réalisé</th>
              {isAdmin && <th style={{ padding: '10px', background: '#f5f0e6', border: '1px solid #e2e8f0' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={isAdmin ? 12 : 11} style={{ textAlign: 'center', padding: 20 }}>Aucune analyse d'écart</td></tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600, color: item.ecart < 0 ? '#e53e3e' : '#38a169' }}>{item.ecart}%</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.atelier_nom}</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.kpi_nom || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.ligne_nom}</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{isAdmin ? <input type="text" defaultValue={item.causes} onBlur={(e) => onUpdate(item.id, 'causes', e.target.value)} style={{ width: '100%', padding: '4px' }} /> : <span>{item.causes || '-'}</span>}</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{isAdmin ? <input type="text" defaultValue={item.actions} onBlur={(e) => onUpdate(item.id, 'actions', e.target.value)} style={{ width: '100%', padding: '4px' }} /> : <span>{item.actions || '-'}</span>}</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{item.impact || 0}%</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.service_code || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.deadline || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{item.realize ? 'Oui' : 'Non'}</td>
                  {isAdmin && <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}><button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}><Trash2 size={12} /></button></td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <GapModal
        show={showGapModal}
        onClose={() => setShowGapModal(false)}
        onSave={async (formData) => {
          const success = await onAdd(formData)
          if (success) {
            setShowGapModal(false)
          }
        }}
        ateliers={ateliers}
        lignes={lignes}
      />
    </div>
  )
}

function Dashboard() {
  const { getAuthHeader, hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  
  const [editMode, setEditMode] = useState(false)
  
  const [ateliers, setAteliers] = useState([])
  const [lignes, setLignes] = useState([])
  const [cms2Data, setCms2Data] = useState(null)
  const [integrationData, setIntegrationData] = useState(null)
  const [gapData, setGapData] = useState([])
  const [loading, setLoading] = useState(true)

  // Indicateurs par défaut
  const defaultIndicators = [
    { name: 'Qtés', values: [0, 0, 0], objective: 1000, alert: 800, inverse: false, unit: '' },
    { name: 'TRG', values: [0, 0, 0], objective: 95, alert: 90, inverse: false, unit: '%' },
    { name: 'DMH', values: [0, 0, 0], objective: 8, alert: 10, inverse: true, unit: 'h' },
    { name: 'FOR', values: [0, 0, 0], objective: 95, alert: 90, inverse: false, unit: '%' },
    { name: 'FPY', values: [0, 0, 0], objective: 98, alert: 95, inverse: false, unit: '%' },
    { name: 'EF', values: [0, 0, 0], objective: 100, alert: 90, inverse: false, unit: '%' },
    { name: 'Démérite', values: [0, 0, 0], objective: 0, alert: 5, inverse: true, unit: '' },
    { name: 'Encours pannes', values: [0, 0, 0], objective: 0, alert: 3, inverse: true, unit: '' },
    { name: 'Incident IT', values: [0, 0, 0], objective: 0, alert: 2, inverse: true, unit: '' },
    { name: 'QRQC', values: [0, 0, 0], objective: 4, alert: 3, inverse: false, unit: '' },
    { name: '5S', values: [0, 0, 0], objective: 90, alert: 80, inverse: false, unit: '%' }
  ]

  const fetchData = async () => {
    try {
      const authHeader = getAuthHeader()
      const [ateliersRes, lignesRes, gapRes] = await Promise.all([
        fetch(`${API_URL}/ateliers`, { headers: authHeader }),
        fetch(`${API_URL}/lignes`, { headers: authHeader }),
        fetch(`${API_URL}/gap-analysis?date=${selectedDate}`, { headers: authHeader })
      ])

      const ateliersData = await ateliersRes.json()
      const lignesData = await lignesRes.json()
      const gapDataRaw = await gapRes.json()

      setAteliers(ateliersData)
      setLignes(lignesData)
      setGapData(gapDataRaw)

      const cms2Atelier = ateliersData.find(a => a.nom === 'CMS 2' || a.nom.includes('CMS'))
      const integrationAtelier = ateliersData.find(a => a.nom === 'Intégration' || a.nom.includes('Intégr'))

      if (cms2Atelier) {
        const cms2Lignes = lignesData.filter(l => l.atelier_id === cms2Atelier.id)
        setCms2Data({
          lines: cms2Lignes,
          indicators: defaultIndicators.map(ind => ({
            ...ind,
            values: cms2Lignes.map(() => 0)
          }))
        })
      }

      if (integrationAtelier) {
        const intLignes = lignesData.filter(l => l.atelier_id === integrationAtelier.id)
        setIntegrationData({
          lines: intLignes,
          indicators: defaultIndicators.map(ind => ({
            ...ind,
            values: intLignes.map(() => 0)
          }))
        })
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedDate])

  const handleRefresh = () => { 
    setRefreshing(true); 
    fetchData().then(() => setRefreshing(false)) 
  }

  // Gestion des valeurs
  const handleCms2ValueChange = (idx, vIdx, val) => {
    const nd = { ...cms2Data }
    nd.indicators[idx].values[vIdx] = val
    setCms2Data(nd)
  }

  const handleIntValueChange = (idx, vIdx, val) => {
    const nd = { ...integrationData }
    nd.indicators[idx].values[vIdx] = val
    setIntegrationData(nd)
  }

  // Ajouter un indicateur
  const handleAddIndicator = (atelierName, formData, existingIndicator = null) => {
    const setter = atelierName === 'CMS 2' ? setCms2Data : setIntegrationData
    const currentData = atelierName === 'CMS 2' ? cms2Data : integrationData
    
    if (!currentData) return

    if (existingIndicator) {
      setter({
        ...currentData,
        indicators: currentData.indicators.map(ind => 
          ind.name === existingIndicator.name ? { ...ind, ...formData, values: ind.values } : ind
        )
      })
    } else {
      setter({
        ...currentData,
        indicators: [...currentData.indicators, {
          ...formData,
          values: currentData.lines.map(() => 0)
        }]
      })
    }
  }

  // Supprimer un indicateur
  const handleDeleteIndicator = (atelierName, idx) => {
    const setter = atelierName === 'CMS 2' ? setCms2Data : setIntegrationData
    const currentData = atelierName === 'CMS 2' ? cms2Data : integrationData
    
    if (!currentData) return
    
    setter({
      ...currentData,
      indicators: currentData.indicators.filter((_, i) => i !== idx)
    })
  }

  // Ajouter une ligne
  const handleAddLine = async (atelierName, formData) => {
    try {
      const authHeader = getAuthHeader()
      const atelier = ateliers.find(a => 
        atelierName === 'CMS 2' ? (a.nom === 'CMS 2' || a.nom.includes('CMS')) : (a.nom === 'Intégration' || a.nom.includes('Intégr'))
      )
      
      if (!atelier) return

      const response = await fetch(`${API_URL}/lignes`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ atelier_id: atelier.id, nom: formData.nom })
      })

      if (response.ok) {
        const lignesRes = await fetch(`${API_URL}/lignes`, { headers: authHeader })
        const lignesData = await lignesRes.json()
        setLignes(lignesData)

        const setter = atelierName === 'CMS 2' ? setCms2Data : setIntegrationData
        const currentData = atelierName === 'CMS 2' ? cms2Data : integrationData
        
        if (currentData) {
          const newLine = { id: Date.now(), atelier_id: atelier.id, nom: formData.nom }
          setter({
            ...currentData,
            lines: [...currentData.lines, newLine],
            indicators: currentData.indicators.map(ind => ({
              ...ind,
              values: [...ind.values, 0]
            }))
          })
        }
      }
    } catch (error) {
      console.error('Error adding line:', error)
    }
  }

  // Supprimer une ligne
  const handleDeleteLine = async (atelierName, lineId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette ligne ?')) return
    
    try {
      const authHeader = getAuthHeader()
      
      await fetch(`${API_URL}/lignes/${lineId}`, {
        method: 'DELETE',
        headers: authHeader
      })

      const setter = atelierName === 'CMS 2' ? setCms2Data : setIntegrationData
      const currentData = atelierName === 'CMS 2' ? cms2Data : integrationData
      
      if (currentData) {
        const lineIndex = currentData.lines.findIndex(l => l.id === lineId)
        setter({
          ...currentData,
          lines: currentData.lines.filter(l => l.id !== lineId),
          indicators: currentData.indicators.map(ind => ({
            ...ind,
            values: ind.values.filter((_, idx) => idx !== lineIndex)
          }))
        })
      }
    } catch (error) {
      console.error('Error deleting line:', error)
    }
  }

  // Gap Analysis handlers
  const handleAddGap = async (formData) => {
    try {
      if (!formData.atelier_id || !formData.ligne_id) {
        alert('Veuillez sélectionner un atelier et une ligne')
        return false
      }

      if (!formData.service_code) {
        alert('Veuillez sélectionner le service pilote')
        return false
      }

      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/gap-analysis`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          atelier_id: parseInt(formData.atelier_id),
          ligne_id: parseInt(formData.ligne_id),
          ecart: parseFloat(formData.ecart) || 0,
          causes: formData.causes,
          actions: formData.actions,
          impact: parseFloat(formData.impact) || 0,
          service_code: formData.service_code,
          deadline: formData.deadline || null,
          kpi_nom: formData.kpi_nom,
          realise: formData.realize || false
        })
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        alert(data.error || 'Erreur lors de la création de l\'action')
        return false
      }

      const gapRes = await fetch(`${API_URL}/gap-analysis?date=${selectedDate}`, { headers: authHeader })
      setGapData(await gapRes.json())
      return true
    } catch (error) {
      console.error('Error adding gap:', error)
      alert('Erreur lors de la création de l\'action')
      return false
    }
  }

  const handleUpdateGap = async (id, field, value) => {
    try {
      const authHeader = getAuthHeader()
      const item = gapData.find(g => g.id === id)
      if (!item) return
      await fetch(`${API_URL}/gap-analysis/${id}`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, [field]: value })
      })
      setGapData(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
    } catch (error) {
      console.error('Error updating gap:', error)
    }
  }

  const handleDeleteGap = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette analyse ?')) return
    try {
      const authHeader = getAuthHeader()
      await fetch(`${API_URL}/gap-analysis/${id}`, { method: 'DELETE', headers: authHeader })
      setGapData(prev => prev.filter(g => g.id !== id))
    } catch (error) {
      console.error('Error deleting gap:', error)
    }
  }

  const cms2Atelier = ateliers.find(a => a.nom === 'CMS 2' || a.nom.includes('CMS'))
  const integrationAtelier = ateliers.find(a => a.nom === 'Intégration' || a.nom.includes('Intégr'))

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Dashboard QRQC</h2>
          <p className="text-secondary">Suivi de performance - Production</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="form-input" 
            style={{ width: 'auto' }} 
          />
          <button className="btn btn-outline" onClick={handleRefresh}>
            <RefreshCw size={18} className={refreshing ? 'loading-spinner' : ''} /> Actualiser
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <PerformanceTable 
          title="Atelier CMS 2" 
          data={cms2Data} 
          loading={loading} 
          isAdmin={isAdmin}
          editMode={editMode}
          onEdit={() => setEditMode(!editMode)}
          onValueChange={handleCms2ValueChange}
          onAddIndicator={(formData, existing) => handleAddIndicator('CMS 2', formData, existing)}
          onDeleteIndicator={(idx) => handleDeleteIndicator('CMS 2', idx)}
          onAddLine={(formData) => handleAddLine('CMS 2', formData)}
          onDeleteLine={(id) => handleDeleteLine('CMS 2', id)}
          atelierId={cms2Atelier?.id}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <PerformanceTable 
          title="Atelier Intégration" 
          data={integrationData} 
          loading={loading} 
          isAdmin={isAdmin}
          editMode={editMode}
          onEdit={() => setEditMode(!editMode)}
          onValueChange={handleIntValueChange}
          onAddIndicator={(formData, existing) => handleAddIndicator('Intégration', formData, existing)}
          onDeleteIndicator={(idx) => handleDeleteIndicator('Intégration', idx)}
          onAddLine={(formData) => handleAddLine('Intégration', formData)}
          onDeleteLine={(id) => handleDeleteLine('Intégration', id)}
          atelierId={integrationAtelier?.id}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <GapAnalysisSection 
          data={gapData} 
          loading={loading} 
          isAdmin={isAdmin}
          onAdd={handleAddGap}
          onUpdate={handleUpdateGap}
          onDelete={handleDeleteGap}
          ateliers={ateliers}
          lignes={lignes}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }}></span>
          <span style={{ fontSize: 12 }}>Objectif atteint (Vert)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }}></span>
          <span style={{ fontSize: 12 }}>Alerte (Orange)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></span>
          <span style={{ fontSize: 12 }}>Critique (Rouge)</span>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

