import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '../config/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('qrqc_token'))

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('qrqc_user')
    const storedToken = localStorage.getItem('qrqc_token')
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
      setToken(storedToken)
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (data.success) {
        const { token: newToken, user: userData } = data
        setUser(userData)
        setToken(newToken)
        localStorage.setItem('qrqc_user', JSON.stringify(userData))
        localStorage.setItem('qrqc_token', newToken)
        return { success: true }
      }
      
      return { success: false, error: data.error || 'Email ou mot de passe incorrect' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Erreur de connexion au serveur' }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('qrqc_user')
    localStorage.removeItem('qrqc_token')
  }

  const hasRole = (roles) => {
    if (!user) return false
    if (Array.isArray(roles)) {
      return roles.includes(user.role)
    }
    return user.role === roles
  }

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasRole, token, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

