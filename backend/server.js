const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Thời gian giữ ghế tạm thời (5 phút = 300000ms)
const HOLD_DURATION = 5 * 60 * 1000;

// Lưu trữ ghế đang được giữ tạm thời
// Format: { seatId: { oderId, expireAt, showtimeId } }
const heldSeats = new Map();

// Dọn dẹp ghế hết hạn mỗi 30 giây
setInterval(() => {
  const now = Date.now();
  for (const [seatId, holdInfo] of heldSeats.entries()) {
    if (now > holdInfo.expireAt) {
      heldSeats.delete(seatId);
      console.log(`Ghế ${seatId} đã hết thời gian giữ, đã mở lại.`);
    }
  }
}, 30000);

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, user');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files
app.use(express.static('../frontend'));

// ===== PUBLIC ROUTES =====

// Get all movies
app.get('/movies', (req, res) => {
  db.all('SELECT * FROM movies_info', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ movies: rows });
  });
});

// Get movie by ID
app.get('/movies/:id', (req, res) => {
  db.get('SELECT * FROM movies_info WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) res.json({ movie: row });
    else res.status(404).json({ error: 'Phim không tồn tại' });
  });
});

// Get showtimes for a movie
app.get('/showtimes/:movieId', (req, res) => {
  db.all('SELECT * FROM showtimes WHERE movie_id = ?', [req.params.movieId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ showtimes: rows });
  });
});

// Get seats for a showtime
app.get('/seats/:showtimeId', (req, res) => {
  const now = Date.now();
  const userId = req.headers['user'] ? JSON.parse(req.headers['user']).id : null;
  
  db.all('SELECT * FROM seats WHERE showtime_id = ?', [req.params.showtimeId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Thêm thông tin ghế đang được giữ
    const seatsWithHoldInfo = rows.map(seat => {
      const holdInfo = heldSeats.get(seat.id);
      let status = seat.status;
      let remainingTime = 0;
      let isHeldByCurrentUser = false;
      
      if (holdInfo && now < holdInfo.expireAt) {
        // Ghế đang được giữ
        if (holdInfo.userId === userId) {
          isHeldByCurrentUser = true;
          remainingTime = Math.ceil((holdInfo.expireAt - now) / 1000);
        } else {
          status = 'held'; // Người khác đang giữ
        }
      }
      
      return {
        ...seat,
        status,
        isHeldByCurrentUser,
        remainingTime
      };
    });
    
    res.json({ seats: seatsWithHoldInfo });
  });
});

// API giữ ghế tạm thời
app.post('/hold-seat', (req, res) => {
  const { seatId, showtimeId } = req.body;
  
  // Kiểm tra dữ liệu đầu vào
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
  
  // Kiểm tra ghế có đang được người khác giữ không
  const existingHold = heldSeats.get(seatId);
  if (existingHold && now < existingHold.expireAt && existingHold.userId !== user.id) {
    return res.status(400).json({ error: 'Ghế đang được người khác giữ' });
  }
  
  // Kiểm tra ghế có available không
  db.get('SELECT * FROM seats WHERE id = ? AND status = "available"', [seatId], (err, seat) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!seat) {
      return res.status(400).json({ error: 'Ghế không khả dụng hoặc đã được đặt' });
    }
    
    // Hủy ghế cũ mà user này đang giữ (nếu có) trong cùng suất chiếu
    for (const [heldSeatId, holdInfo] of heldSeats.entries()) {
      if (holdInfo.userId === user.id && holdInfo.showtimeId == showtimeId) {
        heldSeats.delete(heldSeatId);
        console.log(`Đã hủy ghế ${heldSeatId} của user ${user.id}`);
      }
    }
    
    // Giữ ghế mới
    const expireAt = now + HOLD_DURATION;
    heldSeats.set(seatId, {
      userId: user.id,
      showtimeId: showtimeId,
      expireAt: expireAt
    });
    
    console.log(`User ${user.id} đã giữ ghế ${seatId} cho suất chiếu ${showtimeId}`);
    
    res.json({ 
      message: 'Đã giữ ghế thành công',
      remainingTime: Math.floor(HOLD_DURATION / 1000), // Thời gian còn lại (giây)
      expireAt: expireAt
    });
  });
});

// API hủy giữ ghế
app.post('/release-seat', (req, res) => {
  const { seatId } = req.body;
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  
  const holdInfo = heldSeats.get(seatId);
  if (holdInfo && holdInfo.userId === user.id) {
    heldSeats.delete(seatId);
    res.json({ message: 'Đã hủy giữ ghế' });
  } else {
    res.status(400).json({ error: 'Không thể hủy ghế này' });
  }
});

// ===== AUTH ROUTES =====

app.get('/login', (req, res) => {
  const { username, password } = req.query;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: 'Failed to login' });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    res.json({ message: 'Login successful', user: { id: user.id, username: user.username, is_admin: user.is_admin } });
  });
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to register user' });
    res.status(201).json({ message: 'User registered successfully' });
  });
});

// ===== BOOKING ROUTES =====

app.post('/book', (req, res) => {
  const { showtimeId, seatId } = req.body;
  
  // Kiểm tra dữ liệu đầu vào
  if (!showtimeId || !seatId) {
    return res.status(400).json({ error: 'Thiếu thông tin suất chiếu hoặc ghế' });
  }
  
  // Parse user từ header
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
  
  // Kiểm tra ghế có đang được user này giữ không
  const holdInfo = heldSeats.get(seatId);
  if (!holdInfo || holdInfo.userId !== user.id || now > holdInfo.expireAt) {
    return res.status(400).json({ error: 'Ghế không được giữ hoặc đã hết thời gian. Vui lòng chọn lại.' });
  }
  
  db.get('SELECT * FROM seats WHERE id = ? AND status = "available"', [seatId], (err, seat) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!seat) {
      return res.status(400).json({ error: 'Ghế không khả dụng hoặc đã được đặt' });
    }
    
    // Cập nhật trạng thái ghế
    db.run('UPDATE seats SET status = "booked" WHERE id = ?', [seatId], function(updateErr) {
      if (updateErr) {
        console.error('Error updating seat:', updateErr);
        return res.status(500).json({ error: 'Lỗi cập nhật ghế' });
      }
      
      // Xóa khỏi danh sách ghế đang giữ
      heldSeats.delete(seatId);
      
      const qrCode = `QR${Date.now()}${seatId}`;
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
            id: this.lastID, 
            qr_code: qrCode 
          } 
        });
      });
    });
  });
});

app.get('/my-bookings', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  
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

// ===== ADMIN ROUTES =====

// Admin movies
app.get('/admin/movies', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  db.all('SELECT * FROM movies_info', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ movies: rows });
  });
});

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

app.delete('/admin/movies/:id', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  db.run('DELETE FROM movies_info WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Phim đã được xóa' });
  });
});

// Admin showtimes
app.get('/admin/showtimes', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  db.all(`SELECT s.*, m.title as movie_title FROM showtimes s LEFT JOIN movies_info m ON s.movie_id = m.id ORDER BY s.show_date DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ showtimes: rows });
  });
});

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

app.delete('/admin/showtimes/:id', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  db.run('DELETE FROM showtimes WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Suất chiếu đã được xóa' });
  });
});

// Admin seats
app.post('/admin/seats', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Không có quyền truy cập' });
  
  const { showtime_id, seat_prefix, seat_count } = req.body;
  if (!showtime_id || !seat_prefix || !seat_count) {
    return res.status(400).json({ error: 'Tất cả các trường là bắt buộc' });
  }
  
  const stmt = db.prepare('INSERT INTO seats (showtime_id, seat_number, status) VALUES (?, ?, ?)');
  for (let i = 1; i <= seat_count; i++) {
    stmt.run([showtime_id, `${seat_prefix}${i}`, 'available']);
  }
  stmt.finalize();
  res.json({ message: `Đã tạo ${seat_count} ghế cho suất chiếu` });
});

// Start server - Cho phép truy cập từ mọi thiết bị trong mạng LAN
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎬 HUY CINEMA Server đang chạy!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Local:   http://localhost:${PORT}`);
  
  // Hiển thị IP để người khác trong mạng LAN truy cập
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