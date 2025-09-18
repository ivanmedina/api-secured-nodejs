const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');

const antiSmuggling = require('../middleware/antiSmuggling');

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

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

const configureMiddlewares = (app) => {
  app.use(antiSmuggling);
  app.use(hpp());
  app.use(cors(corsOptions));
  app.use(globalLimiter); 
  app.use(helmet());
  app.use(express.json());
};

module.exports = { configureMiddlewares };