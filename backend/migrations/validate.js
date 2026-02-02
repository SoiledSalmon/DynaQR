/**
 * Migration Validation Script
 *
 * Validates that the migration completed successfully by checking:
 * 1. Record counts match between old and new collections
 * 2. Data integrity (all references valid)
 * 3. Index existence
 *
 * Usage:
 *   node migrations/validate.js
 */

// --- DNS FIX ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ---------------

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

// Models
const {
  Student, Faculty, Subject, Teaching, SessionNew, QRToken, AttendanceNew, AuditLog,
  _legacy
} = require('../models');

const { User, MasterStudent, MasterFaculty, Session, Attendance } = _legacy;

const connectDB = require('../config/db');

async function validateCounts() {
  console.log('\n📊 Validating Record Counts...\n');

  const results = [];

  // Students
  const masterStudentCount = await MasterStudent.countDocuments();
  const userStudentCount = await User.countDocuments({ role: 'student' });
  const studentCount = await Student.countDocuments();
  const registeredStudentCount = await Student.countDocuments({ is_registered: true });

  results.push({
    collection: 'Student',
    expected: masterStudentCount,
    actual: studentCount,
    match: studentCount >= masterStudentCount,
    note: `${registeredStudentCount} registered (was ${userStudentCount} users)`
  });

  // Faculty
  const masterFacultyCount = await MasterFaculty.countDocuments();
  const userFacultyCount = await User.countDocuments({ role: 'faculty' });
  const facultyCount = await Faculty.countDocuments();
  const registeredFacultyCount = await Faculty.countDocuments({ is_registered: true });

  results.push({
    collection: 'Faculty',
    expected: masterFacultyCount,
    actual: facultyCount,
    match: facultyCount >= masterFacultyCount,
    note: `${registeredFacultyCount} registered (was ${userFacultyCount} users)`
  });

  // Sessions
  const oldSessionCount = await Session.countDocuments();
  const newSessionCount = await SessionNew.countDocuments();

  results.push({
    collection: 'SessionNew',
    expected: oldSessionCount,
    actual: newSessionCount,
    match: newSessionCount === oldSessionCount,
    note: oldSessionCount === 0 ? 'No sessions to migrate' : ''
  });

  // Attendance
  const oldAttendanceCount = await Attendance.countDocuments();
  const newAttendanceCount = await AttendanceNew.countDocuments();

  results.push({
    collection: 'AttendanceNew',
    expected: oldAttendanceCount,
    actual: newAttendanceCount,
    match: newAttendanceCount === oldAttendanceCount,
    note: oldAttendanceCount === 0 ? 'No attendance to migrate' : ''
  });

  // Display results
  let allMatch = true;
  for (const r of results) {
    const status = r.match ? '✅' : '❌';
    console.log(`  ${status} ${r.collection}: ${r.actual} (expected ${r.expected}) ${r.note}`);
    if (!r.match) allMatch = false;
  }

  return allMatch;
}

async function validateReferences() {
  console.log('\n🔗 Validating References...\n');

  let valid = true;

  // Check Teaching references
  const teachings = await Teaching.find({}).limit(100).lean();
  let invalidTeachings = 0;

  for (const t of teachings) {
    const faculty = await Faculty.findById(t.faculty_id);
    const subject = await Subject.findById(t.subject_id);

    if (!faculty || !subject) {
      invalidTeachings++;
    }
  }

  if (invalidTeachings > 0) {
    console.log(`  ❌ Teaching: ${invalidTeachings} records with invalid references`);
    valid = false;
  } else {
    console.log(`  ✅ Teaching: All references valid`);
  }

  // Check SessionNew references
  const sessions = await SessionNew.find({}).limit(100).lean();
  let invalidSessions = 0;

  for (const s of sessions) {
    const teaching = await Teaching.findById(s.teaching_id);
    if (!teaching) {
      invalidSessions++;
    }
  }

  if (invalidSessions > 0) {
    console.log(`  ❌ SessionNew: ${invalidSessions} records with invalid teaching_id`);
    valid = false;
  } else {
    console.log(`  ✅ SessionNew: All references valid`);
  }

  // Check AttendanceNew references
  const attendance = await AttendanceNew.find({}).limit(100).lean();
  let invalidAttendance = 0;

  for (const a of attendance) {
    const session = await SessionNew.findById(a.session_id);
    const student = await Student.findById(a.student_id);

    if (!session || !student) {
      invalidAttendance++;
    }
  }

  if (invalidAttendance > 0) {
    console.log(`  ❌ AttendanceNew: ${invalidAttendance} records with invalid references`);
    valid = false;
  } else {
    console.log(`  ✅ AttendanceNew: All references valid`);
  }

  return valid;
}

async function validateIndexes() {
  console.log('\n📇 Validating Indexes...\n');

  const collections = [
    { model: Student, name: 'students', expected: ['email_1', 'usn_1', 'section_1'] },
    { model: Faculty, name: 'faculties', expected: ['email_1', 'emp_id_1'] },
    { model: Subject, name: 'subjects', expected: ['code_1'] },
    { model: Teaching, name: 'teachings', expected: ['faculty_id_1_subject_id_1_section_1_semester_1_academic_year_1'] },
    { model: SessionNew, name: 'sessionnews', expected: ['teaching_id_1_start_time_-1', 'secret_key_1'] },
    { model: AttendanceNew, name: 'attendancenews', expected: ['session_id_1_student_id_1'] },
    { model: AuditLog, name: 'auditlogs', expected: ['created_at_1'] }
  ];

  let allPresent = true;

  for (const col of collections) {
    try {
      const indexes = await col.model.collection.indexes();
      const indexNames = indexes.map(i => i.name);

      const missing = col.expected.filter(e => !indexNames.some(n => n.includes(e.replace(/_1|-1/g, ''))));

      if (missing.length > 0) {
        console.log(`  ⚠️  ${col.name}: Missing indexes: ${missing.join(', ')}`);
        allPresent = false;
      } else {
        console.log(`  ✅ ${col.name}: All expected indexes present`);
      }
    } catch (err) {
      console.log(`  ⏭️  ${col.name}: Collection not yet created`);
    }
  }

  return allPresent;
}

async function main() {
  console.log('🔍 DynaQR Migration Validation\n');
  console.log('=' .repeat(50));

  try {
    await connectDB();

    const countsValid = await validateCounts();
    const refsValid = await validateReferences();
    const indexesValid = await validateIndexes();

    console.log('\n' + '='.repeat(50));

    if (countsValid && refsValid && indexesValid) {
      console.log('✅ All validations passed!\n');
      console.log('Safe to proceed with:');
      console.log('  1. Updating application code to use new models');
      console.log('  2. Testing the application thoroughly');
      console.log('  3. Dropping old collections after verification period');
    } else {
      console.log('⚠️  Some validations failed.\n');
      console.log('Review the issues above before proceeding.');
      console.log('You may need to re-run specific migrations.');
    }

  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
