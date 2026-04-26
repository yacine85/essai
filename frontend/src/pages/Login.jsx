import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, Shield, BarChart2, Zap, ChevronRight, Factory } from 'lucide-react'
import SagemcomLogo from '../components/Brand/SagemcomLogo'

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 4,
  duration: Math.random() * 6 + 8,
}))

const FEATURES = [
  { icon: Shield, label: 'Qualité garantie', desc: 'Suivi QRQC en temps réel' },
  { icon: BarChart2, label: 'Tableaux de bord', desc: 'KPIs et analyses avancées' },
  { icon: Zap, label: 'Réactivité', desc: 'Alertes et actions immédiates' },
]

function Particle({ x, y, size, delay, duration }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.35)',
        animation: `floatParticle ${duration}s ${delay}s ease-in-out infinite alternate`,
        pointerEvents: 'none',
      }}
    />
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [mounted, setMounted] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

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

  return (
    <>
      <style>{`
        @keyframes floatParticle {
          from { transform: translateY(0px) scale(1); opacity: 0.3; }
          to   { transform: translateY(-30px) scale(1.4); opacity: 0.7; }
        }
        @keyframes pulseRing {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(23,124,244,0.4); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 14px rgba(23,124,244,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(23,124,244,0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rotateGlow {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .login-input-modern {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 15px;
          color: #1a202c;
          background: #f8fafc;
          transition: all 0.25s ease;
          outline: none;
          font-family: inherit;
        }
        .login-input-modern:focus {
          border-color: #177cf4;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(23,124,244,0.12);
        }
        .login-input-modern::placeholder {
          color: #a0aec0;
        }
        .submit-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: 0.3px;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #177cf4 0%, #1fd2d6 100%);
          color: white;
        }
        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(23,124,244,0.4);
        }
        .submit-btn:not(:disabled):active {
          transform: translateY(0);
        }
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .feature-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          backdrop-filter: blur(4px);
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.12);
          transform: translateX(4px);
        }
      `}</style>

      <div style={{
        height: '100vh',
        display: 'flex',
        background: '#f0f4f8',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>

        {/* LEFT PANEL — Brand */}
        <div style={{
          flex: '0 0 48%',
          background: 'linear-gradient(145deg, #0d1f3c 0%, #1a365d 40%, #0e3460 70%, #0a2340 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 44px',
          position: 'relative',
          overflow: 'hidden',
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'slideInLeft 0.7s ease forwards' : 'none',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 340, height: 340, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(23,124,244,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, left: -60,
            width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(31,210,214,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '40%', left: '60%',
            width: 200, height: 200, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }} />

          {/* Floating particles */}
          {PARTICLES.map(p => <Particle key={p.id} {...p} />)}

          {/* Logo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <SagemcomLogo variant="icon" style={{ width: 44, height: 44 }} />
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}>
                Sagemcom
              </div>
            </div>
          </div>

          {/* Center content */}
          <div style={{ animation: 'fadeInUp 0.9s 0.3s ease both' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(23,124,244,0.2)',
              border: '1px solid rgba(23,124,244,0.35)',
              borderRadius: 20,
              padding: '5px 12px',
              marginBottom: 16,
            }}>
              <Factory size={14} color="#1fd2d6" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1fd2d6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Production Management
              </span>
            </div>

            <h1 style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.15,
              marginBottom: 12,
              letterSpacing: '-0.5px',
            }}>
              Système QRQC<br />
              <span style={{
                background: 'linear-gradient(90deg, #177cf4, #1fd2d6, #177cf4)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 3s linear infinite',
              }}>
                Gestion des Ateliers
              </span>
            </h1>

            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
              maxWidth: 380,
              marginBottom: 24,
            }}>
              Plateforme industrielle de suivi qualité, pilotage des non-conformités et amélioration continue de la production.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FEATURES.map(({ icon: Icon, label, desc }, i) => (
                <div
                  key={label}
                  className="feature-card"
                  style={{ animationDelay: `${0.5 + i * 0.15}s`, animation: 'fadeInUp 0.6s ease both' }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg, #177cf4, #1fd2d6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{desc}</div>
                  </div>
                  <ChevronRight size={14} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px' }}>
            © 2026 Sagemcom — Tous droits réservés
          </div>
        </div>

        {/* RIGHT PANEL — Form */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 32px',
          background: '#ffffff',
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'slideInRight 0.7s ease forwards' : 'none',
        }}>
          <div style={{ width: '100%', maxWidth: 400 }}>

            {/* Header */}
            <div style={{ marginBottom: 18 }}>
              <SagemcomLogo
                variant="full"
                style={{ width: 90, height: 'auto', marginBottom: 12 }}
              />
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 3, letterSpacing: '-0.3px' }}>
                Connexion
              </h2>
              <p style={{ fontSize: 13, color: '#718096', lineHeight: 1.4 }}>
                Accédez à votre espace de gestion de production
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: '#fff5f5',
                border: '1.5px solid #fed7d7',
                borderRadius: 10,
                marginBottom: 14,
                animation: 'fadeInUp 0.3s ease',
              }}>
                <AlertCircle size={16} color="#e53e3e" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#c53030', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#2d3748',
                  marginBottom: 5,
                  letterSpacing: '0.1px',
                }}>
                  Adresse email
                </label>
                <input
                  type="email"
                  className="login-input-modern"
                  placeholder="votre@email.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  autoComplete="email"
                  style={{ padding: '11px 14px' }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#2d3748',
                  marginBottom: 5,
                  letterSpacing: '0.1px',
                }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input-modern"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: 48, padding: '11px 48px 11px 14px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#a0aec0',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#177cf4'}
                    onMouseLeave={e => e.currentTarget.style.color = '#a0aec0'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
                style={{ marginTop: 2, padding: '12px' }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{
                      width: 15, height: 15,
                      border: '2.5px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Connexion en cours...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    Se connecter
                    <ChevronRight size={17} />
                  </span>
                )}
              </button>
            </form>

            {/* Register link */}
            <p style={{
              textAlign: 'center',
              marginTop: 16,
              fontSize: 13,
              color: '#718096',
            }}>
              Pas encore de compte ?{' '}
              <Link
                to="/register"
                style={{
                  color: '#177cf4',
                  fontWeight: 600,
                  textDecoration: 'none',
                  borderBottom: '1.5px solid transparent',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderBottomColor = '#177cf4'}
                onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
