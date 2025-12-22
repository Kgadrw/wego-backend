import mongoose from 'mongoose';

const newsletterTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
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
  includeLatestProducts: {
    type: Boolean,
    default: false,
  },
  latestProductsCount: {
    type: Number,
    default: 0,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: String,
    default: 'admin',
  },
}, {
  timestamps: true,
});

const NewsletterTemplate = mongoose.model('NewsletterTemplate', newsletterTemplateSchema);

export default NewsletterTemplate;

