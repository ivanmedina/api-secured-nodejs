-- Create users table (simple example)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data
INSERT INTO users (name, email, age) VALUES 
('John Perez', 'john@email.com', 25),
('Mary Garcia', 'mary@email.com', 30),
('Charles Lopez', 'charles@email.com', 28)
ON CONFLICT (email) DO NOTHING;

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar ejemplos
INSERT INTO notes (user_id, content) VALUES
(1, 'John''s first note'),
(2, 'Reminder for Mary'),
(3, 'Charles wrote this'),
(1, 'Another note from Juan');