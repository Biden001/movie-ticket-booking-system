const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('❌ Không thể kết nối SQLite:', err);
  else console.log('✅ Kết nối thành công SQLite!');
});

db.serialize(() => {
  // db.run('DROP TABLE IF EXISTS movies_info');
  db.run(`CREATE TABLE IF NOT EXISTS movies_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT,
    poster_url TEXT,
    synopsis TEXT,
    duration INTEGER,
    director TEXT,
    actors TEXT,
    trailer_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // db.run('DROP TABLE IF EXISTS users');
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // db.run('DROP TABLE IF EXISTS showtimes');
  db.run(`CREATE TABLE IF NOT EXISTS showtimes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER,
    theater TEXT,
    show_date DATE,
    show_time TIME,
    price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES movies_info(id)
  )`);
  // db.run('DROP TABLE IF EXISTS seats');
  db.run(`CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    showtime_id INTEGER,
    seat_number TEXT,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
  )`);
  // db.run('DROP TABLE IF EXISTS bookings');
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    showtime_id INTEGER,
    seat_id INTEGER,
    status TEXT DEFAULT 'pending',
    qr_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id),
    FOREIGN KEY (seat_id) REFERENCES seats(id)
  )`);
});

function insertSampleData() {
  // Insert movies with full information
  db.run('INSERT OR IGNORE INTO movies_info (title, genre, poster_url, synopsis, duration, director, actors, trailer_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    ['Avengers: Endgame', 'Hành động, Viễn tưởng', 'assets/images/posterpayof-1556374037-66.jpg', 'Sau sự kiện hủy diệt của Thanos, vũ trụ bị tàn phá. Với sự giúp đỡ của các đồng minh còn lại, các Avengers tập hợp một lần cuối để đảo ngược hành động của Thanos và khôi phục lại trật tự cho vũ trụ.', 181, 'Anthony Russo, Joe Russo', 'Robert Downey Jr., Chris Evans, Mark Ruffalo, Chris Hemsworth, Scarlett Johansson, Jeremy Renner, Don Cheadle, Paul Rudd, Brie Larson, Karen Gillan, Danai Gurira, Benedict Wong, Jon Favreau, Bradley Cooper, Gwyneth Paltrow, Josh Brolin', 'https://www.youtube.com/embed/TcMBFSGVi1c'], (err) => {
    if (err) console.error('Error inserting movie:', err);
  });

  db.run('INSERT OR IGNORE INTO movies_info (title, genre, poster_url, synopsis, duration, director, actors, trailer_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    ['Spider-Man: No Way Home', 'Hành động, Phiêu lưu, Viễn tưởng', 'assets/images/spiderman.jpg', 'Peter Parker tìm cách đảo ngược hậu quả của việc danh tính của anh bị tiết lộ. Khi anh nhờ Doctor Strange giúp đỡ, mọi thứ trở nên phức tạp hơn khi các kẻ thù từ các vũ trụ khác xâm nhập vào thế giới của anh.', 148, 'Jon Watts', 'Tom Holland, Zendaya, Benedict Cumberbatch, Jacob Batalon, Jon Favreau, Jamie Foxx, Willem Dafoe, Alfred Molina, Benedict Wong, Tony Revolori, Marisa Tomei, Andrew Garfield, Tobey Maguire', 'https://www.youtube.com/embed/JfVOs4VSpmA'], (err) => {
    if (err) console.error('Error inserting movie:', err);
  });

  // Insert admin user
  db.run('INSERT OR IGNORE INTO users (username, password, is_admin) VALUES (?, ?, ?)', ['admin', 'admin123', 1], (err) => {
    if (err) console.error('Error inserting admin:', err);
    else console.log('Admin user inserted');
  });

  // Insert showtimes
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', [1, 'Rap 1', '2025-10-20', '14:00', 75000]);
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', [1, 'Rap 1', '2025-10-20', '18:00', 75000]);
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', [2, 'Rap 2', '2025-10-21', '16:00', 80000]);

  // Insert seats for showtime 1
  for (let i = 1; i <= 10; i++) {
    db.run('INSERT OR IGNORE INTO seats (showtime_id, seat_number) VALUES (?, ?)', [1, `A${i}`]);
  }
}

// Insert sample data after tables are created
// setTimeout(() => {
//   insertSampleData();
// }, 1000);

module.exports = db;
