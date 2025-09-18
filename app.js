const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config();

const { configureMiddlewares } = require('./config/middlewares');

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

configureMiddlewares(app);


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