import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { 
  LayoutDashboard, 
  ClipboardList, 
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
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'chef_atelier', 'management', 'pilote_test', 'pilote_test_sec', 'pilote_maintenance', 'pilote_maintenance_sec', 'pilote_depannage', 'pilote_depannage_sec', 'pilote_info_trace', 'pilote_info_trace_sec', 'pilote_qualite', 'pilote_qualite_sec', 'pilote_logistique', 'pilote_logistique_sec', 'pilote_cms2', 'pilote_cms2_sec', 'pilote_methode', 'pilote_methode_sec', 'pilote_process', 'pilote_process_sec', 'pilote_integration', 'pilote_integration_sec'] },
    { path: '/data-entry', icon: ClipboardList, label: 'Saisie Données', roles: ['admin'] },
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
            {!sidebarCollapsed && <span>QRQC</span>}
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
          <h1>QRQC</h1>
          <div className="header-date">
            {today}
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

