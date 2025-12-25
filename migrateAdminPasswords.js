import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kalisagad05_db_user:YfnSydiGq13YTLic@cluster0.1wul0sk.mongodb.net/?appName=Cluster0';

async function migrateAdminPasswords() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'wego_ecommerce',
    });
    console.log('✅ Connected to MongoDB');

    // Find all admins with plain text passwords (not starting with $2)
    const admins = await Admin.find({});
    console.log(`📋 Found ${admins.length} admin(s) to check`);

    let migratedCount = 0;

    for (const admin of admins) {
      // Check if password is already hashed
      if (admin.password && !admin.password.startsWith('$2')) {
        console.log(`🔄 Migrating password for admin: ${admin.email}`);
        
        // Hash the plain text password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        
        // Update the admin with hashed password (bypass pre-save hook)
        await Admin.findByIdAndUpdate(admin._id, {
          password: hashedPassword
        }, { runValidators: false });
        
        migratedCount++;
        console.log(`✅ Password migrated for: ${admin.email}`);
      } else {
        console.log(`✓ Password already hashed for: ${admin.email}`);
      }
    }

    if (migratedCount > 0) {
      console.log(`\n✅ Successfully migrated ${migratedCount} admin password(s)`);
    } else {
      console.log(`\n✓ All admin passwords are already hashed`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateAdminPasswords();

