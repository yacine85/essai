import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Reports from './pages/Reports'
import PlanActions from './pages/PlanActions'
import './styles/index.css'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="loading-screen">Chargement...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={
          <PrivateRoute roles={['admin']}>
            <Users />
          </PrivateRoute>
        } />
        <Route path="reports" element={
          <PrivateRoute roles={['admin']}>
            <Reports />
          </PrivateRoute>
        } />
        <Route path="plan-actions" element={
          <PrivateRoute roles={['admin', 'chef_atelier', 'management', 'pilote_test', 'pilote_test_sec', 'pilote_maintenance', 'pilote_maintenance_sec', 'pilote_depannage', 'pilote_depannage_sec', 'pilote_info_trace', 'pilote_info_trace_sec', 'pilote_qualite', 'pilote_qualite_sec', 'pilote_logistique', 'pilote_logistique_sec', 'pilote_cms2', 'pilote_cms2_sec', 'pilote_methode', 'pilote_methode_sec', 'pilote_process', 'pilote_process_sec', 'pilote_integration', 'pilote_integration_sec']}>
            <PlanActions />
          </PrivateRoute>
        } />
      </Route>
    </Routes>
  )
}

export default App

