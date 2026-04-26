import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import SagemcomLogo from '../Brand/SagemcomLogo'
import { 
  LayoutDashboard, 
  Users, 
  FileBarChart, 
  LogOut, 
  Menu,
  X,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

function Layout() {
  const INITIAL_TIMER_SECONDS = 30 * 60
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIMER_SECONDS)
  const [timerStatus, setTimerStatus] = useState('idle')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'chef_atelier', 'management', 'pilote_test', 'pilote_test_sec', 'pilote_maintenance', 'pilote_maintenance_sec', 'pilote_depannage', 'pilote_depannage_sec', 'pilote_info_trace', 'pilote_info_trace_sec', 'pilote_qualite', 'pilote_qualite_sec', 'pilote_logistique', 'pilote_logistique_sec', 'pilote_cms2', 'pilote_cms2_sec', 'pilote_methode', 'pilote_methode_sec', 'pilote_process', 'pilote_process_sec', 'pilote_integration', 'pilote_integration_sec'] },
    { path: '/plan-actions', icon: Target, label: 'Plan Actions', roles: ['admin', 'chef_atelier', 'management', 'pilote_test', 'pilote_test_sec', 'pilote_maintenance', 'pilote_maintenance_sec', 'pilote_depannage', 'pilote_depannage_sec', 'pilote_info_trace', 'pilote_info_trace_sec', 'pilote_qualite', 'pilote_qualite_sec', 'pilote_logistique', 'pilote_logistique_sec', 'pilote_cms2', 'pilote_cms2_sec', 'pilote_methode', 'pilote_methode_sec', 'pilote_process', 'pilote_process_sec', 'pilote_integration', 'pilote_integration_sec'] },
    { path: '/users', icon: Users, label: 'Utilisateurs', roles: ['admin'] },
    { path: '/reports', icon: FileBarChart, label: 'Rapports', roles: ['admin'] },
  ]

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

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    if (timerStatus !== 'running') return undefined

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerStatus('idle')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [timerStatus])

  const formatCountdown = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number(totalSeconds || 0))
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const getTimerClassName = () => {
    if (timeLeft <= 60) return 'timer-display timer-critical timer-blink'
    if (timeLeft <= 5 * 60) return 'timer-display timer-danger'
    if (timeLeft <= 10 * 60) return 'timer-display timer-warning'
    return 'timer-display'
  }

  const handleStartTimer = () => {
    if (timeLeft <= 0) {
      setTimeLeft(INITIAL_TIMER_SECONDS)
    }
    setTimerStatus('running')
  }

  const handlePauseTimer = () => {
    if (timerStatus !== 'running') return
    setTimerStatus('paused')
  }

  const handleResumeTimer = () => {
    if (timeLeft <= 0) return
    setTimerStatus('running')
  }

  const handleResetTimer = () => {
    setTimeLeft(INITIAL_TIMER_SECONDS)
    setTimerStatus('idle')
  }

  const sidebarVariants = {
    expanded: { width: 280, transition: { duration: 0.3 } },
    collapsed: { width: 80, transition: { duration: 0.3 } }
  }

  const contentVariants = {
    expanded: { marginLeft: 280, transition: { duration: 0.3 } },
    collapsed: { marginLeft: 80, transition: { duration: 0.3 } }
  }

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside 
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}
        variants={sidebarVariants}
        initial={false}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        style={{ position: 'fixed' }}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {sidebarCollapsed ? (
              <SagemcomLogo variant="icon" className="sidebar-logo-mark" />
            ) : (
              <SagemcomLogo variant="wordmark" className="sidebar-logo-wordmark" />
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar-subtitle">Management Production</div>
          )}
        </div>

        {/* Collapse Button */}
        <button 
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Déployer le menu" : "Réduire le menu"}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!sidebarCollapsed && (
              <div className="nav-section-title">Menu Principal</div>
            )}
          </div>
          
          {navItems.filter(item => item.roles.includes(user?.role)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              title={sidebarCollapsed ? item.label : ''}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            {!sidebarCollapsed && (
              <div className="user-details">
                <div className="user-name">{user?.prenom} {user?.nom}</div>
                <span className={`badge ${getRoleBadge(user?.role).class}`}>
                  {getRoleBadge(user?.role).text}
                </span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button 
              className="btn btn-outline" 
              onClick={handleLogout}
              style={{ 
                marginTop: 16, 
                width: '100%', 
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)'
              }}
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          )}
    {sidebarCollapsed && (
            <button 
              className="btn btn-icon btn-outline" 
              onClick={handleLogout}
              title="Déconnexion"
              style={{ 
                marginTop: 16, 
                width: '100%',
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)'
              }}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main 
        className="main-content"
        variants={contentVariants}
        initial={false}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        style={{ position: 'relative' }}
      >
        <header className="app-header">
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="header-brand">
            <SagemcomLogo variant="icon" className="header-brand-mark" />
            <div className="header-brand-copy">
              <span className="header-brand-name">Sagemcom</span>
              <span className="header-brand-tag">Management Production</span>
            </div>
          </div>
          <div className="header-right">
            <div className="header-date">
              {today}
            </div>
            <div className="header-timer" role="timer" aria-live="polite">
              <div className={getTimerClassName()}>{formatCountdown(timeLeft)}</div>
              <div className="timer-controls">
                <button className="timer-btn" onClick={handleStartTimer} disabled={timerStatus === 'running'}>
                  Démarrer
                </button>
                <button className="timer-btn" onClick={handlePauseTimer} disabled={timerStatus !== 'running'}>
                  Pause
                </button>
                <button className="timer-btn" onClick={handleResumeTimer} disabled={timerStatus !== 'paused' || timeLeft <= 0}>
                  Reprendre
                </button>
                <button className="timer-btn timer-btn-reset" onClick={handleResetTimer}>
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </motion.main>
    </div>
  )
}

export default Layout

