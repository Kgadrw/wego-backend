import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from server directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Create transporter with timeout settings
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 5000, // 5 seconds timeout for connection
  greetingTimeout: 5000, // 5 seconds timeout for greeting
  socketTimeout: 5000, // 5 seconds timeout for socket
  // Don't require TLS for connection
  requireTLS: false,
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter connection with timeout
export const verifyEmailConnection = async () => {
  // Only verify if SMTP credentials are provided
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP credentials not configured. Email service will not be available.');
    return false;
  }

  try {
    // Add timeout to verification (5 seconds)
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email verification timeout')), 5000);
    });

    await Promise.race([verifyPromise, timeoutPromise]);
    console.log('✅ Email server is ready to take our messages');
    return true;
  } catch (error) {
    // Don't log full error stack for timeout - just a warning
    if (error.message === 'Email verification timeout' || error.code === 'ETIMEDOUT') {
      console.warn('⚠️ Email server connection timeout. Email service may not be available.');
      console.warn('💡 This is non-critical - the server will continue running.');
    } else {
      console.warn('⚠️ Email server connection error:', error.message);
      console.warn('💡 Email service may not be available until SMTP is properly configured.');
    }
    return false;
  }
};

// Send invoice email
export const sendInvoiceEmail = async (order, pdfBuffer) => {
  try {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP credentials not configured. Skipping email send.');
      return { success: false, error: 'SMTP credentials not configured' };
    }

    const InvoiceSettings = (await import('../models/InvoiceSettings.js')).default;
    const settings = await InvoiceSettings.getSettings();

    const isPaid = order.status === 'Completed';
    const invoiceType = isPaid ? 'Paid Invoice' : 'Invoice';
    
    const mailOptions = {
      from: `"${settings.companyName || 'Wego Connect'}" <${process.env.SMTP_USER}>`,
      to: order.customerEmail,
      replyTo: settings.companyEmail || process.env.SMTP_USER,
      subject: `${invoiceType} for Order ${order.orderId} - ${settings.companyName || 'Wego Connect'}`,
      text: `Dear ${order.customerName},\n\n${isPaid ? 'Payment received! Thank you for your order. ' : 'Thank you for your order! '}Please find your ${isPaid ? 'paid ' : ''}invoice attached.\n\nOrder ID: ${order.orderId}\nTotal: RWF ${order.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}\nStatus: ${isPaid ? 'PAID' : order.status}\n\nIf you have any questions about your order, please reply to this email or contact us at ${settings.companyPhone || 'our customer service'}.\n\nBest regards,\n${settings.companyName || 'Wego Connect'}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #DC2626; font-family: Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #DC2626; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <!-- Logo and Header -->
                    <tr>
                      <td style="padding: 30px 30px 20px 30px; text-align: center;">
                        <img src="cid:wegologo" alt="Wego Connect" style="max-width: 150px; height: auto;" />
                      </td>
                    </tr>
                    
                    <!-- Thank You Heading -->
                    <tr>
                      <td style="padding: 0 30px 20px 30px;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #000000;">${isPaid ? 'Payment Received - Thank You!' : 'Thank you for your order'}</h1>
                      </td>
                    </tr>
                    
                    <!-- Description Text -->
                    <tr>
                      <td style="padding: 0 30px 30px 30px;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #000000;">
                          ${isPaid 
                            ? 'Payment confirmed! We have received your payment and your order is being processed. Please find your paid invoice attached to this email for your records.' 
                            : 'Your order has been successfully placed. Please find your detailed invoice attached to this email for your records.'}
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                      <td style="border-top: 1px solid #e5e7eb; padding: 20px 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <!-- Customer Details (Left) -->
                            <td width="50%" style="vertical-align: top;">
                              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #000000;">Customer Details</p>
                              <p style="margin: 0 0 4px 0; font-size: 14px; color: #000000;">${order.customerName}</p>
                              <p style="margin: 0 0 4px 0; font-size: 14px; color: #000000;">${order.customerAddress}</p>
                              ${order.deliveryLocation ? `<p style="margin: 0; font-size: 14px; color: #000000;">${order.deliveryLocation}</p>` : ''}
                            </td>
                            <!-- Order Details (Right) -->
                            <td width="50%" style="vertical-align: top; text-align: right;">
                              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #DC2626;">Order Information</p>
                              <p style="margin: 0 0 4px 0; font-size: 14px; color: #DC2626;">Order ID: ${order.orderId}</p>
                              <p style="margin: 0 0 4px 0; font-size: 14px; color: #DC2626;">Purchase Date: ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                              <p style="margin: 0; font-size: 14px; color: ${isPaid ? '#10b981' : '#DC2626'}; font-weight: ${isPaid ? 'bold' : 'normal'};">Status: ${isPaid ? 'PAID' : order.status}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                      <td style="border-top: 1px solid #e5e7eb;">
                        <!-- Products Table -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px 30px;">
                          <!-- Table Header -->
                          <tr style="background-color: #f3f4f6;">
                            <td style="padding: 12px; font-size: 14px; font-weight: bold; color: #000000;">Products</td>
                            <td style="padding: 12px; text-align: right; font-size: 14px; font-weight: bold; color: #000000;">Price</td>
                          </tr>
                          <!-- Products -->
                          ${order.items.map((item) => `
                            <tr>
                              <td style="padding: 12px; font-size: 14px; color: #000000; border-bottom: 1px solid #e5e7eb;">
                                ${item.quantity}x ${item.productName || 'Product'}
                              </td>
                              <td style="padding: 12px; text-align: right; font-size: 14px; color: #000000; border-bottom: 1px solid #e5e7eb;">
                                RWF ${(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          `).join('')}
                          <!-- Total -->
                          <tr>
                            <td style="padding: 16px 12px 12px 12px; font-size: 16px; font-weight: bold; color: #000000;">TOTAL</td>
                            <td style="padding: 16px 12px 12px 12px; text-align: right; font-size: 16px; font-weight: bold; color: #000000;">
                              RWF ${order.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                      <td style="border-top: 1px solid #e5e7eb; padding: 30px; text-align: center;">
                        <!-- Social Media Icons -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <!-- Facebook Icon -->
                              <a href="https://facebook.com/wegoconnect" target="_blank" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                                <img src="https://cdn.simpleicons.org/facebook/1877F2" alt="Facebook" width="40" height="40" style="border-radius: 50%; display: block; border: 0;" />
                              </a>
                              <!-- X (Twitter) Icon -->
                              <a href="https://x.com/wegoconnect" target="_blank" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                                <img src="https://cdn.simpleicons.org/x/000000" alt="X" width="40" height="40" style="border-radius: 50%; display: block; border: 0; background-color: #000000;" />
                              </a>
                              <!-- Instagram Icon -->
                              <a href="https://instagram.com/wegoconnect" target="_blank" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                                <img src="https://cdn.simpleicons.org/instagram/E4405F" alt="Instagram" width="40" height="40" style="border-radius: 50%; display: block; border: 0;" />
                              </a>
                              <!-- TikTok Icon -->
                              <a href="https://tiktok.com/@wegoconnect" target="_blank" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                                <img src="https://cdn.simpleicons.org/tiktok/000000" alt="TikTok" width="40" height="40" style="border-radius: 50%; display: block; border: 0; background-color: #000000;" />
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding-top: 10px;">
                              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                Follow us: @wegoconnect
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: `invoice-${order.orderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
        // Embed logo image
        {
          filename: 'wego.png',
          path: join(__dirname, '..', '..', 'public', 'wego.png'),
          cid: 'wegologo', // Content ID for referencing in HTML
        },
      ],
      headers: {
        'X-Entity-Ref-ID': order.orderId,
        'X-Order-Date': new Date(order.createdAt).toISOString(),
      },
      priority: 'normal',
      date: new Date(),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Invoice email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending invoice email:', error);
    return { success: false, error: error.message };
  }
};

export default transporter;

