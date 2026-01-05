# Troubleshooting Signup Errors on Vercel

## Issue: "An error occurred. Please try again later" during signup

### Step 1: Check Vercel Function Logs

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your project: `seotool-crossway`
3. Go to **Deployments** tab
4. Click on the latest deployment
5. Click on **Functions** tab
6. Look for `/api/auth/register` function logs
7. Check for any error messages

### Step 2: Verify Environment Variables

Make sure these are set in Vercel:

1. Go to **Settings** → **Environment Variables**
2. Verify these are set for **Production**:
   - ✅ `MONGODB_URI` - Your MongoDB connection string
   - ✅ `NEXTAUTH_SECRET` - Secure random string
   - ✅ `NEXTAUTH_URL` - `https://seotool-crossway.vercel.app`
   - ✅ `PAGESPEED_API_KEY` - Your Google API key

### Step 3: Test MongoDB Connection

Your MongoDB URI should be:
```
mongodb+srv://crosswaycsr_crosswaycsr_db_user:%7E%21%60Cros%40%24%2A%5E%25%25%24@crosswaycluster.fupytmq.mongodb.net/crossway-tool?retryWrites=true&w=majority&appName=CrosswayCluster
```

**Check MongoDB Atlas:**
1. Go to MongoDB Atlas dashboard
2. Check **Network Access**:
   - Make sure `0.0.0.0/0` is allowed (all IPs) OR
   - Add Vercel's IP ranges
3. Check **Database Access**:
   - Verify user `crosswaycsr_crosswaycsr_db_user` exists
   - Verify password is correct
   - Verify user has read/write permissions

### Step 4: Test Password Requirements

The password now only requires:
- ✅ At least 6 characters
- ✅ Maximum 128 characters

**Try signing up with a simple password like:** `password123`

### Step 5: Check Database Name

Make sure the database name in your MongoDB URI matches:
- URI includes: `/crossway-tool`
- This is the database name MongoDB will use

If your database has a different name, update the URI.

### Step 6: Common Issues and Solutions

#### Issue: Database Connection Timeout
**Solution:**
- Check MongoDB Atlas network access
- Verify MongoDB URI is correct
- Check if MongoDB cluster is running

#### Issue: Authentication Failed
**Solution:**
- Verify MongoDB username and password are correct
- Check URL encoding of special characters in password
- Verify user has proper permissions

#### Issue: Database Not Found
**Solution:**
- MongoDB will create the database automatically on first write
- Make sure the database name in URI is correct: `/crossway-tool`

### Step 7: Enable Detailed Logging

To see more detailed errors, temporarily add this to your `.env` in Vercel:

```
LOG_LEVEL=DEBUG
```

Then check function logs again.

### Step 8: Test Health Endpoint

Visit: `https://seotool-crossway.vercel.app/api/health`

Should return:
```json
{
  "status": "healthy",
  "checks": {
    "database": "connected"
  }
}
```

If `database` shows `"disconnected"`, there's a MongoDB connection issue.

### Quick Fix Checklist

- [ ] All environment variables are set in Vercel
- [ ] MongoDB Atlas network access allows Vercel IPs (0.0.0.0/0)
- [ ] MongoDB user credentials are correct
- [ ] Database name in URI is correct (`/crossway-tool`)
- [ ] Redeployed after adding/changing environment variables
- [ ] Checked Vercel function logs for specific errors
- [ ] Tested health endpoint

### Still Having Issues?

1. **Check Vercel Logs:**
   - Go to Deployments → Latest → Functions → `/api/auth/register`
   - Look for error messages

2. **Test MongoDB Connection Locally:**
   ```bash
   # Test if you can connect with the URI
   mongosh "mongodb+srv://crosswaycsr_crosswaycsr_db_user:%7E%21%60Cros%40%24%2A%5E%25%25%24@crosswaycluster.fupytmq.mongodb.net/crossway-tool"
   ```

3. **Verify Password Requirements:**
   - Try a simple password: `password123`
   - Make sure it's at least 6 characters

4. **Check MongoDB Atlas:**
   - Cluster status (should be running)
   - Network access (should allow connections)
   - Database user permissions

