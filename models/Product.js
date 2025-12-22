import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  purchasingPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountPrice: {
    type: Number,
    default: null,
    min: [0, 'Discount price cannot be negative'],
    validate: {
      validator: function(value) {
        // Allow null or valid number >= 0
        return value === null || (typeof value === 'number' && value >= 0);
      },
      message: 'Discount price must be a positive number or null'
    }
  },
  monthlyPrice: {
    type: Number,
    min: 0,
  },
  image: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    default: [],
  },
  category: {
    type: String,
    default: 'Uncategorized',
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Product = mongoose.model('Product', productSchema);

export default Product;

