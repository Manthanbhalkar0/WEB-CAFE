// Run with: npm run seed
// 1. Creates all tables (from schema.sql) if they don't exist yet.
// 2. Creates or syncs the default ADMIN account from your .env values.

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

  const adminName = process.env.ADMIN_NAME || 'Cafe Point Admin';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@cafepoint.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Cp#Admin9xK7mQ!';
  const adminPhone = process.env.ADMIN_PHONE || '8459662016';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);

  if (existing.length === 0) {
    await connection.query(
      `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'ADMIN')`,
      [adminName, adminEmail, passwordHash, adminPhone]
    );
    console.log(`✅ Default admin created -> email: ${adminEmail}`);
  } else {
    await connection.query(
      `UPDATE users SET name = ?, password_hash = ?, phone = ?, role = 'ADMIN' WHERE email = ?`,
      [adminName, passwordHash, adminPhone, adminEmail]
    );
    console.log(`✅ Default admin synced from .env -> email: ${adminEmail}`);
  }
  console.log('   Use the ADMIN_PASSWORD from your .env to log in.');
  console.log('   ⚠️  Change ADMIN_PASSWORD + JWT_SECRET before any public deployment.');

  await connection.end();
  console.log('🎉 Database setup complete! You can now run: npm start');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
