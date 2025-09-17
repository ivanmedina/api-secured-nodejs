
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const pool = require('../database/config');
const { authenticateToken, requireAdmin, requireOwnershipOrAdmin } = require('../middleware/auth');
const { uploadUserFiles } = require('../config/multer');

const router = express.Router();


router.get('/',authenticateToken, requireAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users ORDER BY id');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error obtaining users' });
    }
  });
  
  router.get('/:uuid', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
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
  
  router.get('/:uuid/files', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
    try {
  
        const { uuid } = req.params;
        const result = await pool.query('SELECT * FROM files WHERE user_uuid = $1', [uuid]);
        
        res.json(result.rows);
  
    } catch (err) {
  
        console.error(err);
        res.status(500).json({ error: 'Error obtaining files' });
    }
  });
  
  router.post('/:uuid/files', authenticateToken, requireOwnershipOrAdmin, uploadUserFiles.single('file'), async (req, res) => {
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
  
  // GET /:uuid/files/:fileUuid/download
  router.get('/:uuid/files/:fileUuid/download', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
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

module.exports = router;
