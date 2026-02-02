const mongoose = require('mongoose');

/**
 * Teaching Model
 *
 * Represents the assignment of a faculty member to teach a specific subject
 * to a specific section in a specific semester and academic year.
 *
 * This enables:
 * - Authorization: Faculty can only create sessions for courses they teach
 * - Scheduling: Track who teaches what, when
 * - Analytics: Per-faculty, per-course attendance statistics
 */
const TeachingSchema = new mongoose.Schema({
  faculty_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: [true, 'Faculty ID is required']
  },
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject ID is required']
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
  academic_year: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true,
    match: [/^\d{4}-\d{2}$/, 'Academic year must be in format YYYY-YY (e.g., 2025-26)']
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: false
  }
});

// Unique constraint: One faculty can teach one subject to one section/semester/year
TeachingSchema.index(
  { faculty_id: 1, subject_id: 1, section: 1, semester: 1, academic_year: 1 },
  { unique: true }
);

// Query optimization indexes
TeachingSchema.index({ faculty_id: 1, is_active: 1 }); // Faculty's active courses
TeachingSchema.index({ section: 1, semester: 1, academic_year: 1 }); // Courses for a section
TeachingSchema.index({ subject_id: 1, academic_year: 1 }); // Subject offerings

/**
 * Check if a student is enrolled in this teaching assignment
 * (Student's section and semester must match)
 */
TeachingSchema.methods.isStudentEnrolled = function(student) {
  return student.section === this.section && student.semester === this.semester;
};

module.exports = mongoose.model('Teaching', TeachingSchema);
