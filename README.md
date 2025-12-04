# Job Aggregator

A modern job search application with ASCII-styled UI that aggregates job listings from multiple platforms.

## Features

- 🔍 Search across multiple job platforms
- 🏠 Filter by remote positions
- 📍 Location-based filtering
- 💻 ASCII-styled terminal aesthetic
- ⚡ Built with Next.js 15 and TypeScript

## Tech Stack

- **Frontend**: React, Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier)

### Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings → API
   - Copy your project URL and anon key

3. **Configure environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up database**:
   - Go to Supabase SQL Editor
   - Run the migrations from `supabase/migrations/` in order:
     1. First run `002_enhanced_schema.sql`
     2. Then run `003_fix_scrape_logs_rls.sql`

5. **Run development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
/app
  /api
    /jobs            # Job scraping endpoints
      /scrapers      # Platform-specific scrapers
    /search          # Search API
  /components        # React components
  /lib               # Utilities and types
/supabase           # Database schema
```

## Job Sources

Currently supports:
- Greenhouse (via public API)
- LinkedIn (requires setup)
- Indeed (requires setup)
- Glassdoor (requires setup)
- Lever (requires setup)
- Ashby (requires setup)
- Workday (requires setup)
- 104 人力銀行 (requires setup)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

Vercel will automatically deploy both frontend and API routes.

## Important Notes

### Web Scraping Considerations

- Many job platforms have Terms of Service that prohibit scraping
- Consider using official APIs where available (e.g., LinkedIn API, Indeed API)
- Implement rate limiting to avoid being blocked
- Some platforms require authentication
- For production use, consider legal compliance and robots.txt

### Recommended Approach

1. **Use Official APIs**: LinkedIn, Indeed, and others offer APIs
2. **RSS Feeds**: Some platforms provide RSS feeds
3. **Partnerships**: Consider data partnerships with job boards
4. **User-Generated**: Allow users to submit job listings

## Development

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## License

MIT
