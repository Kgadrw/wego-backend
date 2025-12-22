# Email Setup Guide

To successfully send invoice emails, you need to configure SMTP settings in your environment variables.

## Step 1: Create a `.env` file

Create a `.env` file in the `server` directory if it doesn't exist.

## Step 2: Add SMTP Configuration

Add the following environment variables to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Step 3: Choose Your Email Provider

### Option A: Gmail (Recommended for Testing)

**Requirements:**
1. A Gmail account
2. 2-Step Verification enabled
3. An App Password (not your regular Gmail password)

**Steps to get Gmail App Password:**
1. Go to your Google Account: https://myaccount.google.com
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", enable **2-Step Verification** (if not already enabled)
4. After enabling 2-Step Verification, go back to Security
5. Under "Signing in to Google", click on **App passwords**
6. Select "Mail" as the app and "Other" as the device
7. Enter a name like "Wego E-Commerce Server"
8. Click "Generate"
9. Copy the 16-character password (without spaces)
10. Use this password as your `SMTP_PASS` in the `.env` file

**Your `.env` file should look like:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=kalisagad05@gmail.com
SMTP_PASS=itstoorate
```

### Option B: Other Email Providers

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

**Yahoo Mail:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

**Custom SMTP Server:**
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
```

## Step 4: Verify Configuration

1. Start your server: `npm run dev:server`
2. Check the console output. You should see:
   - `✅ Email server is ready to take our messages` (if configured correctly)
   - OR `❌ Email server connection error:` (if there's an issue)

## Step 5: Test Email Sending

1. Create a test order through your frontend
2. Check the server console for:
   - `✅ Invoice email sent: <message-id>` (success)
   - OR `❌ Error sending invoice email:` (failure)
3. Check the customer's email inbox (and spam folder)

## Troubleshooting

### Error: "Invalid login"
- **Gmail**: Make sure you're using an App Password, not your regular password
- **Other providers**: Verify your username and password are correct

### Error: "Connection timeout"
- Check your firewall settings
- Verify SMTP_HOST and SMTP_PORT are correct for your provider
- Some networks block SMTP ports - try port 465 with `secure: true`

### Email not received
- Check spam/junk folder
- Verify the customer email address is correct
- Check server logs for errors
- Verify SMTP credentials are correct

### "SMTP credentials not configured"
- Make sure your `.env` file is in the `server` directory
- Restart your server after adding/changing `.env` variables
- Verify `SMTP_USER` and `SMTP_PASS` are set (not empty)

## Security Note

⚠️ **Never commit your `.env` file to version control!**

Make sure `.env` is in your `.gitignore` file to keep your credentials secure.

