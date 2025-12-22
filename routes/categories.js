import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Get all unique categories from products
router.get('/', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    // Filter out null/undefined/empty categories and sort
    const validCategories = categories
      .filter(cat => cat && cat.trim() !== '')
      .sort();
    res.json(validCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

