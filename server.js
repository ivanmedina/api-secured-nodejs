const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const https = require('https');

const pool = require('./database/config');
require('dotenv').config();

const { hashPassword, verifyPassword, generateToken } = require('./utils/auth');
const { authenticateToken,requireAdmin,requireOwnershipOrAdmin } = require('./middleware/auth');


const app = express();

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

// GET /users/:uuid/files/:fileUuid/download
app.get('/users/:uuid/files/:fileUuid/download', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
      const { uuid, fileUuid } = req.params;
      
      const result = await pool.query(
          'SELECT * FROM files WHERE uuid = $1 AND user_uuid = $2',
          [fileUuid, uuid]
      );
      
      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'File not found' });
      }
      
      const fileRecord = result.rows[0];
      const filePath = path.join(__dirname, fileRecord.filepath);
      
      if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found on disk' });
      }
      
      const stats = fs.statSync(filePath);
      const originalName = fileRecord.filename.split('_').slice(1).join('_');
      
      res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);
      
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
          console.error('Error reading file:', error);
          if (!res.headersSent) {
              res.status(500).json({ error: 'Error reading file' });
          }
      });
      
      fileStream.pipe(res);
      
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error downloading file' });
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

app.post('/register', async (req, res) => {
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

    const { v4: uuidv4 } = require('uuid');
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

app.use(handleMulterErrors);

const privateKey = fs.readFileSync(path.join(__dirname, 'certificates', 'private-key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'certificates', 'certificate.pem'), 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate
};

const httpsServer = https.createServer(credentials, app);

const PORT = process.env.PORT || 3000;

httpsServer.listen(PORT, () => {
  console.log(`Server running on: https://localhost:${PORT}/`);
});

module.exports = app;