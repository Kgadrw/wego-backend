import mongoose from 'mongoose';

const invoiceSettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'Wego Connect',
  },
  companyAddress: {
    type: String,
    default: '',
  },
  companyPhone: {
    type: String,
    default: '',
  },
  companyEmail: {
    type: String,
    default: '',
  },
  companyLogo: {
    type: String,
    default: '',
  },
  invoicePrefix: {
    type: String,
    default: 'INV',
  },
  footerText: {
    type: String,
    default: 'Thank you for your business!',
  },
  showLogo: {
    type: Boolean,
    default: true,
  },
  primaryColor: {
    type: String,
    default: '#DC2626', // red-600
  },
}, {
  timestamps: true,
});

// Only allow one settings document
invoiceSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const InvoiceSettings = mongoose.model('InvoiceSettings', invoiceSettingsSchema);

export default InvoiceSettings;

