// Booking page
let selectedShowtimeId = null;
let selectedSeatId = null;
let countdownInterval = null;
let remainingSeconds = 0;

document.addEventListener('DOMContentLoaded', () => {
  updateAuthSection();
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get('movieId');
  if (movieId) {
    loadMovieInfo(movieId);
    loadShowtimes(movieId);
  }
  
  // Cảnh báo khi user rời trang
  window.addEventListener('beforeunload', (e) => {
    if (selectedSeatId) {
      releaseSeat(selectedSeatId);
    }
  });
  
  // Đăng ký event cho nút đặt vé
  const bookBtn = document.getElementById('book-btn');
  if (bookBtn) {
    bookBtn.addEventListener('click', handleBooking);
  }
});

async function loadMovieInfo(movieId) {
  try {
    const response = await fetch(`/movies/${movieId}`);
    const data = await response.json();
    const movie = data.movie;
    
    if (movie) {
      document.getElementById('movie-poster').src = movie.poster_url || '../assets/images/default.jpg';
      document.getElementById('movie-title').textContent = movie.title;
      document.getElementById('movie-genre').innerHTML = `<strong>Thể loại:</strong> ${movie.genre || 'Chưa cập nhật'}`;
      document.getElementById('movie-duration').innerHTML = `<strong>Thời lượng:</strong> ${movie.duration || 'Chưa cập nhật'} phút`;
      document.getElementById('movie-director').innerHTML = `<strong>Đạo diễn:</strong> ${movie.director || 'Chưa cập nhật'}`;
      document.getElementById('movie-actors').innerHTML = `<strong>Diễn viên:</strong> ${movie.actors || 'Chưa cập nhật'}`;
      document.getElementById('movie-synopsis').innerHTML = `<strong>Mô tả:</strong> ${movie.synopsis || 'Chưa có mô tả'}`;
      
      const trailerUrl = movie.trailer_url || '';
      if (trailerUrl) {
        document.getElementById('movie-trailer').src = trailerUrl;
      }
    }
  } catch (error) {
    console.error('Error loading movie info:', error);
  }
}

async function loadShowtimes(movieId) {
  try {
    const response = await fetch(`/showtimes/${movieId}`);
    const data = await response.json();
    const showtimesDiv = document.getElementById('showtimes');
    showtimesDiv.innerHTML = '';
    
    if (data.showtimes.length === 0) {
      showtimesDiv.innerHTML = '<p style="color: var(--text-secondary);">Chưa có suất chiếu nào cho phim này.</p>';
      return;
    }
    
    data.showtimes.forEach(showtime => {
      const btn = document.createElement('button');
      btn.innerHTML = `
        <strong>${showtime.theater}</strong><br>
        📅 ${showtime.show_date} | 🕐 ${showtime.show_time}<br>
        💰 ${Number(showtime.price).toLocaleString('vi-VN')} VND
      `;
      btn.onclick = () => selectShowtime(showtime.id);
      showtimesDiv.appendChild(btn);
    });
  } catch (error) {
    console.error('Error loading showtimes:', error);
  }
}

function selectShowtime(showtimeId) {
  // Hủy ghế cũ nếu có
  if (selectedSeatId) {
    releaseSeat(selectedSeatId);
    selectedSeatId = null;
  }
  
  selectedShowtimeId = showtimeId;
  stopCountdown();
  
  loadSeats(showtimeId);
  document.getElementById('seats').style.display = 'block';
  document.getElementById('book-btn').style.display = 'none';
  
  // Scroll đến phần chọn ghế
  document.getElementById('seats').scrollIntoView({ behavior: 'smooth' });
}

async function loadSeats(showtimeId) {
  const user = JSON.parse(localStorage.getItem('user'));
  
  try {
    const headers = {};
    if (user) {
      headers['user'] = JSON.stringify(user);
    }
    
    const response = await fetch(`/seats/${showtimeId}`, { headers });
    const data = await response.json();
    const seatGrid = document.getElementById('seat-grid');
    seatGrid.innerHTML = '';
    
    if (data.seats.length === 0) {
      seatGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Chưa có ghế nào. Admin cần tạo ghế cho suất chiếu này.</p>';
      return;
    }
    
    data.seats.forEach(seat => {
      const seatBtn = document.createElement('button');
      seatBtn.textContent = seat.seat_number;
      seatBtn.dataset.seatId = seat.id;
      
      if (seat.status === 'booked') {
        seatBtn.className = 'seat booked';
        seatBtn.title = 'Ghế đã được đặt';
      } else if (seat.status === 'held') {
        seatBtn.className = 'seat held';
        seatBtn.title = 'Ghế đang được người khác giữ';
      } else if (seat.isHeldByCurrentUser) {
        seatBtn.className = 'seat selected';
        seatBtn.title = 'Bạn đang giữ ghế này';
        selectedSeatId = seat.id;
        startCountdown(seat.remainingTime);
        document.getElementById('book-btn').style.display = 'block';
      } else {
        seatBtn.className = 'seat available';
        seatBtn.onclick = () => selectSeat(seat.id, seatBtn);
      }
      
      seatGrid.appendChild(seatBtn);
    });
  } catch (error) {
    console.error('Error loading seats:', error);
    document.getElementById('seat-grid').innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--danger);">Lỗi tải dữ liệu ghế</p>';
  }
}

async function selectSeat(seatId, btn) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Vui lòng đăng nhập để đặt vé!');
    window.location.href = '/pages/login.html';
    return;
  }
  
  if (!selectedShowtimeId) {
    alert('Vui lòng chọn suất chiếu trước!');
    return;
  }
  
  // Disable button tạm thời để tránh click nhiều lần
  btn.disabled = true;
  btn.style.opacity = '0.5';
  
  // Đảm bảo seatId là số nguyên
  const seatIdInt = parseInt(seatId, 10);
  const showtimeIdInt = parseInt(selectedShowtimeId, 10);
  
  console.log('Đang giữ ghế:', { seatId: seatIdInt, showtimeId: showtimeIdInt, user: user });
  
  try {
    // Gọi API giữ ghế
    const response = await fetch('/hold-seat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'user': JSON.stringify(user)
      },
      body: JSON.stringify({ 
        seatId: seatIdInt, 
        showtimeId: showtimeIdInt 
      })
    });
    
    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response data:', result);
    
    if (response.ok) {
      // Bỏ chọn ghế cũ
      document.querySelectorAll('.seat.selected').forEach(s => {
        s.classList.remove('selected');
        s.classList.add('available');
        s.disabled = false;
        s.style.opacity = '1';
      });
      
      // Chọn ghế mới
      btn.classList.remove('available');
      btn.classList.add('selected');
      btn.disabled = false;
      btn.style.opacity = '1';
      selectedSeatId = seatIdInt;
      
      // Bắt đầu đếm ngược
      startCountdown(result.remainingTime);
      
      document.getElementById('book-btn').style.display = 'block';
    } else {
      alert(result.error || 'Không thể giữ ghế');
      btn.disabled = false;
      btn.style.opacity = '1';
      // Refresh danh sách ghế
      loadSeats(selectedShowtimeId);
    }
  } catch (error) {
    console.error('Error holding seat:', error);
    alert('Lỗi kết nối server. Vui lòng kiểm tra server đang chạy.');
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

function startCountdown(seconds) {
  stopCountdown();
  remainingSeconds = seconds;
  
  updateCountdownDisplay();
  
  countdownInterval = setInterval(() => {
    remainingSeconds--;
    
    if (remainingSeconds <= 0) {
      stopCountdown();
      alert('⏰ Hết thời gian giữ ghế! Vui lòng chọn lại.');
      selectedSeatId = null;
      document.getElementById('book-btn').style.display = 'none';
      loadSeats(selectedShowtimeId);
      return;
    }
    
    updateCountdownDisplay();
    
    // Cảnh báo khi còn 1 phút
    if (remainingSeconds === 60) {
      showNotification('⚠️ Còn 1 phút để hoàn tất đặt vé!');
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  const timerDiv = document.getElementById('countdown-timer');
  if (timerDiv) {
    timerDiv.remove();
  }
}

function updateCountdownDisplay() {
  let timerDiv = document.getElementById('countdown-timer');
  
  if (!timerDiv) {
    timerDiv = document.createElement('div');
    timerDiv.id = 'countdown-timer';
    timerDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #e50914, #ff6b6b);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      font-size: 1.1rem;
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(229, 9, 20, 0.4);
      z-index: 1000;
    `;
    document.body.appendChild(timerDiv);
  }
  
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  
  timerDiv.innerHTML = `
    ⏱️ Thời gian giữ ghế<br>
    <span style="font-size: 1.5rem;">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</span>
  `;
  
  // Đổi màu khi còn ít thời gian
  if (remainingSeconds <= 60) {
    timerDiv.style.background = 'linear-gradient(135deg, #ff0000, #ff4444)';
  } else {
    timerDiv.style.background = 'linear-gradient(135deg, #e50914, #ff6b6b)';
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px 40px;
    border-radius: 10px;
    font-size: 1.2rem;
    z-index: 2000;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

async function releaseSeat(seatId) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !seatId) return;
  
  try {
    await fetch('/release-seat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'user': JSON.stringify(user)
      },
      body: JSON.stringify({ seatId: parseInt(seatId, 10) })
    });
  } catch (error) {
    console.error('Error releasing seat:', error);
  }
}

// Đặt vé - định nghĩa là function riêng
async function handleBooking() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Vui lòng đăng nhập để đặt vé');
    window.location.href = '/pages/login.html';
    return;
  }
  
  if (!selectedSeatId) {
    alert('Vui lòng chọn ghế');
    return;
  }
  
  if (!selectedShowtimeId) {
    alert('Vui lòng chọn suất chiếu');
    return;
  }
  
  // Disable nút để tránh click nhiều lần
  const bookBtn = document.getElementById('book-btn');
  bookBtn.disabled = true;
  bookBtn.textContent = '⏳ Đang xử lý...';
  
  try {
    const response = await fetch('/book', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'user': JSON.stringify(user) 
      },
      body: JSON.stringify({ 
        showtimeId: parseInt(selectedShowtimeId, 10), 
        seatId: parseInt(selectedSeatId, 10) 
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      stopCountdown();
      selectedSeatId = null;
      
      // Hiển thị thông báo thành công
      showSuccessModal(result.booking.qr_code);
    } else {
      alert(result.error || 'Đặt vé thất bại');
      bookBtn.disabled = false;
      bookBtn.textContent = '🎟️ XÁC NHẬN ĐẶT VÉ';
      // Refresh ghế
      loadSeats(selectedShowtimeId);
    }
  } catch (error) {
    console.error('Error booking:', error);
    alert('Lỗi khi đặt vé. Vui lòng thử lại.');
    bookBtn.disabled = false;
    bookBtn.textContent = '🎟️ XÁC NHẬN ĐẶT VÉ';
  }
}

function showSuccessModal(qrCode) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
  `;
  
  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      max-width: 400px;
      border: 2px solid #46d369;
      box-shadow: 0 0 30px rgba(70, 211, 105, 0.3);
    ">
      <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
      <h2 style="color: #46d369; font-size: 1.8rem; margin-bottom: 15px;">Đặt vé thành công!</h2>
      <p style="color: #b3b3b3; margin-bottom: 20px;">Cảm ơn bạn đã đặt vé tại Huy Cinema</p>
      <div style="
        background: #0a0a0a;
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 25px;
      ">
        <p style="color: #888; font-size: 0.9rem; margin-bottom: 5px;">Mã QR của bạn:</p>
        <p style="color: #f5c518; font-size: 1.2rem; font-weight: bold; letter-spacing: 2px;">${qrCode}</p>
      </div>
      <button onclick="window.location.href='/pages/my-bookings.html'" style="
        background: linear-gradient(135deg, #e50914, #ff6b6b);
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 25px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-right: 10px;
      ">Xem vé của tôi</button>
      <button onclick="window.location.href='/'" style="
        background: transparent;
        color: white;
        border: 2px solid #666;
        padding: 15px 30px;
        border-radius: 25px;
        font-size: 1rem;
        cursor: pointer;
      ">Về trang chủ</button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Auto refresh ghế mỗi 10 giây để cập nhật trạng thái
setInterval(() => {
  if (selectedShowtimeId && document.getElementById('seats').style.display !== 'none') {
    // Chỉ refresh nếu không đang chọn ghế
    if (!selectedSeatId) {
      loadSeats(selectedShowtimeId);
    }
  }
}, 10000);