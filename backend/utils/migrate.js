const pool = require('../config/db');

async function ensureFeedbackSchema(query = (sql) => pool.query(sql)) {
  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(150) DEFAULT '',
      rating TINYINT NOT NULL DEFAULT 5,
      message VARCHAR(1000) NOT NULL,
      feedback_type ENUM('CAFE','PRODUCT','BOTH') NOT NULL DEFAULT 'CAFE',
      image VARCHAR(500) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_feedback_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
  `);

  const [columns] = await query('SHOW COLUMNS FROM feedback');
  const existingColumns = new Set(columns.map((column) => column.Field));
  const requiredColumns = [
    ['user_id', 'INT DEFAULT NULL'],
    ['email', "VARCHAR(150) DEFAULT ''"],
    ['feedback_type', "ENUM('CAFE','PRODUCT','BOTH') NOT NULL DEFAULT 'CAFE'"],
    ['image', 'VARCHAR(500) DEFAULT NULL']
  ];

  for (const [name, definition] of requiredColumns) {
    if (!existingColumns.has(name)) {
      await query(`ALTER TABLE feedback ADD COLUMN ${name} ${definition}`);
    }
  }
}

module.exports = { ensureFeedbackSchema };
