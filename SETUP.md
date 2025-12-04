# Setup Guide

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Fill in:
   - Project name: `job-aggregator`
   - Database password: (create a strong password)
   - Region: Choose closest to you
4. Wait for project to be created (~2 minutes)

## Step 2: Create Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Run the migrations in order:

   **First Migration:** Copy contents of `supabase/migrations/002_enhanced_schema.sql`
   - Paste into SQL editor
   - Click **Run** (or press Ctrl/Cmd + Enter)
   - You should see "Success"

   **Second Migration:** Copy contents of `supabase/migrations/003_fix_scrape_logs_rls.sql`
   - Paste into SQL editor
   - Click **Run**
   - You should see "Success"

## Step 3: Get API Credentials

1. In Supabase, go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these two values:
   - **Project URL** (starts with https://...)
   - **anon public** key (under "Project API keys")

## Step 4: Configure Environment Variables

1. In your project root, create a file named `.env.local`
2. Add these lines (replace with your actual values):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file

## Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## Step 6: Test the Application

The app is now running, but you won't see any jobs yet because:
1. The database is empty
2. Most scrapers need additional configuration

### Add Test Data (Optional)

You can manually add a test job in Supabase:

1. Go to **Table Editor** in Supabase
2. Open the `jobs` table
3. Click **Insert row**
4. Fill in the fields:
   - title: "Senior Product Manager"
   - company: "Test Company"
   - location: "Taiwan"
   - remote: true
   - description: "This is a test job posting"
   - url: "https://example.com/job/123"
   - source: "manual"
5. Click **Save**

Now search for "Product Manager" in your app!

## Step 7: Deploy to Vercel

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin your-github-repo-url
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click **New Project**
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Next.js (auto-detected)
   - Build Command: `npm run build`
   - Environment Variables: Add your Supabase credentials:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click **Deploy**

Your app will be live in ~2 minutes!

## Next Steps

### Configure Job Scrapers

To actually scrape jobs, you need to:

1. **For platforms with APIs** (recommended):
   - LinkedIn: Get API access at [developer.linkedin.com](https://developer.linkedin.com)
   - Indeed: Apply for Publisher API at [indeed.com/publisher](https://indeed.com/publisher)
   - Add API keys to `.env.local`

2. **For web scraping**:
   - Review each platform's Terms of Service
   - Implement scrapers in `/app/api/jobs/scrapers/`
   - Use Puppeteer for dynamic content
   - Implement rate limiting

3. **Alternative approaches**:
   - Use job aggregator APIs (e.g., Adzuna, The Muse)
   - Allow users to submit job listings
   - Partner with companies for direct job feeds

## Troubleshooting

### "Cannot connect to Supabase"
- Check your `.env.local` file exists and has correct values
- Restart the dev server after adding env variables

### "No results found"
- Database is empty - add test data or implement scrapers
- Check Supabase connection in browser console

### Build errors
- Run `npm run type-check` to see TypeScript errors
- Make sure all dependencies are installed: `npm install`

## Support

Check the [README.md](README.md) for more information about the project structure and features.
