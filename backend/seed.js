// --- DNS FIX ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ---------------

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs'); // Tool to read files
const path = require('path'); // Tool to find folder paths

// Models
const MasterStudent = require('./models/MasterStudent');
const MasterFaculty = require('./models/MasterFaculty');
const User = require('./models/User'); 
const connectDB = require('./config/db');

dotenv.config();
connectDB();

// --- STEP 1: READ THE DATA FROM FILES ---
// This mimics reading from an external database or Excel file
const students = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'students.json'), 'utf-8')
);

const faculty = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'faculty.json'), 'utf-8')
);

const importData = async () => {
  try {
    // 1. CLEAR OLD DATA
    await MasterStudent.deleteMany();
    await MasterFaculty.deleteMany();
    await User.deleteMany();
    console.log('🗑️  Old Data Cleared...');

    // 2. INSERT NEW DATA FROM FILES
    await MasterStudent.insertMany(students);
    await MasterFaculty.insertMany(faculty);
    console.log(`✅ Imported ${students.length} Students and ${faculty.length} Faculty members!`);
    
    process.exit();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

importData();