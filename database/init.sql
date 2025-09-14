CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

INSERT INTO users (name, email, password, role, age) VALUES 
('John Perez', 'john@email.com', '$2b$10$ymQOyfj7DX1y3n//TlBQ7e.LTahPQtTCqdAVTmPfbjHXbTh.MZX0.', 'admin', 25),
('Mary Garcia', 'mary@email.com', '$2b$10$ymQOyfj7DX1y3n//TlBQ7e.LTahPQtTCqdAVTmPfbjHXbTh.MZX0.', 'user', 30),
('Charles Lopez', 'charles@email.com', '$2b$10$ymQOyfj7DX1y3n//TlBQ7e.LTahPQtTCqdAVTmPfbjHXbTh.MZX0.', 'user', 28)
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notes (user_id, content) VALUES
(1, 'John''s first note'),
(2, 'Reminder for Mary'),
(3, 'Charles wrote this'),
(1, 'Another note from John')
ON CONFLICT DO NOTHING;