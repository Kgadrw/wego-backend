import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  status: {
    type: String,
    enum: ['draft', 'sending', 'sent', 'failed'],
    default: 'draft',
  },
  sentTo: {
    type: Number,
    default: 0,
  },
  sentAt: {
    type: Date,
  },
  sentBy: {
    type: String,
    default: 'admin',
  },
}, {
  timestamps: true,
});

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

export default Newsletter;

