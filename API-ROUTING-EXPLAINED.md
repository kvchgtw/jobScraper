# API Routing & Scraper Usage Explained

## Your Question
> `/api/scrape/ashby` is actually using `ashby-scraper.ts` and `route.ts` in `scrape/ashby` path?

## Answer: YES and NO (Two Different Systems)

You have **TWO separate Ashby scraping systems** in your codebase:

---

## System 1: `/api/jobs` (Query-Based Scraping)

### Endpoint
```
POST /api/jobs
```

### Purpose
**On-demand job search** - scrapes jobs based on user query

### Request
```json
{
  "query": "software engineer",
  "location": "remote"
}
```

### Flow
```
User → POST /api/jobs
         ↓
    app/api/jobs/route.ts
         ↓
    scrapeAshby(query, location)
         ↓
    app/api/jobs/scrapers/ashby.ts
         ↓
    scrapeAshbyViaDuckDuckGo(query, location)
         ↓
    app/api/jobs/scrapers/ashby-duckduckgo.ts
         ↓
    Searches DuckDuckGo for: "site:jobs.ashbyhq.com {query} {location}"
         ↓
    Returns Job[] matching the query
         ↓
    Stores in database with upsert
         ↓
    Returns to user
```

### Files Involved
- ✅ `app/api/jobs/route.ts` - API route handler
- ✅ `app/api/jobs/scrapers/ashby.ts` - Wrapper (delegates to DuckDuckGo)
- ✅ `app/api/jobs/scrapers/ashby-duckduckgo.ts` - Actual scraper
- ❌ **NOT using** `lib/scrapers/ashby-scraper.ts`
- ❌ **NOT using** `app/api/scrape/ashby/route.ts`

### Characteristics
- **Query-based:** Only scrapes jobs matching user's search
- **Search engine approach:** Uses DuckDuckGo to find jobs
- **Lightweight:** Fast, doesn't scrape all companies
- **User-triggered:** Runs when user searches

---

## System 2: `/api/scrape/ashby` (Full Database Refresh)

### Endpoint
```
POST /api/scrape/ashby
```

### Purpose
**Scheduled background scraping** - updates entire job database (cron job)

### Request
```bash
# No body needed, scrapes everything
curl -X POST http://localhost:3000/api/scrape/ashby
```

### Flow
```
Cron Job → POST /api/scrape/ashby
              ↓
         app/api/scrape/ashby/route.ts
              ↓
         scrapeAshby() from lib/scrapers/ashby-scraper.ts
              ↓
         Loops through ALL 35+ companies in ASHBY_COMPANIES
              ↓
         For each company:
           - Hits Ashby GraphQL API directly
           - Gets ALL jobs for that company
           - Upserts to database
           - Tracks first_seen_at, last_seen_at
              ↓
         Marks missing jobs as inactive
              ↓
         Logs results to scrape_logs table
              ↓
         Returns scrape statistics
```

### Files Involved
- ✅ `app/api/scrape/ashby/route.ts` - API route handler
- ✅ `lib/scrapers/ashby-scraper.ts` - Full scraper implementation
- ✅ `app/api/jobs/scrapers/ashby-companies.ts` - Company list
- ❌ **NOT using** `app/api/jobs/scrapers/ashby.ts`
- ❌ **NOT using** `app/api/jobs/scrapers/ashby-duckduckgo.ts`

### Characteristics
- **Comprehensive:** Scrapes ALL companies, ALL jobs
- **Direct API approach:** Uses Ashby's GraphQL API
- **Heavy:** Takes minutes to complete
- **Cron-triggered:** Runs on schedule (e.g., every 6 hours)
- **Database-focused:** Tracks job lifecycle (first_seen, last_seen, inactive)

---

## Side-by-Side Comparison

| Feature | `/api/jobs` | `/api/scrape/ashby` |
|---------|-------------|---------------------|
| **Purpose** | Search for jobs | Refresh database |
| **Trigger** | User search | Cron job |
| **Scope** | Query-specific jobs | ALL jobs from ALL companies |
| **Method** | DuckDuckGo search | Direct Ashby GraphQL API |
| **Speed** | Fast (~5 seconds) | Slow (~2-5 minutes) |
| **Companies** | Dynamic (whatever DuckDuckGo finds) | Fixed (35+ companies in list) |
| **Job tracking** | Simple upsert | Advanced (first_seen, last_seen, inactive) |
| **Logging** | Console logs | Database logs in `scrape_logs` table |
| **Files** | `app/api/jobs/scrapers/` | `lib/scrapers/ashby-scraper.ts` + `app/api/scrape/ashby/route.ts` |

---

## Visual Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        YOUR APPLICATION                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
   ┌────────────────────┐            ┌────────────────────┐
   │   /api/jobs        │            │ /api/scrape/ashby  │
   │   (User Search)    │            │ (Background Job)   │
   └────────────────────┘            └────────────────────┘
            │                                   │
            │                                   │
            ▼                                   ▼
   ┌─────────────────────┐         ┌──────────────────────┐
   │ app/api/jobs/       │         │ app/api/scrape/      │
   │ route.ts            │         │ ashby/route.ts       │
   └─────────────────────┘         └──────────────────────┘
            │                                   │
            │                                   │
            ▼                                   ▼
   ┌─────────────────────┐         ┌──────────────────────┐
   │ scrapers/ashby.ts   │         │ lib/scrapers/        │
   │ (wrapper)           │         │ ashby-scraper.ts     │
   └─────────────────────┘         └──────────────────────┘
            │                                   │
            │                                   │
            ▼                                   ▼
   ┌─────────────────────┐         ┌──────────────────────┐
   │ scrapers/           │         │ Ashby GraphQL API    │
   │ ashby-duckduckgo.ts │         │ (all companies)      │
   └─────────────────────┘         └──────────────────────┘
            │                                   │
            │                                   │
            ▼                                   ▼
   ┌─────────────────────┐         ┌──────────────────────┐
   │ DuckDuckGo Search   │         │ 35+ companies        │
   │ (dynamic query)     │         │ (hardcoded list)     │
   └─────────────────────┘         └──────────────────────┘
            │                                   │
            └─────────────────┬─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Supabase DB     │
                    │  - jobs table    │
                    │  - scrape_logs   │
                    └──────────────────┘
```

---

## File Structure Breakdown

```
/Users/kvc/Documents/章廷文/VScode/claude-code-test/
│
├── app/
│   └── api/
│       ├── jobs/                       ← SYSTEM 1: User Search
│       │   ├── route.ts                ← Handles POST /api/jobs
│       │   └── scrapers/
│       │       ├── ashby.ts            ← Wrapper (calls ashby-duckduckgo)
│       │       ├── ashby-duckduckgo.ts ← DuckDuckGo search implementation
│       │       ├── ashby-google.ts     ← Alternative (Google search)
│       │       ├── ashby-direct.ts     ← Alternative (direct HTML)
│       │       ├── ashby-companies.ts  ← Company list (shared)
│       │       ├── greenhouse.ts       ← Greenhouse scraper
│       │       └── lever.ts            ← Lever scraper
│       │
│       └── scrape/                     ← SYSTEM 2: Cron Jobs
│           └── ashby/
│               └── route.ts            ← Handles POST /api/scrape/ashby
│
└── lib/
    └── scrapers/
        └── ashby-scraper.ts            ← SYSTEM 2: Full scraper (GraphQL)
```

---

## When to Use Each System

### Use `/api/jobs` (System 1) When:
- ✅ User is searching for specific jobs
- ✅ Need fast results
- ✅ Want to search across ALL companies (even ones not in your list)
- ✅ Only need jobs matching a query

**Example:**
```typescript
// User searches for "engineer" jobs
POST /api/jobs
{
  "query": "engineer",
  "location": "remote"
}
```

### Use `/api/scrape/ashby` (System 2) When:
- ✅ Refreshing entire job database
- ✅ Running scheduled updates (cron)
- ✅ Need to track job lifecycle (when jobs appear/disappear)
- ✅ Want comprehensive data from known companies
- ✅ Need audit logs of scraping activity

**Example:**
```bash
# Run via cron job every 6 hours
0 */6 * * * curl -X POST https://your-app.vercel.app/api/scrape/ashby
```

---

## Key Differences in Implementation

### System 1 (Query-Based) - DuckDuckGo Approach

```typescript
// app/api/jobs/scrapers/ashby-duckduckgo.ts
export async function scrapeAshbyViaDuckDuckGo(query: string, location?: string) {
  // Searches: "site:jobs.ashbyhq.com {query} {location}"
  const searchQuery = `site:jobs.ashbyhq.com ${query} ${location || ''}`;

  // Makes POST to DuckDuckGo HTML search
  // Parses results for job URLs
  // Returns only jobs matching the search
}
```

**Pros:**
- Fast
- Discovers companies you don't know about
- No need to maintain company list

**Cons:**
- Limited to search results
- May miss jobs
- Depends on search engine

### System 2 (Full Scrape) - GraphQL Approach

```typescript
// lib/scrapers/ashby-scraper.ts
export async function scrapeAshby() {
  // Loops through ALL companies
  for (const company of ASHBY_COMPANIES) {
    // Hits Ashby GraphQL API directly
    const graphqlQuery = {
      operationName: "ApiJobBoardWithTeams",
      variables: { organizationHostedJobsPageName: company.slug },
      query: `query ApiJobBoardWithTeams { ... }`
    };

    // Gets ALL jobs for this company
    // Tracks first_seen, last_seen
    // Marks missing jobs as inactive
  }
}
```

**Pros:**
- Complete data for each company
- Reliable (direct API)
- Tracks job history
- Can detect when jobs close

**Cons:**
- Slower
- Only covers companies in your list
- Requires maintenance of company list

---

## Database Schema Differences

### System 1 - Simple Upsert
```sql
-- Just inserts/updates jobs by URL
INSERT INTO jobs (...)
ON CONFLICT (url) DO UPDATE SET ...
```

### System 2 - Advanced Tracking
```sql
-- Tracks job lifecycle
INSERT INTO jobs (
  ...,
  first_seen_at,    -- When job first appeared
  last_seen_at,     -- When job was last found
  is_active,        -- Whether job is still active
  scrape_count      -- How many times we've seen it
) ...

-- Marks jobs as inactive when they disappear
UPDATE jobs
SET is_active = false, closed_at = NOW()
WHERE url NOT IN (...)

-- Logs every scrape
INSERT INTO scrape_logs (
  source, status, jobs_found, duration_ms, error
) ...
```

---

## Production Setup Recommendation

### For Best Results, Use BOTH:

1. **User Search → System 1** (`/api/jobs`)
   - Fast results for user queries
   - Broad coverage via search

2. **Background Refresh → System 2** (`/api/scrape/ashby`)
   - Keep database fresh with cron
   - Track job lifecycle
   - Build comprehensive dataset

### Example Vercel Cron Config

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/scrape/ashby",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

---

## Summary

**Your original question:**
> `/api/scrape/ashby` is using `ashby-scraper.ts` and `route.ts` in `scrape/ashby` path?

**Answer:**

✅ **YES** - `/api/scrape/ashby` uses:
- `app/api/scrape/ashby/route.ts` (API endpoint)
- `lib/scrapers/ashby-scraper.ts` (scraper implementation)

❌ **NO** - It does **NOT** use:
- `app/api/jobs/scrapers/ashby.ts`
- `app/api/jobs/scrapers/ashby-duckduckgo.ts`

Those files are used by `/api/jobs` (different system).

---

## Quick Reference

| Path | Used By | Purpose |
|------|---------|---------|
| `app/api/jobs/route.ts` | `/api/jobs` | User search endpoint |
| `app/api/jobs/scrapers/ashby.ts` | `/api/jobs` | Wrapper for DuckDuckGo |
| `app/api/jobs/scrapers/ashby-duckduckgo.ts` | `/api/jobs` | DuckDuckGo search scraper |
| `app/api/scrape/ashby/route.ts` | `/api/scrape/ashby` | Cron job endpoint |
| `lib/scrapers/ashby-scraper.ts` | `/api/scrape/ashby` | Full database scraper |

You have **two separate, independent Ashby scraping systems** that serve different purposes!
