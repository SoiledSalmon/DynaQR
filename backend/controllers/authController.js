const User = require('../models/User');
const MasterStudent = require('../models/MasterStudent');
const MasterFaculty = require('../models/MasterFaculty');
const jwt = require('jsonwebtoken');

// Helper to map DB role to Contract role
const mapRoleToContract = (role) => role === 'faculty' ? 'teacher' : role;
// Helper to map Contract role to DB role
const mapRoleToDB = (role) => role === 'teacher' ? 'faculty' : role;

const generateToken = (id, email, role) => {
  // Contract: Payload must include id, email, role ('teacher' | 'student')
  return jwt.sign({ 
    id, 
    email, 
    role: mapRoleToContract(role) 
  }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  try {
    let { email, password, role } = req.body; 

    // --- INPUT VALIDATION ---
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Please provide email, password, and role.' });
    }
    
    // Normalize role check (frontend sends 'teacher', backend uses 'faculty')
    // But we should validate the INPUT role first if possible, or just validate after mapping?
    // Let's validate strictly: 'student' or 'teacher' (from frontend) OR 'faculty' (direct API usage)
    const validRoles = ['student', 'teacher', 'faculty'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Allowed: 'student', 'teacher'." });
    }
    // ------------------------

    // 2.3 Enforce Email Domain Validation
    if (!email.endsWith('@rvce.edu.in')) {
      return res.status(400).json({ message: 'Only @rvce.edu.in emails are allowed.' });
    }

    // Map frontend role to DB role (teacher -> faculty)
    role = mapRoleToDB(role);

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
      // Contract: Response shape { token, user: { id, email, role } }
      res.status(201).json({
        token: generateToken(user._id, user.email, user.role),
        user: {
          id: user._id,
          email: user.email,
          role: mapRoleToContract(user.role)
        }
      });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
  const { email } = req.body; // 2.4 Remove password requirement
  
  // --- INPUT VALIDATION ---
  if (!email) {
    return res.status(400).json({ message: 'Please provide an email address.' });
  }
  // ------------------------
  
  // 2.3 Enforce Email Domain Validation on Login too (Security Depth)
  if (!email || !email.endsWith('@rvce.edu.in')) {
    return res.status(400).json({ message: 'Invalid email domain or missing email.' });
  }

  const user = await User.findOne({ email });

  // Mock Auth: Password check removed
  if (user) {
    // Contract: Response shape { token, user: { id, email, role } }
    res.json({
      token: generateToken(user._id, user.email, user.role),
      user: {
        id: user._id,
        email: user.email,
        role: mapRoleToContract(user.role)
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid email' });
  }
};