import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kalisagad05_db_user:YfnSydiGq13YTLic@cluster0.1wul0sk.mongodb.net/?appName=Cluster0';

async function removePasswordHashing() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'wego_ecommerce',
    });
    console.log('✅ Connected to MongoDB');

    // Find all admins
    const admins = await Admin.find({});
    console.log(`📋 Found ${admins.length} admin(s)`);

    let updatedCount = 0;

    for (const admin of admins) {
      // Check if password is hashed (starts with $2)
      if (admin.password && admin.password.startsWith('$2')) {
        console.log(`🔄 Converting hashed password to plain text for: ${admin.email}`);
        
        // Reset to default password (you can change this)
        const defaultPassword = 'admin123';
        
        // Update password to plain text (bypass any hooks)
        await Admin.findByIdAndUpdate(admin._id, {
          password: defaultPassword
        }, { runValidators: false });
        
        updatedCount++;
        console.log(`✅ Password reset to plain text for: ${admin.email}`);
        console.log(`   New password: ${defaultPassword}`);
      } else {
        console.log(`✓ Password already plain text for: ${admin.email}`);
      }
    }

    if (updatedCount > 0) {
      console.log(`\n✅ Successfully converted ${updatedCount} admin password(s) to plain text`);
    } else {
      console.log(`\n✓ All admin passwords are already plain text`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removePasswordHashing();

