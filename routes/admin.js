import express from 'express';
import Admin from '../models/Admin.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Find admin by email
    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      console.log(`❌ Login attempt with non-existent email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      console.log(`❌ Login attempt with incorrect password for: ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log(`✅ Admin login successful: ${normalizedEmail}`);
    // In production, you would generate a JWT token here
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
    res.status(500).json({ error: error.message });
  }
});

// Create admin (for initial setup)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this email already exists' });
    }

    const admin = new Admin({ 
      email: normalizedEmail, 
      password, 
      name,
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
    const defaultEmail = 'admin@wego.com';
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

    // Create default admin
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

export default router;

