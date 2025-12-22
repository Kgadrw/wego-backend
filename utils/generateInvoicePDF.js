import PDFDocument from 'pdfkit';
import Order from '../models/Order.js';
import InvoiceSettings from '../models/InvoiceSettings.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to format price
const formatPriceValue = (price) => {
  return `RWF ${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Generate PDF invoice as buffer (for email attachment)
export const generateInvoicePDFBuffer = async (orderId) => {
  try {
    // Find order by orderId
    const order = await Order.findOne({ orderId }).populate('items.productId');
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Get invoice settings
    const settings = await InvoiceSettings.getSettings();

    // Create PDF document buffer
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    
    doc.on('data', (chunk) => buffers.push(chunk));

    // Header section with logo
    try {
      const logoPath = join(__dirname, '..', '..', 'public', 'wego.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 100, height: 100, fit: [100, 100] });
        doc.moveDown(3);
      } else {
        doc.moveDown(2);
      }
    } catch (error) {
      console.error('Error loading logo:', error);
      doc.moveDown(2);
    }

    // Company information
    doc.fontSize(20).font('Helvetica-Bold').text(settings.companyName || 'Wego Connect', { align: 'right' });
    doc.moveDown(0.5);
    
    if (settings.companyAddress) {
      doc.fontSize(10).font('Helvetica').text(settings.companyAddress, { align: 'right' });
      doc.moveDown(0.3);
    }
    if (settings.companyPhone) {
      doc.fontSize(10).font('Helvetica').text(`Phone: ${settings.companyPhone}`, { align: 'right' });
      doc.moveDown(0.3);
    }
    if (settings.companyEmail) {
      doc.fontSize(10).font('Helvetica').text(`Email: ${settings.companyEmail}`, { align: 'right' });
      doc.moveDown(0.3);
    }

    doc.moveDown(2);

    // Invoice title
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'left' });
    doc.moveDown(1);

    // Invoice details
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice Number: ${settings.invoicePrefix}-${order.orderId}`, 50, doc.y);
    doc.text(`Order ID: ${order.orderId}`, 50, doc.y + 15);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, doc.y + 15);
    if (order.status === 'Completed') {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('green');
      doc.text(`Status: PAID`, 50, doc.y + 15);
      doc.fillColor('black');
    } else {
      doc.text(`Status: ${order.status}`, 50, doc.y + 15);
    }
    
    doc.moveDown(2);

    // Bill To section
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', { continued: false });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(order.customerName);
    doc.text(order.customerAddress);
    doc.text(`Phone: ${order.customerPhone}`);
    doc.text(`Email: ${order.customerEmail}`);
    if (order.deliveryLocation) {
      doc.text(`Delivery Location: ${order.deliveryLocation}`);
    }

    doc.moveDown(2);

    // Items table
    const tableTop = doc.y;
    const itemHeight = 30;
    
    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', 50, tableTop);
    doc.text('Quantity', 250, tableTop);
    doc.text('Price', 350, tableTop);
    doc.text('Total', 450, tableTop);
    
    // Draw header line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    let currentY = tableTop + 25;
    doc.fontSize(10).font('Helvetica');
    
    order.items.forEach((item) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
      
      doc.text(item.productName || 'Product', 50, currentY, { width: 200 });
      doc.text(item.quantity.toString(), 250, currentY);
      doc.text(formatPriceValue(item.price), 350, currentY);
      doc.text(formatPriceValue(item.price * item.quantity), 450, currentY);
      
      currentY += itemHeight;
    });

    // Draw bottom line
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 20;

    // Totals
    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', 350, currentY);
    doc.text(formatPriceValue(order.subtotal), 450, currentY, { align: 'right' });
    currentY += 20;

    if (order.shipping > 0) {
      doc.text('Shipping:', 350, currentY);
      doc.text(formatPriceValue(order.shipping), 450, currentY, { align: 'right' });
      currentY += 20;
    }

    if (order.tax > 0) {
      doc.text('Tax:', 350, currentY);
      doc.text(formatPriceValue(order.tax), 450, currentY, { align: 'right' });
      currentY += 20;
    }

    // Total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 350, currentY);
    doc.text(formatPriceValue(order.total), 450, currentY, { align: 'right' });

    // Footer
    doc.fontSize(8).font('Helvetica');
    doc.text(
      settings.footerText || 'Thank you for your business!',
      50,
      750,
      { align: 'center', width: 500 }
    );

    // Add "PAID" stamp if order is completed
    if (order.status === 'Completed') {
      try {
        const paidStampPath = join(__dirname, '..', '..', 'public', 'paid.png');
        if (fs.existsSync(paidStampPath)) {
          const pageWidth = doc.page.width;
          const pageHeight = doc.page.height;
          const stampWidth = 150;
          const stampHeight = 150;
          const x = pageWidth - stampWidth - 100;
          const y = pageHeight / 2 - stampHeight / 2;
          
          doc.image(paidStampPath, x, y, { 
            width: stampWidth, 
            height: stampHeight,
            fit: [stampWidth, stampHeight]
          });
        }
      } catch (error) {
        console.error('Error loading paid stamp:', error);
      }
    }

    // Wait for PDF to finish generating and return buffer
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Finalize PDF
      doc.end();
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
};

