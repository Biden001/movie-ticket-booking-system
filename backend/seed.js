const db = require('./db');

db.serialize(() => {
  const stmt = db.prepare('INSERT INTO movies_info (title, genre, poster_url, synopsis) VALUES (?, ?, ?, ?)');
  stmt.run('Avengers: Endgame', 'Hành động, Viễn tưởng', 'assets/images/posterpayof-1556374037-66.jpg', 'Phim về siêu anh hùng');
  stmt.run('Spider-Man: No Way Home', 'Hành động, Phiêu lưu', 'assets/images/spiderman.jpg', 'Peter Parker đối mặt với nhiều kẻ thù');
  stmt.finalize();
  console.log('Dữ liệu mẫu đã thêm');
});

db.close();