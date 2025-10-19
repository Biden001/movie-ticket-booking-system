const express = require('express');
const db = require('./db'); // Import the SQLite database instance

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

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

// Example route for login (placeholder)
app.post('/login', (req, res) => {
  // Add your login logic here
  res.json({ message: 'Login endpoint' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});