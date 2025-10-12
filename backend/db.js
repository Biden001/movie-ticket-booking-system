const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('❌ Không thể kết nối SQLite:', err);
  else console.log('✅ Kết nối thành công SQLite!');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS movies_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    genre TEXT,
    year INTEGER
  )`);
});

module.exports = db;
