/**
 * ════════════════════════════════════════════════════════════════
 * MOVIE TICKET BOOKING SYSTEM - BACKEND SERVER
 * ════════════════════════════════════════════════════════════════
 * File server chính xử lý:
 * - Tất cả các API endpoints (movies, showtimes, seats, bookings)
 * - Xác thực người dùng (login, register)
 * - Quản lý ghế giữ tạm thời (hold seats)
 * - Admin functions (CRUD movies, showtimes, seats)
 */

const express = require('express');
const db = require('./db'); // Import database connection

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════
// CẤU HÌNH HỆ THỐNG GIỮ GHẾ TẠM THỜI
// ═══════════════════════════════════════════════════════════════
/**
 * HOLD_DURATION: Thời gian giữ ghế (5 phút = 300,000 milliseconds)
 * Sau 5 phút, nếu user không đặt vé, ghế sẽ tự động được mở lại
 */
const HOLD_DURATION = 5 * 60 * 1000;

/**
 * heldSeats: Map lưu trữ ghế đang được giữ tạm
 * Key: seatId (ID của ghế)
 * Value: { userId, showtimeId, expireAt }
 * 
 * VD: heldSeats.set(5, { userId: 3, showtimeId: 1, expireAt: 1735478400000 })
 */
const heldSeats = new Map();

// ─────────────────────────────────────────────────────────────
// AUTO CLEANUP: Dọn dẹp ghế hết hạn mỗi 30 giây
// ─────────────────────────────────────────────────────────────
/**
 * setInterval chạy mỗi 30 giây để:
 * 1. Duyệt qua tất cả ghế đang được giữ
 * 2. Kiểm tra xem đã hết thời gian chưa
 * 3. Nếu hết hạn → xóa khỏi Map → ghế tự động available
 */
setInterval(() => {
  const now = Date.now(); // Lấy timestamp hiện tại
  
  for (const [seatId, holdInfo] of heldSeats.entries()) {
    // Nếu thời gian hiện tại > thời gian hết hạn
    if (now > holdInfo.expireAt) {
      heldSeats.delete(seatId); // Xóa ghế khỏi danh sách giữ
      console.log(`Ghế ${seatId} đã hết thời gian giữ, đã mở lại.`);
    }
  }
}, 30000); // 30 giây = 30,000ms

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE CẤU HÌNH
// ═══════════════════════════════════════════════════════════════

/**
 * express.json(): Cho phép server đọc JSON từ request body
 * VD: req.body = { username: "admin", password: "123" }
 */
app.use(express.json());

/**
 * CORS Configuration: Cho phép frontend gọi API từ domain khác
 * - Access-Control-Allow-Origin: Cho phép tất cả domain (*)
 * - Access-Control-Allow-Methods: Cho phép GET, POST, PUT, DELETE
 * - Access-Control-Allow-Headers: Cho phép gửi Content-Type và user header
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, user');
  
  // Xử lý preflight request (trình duyệt gửi OPTIONS trước khi gửi request thật)
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next(); // Tiếp tục xử lý request
  }
});

/**
 * Serve Static Files: Phục vụ các file HTML, CSS, JS, images
 * Khi user truy cập /, server sẽ tìm file trong thư mục ../frontend
 */
app.use(express.static('../frontend'));

// ═══════════════════════════════════════════════════════════════
// PUBLIC API ENDPOINTS - Không cần đăng nhập
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// GET /movies - Lấy danh sách tất cả phim
// ─────────────────────────────────────────────────────────────
/**
 * Response: { movies: [ {id: 1, title: "Avengers", ...}, ... ] }
 */
app.get('/movies', (req, res) => {
  // Query database: SELECT * FROM movies_info
  db.all('SELECT * FROM movies_info', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ movies: rows }); // Trả về danh sách phim
  });
});

// ─────────────────────────────────────────────────────────────
// GET /movies/:id - Lấy chi tiết 1 phim theo ID
// ─────────────────────────────────────────────────────────────
/**
 * Params: id (VD: /movies/1)
 * Response: { movie: {id: 1, title: "Avengers", ...} }
 */
app.get('/movies/:id', (req, res) => {
  const movieId = req.params.id; // Lấy ID từ URL
  
  db.get('SELECT * FROM movies_info WHERE id = ?', [movieId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) res.json({ movie: row });
    else res.status(404).json({ error: 'Phim không tồn tại' });
  });
});

// ─────────────────────────────────────────────────────────────
// GET /showtimes/:movieId - Lấy tất cả suất chiếu của 1 phim
// ─────────────────────────────────────────────────────────────
/**
 * Params: movieId
 * Response: { showtimes: [{id: 1, theater: "Rap 1", ...}, ...] }
 */
app.get('/showtimes/:movieId', (req, res) => {
  const movieId = req.params.movieId;
  
  db.all('SELECT * FROM showtimes WHERE movie_id = ?', [movieId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ showtimes: rows });
  });
});

// ─────────────────────────────────────────────────────────────
// GET /seats/:showtimeId - Lấy danh sách ghế của 1 suất chiếu
// ─────────────────────────────────────────────────────────────
/**
 * Params: showtimeId
 * Headers: user (optional) - để check ghế nào đang được user giữ
 * Response: { seats: [{id, seat_number, status, isHeldByCurrentUser, remainingTime}, ...] }
 */
app.get('/seats/:showtimeId', (req, res) => {
  const now = Date.now(); // Timestamp hiện tại
  
  // Parse user từ header (nếu có)
  const userId = req.headers['user'] ? JSON.parse(req.headers['user']).id : null;
  
  // Lấy tất cả ghế của suất chiếu này
  db.all('SELECT * FROM seats WHERE showtime_id = ?', [req.params.showtimeId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // ───────────────────────────────────────────────────────
    // Xử lý trạng thái ghế (kiểm tra ghế nào đang được giữ)
    // ───────────────────────────────────────────────────────
    const seatsWithHoldInfo = rows.map(seat => {
      const holdInfo = heldSeats.get(seat.id); // Kiểm tra ghế có đang được giữ không
      let status = seat.status; // Mặc định lấy status từ database
      let remainingTime = 0;
      let isHeldByCurrentUser = false;
      
      // Nếu ghế đang được giữ và chưa hết hạn
      if (holdInfo && now < holdInfo.expireAt) {
        if (holdInfo.userId === userId) {
          // Ghế đang được chính user này giữ
          isHeldByCurrentUser = true;
          remainingTime = Math.ceil((holdInfo.expireAt - now) / 1000); // Còn bao nhiêu giây
        } else {
          // Ghế đang được người khác giữ
          status = 'held';
        }
      }
      
      return {
        ...seat, // Giữ nguyên các field cũ
        status, // Cập nhật status
        isHeldByCurrentUser,
        remainingTime
      };
    });
    
    res.json({ seats: seatsWithHoldInfo });
  });
});

// ═══════════════════════════════════════════════════════════════
// SEAT HOLD API - Giữ ghế tạm thời
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// POST /hold-seat - Giữ ghế tạm thời trong 5 phút
// ─────────────────────────────────────────────────────────────
/**
 * Body: { seatId: 5, showtimeId: 1 }
 * Headers: user (bắt buộc)
 * Response: { message, remainingTime, expireAt }
 */
app.post('/hold-seat', (req, res) => {
  const { seatId, showtimeId } = req.body;
  
  // ───────────────────────────────────────────────────────
  // 1. VALIDATE INPUT
  // ───────────────────────────────────────────────────────
  if (!seatId || !showtimeId) {
    return res.status(400).json({ error: 'Thiếu thông tin ghế hoặc suất chiếu' });
  }
  
  // Parse user từ header
  let user;
  try {
    user = JSON.parse(req.headers['user'] || 'null');
  } catch (e) {
    return res.status(400).json({ error: 'Thông tin user không hợp lệ' });
  }
  
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để giữ ghế' });
  }
  
  const now = Date.now();
  
  // ───────────────────────────────────────────────────────
  // 2. KIỂM TRA GHẾ CÓ ĐANG ĐƯỢC NGƯỜI KHÁC GIỮ KHÔNG
  // ───────────────────────────────────────────────────────
  const existingHold = heldSeats.get(seatId);
  if (existingHold && now < existingHold.expireAt && existingHold.userId !== user.id) {
    return res.status(400).json({ error: 'Ghế đang được người khác giữ' });
  }
  
  // ───────────────────────────────────────────────────────
  // 3. KIỂM TRA GHẾ CÓ AVAILABLE TRONG DATABASE KHÔNG
  // ───────────────────────────────────────────────────────
  db.get('SELECT * FROM seats WHERE id = ? AND status = "available"', [seatId], (err, seat) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!seat) {
      return res.status(400).json({ error: 'Ghế không khả dụng hoặc đã được đặt' });
    }
    
    // ─────────────────────────────────────────────────────
    // 4. HỦY GHẾ CŨ MÀ USER NÀY ĐANG GIỮ (NẾU CÓ)
    // ─────────────────────────────────────────────────────
    /**
     * User chỉ được giữ 1 ghế/suất chiếu
     * Nếu click ghế mới → hủy ghế cũ
     */
    for (const [heldSeatId, holdInfo] of heldSeats.entries()) {
      if (holdInfo.userId === user.id && holdInfo.showtimeId == showtimeId) {
        heldSeats.delete(heldSeatId);
        console.log(`Đã hủy ghế ${heldSeatId} của user ${user.id}`);
      }
    }
    
    // ─────────────────────────────────────────────────────
    // 5. GIỮ GHẾ MỚI
    // ─────────────────────────────────────────────────────
    const expireAt = now + HOLD_DURATION; // Thời điểm hết hạn
    heldSeats.set(seatId, {
      userId: user.id,
      showtimeId: showtimeId,
      expireAt: expireAt
    });
    
    console.log(`User ${user.id} đã giữ ghế ${seatId} cho suất chiếu ${showtimeId}`);
    
    res.json({ 
      message: 'Đã giữ ghế thành công',
      remainingTime: Math.floor(HOLD_DURATION / 1000), // Trả về số giây
      expireAt: expireAt
    });
  });
});

// ─────────────────────────────────────────────────────────────
// POST /release-seat - Hủy giữ ghế (khi user click ghế khác)
// ─────────────────────────────────────────────────────────────
/**
 * Body: { seatId }
 * Headers: user
 */
app.post('/release-seat', (req, res) => {
  const { seatId } = req.body;
  const user = JSON.parse(req.headers['user'] || 'null');
  
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  
  const holdInfo = heldSeats.get(seatId);
  
  // Chỉ cho phép user hủy ghế của chính mình
  if (holdInfo && holdInfo.userId === user.id) {
    heldSeats.delete(seatId);
    res.json({ message: 'Đã hủy giữ ghế' });
  } else {
    res.status(400).json({ error: 'Không thể hủy ghế này' });
  }
});

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION API - Đăng nhập & Đăng ký
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// GET /login - Đăng nhập
// ─────────────────────────────────────────────────────────────
/**
 * Query params: ?username=admin&password=admin123
 * Response: { message, user: {id, username, is_admin} }
 */
app.get('/login', (req, res) => {
  const { username, password } = req.query;
  
  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Tìm user trong database
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: 'Failed to login' });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    
    // Đăng nhập thành công
    res.json({ 
      message: 'Login successful', 
      user: { 
        id: user.id, 
        username: user.username, 
        is_admin: user.is_admin 
      } 
    });
  });
});

// ─────────────────────────────────────────────────────────────
// POST /register - Đăng ký tài khoản mới
// ─────────────────────────────────────────────────────────────
/**
 * Body: { username, password }
 * Response: { message }
 */
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Insert user mới vào database
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to register user' });
    res.status(201).json({ message: 'User registered successfully' });
  });
});

// ═══════════════════════════════════════════════════════════════
// BOOKING API - Đặt vé & Xem vé đã đặt
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// POST /book - Đặt vé (confirm booking)
// ─────────────────────────────────────────────────────────────
/**
 * Body: { showtimeId, seatId }
 * Headers: user
 * Response: { message, booking: {id, qr_code} }
 */
app.post('/book', (req, res) => {
  const { showtimeId, seatId } = req.body;
  
  // ───────────────────────────────────────────────────────
  // 1. VALIDATE INPUT
  // ───────────────────────────────────────────────────────
  if (!showtimeId || !seatId) {
    return res.status(400).json({ error: 'Thiếu thông tin suất chiếu hoặc ghế' });
  }
  
  let user;
  try {
    user = JSON.parse(req.headers['user'] || 'null');
  } catch (e) {
    return res.status(400).json({ error: 'Thông tin user không hợp lệ' });
  }
  
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để đặt vé' });
  }
  
  const now = Date.now();
  
  // ───────────────────────────────────────────────────────
  // 2. KIỂM TRA GHẾ CÓ ĐANG ĐƯỢC USER NÀY GIỮ KHÔNG
  // ───────────────────────────────────────────────────────
  const holdInfo = heldSeats.get(seatId);
  if (!holdInfo || holdInfo.userId !== user.id || now > holdInfo.expireAt) {
    return res.status(400).json({ error: 'Ghế không được giữ hoặc đã hết thời gian. Vui lòng chọn lại.' });
  }
  
  // ───────────────────────────────────────────────────────
  // 3. KIỂM TRA GHẾ VẪN CÒN AVAILABLE
  // ───────────────────────────────────────────────────────
  db.get('SELECT * FROM seats WHERE id = ? AND status = "available"', [seatId], (err, seat) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!seat) {
      return res.status(400).json({ error: 'Ghế không khả dụng hoặc đã được đặt' });
    }
    
    // ─────────────────────────────────────────────────────
    // 4. CẬP NHẬT TRẠNG THÁI GHẾ THÀNH "BOOKED"
    // ─────────────────────────────────────────────────────
    db.run('UPDATE seats SET status = "booked" WHERE id = ?', [seatId], function(updateErr) {
      if (updateErr) {
        console.error('Error updating seat:', updateErr);
        return res.status(500).json({ error: 'Lỗi cập nhật ghế' });
      }
      
      // ───────────────────────────────────────────────────
      // 5. XÓA GHẾ KHỎI DANH SÁCH ĐANG GIỮ
      // ───────────────────────────────────────────────────
      heldSeats.delete(seatId);
      
      // ───────────────────────────────────────────────────
      // 6. TẠO MÃ QR CODE
      // ───────────────────────────────────────────────────
      const qrCode = `QR${Date.now()}${seatId}`;
      
      // ───────────────────────────────────────────────────
      // 7. INSERT BOOKING VÀO DATABASE
      // ───────────────────────────────────────────────────
      db.run('INSERT INTO bookings (user_id, showtime_id, seat_id, qr_code, status) VALUES (?, ?, ?, ?, ?)', 
        [user.id, showtimeId, seatId, qrCode, 'confirmed'], function(insertErr) {
        if (insertErr) {
          console.error('Error inserting booking:', insertErr);
          return res.status(500).json({ error: 'Lỗi tạo đơn đặt vé' });
        }
        
        console.log(`User ${user.id} đã đặt vé thành công: ghế ${seatId}, mã QR: ${qrCode}`);
        
        res.json({ 
          message: 'Đặt vé thành công', 
          booking: { 
            id: this.lastID, // ID của booking vừa tạo
            qr_code: qrCode 
          } 
        });
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────
// GET /my-bookings - Lấy tất cả vé đã đặt của user
// ─────────────────────────────────────────────────────────────
/**
 * Headers: user
 * Response: { bookings: [{id, title, theater, show_date, ...}, ...] }
 */
app.get('/my-bookings', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  
  /**
   * JOIN 4 bảng để lấy đầy đủ thông tin:
   * - bookings: thông tin đặt vé
   * - showtimes: suất chiếu
   * - movies_info: tên phim, poster
   * - seats: số ghế
   */
  db.all(`
    SELECT b.*, m.title, m.poster_url, s.show_date, s.show_time, s.theater, se.seat_number
    FROM bookings b
    JOIN showtimes s ON b.showtime_id = s.id
    JOIN movies_info m ON s.movie_id = m.id
    JOIN seats se ON b.seat_id = se.id
    WHERE b.user_id = ?
  `, [user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ bookings: rows });
  });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN API - Quản lý phim, suất chiếu, ghế
// ═══════════════════════════════════════════════════════════════

/**
 * Middleware kiểm tra quyền admin
 * Tất cả các route dưới đây đều cần is_admin = 1
 */

// ─────────────────────────────────────────────────────────────
// GET /admin/movies - Lấy tất cả phim (admin)
// ─────────────────────────────────────────────────────────────
app.get('/admin/movies', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  db.all('SELECT * FROM movies_info', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ movies: rows });
  });
});

// ─────────────────────────────────────────────────────────────
// POST /admin/movies - Thêm phim mới
// ─────────────────────────────────────────────────────────────
app.post('/admin/movies', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  const { title, genre, poster_url, duration, director, actors, trailer_url, synopsis } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title là bắt buộc' });
  
  db.run('INSERT INTO movies_info (title, genre, poster_url, duration, director, actors, trailer_url, synopsis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [title, genre, poster_url, duration, director, actors, trailer_url, synopsis], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Phim đã được thêm', movie: { id: this.lastID } });
  });
});

// ─────────────────────────────────────────────────────────────
// PUT /admin/movies/:id - Cập nhật phim
// ─────────────────────────────────────────────────────────────
app.put('/admin/movies/:id', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  const { title, genre, poster_url, duration, director, actors, trailer_url, synopsis } = req.body;
  
  db.run('UPDATE movies_info SET title=?, genre=?, poster_url=?, duration=?, director=?, actors=?, trailer_url=?, synopsis=? WHERE id=?', 
    [title, genre, poster_url, duration, director, actors, trailer_url, synopsis, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Phim đã được cập nhật' });
  });
});

// ─────────────────────────────────────────────────────────────
// DELETE /admin/movies/:id - Xóa phim
// ─────────────────────────────────────────────────────────────
app.delete('/admin/movies/:id', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  db.run('DELETE FROM movies_info WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Phim đã được xóa' });
  });
});

// ─────────────────────────────────────────────────────────────
// GET /admin/showtimes - Lấy tất cả suất chiếu
// ─────────────────────────────────────────────────────────────
app.get('/admin/showtimes', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  db.all(`SELECT s.*, m.title as movie_title FROM showtimes s LEFT JOIN movies_info m ON s.movie_id = m.id ORDER BY s.show_date DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ showtimes: rows });
  });
});

// ─────────────────────────────────────────────────────────────
// POST /admin/showtimes - Thêm suất chiếu mới
// ─────────────────────────────────────────────────────────────
app.post('/admin/showtimes', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  const { movie_id, theater, show_date, show_time, price } = req.body;
  
  if (!movie_id || !theater || !show_date || !show_time || !price) {
    return res.status(400).json({ error: 'Tất cả các trường là bắt buộc' });
  }
  
  db.run('INSERT INTO showtimes (movie_id, theater, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)', 
    [movie_id, theater, show_date, show_time, price], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Suất chiếu đã được thêm', showtime: { id: this.lastID } });
  });
});

// ─────────────────────────────────────────────────────────────
// DELETE /admin/showtimes/:id - Xóa suất chiếu
// ─────────────────────────────────────────────────────────────
app.delete('/admin/showtimes/:id', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  db.run('DELETE FROM showtimes WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Suất chiếu đã được xóa' });
  });
});

// ─────────────────────────────────────────────────────────────
// POST /admin/seats - Tạo ghế cho suất chiếu
// ─────────────────────────────────────────────────────────────
/**
 * Body: { showtime_id, seat_prefix, seat_count }
 * VD: { showtime_id: 1, seat_prefix: "A", seat_count: 10 }
 * → Tạo A1, A2, A3, ..., A10
 */
app.post('/admin/seats', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  const { showtime_id, seat_prefix, seat_count } = req.body;
  
  if (!showtime_id || !seat_prefix || !seat_count) {
    return res.status(400).json({ error: 'Tất cả các trường là bắt buộc' });
  }
  
  // Prepare statement để insert nhiều ghế cùng lúc
  const stmt = db.prepare('INSERT INTO seats (showtime_id, seat_number, status) VALUES (?, ?, ?)');
  
  for (let i = 1; i <= seat_count; i++) {
    stmt.run([showtime_id, `${seat_prefix}${i}`, 'available']);
  }
  
  stmt.finalize(); // Kết thúc prepared statement
  res.json({ message: `Đã tạo ${seat_count} ghế cho suất chiếu` });
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
/**
 * Listen trên PORT 3000 và cho phép truy cập từ mọi IP (0.0.0.0)
 * Hiển thị IP LAN để các thiết bị khác trong mạng có thể truy cập
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎬 HUY CINEMA Server đang chạy!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Local:   http://localhost:${PORT}`);
  
  // Lấy IP address của máy tính
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`🌐 Network: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});