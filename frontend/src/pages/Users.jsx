import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, Shield, User, Users as UsersIcon, Search, Calendar, Check, X, Clock, History, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/api'

const initialRoles = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'chef_atelier', label: 'Chef d\'Atelier' },
  { value: 'management', label: 'Management' },
  { value: 'pilote_test', label: 'Representant Test' },
  { value: 'pilote_test_sec', label: 'Representant secondaire Test' },
  { value: 'pilote_maintenance', label: 'Representant Maintenance' },
  { value: 'pilote_maintenance_sec', label: 'Representant secondaire Maintenance' },
  { value: 'pilote_depannage', label: 'Representant Depannage' },
  { value: 'pilote_depannage_sec', label: 'Representant secondaire Depannage' },
  { value: 'pilote_info_trace', label: 'Representant Information et Traceabilite' },
  { value: 'pilote_info_trace_sec', label: 'Representant secondaire Information et Traceabilite' },
  { value: 'pilote_qualite', label: 'Representant Qualite' },
  { value: 'pilote_qualite_sec', label: 'Representant secondaire Qualite' },
  { value: 'pilote_logistique', label: 'Representant Logistique' },
  { value: 'pilote_logistique_sec', label: 'Representant secondaire Logistique' },
  { value: 'pilote_cms2', label: 'Representant Atelier CMS2' },
  { value: 'pilote_cms2_sec', label: 'Representant secondaire Atelier CMS2' },
  { value: 'pilote_methode', label: 'Representant Methode' },
  { value: 'pilote_methode_sec', label: 'Representant secondaire Methode' },
  { value: 'pilote_process', label: 'Representant Process' },
  { value: 'pilote_process_sec', label: 'Representant secondaire Process' },
  { value: 'pilote_integration', label: 'Representant Atelier Integration' },
  { value: 'pilote_integration_sec', label: 'Representant secondaire Atelier Integration' }
]

function Users() {
  const { getAuthHeader, hasRole, user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [ateliers, setAteliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Presence management state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [presences, setPresences] = useState([])
  const [presenceLoading, setPresenceLoading] = useState(false)
  const [selectedUserHistory, setSelectedUserHistory] = useState(null)
  const [userHistory, setUserHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyMonth, setHistoryMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [presenceStats, setPresenceStats] = useState([])
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'chef_atelier',
    atelier_id: ''
  })

  useEffect(() => {
    fetchUsers()
    fetchAteliers()
    fetchPresences()
    fetchPresenceStats()
  }, [])

  const fetchUsers = async () => {
    try {
      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/users`, { headers: authHeader })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const fetchPresences = async () => {
    setPresenceLoading(true)
    try {
      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/presences?date=${selectedDate}`, { headers: authHeader })
      if (response.ok) {
        const data = await response.json()
        setPresences(data)
      }
    } catch (error) {
      console.error('Error fetching presences:', error)
    } finally {
      setPresenceLoading(false)
    }
  }

  const fetchPresenceStats = async () => {
    try {
      const authHeader = getAuthHeader()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const response = await fetch(
        `${API_URL}/presences/stats?startDate=${thirtyDaysAgo.toISOString().split('T')[0]}`,
        { headers: authHeader }
      )
      if (response.ok) {
        const data = await response.json()
        setPresenceStats(data)
      }
    } catch (error) {
      console.error('Error fetching presence stats:', error)
    }
  }

  const fetchUserHistory = async (userId) => {
    setHistoryLoading(true)
    try {
      const authHeader = getAuthHeader()
      const response = await fetch(`${API_URL}/presences/user/${userId}?limit=365`, { headers: authHeader })
      if (response.ok) {
        const data = await response.json()
        const historyEntries = Array.isArray(data) ? data : []
        setUserHistory(historyEntries)

        if (historyEntries.length > 0) {
          const latestDate = historyEntries.reduce((acc, entry) => {
            const d = new Date(entry.date)
            if (Number.isNaN(d.getTime())) return acc
            return d > acc ? d : acc
          }, new Date(historyEntries[0].date))

          if (!Number.isNaN(latestDate.getTime())) {
            setHistoryMonth(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (selectedDate) {
      fetchPresences()
    }
  }, [selectedDate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const authHeader = getAuthHeader()
      
      if (editingUser) {
        const response = await fetch(`${API_URL}/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            role: formData.role,
            atelier_id: formData.atelier_id || null
          })
        })
        
        if (response.ok) {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } : u))
          setShowModal(false)
          setEditingUser(null)
          setFormData({ nom: '', prenom: '', email: '', password: '', role: 'chef_atelier', atelier_id: '' })
        }
      } else {
        const response = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
        
        if (response.ok) {
          const data = await response.json()
          setUsers(prev => [...prev, { ...formData, id: data.id }])
          setShowModal(false)
          setFormData({ nom: '', prenom: '', email: '', password: '', role: 'chef_atelier', atelier_id: '' })
        }
      }
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      password: '',
      role: user.role,
      atelier_id: user.atelier_id || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        const authHeader = getAuthHeader()
        const response = await fetch(`${API_URL}/users/${id}`, {
          method: 'DELETE',
          headers: authHeader
        })
        
        if (response.ok) {
          setUsers(prev => prev.filter(u => u.id !== id))
        }
      } catch (error) {
        console.error('Error deleting user:', error)
      }
    }
  }

  const handlePresenceToggle = async (userId, present) => {
    try {
      const authHeader = getAuthHeader()
      await fetch(`${API_URL}/presences`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          date: selectedDate,
          present: present
        })
      })
      fetchPresences()
      fetchPresenceStats()
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }

  const handleMarkAllPresent = async () => {
    try {
      const authHeader = getAuthHeader()
      const presencesData = users.map(u => ({
        user_id: u.id,
        present: true
      }))
      
      await fetch(`${API_URL}/presences/bulk`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          presences: presencesData,
          date: selectedDate
        })
      })
      fetchPresences()
      fetchPresenceStats()
    } catch (error) {
      console.error('Error marking all present:', error)
    }
  }

  const handleViewHistory = (user) => {
    setSelectedUserHistory(user)
    fetchUserHistory(user.id)
  }

  const getRoleBadge = (role) => {
    const badges = {
      admin: { class: 'badge-admin', text: 'Admin' },
      chef_atelier: { class: 'badge-chef', text: 'Chef Atelier' },
      management: { class: 'badge-management', text: 'Management' },
      pilote_test: { class: 'badge-pilote', text: 'Rep. Test' },
      pilote_test_sec: { class: 'badge-pilote', text: 'Rep. Test (Sec)' },
      pilote_maintenance: { class: 'badge-pilote', text: 'Rep. Maintenance' },
      pilote_maintenance_sec: { class: 'badge-pilote', text: 'Rep. Maintenance (Sec)' },
      pilote_depannage: { class: 'badge-pilote', text: 'Rep. Dépannage' },
      pilote_depannage_sec: { class: 'badge-pilote', text: 'Rep. Dépannage (Sec)' },
      pilote_info_trace: { class: 'badge-pilote', text: 'Rep. Info Trace' },
      pilote_info_trace_sec: { class: 'badge-pilote', text: 'Rep. Info Trace (Sec)' },
      pilote_qualite: { class: 'badge-pilote', text: 'Rep. Qualité' },
      pilote_qualite_sec: { class: 'badge-pilote', text: 'Rep. Qualité (Sec)' },
      pilote_logistique: { class: 'badge-pilote', text: 'Rep. Logistique' },
      pilote_logistique_sec: { class: 'badge-pilote', text: 'Rep. Logistique (Sec)' },
      pilote_cms2: { class: 'badge-pilote', text: 'Rep. CMS2' },
      pilote_cms2_sec: { class: 'badge-pilote', text: 'Rep. CMS2 (Sec)' },
      pilote_methode: { class: 'badge-pilote', text: 'Rep. Méthode' },
      pilote_methode_sec: { class: 'badge-pilote', text: 'Rep. Méthode (Sec)' },
      pilote_process: { class: 'badge-pilote', text: 'Rep. Process' },
      pilote_process_sec: { class: 'badge-pilote', text: 'Rep. Process (Sec)' },
      pilote_integration: { class: 'badge-pilote', text: 'Rep. Intégration' },
      pilote_integration_sec: { class: 'badge-pilote', text: 'Rep. Intégration (Sec)' }
    }
    return badges[role] || { class: '', text: role }
  }

  const getPresenceStatus = (userId) => {
    const presence = presences.find(p => p.user_id === userId)
    return presence ? presence.present : null
  }

  const toDateKey = (dateValue) => {
    if (!dateValue) return ''
    if (typeof dateValue === 'string') {
      const match = dateValue.match(/^\d{4}-\d{2}-\d{2}/)
      if (match) return match[0]
    }

    const d = new Date(dateValue)
    if (Number.isNaN(d.getTime())) return ''

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const historyByDate = useMemo(() => {
    const map = new Map()
    userHistory.forEach((entry) => {
      const key = toDateKey(entry.date)
      if (key) map.set(key, Boolean(entry.present))
    })
    return map
  }, [userHistory])

  const calendarModel = useMemo(() => {
    const year = historyMonth.getFullYear()
    const month = historyMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstWeekday = (firstDay.getDay() + 6) % 7

    const cells = []
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null)
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        day,
        key,
        status: historyByDate.has(key) ? historyByDate.get(key) : null
      })
    }

    return {
      monthLabel: firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      cells
    }
  }, [historyMonth, historyByDate])

  const historyPresentCount = useMemo(() => userHistory.filter((entry) => entry.present).length, [userHistory])
  const historyAbsentCount = useMemo(() => userHistory.filter((entry) => !entry.present).length, [userHistory])

  const filteredUsers = users.filter(user => 
    user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const presentCount = presences.filter(p => p.present).length
  const absentCount = users.length - presentCount

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Gestion des Utilisateurs</h2>
          <p className="text-secondary">Administration des utilisateurs et de leurs droits</p>
        </div>
        {hasRole('admin') && activeTab === 'users' && (
          <button className="btn btn-primary" onClick={() => {
            setEditingUser(null)
            setFormData({ nom: '', prenom: '', email: '', password: '', role: 'chef_atelier', atelier_id: '' })
            setShowModal(true)
          }}>
            <Plus size={18} />
            Nouvel Utilisateur
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <div 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <UsersIcon size={18} />
          Utilisateurs
        </div>
        {hasRole('admin') && (
          <div 
            className={`tab ${activeTab === 'presences' ? 'active' : ''}`}
            onClick={() => setActiveTab('presences')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Calendar size={18} />
            Présences
          </div>
        )}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {/* Search */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body">
              <div style={{ position: 'relative', maxWidth: 400 }}>
                <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="dashboard-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total Utilisateurs</span>
                <UsersIcon size={20} />
              </div>
              <div className="kpi-value">{users.length}</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-header">
                <span className="kpi-title">Administrateurs</span>
                <Shield size={20} />
              </div>
              <div className="kpi-value">{users.filter(u => u.role === 'admin').length}</div>
            </div>
            <div className="kpi-card warning">
              <div className="kpi-header">
                <span className="kpi-title">Chefs d'Atelier</span>
                <User size={20} />
              </div>
              <div className="kpi-value">{users.filter(u => u.role === 'chef_atelier').length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Management</span>
                <User size={20} />
              </div>
              <div className="kpi-value">{users.filter(u => u.role === 'management').length}</div>
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            <div className="card-body table-container">
              {loading ? (
                <p>Chargement des utilisateurs...</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>Email</th>
                      <th>Rôle</th>
                      <th>Atelier</th>
                      {hasRole('admin') && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: 500 }}>{user.nom}</td>
                        <td>{user.prenom}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`badge ${getRoleBadge(user.role).class}`}>
                            {getRoleBadge(user.role).text}
                          </span>
                        </td>
                        <td>{user.atelier_id ? ateliers.find(a => a.id === user.atelier_id)?.nom || 'N/A' : 'Tous'}</td>
                        {hasRole('admin') && (
                          <td>
                            <div className="btn-group">
                              <button 
                                className="btn btn-outline btn-sm" 
                                onClick={() => handleEdit(user)}
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(user.id)}
                                disabled={user.role === 'admin'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Presences Tab */}
      {activeTab === 'presences' && hasRole('admin') && (
        <>
          {/* Date Selection */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <label className="form-label">Date de la réunion</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ width: 'auto' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleMarkAllPresent}>
                  <Check size={18} />
                  Marquer tous présents
                </button>
              </div>
            </div>
          </div>

          {/* Presence Stats */}
          <div className="dashboard-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card success">
              <div className="kpi-header">
                <span className="kpi-title">Présents</span>
                <Check size={20} />
              </div>
              <div className="kpi-value">{presentCount}</div>
            </div>
            <div className="kpi-card danger">
              <div className="kpi-header">
                <span className="kpi-title">Absents</span>
                <X size={20} />
              </div>
              <div className="kpi-value">{absentCount}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total</span>
                <UsersIcon size={20} />
              </div>
              <div className="kpi-value">{users.length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Taux de présence</span>
                <Clock size={20} />
              </div>
              <div className="kpi-value">
                {users.length > 0 ? Math.round((presentCount / users.length) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Presence Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Liste des présences - {new Date(selectedDate).toLocaleDateString('fr-FR')}</h3>
            </div>
            <div className="card-body table-container">
              {presenceLoading ? (
                <p>Chargement des présences...</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>Rôle</th>
                      <th>Présence</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const presenceStatus = getPresenceStatus(user.id)
                      return (
                        <tr key={user.id}>
                          <td style={{ fontWeight: 500 }}>{user.nom}</td>
                          <td>{user.prenom}</td>
                          <td>
                            <span className={`badge ${getRoleBadge(user.role).class}`}>
                              {getRoleBadge(user.role).text}
                            </span>
                          </td>
                          <td>
                            {presenceStatus === null ? (
                              <span style={{ color: 'var(--color-text-secondary)' }}>Non marqué</span>
                            ) : presenceStatus ? (
                              <span className="status-indicator success">
                                <Check size={14} /> Présent
                              </span>
                            ) : (
                              <span className="status-indicator danger">
                                <X size={14} /> Absent
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group">
                              <button 
                                className="btn btn-sm btn-success"
                                onClick={() => handlePresenceToggle(user.id, true)}
                                title="Marquer présent"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handlePresenceToggle(user.id, false)}
                                title="Marquer absent"
                              >
                                <X size={14} />
                              </button>
                              <button 
                                className="btn btn-sm btn-outline"
                                onClick={() => handleViewHistory(user)}
                                title="Voir l'historique"
                              >
                                <History size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* User History Modal */}
          {selectedUserHistory && (
            <div className="modal-overlay" onClick={() => setSelectedUserHistory(null)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                  <h3>Historique de présence - {selectedUserHistory.prenom} {selectedUserHistory.nom}</h3>
                  <button className="btn btn-outline btn-icon" onClick={() => setSelectedUserHistory(null)}>
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  {historyLoading ? (
                    <p>Chargement...</p>
                  ) : userHistory.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      Aucun historique de présence disponible
                    </p>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setHistoryMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                          title="Mois précédent"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <strong style={{ textTransform: 'capitalize' }}>{calendarModel.monthLabel}</strong>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setHistoryMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                          title="Mois suivant"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 6 }}>
                        {calendarModel.weekdays.map((dayLabel) => (
                          <div key={dayLabel} style={{ textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {dayLabel}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
                        {calendarModel.cells.map((cell, idx) => {
                          if (!cell) {
                            return <div key={`empty-${idx}`} style={{ minHeight: 46 }} />
                          }

                          const bgColor = cell.status === true
                            ? 'rgba(34, 197, 94, 0.2)'
                            : cell.status === false
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'var(--color-surface-light)'

                          const borderColor = cell.status === true
                            ? 'var(--color-success)'
                            : cell.status === false
                              ? 'var(--color-danger)'
                              : 'var(--color-border)'

                          return (
                            <div
                              key={cell.key}
                              title={
                                cell.status === true
                                  ? `${new Date(cell.key).toLocaleDateString('fr-FR')} - Présent`
                                  : cell.status === false
                                    ? `${new Date(cell.key).toLocaleDateString('fr-FR')} - Absent`
                                    : `${new Date(cell.key).toLocaleDateString('fr-FR')} - Non renseigné`
                              }
                              style={{
                                minHeight: 46,
                                borderRadius: 8,
                                border: `1px solid ${borderColor}`,
                                backgroundColor: bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600
                              }}
                            >
                              {cell.day}
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="status-indicator success"><Check size={14} /> Présent</span>
                        <span className="status-indicator danger"><X size={14} /> Absent</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Présents: {historyPresentCount}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Absents: {historyAbsentCount}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setSelectedUserHistory(null)}>
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Section */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <h3>Statistiques des 30 derniers jours</h3>
            </div>
            <div className="card-body table-container">
              {presenceStats.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  Aucune donnée disponible
                </p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Présents</th>
                      <th>Absents</th>
                      <th>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presenceStats.map(stat => (
                      <tr key={stat.date}>
                        <td>{new Date(stat.date).toLocaleDateString('fr-FR')}</td>
                        <td>{stat.total_users}</td>
                        <td style={{ color: 'var(--color-success)' }}>{stat.present_count}</td>
                        <td style={{ color: 'var(--color-danger)' }}>{stat.absent_count}</td>
                        <td>
                          <span style={{ 
                            fontWeight: 600,
                            color: stat.taux_presence >= 90 ? 'var(--color-success)' : 
                                   stat.taux_presence >= 70 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}>
                            {stat.taux_presence}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
              <button className="btn btn-outline btn-icon" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom</label>
                    <input
                      type="text"
                      name="nom"
                      className="form-input"
                      value={formData.nom}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prénom</label>
                    <input
                      type="text"
                      name="prenom"
                      className="form-input"
                      value={formData.prenom}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                {!editingUser && (
                  <div className="form-group">
                    <label className="form-label">Mot de passe</label>
                    <input
                      type="password"
                      name="password"
                      className="form-input"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingUser}
                      placeholder={editingUser ? 'Laisser vide pour garder l\'actuel' : ''}
                    />
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rôle</label>
                    <select
                      name="role"
                      className="form-select"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      {initialRoles.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Atelier</label>
                    <select
                      name="atelier_id"
                      className="form-select"
                      value={formData.atelier_id}
                      onChange={handleChange}
                    >
                      <option value="">Tous les ateliers</option>
                      {ateliers.map(atelier => (
                        <option key={atelier.id} value={atelier.id}>{atelier.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {editingUser ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users

