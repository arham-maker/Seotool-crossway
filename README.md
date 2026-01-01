# PageSpeed + Analytics PDF Report Tool

A Next.js application that generates PDF reports combining Google PageSpeed Insights metrics and optional Google Analytics data.

## Features

- **Authentication System**
  - User registration and login
  - Password reset functionality
  - Protected routes
- **PageSpeed Insights Integration**
  - Performance, SEO, and Accessibility scores
  - Key metrics: FCP, LCP, CLS, TBT
- **Google Analytics Integration** (Optional)
  - Total users, sessions, bounce rate, page views
- **PDF Report Generation**
  - Clean, professional PDF reports
  - Combines PageSpeed and Analytics data

## Prerequisites

- Node.js 18+ 
- MongoDB database (local or cloud like MongoDB Atlas)

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Set up environment variables**

Create a `.env.local` file in the project root:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/crossway-tool
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crossway-tool

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-in-production

# PageSpeed Insights API Key
PAGESPEED_API_KEY=your-pagespeed-api-key

# Optional: Google Analytics Configuration
# Path to service account JSON file or inline JSON
GOOGLE_APPLICATION_CREDENTIALS_JSON=./credentials/crossway-seo-tool-842fbe509588.json
# Or inline JSON:
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# Optional: GA Property Prefix (default: "properties/")
# GA_PROPERTY_PREFIX=properties/
```

3. **Set up MongoDB**

- **Local MongoDB**: Install MongoDB locally and ensure it's running
- **MongoDB Atlas**: Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and get your connection string

The application will automatically create the necessary collections and indexes on first run.

4. **Run the development server**

```bash
npm run dev
```

5. **Open your browser**

Visit [http://localhost:3000](http://localhost:3000)

## Usage

1. **Sign Up**: Create a new account at `/signup`
2. **Login**: Sign in at `/login`
3. **Generate Report**: 
   - Enter a website URL
   - Optionally provide a Google Analytics Property ID
   - Click "Generate PDF"
   - Download the generated report

## Password Reset

1. Click "Forgot password?" on the login page
2. Enter your email address
3. Check your console (development) or email (production) for the reset link
4. Click the reset link and enter your new password

## Database Collections

The application uses MongoDB with the following collections:

- **users**: Stores user accounts (email, password hash, name)
- **password_reset_tokens**: Stores password reset tokens with expiration

## Tech Stack

- **Next.js 16** - React framework
- **NextAuth.js** - Authentication
- **MongoDB** - Database
- **bcryptjs** - Password hashing
- **pdf-lib** - PDF generation
- **axios** - HTTP requests
- **googleapis** - Google APIs integration
- **Tailwind CSS** - Styling

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set:
- `MONGODB_URI` - Your MongoDB connection string
- `NEXTAUTH_SECRET` - A secure random string (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your production URL
- `PAGESPEED_API_KEY` - Your Google API key

## Notes

- In development mode, password reset URLs are logged to the console
- For production, implement email sending (e.g., using SendGrid, Resend, or Nodemailer)
- MongoDB indexes are created automatically on first connection
- The database connection is cached for optimal performance
