import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin',
  },
}, {
  timestamps: true,
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare password using bcrypt
adminSchema.methods.comparePassword = async function(candidatePassword) {
  // Trim the candidate password to avoid whitespace issues
  const trimmedPassword = candidatePassword?.trim() || '';
  
  // Check if password is already hashed (starts with $2a$, $2b$, or $2y$)
  // If stored password is not hashed (legacy), do plain text comparison
  if (!this.password.startsWith('$2')) {
    // Legacy plain text password - compare directly (for migration purposes)
    return trimmedPassword === this.password.trim();
  }
  
  // Use bcrypt to compare
  return bcrypt.compare(trimmedPassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;

