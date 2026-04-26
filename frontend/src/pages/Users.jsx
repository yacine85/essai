import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, Users as UsersIcon, Search, Calendar, Check, X, History, ChevronLeft, ChevronRight } from 'lucide-react'
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

  return (
    <div className="fade-in users-page">
      <div className="page-hero">
        <div className="page-hero-content">
          <h2>Gestion des Utilisateurs</h2>
          <p>Administration des utilisateurs et de leurs droits</p>
        </div>
        {hasRole('admin') && activeTab === 'users' && (
          <div className="page-hero-actions">
            <button className="btn btn-primary" onClick={() => {
              setEditingUser(null)
              setFormData({ nom: '', prenom: '', email: '', password: '', role: 'chef_atelier', atelier_id: '' })
              setShowModal(true)
            }}>
              <Plus size={18} />
              Nouvel Utilisateur
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="modern-tabs">
        <button
          className={`modern-tab${activeTab === 'users' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UsersIcon size={16} />
          Utilisateurs
        </button>
        {hasRole('admin') && (
          <button
            className={`modern-tab${activeTab === 'presences' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('presences')}
          >
            <Calendar size={16} />
            Présences
          </button>
        )}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {/* Search */}
          <div className="card filter-card" style={{ marginBottom: 16 }}>
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

          {/* Users Table */}
          <div className="card modern-table-card">
            <div className="card-body table-container" style={{ padding: 0 }}>
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
          {/* ── Barre de filtre ──────────────────────────────────────────── */}
          <div style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid rgba(23,124,244,0.12)',
            borderLeft: '3px solid #177cf4',
            boxShadow: '0 2px 10px rgba(13,31,60,0.06)',
            padding: '14px 20px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>
                  <Calendar size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  Date de la réunion
                </div>
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ width: 'auto', minWidth: 170 }}
                />
              </div>
              <div style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(23,124,244,0.08)',
                color: '#177cf4',
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid rgba(23,124,244,0.16)',
                whiteSpace: 'nowrap',
              }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleMarkAllPresent} style={{ whiteSpace: 'nowrap' }}>
              <Check size={16} />
              Marquer tous présents
            </button>
          </div>

          {/* ── Chips de synthèse ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              {
                label: 'Présents',
                count: users.filter((u) => getPresenceStatus(u.id) === true).length,
                color: '#15803d', bg: 'rgba(22,163,74,0.09)', border: 'rgba(22,163,74,0.2)',
                icon: <Check size={13} />,
              },
              {
                label: 'Absents',
                count: users.filter((u) => getPresenceStatus(u.id) === false).length,
                color: '#b91c1c', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)',
                icon: <X size={13} />,
              },
              {
                label: 'Non marqués',
                count: users.filter((u) => getPresenceStatus(u.id) === null).length,
                color: '#475569', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)',
                icon: null,
              },
              {
                label: 'Total',
                count: users.length,
                color: '#177cf4', bg: 'rgba(23,124,244,0.08)', border: 'rgba(23,124,244,0.2)',
                icon: <UsersIcon size={13} />,
              },
            ].map(({ label, count, color, bg, border, icon }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 10,
                background: bg, border: `1px solid ${border}`,
                boxShadow: '0 1px 4px rgba(13,31,60,0.05)',
              }}>
                {icon && <span style={{ color, display: 'flex' }}>{icon}</span>}
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{count}</span>
              </div>
            ))}
          </div>

          {/* ── Tableau des présences ─────────────────────────────────────── */}
          <div className="card modern-table-card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                Liste des présences
              </h3>
              <span style={{
                padding: '4px 14px', borderRadius: 20,
                background: 'rgba(23,124,244,0.08)',
                border: '1px solid rgba(23,124,244,0.16)',
                color: '#177cf4', fontSize: 12, fontWeight: 700,
              }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="card-body table-container" style={{ padding: 0 }}>
              {presenceLoading ? (
                <p className="table-state">Chargement des présences...</p>
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
                              <span className="status-indicator neutral">Non marqué</span>
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

