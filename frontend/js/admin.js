/**
 * ════════════════════════════════════════════════════════════════
 * ADMIN JAVASCRIPT - QUẢN LÝ PHIM, SUẤT CHIẾU, GHẾ
 * ════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// BIẾN TOÀN CỤC
// ═══════════════════════════════════════════════════════════════
/**
 * editingMovieId: Lưu ID phim đang được chỉnh sửa
 * - null: Đang ở chế độ thêm phim mới
 * - number: Đang ở chế độ sửa phim (lưu ID phim)
 */
let editingMovieId = null;

// ═══════════════════════════════════════════════════════════════
// QUẢN LÝ PHIM (MOVIES)
// ═══════════════════════════════════════════════════════════════

/**
 * ───────────────────────────────────────────────────────────────
 * Tải danh sách tất cả phim từ server
 * ───────────────────────────────────────────────────────────────
 */
async function loadAdminMovies() {
  const user = JSON.parse(localStorage.getItem('user'));
  
  // Kiểm tra quyền admin
  if (!user || !user.is_admin) {
    alert('Bạn không có quyền truy cập trang này');
    window.location.href = '/';
    return;
  }
  
  try {
    const response = await fetch('/admin/movies', {
      headers: { 'user': JSON.stringify(user) }
    });
    const data = await response.json();
    
    if (response.ok) {
      displayMovies(data.movies);
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error('Error loading movies:', error);
  }
}

/**
 * ───────────────────────────────────────────────────────────────
 * Hiển thị danh sách phim lên giao diện
 * ───────────────────────────────────────────────────────────────
 */
function displayMovies(movies) {
  const list = document.getElementById('movies-list');
  list.innerHTML = '';
  
  movies.forEach(movie => {
    const item = document.createElement('div');
    item.className = 'movie-item';
    item.innerHTML = `
      <h3>${movie.title}</h3>
      <p><strong>Thể loại:</strong> ${movie.genre || 'Chưa cập nhật'}</p>
      <p><strong>Thời lượng:</strong> ${movie.duration || 'Chưa cập nhật'} phút</p>
      <p><strong>Đạo diễn:</strong> ${movie.director || 'Chưa cập nhật'}</p>
      <p><strong>Diễn viên:</strong> ${movie.actors || 'Chưa cập nhật'}</p>
      <p><strong>Trailer:</strong> ${movie.trailer_url ? '<a href="' + movie.trailer_url + '" target="_blank">Xem trailer</a>' : 'Chưa có'}</p>
      <p><strong>Mô tả:</strong> ${movie.synopsis || 'Chưa có mô tả'}</p>
      <button class="edit-btn" data-movie='${JSON.stringify(movie)}'>Sửa</button>
      <button onclick="deleteMovie(${movie.id})">Xóa</button>
    `;
    list.appendChild(item);
  });
  
  // ─────────────────────────────────────────────────────────────
  // Gắn sự kiện click cho tất cả nút "Sửa"
  // ─────────────────────────────────────────────────────────────
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const movie = JSON.parse(this.getAttribute('data-movie'));
      editMovie(movie);
    });
  });
}

/**
 * ───────────────────────────────────────────────────────────────
 * Escape dấu nháy đơn để tránh lỗi JavaScript injection
 * (KHÔNG CÒN DÙNG - giữ lại cho tham khảo)
 * ───────────────────────────────────────────────────────────────
 */
function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * ───────────────────────────────────────────────────────────────
 * Thêm hoặc cập nhật phim (dựa vào editingMovieId)
 * ───────────────────────────────────────────────────────────────
 */
async function saveMovie(event) {
  event.preventDefault(); // Ngăn form reload trang
  
  const user = JSON.parse(localStorage.getItem('user'));
  
  // Lấy dữ liệu từ form
  const movieData = {
    title: document.getElementById('title').value,
    genre: document.getElementById('genre').value,
    poster_url: document.getElementById('poster_url').value,
    duration: document.getElementById('duration').value,
    director: document.getElementById('director').value,
    actors: document.getElementById('actors').value,
    trailer_url: document.getElementById('trailer_url').value,
    synopsis: document.getElementById('synopsis').value
  };
  
  try {
    let response;
    
    // ─────────────────────────────────────────────────────────
    // Nếu đang ở chế độ SỬA
    // ─────────────────────────────────────────────────────────
    if (editingMovieId !== null) {
      response = await fetch(`/admin/movies/${editingMovieId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'user': JSON.stringify(user) 
        },
        body: JSON.stringify(movieData)
      });
    } 
    // ─────────────────────────────────────────────────────────
    // Nếu đang ở chế độ THÊM MỚI
    // ─────────────────────────────────────────────────────────
    else {
      response = await fetch('/admin/movies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'user': JSON.stringify(user) 
        },
        body: JSON.stringify(movieData)
      });
    }
    
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      loadAdminMovies(); // Reload danh sách phim
      resetMovieForm(); // Reset form về chế độ thêm mới
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Error saving movie:', error);
  }
}

/**
 * ───────────────────────────────────────────────────────────────
 * Xóa phim
 * ───────────────────────────────────────────────────────────────
 */
async function deleteMovie(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (confirm('Bạn có chắc muốn xóa phim này?')) {
    try {
      const response = await fetch(`/admin/movies/${id}`, {
        method: 'DELETE',
        headers: { 'user': JSON.stringify(user) }
      });
      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        loadAdminMovies();
        
        // Nếu đang sửa phim bị xóa → reset form
        if (editingMovieId === id) {
          resetMovieForm();
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error deleting movie:', error);
    }
  }
}

/**
 * ───────────────────────────────────────────────────────────────
 * Chuyển sang chế độ SỬA phim
 * ───────────────────────────────────────────────────────────────
 * @param {Object} movie - Object chứa thông tin phim
 */
function editMovie(movie) {
  // Lưu ID phim đang sửa
  editingMovieId = movie.id;
  
  // Điền dữ liệu vào form - xử lý null/undefined an toàn
  document.getElementById('title').value = movie.title || '';
  document.getElementById('genre').value = movie.genre || '';
  document.getElementById('poster_url').value = movie.poster_url || '';
  document.getElementById('duration').value = movie.duration || '';
  document.getElementById('director').value = movie.director || '';
  document.getElementById('actors').value = movie.actors || '';
  document.getElementById('trailer_url').value = movie.trailer_url || '';
  document.getElementById('synopsis').value = movie.synopsis || '';
  
  // Đổi text button
  const submitBtn = document.querySelector('#add-movie-form button[type="submit"]');
  submitBtn.textContent = '✏️ Cập nhật phim';
  submitBtn.style.background = '#2196F3';
  
  // Thêm nút HỦY
  let cancelBtn = document.getElementById('cancel-edit-btn');
  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.id = 'cancel-edit-btn';
    cancelBtn.type = 'button';
    cancelBtn.textContent = '❌ Hủy';
    cancelBtn.style.cssText = 'background: #666; grid-column: span 2; margin-top: -10px;';
    cancelBtn.onclick = resetMovieForm;
    submitBtn.parentElement.appendChild(cancelBtn);
  }
  
  // Scroll lên form
  document.getElementById('add-movie-form').scrollIntoView({ behavior: 'smooth' });
}

/**
 * ───────────────────────────────────────────────────────────────
 * Reset form về chế độ THÊM MỚI
 * ───────────────────────────────────────────────────────────────
 */
function resetMovieForm() {
  // Reset ID
  editingMovieId = null;
  
  // Xóa dữ liệu form
  document.getElementById('add-movie-form').reset();
  
  // Đổi lại text button
  const submitBtn = document.querySelector('#add-movie-form button[type="submit"]');
  submitBtn.textContent = '➕ Thêm phim';
  submitBtn.style.background = ''; // Reset về CSS mặc định
  
  // Xóa nút HỦY
  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) {
    cancelBtn.remove();
  }
}

// ═══════════════════════════════════════════════════════════════
// QUẢN LÝ DROPDOWN (Danh sách phim cho form suất chiếu)
// ═══════════════════════════════════════════════════════════════

/**
 * ───────────────────────────────────────────────────────────────
 * Tải danh sách phim vào dropdown
 * ───────────────────────────────────────────────────────────────
 */
async function loadMoviesDropdown() {
  const user = JSON.parse(localStorage.getItem('user'));
  
  try {
    const response = await fetch('/admin/movies', {
      headers: { 'user': JSON.stringify(user) }
    });
    const data = await response.json();
    
    if (response.ok) {
      const select = document.getElementById('showtime-movie-id');
      select.innerHTML = '<option value="">-- Chọn phim --</option>';
      
      data.movies.forEach(movie => {
        const option = document.createElement('option');
        option.value = movie.id;
        option.textContent = movie.title;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading movies dropdown:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// QUẢN LÝ SUẤT CHIẾU (SHOWTIMES)
// ═══════════════════════════════════════════════════════════════

/**
 * ───────────────────────────────────────────────────────────────
 * Tải danh sách suất chiếu
 * ───────────────────────────────────────────────────────────────
 */
async function loadShowtimes() {
  const user = JSON.parse(localStorage.getItem('user'));
  
  try {
    const response = await fetch('/admin/showtimes', {
      headers: { 'user': JSON.stringify(user) }
    });
    const data = await response.json();
    
    if (response.ok) {
      displayShowtimes(data.showtimes);
      loadShowtimesDropdown(data.showtimes);
    }
  } catch (error) {
    console.error('Error loading showtimes:', error);
  }
}

/**
 * ───────────────────────────────────────────────────────────────
 * Hiển thị danh sách suất chiếu
 * ───────────────────────────────────────────────────────────────
 */
function displayShowtimes(showtimes) {
  const list = document.getElementById('showtimes-list');
  list.innerHTML = '';
  
  if (showtimes.length === 0) {
    list.innerHTML = '<p style="color: #666;">Chưa có suất chiếu nào.</p>';
    return;
  }
  
  showtimes.forEach(showtime => {
    const item = document.createElement('div');
    item.className = 'movie-item';
    item.innerHTML = `
      <h3>${showtime.movie_title || 'Phim ID: ' + showtime.movie_id}</h3>
      <p><strong>Rạp:</strong> ${showtime.theater}</p>
      <p><strong>Ngày:</strong> ${showtime.show_date}</p>
      <p><strong>Giờ:</strong> ${showtime.show_time}</p>
      <p><strong>Giá:</strong> ${showtime.price} VND</p>
      <button onclick="deleteShowtime(${showtime.id})">Xóa</button>
    `;
    list.appendChild(item);
  });
}

/**
 * ───────────────────────────────────────────────────────────────
 * Tải danh sách suất chiếu vào dropdown
 * ───────────────────────────────────────────────────────────────
 */
function loadShowtimesDropdown(showtimes) {
  const select1 = document.getElementById('seats-showtime-id');
  const select2 = document.getElementById('view-seats-showtime');
  
  [select1, select2].forEach(select => {
    select.innerHTML = '<option value="">-- Chọn suất chiếu --</option>';
    
    showtimes.forEach(showtime => {
      const option = document.createElement('option');
      option.value = showtime.id;
      option.textContent = `${showtime.movie_title || 'Phim ' + showtime.movie_id} - ${showtime.theater} - ${showtime.show_date} ${showtime.show_time}`;
      select.appendChild(option);
    });
  });
}

/**
 * ───────────────────────────────────────────────────────────────
 * Thêm suất chiếu mới
 * ───────────────────────────────────────────────────────────────
 */
async function addShowtime(event) {
  event.preventDefault();
  const user = JSON.parse(localStorage.getItem('user'));
  
  const movie_id = document.getElementById('showtime-movie-id').value;
  const theater = document.getElementById('theater').value;
  const show_date = document.getElementById('show-date').value;
  const show_time = document.getElementById('show-time').value;
  const price = document.getElementById('price').value;
  
  try {
    const response = await fetch('/admin/showtimes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'user': JSON.stringify(user) 
      },
      body: JSON.stringify({ movie_id, theater, show_date, show_time, price })
    });
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      loadShowtimes();
      document.getElementById('add-showtime-form').reset();
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Error adding showtime:', error);
  }
}

/**
 * ───────────────────────────────────────────────────────────────
 * Xóa suất chiếu
 * ───────────────────────────────────────────────────────────────
 */
async function deleteShowtime(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (confirm('Bạn có chắc muốn xóa suất chiếu này?')) {
    try {
      const response = await fetch(`/admin/showtimes/${id}`, {
        method: 'DELETE',
        headers: { 'user': JSON.stringify(user) }
      });
      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        loadShowtimes();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error deleting showtime:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// QUẢN LÝ GHẾ (SEATS)
// ═══════════════════════════════════════════════════════════════

/**
 * ───────────────────────────────────────────────────────────────
 * Thêm ghế cho suất chiếu
 * ───────────────────────────────────────────────────────────────
 */
async function addSeats(event) {
  event.preventDefault();
  const user = JSON.parse(localStorage.getItem('user'));
  
  const showtime_id = document.getElementById('seats-showtime-id').value;
  const seat_prefix = document.getElementById('seat-prefix').value.toUpperCase();
  const seat_count = parseInt(document.getElementById('seat-count').value);
  
  try {
    const response = await fetch('/admin/seats', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'user': JSON.stringify(user) 
      },
      body: JSON.stringify({ showtime_id, seat_prefix, seat_count })
    });
    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
      document.getElementById('add-seats-form').reset();
      loadSeats(showtime_id);
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Error adding seats:', error);
  }
}

/**
 * ───────────────────────────────────────────────────────────────
 * Tải danh sách ghế của suất chiếu
 * ───────────────────────────────────────────────────────────────
 */
async function loadSeats(showtimeId) {
  if (!showtimeId) {
    document.getElementById('seats-list').innerHTML = '';
    return;
  }
  
  try {
    const response = await fetch(`/seats/${showtimeId}`);
    const data = await response.json();
    const list = document.getElementById('seats-list');
    list.innerHTML = '';
    
    if (data.seats.length === 0) {
      list.innerHTML = '<p style="color: #666;">Chưa có ghế nào cho suất chiếu này.</p>';
      return;
    }
    
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(60px, 1fr))';
    grid.style.gap = '10px';
    grid.style.marginTop = '15px';
    
    data.seats.forEach(seat => {
      const seatDiv = document.createElement('div');
      seatDiv.className = `seat ${seat.status}`;
      seatDiv.textContent = seat.seat_number;
      seatDiv.style.padding = '10px';
      seatDiv.style.textAlign = 'center';
      seatDiv.style.border = '1px solid #ccc';
      seatDiv.style.borderRadius = '5px';
      grid.appendChild(seatDiv);
    });
    
    list.appendChild(grid);
  } catch (error) {
    console.error('Error loading seats:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// KHỞI TẠO KHI TRANG LOAD
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updateAuthSection();
  loadAdminMovies();
  loadMoviesDropdown();
  loadShowtimes();
  
  // ─────────────────────────────────────────────────────────────
  // Đăng ký sự kiện submit cho form PHIM
  // ─────────────────────────────────────────────────────────────
  document.getElementById('add-movie-form').addEventListener('submit', saveMovie);
  
  // ─────────────────────────────────────────────────────────────
  // Đăng ký sự kiện submit cho form SUẤT CHIẾU
  // ─────────────────────────────────────────────────────────────
  document.getElementById('add-showtime-form').addEventListener('submit', addShowtime);
  
  // ─────────────────────────────────────────────────────────────
  // Đăng ký sự kiện submit cho form GHẾ
  // ─────────────────────────────────────────────────────────────
  document.getElementById('add-seats-form').addEventListener('submit', addSeats);
  
  // ─────────────────────────────────────────────────────────────
  // Đăng ký sự kiện change cho dropdown xem ghế
  // ─────────────────────────────────────────────────────────────
  document.getElementById('view-seats-showtime').addEventListener('change', (e) => {
    loadSeats(e.target.value);
  });
});