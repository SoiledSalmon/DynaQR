const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // This reads the link from your .env file
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.error('Database Connection Failed:', err.message);
    process.exit(1); // Stop the app if DB fails
  }
};

module.exports = connectDB;