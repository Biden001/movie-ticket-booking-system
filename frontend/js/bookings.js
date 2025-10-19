// My bookings page
document.addEventListener('DOMContentLoaded', () => {
  updateAuthSection();
  loadMyBookings();
});

async function loadMyBookings() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Vui lòng đăng nhập');
    window.location.href = '/pages/login.html';
    return;
  }
  try {
    const response = await fetch('/my-bookings', {
      headers: { 'user': JSON.stringify(user) }
    });
    const data = await response.json();
    const list = document.getElementById('bookings-list');
    list.innerHTML = '';
    
    if (data.bookings.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Bạn chưa đặt vé nào. <a href="/">Đặt vé ngay!</a></p>';
      return;
    }
    
    data.bookings.forEach(booking => {
      const item = document.createElement('div');
      item.className = 'booking-item';
      item.innerHTML = `
        <div class="booking-content">
          <img src="${booking.poster_url || '../assets/images/default.jpg'}" alt="Poster ${booking.title}" class="booking-poster">
          <div class="booking-details">
            <h3>${booking.title}</h3>
            <p><strong>Rạp:</strong> ${booking.theater}</p>
            <p><strong>Ngày:</strong> ${booking.show_date}</p>
            <p><strong>Giờ:</strong> ${booking.show_time}</p>
            <p><strong>Ghế:</strong> ${booking.seat_number}</p>
            <p><strong>Trạng thái:</strong> ${booking.status}</p>
            <p><strong>Mã QR:</strong> ${booking.qr_code}</p>
          </div>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading bookings:', error);
  }
}