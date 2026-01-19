const User = require('../models/User');
const MasterStudent = require('../models/MasterStudent');
const MasterFaculty = require('../models/MasterFaculty');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  try {
    const { email, password, role } = req.body; // Role: 'student' or 'faculty'

    // 1. Check if User account already exists
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    let userData = { email, password, role };

    // 2. CHECK MASTER LISTS
    if (role === 'student') {
      const masterRecord = await MasterStudent.findOne({ email });
      
      // If email is not in the college database, REJECT
      if (!masterRecord) {
        return res.status(400).json({ message: 'Student email not found in official records.' });
      }
      
      // Auto-fill details from Master Record
      userData.student_details = {
        name: masterRecord.name,
        usn: masterRecord.usn,
        section: masterRecord.section
      };

    } else if (role === 'faculty') {
      const masterRecord = await MasterFaculty.findOne({ email });
      
      // If email is not in the college database, REJECT
      if (!masterRecord) {
        return res.status(400).json({ message: 'Faculty email not found in official records.' });
      }

      // Auto-fill details from Master Record
      userData.faculty_details = {
        name: masterRecord.name,
        emp_id: masterRecord.emp_id,
        department: masterRecord.department
      };
    } else {
      return res.status(400).json({ message: 'Invalid Role selected' });
    }

    // 3. Create the User
    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
      // Send back specific details based on role
      details: user.role === 'student' ? user.student_details : user.faculty_details,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};