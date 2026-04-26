import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, Users, ClipboardCheck, Bell, ChevronRight, Factory } from 'lucide-react'
import { API_URL } from '../config/api'
import SagemcomLogo from '../components/Brand/SagemcomLogo'

const ROLES = [
  { value: 'admin',                    label: 'Administrateur' },
  { value: 'pilote_test',              label: 'Représentant Test' },
  { value: 'pilote_test_sec',          label: 'Représentant secondaire Test' },
  { value: 'pilote_maintenance',       label: 'Représentant Maintenance' },
  { value: 'pilote_maintenance_sec',   label: 'Représentant secondaire Maintenance' },
  { value: 'pilote_depannage',         label: 'Représentant Dépannage' },
  { value: 'pilote_depannage_sec',     label: 'Représentant secondaire Dépannage' },
  { value: 'pilote_info_trace',        label: 'Représentant Information et Traçabilité' },
  { value: 'pilote_info_trace_sec',    label: 'Représentant secondaire Information et Traçabilité' },
  { value: 'pilote_qualite',           label: 'Représentant Qualité' },
  { value: 'pilote_qualite_sec',       label: 'Représentant secondaire Qualité' },
  { value: 'pilote_logistique',        label: 'Représentant Logistique' },
  { value: 'pilote_logistique_sec',    label: 'Représentant secondaire Logistique' },
  { value: 'pilote_cms2',             label: 'Représentant Atelier CMS2' },
  { value: 'pilote_cms2_sec',         label: 'Représentant secondaire Atelier CMS2' },
  { value: 'pilote_methode',          label: 'Représentant Méthode' },
  { value: 'pilote_methode_sec',      label: 'Représentant secondaire Méthode' },
  { value: 'pilote_process',          label: 'Représentant Process' },
  { value: 'pilote_process_sec',      label: 'Représentant secondaire Process' },
  { value: 'pilote_integration',      label: 'Représentant Atelier Intégration' },
  { value: 'pilote_integration_sec',  label: 'Représentant secondaire Atelier Intégration' },
]

const FEATURES = [
  { icon: Users,          label: 'Accès sécurisé',     desc: 'Compte validé par votre administrateur' },
  { icon: ClipboardCheck, label: 'Suivi qualité',       desc: 'Pilotage des non-conformités QRQC' },
  { icon: Bell,           label: 'Alertes en temps réel', desc: 'Notifications instantanées sur vos ateliers' },
]

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 4,
  duration: Math.random() * 6 + 8,
}))

function Particle({ x, y, size, delay, duration }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`, top: `${y}%`,
      width: size, height: size,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.3)',
      animation: `floatParticle ${duration}s ${delay}s ease-in-out infinite alternate`,
      pointerEvents: 'none',
    }} />
  )
}

function Register() {
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', password: '', confirmPassword: '', role: ''
  })
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm,  setShowConfirm]    = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.nom.trim() || !formData.prenom.trim()) {
      setError('Veuillez entrer votre nom et prénom')
      return
    }
    if (!formData.email.trim()) {
      setError('Veuillez entrer votre email')
      return
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (!formData.role) {
      setError('Le rôle est obligatoire')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: formData.nom, prenom: formData.prenom,
          email: formData.email, password: formData.password, role: formData.role
        })
      })
      const data = await response.json()
      if (data.success) {
        setSuccess('Compte créé avec succès ! Redirection vers la connexion...')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(data.error || "Erreur lors de l'inscription")
      }
    } catch {
      setError('Erreur de connexion au serveur')
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @keyframes floatParticle {
          from { transform: translateY(0px) scale(1); opacity: 0.3; }
          to   { transform: translateY(-28px) scale(1.4); opacity: 0.7; }
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
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .reg-input {
          width: 100%;
          padding: 10px 13px;
          border: 1.5px solid #e2e8f0;
          border-radius: 9px;
          font-size: 13px;
          color: #1a202c;
          background: #f8fafc;
          transition: all 0.2s ease;
          outline: none;
          font-family: inherit;
        }
        .reg-input:focus {
          border-color: #177cf4;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(23,124,244,0.1);
        }
        .reg-input::placeholder { color: #a0aec0; }
        .reg-select {
          width: 100%;
          padding: 10px 13px;
          border: 1.5px solid #e2e8f0;
          border-radius: 9px;
          font-size: 13px;
          color: #1a202c;
          background: #f8fafc;
          transition: all 0.2s ease;
          outline: none;
          font-family: inherit;
          appearance: none;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a0aec0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }
        .reg-select:focus {
          border-color: #177cf4;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(23,124,244,0.1);
        }
        .reg-label {
          display: block;
          font-size: 11.5px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 4px;
          letter-spacing: 0.1px;
        }
        .reg-submit {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: 0.3px;
          transition: all 0.25s ease;
          background: linear-gradient(135deg, #177cf4 0%, #1fd2d6 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .reg-submit:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(23,124,244,0.35);
        }
        .reg-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .reg-feature-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        .reg-feature-card:hover {
          background: rgba(255,255,255,0.11);
          transform: translateX(4px);
        }
      `}</style>

      <div style={{
        height: '100vh',
        display: 'flex',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>

        {/* ── LEFT PANEL ─────────────────────────────────────────── */}
        <div style={{
          flex: '0 0 42%',
          background: 'linear-gradient(145deg, #0d1f3c 0%, #1a365d 40%, #0e3460 70%, #0a2340 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 40px',
          position: 'relative',
          overflow: 'hidden',
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'slideInLeft 0.7s ease forwards' : 'none',
        }}>
          {/* Decorative glows */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(23,124,244,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,210,214,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {PARTICLES.map(p => <Particle key={p.id} {...p} />)}

          {/* Top logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SagemcomLogo variant="icon" style={{ width: 38, height: 38 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Sagemcom
            </span>
          </div>

          {/* Center */}
          <div style={{ animation: 'fadeInUp 0.9s 0.3s ease both' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(23,124,244,0.2)', border: '1px solid rgba(23,124,244,0.35)',
              borderRadius: 20, padding: '5px 12px', marginBottom: 16,
            }}>
              <Factory size={13} color="#1fd2d6" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1fd2d6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Créer un compte
              </span>
            </div>

            <h1 style={{
              fontSize: 30, fontWeight: 800, color: '#fff',
              lineHeight: 1.15, marginBottom: 10, letterSpacing: '-0.5px',
            }}>
              Rejoignez la<br />
              <span style={{
                background: 'linear-gradient(90deg, #177cf4, #1fd2d6, #177cf4)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 3s linear infinite',
              }}>
                plateforme QRQC
              </span>
            </h1>

            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6, maxWidth: 340, marginBottom: 22,
            }}>
              Inscrivez-vous pour accéder au suivi qualité, à la gestion des non-conformités et au pilotage de votre atelier.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FEATURES.map(({ icon: Icon, label, desc }, i) => (
                <div
                  key={label}
                  className="reg-feature-card"
                  style={{ animation: `fadeInUp 0.6s ${0.5 + i * 0.15}s ease both` }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, #177cf4, #1fd2d6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={14} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{desc}</div>
                  </div>
                  <ChevronRight size={13} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.5px' }}>
            © 2026 Sagemcom — Tous droits réservés
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 36px',
          background: '#ffffff',
          opacity: mounted ? 1 : 0,
          animation: mounted ? 'slideInRight 0.7s ease forwards' : 'none',
        }}>
          <div style={{ width: '100%', maxWidth: 440 }}>

            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <SagemcomLogo variant="full" style={{ width: 82, height: 'auto', marginBottom: 10 }} />
              <h2 style={{ fontSize: 21, fontWeight: 800, color: '#1a202c', marginBottom: 2, letterSpacing: '-0.3px' }}>
                Inscription
              </h2>
              <p style={{ fontSize: 12.5, color: '#718096', lineHeight: 1.4 }}>
                Créez votre compte sur la plateforme de gestion QRQC
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 13px', marginBottom: 12,
                background: '#fff5f5', border: '1.5px solid #fed7d7', borderRadius: 9,
                animation: 'fadeInUp 0.3s ease',
              }}>
                <AlertCircle size={15} color="#e53e3e" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: '#c53030', fontWeight: 500 }}>{error}</span>
              </div>
            )}
            {success && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 13px', marginBottom: 12,
                background: '#f0fff4', border: '1.5px solid #9ae6b4', borderRadius: 9,
                animation: 'fadeInUp 0.3s ease',
              }}>
                <CheckCircle size={15} color="#38a169" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: '#276749', fontWeight: 500 }}>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Nom + Prénom */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="reg-label">Nom</label>
                  <input className="reg-input" type="text" name="nom" placeholder="Votre nom" value={formData.nom} onChange={handleChange} required />
                </div>
                <div>
                  <label className="reg-label">Prénom</label>
                  <input className="reg-input" type="text" name="prenom" placeholder="Votre prénom" value={formData.prenom} onChange={handleChange} required />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 10 }}>
                <label className="reg-label">Adresse email</label>
                <input className="reg-input" type="email" name="email" placeholder="votre@email.fr" value={formData.email} onChange={handleChange} required />
              </div>

              {/* Rôle */}
              <div style={{ marginBottom: 10 }}>
                <label className="reg-label">Rôle</label>
                <select className="reg-select" name="role" value={formData.role} onChange={handleChange} required>
                  <option value="" disabled>Sélectionnez votre rôle…</option>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Mot de passe + Confirmer (côte à côte) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label className="reg-label">Mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="reg-input"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      style={{ paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#a0aec0', display: 'flex', alignItems: 'center', padding: 0,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#177cf4'}
                      onMouseLeave={e => e.currentTarget.style.color = '#a0aec0'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="reg-label">Confirmer</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="reg-input"
                      type={showConfirm ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      style={{ paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#a0aec0', display: 'flex', alignItems: 'center', padding: 0,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#177cf4'}
                      onMouseLeave={e => e.currentTarget.style.color = '#a0aec0'}
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" className="reg-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span style={{
                      width: 14, height: 14,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Inscription en cours…
                  </>
                ) : (
                  <>
                    S'inscrire
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Back to login */}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: '#177cf4', fontWeight: 600, fontSize: 13,
                  textDecoration: 'none',
                  borderBottom: '1.5px solid transparent',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderBottomColor = '#177cf4'}
                onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
              >
                <ArrowLeft size={14} />
                Retour à la connexion
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default Register
