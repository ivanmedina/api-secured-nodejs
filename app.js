const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config();

const { startHttpsServer } = require('./config/server');
const { configureMiddlewares } = require('./config/middlewares');

const { handleMulterErrors } = require('./middleware/mutlerErrors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();


configureMiddlewares(app);

app.get('/',(req, res) => {
  res.json({ mensaje: 'API working correctly!' });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes)

app.use(handleMulterErrors);

const PORT = process.env.PORT || 3000;
startHttpsServer(app, PORT);

module.exports = app;