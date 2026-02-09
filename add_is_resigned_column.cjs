const { db } = require('./api/lib/database.cjs');

async function migrate() {
  try {
    console.log('Checking stakeholders table...');
    // Check if column exists
    const [columns] = await db.query('SHOW COLUMNS FROM stakeholders LIKE "is_resigned"');
    if (columns.length === 0) {
      console.log('Adding is_resigned column...');
      await db.query('ALTER TABLE stakeholders ADD COLUMN is_resigned BOOLEAN DEFAULT FALSE');
      console.log('Column added successfully.');
    } else {
      console.log('Column is_resigned already exists.');
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
