import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kalisagad05_db_user:YfnSydiGq13YTLic@cluster0.1wul0sk.mongodb.net/?appName=Cluster0';

async function ensureAdmin() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'wego_ecommerce',
    });
    console.log('✅ Connected to MongoDB');

    const email = 'admin@connectrwanda.com';
    const password = 'admin123';
    const name = 'Admin User';

    let admin = await Admin.findOne({ email });

    if (admin) {
      // Check if password is hashed
      if (admin.password && admin.password.startsWith('$2')) {
        console.log('🔄 Converting hashed password to plain text...');
        await Admin.findByIdAndUpdate(admin._id, {
          password: password
        }, { runValidators: false });
        console.log('✅ Password converted to plain text');
      } else {
        console.log('✓ Admin already exists with plain text password');
      }
    } else {
      // Create new admin
      admin = new Admin({
        email,
        password,
        name,
        role: 'admin',
      });
      await admin.save();
      console.log('✅ Admin created successfully');
    }

    console.log('\n📋 Admin Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

ensureAdmin();

