const mongoose = require('mongoose');

/**
 * Subject Model
 *
 * Represents academic subjects/courses. Normalizes the free-text subject field
 * that was previously stored directly in Session.
 *
 * Benefits:
 * - Prevents typos ("Maths" vs "Mathematics")
 * - Enables subject-level analytics
 * - Supports faculty-subject teaching assignments
 */
const SubjectSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{2,4}\d{3}$/, 'Subject code must be in format like CS301, MATH201']
  },
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: false // Subjects are typically not updated
  }
});

// Indexes (code index created by unique: true in schema)
SubjectSchema.index({ department: 1 });
SubjectSchema.index({ name: 'text' }); // Text search for subject lookup

module.exports = mongoose.model('Subject', SubjectSchema);
