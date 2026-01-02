# Production Deployment Guide

This document outlines the steps and requirements for deploying this application to production.

## Prerequisites

- Node.js 18+ installed
- MongoDB database (MongoDB Atlas recommended for production)
- Domain name with SSL certificate
- Environment variables configured

## Environment Variables

### Required Variables

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crossway-tool

# NextAuth Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# PageSpeed Insights API Key
PAGESPEED_API_KEY=your-google-api-key
```

### Optional Variables

```env
# Google Analytics (Optional)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# Logging
LOG_LEVEL=INFO  # Options: ERROR, WARN, INFO, DEBUG
```

## Security Checklist

- [ ] Change `NEXTAUTH_SECRET` from default value
- [ ] Use HTTPS in production (NEXTAUTH_URL must start with https://)
- [ ] Use MongoDB Atlas or secure MongoDB instance
- [ ] Enable MongoDB authentication
- [ ] Set up proper firewall rules
- [ ] Configure CORS if needed
- [ ] Set up email service for password resets
- [ ] Enable rate limiting (consider Redis for distributed systems)
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy for MongoDB
- [ ] Review and update security headers in `next.config.js`
- [ ] Set up SSL/TLS certificates
- [ ] Configure proper session timeout
- [ ] Review user permissions and RBAC settings

## Deployment Steps

### 1. Build the Application

```bash
npm install
npm run build
```

### 2. Test the Build

```bash
npm start
```

### 3. Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### 4. Verify Deployment

- Check health endpoint: `https://yourdomain.com/api/health`
- Test authentication flow
- Verify database connection
- Test API endpoints

## Production Best Practices

### Database

- Use MongoDB Atlas with proper authentication
- Enable connection pooling
- Set up automated backups
- Monitor database performance
- Use read replicas for scaling

### Security

- Never commit `.env` files
- Rotate secrets regularly
- Use strong passwords (enforced by validation)
- Enable 2FA for admin accounts
- Monitor for suspicious activity
- Keep dependencies updated

### Monitoring

- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor API response times
- Track database query performance
- Set up uptime monitoring
- Monitor rate limit violations

### Performance

- Enable Next.js caching
- Use CDN for static assets
- Optimize images
- Monitor bundle size
- Use database indexes effectively

## Health Check

The application includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "version": "0.1.0",
  "checks": {
    "database": "connected"
  }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify MONGODB_URI is correct
   - Check MongoDB network access
   - Verify authentication credentials

2. **Authentication Issues**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Ensure cookies are enabled

3. **Build Errors**
   - Check all environment variables are set
   - Verify Node.js version compatibility
   - Check for missing dependencies

## Support

For issues or questions, please refer to the main README.md or contact the development team.

