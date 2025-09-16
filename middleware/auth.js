const { verifyToken } = require('../utils/auth');

const authenticateToken = (req, res, next) => {

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
    
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }

};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator role required.' });
  }
  next();
};

const requireOwnershipOrAdmin = (req, res, next) => {
  const requestedUserId = req.params.uuid;
  const currentUserId = req.user.uuid;
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin && currentUserId !== requestedUserId) {
    return res.status(403).json({ error: 'You cannot access other users\' data.' });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnershipOrAdmin
};
