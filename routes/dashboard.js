import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Total Revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Total Orders
    const totalOrders = await Order.countDocuments();

    // Total Products
    const totalProducts = await Product.countDocuments({ isActive: true });

    // Total Customers (unique emails)
    const uniqueCustomers = await Order.distinct('customerEmail');
    const totalCustomers = uniqueCustomers.length;

    // Recent orders
    const recentOrders = await Order.find()
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .limit(5);

    // Out of stock products
    const outOfStockProducts = await Product.find({
      stock: 0,
      isActive: true,
    }).select('name _id category price image');

    // Profit calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYear = new Date(today.getFullYear(), 0, 1);

    // Total profit (all time)
    const totalProfitResult = await Order.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$profit' } } },
    ]);
    const totalProfit = totalProfitResult.length > 0 ? totalProfitResult[0].total : 0;

    // Today's profit
    const todayProfitResult = await Order.aggregate([
      { 
        $match: { 
          status: 'Completed',
          createdAt: { $gte: today }
        } 
      },
      { $group: { _id: null, total: { $sum: '$profit' } } },
    ]);
    const todayProfit = todayProfitResult.length > 0 ? todayProfitResult[0].total : 0;

    // This month's profit
    const monthProfitResult = await Order.aggregate([
      { 
        $match: { 
          status: 'Completed',
          createdAt: { $gte: thisMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$profit' } } },
    ]);
    const monthProfit = monthProfitResult.length > 0 ? monthProfitResult[0].total : 0;

    // This year's profit
    const yearProfitResult = await Order.aggregate([
      { 
        $match: { 
          status: 'Completed',
          createdAt: { $gte: thisYear }
        } 
      },
      { $group: { _id: null, total: { $sum: '$profit' } } },
    ]);
    const yearProfit = yearProfitResult.length > 0 ? yearProfitResult[0].total : 0;

    // Profit by day (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyProfitResult = await Order.aggregate([
      {
        $match: {
          status: 'Completed',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          profit: { $sum: '$profit' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Profit by month (last 12 months)
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyProfitResult = await Order.aggregate([
      {
        $match: {
          status: 'Completed',
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          profit: { $sum: '$profit' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      recentOrders,
      outOfStockProducts,
      profit: {
        total: totalProfit,
        today: todayProfit,
        month: monthProfit,
        year: yearProfit,
        daily: dailyProfitResult,
        monthly: monthlyProfitResult,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

