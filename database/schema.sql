CREATE TABLE movies (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    poster_url NVARCHAR(500),
    genre NVARCHAR(100),
    description NVARCHAR(MAX),
    release_date DATE,
    created_at DATETIME DEFAULT GETDATE()
);