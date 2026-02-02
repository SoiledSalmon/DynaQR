/**
 * Models Index
 *
 * Exports all models for the DynaQR application.
 *
 * Schema Version: 2.0.0 (Refactored)
 *
 * New Collections (Use these in all controllers):
 * - Identity Domain: Student, Faculty
 * - Academic Domain: Subject, Teaching
 * - Attendance Domain: SessionNew, QRToken, AttendanceNew
 * - Audit Domain: AuditLog
 *
 * Legacy collections (FOR MIGRATION SCRIPTS ONLY - DO NOT USE IN CONTROLLERS):
 * - User (replaced by Student + Faculty)
 * - MasterStudent (merged into Student)
 * - MasterFaculty (merged into Faculty)
 * - Session (replaced by SessionNew)
 * - Attendance (replaced by AttendanceNew)
 * - Class (unused, removed)
 *
 * IMPORTANT: After migration validation, legacy collections can be dropped.
 * Run `node migrations/cleanup-guard.js` before dropping to verify safety.
 */

// ============================================================================
// NEW MODELS (v2) - Use these in all production code
// ============================================================================

// Identity Domain
const Student = require('./Student');
const Faculty = require('./Faculty');

// Academic Domain
const Subject = require('./Subject');
const Teaching = require('./Teaching');

// Attendance Domain
const SessionNew = require('./SessionNew');
const QRToken = require('./QRToken');
const AttendanceNew = require('./AttendanceNew');

// Audit Domain
const AuditLog = require('./AuditLog');

// ============================================================================
// LEGACY MODELS - For migration scripts ONLY
// DO NOT import these directly in controllers or middleware
// ============================================================================

// These are only exported for migration scripts
// Controllers should NEVER use these
const _legacyModels = {
  User: require('./User'),
  MasterStudent: require('./MasterStudent'),
  MasterFaculty: require('./MasterFaculty'),
  Session: require('./Session'),
  Attendance: require('./Attendance')
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // New models (use these)
  Student,
  Faculty,
  Subject,
  Teaching,
  SessionNew,
  QRToken,
  AttendanceNew,
  AuditLog,

  // Legacy models (for migration only - prefixed with underscore)
  _legacy: _legacyModels
};
