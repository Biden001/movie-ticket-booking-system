// Fetch and display movies on the homepage
async function loadMovies() {
  try {
    const response = await fetch('/movies');
    const data = await response.json();
    const movieList = document.querySelector('.movie-row');
    movieList.innerHTML = '';
    data.movies.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'movie-card';
      card.setAttribute('data-tooltip', 'Click để đặt vé');
      card.onclick = () => viewShowtimes(movie.id);
      card.innerHTML = `
        <img src="${movie.poster_url || 'assets/images/default.jpg'}" alt="Poster phim">
        <h3>${movie.title}</h3>
        <p>Thể loại: ${movie.genre}</p>
      `;
      movieList.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading movies:', error);
  }
}

// View showtimes for a movie
function viewShowtimes(movieId) {
  window.location.href = `/pages/booking.html?movieId=${movieId}`;
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  console.log('Sending login data to server:', { username, password }); // Log data being sent
  try {
    const response = await fetch(`/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
    const result = await response.json();
    console.log('Server response:', result); // Log server response
    if (response.ok) {
      localStorage.setItem('user', JSON.stringify(result.user));
      alert('Đăng nhập thành công!');
      if (result.user.is_admin) {
        window.location.href = '/pages/admin.html'; // Redirect admin to admin.html
      } else {
        window.location.href = '/'; // Redirect regular users to homepage
      }
    } else {
      alert(`Đăng nhập thất bại: ${result.error}`);
    }
  } catch (error) {
    console.error('Error during login:', error); // Log error
    alert('Đã xảy ra lỗi khi đăng nhập.');
  }
}

// Handle register form submission
async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;
  console.log('Sending data to server:', { username, password }); // Log data being sent
  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();
    console.log('Server response:', result); // Log server response
    if (response.ok) {
      alert('Đăng ký thành công!');
      window.location.href = '/pages/login.html';
    } else {
      alert(`Đăng ký thất bại: ${result.error}`);
    }
  } catch (error) {
    console.error('Error during registration:', error); // Log error
    alert('Đã xảy ra lỗi khi đăng ký.');
  }
}

// Define logout function to handle user logout
function logout() {
  console.log('Logging out user'); // Log logout action
  localStorage.removeItem('user'); // Remove user data from localStorage
  alert('Bạn đã đăng xuất thành công!'); // Notify user
  updateAuthSection(); // Update auth section to show login button
  window.location.href = '/'; // Redirect to homepage
}

// Fix auth-section logic to ensure proper functionality
function updateAuthSection() {
  const authSection = document.getElementById('auth-section');
  if (!authSection) {
    console.warn('auth-section element not found'); // Log warning if element is missing
    return;
  }
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    authSection.innerHTML = `
      <div class="user-menu">
        <img src="/assets/images/user-icon.png" alt="User Icon" class="user-icon">
        <span>${user.username}</span>
        <div class="dropdown">
          <ul>
            <li><a href="#" onclick="logout()">Đăng xuất</a></li>
            <li><a href="/pages/account.html">Thông tin tài khoản</a></li>
          </ul>
        </div>
      </div>
    `;
  } else {
    authSection.innerHTML = `<a href='/pages/login.html'>Đăng nhập</a>`; // Ensure login button appears
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Update auth section on all pages
  updateAuthSection();
  
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    loadMovies();
  }
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});

// Fix ReferenceError: app is not defined
// Ensure app is defined properly
const app = {}; // Define app if needed

app.post('/register', (req, res) => {
  console.log('Dữ liệu nhận được:', req.body); // Log dữ liệu nhận được
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username và password là bắt buộc' });
  }
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
    if (err) {
      console.error('Lỗi khi thêm user:', err); // Log lỗi
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Username đã tồn tại' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Đăng ký thành công', user: { id: this.lastID, username, is_admin: 0 } });
  });
});