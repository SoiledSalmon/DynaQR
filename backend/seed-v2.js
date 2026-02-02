/**
 * Seed Script for New Schema (v2)
 *
 * Seeds the database with test data using the new refactored schema.
 *
 * Collections seeded:
 * - Student (with is_registered=true for all)
 * - Faculty (with is_registered=true for all)
 * - Subject
 * - Teaching
 *
 * Usage:
 *   node seed-v2.js           # Seed new collections only
 *   node seed-v2.js --clean   # Clear and reseed all new collections
 */

// --- DNS FIX ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ---------------

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// New Models
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const Subject = require('./models/Subject');
const Teaching = require('./models/Teaching');
const SessionNew = require('./models/SessionNew');
const AttendanceNew = require('./models/AttendanceNew');
const QRToken = require('./models/QRToken');
const AuditLog = require('./models/AuditLog');

const connectDB = require('./config/db');

// Read data files
const students = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'students.json'), 'utf-8')
);

const faculty = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'faculty.json'), 'utf-8')
);

const subjects = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'subjects.json'), 'utf-8')
);

const teachings = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'teachings.json'), 'utf-8')
);

const DEFAULT_PASSWORD = 'password123';

async function seedStudents() {
  console.log('\n📚 Seeding Students...');

  const studentDocs = students.map(s => ({
    email: s.email.toLowerCase(),
    password: DEFAULT_PASSWORD,
    name: s.name,
    usn: s.usn.toUpperCase(),
    section: s.section,
    semester: s.semester,
    is_registered: true
  }));

  for (const doc of studentDocs) {
    await Student.findOneAndUpdate(
      { email: doc.email },
      doc,
      { upsert: true, new: true }
    );
  }

  console.log(`   ✅ Seeded ${studentDocs.length} students`);
}

async function seedFaculty() {
  console.log('\n👨‍🏫 Seeding Faculty...');

  const facultyDocs = faculty.map(f => ({
    email: f.email.toLowerCase(),
    password: DEFAULT_PASSWORD,
    name: f.name,
    emp_id: f.emp_id.toUpperCase(),
    department: f.department,
    is_registered: true
  }));

  for (const doc of facultyDocs) {
    await Faculty.findOneAndUpdate(
      { email: doc.email },
      doc,
      { upsert: true, new: true }
    );
  }

  console.log(`   ✅ Seeded ${facultyDocs.length} faculty members`);
}

async function seedSubjects() {
  console.log('\n📖 Seeding Subjects...');

  for (const s of subjects) {
    await Subject.findOneAndUpdate(
      { code: s.code.toUpperCase() },
      {
        code: s.code.toUpperCase(),
        name: s.name,
        department: s.department
      },
      { upsert: true, new: true }
    );
  }

  console.log(`   ✅ Seeded ${subjects.length} subjects`);
}

async function seedTeachings() {
  console.log('\n📋 Seeding Teaching Assignments...');

  let created = 0;

  for (const t of teachings) {
    // Find faculty by email
    const facultyDoc = await Faculty.findOne({ email: t.faculty_email.toLowerCase() });
    if (!facultyDoc) {
      console.log(`   ⚠️  Faculty not found: ${t.faculty_email}`);
      continue;
    }

    // Find subject by code
    const subjectDoc = await Subject.findOne({ code: t.subject_code.toUpperCase() });
    if (!subjectDoc) {
      console.log(`   ⚠️  Subject not found: ${t.subject_code}`);
      continue;
    }

    await Teaching.findOneAndUpdate(
      {
        faculty_id: facultyDoc._id,
        subject_id: subjectDoc._id,
        section: t.section,
        semester: t.semester,
        academic_year: t.academic_year
      },
      {
        faculty_id: facultyDoc._id,
        subject_id: subjectDoc._id,
        section: t.section,
        semester: t.semester,
        academic_year: t.academic_year,
        is_active: true
      },
      { upsert: true, new: true }
    );

    created++;
  }

  console.log(`   ✅ Seeded ${created} teaching assignments`);
}

async function cleanCollections() {
  console.log('\n🗑️  Cleaning new collections...');

  await Student.deleteMany({});
  await Faculty.deleteMany({});
  await Subject.deleteMany({});
  await Teaching.deleteMany({});
  await SessionNew.deleteMany({});
  await AttendanceNew.deleteMany({});
  await QRToken.deleteMany({});
  await AuditLog.deleteMany({});

  console.log('   ✅ All new collections cleared');
}

async function main() {
  const shouldClean = process.argv.includes('--clean');

  console.log('🌱 DynaQR Database Seeder (v2 - New Schema)\n');
  console.log('=' .repeat(50));

  try {
    await connectDB();

    if (shouldClean) {
      await cleanCollections();
    }

    await seedStudents();
    await seedFaculty();
    await seedSubjects();
    await seedTeachings();

    console.log('\n' + '='.repeat(50));
    console.log('✅ Seeding completed successfully!\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`   - Students: ${await Student.countDocuments()}`);
    console.log(`   - Faculty: ${await Faculty.countDocuments()}`);
    console.log(`   - Subjects: ${await Subject.countDocuments()}`);
    console.log(`   - Teachings: ${await Teaching.countDocuments()}`);

    console.log('\n🔐 Default password for all users: ' + DEFAULT_PASSWORD);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
