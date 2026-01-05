# MongoDB Authentication Fix

## Error: "bad auth : Authentication failed"

This error means your MongoDB credentials (username/password) are incorrect.

## Quick Fix Steps

### Step 1: Verify MongoDB Atlas Credentials

1. Go to MongoDB Atlas: https://cloud.mongodb.com/
2. Login to your account
3. Go to **Database Access** (left sidebar)
4. Find user: `crosswaycsr_crosswaycsr_db_user`
5. Click **Edit** on that user
6. **Reset Password** or verify the password

### Step 2: Get the Correct Connection String

1. In MongoDB Atlas, go to **Database** → **Connect**
2. Choose **Connect your application**
3. Copy the connection string
4. It should look like:
   ```
   mongodb+srv://<username>:<password>@crosswaycluster.fupytmq.mongodb.net/?retryWrites=true&w=majority&appName=CrosswayCluster
   ```

### Step 3: URL Encode the Password

Your password has special characters that need to be URL-encoded:

**Original password:** `~!`Cros@$*^%%$`

**URL-encoded password:** `%7E%21%60Cros%40%24%2A%5E%25%25%24`

**Encoding reference:**
- `~` → `%7E`
- `!` → `%21`
- `` ` `` → `%60`
- `@` → `%40`
- `$` → `%24`
- `*` → `%2A`
- `^` → `%5E`
- `%` → `%25`

### Step 4: Update Your Connection String

Replace `<password>` in the connection string with the URL-encoded version:

```
mongodb+srv://crosswaycsr_crosswaycsr_db_user:%7E%21%60Cros%40%24%2A%5E%25%25%24@crosswaycluster.fupytmq.mongodb.net/crossway-tool?retryWrites=true&w=majority&appName=CrosswayCluster
```

### Step 5: Update Environment Variables

**For Local Development (.env.local):**
```env
MONGODB_URI=mongodb+srv://crosswaycsr_crosswaycsr_db_user:%7E%21%60Cros%40%24%2A%5E%25%25%24@crosswaycluster.fupytmq.mongodb.net/crossway-tool?retryWrites=true&w=majority&appName=CrosswayCluster
```

**For Vercel:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `MONGODB_URI` with the correct connection string
3. Redeploy

## Alternative: Reset MongoDB Password

If the password is incorrect, it's easier to reset it:

1. Go to MongoDB Atlas → **Database Access**
2. Click **Edit** on `crosswaycsr_crosswaycsr_db_user`
3. Click **Edit Password**
4. Set a new password (use only letters and numbers to avoid encoding issues)
5. Copy the new connection string from **Database** → **Connect**
6. Update your `.env.local` and Vercel environment variables

## Test the Connection

After updating, test the connection:

1. Restart your dev server: `npm run dev`
2. Try to sign up again
3. Check the logs - should not see "bad auth" error

## Common Issues

### Issue: Password encoding is wrong
**Solution:** Use an online URL encoder or reset password to use only alphanumeric characters

### Issue: Username is wrong
**Solution:** Verify the username in MongoDB Atlas Database Access

### Issue: Database name mismatch
**Solution:** Make sure the database name in URI matches: `/crossway-tool`

### Issue: Network access blocked
**Solution:** 
1. Go to MongoDB Atlas → **Network Access**
2. Add IP Address: `0.0.0.0/0` (allow all) or add your specific IP

## Quick Test Command

You can test the connection string directly:

```bash
# Using mongosh (if installed)
mongosh "mongodb+srv://crosswaycsr_crosswaycsr_db_user:%7E%21%60Cros%40%24%2A%5E%25%25%24@crosswaycluster.fupytmq.mongodb.net/crossway-tool"
```

If this connects successfully, the credentials are correct. If not, reset the password in MongoDB Atlas.

