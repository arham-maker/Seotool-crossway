# Vercel Environment Variables Setup

## Copy and paste these into Vercel Environment Variables

### Step 1: Generate NEXTAUTH_SECRET

Run this command to generate your secret:
```bash
openssl rand -base64 32
```

Or use this Node.js command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 2: Add These Variables in Vercel

Go to: **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add each variable below:

---

## 1. NEXTAUTH_SECRET

**Variable Name:** `NEXTAUTH_SECRET`

**Value:** `[Paste the generated secret from Step 1]`

**Example:** `aB3xY9mK2pL8nQ5rT7vW1zC4dF6gH0jK3mN5pQ7sT9uV1wX3yZ5aB7cD9eF1gH3jK5`

**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

## 2. NEXTAUTH_URL

**Variable Name:** `NEXTAUTH_URL`

**Value:** `https://seotool-crossway.vercel.app`

**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

## 3. MONGODB_URI

**Variable Name:** `MONGODB_URI`

**Value:** `mongodb+srv://crosswaycsr_crosswaycsr_db_user:%7E%21%60Cros%40%24%2A%5E%25%25%24@crosswaycluster.fupytmq.mongodb.net/crossway-tool?retryWrites=true&w=majority&appName=CrosswayCluster`

**Note:** The password has been URL-encoded. Special characters are encoded as:
- `~` = `%7E`
- `!` = `%21`
- `` ` `` = `%60`
- `@` = `%40`
- `$` = `%24`
- `*` = `%2A`
- `^` = `%5E`
- `%` = `%25`

**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

## 4. PAGESPEED_API_KEY

**Variable Name:** `PAGESPEED_API_KEY`

**Value:** `[Your Google PageSpeed Insights API Key]`

**How to get it:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create a new API key or use existing one
3. Enable "PageSpeed Insights API" for that key

**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

## 5. (Optional) GOOGLE_APPLICATION_CREDENTIALS_JSON

**Variable Name:** `GOOGLE_APPLICATION_CREDENTIALS_JSON`

**Value:** `[Your Google Service Account JSON - if using Google Analytics/Search Console]`

**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

## 6. (Optional) LOG_LEVEL

**Variable Name:** `LOG_LEVEL`

**Value:** `INFO`

**Options:** `ERROR`, `WARN`, `INFO`, `DEBUG`

**Environment:** ✅ Production

---

## Quick Setup Checklist

- [ ] Generated NEXTAUTH_SECRET using `openssl rand -base64 32`
- [ ] Added NEXTAUTH_SECRET to Vercel
- [ ] Added NEXTAUTH_URL to Vercel
- [ ] Added MONGODB_URI to Vercel (with URL-encoded password)
- [ ] Added PAGESPEED_API_KEY to Vercel
- [ ] Set all variables for Production environment
- [ ] Redeployed the application

---

## After Adding Variables

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete
5. Visit: https://seotool-crossway.vercel.app

---

## Verify It's Working

1. Check health endpoint: https://seotool-crossway.vercel.app/api/health
   - Should return: `{"status":"healthy","checks":{"database":"connected"}}`

2. Visit main site: https://seotool-crossway.vercel.app
   - Should show login page (not configuration error)

---

## Troubleshooting

### Still seeing configuration error?
- Make sure you redeployed after adding variables
- Check that NEXTAUTH_SECRET is set for Production environment
- Verify NEXTAUTH_URL matches your Vercel URL exactly

### Database connection error?
- Verify MongoDB URI is correct (check URL encoding)
- Check MongoDB Atlas network access (allow Vercel IPs or 0.0.0.0/0)
- Verify database user has correct permissions

### Authentication not working?
- Check NEXTAUTH_URL matches your domain
- Verify NEXTAUTH_SECRET is set correctly
- Check browser console for errors

