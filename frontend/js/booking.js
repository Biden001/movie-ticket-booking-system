// Booking page
let selectedShowtimeId = null;
let selectedSeatId = null;

document.addEventListener('DOMContentLoaded', () => {
  updateAuthSection();
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get('movieId');
  if (movieId) {
    loadMovieInfo(movieId);
    loadShowtimes(movieId);
  }
});

async function loadMovieInfo(movieId) {
  try {
    const response = await fetch(`/movies/${movieId}`);
    const data = await response.json();
    const movie = data.movie;
    
    if (movie) {
      // Update movie information
      document.getElementById('movie-poster').src = movie.poster_url || '../assets/images/default.jpg';
      document.getElementById('movie-title').textContent = movie.title;
      document.getElementById('movie-genre').textContent = `Thể loại: ${movie.genre || 'Chưa cập nhật'}`;
      document.getElementById('movie-duration').textContent = `Thời lượng: ${movie.duration || 'Chưa cập nhật'} phút`;
      document.getElementById('movie-director').textContent = `Đạo diễn: ${movie.director || 'Chưa cập nhật'}`;
      document.getElementById('movie-actors').textContent = `Diễn viên: ${movie.actors || 'Chưa cập nhật'}`;
      document.getElementById('movie-synopsis').textContent = `Mô tả: ${movie.synopsis || 'Chưa có mô tả'}`;
      
      // Set trailer
      const trailerUrl = movie.trailer_url || getTrailerUrl(movie.title);
      document.getElementById('movie-trailer').src = trailerUrl;
    }
  } catch (error) {
    console.error('Error loading movie info:', error);
  }
}

function getTrailerUrl(movieTitle) {
  // Fallback trailer URLs for movies that don't have trailer_url in database
  const trailerMap = {
    'Avengers: Endgame': 'https://www.youtube.com/embed/TcMBFSGVi1c',
    'Spider-Man: No Way Home': 'https://www.youtube.com/embed/JfVOs4VSpmA',
    // Add more trailers as needed
  };
  
  return trailerMap[movieTitle] || 'https://www.youtube.com/embed/dQw4w9WgXcQ'; // Default trailer
}

async function loadShowtimes(movieId) {
  try {
    const response = await fetch(`/showtimes/${movieId}`);
    const data = await response.json();
    const showtimesDiv = document.getElementById('showtimes');
    showtimesDiv.innerHTML = '';
    data.showtimes.forEach(showtime => {
      const btn = document.createElement('button');
      btn.textContent = `${showtime.theater} - ${showtime.show_date} ${showtime.show_time} - ${showtime.price} VND`;
      btn.onclick = () => selectShowtime(showtime.id);
      showtimesDiv.appendChild(btn);
    });
  } catch (error) {
    console.error('Error loading showtimes:', error);
  }
}

function selectShowtime(showtimeId) {
  selectedShowtimeId = showtimeId;
  loadSeats(showtimeId);
  document.getElementById('seats').style.display = 'block';
}

async function loadSeats(showtimeId) {
  try {
    const response = await fetch(`/seats/${showtimeId}`);
    const data = await response.json();
    const seatGrid = document.getElementById('seat-grid');
    seatGrid.innerHTML = '';
    data.seats.forEach(seat => {
      const seatBtn = document.createElement('button');
      seatBtn.textContent = seat.seat_number;
      seatBtn.className = seat.status === 'available' ? 'seat available' : 'seat booked';
      if (seat.status === 'available') {
        seatBtn.onclick = () => selectSeat(seat.id, seatBtn);
      }
      seatGrid.appendChild(seatBtn);
    });
  } catch (error) {
    console.error('Error loading seats:', error);
  }
}

function selectSeat(seatId, btn) {
  // Deselect previous
  document.querySelectorAll('.seat.selected').forEach(s => s.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSeatId = seatId;
  document.getElementById('book-btn').style.display = 'block';
}

document.getElementById('book-btn').addEventListener('click', async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Vui lòng đăng nhập để đặt vé');
    return;
  }
  try {
    const response = await fetch('/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user': JSON.stringify(user) },
      body: JSON.stringify({ showtimeId: selectedShowtimeId, seatId: selectedSeatId })
    });
    const result = await response.json();
    if (response.ok) {
      alert(`Đặt vé thành công! Mã QR: ${result.booking.qr_code}`);
      window.location.href = '/';
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Error booking:', error);
  }
});