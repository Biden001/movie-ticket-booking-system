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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateAuthSection();
  loadAdminMovies();
  document.getElementById('add-movie-form').addEventListener('submit', addMovie);
});