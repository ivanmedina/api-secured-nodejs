const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const https = require('https');
const helmet = require('helmet');
const hpp = require('hpp');

const pool = require('./database/config');
require('dotenv').config();

const { hashPassword, verifyPassword, generateToken } = require('./utils/auth');
const { authenticateToken,requireAdmin,requireOwnershipOrAdmin } = require('./middleware/auth');
const antiSmuggling = require('./middleware/antiSmuggling');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();

// Storage

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


// CORS

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(antiSmuggling);
app.use(hpp());
app.use(cors(corsOptions));
app.use(globalLimiter); 
app.use(helmet());
app.use(express.json());


// Routes

app.get('/',(req, res) => {
  res.json({ mensaje: 'API working correctly!' });
});



app.use('/auth', authRoutes);
app.use('/users', userRoutes)

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