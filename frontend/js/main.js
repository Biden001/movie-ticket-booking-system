// Fetch and display movies on the homepage
async function loadMovies() {
  try {
    const response = await fetch('http://localhost:3000/movies');
    const data = await response.json();
    const movieList = document.querySelector('.movie-row');
    movieList.innerHTML = ''; // Clear existing static content
    data.movies.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'movie-card';
      card.innerHTML = `
        <img src="${movie.poster_url || 'assets/images/default.jpg'}" alt="Poster phim">
        <h3>${movie.title}</h3>
        <p>Thể loại: ${movie.genre}</p>
        <button>Đặt vé</button>
      `;
      movieList.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading movies:', error);
  }
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();
    alert(result.message); // Placeholder: handle success/error properly
  } catch (error) {
    console.error('Error logging in:', error);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    loadMovies();
  }
  const loginForm = document.querySelector('form[action="/login"]');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});