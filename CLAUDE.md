# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A job aggregation web application that searches and displays job opportunities from multiple sources including company websites, LinkedIn, Glassdoor, Indeed, Lever, Greenhouse, Ashby, Workday, and 104 人力銀行.

**Key Features:**
- Search jobs by keyword, location, and remote work preferences
- Display company name, job title, salary, working model, job description, and source URL
- ASCII-style UI design aesthetic
- Real-time job data aggregation from multiple platforms

**Tech Stack:**
- Frontend: React, Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Next.js API Routes (Serverless Functions)
- Database: Supabase (PostgreSQL)
- Deployment: Vercel (frontend + backend)
- Job Scraping: Cheerio, Puppeteer (for dynamic content)

## Development Commands

- Install: `npm install`
- Dev: `npm run dev` (runs on http://localhost:3000)
- Build: `npm run build`
- Start production: `npm start`
- Lint: `npm run lint`
- Type check: `npm run type-check`

## Architecture

**Directory Structure:**
```
/app                    # Next.js 14 App Router
  /api                 # API routes (serverless functions)
    /jobs             # Job scraping endpoints
    /search           # Search and filter logic
  /components          # React components
  /lib                 # Utilities, DB clients, types
/public               # Static assets
/supabase            # Database migrations and types
```

**Key Modules:**
- **Job Scrapers** (`/app/api/jobs/scrapers/`): Individual scrapers for each job platform
- **Search Engine** (`/app/api/search/`): Handles search queries, filters, and pagination
- **Database Layer** (`/lib/supabase/`): Supabase client and query helpers
- **UI Components** (`/app/components/`): ASCII-styled reusable components

**Data Flow:**
1. User enters search query → Frontend form
2. API route receives query → Triggers relevant scrapers
3. Scrapers fetch and parse job data → Normalize to common schema
4. Data stored in Supabase → Deduplicated by URL
5. Search API queries database → Returns filtered results
6. Frontend displays results with ASCII styling

## Design Guidelines

**ASCII Style Theme:**
- Use monospace fonts (Courier New, Monaco, Consolas)
- Box-drawing characters for borders (─ │ ┌ ┐ └ ┘ ├ ┤)
- Minimalist color palette (terminal-inspired)
- Text-based loading indicators and progress bars
- Retro command-line aesthetic

## Database Schema

**jobs table:**
- id (uuid, primary key)
- title (text)
- company (text)
- location (text)
- remote (boolean)
- salary (text, nullable)
- description (text)
- url (text, unique)
- source (text) # platform name
- posted_date (timestamp)
- scraped_at (timestamp)
- search_vector (tsvector) # for full-text search
