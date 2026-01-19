const crypto = require('crypto');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// --- 1. Teacher Creates a Session (Generates QR) ---
const createSession = async (req, res) => {
  try {
    const { subject, section, startTime, endTime } = req.body;

    // --- INPUT VALIDATION ---
    if (!subject || !section || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide subject, section, startTime, and endTime.' });
    }
    
    // 4.2 LOGIC: Validate Time Window
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }
    // ------------------------

    // Generate a secure unique "Secret Key" for the QR Code
    const secret_key = crypto.randomBytes(16).toString('hex');

    const session = await Session.create({
      faculty_id: req.user.id, // Comes from logged-in teacher
      subject,
      section,
      class_start_time: new Date(startTime),
      class_end_time: new Date(endTime),
      secret_key
    });

    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error creating session' });
  }
};

// --- 2. Student Marks Attendance ---
const markAttendance = async (req, res) => {
  try {
    const { sessionId } = req.body;

    // --- INPUT VALIDATION ---
    if (!sessionId) {
      return res.status(400).json({ message: 'Please provide sessionId.' });
    }
    // ------------------------

    const session = await Session.findById(sessionId);

    // A. Check if session exists
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // A2. Check if session is active (Stability)
    if (!session.is_active) {
      return res.status(400).json({ message: 'Session is inactive. Attendance cannot be marked.' });
    }

    // B. Check if Secret Key (QR) matches
    // REMOVED for Step 1 recovery: QR now encodes only sessionId.
    // if (session.secret_key !== code) {
    //   return res.status(400).json({ message: 'Invalid QR Code' });
    // }

    // C. Check Time Constraints (The logic you wanted!)
    const now = new Date();
    if (now < new Date(session.class_start_time)) {
      return res.status(400).json({ message: 'Class has not started yet!' });
    }
    if (now > new Date(session.class_end_time)) {
      return res.status(400).json({ message: 'Class has ended! Attendance closed.' });
    }

    // D. Check for Duplicate Attendance
    const alreadyMarked = await Attendance.findOne({ 
      session_id: sessionId, 
      student_id: req.user.id 
    });

    if (alreadyMarked) {
      return res.status(400).json({ message: 'You have already marked attendance!' });
    }

    // E. Save Record
    const student = await User.findById(req.user.id);
    await Attendance.create({
      session_id: sessionId,
      student_id: student._id,
      student_name: student.student_details.name, // Fixed field access
      usn: student.student_details.usn            // Fixed field access
    });

    res.json({ message: 'Attendance Marked Successfully!' });
  } catch (error) {
    // Handle Duplicate Key Error from DB (Defense in Depth)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already marked attendance!' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server Error marking attendance' });
  }
};

module.exports = { createSession, markAttendance };

// ... existing createSession and markAttendance code ...

// --- 3. Get Student's Attendance History ---
const getStudentHistory = async (req, res) => {
  try {
    // Find all attendance records for this student
    // .populate() grabs the session details (Subject, Date) instead of just the ID
    const history = await Attendance.find({ student_id: req.user.id })
      .populate('session_id', 'subject section class_start_time')
      .sort({ timestamp: -1 }); // Newest first

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching history' });
  }
};

// --- 4. Get specific Session Details (For Teacher Dashboard) ---
const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 1. Get the Session Info
    // 2.1 SECURITY: Do NOT return secret_key
    const session = await Session.findById(sessionId).select('-secret_key');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // 2. Security Check: Only the teacher who created it can see details
    if (session.faculty_id.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to view this session' });
    }

    // 3. Get the list of students who attended
    const attendees = await Attendance.find({ session_id: sessionId })
      .select('student_name usn timestamp');

    res.json({ session, attendees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching session details' });
  }
};

// --- 5. Get Student Metrics ---
const getStudentMetrics = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student || student.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Students only.' });
    }

    // Metric 1: Total Sessions for the student's section
    const totalSessions = await Session.countDocuments({ 
      section: student.student_details.section 
    });

    // Metric 2: Sessions attended by this student
    const attendedSessions = await Attendance.countDocuments({ 
      student_id: req.user.id 
    });

    // Metric 3: Percentage
    const attendancePercentage = totalSessions === 0 
      ? 0 
      : Math.round((attendedSessions / totalSessions) * 100);

    res.json({
      totalSessions,
      attendedSessions,
      attendancePercentage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching metrics' });
  }
};

// Don't forget to export them!
module.exports = { 
  createSession, 
  markAttendance, 
  getStudentHistory, 
  getSessionDetails,
  getStudentMetrics
};