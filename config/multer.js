const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const userUuid = req.params.uuid; 
      const uploadPath = path.join(__dirname, '..', 'uploads', 'user_files', userUuid);
      
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

module.exports = { uploadUserFiles };