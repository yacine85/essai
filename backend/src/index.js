import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import pool, { testConnection } from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3002
const ALLOWED_ORIGINS = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error('CORS origin not allowed'))
  }
}))
app.use(express.json())

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' })
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    req.user = user
    next()
  })
}

// Routes

const REGISTRATION_ROLES = [
  'pilote_test', 'pilote_test_sec',
  'pilote_maintenance', 'pilote_maintenance_sec',
  'pilote_depannage', 'pilote_depannage_sec',
  'pilote_info_trace', 'pilote_info_trace_sec',
  'pilote_qualite', 'pilote_qualite_sec',
  'pilote_logistique', 'pilote_logistique_sec',
  'pilote_cms2', 'pilote_cms2_sec',
  'pilote_methode', 'pilote_methode_sec',
  'pilote_process', 'pilote_process_sec',
  'pilote_integration', 'pilote_integration_sec'
]

const SERVICE_BY_ROLE = {
  pilote_test: 'test',
  pilote_test_sec: 'test',
  pilote_maintenance: 'maintenance',
  pilote_maintenance_sec: 'maintenance',
  pilote_depannage: 'depannage',
  pilote_depannage_sec: 'depannage',
  pilote_info_trace: 'info_trace',
  pilote_info_trace_sec: 'info_trace',
  pilote_qualite: 'qualite',
  pilote_qualite_sec: 'qualite',
  pilote_logistique: 'logistique',
  pilote_logistique_sec: 'logistique',
  pilote_cms2: 'cms2',
  pilote_cms2_sec: 'cms2',
  pilote_methode: 'methode',
  pilote_methode_sec: 'methode',
  pilote_process: 'process',
  pilote_process_sec: 'process',
  pilote_integration: 'integration',
  pilote_integration_sec: 'integration'
}

const PRIMARY_ROLE_BY_SERVICE = {
  test: 'pilote_test',
  maintenance: 'pilote_maintenance',
  depannage: 'pilote_depannage',
  info_trace: 'pilote_info_trace',
  qualite: 'pilote_qualite',
  logistique: 'pilote_logistique',
  cms2: 'pilote_cms2',
  methode: 'pilote_methode',
  process: 'pilote_process',
  integration: 'pilote_integration'
}

const SECONDARY_ROLE_BY_SERVICE = {
  test: 'pilote_test_sec',
  maintenance: 'pilote_maintenance_sec',
  depannage: 'pilote_depannage_sec',
  info_trace: 'pilote_info_trace_sec',
  qualite: 'pilote_qualite_sec',
  logistique: 'pilote_logistique_sec',
  cms2: 'pilote_cms2_sec',
  methode: 'pilote_methode_sec',
  process: 'pilote_process_sec',
  integration: 'pilote_integration_sec'
}

const STATUS_LABELS = {
  en_attente: 'En attente de validation',
  en_cours: 'En cours',
  refuse: 'Refusee',
  cloture: 'Cloturee'
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const LINE_COLOR_PALETTE = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
]

const isAdminUser = (req) => req.user?.role === 'admin'

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

async function getNextLineColor(atelierId) {
  const [existing] = await pool.query(
    'SELECT color FROM lignes WHERE atelier_id = ? ORDER BY id ASC',
    [atelierId]
  )

  const used = new Set(
    existing
      .map((line) => String(line.color || '').toLowerCase())
      .filter(Boolean)
  )

  const candidate = LINE_COLOR_PALETTE.find((color) => !used.has(color.toLowerCase()))
  if (candidate) {
    return candidate
  }

  const fallbackIndex = existing.length % LINE_COLOR_PALETTE.length
  return LINE_COLOR_PALETTE[fallbackIndex]
}

let emailTransporter
let emailTransporterInitialized = false

function isValidEmail(email) {
  return Boolean(email && EMAIL_REGEX.test(String(email).trim()))
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status
}

function getEmailTransporter() {
  if (emailTransporterInitialized) {
    return emailTransporter
  }

  emailTransporterInitialized = true

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.warn('Email notifications disabled: SMTP_HOST/SMTP_USER/SMTP_PASS are missing')
    emailTransporter = null
    return emailTransporter
  }

  emailTransporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  })

  return emailTransporter
}

async function logActionNotification({
  gapAnalysisId,
  notificationType,
  recipientUserId,
  recipientEmail,
  recipientRole,
  sendStatus,
  errorMessage,
  triggeredBy,
  payload
}) {
  try {
    await pool.query(
      `INSERT INTO action_notification_history
       (gap_analysis_id, notification_type, recipient_user_id, recipient_email, recipient_role, send_status, error_message, triggered_by, payload, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        gapAnalysisId,
        notificationType,
        recipientUserId || null,
        recipientEmail || null,
        recipientRole || null,
        sendStatus,
        errorMessage || null,
        triggeredBy || null,
        JSON.stringify(payload || {}),
        sendStatus === 'sent' ? new Date() : null
      ]
    )
  } catch (error) {
    console.error('Error logging action notification:', error.message)
  }
}

async function fetchActionNotificationContext(actionId) {
  const [actions] = await pool.query(
    `SELECT
      ga.id,
      ga.date,
      ga.kpi_nom,
      ga.ecart,
      ga.causes,
      ga.actions,
      ga.impact,
      ga.service_code,
      ga.deadline,
      ga.statut,
      ga.created_at,
      a.nom AS atelier_nom,
      l.nom AS ligne_nom,
      creator.nom AS creator_nom,
      creator.prenom AS creator_prenom
     FROM gap_analysis ga
     JOIN ateliers a ON ga.atelier_id = a.id
     JOIN lignes l ON ga.ligne_id = l.id
     JOIN users creator ON ga.created_by = creator.id
     WHERE ga.id = ?`,
    [actionId]
  )

  if (actions.length === 0) {
    return null
  }

  const action = actions[0]
  const primaryRole = PRIMARY_ROLE_BY_SERVICE[action.service_code]
  const secondaryRole = SECONDARY_ROLE_BY_SERVICE[action.service_code]

  const [recipients] = await pool.query(
    `SELECT id, nom, prenom, email, role
     FROM users
     WHERE role IN (?, ?)
     ORDER BY FIELD(role, ?, ?)`,
    [primaryRole, secondaryRole, primaryRole, secondaryRole]
  )

  return { action, recipients }
}

function buildActionNotificationEmail(action, notificationType) {
  const statusLabel = getStatusLabel(action.statut)
  const actionDescription = action.kpi_nom
    ? `Action corrective liee au KPI ${action.kpi_nom}`
    : 'Description non renseignee'

  const notificationLabelByType = {
    creation: 'Creation de l action',
    validation: 'Validation de l action',
    refus: 'Refus de l action',
    cloture: 'Cloture de l action',
    statut: 'Mise a jour du statut'
  }

  const notifLabel = notificationLabelByType[notificationType] || 'Mise a jour de l action'
  const shouldAskDecision = action.statut === 'en_attente'
  const subject = `[Plan d'Actions] Action #${action.id} - ${notifLabel}`

  const lines = [
    `Numero de l action: ${action.id}`,
    `Description: ${actionDescription}`,
    `Atelier: ${action.atelier_nom}`,
    `KPI: ${action.kpi_nom || 'N/A'}`,
    `Ligne: ${action.ligne_nom}`,
    `Causes: ${action.causes || 'N/A'}`,
    `Ecart: ${action.ecart ?? 'N/A'}`,
    `Action: ${action.actions || 'N/A'}`,
    `Impact: ${action.impact ?? 'N/A'}`,
    `Service pilote: ${action.service_code}`,
    `Date de creation: ${new Date(action.created_at).toLocaleString('fr-FR')}`,
    `Delai: ${action.deadline ? new Date(action.deadline).toLocaleDateString('fr-FR') : 'N/A'}`,
    `Statut actuel: ${statusLabel}`
  ]

  const decisionLine = shouldAskDecision
    ? 'Merci de valider ou refuser cette action des que possible.'
    : 'Merci de prendre en compte cette mise a jour de statut.'

  const text = [
    `Notification Plan d'Actions: ${notifLabel}`,
    '',
    ...lines,
    '',
    decisionLine
  ].join('\n')

  const htmlRows = lines
    .map((line) => {
      const splitIndex = line.indexOf(':')
      if (splitIndex === -1) {
        return `<tr><td colspan="2">${line}</td></tr>`
      }
      const key = line.slice(0, splitIndex)
      const value = line.slice(splitIndex + 1).trim()
      return `<tr><td style="padding:6px 10px;border:1px solid #ddd;"><strong>${key}</strong></td><td style="padding:6px 10px;border:1px solid #ddd;">${value}</td></tr>`
    })
    .join('')

  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;">
      <h2 style="margin-bottom:8px;">Notification Plan d Actions: ${notifLabel}</h2>
      <table style="border-collapse:collapse;min-width:620px;">${htmlRows}</table>
      <p style="margin-top:16px;"><strong>${decisionLine}</strong></p>
    </div>
  `

  return { subject, text, html, notificationLabel: notifLabel }
}

async function notifyActionChange({ actionId, notificationType, triggeredBy }) {
  try {
    const context = await fetchActionNotificationContext(actionId)

    if (!context) {
      console.warn(`Action ${actionId} introuvable pour notification ${notificationType}`)
      return
    }

    const { action, recipients } = context
    const emailContent = buildActionNotificationEmail(action, notificationType)
    const transporter = getEmailTransporter()

    for (const recipient of recipients) {
      const payload = {
        action_id: action.id,
        action_status: action.statut,
        notification_type: notificationType,
        service_code: action.service_code
      }

      if (!recipient.email) {
        await logActionNotification({
          gapAnalysisId: action.id,
          notificationType,
          recipientUserId: recipient.id,
          recipientEmail: null,
          recipientRole: recipient.role,
          sendStatus: 'failed',
          errorMessage: 'Adresse email manquante',
          triggeredBy,
          payload
        })
        continue
      }

      if (!isValidEmail(recipient.email)) {
        await logActionNotification({
          gapAnalysisId: action.id,
          notificationType,
          recipientUserId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole: recipient.role,
          sendStatus: 'failed',
          errorMessage: 'Adresse email invalide',
          triggeredBy,
          payload
        })
        continue
      }

      if (!transporter) {
        await logActionNotification({
          gapAnalysisId: action.id,
          notificationType,
          recipientUserId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole: recipient.role,
          sendStatus: 'failed',
          errorMessage: 'Transport SMTP non configure',
          triggeredBy,
          payload
        })
        continue
      }

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.SMTP_USER,
          to: recipient.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html
        })

        await logActionNotification({
          gapAnalysisId: action.id,
          notificationType,
          recipientUserId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole: recipient.role,
          sendStatus: 'sent',
          errorMessage: null,
          triggeredBy,
          payload
        })
      } catch (error) {
        await logActionNotification({
          gapAnalysisId: action.id,
          notificationType,
          recipientUserId: recipient.id,
          recipientEmail: recipient.email,
          recipientRole: recipient.role,
          sendStatus: 'failed',
          errorMessage: error.message,
          triggeredBy,
          payload
        })

        console.error(
          `Email notification failed for action ${action.id} to ${recipient.email}:`,
          error.message
        )
      }
    }
  } catch (error) {
    console.error(`Error while sending ${notificationType} notification for action ${actionId}:`, error)
  }
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', message: 'QRQC API is running', database: 'connected' })
  } catch (error) {
    res.json({ status: 'ok', message: 'QRQC API is running', database: 'disconnected' })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  
  try {
    const [users] = await pool.query(
      'SELECT id, nom, prenom, email, password, role, atelier_id FROM users WHERE email = ?',
      [email]
    )
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }
    
    const user = users[0]
    const validPassword = await bcrypt.compare(password, user.password)
    
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )
    
    const { password: _, ...userWithoutPassword } = user
    res.json({ success: true, user: userWithoutPassword, token })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// Register (inscription libre)
app.post('/api/auth/register', async (req, res) => {
  const { nom, prenom, email, password, role } = req.body

  const normalizedRole = typeof role === 'string' ? role.trim() : ''

  if (!normalizedRole || !REGISTRATION_ROLES.includes(normalizedRole)) {
    return res.status(400).json({ success: false, error: 'Rôle obligatoire et valide requis' });
  }

  const userRole = normalizedRole
  
  try {
    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Cet email est déjà utilisé' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (nom, prenom, email, password, role, atelier_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nom, prenom, email, hashedPassword, userRole, null]
    )

    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, error: 'Erreur lors de l\'inscription' })
  }
})

// Get all users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, nom, prenom, email, role, atelier_id, created_at FROM users'
    )
    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create user
app.post('/api/users', authenticateToken, async (req, res) => {
  const { nom, prenom, email, password, role, atelier_id } = req.body
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (nom, prenom, email, password, role, atelier_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nom, prenom, email, hashedPassword, role, atelier_id || null]
    )
    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update user
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { nom, prenom, email, role, atelier_id } = req.body
  
  try {
    await pool.query(
      'UPDATE users SET nom = ?, prenom = ?, email = ?, role = ?, atelier_id = ? WHERE id = ?',
      [nom, prenom, email, role, atelier_id || null, id]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete user
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get ateliers
app.get('/api/ateliers', authenticateToken, async (req, res) => {
  try {
    const [ateliers] = await pool.query('SELECT * FROM ateliers')
    res.json(ateliers)
  } catch (error) {
    console.error('Error fetching ateliers:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get lignes by atelier
app.get('/api/lignes/:atelierId', authenticateToken, async (req, res) => {
  const { atelierId } = req.params
  
  try {
    const [lignes] = await pool.query(
      'SELECT id, atelier_id, nom, color FROM lignes WHERE atelier_id = ? ORDER BY id ASC',
      [atelierId]
    )
    res.json(lignes)
  } catch (error) {
    console.error('Error fetching lignes:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get all lignes
app.get('/api/lignes', authenticateToken, async (req, res) => {
  try {
    const [lignes] = await pool.query('SELECT id, atelier_id, nom, color FROM lignes ORDER BY atelier_id ASC, id ASC')
    res.json(lignes)
  } catch (error) {
    console.error('Error fetching lignes:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create ligne
app.post('/api/lignes', authenticateToken, async (req, res) => {
  const { atelier_id, nom, color } = req.body

  if (!atelier_id || !nom || !String(nom).trim()) {
    return res.status(400).json({ error: 'atelier_id et nom sont requis' })
  }

  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Accès admin requis' })
  }
  
  try {
    const finalColor = isHexColor(color) ? color : await getNextLineColor(atelier_id)
    const [result] = await pool.query(
      'INSERT INTO lignes (atelier_id, nom, color) VALUES (?, ?, ?)',
      [atelier_id, nom, finalColor]
    )

    const [[created]] = await pool.query(
      'SELECT id, atelier_id, nom, color FROM lignes WHERE id = ?',
      [result.insertId]
    )

    res.json({ success: true, ligne: created })
  } catch (error) {
    console.error('Error creating ligne:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update ligne
app.put('/api/lignes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { nom, color } = req.body

  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Accès admin requis' })
  }

  if (color !== undefined && !isHexColor(color)) {
    return res.status(400).json({ error: 'Format de couleur invalide. Utilisez #RRGGBB' })
  }
  
  try {
    const updates = []
    const params = []

    if (nom !== undefined) {
      updates.push('nom = ?')
      params.push(nom)
    }

    if (color !== undefined) {
      updates.push('color = ?')
      params.push(color)
    }

    if (updates.length === 0) {
      return res.json({ success: true })
    }

    params.push(id)
    await pool.query(`UPDATE lignes SET ${updates.join(', ')} WHERE id = ?`, params)

    const [[updated]] = await pool.query(
      'SELECT id, atelier_id, nom, color FROM lignes WHERE id = ?',
      [id]
    )

    res.json({ success: true, ligne: updated })
  } catch (error) {
    console.error('Error updating ligne:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete ligne
app.delete('/api/lignes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const forceDelete = String(req.query.force || '').toLowerCase() === 'true'

  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Accès admin requis' })
  }
  
  try {
    const [existing] = await pool.query('SELECT id, nom FROM lignes WHERE id = ?', [id])
    if (!existing.length) {
      return res.status(404).json({ error: 'Ligne introuvable' })
    }

    const dependencyChecks = [
      { table: 'production', label: 'production' },
      { table: 'arrets', label: 'arrets' },
      { table: 'qualite', label: 'qualite' },
      { table: 'effectif', label: 'effectif' },
      { table: 'incidents', label: 'incidents' },
      { table: 'indicateurs', label: 'indicateurs' },
      { table: 'gap_analysis', label: 'actions' }
    ]

    const blockedBy = []
    for (const dep of dependencyChecks) {
      const [[row]] = await pool.query(
        `SELECT COUNT(*) AS count FROM ${dep.table} WHERE ligne_id = ?`,
        [id]
      )

      const count = Number(row?.count || 0)
      if (count > 0) {
        blockedBy.push({ table: dep.table, label: dep.label, count })
      }
    }

    if (blockedBy.length > 0 && !forceDelete) {
      const details = blockedBy.map((x) => `${x.label}: ${x.count}`).join(', ')
      return res.status(409).json({
        error: `Suppression impossible: cette ligne contient des donnees associees (${details}).`,
        details: blockedBy,
        canForceDelete: true
      })
    }

    if (forceDelete) {
      const connection = await pool.getConnection()

      try {
        await connection.beginTransaction()

        await connection.query('DELETE FROM production WHERE ligne_id = ?', [id])
        await connection.query('DELETE FROM arrets WHERE ligne_id = ?', [id])
        await connection.query('DELETE FROM qualite WHERE ligne_id = ?', [id])
        await connection.query('DELETE FROM effectif WHERE ligne_id = ?', [id])
        await connection.query('DELETE FROM incidents WHERE ligne_id = ?', [id])
        await connection.query('DELETE FROM indicateurs WHERE ligne_id = ?', [id])
        await connection.query('DELETE FROM gap_analysis WHERE ligne_id = ?', [id])
        await connection.query('DELETE FROM lignes WHERE id = ?', [id])

        await connection.commit()
        return res.json({ success: true, forced: true })
      } catch (txError) {
        await connection.rollback()
        throw txError
      } finally {
        connection.release()
      }
    }

    await pool.query('DELETE FROM lignes WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting ligne:', error)

    if (error?.code === 'ER_ROW_IS_REFERENCED_2' || error?.errno === 1451) {
      return res.status(409).json({
        error: 'Suppression impossible: cette ligne contient des donnees associees.'
      })
    }

    res.status(500).json({ error: 'Server error' })
  }
})

// Get KPI definitions
app.get('/api/kpis', authenticateToken, async (req, res) => {
  const { atelier_id } = req.query

  try {
    let sql = `
      SELECT id, atelier_id, name, objective, alert_threshold, inverse, unit, sort_order, created_at, updated_at
      FROM kpi_definitions
      WHERE 1=1
    `
    const params = []

    if (atelier_id) {
      sql += ' AND atelier_id = ?'
      params.push(atelier_id)
    }

    sql += ' ORDER BY atelier_id ASC, sort_order ASC, id ASC'

    const [kpis] = await pool.query(sql, params)
    res.json(kpis)
  } catch (error) {
    console.error('Error fetching KPIs:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create KPI definition
app.post('/api/kpis', authenticateToken, async (req, res) => {
  const { atelier_id, name, objective, alert_threshold, inverse, unit } = req.body

  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Accès admin requis' })
  }

  if (!atelier_id || !name || !String(name).trim()) {
    return res.status(400).json({ error: 'atelier_id et name sont requis' })
  }

  try {
    const [[{ maxSortOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS maxSortOrder FROM kpi_definitions WHERE atelier_id = ?',
      [atelier_id]
    )

    const [result] = await pool.query(
      `INSERT INTO kpi_definitions
       (atelier_id, name, objective, alert_threshold, inverse, unit, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        atelier_id,
        String(name).trim(),
        Number(objective ?? 0),
        Number(alert_threshold ?? 0),
        Boolean(inverse),
        unit || '%',
        maxSortOrder + 1
      ]
    )

    const [[kpi]] = await pool.query(
      'SELECT id, atelier_id, name, objective, alert_threshold, inverse, unit, sort_order FROM kpi_definitions WHERE id = ?',
      [result.insertId]
    )

    res.json({ success: true, kpi })
  } catch (error) {
    console.error('Error creating KPI definition:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update KPI definition
app.put('/api/kpis/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { name, objective, alert_threshold, inverse, unit, sort_order } = req.body

  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Accès admin requis' })
  }

  try {
    const updates = []
    const params = []

    if (name !== undefined) {
      updates.push('name = ?')
      params.push(String(name).trim())
    }
    if (objective !== undefined) {
      updates.push('objective = ?')
      params.push(Number(objective))
    }
    if (alert_threshold !== undefined) {
      updates.push('alert_threshold = ?')
      params.push(Number(alert_threshold))
    }
    if (inverse !== undefined) {
      updates.push('inverse = ?')
      params.push(Boolean(inverse))
    }
    if (unit !== undefined) {
      updates.push('unit = ?')
      params.push(unit)
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?')
      params.push(Number(sort_order))
    }

    if (updates.length === 0) {
      return res.json({ success: true })
    }

    params.push(id)
    await pool.query(`UPDATE kpi_definitions SET ${updates.join(', ')} WHERE id = ?`, params)

    const [[kpi]] = await pool.query(
      'SELECT id, atelier_id, name, objective, alert_threshold, inverse, unit, sort_order FROM kpi_definitions WHERE id = ?',
      [id]
    )

    res.json({ success: true, kpi })
  } catch (error) {
    console.error('Error updating KPI definition:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete KPI definition
app.delete('/api/kpis/:id', authenticateToken, async (req, res) => {
  const { id } = req.params

  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Accès admin requis' })
  }

  try {
    await pool.query('DELETE FROM kpi_definitions WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting KPI definition:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Upsert KPI value for a day/line/KPI
app.post('/api/kpi-values/upsert', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id, kpi_id, value } = req.body

  if (!date || !atelier_id || !ligne_id || !kpi_id) {
    return res.status(400).json({ error: 'date, atelier_id, ligne_id et kpi_id sont requis' })
  }

  try {
    await pool.query(
      `INSERT INTO kpi_values
       (date, atelier_id, ligne_id, kpi_id, value, created_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         value = VALUES(value),
         created_by = VALUES(created_by),
         updated_at = CURRENT_TIMESTAMP`,
      [date, atelier_id, ligne_id, kpi_id, Number(value ?? 0), req.user.id]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error upserting KPI value:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get KPI values for a specific date/atelier
app.get('/api/kpi-values', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id, kpi_id } = req.query

  try {
    let sql = `
      SELECT
        kv.id,
        kv.date,
        kv.atelier_id,
        kv.ligne_id,
        kv.kpi_id,
        kv.value,
        l.nom AS ligne_nom,
        l.color AS ligne_color,
        kd.name AS kpi_name,
        kd.objective,
        kd.alert_threshold,
        kd.inverse,
        kd.unit
      FROM kpi_values kv
      JOIN lignes l ON l.id = kv.ligne_id
      JOIN kpi_definitions kd ON kd.id = kv.kpi_id
      WHERE 1=1
    `

    const params = []

    if (date) {
      sql += ' AND kv.date = ?'
      params.push(date)
    }
    if (atelier_id) {
      sql += ' AND kv.atelier_id = ?'
      params.push(atelier_id)
    }
    if (ligne_id) {
      sql += ' AND kv.ligne_id = ?'
      params.push(ligne_id)
    }
    if (kpi_id) {
      sql += ' AND kv.kpi_id = ?'
      params.push(kpi_id)
    }

    sql += ' ORDER BY kv.date ASC, kv.ligne_id ASC, kv.kpi_id ASC'

    const [values] = await pool.query(sql, params)
    res.json(values)
  } catch (error) {
    console.error('Error fetching KPI values:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get historical KPI series with filters
app.get('/api/kpi-history', authenticateToken, async (req, res) => {
  const { atelier_id, ligne_id, kpi_id, start_date, end_date } = req.query

  if (!atelier_id) {
    return res.status(400).json({ error: 'atelier_id est requis' })
  }

  try {
    let sql = `
      SELECT
        kv.date,
        kv.value,
        kv.ligne_id,
        kv.kpi_id,
        l.nom AS ligne_nom,
        l.color AS ligne_color,
        kd.name AS kpi_name,
        kd.objective,
        kd.alert_threshold,
        kd.inverse,
        kd.unit
      FROM kpi_values kv
      JOIN lignes l ON l.id = kv.ligne_id
      JOIN kpi_definitions kd ON kd.id = kv.kpi_id
      WHERE kv.atelier_id = ?
    `

    const params = [atelier_id]

    if (ligne_id) {
      sql += ' AND kv.ligne_id = ?'
      params.push(ligne_id)
    }
    if (kpi_id) {
      sql += ' AND kv.kpi_id = ?'
      params.push(kpi_id)
    }
    if (start_date) {
      sql += ' AND kv.date >= ?'
      params.push(start_date)
    }
    if (end_date) {
      sql += ' AND kv.date <= ?'
      params.push(end_date)
    }

    sql += ' ORDER BY kv.date ASC, kv.kpi_id ASC, kv.ligne_id ASC'

    const [history] = await pool.query(sql, params)
    res.json(history)
  } catch (error) {
    console.error('Error fetching KPI history:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get production data
app.get('/api/production', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id } = req.query
  
  try {
    let sql = `
      SELECT p.*, a.nom as atelier_nom, l.nom as ligne_nom, u.nom as user_nom, u.prenom as user_prenom
      FROM production p
      JOIN ateliers a ON p.atelier_id = a.id
      JOIN lignes l ON p.ligne_id = l.id
      JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `
    const params = []
    
    if (date) {
      sql += ' AND p.date = ?'
      params.push(date)
    }
    if (atelier_id) {
      sql += ' AND p.atelier_id = ?'
      params.push(atelier_id)
    }
    if (ligne_id) {
      sql += ' AND p.ligne_id = ?'
      params.push(ligne_id)
    }
    
    sql += ' ORDER BY p.date DESC, p.created_at DESC'
    
    const [production] = await pool.query(sql, params)
    res.json(production)
  } catch (error) {
    console.error('Error fetching production:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Save production data
app.post('/api/production', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id, objectif, realise } = req.body
  
  try {
    const [result] = await pool.query(
      'INSERT INTO production (date, atelier_id, ligne_id, objectif, realise, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [date, atelier_id, ligne_id, objectif, realise, req.user.id]
    )
    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Error saving production:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get indicateurs
app.get('/api/indicators', authenticateToken, async (req, res) => {
  const { atelier_id, date } = req.query
  
  try {
    let sql = `
      SELECT i.*, a.nom as atelier_nom
      FROM indicateurs i
      JOIN ateliers a ON i.atelier_id = a.id
      WHERE 1=1
    `
    const params = []
    
    if (atelier_id) {
      sql += ' AND i.atelier_id = ?'
      params.push(atelier_id)
    }
    if (date) {
      sql += ' AND i.date = ?'
      params.push(date)
    }
    
    sql += ' ORDER BY i.date DESC'
    
    const [indicators] = await pool.query(sql, params)
    res.json(indicators)
  } catch (error) {
    console.error('Error fetching indicators:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Save indicateurs
app.post('/api/indicators', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id, trg, trs, form, encours_pannes, incident_it, qrqc_score, score_5s } = req.body
  
  try {
    const [result] = await pool.query(
      'INSERT INTO indicateurs (date, atelier_id, ligne_id, trg, trs, form, encours_pannes, incident_it, qrqc_score, score_5s) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [date, atelier_id, ligne_id, trg, trs, form, encours_pannes || 0, incident_it || 0, qrqc_score || 0, score_5s || 0]
    )
    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Error saving indicators:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update indicateurs
app.put('/api/indicators/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { trg, trs, form, encours_pannes, incident_it, qrqc_score, score_5s } = req.body
  
  try {
    const updates = []
    const params = []
    
    if (trg !== undefined) { updates.push('trg = ?'); params.push(trg) }
    if (trs !== undefined) { updates.push('trs = ?'); params.push(trs) }
    if (form !== undefined) { updates.push('form = ?'); params.push(form) }
    if (encours_pannes !== undefined) { updates.push('encours_pannes = ?'); params.push(encours_pannes) }
    if (incident_it !== undefined) { updates.push('incident_it = ?'); params.push(incident_it) }
    if (qrqc_score !== undefined) { updates.push('qrqc_score = ?'); params.push(qrqc_score) }
    if (score_5s !== undefined) { updates.push('score_5s = ?'); params.push(score_5s) }
    
    if (updates.length === 0) {
      return res.json({ success: true })
    }
    
    params.push(id)
    await pool.query(`UPDATE indicateurs SET ${updates.join(', ')} WHERE id = ?`, params)
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating indicators:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete indicateurs
app.delete('/api/indicators/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  
  try {
    await pool.query('DELETE FROM indicateurs WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting indicators:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get arrets
app.get('/api/arrets', authenticateToken, async (req, res) => {
  const { date, atelier_id } = req.query
  
  try {
    let sql = `
      SELECT ar.*, a.nom as atelier_nom, l.nom as ligne_nom
      FROM arrets ar
      JOIN ateliers a ON ar.atelier_id = a.id
      JOIN lignes l ON ar.ligne_id = l.id
      WHERE 1=1
    `
    const params = []
    
    if (date) {
      sql += ' AND ar.date = ?'
      params.push(date)
    }
    if (atelier_id) {
      sql += ' AND ar.atelier_id = ?'
      params.push(atelier_id)
    }
    
    sql += ' ORDER BY ar.date DESC'
    
    const [arrets] = await pool.query(sql, params)
    res.json(arrets)
  } catch (error) {
    console.error('Error fetching arrets:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Save arret
app.post('/api/arrets', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id, duree, cause, description } = req.body
  
  try {
    const [result] = await pool.query(
      'INSERT INTO arrets (date, atelier_id, ligne_id, duree, cause, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, atelier_id, ligne_id, duree, cause, description || '', req.user.id]
    )
    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Error saving arret:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get effectif
app.get('/api/effectif', authenticateToken, async (req, res) => {
  const { date, atelier_id } = req.query
  
  try {
    let sql = `
      SELECT e.*, a.nom as atelier_nom, l.nom as ligne_nom
      FROM effectif e
      JOIN ateliers a ON e.atelier_id = a.id
      JOIN lignes l ON e.ligne_id = l.id
      WHERE 1=1
    `
    const params = []
    
    if (date) {
      sql += ' AND e.date = ?'
      params.push(date)
    }
    if (atelier_id) {
      sql += ' AND e.atelier_id = ?'
      params.push(atelier_id)
    }
    
    sql += ' ORDER BY e.date DESC'
    
    const [effectif] = await pool.query(sql, params)
    res.json(effectif)
  } catch (error) {
    console.error('Error fetching effectif:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Save effectif
app.post('/api/effectif', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id, nombre_operateurs, nombre_techniciens, dmh } = req.body
  
  try {
    const [result] = await pool.query(
      'INSERT INTO effectif (date, atelier_id, ligne_id, nombre_operateurs, nombre_techniciens, dmh, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, atelier_id, ligne_id, nombre_operateurs, nombre_techniciens, dmh || 0, req.user.id]
    )
    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Error saving effectif:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get incidents
app.get('/api/incidents', authenticateToken, async (req, res) => {
  const { date, atelier_id, statut } = req.query
  
  try {
    let sql = `
      SELECT i.*, a.nom as atelier_nom, l.nom as ligne_nom,
             creator.nom as creator_nom, creator.prenom as creator_prenom,
             resolver.nom as resolver_nom, resolver.prenom as resolver_prenom
      FROM incidents i
      JOIN ateliers a ON i.atelier_id = a.id
      JOIN lignes l ON i.ligne_id = l.id
      JOIN users creator ON i.created_by = creator.id
      LEFT JOIN users resolver ON i.resolved_by = resolver.id
      WHERE 1=1
    `
    const params = []
    
    if (date) {
      sql += ' AND i.date = ?'
      params.push(date)
    }
    if (atelier_id) {
      sql += ' AND i.atelier_id = ?'
      params.push(atelier_id)
    }
    if (statut) {
      sql += ' AND i.statut = ?'
      params.push(statut)
    }
    
    sql += ' ORDER BY i.created_at DESC'
    
    const [incidents] = await pool.query(sql, params)
    res.json(incidents)
  } catch (error) {
    console.error('Error fetching incidents:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Save incident
app.post('/api/incidents', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id, description, type, priorite } = req.body
  
  try {
    const [result] = await pool.query(
      'INSERT INTO incidents (date, atelier_id, ligne_id, description, type, priorite, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, atelier_id, ligne_id, description, type, priorite || 'moyenne', req.user.id]
    )
    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Error saving incident:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update incident
app.put('/api/incidents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { statut, resolved_by } = req.body
  
  try {
    let sql = 'UPDATE incidents SET statut = ?'
    const params = [statut]
    
    if (resolved_by) {
      sql += ', resolved_by = ?, resolved_at = NOW()'
      params.push(resolved_by)
    }
    
    sql += ' WHERE id = ?'
    params.push(id)
    
    await pool.query(sql, params)
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating incident:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get gap analysis
app.get('/api/gap-analysis', authenticateToken, async (req, res) => {
  const { date, atelier_id } = req.query
  
  try {
    let sql = `
      SELECT 
        ga.*,
        a.nom as atelier_nom, 
        l.nom as ligne_nom,
        GROUP_CONCAT(CONCAT(u.prenom, ' ', u.nom) SEPARATOR ', ') as pilot_names,
        creator.nom as creator_nom, 
        creator.prenom as creator_prenom
      FROM gap_analysis ga
      JOIN ateliers a ON ga.atelier_id = a.id
      JOIN lignes l ON ga.ligne_id = l.id
      LEFT JOIN gap_analysis_pilots gap ON ga.id = gap.gap_analysis_id
      LEFT JOIN users u ON gap.pilot_id = u.id
      JOIN users creator ON ga.created_by = creator.id
      WHERE 1=1
    `
    const params = []
    
    if (date) {
      sql += ' AND ga.date = ?'
      params.push(date)
    }
    if (atelier_id) {
      sql += ' AND ga.atelier_id = ?'
      params.push(atelier_id)
    }

    const userService = SERVICE_BY_ROLE[req.user.role]
    if (userService) {
      sql += ' AND ga.service_code = ?'
      params.push(userService)
    }
    
    sql += ' GROUP BY ga.id ORDER BY ga.date DESC'
    
    const [gaps] = await pool.query(sql, params)
    res.json(gaps)
  } catch (error) {
    console.error('Error fetching gap analysis:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Save gap analysis (multi-pilot support)
app.post('/api/gap-analysis', authenticateToken, async (req, res) => {
  const { date, atelier_id, ligne_id, kpi_nom, ecart, causes, actions, impact, service_code, deadline } = req.body
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seul l\'administrateur peut créer une action' })
    }

    if (!service_code || !PRIMARY_ROLE_BY_SERVICE[service_code]) {
      return res.status(400).json({ error: 'Service responsable obligatoire et invalide' })
    }

    const serviceRoles = [PRIMARY_ROLE_BY_SERVICE[service_code], SECONDARY_ROLE_BY_SERVICE[service_code]]
    const [serviceReps] = await pool.query(
      'SELECT id FROM users WHERE role IN (?, ?)',
      serviceRoles
    )

    if (serviceReps.length < 2) {
      return res.status(400).json({
        error: 'Le service doit avoir un représentant principal et un représentant secondaire actifs'
      })
    }

    const [result] = await pool.query(
      'INSERT INTO gap_analysis (date, atelier_id, ligne_id, kpi_nom, ecart, causes, actions, impact, service_code, deadline, realise, statut, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)',
      [date, atelier_id, ligne_id, kpi_nom || '', ecart, causes || '', actions || '', impact || 0, service_code, deadline || null, 'en_attente', req.user.id]
    )
    
    const actionId = result.insertId
    
    const pilotValues = serviceReps.map(rep => [actionId, rep.id])
    await pool.query(
      'INSERT INTO gap_analysis_pilots (gap_analysis_id, pilot_id) VALUES ?',
      [pilotValues]
    )

    await notifyActionChange({
      actionId,
      notificationType: 'creation',
      triggeredBy: req.user.id
    })
    
    res.json({ success: true, id: actionId })
  } catch (error) {
    console.error('Error saving gap analysis:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete gap analysis
app.delete('/api/gap-analysis/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seul l\'administrateur peut supprimer une action' })
    }

    await pool.query('DELETE FROM gap_analysis WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting gap analysis:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update gap analysis (multi-pilot support)
app.put('/api/gap-analysis/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { kpi_nom, causes, actions, impact, service_code, deadline } = req.body
  
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seul l\'administrateur peut modifier une action' })
    }

    if (!service_code || !PRIMARY_ROLE_BY_SERVICE[service_code]) {
      return res.status(400).json({ error: 'Service responsable obligatoire et invalide' })
    }

    const [statusRows] = await pool.query('SELECT statut FROM gap_analysis WHERE id = ?', [id])
    if (statusRows.length === 0) {
      return res.status(404).json({ error: 'Action non trouvée' })
    }

    const serviceRoles = [PRIMARY_ROLE_BY_SERVICE[service_code], SECONDARY_ROLE_BY_SERVICE[service_code]]
    const [serviceReps] = await pool.query(
      'SELECT id FROM users WHERE role IN (?, ?)',
      serviceRoles
    )

    if (serviceReps.length < 2) {
      return res.status(400).json({
        error: 'Le service doit avoir un représentant principal et un représentant secondaire actifs'
      })
    }

    // Update main action
    await pool.query(
      'UPDATE gap_analysis SET kpi_nom = ?, causes = ?, actions = ?, impact = ?, service_code = ?, deadline = ? WHERE id = ?',
      [kpi_nom || '', causes || '', actions || '', impact || 0, service_code, deadline || null, id]
    )
    
    // Clear existing pilots
    await pool.query('DELETE FROM gap_analysis_pilots WHERE gap_analysis_id = ?', [id])
    
    const pilotValues = serviceReps.map(rep => [id, rep.id])
    await pool.query(
      'INSERT INTO gap_analysis_pilots (gap_analysis_id, pilot_id) VALUES ?',
      [pilotValues]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating gap analysis:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Helper function to check if user is a primary representative (pilote_*) or secondary (pilote_*_sec)
const isRepresentant = (role) => {
  return role && (role.startsWith('pilote_') && !role.endsWith('_sec'))
}

const isRepresentantSec = (role) => {
  return role && role.endsWith('_sec')
}

// Validate gap analysis action (multi-pilot + service-based)
app.post('/api/gap-analysis/:id/validate', authenticateToken, async (req, res) => {
  const { id } = req.params
  
  try {
    // Get user role
    const [users] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [req.user.id]
    )
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    
    const user = users[0]
    
    // Get the action
    const [actions] = await pool.query(
      'SELECT * FROM gap_analysis WHERE id = ?',
      [id]
    )
    
    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action non trouvée' })
    }
    
    const action = actions[0]
    
    const userService = SERVICE_BY_ROLE[user.role]
    const canValidate = Boolean(userService) && userService === action.service_code && action.statut === 'en_attente'
    
    if (!canValidate) {
      return res.status(403).json({ error: 'Vous n\'avez pas le droit de valider cette action' })
    }
    
    // Update status to 'en_cours'
    await pool.query(
      'UPDATE gap_analysis SET statut = ? WHERE id = ?',
      ['en_cours', id]
    )

    await notifyActionChange({
      actionId: Number(id),
      notificationType: 'validation',
      triggeredBy: req.user.id
    })
    
    res.json({ success: true, message: 'Action validée' })
  } catch (error) {
    console.error('Error validating action:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Reject gap analysis action (multi-pilot + service-based)
app.post('/api/gap-analysis/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params
  
  try {
    // Get user role
    const [users] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [req.user.id]
    )
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    
    const user = users[0]
    
    // Get the action
    const [actions] = await pool.query(
      'SELECT * FROM gap_analysis WHERE id = ?',
      [id]
    )
    
    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action non trouvée' })
    }
    
    const action = actions[0]
    
    const userService = SERVICE_BY_ROLE[user.role]
    const canReject = Boolean(userService) && userService === action.service_code && action.statut === 'en_attente'
    
    if (!canReject) {
      return res.status(403).json({ error: 'Vous n\'avez pas le droit de rejeter cette action' })
    }
    
    // Update status to 'refuse'
    await pool.query(
      'UPDATE gap_analysis SET statut = ? WHERE id = ?',
      ['refuse', id]
    )

    await notifyActionChange({
      actionId: Number(id),
      notificationType: 'refus',
      triggeredBy: req.user.id
    })
    
    res.json({ success: true, message: 'Action rejetée' })
  } catch (error) {
    console.error('Error rejecting action:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Close gap analysis action (PRIMARY reps only - multi-pilot support)
app.post('/api/gap-analysis/:id/close', authenticateToken, async (req, res) => {
  const { id } = req.params
  
  try {
    // Get user role
    const [users] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [req.user.id]
    )
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }
    
    const user = users[0]
    
    // Get the action
    const [actions] = await pool.query(
      'SELECT * FROM gap_analysis WHERE id = ?',
      [id]
    )
    
    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action non trouvée' })
    }
    
    const action = actions[0]
    
    const isPrimaryRep = isRepresentant(user.role)
    const userService = SERVICE_BY_ROLE[user.role]
    
    const canClose = Boolean(isPrimaryRep && userService && userService === action.service_code && action.statut === 'en_cours')
    
    if (!canClose) {
      return res.status(403).json({ error: 'Vous n\'avez pas le droit de clôturer cette action (seuls les reps principaux peuvent clôturer)' })
    }
    
    // Update status to 'cloture'
    await pool.query(
      'UPDATE gap_analysis SET statut = ?, realise = TRUE WHERE id = ?',
      ['cloture', id]
    )

    await notifyActionChange({
      actionId: Number(id),
      notificationType: 'cloture',
      triggeredBy: req.user.id
    })
    
    res.json({ success: true, message: 'Action clôturée' })
  } catch (error) {
    console.error('Error closing action:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get action notification history
app.get('/api/gap-analysis/:id/notifications', authenticateToken, async (req, res) => {
  const { id } = req.params

  try {
    const [actions] = await pool.query(
      'SELECT id, service_code FROM gap_analysis WHERE id = ?',
      [id]
    )

    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action non trouvée' })
    }

    const action = actions[0]
    const userService = SERVICE_BY_ROLE[req.user.role]
    const isAllowed = req.user.role === 'admin' || userService === action.service_code

    if (!isAllowed) {
      return res.status(403).json({ error: 'Acces refuse a cet historique de notifications' })
    }

    const [notifications] = await pool.query(
      `SELECT
        anh.id,
        anh.gap_analysis_id,
        anh.notification_type,
        anh.recipient_user_id,
        anh.recipient_email,
        anh.recipient_role,
        anh.send_status,
        anh.error_message,
        anh.sent_at,
        anh.created_at,
        anh.triggered_by,
        trigger_user.nom AS trigger_nom,
        trigger_user.prenom AS trigger_prenom
       FROM action_notification_history anh
       LEFT JOIN users trigger_user ON trigger_user.id = anh.triggered_by
       WHERE anh.gap_analysis_id = ?
       ORDER BY anh.created_at DESC`,
      [id]
    )

    res.json(notifications)
  } catch (error) {
    console.error('Error fetching action notification history:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get BBS
app.get('/api/bbs', authenticateToken, async (req, res) => {
  const { date, atelier_id, statut } = req.query
  
  try {
    let sql = `
      SELECT b.*, a.nom as atelier_nom, u.nom as user_nom, u.prenom as user_prenom
      FROM bbs b
      JOIN ateliers a ON b.atelier_id = a.id
      JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `
    const params = []
    
    if (date) {
      sql += ' AND b.date = ?'
      params.push(date)
    }
    if (atelier_id) {
      sql += ' AND b.atelier_id = ?'
      params.push(atelier_id)
    }
    if (statut) {
      sql += ' AND b.statut = ?'
      params.push(statut)
    }
    
    sql += ' ORDER BY b.date DESC'
    
    const [bbs] = await pool.query(sql, params)
    res.json(bbs)
  } catch (error) {
    console.error('Error fetching BBS:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Save BBS
app.post('/api/bbs', authenticateToken, async (req, res) => {
  const { date, atelier_id, type, valeur, description, statut } = req.body
  
  try {
    const [result] = await pool.query(
      'INSERT INTO bbs (date, atelier_id, type, valeur, description, statut, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, atelier_id, type, valeur || 0, description || '', statut || 'en_cours', req.user.id]
    )
    res.json({ success: true, id: result.insertId })
  } catch (error) {
    console.error('Error saving BBS:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get dashboard summary data
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    // Get recent production
    const [recentProduction] = await pool.query(`
      SELECT p.*, a.nom as atelier_nom, l.nom as ligne_nom
      FROM production p
      JOIN ateliers a ON p.atelier_id = a.id
      JOIN lignes l ON p.ligne_id = l.id
      ORDER BY p.date DESC, p.created_at DESC
      LIMIT 20
    `)
    
    // Get recent incidents
    const [recentIncidents] = await pool.query(`
      SELECT i.*, a.nom as atelier_nom
      FROM incidents i
      JOIN ateliers a ON i.atelier_id = a.id
      WHERE i.statut IN ('open', 'in_progress')
      ORDER BY i.created_at DESC
      LIMIT 10
    `)
    
    // Get indicators for all ateliers
    const [indicators] = await pool.query(`
      SELECT i.*, a.nom as atelier_nom
      FROM indicateurs i
      JOIN ateliers a ON i.atelier_id = a.id
      ORDER BY i.date DESC
      LIMIT 50
    `)
    
    // Get BBS summary
    const [bbsSummary] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) as en_cours,
        SUM(valeur) as total_valeur
      FROM bbs
      WHERE MONTH(date) = MONTH(CURRENT_DATE())
    `)
    
    res.json({
      production: recentProduction,
      incidents: recentIncidents,
      indicators: indicators,
      bbs: bbsSummary[0]
    })
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get activity log
app.get('/api/activity-log', authenticateToken, async (req, res) => {
  const { limit = 50 } = req.query
  
  try {
    const [logs] = await pool.query(`
      SELECT al.*, u.nom as user_nom, u.prenom as user_prenom
      FROM activity_log al
      JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [parseInt(limit)])
    
    res.json(logs)
  } catch (error) {
    console.error('Error fetching activity log:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Log activity
async function logActivity(userId, action, tableName, recordId, details) {
  try {
    await pool.query(
      'INSERT INTO activity_log (user_id, action, table_name, record_id, details) VALUES (?, ?, ?, ?, ?)',
      [userId, action, tableName, recordId, details]
    )
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

// ==================== PRESENCE MANAGEMENT APIs ====================

// Get all presences for a specific date
app.get('/api/presences', authenticateToken, async (req, res) => {
  const { date } = req.query
  
  try {
    let sql = `
      SELECT p.*, u.nom, u.prenom, u.email, u.role
      FROM presences p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `
    const params = []
    
    if (date) {
      sql += ' AND p.date = ?'
      params.push(date)
    } else {
      // Default to today
      sql += ' AND p.date = CURDATE()'
    }
    
    sql += ' ORDER BY u.nom, u.prenom'
    
    const [presences] = await pool.query(sql, params)
    res.json(presences)
  } catch (error) {
    console.error('Error fetching presences:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get presence history for a specific user
app.get('/api/presences/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params
  const { startDate, endDate, limit = 30 } = req.query
  
  try {
    let sql = `
      SELECT p.*, u.nom, u.prenom
      FROM presences p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `
    const params = [userId]
    
    if (startDate) {
      sql += ' AND p.date >= ?'
      params.push(startDate)
    }
    if (endDate) {
      sql += ' AND p.date <= ?'
      params.push(endDate)
    }
    
    sql += ' ORDER BY p.date DESC LIMIT ?'
    params.push(parseInt(limit))
    
    const [presences] = await pool.query(sql, params)
    res.json(presences)
  } catch (error) {
    console.error('Error fetching user presence history:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Mark presence for a user (or multiple users by admin)
app.post('/api/presences', authenticateToken, async (req, res) => {
  const { user_id, date, present, arrive_heure, commentaires } = req.body
  
  try {
    // Check if presence already exists for this user and date
    const [existing] = await pool.query(
      'SELECT id FROM presences WHERE user_id = ? AND date = ?',
      [user_id, date || new Date().toISOString().split('T')[0]]
    )
    
    if (existing.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE presences SET present = ?, arrive_heure = ?, commentaires = ? WHERE id = ?',
        [present, arrive_heure || null, commentaires || '', existing[0].id]
      )
      res.json({ success: true, message: 'Présence mise à jour' })
    } else {
      // Insert new
      await pool.query(
        'INSERT INTO presences (user_id, date, present, arrive_heure, commentaires) VALUES (?, ?, ?, ?, ?)',
        [user_id, date || new Date().toISOString().split('T')[0], present, arrive_heure || null, commentaires || '']
      )
      res.json({ success: true, message: 'Présence enregistrée' })
    }
  } catch (error) {
    console.error('Error saving presence:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Bulk mark presence for all users (admin only)
app.post('/api/presences/bulk', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé' })
  }
  
  const { presences, date } = req.body
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  try {
    for (const p of presences) {
      const [existing] = await pool.query(
        'SELECT id FROM presences WHERE user_id = ? AND date = ?',
        [p.user_id, targetDate]
      )
      
      if (existing.length > 0) {
        await pool.query(
          'UPDATE presences SET present = ?, arrive_heure = ?, commentaires = ? WHERE id = ?',
          [p.present, p.arrive_heure || null, p.commentaires || '', existing[0].id]
        )
      } else {
        await pool.query(
          'INSERT INTO presences (user_id, date, present, arrive_heure, commentaires) VALUES (?, ?, ?, ?, ?)',
          [p.user_id, targetDate, p.present, p.arrive_heure || null, p.commentaires || '']
        )
      }
    }
    
    res.json({ success: true, message: 'Présences en masse enregistrées' })
  } catch (error) {
    console.error('Error saving bulk presences:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get presence statistics
app.get('/api/presences/stats', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query
  
  try {
    let sql = `
      SELECT 
        p.date,
        COUNT(*) as total_users,
        SUM(CASE WHEN p.present = TRUE THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN p.present = FALSE THEN 1 ELSE 0 END) as absent_count,
        ROUND(SUM(CASE WHEN p.present = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as taux_presence
      FROM presences p
      WHERE 1=1
    `
    const params = []
    
    if (startDate) {
      sql += ' AND p.date >= ?'
      params.push(startDate)
    }
    if (endDate) {
      sql += ' AND p.date <= ?'
      params.push(endDate)
    }
    
    sql += ' GROUP BY p.date ORDER BY p.date DESC'
    
    const [stats] = await pool.query(sql, params)
    res.json(stats)
  } catch (error) {
    console.error('Error fetching presence stats:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Auto-create presences table if not exists
async function initializePresencesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS presences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        present BOOLEAN DEFAULT FALSE,
        arrive_heure TIME,
        commentaires TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE KEY unique_user_date (user_id, date)
      )
    `)
    console.log('✅ Presences table ready')
  } catch (error) {
    console.error('Error creating presences table:', error.message)
  }
}

async function initializeActionNotificationHistoryTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS action_notification_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gap_analysis_id INT NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        recipient_user_id INT NULL,
        recipient_email VARCHAR(255) NULL,
        recipient_role VARCHAR(64) NULL,
        send_status VARCHAR(32) NOT NULL,
        error_message TEXT NULL,
        triggered_by INT NULL,
        payload JSON NULL,
        sent_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_action_notification_gap (gap_analysis_id),
        INDEX idx_action_notification_created_at (created_at),
        FOREIGN KEY (gap_analysis_id) REFERENCES gap_analysis(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `)
    console.log('✅ Action notification history table ready')
  } catch (error) {
    console.error('Error creating action_notification_history table:', error.message)
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`QRQC Backend running on port ${PORT}`)
  
  // Test database connection
  await testConnection()
  
  // Initialize presences table
  await initializePresencesTable()

  // Initialize action notification history table
  await initializeActionNotificationHistoryTable()
})

