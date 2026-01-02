# Vercel Deployment Setup Guide

## Quick Fix for "Server configuration error"

This error occurs when `NEXTAUTH_SECRET` is missing or not properly configured in Vercel.

## Step-by-Step Setup

### 1. Generate NEXTAUTH_SECRET

Run this command in your terminal to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the generated string - you'll need it in the next step.

### 2. Add Environment Variables in Vercel

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Click on your project (`seotool-crossway`)
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

#### Required Variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `NEXTAUTH_SECRET` | `[paste the generated secret from step 1]` | **REQUIRED** - Must be a secure random string |
| `NEXTAUTH_URL` | `https://seotool-crossway.vercel.app` | Your Vercel deployment URL |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string |
| `PAGESPEED_API_KEY` | `your-google-api-key` | Google PageSpeed Insights API key |

#### Optional Variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | `{"type":"service_account",...}` | For Google Analytics/Search Console |
| `LOG_LEVEL` | `INFO` | Logging level (ERROR, WARN, INFO, DEBUG) |
| `NODE_ENV` | `production` | Usually set automatically by Vercel |

### 3. Environment Variable Settings

For each variable:
- **Environment**: Select **Production**, **Preview**, and **Development** (or just **Production** if you only want it there)
- Click **Save**

### 4. Redeploy

After adding all environment variables:
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

## Verification

After redeploying, check:

1. Visit: `https://seotool-crossway.vercel.app/api/health`
   - Should return: `{"status":"healthy",...}`

2. Visit: `https://seotool-crossway.vercel.app`
   - Should load the login page (not show "Server configuration error")

## Common Issues

### Issue: Still getting "Server configuration error"

**Solution**: 
- Make sure `NEXTAUTH_SECRET` is set for **Production** environment
- Make sure the value is NOT `your-secret-key-change-in-production`
- Redeploy after adding the variable

### Issue: "Database configuration error"

**Solution**:
- Verify `MONGODB_URI` is set correctly
- Check MongoDB Atlas network access allows Vercel IPs (or set to 0.0.0.0/0 for all)
- Verify MongoDB credentials are correct

### Issue: Authentication not working

**Solution**:
- Verify `NEXTAUTH_URL` matches your Vercel URL exactly: `https://seotool-crossway.vercel.app`
- Make sure `NEXTAUTH_SECRET` is set
- Check browser console for errors

## Quick Command Reference

### Generate NEXTAUTH_SECRET (Mac/Linux):
```bash
openssl rand -base64 32
```

### Generate NEXTAUTH_SECRET (Windows PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Generate NEXTAUTH_SECRET (Node.js):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `NEXTAUTH_SECRET` - Secure random string (32+ characters)
- [ ] `NEXTAUTH_URL` - Your Vercel URL (https://seotool-crossway.vercel.app)
- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `PAGESPEED_API_KEY` - Google API key
- [ ] All variables are set for **Production** environment
- [ ] Redeployed after adding variables

## Need Help?

If you're still having issues:
1. Check Vercel deployment logs: **Deployments** → Click deployment → **Build Logs**
2. Check function logs: **Deployments** → Click deployment → **Function Logs**
3. Verify all environment variables are set correctly
4. Make sure you redeployed after adding variables

