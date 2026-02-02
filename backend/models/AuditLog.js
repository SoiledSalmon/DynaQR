const mongoose = require('mongoose');

/**
 * AuditLog Model
 *
 * Records security-relevant events for compliance, investigation, and analytics.
 * Automatically expires after 90 days via TTL index.
 *
 * Actions tracked:
 * - LOGIN, LOGIN_FAILED: Authentication attempts
 * - SESSION_CREATE, SESSION_UPDATE, SESSION_CANCEL: Session lifecycle
 * - ATTENDANCE_MARK, ATTENDANCE_DENIED: Attendance attempts
 * - SUSPICIOUS_ACTIVITY: Fraud detection alerts
 */

const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'REGISTER',
  'REGISTER_FAILED',
  'SESSION_CREATE',
  'SESSION_UPDATE',
  'SESSION_CANCEL',
  'ATTENDANCE_MARK',
  'ATTENDANCE_DENIED',
  'QR_TOKEN_GENERATE',
  'QR_TOKEN_VALIDATE_FAILED',
  'SUSPICIOUS_ACTIVITY',
  'UNAUTHORIZED_ACCESS'
];

const ACTOR_TYPES = ['student', 'faculty', 'system', 'anonymous'];
const TARGET_TYPES = ['session', 'attendance', 'student', 'faculty', 'qrtoken', null];

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: {
      values: AUDIT_ACTIONS,
      message: 'Action must be one of: ' + AUDIT_ACTIONS.join(', ')
    }
  },
  actor_type: {
    type: String,
    required: [true, 'Actor type is required'],
    enum: {
      values: ACTOR_TYPES,
      message: 'Actor type must be one of: ' + ACTOR_TYPES.join(', ')
    }
  },
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Null for failed logins, anonymous, or system actions
    refPath: 'actor_type_ref'
  },
  // Dynamic reference based on actor_type
  actor_type_ref: {
    type: String,
    enum: ['Student', 'Faculty', null],
    required: false
  },
  target_type: {
    type: String,
    required: false,
    enum: TARGET_TYPES
  },
  target_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
    default: {}
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: false // Audit logs are immutable
  }
});

// TTL Index: Auto-delete after 90 days (7,776,000 seconds)
AuditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

// Query optimization indexes
AuditLogSchema.index({ actor_id: 1, created_at: -1 }); // User activity history
AuditLogSchema.index({ target_id: 1, created_at: -1 }); // Target history
AuditLogSchema.index({ action: 1, created_at: -1 }); // Filter by action type
AuditLogSchema.index({ actor_type: 1, action: 1, created_at: -1 }); // Compound filter

/**
 * Static: Log an event
 * @param {Object} event - Event details
 * @returns {Promise<AuditLog>} Created log entry
 */
AuditLogSchema.statics.log = async function({
  action,
  actor_type,
  actor_id = null,
  target_type = null,
  target_id = null,
  metadata = {}
}) {
  // Determine actor reference type
  let actor_type_ref = null;
  if (actor_type === 'student') {
    actor_type_ref = 'Student';
  } else if (actor_type === 'faculty') {
    actor_type_ref = 'Faculty';
  }

  return await this.create({
    action,
    actor_type,
    actor_id,
    actor_type_ref,
    target_type,
    target_id,
    metadata
  });
};

/**
 * Static: Log a login event
 */
AuditLogSchema.statics.logLogin = async function(actor_type, actor_id, success, metadata = {}) {
  return await this.log({
    action: success ? 'LOGIN' : 'LOGIN_FAILED',
    actor_type: actor_id ? actor_type : 'anonymous',
    actor_id,
    metadata: {
      ...metadata,
      success
    }
  });
};

/**
 * Static: Log an attendance event
 */
AuditLogSchema.statics.logAttendance = async function(student_id, session_id, success, metadata = {}) {
  return await this.log({
    action: success ? 'ATTENDANCE_MARK' : 'ATTENDANCE_DENIED',
    actor_type: 'student',
    actor_id: student_id,
    target_type: 'session',
    target_id: session_id,
    metadata
  });
};

/**
 * Static: Log session creation
 */
AuditLogSchema.statics.logSessionCreate = async function(faculty_id, session_id, metadata = {}) {
  return await this.log({
    action: 'SESSION_CREATE',
    actor_type: 'faculty',
    actor_id: faculty_id,
    target_type: 'session',
    target_id: session_id,
    metadata
  });
};

/**
 * Static: Log suspicious activity
 */
AuditLogSchema.statics.logSuspicious = async function(actor_type, actor_id, description, metadata = {}) {
  return await this.log({
    action: 'SUSPICIOUS_ACTIVITY',
    actor_type,
    actor_id,
    metadata: {
      description,
      ...metadata
    }
  });
};

// Export constants for use in other modules
AuditLogSchema.statics.ACTIONS = AUDIT_ACTIONS;
AuditLogSchema.statics.ACTOR_TYPES = ACTOR_TYPES;

module.exports = mongoose.model('AuditLog', AuditLogSchema);
