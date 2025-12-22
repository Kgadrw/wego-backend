import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from server directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Create transporter (reuse from emailService if possible, but create new one for clarity)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Format price for display
const formatPrice = (price) => {
  return `RWF ${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Generate website URL
const getWebsiteUrl = () => {
  return process.env.WEBSITE_URL || 'http://localhost:5173';
};

// Send newsletter email with product listings
export const sendNewsletterEmail = async (email, { subject, content, products, subscriberName }) => {
  try {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP credentials not configured. Skipping newsletter email send.');
      return { success: false, error: 'SMTP credentials not configured' };
    }

    const InvoiceSettings = (await import('../models/InvoiceSettings.js')).default;
    const settings = await InvoiceSettings.getSettings();
    const websiteUrl = getWebsiteUrl();

    // Generate product cards HTML (2 columns layout)
    const productsHTML = products.length > 0 ? products.reduce((acc, product, index) => {
      const finalPrice = (product.discountPrice && product.discountPrice < product.price)
        ? product.discountPrice
        : product.price;
      const originalPrice = (product.discountPrice && product.discountPrice < product.price)
        ? product.price
        : null;
      const productUrl = `${websiteUrl}/product/${product._id}`;

      const productCard = `
        <td width="50%" style="padding: 10px; text-align: center; vertical-align: top;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 15px; text-align: center;">
                <a href="${productUrl}" style="display: inline-block; text-decoration: none;">
                  <img src="${product.image}" alt="${product.name}" style="max-width: 100%; height: 180px; object-fit: contain; border-radius: 8px;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 15px 15px 15px; text-align: center;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #000000; line-height: 1.3;">
                  <a href="${productUrl}" style="color: #000000; text-decoration: none;">${product.name}</a>
                </h3>
                ${originalPrice ? `
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #9ca3af; text-decoration: line-through;">
                    ${formatPrice(originalPrice)}
                  </p>
                ` : ''}
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #DC2626;">
                  ${formatPrice(finalPrice)}
                </p>
                <a href="${productUrl}" style="display: inline-block; padding: 10px 20px; background-color: #DC2626; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px;">
                  View Product
                </a>
              </td>
            </tr>
          </table>
        </td>
      `;

      // Start new row every 2 products
      if (index % 2 === 0) {
        acc += '<tr>';
      }
      acc += productCard;
      if (index % 2 === 1 || index === products.length - 1) {
        acc += '</tr>';
      }
      return acc;
    }, '') : '<tr><td style="padding: 20px; text-align: center; color: #6b7280;">No products available at the moment.</td></tr>';

    const mailOptions = {
      from: `"${settings.companyName || 'Wego Connect'}" <${process.env.SMTP_USER}>`,
      to: email,
      replyTo: settings.companyEmail || process.env.SMTP_USER,
      subject: subject,
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

                    <!-- Greeting -->
                    <tr>
                      <td style="padding: 0 30px 20px 30px;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #000000;">
                          Hello ${subscriberName}!
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    ${content ? `
                    <tr>
                      <td style="padding: 0 30px 30px 30px;">
                        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #000000;">
                          ${content.replace(/\n/g, '<br>')}
                        </p>
                      </td>
                    </tr>
                    ` : ''}

                    <!-- Products Section -->
                    <tr>
                      <td style="padding: 0 30px 20px 30px;">
                        <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #DC2626; text-align: center;">
                          ${products.length > 0 ? 'Check Out Our Latest Products' : 'New Products Coming Soon'}
                        </h2>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${productsHTML}
                        </table>
                      </td>
                    </tr>

                    <!-- Call to Action -->
                    <tr>
                      <td style="padding: 20px 30px 30px 30px; text-align: center;">
                        <a href="${websiteUrl}" style="display: inline-block; padding: 15px 30px; background-color: #DC2626; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                          Visit Our Store
                        </a>
                      </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                      <td style="border-top: 1px solid #e5e7eb;">
                        <!-- Social Media Icons -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 30px; text-align: center;">
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
                              <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
                                <a href="${websiteUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
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
        // Embed logo image
        {
          filename: 'wego.png',
          path: join(__dirname, '..', '..', 'public', 'wego.png'),
          cid: 'wegologo',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Newsletter email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending newsletter email to ${email}:`, error);
    throw error;
  }
};

export default transporter;

