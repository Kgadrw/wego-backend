import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import dashboardRoutes from './routes/dashboard.js';
import uploadRoutes from './routes/upload.js';
import categoryRoutes from './routes/categories.js';
import invoiceRoutes from './routes/invoices.js';
import newsletterRoutes from './routes/newsletter.js';
import { verifyEmailConnection } from './utils/emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kalisagad05_db_user:YfnSydiGq13YTLic@cluster0.1wul0sk.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  dbName: 'wego_ecommerce',
  serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  connectTimeoutMS: 10000, // Give up initial connection after 10s
  retryWrites: true,
  w: 'majority',
})
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Troubleshooting tips:');
    console.error('   1. Check if your MongoDB Atlas cluster is running (not paused)');
    console.error('   2. Verify your network connection');
    console.error('   3. Check if your IP address is whitelisted in MongoDB Atlas');
    console.error('   4. Try accessing MongoDB Atlas dashboard to verify cluster status');
    console.error('   5. If using a VPN, try disconnecting and reconnecting');
    // Don't exit on connection error - allow server to start but log the error
    // process.exit(1);
  });

// Ensure admin exists on startup (non-blocking)
setTimeout(async () => {
  try {
    const Admin = (await import('./models/Admin.js')).default;
    const admin = await Admin.findOne({ email: 'admin@connectrwanda.com' });
    
    if (!admin) {
      console.log('📋 Creating default admin account...');
      const newAdmin = new Admin({
        email: 'admin@connectrwanda.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
      });
      await newAdmin.save();
      console.log('✅ Default admin created: admin@connectrwanda.com / admin123');
    } else {
      // Check if password is hashed and convert to plain text if needed
      if (admin.password && admin.password.startsWith('$2')) {
        console.log('🔄 Converting hashed password to plain text...');
        admin.password = 'admin123';
        admin.markModified('password');
        await admin.save();
        console.log('✅ Password converted to plain text');
      }
    }
  } catch (error) {
    console.error('⚠️  Could not ensure admin exists:', error.message);
  }
}, 3000); // Wait 3 seconds after server starts

// Verify email connection on startup (non-blocking, with timeout)
// This runs asynchronously and won't block server startup
setTimeout(() => {
  verifyEmailConnection().catch(() => {
    // Error already handled in verifyEmailConnection
  });
}, 2000); // Wait 2 seconds after server starts to verify email

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

export default app;

