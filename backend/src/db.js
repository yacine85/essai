import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qrqc_prod',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Test connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✅ Database connected successfully!')
    connection.release()
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

// Generic query helpers
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params)
    return rows
  } catch (error) {
    console.error('Query error:', error.message)
    throw error
  }
}

export default pool

