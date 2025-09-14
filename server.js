const express = require('express');
const pool = require('./database/config');
const cors = require('cors');
require('dotenv').config();

const { hashPassword, verifyPassword, generateToken } = require('./utils/auth');
const { authenticateToken,requireAdmin,requireOwnershipOrAdmin } = require('./middleware/auth');


const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares

app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));

// Routes
app.get('/',(req, res) => {
  res.json({ mensaje: 'API working correctly!' });
});

app.get('/users',authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obtaining users' });
  }
});

app.get('/users/:id', authenticateToken,requireOwnershipOrAdmin, async (req, res) => {
    try {

      const { id } = req.params;
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error obtaining user' });
    }
});

app.post('/login', async (req, res) => {

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
  

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});

module.exports = app;