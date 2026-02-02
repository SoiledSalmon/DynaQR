const mongoose = require('mongoose');

/**
 * Attendance Model (Refactored)
 *
 * Records a student's attendance for a specific session.
 * Now includes verification metadata for fraud detection and auditing.
 *
 * Snapshots student_name and student_usn at mark time for historical accuracy
 * (in case student data changes later).
 */
const AttendanceSchemaNew = new mongoose.Schema({
  session_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SessionNew',
    required: [true, 'Session ID is required']
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },

  // Snapshot of student details at mark time (for historical accuracy)
  student_name: {
    type: String,
    required: [true, 'Student name snapshot is required']
  },
  student_usn: {
    type: String,
    required: [true, 'Student USN snapshot is required']
  },

  // Verification metadata
  qr_token_used: {
    type: String,
    required: false // May be null for legacy records or if token rotation disabled
  },
  marked_at: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Fraud detection metadata (optional)
  ip_address: {
    type: String,
    required: false
  },
  user_agent: {
    type: String,
    required: false
  }
}, {
  timestamps: false // We use marked_at instead of createdAt
});

// Indexes
// Primary constraint: One student can only attend one session once
AttendanceSchemaNew.index({ session_id: 1, student_id: 1 }, { unique: true });

// Query optimization
AttendanceSchemaNew.index({ student_id: 1, marked_at: -1 }); // Student history
AttendanceSchemaNew.index({ session_id: 1 }); // Session attendees list

// For fraud detection: find multiple marks from same IP
AttendanceSchemaNew.index({ session_id: 1, ip_address: 1 });

/**
 * Static: Mark attendance with all required checks
 * @param {Object} params - Attendance parameters
 * @returns {Promise<Attendance>} Created attendance record
 * @throws {Error} If attendance already exists (E11000 duplicate key)
 */
AttendanceSchemaNew.statics.markAttendance = async function({
  session_id,
  student_id,
  student_name,
  student_usn,
  qr_token_used = null,
  ip_address = null,
  user_agent = null
}) {
  return await this.create({
    session_id,
    student_id,
    student_name,
    student_usn,
    qr_token_used,
    marked_at: new Date(),
    ip_address,
    user_agent
  });
};

/**
 * Static: Check if student already marked attendance for session
 */
AttendanceSchemaNew.statics.hasMarkedAttendance = async function(session_id, student_id) {
  const existing = await this.findOne({ session_id, student_id });
  return !!existing;
};

/**
 * Static: Get attendance count for a session
 */
AttendanceSchemaNew.statics.getSessionAttendanceCount = async function(session_id) {
  return await this.countDocuments({ session_id });
};

/**
 * Static: Detect suspicious IP patterns (multiple students from same IP)
 */
AttendanceSchemaNew.statics.getSuspiciousIPsForSession = async function(session_id) {
  return await this.aggregate([
    { $match: { session_id: new mongoose.Types.ObjectId(session_id), ip_address: { $ne: null } } },
    { $group: { _id: '$ip_address', count: { $sum: 1 }, students: { $push: '$student_usn' } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { ip_address: '$_id', count: 1, students: 1, _id: 0 } }
  ]);
};

module.exports = mongoose.model('AttendanceNew', AttendanceSchemaNew);
