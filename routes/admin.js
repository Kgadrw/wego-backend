import express from 'express';
import Admin from '../models/Admin.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Normalize and trim email and password
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedPassword) {
      return res.status(400).json({ error: 'Email and password cannot be empty' });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      console.log(`❌ Login attempt with non-existent email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Debug logging
    console.log(`🔍 Login attempt for: ${normalizedEmail}`);
    console.log(`🔍 Stored password length: ${admin.password ? admin.password.length : 0}`);
    console.log(`🔍 Stored password starts with $2 (hashed): ${admin.password && admin.password.startsWith('$2')}`);
    console.log(`🔍 Provided password length: ${trimmedPassword.length}`);

    // Compare password (plain text comparison)
    const isMatch = await admin.comparePassword(trimmedPassword);
    
    if (!isMatch) {
      console.log(`❌ Login attempt with incorrect password for: ${normalizedEmail}`);
      console.log(`🔍 Password comparison failed`);
      console.log(`🔍 Stored password: ${admin.password ? admin.password.substring(0, 20) + '...' : 'null'}`);
      console.log(`🔍 Provided password: ${trimmedPassword.substring(0, 20)}...`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`✅ Admin login successful: ${normalizedEmail}`);
    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
});

// Create admin (for initial setup)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Normalize and validate
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    if (!normalizedEmail || !trimmedPassword || !trimmedName) {
      return res.status(400).json({ error: 'Email, password, and name cannot be empty' });
    }

    // Validate password length
    if (trimmedPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this email already exists' });
    }

    const admin = new Admin({ 
      email: normalizedEmail, 
      password: trimmedPassword, // Stored as plain text
      name: trimmedName,
      role: 'admin'
    });
    await admin.save();

    console.log(`✅ Admin created: ${normalizedEmail}`);
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error('❌ Admin registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Initialize default admin (for first-time setup)
router.post('/init', async (req, res) => {
  try {
    const defaultEmail = 'admin@connectrwanda.com';
    const defaultPassword = 'admin123';
    const defaultName = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: defaultEmail });
    if (existingAdmin) {
      return res.status(200).json({
        success: true,
        message: 'Default admin already exists',
        admin: {
          email: existingAdmin.email,
          name: existingAdmin.name,
        },
      });
    }

    // Create default admin (password stored as plain text)
    const admin = new Admin({
      email: defaultEmail,
      password: defaultPassword,
      name: defaultName,
      role: 'admin',
    });
    await admin.save();

    console.log(`✅ Default admin created: ${defaultEmail}`);
    res.status(201).json({
      success: true,
      message: 'Default admin created successfully',
      credentials: {
        email: defaultEmail,
        password: defaultPassword,
      },
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error('❌ Admin initialization error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Reset admin password (for troubleshooting)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Update password (stored as plain text)
    admin.password = newPassword.trim();
    admin.markModified('password');
    await admin.save();

    console.log(`✅ Password reset for: ${normalizedEmail}`);
    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Ensure admin exists (for testing/setup)
router.post('/ensure-admin', async (req, res) => {
  try {
    const email = 'admin@connectrwanda.com';
    const password = 'admin123';
    const name = 'Admin User';

    let admin = await Admin.findOne({ email });

    if (admin) {
      // Update password to plain text if it's hashed
      if (admin.password && admin.password.startsWith('$2')) {
        console.log(`🔄 Converting hashed password to plain text`);
        admin.password = password;
        admin.markModified('password');
        await admin.save();
      }
      
      return res.json({
        success: true,
        message: 'Admin already exists',
        admin: {
          email: admin.email,
          name: admin.name,
          passwordIsPlainText: !admin.password.startsWith('$2'),
        },
      });
    }

    // Create new admin
    admin = new Admin({
      email,
      password,
      name,
      role: 'admin',
    });
    await admin.save();

    console.log(`✅ Admin created: ${email}`);
    res.json({
      success: true,
      message: 'Admin created successfully',
      credentials: {
        email,
        password,
      },
    });
  } catch (error) {
    console.error('❌ Ensure admin error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

