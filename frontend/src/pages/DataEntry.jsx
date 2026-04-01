import { useState, useEffect } from 'react'
import { Save, History, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/api'

const causesArret = [
  'Panne machine',
  'Manque personnel',
  'Manque matière',
  'Formation',
  'Maintenance préventive',
  'Maintenance curative',
  'Problème qualité',
  'Autre'
]

const incidentTypes = [
  { value: 'technique', label: 'Technique' },
  { value: 'qualite', label: 'Qualité' },
  { value: 'securite', label: 'Sécurité' },
  { value: 'it', label: 'IT' },
  { value: 'autre', label: 'Autre' }
]

function DataEntry() {
  const { getAuthHeader, user } = useAuth()
  const [activeTab, setActiveTab] = useState('production')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedAtelier, setSelectedAtelier] = useState('')
  const [selectedLigne, setSelectedLigne] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Data from API
  const [ateliers, setAteliers] = useState([])
  const [lignes, setLignes] = useState([])
  const [history, setHistory] = useState([])

  const [formData, setFormData] = useState({
    // Production
    objectif: '',
    realise: '',
    // Arrêts
    arretDuree: '',
    arretCause: '',
    arretDescription: '',
    // Effectif
    nombreOperateurs: '',
    nombreTechniciens: '',
    dmh: '',
    // Incidents
    incidentDescription: '',
    incidentType: 'technique',
    priorite: 'moyenne'
  })

  useEffect(() => {
    fetchAteliers()
  }, [])

  useEffect(() => {
    if (selectedAtelier) {
      fetchLignes(selectedAtelier)
    } else {
      setLignes([])
      setSelectedLigne('')
    }
  }, [selectedAtelier])

  useEffect(() => {
    if (selectedAtelier && selectedDate) {
      fetchHistory()
    }
  }, [selectedAtelier, selectedDate])

  const fetchAteliers = async () => {
    try {
      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/ateliers`, { headers: authHeader })
      if (response.ok) {
        const data = await response.json()
        setAteliers(data)
      }
    } catch (error) {
      console.error('Error fetching ateliers:', error)
    }
  }

  const fetchLignes = async (atelierId) => {
    try {
      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/lignes/${atelierId}`, { headers: authHeader })
      if (response.ok) {
        const data = await response.json()
        setLignes(data)
      }
    } catch (error) {
      console.error('Error fetching lignes:', error)
    }
  }

  const fetchHistory = async () => {
    try {
      const authHeader = getAuthHeader()
      
      // Fetch all types of data for the selected date and atelier
      const [prodRes, arretRes, effRes, incRes] = await Promise.all([
        fetch(`${API_URL}/production?date=${selectedDate}&atelier_id=${selectedAtelier}`, { headers: authHeader }),
        fetch(`${API_URL}/arrets?date=${selectedDate}&atelier_id=${selectedAtelier}`, { headers: authHeader }),
        fetch(`${API_URL}/effectif?date=${selectedDate}&atelier_id=${selectedAtelier}`, { headers: authHeader }),
        fetch(`${API_URL}/incidents?date=${selectedDate}&atelier_id=${selectedAtelier}`, { headers: authHeader })
      ])

      const prodData = await prodRes.json()
      const arretData = await arretRes.json()
      const effData = await effRes.json()
      const incData = await incRes.json()

      // Combine and format history
      const combinedHistory = [
        ...prodData.map(p => ({
          date: p.date,
          atelier: p.atelier_nom,
          ligne: p.ligne_nom,
          type: 'Production',
          valeur: `${p.realise} / ${p.objectif}`,
          user: p.user_nom ? `${p.user_prenom} ${p.user_nom}` : '-'
        })),
        ...arretData.map(a => ({
          date: a.date,
          atelier: a.atelier_nom,
          ligne: a.ligne_nom,
          type: 'Arrêt',
          valeur: `${a.duree} min - ${a.cause}`,
          user: a.user_nom ? `${a.user_prenom} ${a.user_nom}` : '-'
        })),
        ...effData.map(e => ({
          date: e.date,
          atelier: e.atelier_nom,
          ligne: e.ligne_nom,
          type: 'Effectif',
          valeur: `${e.nombre_operateurs} opérateurs, ${e.nombre_techniciens} techniciens`,
          user: e.user_nom ? `${e.user_prenom} ${e.user_nom}` : '-'
        })),
        ...incData.map(i => ({
          date: i.date,
          atelier: i.atelier_nom,
          ligne: i.ligne_nom,
          type: 'Incident',
          valeur: `${i.type} - ${i.statut}`,
          user: i.user_nom ? `${i.user_prenom} ${i.user_nom}` : '-'
        }))
      ]

      setHistory(combinedHistory)
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedAtelier || !selectedLigne) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un atelier et une ligne' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setLoading(true)
    try {
      const authHeader = getAuthHeader()
      
      if (activeTab === 'production') {
        const response = await fetch(`${API_URL}/production`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: selectedDate,
            atelier_id: parseInt(selectedAtelier),
            ligne_id: parseInt(selectedLigne),
            objectif: parseInt(formData.objectif),
            realise: parseInt(formData.realise)
          })
        })
        
        if (response.ok) {
          setMessage({ type: 'success', text: 'Données de production enregistrées!' })
          setFormData(prev => ({ ...prev, objectif: '', realise: '' }))
        }
      } else if (activeTab === 'arrets') {
        const response = await fetch(`${API_URL}/arrets`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: selectedDate,
            atelier_id: parseInt(selectedAtelier),
            ligne_id: parseInt(selectedLigne),
            duree: parseInt(formData.arretDuree),
            cause: formData.arretCause,
            description: formData.arretDescription
          })
        })
        
        if (response.ok) {
          setMessage({ type: 'success', text: 'Données d\'arrêt enregistrées!' })
          setFormData(prev => ({ ...prev, arretDuree: '', arretCause: '', arretDescription: '' }))
        }
      } else if (activeTab === 'effectif') {
        const response = await fetch(`${API_URL}/effectif`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: selectedDate,
            atelier_id: parseInt(selectedAtelier),
            ligne_id: parseInt(selectedLigne),
            nombre_operateurs: parseInt(formData.nombreOperateurs),
            nombre_techniciens: parseInt(formData.nombreTechniciens),
            dmh: parseFloat(formData.dmh) || 0
          })
        })
        
        if (response.ok) {
          setMessage({ type: 'success', text: 'Données d\'effectif enregistrées!' })
          setFormData(prev => ({ ...prev, nombreOperateurs: '', nombreTechniciens: '', dmh: '' }))
        }
      } else if (activeTab === 'incidents') {
        const response = await fetch(`${API_URL}/incidents`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: selectedDate,
            atelier_id: parseInt(selectedAtelier),
            ligne_id: parseInt(selectedLigne),
            description: formData.incidentDescription,
            type: formData.incidentType,
            priorite: formData.priorite
          })
        })
        
        if (response.ok) {
          setMessage({ type: 'success', text: 'Incident enregistré!' })
          setFormData(prev => ({ ...prev, incidentDescription: '', incidentType: 'technique', priorite: 'moyenne' }))
        }
      }
      
      // Refresh history after saving
      fetchHistory()
    } catch (error) {
      console.error('Error saving data:', error)
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const renderProductionForm = () => (
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">Objectif de production</label>
        <input
          type="number"
          name="objectif"
          className="form-input"
          value={formData.objectif}
          onChange={handleChange}
          placeholder="Nombre d'unités"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Réalisé</label>
        <input
          type="number"
          name="realise"
          className="form-input"
          value={formData.realise}
          onChange={handleChange}
          placeholder="Nombre d'unités produites"
        />
      </div>
    </div>
  )

  const renderArretForm = () => (
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">Durée d'arrêt (minutes)</label>
        <input
          type="number"
          name="arretDuree"
          className="form-input"
          value={formData.arretDuree}
          onChange={handleChange}
          placeholder="Durée en minutes"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Cause de l'arrêt</label>
        <select
          name="arretCause"
          className="form-select"
          value={formData.arretCause}
          onChange={handleChange}
        >
          <option value="">Sélectionner une cause</option>
          {causesArret.map(cause => (
            <option key={cause} value={cause}>{cause}</option>
          ))}
        </select>
      </div>
    </div>
  )

  const renderEffectifForm = () => (
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">Nombre d'opérateurs</label>
        <input
          type="number"
          name="nombreOperateurs"
          className="form-input"
          value={formData.nombreOperateurs}
          onChange={handleChange}
          placeholder="Effectif opérateurs"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Nombre de techniciens</label>
        <input
          type="number"
          name="nombreTechniciens"
          className="form-input"
          value={formData.nombreTechniciens}
          onChange={handleChange}
          placeholder="Effectif techniciens"
        />
      </div>
    </div>
  )

  const renderIncidentForm = () => (
    <>
      <div className="form-group">
        <label className="form-label">Description de l'incident</label>
        <textarea
          name="incidentDescription"
          className="form-textarea"
          rows="4"
          value={formData.incidentDescription}
          onChange={handleChange}
          placeholder="Décrire l'incident..."
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Type d'incident</label>
          <select
            name="incidentType"
            className="form-select"
            value={formData.incidentType}
            onChange={handleChange}
          >
            {incidentTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priorité</label>
          <select
            name="priorite"
            className="form-select"
            value={formData.priorite}
            onChange={handleChange}
          >
            <option value="basse">Basse</option>
            <option value="moyenne">Moyenne</option>
            <option value="haute">Haute</option>
            <option value="critique">Critique</option>
          </select>
        </div>
      </div>
    </>
  )

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Saisie des Données</h2>
          <p className="text-secondary">Enregistrement des données journalières de production</p>
        </div>
      </div>

      {/* Date and Workshop Selection */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Atelier</label>
              <select
                className="form-select"
                value={selectedAtelier}
                onChange={(e) => setSelectedAtelier(e.target.value)}
              >
                <option value="">Sélectionner un atelier</option>
                {ateliers.map(atelier => (
                  <option key={atelier.id} value={atelier.id}>{atelier.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ligne</label>
              <select 
                className="form-select" 
                value={selectedLigne}
                onChange={(e) => setSelectedLigne(e.target.value)}
                disabled={!selectedAtelier}
              >
                <option value="">Sélectionner une ligne</option>
                {lignes.map(ligne => (
                  <option key={ligne.id} value={ligne.id}>{ligne.nom}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'production' ? 'active' : ''}`}
          onClick={() => setActiveTab('production')}
        >
          Production
        </div>
        <div 
          className={`tab ${activeTab === 'arrets' ? 'active' : ''}`}
          onClick={() => setActiveTab('arrets')}
        >
          Arrêts
        </div>
        <div 
          className={`tab ${activeTab === 'effectif' ? 'active' : ''}`}
          onClick={() => setActiveTab('effectif')}
        >
          Effectif
        </div>
        <div 
          className={`tab ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          Incidents
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <h3>
            {activeTab === 'production' && 'Données de Production'}
            {activeTab === 'arrets' && 'Données d\'Arrêt'}
            {activeTab === 'effectif' && 'Données Effectif'}
            {activeTab === 'incidents' && 'Données Incidents'}
          </h3>
        </div>
        <div className="card-body">
          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {activeTab === 'production' && renderProductionForm()}
            {activeTab === 'arrets' && renderArretForm()}
            {activeTab === 'effectif' && renderEffectifForm()}
            {activeTab === 'incidents' && renderIncidentForm()}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <RefreshCw size={18} className="loading-spinner" /> : <Save size={18} />}
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button type="button" className="btn btn-outline" onClick={fetchHistory}>
                <History size={18} />
                Historique
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* History Section */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3>Historique des Saisies</h3>
        </div>
        <div className="card-body">
          {history.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Atelier</th>
                  <th>Ligne</th>
                  <th>Type</th>
                  <th>Valeur</th>
                  <th>Saisie par</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.date}</td>
                    <td>{item.atelier}</td>
                    <td>{item.ligne}</td>
                    <td>{item.type}</td>
                    <td>{item.valeur}</td>
                    <td>{item.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-secondary">Aucune donnée pour cette date</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataEntry

