const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      res.status(401);
      throw new Error('User no longer exists');
    }

    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const allowed = [...roles, 'admin'];

    if (!userRole || !allowed.includes(userRole)) {
      res.status(403);
      return next(new Error(`Requires one of roles: ${roles.join(', ')}`));
    }

    next();
  };
}

module.exports = { protect, requireRole };
