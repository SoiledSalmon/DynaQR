const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Faculty Model
 *
 * Represents faculty members (teachers) in the system. Replaces the polymorphic
 * User model and merges MasterFaculty whitelist functionality via is_registered flag.
 *
 * Whitelist records: is_registered = false (password may be null)
 * Registered users: is_registered = true (password required)
 */
const FacultySchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/@rvce\.edu\.in$/, 'Only @rvce.edu.in emails are allowed']
  },
  password: {
    type: String,
    required: function() { return this.is_registered === true; },
    select: false // Don't include in queries by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  emp_id: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  is_registered: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes (email and emp_id indexes created by unique: true in schema)
FacultySchema.index({ department: 1 });

// Hash password before saving (only if modified)
FacultySchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
FacultySchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual for role (for JWT compatibility)
// Returns 'teacher' for API contract compliance (internal 'faculty' → external 'teacher')
FacultySchema.virtual('role').get(function() {
  return 'teacher';
});

// Ensure virtuals are included in JSON output
FacultySchema.set('toJSON', { virtuals: true });
FacultySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Faculty', FacultySchema);
