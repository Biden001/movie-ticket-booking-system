const express = require('express');
const db = require('./db'); // Import the SQLite database instance

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Enable CORS manually
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from frontend directory
app.use(express.static('../frontend'));

// Example route to get movies
app.get('/movies', (req, res) => {
  db.all('SELECT * FROM movies_info', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ movies: rows });
  });
});

// Get specific movie by ID
app.get('/movies/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM movies_info WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      res.json({ movie: row });
    } else {
      res.status(404).json({ error: 'Phim không tồn tại' });
    }
  });
});

// Ensure /login API returns correct user data
app.get('/login', (req, res) => {
  const { username, password } = req.query;
  console.log('Login attempt:', { username, password }); // Log login attempt
  if (!username || !password) {
    console.error('Missing username or password');
    return res.status(400).json({ error: 'Username and password are required' });
  }
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) {
      console.error('Database error:', err.message); // Log database error
      return res.status(500).json({ error: 'Failed to login' });
    }
    if (!user) {
      console.warn('Invalid credentials'); // Log invalid credentials
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    console.log('Login successful for user:', user.username); // Log successful login
    res.status(200).json({ message: 'Login successful', user: { id: user.id, username: user.username, is_admin: user.is_admin } });
  });
});

// Register route
app.post('/register', (req, res) => {
  console.log('Received data:', req.body); // Log received data
  const { username, password } = req.body;
  if (!username || !password) {
    console.error('Missing username or password');
    return res.status(400).json({ error: 'Username and password are required' });
  }
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
    if (err) {
      console.error('Database error:', err.message); // Log database error
      return res.status(500).json({ error: 'Failed to register user' });
    }
    console.log('User registered with ID:', this.lastID); // Log success
    res.status(201).json({ message: 'User registered successfully' });
  });
});

// Admin routes
app.get('/admin/movies', (req, res) => {
  // Simple auth check - in real app, use JWT or session
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }
  db.all('SELECT * FROM movies_info', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ movies: rows });
  });
});

app.post('/admin/movies', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }
  const { title, genre, poster_url, duration, director, actors, trailer_url, synopsis } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title là bắt buộc' });
  }
  db.run('INSERT INTO movies_info (title, genre, poster_url, duration, director, actors, trailer_url, synopsis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [title, genre, poster_url, duration, director, actors, trailer_url, synopsis], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Phim đã được thêm', movie: { id: this.lastID, title, genre, poster_url, duration, director, actors, trailer_url, synopsis } });
  });
});

app.put('/admin/movies/:id', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }
  const { id } = req.params;
  const { title, genre, poster_url, duration, director, actors, trailer_url, synopsis } = req.body;
  db.run('UPDATE movies_info SET title = ?, genre = ?, poster_url = ?, duration = ?, director = ?, actors = ?, trailer_url = ?, synopsis = ? WHERE id = ?', [title, genre, poster_url, duration, director, actors, trailer_url, synopsis, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Phim đã được cập nhật' });
  });
});

app.delete('/admin/movies/:id', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  }
  const { id } = req.params;
  db.run('DELETE FROM movies_info WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Phim đã được xóa' });
  });
});

// Get showtimes for a movie
app.get('/showtimes/:movieId', (req, res) => {
  const { movieId } = req.params;
  db.all('SELECT * FROM showtimes WHERE movie_id = ?', [movieId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ showtimes: rows });
  });
});

// Get seats for a showtime
app.get('/seats/:showtimeId', (req, res) => {
  const { showtimeId } = req.params;
  db.all('SELECT * FROM seats WHERE showtime_id = ?', [showtimeId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ seats: rows });
  });
});

// Book a seat
app.post('/book', (req, res) => {
  const { showtimeId, seatId } = req.body;
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  // Check if seat is available
  db.get('SELECT * FROM seats WHERE id = ? AND status = "available"', [seatId], (err, seat) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!seat) {
      return res.status(400).json({ error: 'Ghế không khả dụng' });
    }
    // Update seat status
    db.run('UPDATE seats SET status = "booked" WHERE id = ?', [seatId]);
    // Create booking
    const qrCode = `QR${Date.now()}${seatId}`;
    db.run('INSERT INTO bookings (user_id, showtime_id, seat_id, qr_code) VALUES (?, ?, ?, ?)', [user.id, showtimeId, seatId, qrCode], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Đặt vé thành công', booking: { id: this.lastID, qr_code: qrCode } });
    });
  });
});

// Get user bookings
app.get('/my-bookings', (req, res) => {
  const user = JSON.parse(req.headers['user'] || 'null');
  if (!user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  db.all(`
    SELECT b.*, m.title, s.show_date, s.show_time, se.seat_number, st.theater, m.poster_url
    FROM bookings b
    JOIN showtimes s ON b.showtime_id = s.id
    JOIN movies_info m ON s.movie_id = m.id
    JOIN seats se ON b.seat_id = se.id
    WHERE b.user_id = ?
  `, [user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ bookings: rows });
  });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Create admin manually
app.post('/create-admin', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username và password là bắt buộc' });
  }
  db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', [username, password, 1], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Username đã tồn tại' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Admin created', user: { id: this.lastID, username, is_admin: 1 } });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  console.log('Đang gửi yêu cầu đăng nhập với:', { username, password });
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();
    console.log('Phản hồi từ server:', result);
    if (response.ok) {
      alert(result.message);
      localStorage.setItem('user', JSON.stringify(result.user));
      window.location.href = '/';
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    alert('Lỗi kết nối');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  console.log('Đang gửi yêu cầu đăng ký với:', { username, password });
  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();
    console.log('Phản hồi từ server:', result);
    if (response.ok) {
      alert(result.message);
      localStorage.setItem('user', JSON.stringify(result.user));
      window.location.href = '/';
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Lỗi khi đăng ký:', error);
    alert('Lỗi kết nối');
  }
}