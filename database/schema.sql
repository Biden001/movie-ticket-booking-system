CREATE TABLE movies_info (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    genre NVARCHAR(100),
    poster_url NVARCHAR(500),
    synopsis NVARCHAR(1000), -- giới thiệu ngắn
    created_at DATETIME DEFAULT GETDATE()
);