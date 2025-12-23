import mongoose from 'mongoose';

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

// Password is stored in plain text (no hashing)

// Method to compare password (plain text comparison)
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return candidatePassword === this.password;
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;

