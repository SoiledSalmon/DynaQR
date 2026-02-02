/**
 * Migration: 001 - Migrate Students
 *
 * Migrates data from MasterStudent + User (role=student) to the new Student collection.
 *
 * Strategy:
 * 1. Insert all MasterStudent records as is_registered=false (whitelist)
 * 2. For each User with role=student, update corresponding Student record:
 *    - Set password
 *    - Set is_registered=true
 *
 * Note: This migration assumes students.json will be updated to include semester.
 * For existing data without semester, defaults to semester=3 (reasonable middle value).
 */

// --- DNS FIX ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ---------------

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

// Models
const MasterStudent = require('../models/MasterStudent');
const User = require('../models/User');
const Student = require('../models/Student');

const connectDB = require('../config/db');

const DEFAULT_SEMESTER = 3; // Default for existing records without semester

async function migrate() {
  console.log('🚀 Starting Migration 001: Migrate Students...\n');

  try {
    await connectDB();

    // Step 1: Count existing data
    const masterCount = await MasterStudent.countDocuments();
    const userStudentCount = await User.countDocuments({ role: 'student' });

    console.log(`📊 Found ${masterCount} MasterStudent records`);
    console.log(`📊 Found ${userStudentCount} User (student) records\n`);

    if (masterCount === 0) {
      console.log('⚠️  No MasterStudent records found. Nothing to migrate.');
      process.exit(0);
    }

    // Step 2: Get all master records
    const masterStudents = await MasterStudent.find({}).lean();

    // Step 3: Get all registered users (for password + is_registered)
    const registeredUsers = await User.find({ role: 'student' })
      .select('+password')
      .lean();

    // Create a map for quick lookup
    const userMap = new Map();
    for (const user of registeredUsers) {
      userMap.set(user.email.toLowerCase(), user);
    }

    // Step 4: Prepare bulk operations
    const bulkOps = [];
    let newCount = 0;
    let updateCount = 0;

    for (const master of masterStudents) {
      const email = master.email.toLowerCase();
      const registeredUser = userMap.get(email);

      const studentData = {
        email: email,
        name: master.name,
        usn: master.usn.toUpperCase(),
        section: master.section,
        semester: master.semester || DEFAULT_SEMESTER,
        is_registered: !!registeredUser,
        password: registeredUser?.password || null
      };

      bulkOps.push({
        updateOne: {
          filter: { email: email },
          update: { $set: studentData },
          upsert: true
        }
      });

      if (registeredUser) {
        updateCount++;
      } else {
        newCount++;
      }
    }

    // Step 5: Execute bulk operation
    if (bulkOps.length > 0) {
      const result = await Student.bulkWrite(bulkOps, { ordered: false });
      console.log(`✅ Bulk operation complete:`);
      console.log(`   - Upserted: ${result.upsertedCount}`);
      console.log(`   - Modified: ${result.modifiedCount}`);
    }

    // Step 6: Verify migration
    const newStudentCount = await Student.countDocuments();
    const registeredCount = await Student.countDocuments({ is_registered: true });

    console.log(`\n📈 Migration Results:`);
    console.log(`   - Total Student records: ${newStudentCount}`);
    console.log(`   - Registered students: ${registeredCount}`);
    console.log(`   - Whitelist only: ${newStudentCount - registeredCount}`);

    console.log('\n✅ Migration 001 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate key error. Check for conflicting records.');
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run migration
migrate();
