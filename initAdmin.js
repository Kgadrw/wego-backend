import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kalisagad05_db_user:YfnSydiGq13YTLic@cluster0.1wul0sk.mongodb.net/?appName=Cluster0';

async function initAdmin() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'wego_ecommerce',
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@connectrwanda.com' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      process.exit(0);
    }

    // Create default admin (password stored as plain text)
    const admin = new Admin({
      email: 'admin@connectrwanda.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
    });

    await admin.save();
    console.log('✅ Default admin user created');
    console.log('📧 Email: admin@connectrwanda.com');
    console.log('🔑 Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initAdmin();

