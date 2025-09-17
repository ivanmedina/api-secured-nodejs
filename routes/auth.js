const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/config');
const { hashPassword, verifyPassword, generateToken } = require('../utils/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    
    const user = result.rows[0];
    
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    
    const token = generateToken(user);
    
    delete user.password;
    
    res.json({
      message: 'Login successful',
      user: user,
      token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error during login" });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age } = req.body;
    const role = 'user';

    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email and password are required' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Email already registered' 
      });
    }

    const uuid = uuidv4();
    const hashedPassword = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (uuid, name, email, password, role, age) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, uuid, name, email, role, age, created_at`,
      [uuid, name, email, hashedPassword, role, age]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
      token
    });

  } catch (err) {
    console.error(err);
    
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      return res.status(409).json({ 
        error: 'Email already registered' 
      });
    }

    res.status(500).json({ error: "Error during registration" });
  }
});

module.exports = router;