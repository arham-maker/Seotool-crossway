# MongoDB Connection String Fix Guide

## Current Error
```
Database authentication failed. Please check your MongoDB credentials.
```

This means your MongoDB username or password is incorrect in the connection string.

## Quick Fix - Step by Step

### Method 1: Use MongoDB Atlas Connection String (Easiest)

1. **Go to MongoDB Atlas:**
   - Visit: https://cloud.mongodb.com/
   - Login to your account

2. **Get Connection String:**
   - Click **Database** (left sidebar)
   - Click **Connect** button on your cluster
   - Choose **Connect your application**
   - Select **Node.js** and version **5.5 or later**
   - Copy the connection string

3. **Update the Connection String:**
   - The connection string will look like:
     ```
     mongodb+srv://<username>:<password>@crosswaycluster.fupytmq.mongodb.net/?retryWrites=true&w=majority&appName=CrosswayCluster
     ```
   - Replace `<username>` with your actual username
   - Replace `<password>` with your actual password (MongoDB Atlas will show it)
   - Add `/crossway-tool` before the `?` to specify the database:
     ```
     mongodb+srv://username:password@crosswaycluster.fupytmq.mongodb.net/crossway-tool?retryWrites=true&w=majority&appName=CrosswayCluster
     ```

4. **If Password Has Special Characters:**
   - Use the helper script: `node scripts/encode-mongodb-password.js`
   - Or manually encode: Replace special characters with URL encoding
   - Or reset password to use only letters/numbers (easier)

### Method 2: Reset Password (Recommended if having issues)

1. **MongoDB Atlas → Database Access**
2. Find your user: `crosswaycsr_crosswaycsr_db_user`
3. Click **Edit** → **Edit Password**
4. Set a new simple password (letters and numbers only, e.g., `Crossway2024`)
5. **Copy the new connection string** from Database → Connect
6. Update your `.env.local` file

### Method 3: Use Helper Script

Run this command to generate the correct connection string:

```bash
node scripts/encode-mongodb-password.js
```

Follow the prompts to enter:
- Username
- Password (will be auto-encoded)
- Cluster host
- Database name

## Update .env.local File

Create or update `.env.local` in your project root:

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://your-username:your-password@crosswaycluster.fupytmq.mongodb.net/crossway-tool?retryWrites=true&w=majority&appName=CrosswayCluster

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# PageSpeed Insights API Key
PAGESPEED_API_KEY=your-api-key
```

## Verify Connection

After updating, restart your server:

```bash
npm run dev
```

Try signing up again. The error should be gone if credentials are correct.

## Common Password Encoding Issues

If your password is: `~!`Cros@$*^%%$`

**Incorrect encoding might be:**
```
%7E%21%60Cros%40%24%2A%5E%25%25%24
```

**Correct encoding should be:**
```
%7E%21%60Cros%40%24%2A%5E%25%25%24
```

But it's easier to just reset the password to something simple!

## Still Not Working?

1. **Verify username in MongoDB Atlas:**
   - Go to Database Access
   - Check the exact username (case-sensitive)

2. **Verify password:**
   - Reset it in MongoDB Atlas
   - Use the connection string directly from Atlas (it's pre-encoded)

3. **Check Network Access:**
   - MongoDB Atlas → Network Access
   - Make sure `0.0.0.0/0` is allowed (or your IP is added)

4. **Test connection:**
   - Use the connection string from MongoDB Atlas directly
   - Don't manually encode - use what Atlas gives you

