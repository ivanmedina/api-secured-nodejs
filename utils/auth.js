const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '24h',
      "issuer": process.env.JWT_ISSUER
     }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET,{
    issuer: process.env.JWT_ISSUER
  });
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};