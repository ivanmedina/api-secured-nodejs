CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);

INSERT INTO users (uuid, name, email, password, role, age) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'John Perez', 'john@email.com', '$2b$10$ymQOyfj7DX1y3n//TlBQ7e.LTahPQtTCqdAVTmPfbjHXbTh.MZX0.', 'admin', 25),
('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Mary Garcia', 'mary@email.com', '$2b$10$ymQOyfj7DX1y3n//TlBQ7e.LTahPQtTCqdAVTmPfbjHXbTh.MZX0.', 'user', 30),
('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'Charles Lopez', 'charles@email.com', '$2b$10$ymQOyfj7DX1y3n//TlBQ7e.LTahPQtTCqdAVTmPfbjHXbTh.MZX0.', 'user', 28)
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_uuid VARCHAR(36) NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_files_uuid ON files(uuid);
CREATE INDEX IF NOT EXISTS idx_files_user_uuid ON files(user_uuid);

INSERT INTO files (uuid, user_uuid, filename, filepath, description) VALUES
('a1b2c3d4-e5f6-4789-a123-456789abcdef', '550e8400-e29b-41d4-a716-446655440000', 'document.pdf', '/uploads/user_files/550e8400-e29b-41d4-a716-446655440000/', 'Important document for John'),
('b2c3d4e5-f6a7-5890-b234-567890bcdef0', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'image.jpg', '/uploads/user_files/6ba7b810-9dad-11d1-80b4-00c04fd430c8/', 'Profile picture for Mary'),
('c3d4e5f6-a7b8-6901-c345-678901cdef01', '6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'report.docx', '/uploads/user_files/6ba7b811-9dad-11d1-80b4-00c04fd430c8/', 'Monthly report from Charles'),
('d4e5f6a7-b8c9-7012-d456-789012def012', '550e8400-e29b-41d4-a716-446655440000', 'backup.zip', '/uploads/user_files/550e8400-e29b-41d4-a716-446655440000/', 'System backup file')
ON CONFLICT (uuid) DO NOTHING;