// Run with: npm run seed
// 1. Creates all tables (from db/schema.sql) if they don't exist yet.
// 2. Creates the default ADMIN account from your .env values (if missing).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Setting up Cafe Point database...');

  // Connect without selecting a database first, so we can CREATE DATABASE.
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await connection.query(schemaSql);
  console.log('✅ Tables created / verified.');

  await connection.changeUser({ database: process.env.DB_NAME || 'cafe_point' });

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@cafepoint.com').toLowerCase();
  const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);

  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
    await connection.query(
      `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'ADMIN')`,
      [
        process.env.ADMIN_NAME || 'Cafe Point Admin',
        adminEmail,
        passwordHash,
        process.env.ADMIN_PHONE || '8459662016'
      ]
    );
    console.log(`✅ Default admin created -> email: ${adminEmail} | password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
    console.log('   ⚠️  Please log in and change this password in production.');
  } else {
    console.log('ℹ️  Admin account already exists, skipping.');
  }

  await connection.end();
  console.log('🎉 Database setup complete! You can now run: npm start');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
