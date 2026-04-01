
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
    
    setLoading(false)
  }

  const demoAccounts = [
    { email: 'admin@qrqc.fr', password: 'admin123', role: 'Admin' },
    { email: 'chef@qrqc.fr', password: 'chef123', role: 'Chef Atelier' },
    { email: 'manager@qrqc.fr', password: 'manager123', role: 'Management' }
  ]

  const fillDemo = (demo) => {
    setEmail(demo.email)
    setPassword(demo.password)
  }

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-logo">
          <h1>QRQC</h1>
          <p>Gestion des Ateliers de Production</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="votre@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Comptes de demonstration:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {demoAccounts.map((demo) => (
              <button
                key={demo.email}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fillDemo(demo)}
                style={{ justifyContent: 'flex-start', fontSize: 12 }}
              >
                <span style={{ fontWeight: 600, width: 90 }}>{demo.role}:</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{demo.email}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Pas encore de compte?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

