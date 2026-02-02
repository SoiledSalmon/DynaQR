/**
 * Migration: 004 - Create Teaching Assignments
 *
 * Creates Teaching records from existing Session data.
 * Links Faculty to Subjects they've created sessions for.
 *
 * Strategy:
 * 1. For each unique (faculty_id, subject, section) in Session
 * 2. Find the corresponding Faculty record (migrated from User)
 * 3. Find the corresponding Subject record (created in migration 003)
 * 4. Create a Teaching record linking them
 *
 * Assumptions:
 * - Default semester: 3 (middle value)
 * - Default academic_year: "2025-26" (current year)
 * - is_active: true
 */

// --- DNS FIX ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ---------------

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Models
const Session = require('../models/Session');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const Teaching = require('../models/Teaching');
const User = require('../models/User');

const connectDB = require('../config/db');

const DEFAULT_SEMESTER = 3;
const DEFAULT_ACADEMIC_YEAR = '2025-26';

async function migrate() {
  console.log('🚀 Starting Migration 004: Create Teaching Assignments...\n');

  try {
    await connectDB();

    // Step 1: Get unique combinations from sessions
    const sessions = await Session.find({})
      .select('faculty_id subject section')
      .lean();

    if (sessions.length === 0) {
      console.log('⚠️  No sessions found. Nothing to create.');
      console.log('   Teaching assignments will be created when you run seed-v2.js');
      process.exit(0);
    }

    console.log(`📊 Found ${sessions.length} sessions\n`);

    // Build unique combinations, filtering out invalid sessions
    const uniqueCombos = new Map();
    let invalidSessions = 0;

    for (const session of sessions) {
      // Skip sessions with missing data
      if (!session.faculty_id || !session.subject || !session.section) {
        invalidSessions++;
        continue;
      }

      const subjectLower = session.subject.toLowerCase().trim();
      const key = `${session.faculty_id}-${subjectLower}-${session.section}`;

      if (!uniqueCombos.has(key)) {
        uniqueCombos.set(key, {
          old_faculty_id: session.faculty_id,
          subject_name: session.subject.trim(),
          section: session.section
        });
      }
    }

    if (invalidSessions > 0) {
      console.log(`⚠️  Skipped ${invalidSessions} sessions with missing data`);
    }

    console.log(`📊 Found ${uniqueCombos.size} unique faculty-subject-section combinations\n`);

    if (uniqueCombos.size === 0) {
      console.log('✅ No teaching assignments to create');
      process.exit(0);
    }

    // Step 2: Build lookup maps
    // Map old User._id to email (via User collection)
    const users = await User.find({ role: 'faculty' }).lean();
    const faculty = await Faculty.find({}).lean();

    const userIdToEmail = new Map();
    for (const user of users) {
      if (user.email) {
        userIdToEmail.set(user._id.toString(), user.email.toLowerCase());
      }
    }

    const emailToFaculty = new Map();
    for (const f of faculty) {
      if (f.email) {
        emailToFaculty.set(f.email.toLowerCase(), f);
      }
    }

    console.log(`📊 User (faculty) records: ${users.length}`);
    console.log(`📊 Faculty records: ${faculty.length}\n`);

    // Map subject name to Subject._id
    const subjects = await Subject.find({}).lean();
    const subjectNameToId = new Map();
    for (const s of subjects) {
      if (s.name) {
        subjectNameToId.set(s.name.toLowerCase(), s._id);
      }
    }

    console.log(`📊 Subject records: ${subjects.length}\n`);

    // Step 3: Create Teaching records
    const teachings = [];
    let skipped = 0;

    for (const combo of uniqueCombos.values()) {
      // Find email from old User ID
      const email = userIdToEmail.get(combo.old_faculty_id.toString());
      if (!email) {
        console.log(`   ⚠️  No email found for old User ID: ${combo.old_faculty_id}`);
        skipped++;
        continue;
      }

      // Find new Faculty record by email
      const facultyRecord = emailToFaculty.get(email);
      if (!facultyRecord) {
        console.log(`   ⚠️  No Faculty record for email: ${email}`);
        skipped++;
        continue;
      }

      // Find Subject ID by name
      const subjectId = subjectNameToId.get(combo.subject_name.toLowerCase());
      if (!subjectId) {
        console.log(`   ⚠️  No Subject record for: "${combo.subject_name}"`);
        skipped++;
        continue;
      }

      // Check if Teaching already exists
      const existing = await Teaching.findOne({
        faculty_id: facultyRecord._id,
        subject_id: subjectId,
        section: combo.section,
        semester: DEFAULT_SEMESTER,
        academic_year: DEFAULT_ACADEMIC_YEAR
      });

      if (existing) {
        console.log(`   ⏭️  Teaching exists: ${facultyRecord.name} → ${combo.subject_name} (${combo.section})`);
        continue;
      }

      teachings.push({
        faculty_id: facultyRecord._id,
        subject_id: subjectId,
        section: combo.section,
        semester: DEFAULT_SEMESTER,
        academic_year: DEFAULT_ACADEMIC_YEAR,
        is_active: true
      });

      console.log(`   ➕ Will create: ${facultyRecord.name} → ${combo.subject_name} (${combo.section})`);
    }

    // Step 4: Insert teachings
    if (teachings.length > 0) {
      await Teaching.insertMany(teachings);
      console.log(`\n✅ Created ${teachings.length} teaching assignment(s)`);
    } else {
      console.log('\n✅ No new teaching assignments to create');
    }

    if (skipped > 0) {
      console.log(`⚠️  Skipped ${skipped} combination(s) due to missing references`);
    }

    // Step 5: Summary
    const totalTeachings = await Teaching.countDocuments();
    console.log(`\n📈 Total teaching assignments: ${totalTeachings}`);

    console.log('\n✅ Migration 004 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate teaching assignment.');
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run migration
migrate();
