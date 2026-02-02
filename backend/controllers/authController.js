const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const AuditLog = require('../models/AuditLog');

/**
 * Generate JWT token
 * @param {ObjectId} id - User ID
 * @param {string} email - User email
 * @param {string} role - User role ('student' | 'teacher')
 * @returns {string} JWT token
 */
const generateToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 *
 * Flow:
 * 1. Validate input (email, password, role)
 * 2. Check email domain (@rvce.edu.in)
 * 3. Find Student/Faculty with is_registered=false
 * 4. Set password and is_registered=true
 * 5. Audit-log success/failure
 * 6. Return JWT + user info
 */
exports.registerUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // --- INPUT VALIDATION ---
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Please provide email, password, and role.' });
    }

    // Validate role (only 'student' or 'teacher' from API)
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Allowed: 'student', 'teacher'." });
    }

    // Enforce email domain
    if (!email.endsWith('@rvce.edu.in')) {
      return res.status(400).json({ message: 'Only @rvce.edu.in emails are allowed.' });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    // ------------------------

    let user = null;
    let actorType = null;

    if (role === 'student') {
      // Find whitelist record (is_registered = false)
      user = await Student.findOne({ email, is_registered: false });
      actorType = 'student';

      if (!user) {
        // Check if already registered or not in whitelist
        const existingUser = await Student.findOne({ email });
        if (existingUser) {
          await AuditLog.log({
            action: 'REGISTER_FAILED',
            actor_type: 'anonymous',
            metadata: { email, reason: 'already_registered' }
          });
          return res.status(400).json({ message: 'User already registered.' });
        }

        await AuditLog.log({
          action: 'REGISTER_FAILED',
          actor_type: 'anonymous',
          metadata: { email, reason: 'not_in_whitelist', role }
        });
        return res.status(400).json({ message: 'Student email not found in official records.' });
      }

    } else if (role === 'teacher') {
      // Find whitelist record (is_registered = false)
      user = await Faculty.findOne({ email, is_registered: false });
      actorType = 'faculty';

      if (!user) {
        // Check if already registered or not in whitelist
        const existingUser = await Faculty.findOne({ email });
        if (existingUser) {
          await AuditLog.log({
            action: 'REGISTER_FAILED',
            actor_type: 'anonymous',
            metadata: { email, reason: 'already_registered' }
          });
          return res.status(400).json({ message: 'User already registered.' });
        }

        await AuditLog.log({
          action: 'REGISTER_FAILED',
          actor_type: 'anonymous',
          metadata: { email, reason: 'not_in_whitelist', role }
        });
        return res.status(400).json({ message: 'Faculty email not found in official records.' });
      }
    }

    // Set password and mark as registered
    user.password = password;
    user.is_registered = true;
    await user.save();

    // Audit log success
    await AuditLog.log({
      action: 'REGISTER',
      actor_type: actorType,
      actor_id: user._id,
      metadata: { email }
    });

    // Response matches API contract: { token, user: { id, email, role } }
    res.status(201).json({
      token: generateToken(user._id, user.email, user.role),
      user: {
        id: user._id,
        email: user.email,
        role: user.role // Virtual returns 'student' or 'teacher'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 *
 * Flow:
 * 1. Validate email (and password if real auth enabled)
 * 2. Check email domain
 * 3. Find Student or Faculty by email with is_registered=true
 * 4. Verify password (when real auth enabled)
 * 5. Audit-log success/failure
 * 6. Return JWT + user info
 *
 * Note: Password check is currently disabled (mock auth) for development.
 * To enable: Add password to destructuring and uncomment password check.
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- INPUT VALIDATION ---
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address.' });
    }

    // Enforce email domain
    if (!email.endsWith('@rvce.edu.in')) {
      return res.status(400).json({ message: 'Invalid email domain.' });
    }
    // ------------------------

    let user = null;
    let actorType = null;

    // Try Student first
    user = await Student.findOne({ email, is_registered: true }).select('+password');
    actorType = 'student';

    // If not found, try Faculty
    if (!user) {
      user = await Faculty.findOne({ email, is_registered: true }).select('+password');
      actorType = 'faculty';
    }

    // User not found (fail with generic message to prevent email enumeration)
    if (!user) {
      await AuditLog.logLogin('anonymous', null, false, {
        ip: req.ip,
        email,
        reason: 'user_not_found'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Password verification (currently mock auth - uncomment for real auth)
    // UNCOMMENT FOR PRODUCTION:
    // if (!password) {
    //   return res.status(400).json({ message: 'Please provide a password.' });
    // }
    // const isMatch = await user.matchPassword(password);
    // if (!isMatch) {
    //   await AuditLog.logLogin(actorType, user._id, false, {
    //     ip: req.ip,
    //     email,
    //     reason: 'wrong_password'
    //   });
    //   return res.status(401).json({ message: 'Invalid credentials' });
    // }

    // Audit log success
    await AuditLog.logLogin(actorType, user._id, true, {
      ip: req.ip,
      email
    });

    // Response matches API contract: { token, user: { id, email, role } }
    res.json({
      token: generateToken(user._id, user.email, user.role),
      user: {
        id: user._id,
        email: user.email,
        role: user.role // Virtual returns 'student' or 'teacher'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};
