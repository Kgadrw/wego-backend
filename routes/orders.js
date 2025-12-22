import express from 'express';
import Order from '../models/Order.js';
import NewsletterSubscriber from '../models/NewsletterSubscriber.js';
import { sendInvoiceEmail } from '../utils/emailService.js';
import { generateInvoicePDFBuffer } from '../utils/generateInvoicePDF.js';

const router = express.Router();

// Generate unique order ID
const generateOrderId = () => {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
};

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await Order.find(query)
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      orderId: generateOrderId(),
      status: 'Pending', // Set to Pending - admin will confirm payment before sending invoice
    };
    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    // Calculate profit and purchasing prices (but don't reduce stock yet - wait for payment confirmation)
    const Product = (await import('../models/Product.js')).default;
    let totalProfit = 0;
    const updatedItems = [];
    
    for (const item of savedOrder.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        // Calculate profit for this item
        const purchasingPrice = product.purchasingPrice || 0;
        const sellingPrice = item.price;
        const itemProfit = (sellingPrice - purchasingPrice) * item.quantity;
        totalProfit += itemProfit;
        
        // Store updated item with purchasing price
        updatedItems.push({
          ...item.toObject(),
          purchasingPrice: purchasingPrice,
        });
      } else {
        updatedItems.push(item.toObject());
      }
    }
    
    // Update order with profit and item purchasing prices
    savedOrder.profit = totalProfit;
    savedOrder.items = updatedItems;
    await savedOrder.save();
    
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('items.productId');
    
    // Save customer email to newsletter subscribers (async)
    (async () => {
      try {
        const subscriberEmail = savedOrder.customerEmail.toLowerCase();
        let subscriber = await NewsletterSubscriber.findOne({ email: subscriberEmail });
        
        if (!subscriber) {
          subscriber = new NewsletterSubscriber({
            email: subscriberEmail,
            name: savedOrder.customerName,
            source: 'order',
          });
          await subscriber.save();
          console.log(`✅ Added ${subscriberEmail} to newsletter subscribers`);
        } else if (!subscriber.isActive) {
          // Reactivate if previously unsubscribed
          subscriber.isActive = true;
          subscriber.name = savedOrder.customerName;
          await subscriber.save();
          console.log(`✅ Reactivated ${subscriberEmail} in newsletter subscribers`);
        }
      } catch (subscriberError) {
        console.error('❌ Error saving newsletter subscriber:', subscriberError);
      }
    })();

    // Do NOT send invoice automatically - wait for admin to confirm payment
    res.status(201).json(populatedOrder.toObject());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Processing', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id).populate('items.productId');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    // If status changed to "Completed", reduce stock and send invoice
    if (status === 'Completed' && oldStatus !== 'Completed') {
      const Product = (await import('../models/Product.js')).default;
      const outOfStockProducts = [];
      
      // Reduce product stock
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const oldStock = product.stock || 0;
          const newStock = Math.max(0, oldStock - item.quantity);
          product.stock = newStock;
          
          // If stock becomes 0 and it wasn't 0 before, add to out of stock list
          if (newStock === 0 && oldStock > 0) {
            outOfStockProducts.push(product.name);
          }
          
          await product.save();
        }
      }

      // Send invoice via email (async, don't wait for it to complete)
      (async () => {
        try {
          const pdfBuffer = await generateInvoicePDFBuffer(order.orderId);
          await sendInvoiceEmail(order, pdfBuffer);
          console.log(`✅ Invoice email sent for order ${order.orderId}`);
        } catch (emailError) {
          console.error('❌ Error sending invoice email:', emailError);
        }
      })();

      // Include low stock alert in response if any products are out of stock
      const response = order.toObject();
      if (outOfStockProducts.length > 0) {
        response.lowStockAlert = {
          message: `The following products are now out of stock: ${outOfStockProducts.join(', ')}`,
          products: outOfStockProducts
        };
      }
      return res.json(response);
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update entire order
router.put('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('items.productId');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

