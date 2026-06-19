const mysql = require('mysql2')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tourism_nonthaburi',
  port: Number(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL Error:', err)
  } else {
    console.log('✅ MySQL Connected (pool)')
    connection.release()
  }
})

module.exports = pool
