const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

/**
 * Protect middleware - Verifies JWT and attaches user to request
 *
 * User lookup order: Student first, then Faculty
 * Sets: req.user (document), req.userRole (string: 'student' | 'teacher')
 *
 * Fails closed: 401 if token invalid or user not found
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach role from token (for authorizeRole middleware)
      req.userRole = decoded.role;

      // Try to find user: Student first, then Faculty
      let user = await Student.findById(decoded.id).select('-password');

      if (!user) {
        user = await Faculty.findById(decoded.id).select('-password');
      }

      // Fail closed: If user not found in either collection, reject
      if (!user) {
        return res.status(401).json({ message: 'User not found. Account may have been deleted.' });
      }

      // Verify user is registered (can login)
      if (!user.is_registered) {
        return res.status(401).json({ message: 'Account not registered. Please complete registration.' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Role authorization middleware
 * @param {string[]} allowedRoles - Array of roles that can access this route
 *
 * Roles: 'student' | 'teacher'
 * Note: Faculty.role virtual returns 'teacher' (not 'faculty')
 */
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    // req.userRole is set by the protect middleware from the JWT
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { protect, authorizeRole };
