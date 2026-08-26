const mysql = require('mysql2/promise');
require('dotenv').config();

// Connection pool: reuses connections instead of opening a fresh one per request (NFR 4.5)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cafe_point',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

pool.getConnection()
  .then((conn) => {
    console.log('✅ MySQL connected successfully');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in your .env file.');
  });

module.exports = pool;
