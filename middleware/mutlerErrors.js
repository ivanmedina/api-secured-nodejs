const multer = require('multer');

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

  module.exports = { handleMulterErrors };