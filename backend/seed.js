const db = require('./db');

db.serialize(() => {
  // Insert movies with full information
  db.run('INSERT OR IGNORE INTO movies_info (title, genre, poster_url, synopsis, duration, director, actors, trailer_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    ['Avengers: Endgame', 'Hành động, Viễn tưởng', 'assets/images/posterpayof-1556374037-66.jpg', 'Sau sự kiện hủy diệt của Thanos, vũ trụ bị tàn phá. Với sự giúp đỡ của các đồng minh còn lại, các Avengers tập hợp một lần cuối để đảo ngược hành động của Thanos và khôi phục lại trật tự cho vũ trụ.', 181, 'Anthony Russo, Joe Russo', 'Robert Downey Jr., Chris Evans, Mark Ruffalo, Chris Hemsworth, Scarlett Johansson, Jeremy Renner, Don Cheadle, Paul Rudd, Brie Larson, Karen Gillan, Danai Gurira, Benedict Wong, Jon Favreau, Bradley Cooper, Gwyneth Paltrow, Josh Brolin', 'https://www.youtube.com/embed/TcMBFSGVi1c']);

  db.run('INSERT OR IGNORE INTO movies_info (title, genre, poster_url, synopsis, duration, director, actors, trailer_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    ['Spider-Man: No Way Home', 'Hành động, Phiêu lưu, Viễn tưởng', 'assets/images/spiderman.jpg', 'Peter Parker tìm cách đảo ngược hậu quả của việc danh tính của anh bị tiết lộ. Khi anh nhờ Doctor Strange giúp đỡ, mọi thứ trở nên phức tạp hơn khi các kẻ thù từ các vũ trụ khác xâm nhập vào thế giới của anh.', 148, 'Jon Watts', 'Tom Holland, Zendaya, Benedict Cumberbatch, Jacob Batalon, Jon Favreau, Jamie Foxx, Willem Dafoe, Alfred Molina, Benedict Wong, Tony Revolori, Marisa Tomei, Andrew Garfield, Tobey Maguire', 'https://www.youtube.com/embed/JfVOs4VSpmA']);
  
  // Insert admin user
  db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', ['admin', 'admin123', 1], function(err) {
    if (err) console.error('Error inserting admin:', err);
    else console.log('Admin user created');
  });
  
  // Insert showtimes
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', [1, 'Rap 1', '2025-10-20', '14:00', 75000]);
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', [1, 'Rap 1', '2025-10-20', '18:00', 75000]);
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', [2, 'Rap 2', '2025-10-21', '16:00', 80000]);
  
  // Insert seats for showtime 1 (assume 10 seats)
  for (let i = 1; i <= 10; i++) {
    db.run('INSERT OR IGNORE INTO seats (showtime_id, seat_number) VALUES (?, ?)', [1, `A${i}`]);
  }
  
  console.log('Dữ liệu mẫu đã thêm');
});

db.close();