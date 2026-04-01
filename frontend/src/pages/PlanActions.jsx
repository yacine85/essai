import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, Edit, Filter, Check, X, Lock } from 'lucide-react'
import { API_URL } from '../config/api'

const STATUTS = [
  { value: 'en_attente', label: 'En attente de validation', color: '#f59e0b' },
  { value: 'en_cours', label: 'En cours', color: '#8b5cf6' },
  { value: 'refuse', label: 'Refusé', color: '#ef4444' },
  { value: 'cloture', label: 'Clôturé', color: '#22c55e' }
]

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

function PlanActions() {
  const { getAuthHeader, hasRole, user: currentUser } = useAuth()
  const isAdmin = hasRole('admin')
  const isRepresentant = currentUser?.role && currentUser.role.startsWith('pilote_') && !currentUser.role.endsWith('_sec')
  const isRepresentantSec = currentUser?.role && currentUser.role.endsWith('_sec')
  const userService = currentUser?.role ? ROLE_SERVICE_MAP[currentUser.role] : null
  
  const [actions, setActions] = useState([])
  const [ateliers, setAteliers] = useState([])
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('')
  const [filterAtelier, setFilterAtelier] = useState('')
  const [filterKpi, setFilterKpi] = useState('')
  const [filterLigne, setFilterLigne] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterLast, setFilterLast] = useState('10')
  const [showModal, setShowModal] = useState(false)
  const [editingAction, setEditingAction] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  
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
    statut: 'en_attente'
  })

  const fetchData = async () => {
    try {
      const authHeader = getAuthHeader()
      const [actionsRes, ateliersRes, lignesRes] = await Promise.all([
        fetch(`${API_URL}/gap-analysis`, { headers: authHeader }),
        fetch(`${API_URL}/ateliers`, { headers: authHeader }),
        fetch(`${API_URL}/lignes`, { headers: authHeader })
      ])

      setActions(await actionsRes.json())
      setAteliers(await ateliersRes.json())
      setLignes(await lignesRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    try {
      if (!isAdmin) {
        alert('Seul l\'administrateur peut créer ou modifier une action')
        return
      }

      const authHeader = getAuthHeader()

      if (!formData.atelier_id || !formData.ligne_id) {
        alert('Veuillez sélectionner un atelier et une ligne')
        return
      }

      if (!formData.service_code) {
        alert('Veuillez sélectionner le service responsable')
        return
      }

      const payload = {
        atelier_id: parseInt(formData.atelier_id),
        ligne_id: parseInt(formData.ligne_id),
        ecart: parseFloat(formData.ecart) || 0,
        impact: parseFloat(formData.impact) || 0,
        service_code: formData.service_code,
        deadline: formData.deadline || null,
        kpi_nom: formData.kpi_nom,
        causes: formData.causes,
        actions: formData.actions,
        date: new Date().toISOString().split('T')[0],
        realise: false
      }

      let response
      if (editingAction) {
        response = await fetch(`${API_URL}/gap-analysis/${editingAction.id}`, {
          method: 'PUT',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingAction, ...payload })
        })
      } else {
        response = await fetch(`${API_URL}/gap-analysis`, {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        alert(data.error || 'Erreur lors de la sauvegarde de l\'action')
        return
      }

      setShowModal(false)
      setEditingAction(null)
      fetchData()
    } catch (error) {
      console.error('Error saving action:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette action ?')) return
    try {
      const authHeader = getAuthHeader()
      await fetch(`${API_URL}/gap-analysis/${id}`, { method: 'DELETE', headers: authHeader })
      fetchData()
    } catch (error) {
      console.error('Error deleting action:', error)
    }
  }

  const openEditModal = (action) => {
    setEditingAction(action)
    setFormData({
      atelier_id: action.atelier_id?.toString() || '',
      ligne_id: action.ligne_id?.toString() || '',
      kpi_nom: action.kpi_nom || '',
      ecart: action.ecart?.toString() || '',
      causes: action.causes || '',
      actions: action.actions || '',
      impact: action.impact?.toString() || '',
      service_code: action.service_code || '',
      deadline: action.deadline || '',
      statut: action.statut || 'en_attente'
    })
    setShowModal(true)
  }

  const getStatutInfo = (statut) => {
    return STATUTS.find(s => s.value === statut) || STATUTS[0]
  }

  const filteredLignes = lignes.filter(l => l.atelier_id === parseInt(formData.atelier_id))

  // Check if user can perform action on this specific action
  const canValidateAction = (action) => {
    return Boolean((isRepresentant || isRepresentantSec) && userService && action.service_code === userService && action.statut === 'en_attente')
  }

  const canCloseAction = (action) => {
    return Boolean(isRepresentant && userService && action.service_code === userService && action.statut === 'en_cours')
  }

  const handleValidate = async (id) => {
    if (!window.confirm('Voulez-vous valider cette action ? Elle passera en statut "En cours".')) return
    setProcessingId(id)
    try {
      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/gap-analysis/${id}/validate`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        fetchData()
      } else {
        alert(data.error || 'Erreur lors de la validation')
      }
    } catch (error) {
      console.error('Error validating action:', error)
      alert('Erreur lors de la validation')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id) => {
    if (!window.confirm('Voulez-vous rejeter cette action ?')) return
    setProcessingId(id)
    try {
      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/gap-analysis/${id}/reject`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        fetchData()
      } else {
        alert(data.error || 'Erreur lors du rejet')
      }
    } catch (error) {
      console.error('Error rejecting action:', error)
      alert('Erreur lors du rejet')
    } finally {
      setProcessingId(null)
    }
  }

  const handleClose = async (id) => {
    if (!window.confirm('Voulez-vous clôturer cette action ? Elle sera marquée comme terminée.')) return
    setProcessingId(id)
    try {
      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/gap-analysis/${id}/close`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        fetchData()
      } else {
        alert(data.error || 'Erreur lors de la clôture')
      }
    } catch (error) {
      console.error('Error closing action:', error)
      alert('Erreur lors de la clôture')
    } finally {
      setProcessingId(null)
    }
  }

  const roleScopedActions = isAdmin
    ? actions
    : userService
      ? actions.filter(action => action.service_code === userService)
      : []

  const normalizedKpiFilter = filterKpi.trim().toLowerCase()

  const availableKpis = Array.from(
    new Set(
      roleScopedActions
        .map((action) => String(action.kpi_nom || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))

  const availableServices = Array.from(
    new Set(roleScopedActions.map((action) => action.service_code).filter(Boolean))
  )

  const availableLignes = lignes
    .filter((ligne) => {
      if (!filterAtelier) return true
      return Number(ligne.atelier_id) === Number(filterAtelier)
    })
    .filter((ligne) => {
      const presentInActions = roleScopedActions.some((action) => Number(action.ligne_id) === Number(ligne.id))
      return presentInActions
    })

  const visibleActions = roleScopedActions
    .filter((action) => {
      if (filterStatut && action.statut !== filterStatut) return false
      if (filterAtelier && Number(action.atelier_id) !== Number(filterAtelier)) return false
      if (normalizedKpiFilter && !String(action.kpi_nom || '').toLowerCase().includes(normalizedKpiFilter)) return false
      if (filterLigne && Number(action.ligne_id) !== Number(filterLigne)) return false
      if (filterService && action.service_code !== filterService) return false
      return true
    })
    .sort((a, b) => {
      const aTs = new Date(a.created_at || a.date || 0).getTime()
      const bTs = new Date(b.created_at || b.date || 0).getTime()
      if (aTs !== bTs) return bTs - aTs
      return Number(b.id || 0) - Number(a.id || 0)
    })
    .slice(0, filterLast ? Number(filterLast) : undefined)

  const getServiceLabel = (serviceCode) => {
    return SERVICE_OPTIONS.find(s => s.value === serviceCode)?.label || '-'
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Plan d'Actions</h2>
          <p className="text-secondary">Suivi des actions correctives</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => {
            setEditingAction(null)
            setFormData({
              atelier_id: '',
              ligne_id: '',
              kpi_nom: '',
              ecart: '',
              causes: '',
              actions: '',
              impact: '',
              service_code: '',
              deadline: '',
              statut: 'en_attente'
            })
            setShowModal(true)
          }}>
            <Plus size={18} /> Nouvelle Action
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={18} />
            <select className="form-select" style={{ width: 'auto' }} value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={filterAtelier}
              onChange={(e) => {
                setFilterAtelier(e.target.value)
                setFilterLigne('')
              }}
            >
              <option value="">Tous les ateliers</option>
              {ateliers.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
            <input
              className="form-input"
              style={{ width: 180 }}
              value={filterKpi}
              onChange={(e) => setFilterKpi(e.target.value)}
              list="plan-actions-kpi-list"
              placeholder="Filtrer par KPI"
            />
            <datalist id="plan-actions-kpi-list">
              {availableKpis.map((kpi) => (
                <option key={kpi} value={kpi} />
              ))}
            </datalist>
            <select className="form-select" style={{ width: 'auto' }} value={filterLigne} onChange={(e) => setFilterLigne(e.target.value)}>
              <option value="">Toutes les lignes</option>
              {availableLignes.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={filterService} onChange={(e) => setFilterService(e.target.value)}>
              <option value="">Tous les services pilotes</option>
              {SERVICE_OPTIONS
                .filter((service) => availableServices.includes(service.value))
                .map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={filterLast} onChange={(e) => setFilterLast(e.target.value)}>
              <option value="10">10 dernières actions</option>
              <option value="20">20 dernières actions</option>
              <option value="50">50 dernières actions</option>
              <option value="">Toutes les actions</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-container">
          <table className="data-table">
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
                <th>Gestion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ textAlign: 'center' }}>Chargement...</td></tr>
              ) : visibleActions.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center' }}>Aucune action</td></tr>
              ) : (
                visibleActions.map((action, idx) => {
                  const statutInfo = getStatutInfo(action.statut)
                  const canValidate = canValidateAction(action)
                  const canClose = canCloseAction(action)
                  return (
                    <tr key={action.id}>
                      <td style={{ fontWeight: 600 }}>#{String(idx + 1).padStart(4, '0')}</td>
                      <td>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 4,
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          background: `${statutInfo.color}20`,
                          color: statutInfo.color,
                          fontWeight: 500,
                          fontSize: 12
                        }}>
                          {statutInfo.label}
                        </span>
                      </td>
                      <td>{action.atelier_nom || '-'}</td>
                      <td>{action.kpi_nom || '-'}</td>
                      <td>{action.ligne_nom || '-'}</td>
                      <td style={{ fontWeight: 600, color: action.ecart < 0 ? '#ef4444' : '#22c55e' }}>{action.ecart}%</td>
                      <td>{action.causes || '-'}</td>
                      <td>{action.actions || '-'}</td>
                      <td>{action.impact || 0}%</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: 600 }}>{getServiceLabel(action.service_code)}</span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{action.pilot_names || '-'}</span>
                        </div>
                      </td>
                      <td>{action.deadline || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {/* Boutons de validation/rejet pour représentants */}
                          {canValidate && (
                            <>
                              <button 
                                className="btn btn-sm btn-success" 
                                onClick={() => handleValidate(action.id)}
                                disabled={processingId === action.id}
                                title="Valider l'action"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                className="btn btn-sm btn-danger" 
                                onClick={() => handleReject(action.id)}
                                disabled={processingId === action.id}
                                title="Rejeter l'action"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                          {/* Bouton de clôture pour représentant principal ou admin/management */}
                          {canClose && (
                            <button 
                              className="btn btn-sm" 
                              style={{ background: '#22c55e', color: 'white' }}
                              onClick={() => handleClose(action.id)}
                              disabled={processingId === action.id}
                              title="Clôturer l'action"
                            >
                              <Lock size={14} />
                            </button>
                          )}
                          {/* Boutons admin pour modifier/supprimer */}
                          {isAdmin && (
                            <>
                              <button className="btn btn-sm btn-outline" onClick={() => openEditModal(action)}>
                                <Edit size={14} />
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(action.id)}>
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>{editingAction ? 'Modifier l\'action' : 'Nouvelle Action'}</h3>
              <button className="btn btn-outline btn-icon" onClick={() => setShowModal(false)}>×</button>
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
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ligne</label>
                  <select className="form-select" value={formData.ligne_id} onChange={(e) => setFormData({ ...formData, ligne_id: e.target.value })} disabled={!formData.atelier_id}>
                    <option value="">Sélectionner</option>
                    {filteredLignes.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Service Pilote (obligatoire)</label>
                  <select className="form-select" value={formData.service_code} onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}>
                    <option value="">Sélectionner</option>
                    {SERVICE_OPTIONS.map(service => (
                      <option key={service.value} value={service.value}>{service.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">KPI</label>
                  <input type="text" className="form-input" value={formData.kpi_nom} onChange={(e) => setFormData({ ...formData, kpi_nom: e.target.value })} placeholder="Ex: TRG, FPY..." />
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
                  <label className="form-label">Délai</label>
                  <input type="date" className="form-input" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlanActions

