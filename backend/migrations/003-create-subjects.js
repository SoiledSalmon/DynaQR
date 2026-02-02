/**
 * Migration: 003 - Create Subjects
 *
 * Creates Subject records either from:
 * 1. Existing Session.subject values (if sessions exist)
 * 2. The subjects.json seed file (if no sessions exist)
 *
 * Strategy:
 * 1. Check if sessions exist
 * 2. If yes, extract unique subject names and generate codes
 * 3. If no, load from subjects.json
 * 4. Create Subject records
 *
 * Note: Subject codes are auto-generated from session data. Manual review recommended.
 */

// --- DNS FIX ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ---------------

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Models
const Session = require('../models/Session');
const Subject = require('../models/Subject');

const connectDB = require('../config/db');

// Map of common subject names to codes (extend as needed)
const SUBJECT_CODE_MAP = {
  'maths': 'MAT101',
  'mathematics': 'MAT101',
  'mathematics iii': 'MAT201',
  'physics': 'PHY101',
  'chemistry': 'CHE101',
  'computer networks': 'CS301',
  'data structures': 'CS201',
  'algorithms': 'CS202',
  'database': 'CS303',
  'database systems': 'CS302',
  'operating systems': 'CS303',
  'software engineering': 'CS401',
  'machine learning': 'CS501',
  'artificial intelligence': 'CS502'
};

// Default department for unknown subjects
const DEFAULT_DEPARTMENT = 'GEN';

function generateSubjectCode(name, index) {
  const normalized = name.toLowerCase().trim();

  // Check known mappings
  if (SUBJECT_CODE_MAP[normalized]) {
    return SUBJECT_CODE_MAP[normalized];
  }

  // Generate code from first 3 letters + index
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'GEN';
  return `${prefix}${String(100 + index).padStart(3, '0')}`;
}

function inferDepartment(subjectName) {
  const name = subjectName.toLowerCase();

  if (name.includes('computer') || name.includes('programming') || name.includes('software')) {
    return 'CSE';
  }
  if (name.includes('network') || name.includes('data')) {
    return 'CSE';
  }
  if (name.includes('math') || name.includes('calculus') || name.includes('algebra')) {
    return 'MATH';
  }
  if (name.includes('physics') || name.includes('mechanics')) {
    return 'PHY';
  }
  if (name.includes('chemistry')) {
    return 'CHE';
  }
  if (name.includes('electronics') || name.includes('circuit')) {
    return 'ECE';
  }

  return DEFAULT_DEPARTMENT;
}

async function migrate() {
  console.log('🚀 Starting Migration 003: Create Subjects...\n');

  try {
    await connectDB();

    // Step 1: Check if subjects already exist
    const existingSubjects = await Subject.find({}).lean();
    const existingNames = new Set(existingSubjects.map(s => s.name.toLowerCase()));
    const existingCodes = new Set(existingSubjects.map(s => s.code.toUpperCase()));

    console.log(`📊 Existing subjects in collection: ${existingSubjects.length}`);

    // Step 2: Try to get subjects from sessions first
    const sessions = await Session.find({}).select('subject').lean();

    let subjectsToCreate = [];

    if (sessions.length > 0) {
      console.log(`📊 Found ${sessions.length} sessions`);

      // Extract unique subject names, filtering out undefined/null
      const uniqueSubjects = [...new Set(
        sessions
          .filter(s => s.subject && typeof s.subject === 'string')
          .map(s => s.subject.trim())
      )];

      console.log(`📊 Found ${uniqueSubjects.length} unique subject names in sessions\n`);

      // Generate subject records from session data
      let index = existingSubjects.length;
      for (const name of uniqueSubjects) {
        if (existingNames.has(name.toLowerCase())) {
          console.log(`   ⏭️  Skipping "${name}" (already exists)`);
          continue;
        }

        const code = generateSubjectCode(name, index);

        // Check if code already exists
        if (existingCodes.has(code.toUpperCase())) {
          console.log(`   ⚠️  Code conflict for "${name}", generating alternative`);
          const altCode = `GEN${String(200 + index).padStart(3, '0')}`;
          subjectsToCreate.push({ code: altCode, name: name.trim(), department: inferDepartment(name) });
        } else {
          subjectsToCreate.push({ code, name: name.trim(), department: inferDepartment(name) });
        }

        console.log(`   ➕ Will create: ${code} - "${name}" (${inferDepartment(name)})`);
        index++;
      }
    } else {
      console.log('📊 No sessions found. Loading subjects from seed file...\n');

      // Load from subjects.json
      const subjectsFilePath = path.join(__dirname, '..', 'data', 'subjects.json');

      if (!fs.existsSync(subjectsFilePath)) {
        console.log('⚠️  No subjects.json found. Creating empty Subject collection.');
        console.log('   You can add subjects manually or run seed-v2.js later.');
      } else {
        const seedSubjects = JSON.parse(fs.readFileSync(subjectsFilePath, 'utf-8'));

        for (const s of seedSubjects) {
          if (existingCodes.has(s.code.toUpperCase())) {
            console.log(`   ⏭️  Skipping "${s.name}" (code ${s.code} already exists)`);
            continue;
          }
          if (existingNames.has(s.name.toLowerCase())) {
            console.log(`   ⏭️  Skipping "${s.name}" (name already exists)`);
            continue;
          }

          subjectsToCreate.push({
            code: s.code.toUpperCase(),
            name: s.name,
            department: s.department
          });

          console.log(`   ➕ Will create: ${s.code} - "${s.name}" (${s.department})`);
        }
      }
    }

    // Step 3: Insert new subjects
    if (subjectsToCreate.length > 0) {
      await Subject.insertMany(subjectsToCreate);
      console.log(`\n✅ Created ${subjectsToCreate.length} new subject(s)`);
    } else {
      console.log('\n✅ No new subjects to create');
    }

    // Step 4: Summary
    const totalSubjects = await Subject.countDocuments();
    console.log(`\n📈 Total subjects in collection: ${totalSubjects}`);

    if (sessions.length > 0) {
      console.log('\n⚠️  IMPORTANT: Review generated subject codes and departments manually!');
      console.log('   Run: db.subjects.find() to verify\n');
    }

    console.log('✅ Migration 003 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate key error. Subject code conflict.');
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run migration
migrate();
