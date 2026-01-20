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
    // 1. Validate User Exists
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const alreadyMarked = await Attendance.findOne({ 
      session_id: sessionId, 
      student_id: req.user.id 
    });

    if (alreadyMarked) {
      return res.status(400).json({ message: 'You have already marked attendance!' });
    }

    // E. Save Record
    const student = await User.findById(req.user.id);
    
    // 2. Validate Student Details
    if (!student || !student.student_details) {
      return res.status(400).json({ message: 'Student profile incomplete. Cannot mark attendance.' });
    }

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

    // 1. Fetch ALL sessions for this student's section
    const allSessions = await Session.find({ 
      section: student.student_details.section 
    });

    // 2. Fetch ALL attendance records for this student
    const allAttendance = await Attendance.find({ 
      student_id: req.user.id 
    });

    // Create a Set of attended session IDs for O(1) lookup
    const attendedSessionIds = new Set(allAttendance.map(a => a.session_id.toString()));

    // 3. Aggregate by Subject
    const subjectStats = {};

    allSessions.forEach(session => {
      const subject = session.subject;
      
      if (!subjectStats[subject]) {
        subjectStats[subject] = { total: 0, attended: 0, subject: subject };
      }

      subjectStats[subject].total += 1;

      if (attendedSessionIds.has(session._id.toString())) {
        subjectStats[subject].attended += 1;
      }
    });

    // 4. Format the output for the frontend
    const classes = Object.values(subjectStats).map((stat, index) => {
      const percent = stat.total === 0 ? 0 : Math.round((stat.attended / stat.total) * 100);
      return {
        classId: `subject-${index}`, // Simple unique key
        name: stat.subject,
        attended: stat.attended,
        total: stat.total,
        percent: percent
      };
    });

    // 5. Calculate Overall Metrics
    const totalSessions = allSessions.length;
    const attendedSessions = allAttendance.length; // Or sum from classes for consistency
    const overallPercent = totalSessions === 0 
      ? 0 
      : Math.round((attendedSessions / totalSessions) * 100);

    res.json({
      totalSessions,
      attendedSessions,
      overallPercent, // Frontend expects 'overallPercent' or 'attendancePercentage'
      attendancePercentage: overallPercent, // Keep for backward compatibility
      classes // The missing piece!
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching metrics' });
  }
};

// --- 6. Get Teacher Dashboard Data ---
const getTeacherDashboardData = async (req, res) => {
  try {
    // 1. Fetch all sessions for this faculty member
    const sessions = await Session.find({ faculty_id: req.user.id })
      .sort({ class_start_time: -1 }); // Newest first

    // 2. Calculate Metrics
    const totalSessions = sessions.length;
    
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));
    
    // Reset 'now' for comparison
    const currentTime = new Date();

    const sessionsToday = sessions.filter(session => {
      const sessionDate = new Date(session.class_start_time);
      return sessionDate >= startOfDay && sessionDate <= endOfDay;
    }).length;

    const activeSessions = sessions.filter(session => {
      const start = new Date(session.class_start_time);
      const end = new Date(session.class_end_time);
      return session.is_active && currentTime >= start && currentTime <= end;
    }).length;

    // 3. Get Recent Sessions (Limit 5)
    const recentSessions = sessions.slice(0, 5);

    res.json({
      totalSessions,
      activeSessions,
      sessionsToday,
      recentSessions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching teacher dashboard data' });
  }
};

// Don't forget to export them!
module.exports = { 
  createSession, 
  markAttendance, 
  getStudentHistory, 
  getSessionDetails,
  getStudentMetrics,
  getTeacherDashboardData
};