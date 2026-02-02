const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Student Model
 *
 * Represents students in the system. Replaces the polymorphic User model
 * and merges MasterStudent whitelist functionality via is_registered flag.
 *
 * Whitelist records: is_registered = false (password may be null)
 * Registered users: is_registered = true (password required)
 */
const StudentSchema = new mongoose.Schema({
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
  usn: {
    type: String,
    required: [true, 'USN is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: 1,
    max: 8
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

// Indexes (email and usn indexes created by unique: true in schema)
StudentSchema.index({ section: 1 });
StudentSchema.index({ semester: 1 });
StudentSchema.index({ section: 1, semester: 1 }); // Compound for course enrollment queries

// Hash password before saving (only if modified)
StudentSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
StudentSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual for role (for JWT compatibility)
StudentSchema.virtual('role').get(function() {
  return 'student';
});

// Ensure virtuals are included in JSON output
StudentSchema.set('toJSON', { virtuals: true });
StudentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Student', StudentSchema);
