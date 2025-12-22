import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, isActive } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const productData = { ...req.body };
    
    // Ensure images array exists - if not provided, create from image field
    if (!productData.images || !Array.isArray(productData.images)) {
      productData.images = [];
    }
    
    // If image is provided but not in images array, add it as first image
    if (productData.image && !productData.images.includes(productData.image)) {
      productData.images = [productData.image, ...productData.images];
    }
    
    const product = new Product(productData);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Ensure stock is a number (convert from string if needed)
    if (updateData.stock !== undefined) {
      updateData.stock = parseInt(updateData.stock) || 0;
    }
    
    // Handle discountPrice - convert to number or null
    if (updateData.discountPrice !== undefined) {
      if (updateData.discountPrice === null || updateData.discountPrice === '' || updateData.discountPrice === 'null') {
        updateData.discountPrice = null;
      } else {
        updateData.discountPrice = parseFloat(updateData.discountPrice);
        // Validate discount price is not negative
        if (isNaN(updateData.discountPrice) || updateData.discountPrice < 0) {
          updateData.discountPrice = null;
        }
      }
    }
    
    // Ensure price and purchasingPrice are numbers
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.purchasingPrice !== undefined) {
      updateData.purchasingPrice = parseFloat(updateData.purchasingPrice) || 0;
    }
    
    // Handle images array - ensure it's an array
    if (updateData.images !== undefined) {
      if (!Array.isArray(updateData.images)) {
        updateData.images = [];
      }
      // Ensure primary image is first in the array
      if (updateData.image && !updateData.images.includes(updateData.image)) {
        updateData.images = [updateData.image, ...updateData.images];
      }
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

