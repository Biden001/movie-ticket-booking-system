/**
 * ════════════════════════════════════════════════════════════════
 * DATABASE CONNECTION & INITIALIZATION
 * ════════════════════════════════════════════════════════════════
 * File này xử lý:
 * - Kết nối đến SQLite database
 * - Tạo các bảng cần thiết (movies_info, users, showtimes, seats, bookings)
 * - Insert dữ liệu mẫu ban đầu
 */

const sqlite3 = require('sqlite3').verbose();

// ═══════════════════════════════════════════════════════════════
// KẾT NỐI DATABASE
// ═══════════════════════════════════════════════════════════════
/**
 * Tạo kết nối đến file database.db
 * - Nếu file chưa tồn tại, SQLite sẽ tự động tạo mới
 * - verbose() cho phép hiển thị log chi tiết khi có lỗi
 */
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('❌ Không thể kết nối SQLite:', err);
  else console.log('✅ Kết nối thành công SQLite!');
});

// ═══════════════════════════════════════════════════════════════
// TẠO CÁC BẢNG TRONG DATABASE
// ═══════════════════════════════════════════════════════════════
/**
 * db.serialize() đảm bảo các câu lệnh SQL chạy tuần tự
 * (không chạy song song gây conflict)
 */
db.serialize(() => {
  
  // ─────────────────────────────────────────────────────────────
  // BẢNG MOVIES_INFO - Lưu thông tin phim
  // ─────────────────────────────────────────────────────────────
  /**
   * Các cột:
   * - id: Khóa chính, tự động tăng
   * - title: Tên phim (bắt buộc)
   * - genre: Thể loại (Action, Drama, etc.)
   * - poster_url: Link ảnh poster
   * - synopsis: Mô tả nội dung phim
   * - duration: Thời lượng phim (phút)
   * - director: Đạo diễn
   * - actors: Danh sách diễn viên
   * - trailer_url: Link YouTube trailer
   * - created_at: Thời gian tạo (tự động)
   */
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
  
  // ─────────────────────────────────────────────────────────────
  // BẢNG USERS - Lưu thông tin người dùng
  // ─────────────────────────────────────────────────────────────
  /**
   * Các cột:
   * - id: Khóa chính
   * - username: Tên đăng nhập (duy nhất)
   * - password: Mật khẩu (chưa mã hóa - production cần hash)
   * - email: Email người dùng
   * - phone: Số điện thoại
   * - is_admin: 0 = user thường, 1 = admin
   * - created_at: Thời gian đăng ký
   */
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // ─────────────────────────────────────────────────────────────
  // BẢNG SHOWTIMES - Lưu các suất chiếu
  // ─────────────────────────────────────────────────────────────
  /**
   * Các cột:
   * - id: Khóa chính
   * - movie_id: ID phim (liên kết với movies_info)
   * - theater: Tên rạp chiếu
   * - show_date: Ngày chiếu (YYYY-MM-DD)
   * - show_time: Giờ chiếu (HH:MM)
   * - price: Giá vé (VND)
   * - FOREIGN KEY: Liên kết với bảng movies_info
   */
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
  
  // ─────────────────────────────────────────────────────────────
  // BẢNG SEATS - Lưu thông tin ghế
  // ─────────────────────────────────────────────────────────────
  /**
   * Các cột:
   * - id: Khóa chính
   * - showtime_id: ID suất chiếu (liên kết với showtimes)
   * - seat_number: Số ghế (A1, A2, B1, etc.)
   * - status: Trạng thái ghế
   *   + 'available': Ghế trống
   *   + 'booked': Đã đặt
   *   + 'held': Đang được giữ tạm (5 phút)
   */
  db.run(`CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    showtime_id INTEGER,
    seat_number TEXT,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
  )`);
  
  // ─────────────────────────────────────────────────────────────
  // BẢNG BOOKINGS - Lưu thông tin đặt vé
  // ─────────────────────────────────────────────────────────────
  /**
   * Các cột:
   * - id: Khóa chính
   * - user_id: ID người đặt vé
   * - showtime_id: ID suất chiếu
   * - seat_id: ID ghế đã đặt
   * - status: Trạng thái đặt vé
   *   + 'pending': Đang chờ xác nhận
   *   + 'confirmed': Đã xác nhận
   *   + 'cancelled': Đã hủy
   * - qr_code: Mã QR để check-in
   * - created_at: Thời gian đặt vé
   */
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

// ═══════════════════════════════════════════════════════════════
// HÀM INSERT DỮ LIỆU MẪU
// ═══════════════════════════════════════════════════════════════
/**
 * Tạo dữ liệu mẫu để test hệ thống
 * Bao gồm: 2 phim, 1 tài khoản admin, 3 suất chiếu, 10 ghế
 */
function insertSampleData() {
  
  // ─────────────────────────────────────────────────────────────
  // THÊM PHIM 1: Avengers Endgame
  // ─────────────────────────────────────────────────────────────
  db.run('INSERT OR IGNORE INTO movies_info (title, genre, poster_url, synopsis, duration, director, actors, trailer_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [
      'Avengers: Endgame', 
      'Hành động, Viễn tưởng', 
      'assets/images/posterpayof-1556374037-66.jpg', 
      'Sau sự kiện hủy diệt của Thanos, vũ trụ bị tàn phá. Với sự giúp đỡ của các đồng minh còn lại, các Avengers tập hợp một lần cuối để đảo ngược hành động của Thanos và khôi phục lại trật tự cho vũ trụ.', 
      181, 
      'Anthony Russo, Joe Russo', 
      'Robert Downey Jr., Chris Evans, Mark Ruffalo, Chris Hemsworth, Scarlett Johansson, Jeremy Renner, Don Cheadle, Paul Rudd, Brie Larson, Karen Gillan, Danai Gurira, Benedict Wong, Jon Favreau, Bradley Cooper, Gwyneth Paltrow, Josh Brolin', 
      'https://www.youtube.com/embed/TcMBFSGVi1c'
    ], 
    (err) => {
      if (err) console.error('Error inserting movie:', err);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // THÊM PHIM 2: Spider-Man No Way Home
  // ─────────────────────────────────────────────────────────────
  db.run('INSERT OR IGNORE INTO movies_info (title, genre, poster_url, synopsis, duration, director, actors, trailer_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [
      'Spider-Man: No Way Home', 
      'Hành động, Phiêu lưu, Viễn tưởng', 
      'assets/images/spiderman.jpg', 
      'Peter Parker tìm cách đảo ngược hậu quả của việc danh tính của anh bị tiết lộ. Khi anh nhờ Doctor Strange giúp đỡ, mọi thứ trở nên phức tạp hơn khi các kẻ thù từ các vũ trụ khác xâm nhập vào thế giới của anh.', 
      148, 
      'Jon Watts', 
      'Tom Holland, Zendaya, Benedict Cumberbatch, Jacob Batalon, Jon Favreau, Jamie Foxx, Willem Dafoe, Alfred Molina, Benedict Wong, Tony Revolori, Marisa Tomei, Andrew Garfield, Tobey Maguire', 
      'https://www.youtube.com/embed/JfVOs4VSpmA'
    ], 
    (err) => {
      if (err) console.error('Error inserting movie:', err);
    }
  );

  // ─────────────────────────────────────────────────────────────
  // THÊM TÀI KHOẢN ADMIN
  // ─────────────────────────────────────────────────────────────
  /**
   * Username: admin
   * Password: admin123
   * is_admin: 1 (có quyền quản trị)
   */
  db.run('INSERT OR IGNORE INTO users (username, password, is_admin) VALUES (?, ?, ?)', 
    ['admin', 'admin123', 1], 
    (err) => {
      if (err) console.error('Error inserting admin:', err);
      else console.log('Admin user inserted');
    }
  );

  // ─────────────────────────────────────────────────────────────
  // THÊM CÁC SUẤT CHIẾU
  // ─────────────────────────────────────────────────────────────
  // Suất chiếu 1: Avengers Endgame - Rạp 1 - 14:00
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', 
    [1, 'Rap 1', '2025-10-20', '14:00', 75000]);
  
  // Suất chiếu 2: Avengers Endgame - Rạp 1 - 18:00
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', 
    [1, 'Rap 1', '2025-10-20', '18:00', 75000]);
  
  // Suất chiếu 3: Spider-Man - Rạp 2 - 16:00
  db.run('INSERT OR IGNORE INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', 
    [2, 'Rap 2', '2025-10-21', '16:00', 80000]);

  // ─────────────────────────────────────────────────────────────
  // THÊM GHẾ CHO SUẤT CHIẾU 1
  // ─────────────────────────────────────────────────────────────
  /**
   * Tạo 10 ghế từ A1 đến A10 cho suất chiếu ID = 1
   * Tất cả ghế mặc định là 'available'
   */
  for (let i = 1; i <= 10; i++) {
    db.run('INSERT OR IGNORE INTO seats (showtime_id, seat_number) VALUES (?, ?)', 
      [1, `A${i}`]);
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════
/**
 * Export db để các file khác có thể import và sử dụng
 * VD: const db = require('./db');
 */
module.exports = db;
