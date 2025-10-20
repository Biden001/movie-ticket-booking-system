// Admin functions
async function loadAdminMovies() {
  const user = JSON.parse(localStorage.getItem('user'));
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
      <button onclick="editMovie(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${(movie.genre || '').replace(/'/g, "\\'")}', '${(movie.poster_url || '').replace(/'/g, "\\'")}', ${movie.duration || 'null'}, '${(movie.director || '').replace(/'/g, "\\'")}', '${(movie.actors || '').replace(/'/g, "\\'")}', '${(movie.trailer_url || '').replace(/'/g, "\\'")}', '${(movie.synopsis || '').replace(/'/g, "\\'")}')">Sửa</button>
      <button onclick="deleteMovie(${movie.id})">Xóa</button>
    `;
    list.appendChild(item);
  });
}

async function addMovie(event) {
  event.preventDefault();
  const user = JSON.parse(localStorage.getItem('user'));
  const title = document.getElementById('title').value;
  const genre = document.getElementById('genre').value;
  const poster_url = document.getElementById('poster_url').value;
  const duration = document.getElementById('duration').value;
  const director = document.getElementById('director').value;
  const actors = document.getElementById('actors').value;
  const trailer_url = document.getElementById('trailer_url').value;
  const synopsis = document.getElementById('synopsis').value;
  try {
    const response = await fetch('/admin/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user': JSON.stringify(user) },
      body: JSON.stringify({ title, genre, poster_url, duration, director, actors, trailer_url, synopsis })
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      loadAdminMovies();
      document.getElementById('add-movie-form').reset();
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Error adding movie:', error);
  }
}

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
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error deleting movie:', error);
    }
  }
}

function editMovie(id, title, genre, poster_url, duration, director, actors, trailer_url, synopsis) {
  document.getElementById('title').value = title;
  document.getElementById('genre').value = genre;
  document.getElementById('poster_url').value = poster_url;
  document.getElementById('duration').value = duration || '';
  document.getElementById('director').value = director || '';
  document.getElementById('actors').value = actors || '';
  document.getElementById('trailer_url').value = trailer_url || '';
  document.getElementById('synopsis').value = synopsis;
  // Change button to update
  const btn = document.querySelector('#add-movie-form button');
  btn.textContent = 'Cập nhật';
  btn.onclick = () => updateMovie(id);
}

async function updateMovie(id) {
  const user = JSON.parse(localStorage.getItem('user'));
  const title = document.getElementById('title').value;
  const genre = document.getElementById('genre').value;
  const poster_url = document.getElementById('poster_url').value;
  const duration = document.getElementById('duration').value;
  const director = document.getElementById('director').value;
  const actors = document.getElementById('actors').value;
  const trailer_url = document.getElementById('trailer_url').value;
  const synopsis = document.getElementById('synopsis').value;
  try {
    const response = await fetch(`/admin/movies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'user': JSON.stringify(user) },
      body: JSON.stringify({ title, genre, poster_url, duration, director, actors, trailer_url, synopsis })
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      loadAdminMovies();
      // Reset form
      document.getElementById('add-movie-form').reset();
      const btn = document.querySelector('#add-movie-form button');
      btn.textContent = 'Thêm phim';
      btn.onclick = addMovie;
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Error updating movie:', error);
  }
}

// Load movies into dropdown
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

// Load showtimes
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

// Add showtime
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
      headers: { 'Content-Type': 'application/json', 'user': JSON.stringify(user) },
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

// Delete showtime
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

// Add seats
async function addSeats(event) {
  event.preventDefault();
  const user = JSON.parse(localStorage.getItem('user'));
  const showtime_id = document.getElementById('seats-showtime-id').value;
  const seat_prefix = document.getElementById('seat-prefix').value.toUpperCase();
  const seat_count = parseInt(document.getElementById('seat-count').value);
  
  try {
    const response = await fetch('/admin/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user': JSON.stringify(user) },
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

// Load seats
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

// Initialize - update the existing DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  updateAuthSection();
  loadAdminMovies();
  loadMoviesDropdown();
  loadShowtimes();
  
  document.getElementById('add-movie-form').addEventListener('submit', addMovie);
  document.getElementById('add-showtime-form').addEventListener('submit', addShowtime);
  document.getElementById('add-seats-form').addEventListener('submit', addSeats);
  document.getElementById('view-seats-showtime').addEventListener('change', (e) => {
    loadSeats(e.target.value);
  });
});