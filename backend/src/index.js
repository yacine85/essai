import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import pool, { testConnection } from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3002
const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral'
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 30000)

// Middleware
app.use(cors())
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

function cloneDate(date) {
  return new Date(date.getTime())
}

function startOfDay(date) {
  const result = cloneDate(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date) {
  const result = cloneDate(date)
  result.setHours(23, 59, 59, 999)
  return result
}

function addDays(date, days) {
  const result = cloneDate(date)
  result.setDate(result.getDate() + days)
  return result
}

function toSqlDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPeriodRange(periodKey) {
  const today = new Date()

  if (periodKey === 'day-1') {
    const targetDay = startOfDay(addDays(today, -1))
    return {
      key: 'day-1',
      label: 'Jour -1',
      startDate: toSqlDate(targetDay),
      endDate: toSqlDate(endOfDay(targetDay)),
      compareStartDate: toSqlDate(startOfDay(addDays(targetDay, -1))),
      compareEndDate: toSqlDate(endOfDay(addDays(targetDay, -1)))
    }
  }

  if (periodKey === 'month-1') {
    const endDate = endOfDay(today)
    const startDate = startOfDay(addDays(today, -29))
    const compareEndDate = endOfDay(addDays(startDate, -1))
    const compareStartDate = startOfDay(addDays(startDate, -30))

    return {
      key: 'month-1',
      label: 'Mois -1',
      startDate: toSqlDate(startDate),
      endDate: toSqlDate(endDate),
      compareStartDate: toSqlDate(compareStartDate),
      compareEndDate: toSqlDate(compareEndDate)
    }
  }

  const endDate = endOfDay(today)
  const startDate = startOfDay(addDays(today, -6))
  const compareEndDate = endOfDay(addDays(startDate, -1))
  const compareStartDate = startOfDay(addDays(startDate, -7))

  return {
    key: 'week-1',
    label: 'Semaine -1',
    startDate: toSqlDate(startDate),
    endDate: toSqlDate(endDate),
    compareStartDate: toSqlDate(compareStartDate),
    compareEndDate: toSqlDate(compareEndDate)
  }
}

function summarizeKpiRows(rows) {
  const byKpi = new Map()

  for (const row of rows) {
    const key = Number(row.kpi_id)
    const current = byKpi.get(key) || {
      id: row.kpi_id,
      name: row.kpi_name,
      objective: Number(row.objective || 0),
      alert_threshold: Number(row.alert_threshold || 0),
      inverse: Boolean(row.inverse),
      unit: row.unit || '%',
      sort_order: Number(row.sort_order || 0),
      values: [],
      latestDate: null,
      latestValue: null
    }

    const value = Number(row.value || 0)
    current.values.push(value)

    if (!current.latestDate || new Date(row.date).getTime() > new Date(current.latestDate).getTime()) {
      current.latestDate = row.date
      current.latestValue = value
    }

    byKpi.set(key, current)
  }

  return Array.from(byKpi.values())
    .map((item) => {
      const averageValue = item.values.length > 0
        ? item.values.reduce((sum, value) => sum + value, 0) / item.values.length
        : 0
      const objective = Number(item.objective || 0)
      const previousAverage = 0

      const achievement = objective > 0
        ? (item.inverse ? (objective / Math.max(averageValue, 0.0001)) * 100 : (averageValue / objective) * 100)
        : averageValue

      return {
        id: item.id,
        name: item.name,
        objective,
        alert_threshold: Number(item.alert_threshold || 0),
        inverse: item.inverse,
        unit: item.unit,
        sort_order: Number(item.sort_order || 0),
        average_value: Number(averageValue.toFixed(2)),
        latest_value: Number((item.latestValue ?? 0).toFixed(2)),
        values_count: item.values.length,
        achievement: Number(achievement.toFixed(2)),
        previous_average: Number(previousAverage.toFixed(2))
      }
    })
    .sort((a, b) => a.sort_order - b.sort_order || String(a.name).localeCompare(String(b.name), 'fr'))
}

// Routes

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', message: 'QRQC API is running', database: 'connected' })
  } catch (error) {
    res.json({ status: 'ok', message: 'QRQC API is running', database: 'disconnected' })
  }
})

app.post('/api/ai/actions', authenticateToken, async (req, res) => {
  const cause = String(req.body?.cause || '').trim()
  const previousAction = String(req.body?.previousAction || '').trim()

  if (!cause) {
    return res.status(400).json({ error: 'Le champ cause est obligatoire' })
  }

  try {
    const userPromptLines = [
      `Cause : ${cause}`,
      '',
      'Contraintes :',
      '- Retourne UNE seule action corrective.',
      '- Action concrète, réaliste, professionnelle, immédiatement applicable.',
      '- Formulation concise (1 a 3 phrases).'
    ]

    if (previousAction) {
      userPromptLines.push('', `Proposition precedente a eviter : ${previousAction}`)
    }

    const systemPrompt = 'Tu es expert en amelioration continue industrielle et gestion de production. En fonction de la cause fournie dans un formulaire d\'action corrective, propose UNE seule meilleure action corrective, concrete, realiste, professionnelle et immediatement applicable. A chaque regeneration, proposer une idee differente si possible.'

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS)

    let response
    try {
      response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          system: systemPrompt,
          prompt: userPromptLines.join('\n'),
          stream: false,
          options: {
            temperature: 0.8
          }
        }),
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const errPayload = await response.json().catch(() => ({}))
      return res.status(502).json({
        error: errPayload.error || 'Impossible de joindre Ollama local. Verifiez que Ollama est lance.'
      })
    }

    const completion = await response.json().catch(() => ({}))
    const action = String(completion.response || '').trim()

    if (!action) {
      return res.status(502).json({ error: 'Aucune action n\'a ete generee par le modele' })
    }

    return res.json({ action })
  } catch (error) {
    console.error('AI action generation error:', error)
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout Ollama: la generation a pris trop de temps' })
    }
    return res.status(500).json({ error: 'Erreur lors de la generation de l\'action corrective' })
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
  
  // List of allowed roles for self-registration
  const allowedRoles = [
    'admin',
    'pilote_test', 'pilote_test_sec', 'pilote_maintenance', 'pilote_maintenance_sec',
    'pilote_depannage', 'pilote_depannage_sec', 'pilote_info_trace', 'pilote_info_trace_sec',
    'pilote_qualite', 'pilote_qualite_sec', 'pilote_logistique', 'pilote_logistique_sec',
    'pilote_cms2', 'pilote_cms2_sec', 'pilote_methode', 'pilote_methode_sec',
    'pilote_process', 'pilote_process_sec', 'pilote_integration', 'pilote_integration_sec',
    'chef_atelier', 'management'
  ]
  
  if (!role || !allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Rôle obligatoire et valide requis' });
  }
  const userRole = role;
  
  console.log('Register - Role received:', role, 'Final role:', userRole);
  
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
    console.log('User created with role:', userRole); // Debug
    
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
      'SELECT * FROM lignes WHERE atelier_id = ?',
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
    const [lignes] = await pool.query('SELECT * FROM lignes')
    res.json(lignes)
  } catch (error) {
    console.error('Error fetching lignes:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create ligne
app.post('/api/lignes', authenticateToken, async (req, res) => {
  const { atelier_id, nom } = req.body
  
  try {
    const [result] = await pool.query(
      'INSERT INTO lignes (atelier_id, nom) VALUES (?, ?)',
      [atelier_id, nom]
    )

    const [rows] = await pool.query('SELECT * FROM lignes WHERE id = ?', [result.insertId])
    res.json({ success: true, id: result.insertId, ligne: rows[0] || null })
  } catch (error) {
    console.error('Error creating ligne:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update ligne
app.put('/api/lignes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { nom } = req.body
  
  try {
    await pool.query('UPDATE lignes SET nom = ? WHERE id = ?', [nom, id])
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating ligne:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete ligne
app.delete('/api/lignes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  
  try {
    await pool.query('DELETE FROM lignes WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting ligne:', error)
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
        Number(maxSortOrder || 0) + 1
      ]
    )

    const [rows] = await pool.query(
      'SELECT id, atelier_id, name, objective, alert_threshold, inverse, unit, sort_order FROM kpi_definitions WHERE id = ?',
      [result.insertId]
    )

    res.json({ success: true, kpi: rows[0] || null })
  } catch (error) {
    console.error('Error creating KPI definition:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update KPI definition
app.put('/api/kpis/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { name, objective, alert_threshold, inverse, unit } = req.body

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name est requis' })
  }

  try {
    await pool.query(
      `UPDATE kpi_definitions
       SET name = ?, objective = ?, alert_threshold = ?, inverse = ?, unit = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        String(name).trim(),
        Number(objective ?? 0),
        Number(alert_threshold ?? 0),
        Boolean(inverse),
        unit || '%',
        id
      ]
    )

    const [rows] = await pool.query(
      'SELECT id, atelier_id, name, objective, alert_threshold, inverse, unit, sort_order FROM kpi_definitions WHERE id = ?',
      [id]
    )

    res.json({ success: true, kpi: rows[0] || null })
  } catch (error) {
    console.error('Error updating KPI definition:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete KPI definition
app.delete('/api/kpis/:id', authenticateToken, async (req, res) => {
  const { id } = req.params

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

// Get KPI values
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

// Get KPI historical series with filters
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

// Get product KPI history for reports
app.get('/api/kpi-values/report', authenticateToken, async (req, res) => {
  const { ligne_id, period = 'week-1' } = req.query

  if (!ligne_id) {
    return res.status(400).json({ error: 'ligne_id is required' })
  }

  try {
    const [products] = await pool.query(
      `SELECT l.id, l.nom, l.atelier_id, a.nom AS atelier_nom
       FROM lignes l
       JOIN ateliers a ON l.atelier_id = a.id
       WHERE l.id = ?`,
      [ligne_id]
    )

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit introuvable' })
    }

    const product = products[0]
    const periodRange = getPeriodRange(period)

    const currentRows = await pool.query(
      `SELECT
         kv.date,
         kv.value,
         kv.kpi_id,
         kd.name AS kpi_name,
         kd.objective,
         kd.alert_threshold,
         kd.inverse,
         kd.unit,
         kd.sort_order
       FROM kpi_values kv
       JOIN kpi_definitions kd ON kv.kpi_id = kd.id
       WHERE kv.ligne_id = ?
         AND kv.date BETWEEN ? AND ?
       ORDER BY kd.sort_order ASC, kv.date ASC`,
      [ligne_id, periodRange.startDate, periodRange.endDate]
    )

    const comparisonRows = await pool.query(
      `SELECT
         kv.date,
         kv.value,
         kv.kpi_id,
         kd.name AS kpi_name,
         kd.objective,
         kd.alert_threshold,
         kd.inverse,
         kd.unit,
         kd.sort_order
       FROM kpi_values kv
       JOIN kpi_definitions kd ON kv.kpi_id = kd.id
       WHERE kv.ligne_id = ?
         AND kv.date BETWEEN ? AND ?
       ORDER BY kd.sort_order ASC, kv.date ASC`,
      [ligne_id, periodRange.compareStartDate, periodRange.compareEndDate]
    )

    const currentSummary = summarizeKpiRows(currentRows[0] || [])
    const previousSummary = summarizeKpiRows(comparisonRows[0] || [])
    const previousMap = new Map(previousSummary.map((item) => [Number(item.id), item]))

    const kpis = currentSummary.map((item) => {
      const previous = previousMap.get(Number(item.id))
      const previousAverage = previous ? Number(previous.average_value || 0) : 0
      const previousAchievement = previous ? Number(previous.achievement || 0) : 0
      const deltaPercent = previousAverage > 0
        ? ((item.average_value - previousAverage) / previousAverage) * 100
        : (item.average_value > 0 ? 100 : 0)

      return {
        ...item,
        previous_average: Number(previousAverage.toFixed(2)),
        previous_achievement: Number(previousAchievement.toFixed(2)),
        delta_percent: Number(deltaPercent.toFixed(2)),
        trend: deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'stable'
      }
    })

    const averageScore = (items) => {
      if (!items.length) return 0
      return items.reduce((sum, item) => sum + Number(item.achievement || 0), 0) / items.length
    }

    const currentScore = averageScore(kpis)
    const previousScore = averageScore(previousSummary)
    const scoreDelta = previousScore > 0
      ? ((currentScore - previousScore) / previousScore) * 100
      : (currentScore > 0 ? 100 : 0)

    const summaryDirection = scoreDelta >= 0 ? 'amélioration' : 'baisse'
    const summaryText = kpis.length
      ? `Le produit ${product.nom} a enregistré une ${summaryDirection} de ${Math.abs(scoreDelta).toFixed(1)}% sur la période sélectionnée.`
      : `Aucune donnée KPI disponible pour le produit ${product.nom} sur la période sélectionnée.`

    res.json({
      product: {
        id: product.id,
        nom: product.nom,
        atelier_id: product.atelier_id,
        atelier_nom: product.atelier_nom
      },
      period: periodRange,
      summary: {
        current_score: Number(currentScore.toFixed(2)),
        previous_score: Number(previousScore.toFixed(2)),
        delta_percent: Number(scoreDelta.toFixed(2)),
        text: summaryText
      },
      kpis
    })
  } catch (error) {
    console.error('Error fetching product KPI report:', error)
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
  const { date, atelier_id, ligne_id, kpi_nom, ecart, causes, actions, impact, pilot_ids, deadline, realise, statut, efficacite } = req.body
  
  try {
    const isAdmin = req.user?.role === 'admin'
    const hasEfficiency = efficacite === 0 || efficacite === 1 || efficacite === '0' || efficacite === '1'
    const requestedStatus = String(statut || 'en_attente')

    if (hasEfficiency && !isAdmin) {
      return res.status(403).json({ error: 'Seul l\'administrateur peut renseigner l\'efficacité' })
    }

    if (hasEfficiency && !['cloture', 'cloture_valide'].includes(requestedStatus)) {
      return res.status(400).json({ error: 'L\'efficacité est disponible uniquement après clôture' })
    }

    const finalEfficacite = hasEfficiency ? Number(efficacite) : null
    const finalStatut = hasEfficiency ? 'cloture_valide' : requestedStatus
    const finalRealise = ['cloture', 'cloture_valide'].includes(finalStatut) ? true : Boolean(realise || false)

    const [result] = await pool.query(
      'INSERT INTO gap_analysis (date, atelier_id, ligne_id, kpi_nom, ecart, causes, actions, impact, deadline, realise, statut, efficacite, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [date, atelier_id, ligne_id, kpi_nom || '', ecart, causes || '', actions || '', impact || 0, deadline || null, finalRealise, finalStatut, finalEfficacite, req.user.id]
    )
    
    const actionId = result.insertId
    
    // Insert pilots if provided
    if (pilot_ids && Array.isArray(pilot_ids) && pilot_ids.length > 0) {
      const pilotValues = pilot_ids.map(pilot_id => [actionId, parseInt(pilot_id)])
      await pool.query(
        'INSERT INTO gap_analysis_pilots (gap_analysis_id, pilot_id) VALUES ?',
        [pilotValues]
      )
    }
    
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
  const { kpi_nom, causes, actions, impact, pilot_ids, deadline, realise, statut, efficacite } = req.body
  
  try {
    const [existingRows] = await pool.query('SELECT id, statut, efficacite FROM gap_analysis WHERE id = ?', [id])
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Action non trouvée' })
    }

    const existing = existingRows[0]
    const isAdmin = req.user?.role === 'admin'
    const hasEfficiency = efficacite === 0 || efficacite === 1 || efficacite === '0' || efficacite === '1'
    const requestedStatus = String(statut || existing.statut || 'en_attente')

    if (hasEfficiency && !isAdmin) {
      return res.status(403).json({ error: 'Seul l\'administrateur peut modifier l\'efficacité' })
    }

    if (hasEfficiency && !['cloture', 'cloture_valide'].includes(existing.statut) && !['cloture', 'cloture_valide'].includes(requestedStatus)) {
      return res.status(400).json({ error: 'L\'efficacité est modifiable uniquement après clôture' })
    }

    const nextEfficacite = hasEfficiency ? Number(efficacite) : existing.efficacite
    const nextStatut = hasEfficiency ? 'cloture_valide' : requestedStatus
    const nextRealise = ['cloture', 'cloture_valide'].includes(nextStatut) ? true : Boolean(realise || false)

    // Update main action
    await pool.query(
      'UPDATE gap_analysis SET kpi_nom = ?, causes = ?, actions = ?, impact = ?, deadline = ?, realise = ?, statut = ?, efficacite = ? WHERE id = ?',
      [kpi_nom || '', causes || '', actions || '', impact || 0, deadline || null, nextRealise, nextStatut, nextEfficacite, id]
    )
    
    // Clear existing pilots
    await pool.query('DELETE FROM gap_analysis_pilots WHERE gap_analysis_id = ?', [id])
    
    // Add new pilots
    if (pilot_ids && Array.isArray(pilot_ids) && pilot_ids.length > 0) {
      const pilotValues = pilot_ids.map(pilot_id => [id, parseInt(pilot_id)])
      await pool.query(
        'INSERT INTO gap_analysis_pilots (gap_analysis_id, pilot_id) VALUES ?',
        [pilotValues]
      )
    }
    
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
    // Get user info with atelier_id
    const [users] = await pool.query(
      'SELECT id, role, atelier_id FROM users WHERE id = ?',
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
    
    const isAdmin = user.role === 'admin'
    const isChefAtelier = user.role === 'chef_atelier'
    const isManagement = user.role === 'management'
    
    let canValidate = false
    
    if (isAdmin || isChefAtelier || isManagement) {
      canValidate = true
    } else {
      // Reps can validate if: their atelier matches OR they are assigned pilot
      const isAssignedPilot = await pool.query(
        'SELECT 1 FROM gap_analysis_pilots WHERE gap_analysis_id = ? AND pilot_id = ?',
        [id, req.user.id]
      )
      
      const atelierMatch = action.atelier_id === user.atelier_id
      canValidate = isAssignedPilot[0].length > 0 || atelierMatch
    }
    
    if (!canValidate) {
      return res.status(403).json({ error: 'Vous n\'avez pas le droit de valider cette action' })
    }
    
    // Update status to 'en_cours'
    await pool.query(
      'UPDATE gap_analysis SET statut = ? WHERE id = ?',
      ['en_cours', id]
    )
    
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
    // Get user info with atelier_id
    const [users] = await pool.query(
      'SELECT id, role, atelier_id FROM users WHERE id = ?',
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
    
    const isAdmin = user.role === 'admin'
    const isChefAtelier = user.role === 'chef_atelier'
    const isManagement = user.role === 'management'
    
    let canReject = false
    
    if (isAdmin || isChefAtelier || isManagement) {
      canReject = true
    } else {
      // Reps can reject if: their atelier matches OR they are assigned pilot
      const isAssignedPilot = await pool.query(
        'SELECT 1 FROM gap_analysis_pilots WHERE gap_analysis_id = ? AND pilot_id = ?',
        [id, req.user.id]
      )
      
      const atelierMatch = action.atelier_id === user.atelier_id
      canReject = isAssignedPilot[0].length > 0 || atelierMatch
    }
    
    if (!canReject) {
      return res.status(403).json({ error: 'Vous n\'avez pas le droit de rejeter cette action' })
    }
    
    // Update status to 'refuse'
    await pool.query(
      'UPDATE gap_analysis SET statut = ? WHERE id = ?',
      ['refuse', id]
    )
    
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
    // Get user info with atelier_id
    const [users] = await pool.query(
      'SELECT id, role, atelier_id FROM users WHERE id = ?',
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
    
    const isAdmin = user.role === 'admin'
    const isChefAtelier = user.role === 'chef_atelier'
    const isManagement = user.role === 'management'
    const isPrimaryRep = isRepresentant(user.role)
    
    let canClose = false
    
    if (isAdmin || isChefAtelier || isManagement || isPrimaryRep) {
      // Primary reps can close if: assigned to action OR atelier match
      if (isPrimaryRep) {
        const isAssignedPilot = await pool.query(
          'SELECT 1 FROM gap_analysis_pilots WHERE gap_analysis_id = ? AND pilot_id = ?',
          [id, req.user.id]
        )
        const atelierMatch = action.atelier_id === user.atelier_id
        canClose = isAssignedPilot[0].length > 0 || atelierMatch
      } else {
        canClose = true
      }
    }
    
    if (!canClose) {
      return res.status(403).json({ error: 'Vous n\'avez pas le droit de clôturer cette action (seuls les reps principaux peuvent clôturer)' })
    }
    
    // Update status to 'cloture'
    await pool.query(
      `UPDATE gap_analysis
       SET statut = CASE
         WHEN efficacite IN (0, 1) THEN 'cloture_valide'
         ELSE 'cloture'
       END,
       realise = TRUE
       WHERE id = ?`,
      [id]
    )
    
    res.json({ success: true, message: 'Action clôturée' })
  } catch (error) {
    console.error('Error closing action:', error)
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

// Auto-create KPI dynamic tables if not exists
async function initializeDynamicKpiTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kpi_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        atelier_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        objective DECIMAL(10,2) NOT NULL DEFAULT 0,
        alert_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
        inverse BOOLEAN NOT NULL DEFAULT FALSE,
        unit VARCHAR(20) NOT NULL DEFAULT '%',
        sort_order INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_kpi_per_atelier (atelier_id, name),
        CONSTRAINT fk_kpi_def_atelier FOREIGN KEY (atelier_id) REFERENCES ateliers(id) ON DELETE CASCADE
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kpi_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        atelier_id INT NOT NULL,
        ligne_id INT NOT NULL,
        kpi_id INT NOT NULL,
        value DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_kpi_value_unique (date, atelier_id, ligne_id, kpi_id),
        INDEX idx_kpi_values_date (date),
        INDEX idx_kpi_values_atelier (atelier_id),
        INDEX idx_kpi_values_ligne (ligne_id),
        INDEX idx_kpi_values_kpi (kpi_id),
        CONSTRAINT fk_kpi_values_atelier FOREIGN KEY (atelier_id) REFERENCES ateliers(id) ON DELETE CASCADE,
        CONSTRAINT fk_kpi_values_ligne FOREIGN KEY (ligne_id) REFERENCES lignes(id) ON DELETE CASCADE,
        CONSTRAINT fk_kpi_values_kpi FOREIGN KEY (kpi_id) REFERENCES kpi_definitions(id) ON DELETE CASCADE,
        CONSTRAINT fk_kpi_values_user FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `)

    await pool.query(`
      INSERT INTO kpi_definitions (atelier_id, name, objective, alert_threshold, inverse, unit, sort_order)
      SELECT a.id, t.name, t.objective, t.alert_threshold, t.inverse, t.unit, t.sort_order
      FROM ateliers a
      JOIN (
        SELECT 'TRG' AS name, 95.00 AS objective, 90.00 AS alert_threshold, 0 AS inverse, '%' AS unit, 1 AS sort_order
        UNION ALL SELECT 'FOR', 95.00, 90.00, 0, '%', 2
        UNION ALL SELECT 'FPY', 98.00, 95.00, 0, '%', 3
        UNION ALL SELECT 'QTE', 800.00, 700.00, 0, '', 4
        UNION ALL SELECT 'DMH', 8.00, 10.00, 1, 'h', 5
      ) t
      WHERE (
        LOWER(a.nom) LIKE '%cms%'
        OR LOWER(a.nom) LIKE '%integ%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM kpi_definitions kd
        WHERE kd.atelier_id = a.id AND kd.name = t.name
      )
    `)

    console.log('✅ Dynamic KPI tables ready')
  } catch (error) {
    console.error('Error creating dynamic KPI tables:', error.message)
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`QRQC Backend running on port ${PORT}`)
  
  // Test database connection
  await testConnection()
  
  // Initialize presences table
  await initializePresencesTable()

  // Initialize dynamic KPI tables
  await initializeDynamicKpiTables()
})

