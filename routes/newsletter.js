import express from 'express';
import NewsletterSubscriber from '../models/NewsletterSubscriber.js';
import Newsletter from '../models/Newsletter.js';
import NewsletterTemplate from '../models/NewsletterTemplate.js';
import Product from '../models/Product.js';
import { sendNewsletterEmail } from '../utils/newsletterEmailService.js';

const router = express.Router();

// Get all subscribers
router.get('/subscribers', async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const subscribers = await NewsletterSubscriber.find(query)
      .sort({ subscribedAt: -1 });
    
    res.json({
      total: subscribers.length,
      subscribers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add subscriber manually
router.post('/subscribers', async (req, res) => {
  try {
    const { email, name, source } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if subscriber already exists
    let subscriber = await NewsletterSubscriber.findOne({ email: email.toLowerCase() });
    
    if (subscriber) {
      // Update if exists but was inactive
      if (!subscriber.isActive) {
        subscriber.isActive = true;
        subscriber.subscribedAt = new Date();
        if (name) subscriber.name = name;
        if (source) subscriber.source = source;
        await subscriber.save();
      }
      return res.json({ subscriber, message: 'Subscriber already exists' });
    }

    subscriber = new NewsletterSubscriber({
      email: email.toLowerCase(),
      name: name || '',
      source: source || 'manual',
    });

    await subscriber.save();
    res.status(201).json({ subscriber, message: 'Subscriber added successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update subscriber status
router.put('/subscribers/:id', async (req, res) => {
  try {
    const { isActive } = req.body;
    const subscriber = await NewsletterSubscriber.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json({ subscriber, message: 'Subscriber updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete subscriber
router.delete('/subscribers/:id', async (req, res) => {
  try {
    const subscriber = await NewsletterSubscriber.findByIdAndDelete(req.params.id);

    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get newsletter history
router.get('/newsletters', async (req, res) => {
  try {
    const newsletters = await Newsletter.find()
      .populate('productIds')
      .sort({ createdAt: -1 });
    res.json(newsletters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await NewsletterTemplate.find()
      .populate('productIds')
      .sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await NewsletterTemplate.findById(req.params.id)
      .populate('productIds');
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  try {
    const { name, subject, content, productIds, includeLatestProducts, latestProductsCount, isDefault } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: 'Name and subject are required' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await NewsletterTemplate.updateMany({}, { isDefault: false });
    }

    const template = new NewsletterTemplate({
      name,
      subject,
      content: content || '',
      productIds: productIds || [],
      includeLatestProducts: includeLatestProducts || false,
      latestProductsCount: latestProductsCount || 0,
      isDefault: isDefault || false,
    });

    await template.save();
    await template.populate('productIds');
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const { name, subject, content, productIds, includeLatestProducts, latestProductsCount, isDefault } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await NewsletterTemplate.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    const template = await NewsletterTemplate.findByIdAndUpdate(
      req.params.id,
      {
        name,
        subject,
        content: content || '',
        productIds: productIds || [],
        includeLatestProducts: includeLatestProducts || false,
        latestProductsCount: latestProductsCount || 0,
        isDefault: isDefault || false,
      },
      { new: true, runValidators: true }
    ).populate('productIds');

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await NewsletterTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create and send newsletter
router.post('/newsletters/send', async (req, res) => {
  try {
    const { subject, content, productIds, templateId, sendToAll, customEmails, includeLatestProducts, latestProductsCount } = req.body;

    let finalSubject = subject;
    let finalContent = content || '';
    let finalProductIds = productIds || [];

    // If template is provided, use it
    if (templateId) {
      const template = await NewsletterTemplate.findById(templateId).populate('productIds');
      if (template) {
        finalSubject = template.subject;
        finalContent = template.content || finalContent;
        finalProductIds = template.productIds.map((p) => p._id);
        if (template.includeLatestProducts) {
          const latestProducts = await Product.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(template.latestProductsCount || 10);
          const latestIds = latestProducts.map((p) => p._id.toString());
          finalProductIds = [...new Set([...finalProductIds.map((id) => id.toString()), ...latestIds])];
        }
      }
    }

    if (!finalSubject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    // Get products
    let products = [];
    if (finalProductIds && finalProductIds.length > 0) {
      products = await Product.find({
        _id: { $in: finalProductIds },
        isActive: true,
      }).limit(20); // Limit to 20 products for email
    }
    
    // Add latest products if requested
    if (includeLatestProducts || (!templateId && !finalProductIds.length)) {
      const latestProducts = await Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(latestProductsCount || 10);
      
      // Merge with existing products, avoiding duplicates
      const existingIds = products.map((p) => p._id.toString());
      const newProducts = latestProducts.filter((p) => !existingIds.includes(p._id.toString()));
      products = [...products, ...newProducts].slice(0, 20);
    }

    // Get subscribers
    let subscribers = [];
    if (sendToAll) {
      subscribers = await NewsletterSubscriber.find({ isActive: true });
    } else if (customEmails && customEmails.length > 0) {
      subscribers = await NewsletterSubscriber.find({
        email: { $in: customEmails.map((e) => e.toLowerCase()) },
        isActive: true,
      });
    } else {
      return res.status(400).json({ error: 'Either sendToAll or customEmails must be provided' });
    }

    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No active subscribers found' });
    }

    // Create newsletter record
    const newsletter = new Newsletter({
      subject: finalSubject,
      content: finalContent,
      productIds: products.map((p) => p._id),
      status: 'sending',
    });
    await newsletter.save();

    // Send emails asynchronously
    (async () => {
      let sentCount = 0;
      let failedCount = 0;

      for (const subscriber of subscribers) {
        try {
          await sendNewsletterEmail(subscriber.email, {
            subject: finalSubject,
            content: finalContent,
            products,
            subscriberName: subscriber.name || subscriber.email.split('@')[0],
          });

          // Update subscriber stats
          subscriber.lastEmailSent = new Date();
          subscriber.totalEmailsSent = (subscriber.totalEmailsSent || 0) + 1;
          await subscriber.save();

          sentCount++;
        } catch (error) {
          console.error(`Failed to send email to ${subscriber.email}:`, error);
          failedCount++;
        }
      }

      // Update newsletter status
      newsletter.status = failedCount > 0 && sentCount === 0 ? 'failed' : 'sent';
      newsletter.sentTo = sentCount;
      newsletter.sentAt = new Date();
      await newsletter.save();

      console.log(`✅ Newsletter sent: ${sentCount} successful, ${failedCount} failed`);
    })();

    res.json({
      success: true,
      message: 'Newsletter is being sent',
      newsletterId: newsletter._id,
      totalSubscribers: subscribers.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent products for newsletter selection
router.get('/products/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

