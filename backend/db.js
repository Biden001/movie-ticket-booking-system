const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('❌ Không thể kết nối SQLite:', err);
  else console.log('✅ Kết nối thành công SQLite!');
});

db.serialize(() => {
  db.run('DROP TABLE IF EXISTS movies_info');
  db.run(`CREATE TABLE movies_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT,
    poster_url TEXT,
    synopsis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;
