const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const pool = require('./database/config');
require('dotenv').config();

const { hashPassword, verifyPassword, generateToken } = require('./utils/auth');
const { authenticateToken,requireAdmin,requireOwnershipOrAdmin } = require('./middleware/auth');


const app = express();
const PORT = process.env.PORT || 3000;

// Storage

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const userUuid = req.params.uuid; 
      const uploadPath = path.join(__dirname, 'uploads', 'user_files', userUuid);
      
      if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}_${file.originalname}`;
      cb(null, uniqueName);
  }
});

const uploadUserFiles = multer({ 
  storage: storage,
  limits: {
      fileSize: 10 * 1024 * 1024
  }
});

const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
              error: 'File too large', 
              message: 'File size exceeds the 10MB limit',
              maxSize: '10MB'
          });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected file field' });
      }
  }
  next(err);
};

// Middlewares

// Rate limit

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
  message: { 
    error: 'Too many requests from this IP, please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter); 

app.use(express.json());

// CORS

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

app.get('/users/:uuid', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
    try {

      const { uuid } = req.params;
      const result = await pool.query('SELECT * FROM users WHERE uuid = $1', [uuid]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error obtaining user' });
    }
});

app.get('/users/:uuid/files', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {

      const { uuid } = req.params;
      const result = await pool.query('SELECT * FROM files WHERE user_uuid = $1', [uuid]);
      
      res.json(result.rows);

  } catch (err) {

      console.error(err);
      res.status(500).json({ error: 'Error obtaining files' });
  }
});

app.post('/users/:uuid/files', authenticateToken, requireOwnershipOrAdmin, uploadUserFiles.single('file'), async (req, res) => {
  try {
      const { uuid } = req.params;
      const { description } = req.body;
      
      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileUuid = uuidv4();
      const absolutePath = req.file.path;
      const relativePath = path.relative(path.join(__dirname), absolutePath);
      const filename = req.file.filename;

      const result = await pool.query(
          'INSERT INTO files (uuid, user_uuid, filename, filepath, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [fileUuid, uuid, filename, relativePath, description || null]
      );

      res.status(201).json(result.rows[0]);

  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error uploading file' });
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

app.use(handleMulterErrors);

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});

module.exports = app;