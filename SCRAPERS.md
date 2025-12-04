# Job Scrapers Documentation

## Overview

The application includes real, working job scrapers for multiple platforms. When you search for jobs, the app automatically scrapes fresh job listings from these sources and stores them in your database.

## Supported Platforms

### ✅ Fully Implemented (Ready to Use)

1. **Greenhouse** - Public API
   - Companies: Airbnb, Stripe, Shopify, Datadog, GitLab, Coinbase, Grammarly, Canva, Notion, Figma
   - Rate limit: 200ms delay between requests
   - No authentication required

2. **Lever** - Public API
   - Companies: Netflix, Uber, Square, Robinhood, Reddit, Discord, Cloudflare, Grafana, and more
   - No authentication required

3. **Ashby** - Public API
   - Companies: Anthropic, OpenAI, Replit, Ramp, Vanta, Deel, Modal, Retool, Watershed
   - No authentication required

4. **Indeed** - RSS Feeds
   - Uses Indeed's public RSS feed
   - Legal and officially supported method
   - No authentication required

### ⚠️ Requires Additional Setup

5. **LinkedIn** - Requires LinkedIn API access
6. **Glassdoor** - Requires web scraping or API
7. **Workday** - Complex, requires Puppeteer (headless browser)
8. **104 人力銀行** - Requires Taiwan-specific setup

## How It Works

### Search Flow

1. **User enters search query** → Frontend (SearchBox component)
2. **Triggers scraping** → POST `/api/jobs` with query and location
3. **Scrapers run in parallel** → Greenhouse, Lever, Ashby, Indeed
4. **Jobs stored in database** → Supabase (deduplicated by URL)
5. **Search results returned** → GET `/api/search` queries database
6. **Results displayed** → JobList and JobCard components

### Code Structure

```
/app/api/jobs/
├── route.ts                    # Orchestrator
└── scrapers/
    ├── greenhouse.ts           # ✅ Working
    ├── lever.ts                # ✅ Working
    ├── ashby.ts                # ✅ Working
    ├── indeed.ts               # ✅ Working
    ├── linkedin.ts             # ⚠️ Placeholder
    └── workday.ts              # ⚠️ Placeholder
```

## Testing the Scrapers

### Try it now!

1. Make sure your dev server is running: `npm run dev`
2. Open http://localhost:3000
3. Search for common tech roles:
   - "Software Engineer"
   - "Product Manager"
   - "Data Scientist"
   - "Designer"

4. Check the console to see scraping progress:
```
Starting job scraping for query: "Product Manager"
Greenhouse: 10 jobs found
Lever: 8 jobs found
Ashby: 5 jobs found
Indeed: 15 jobs found
Total jobs scraped: 38
```

### Example Searches

**Remote Product Manager roles:**
- Keywords: `Product Manager`
- Location: `Remote`
- Remote Only: ✅

**Engineering jobs in SF:**
- Keywords: `Software Engineer`
- Location: `San Francisco`

**Any role at specific companies:**
- Keywords: `Engineer` (will search Stripe, Airbnb, etc.)

## Performance

- **Parallel Scraping**: All sources scraped simultaneously
- **Rate Limiting**: Built-in delays to avoid being blocked
- **Timeout Handling**: 5-10 second timeouts per company
- **Error Recovery**: Continues even if some scrapers fail
- **Typical Speed**: 5-15 seconds for a full scrape

## Extending the Scrapers

### Adding More Companies

Edit the company lists in each scraper file:

**Greenhouse** ([app/api/jobs/scrapers/greenhouse.ts](app/api/jobs/scrapers/greenhouse.ts:18-29)):
```typescript
const greenhouseCompanies = [
  "your-company",
  // Add more...
];
```

**Lever** ([app/api/jobs/scrapers/lever.ts](app/api/jobs/scrapers/lever.ts)):
```typescript
const leverCompanies = [
  "your-company",
  // Add more...
];
```

### Finding Company Identifiers

**Greenhouse**:
- Visit: `https://boards.greenhouse.io/COMPANY_NAME`
- If it works, add `COMPANY_NAME` to the list

**Lever**:
- Visit: `https://jobs.lever.co/COMPANY_NAME`
- If it works, add `COMPANY_NAME` to the list

**Ashby**:
- Visit: `https://jobs.ashbyhq.com/COMPANY_NAME`
- If it works, add `COMPANY_NAME` to the list

## Legal Considerations

### ✅ Legal & Safe

- **Greenhouse, Lever, Ashby**: Public APIs designed for job boards
- **Indeed RSS**: Officially provided RSS feeds

### ⚠️ Requires Caution

- **LinkedIn**: Requires API access, scraping violates ToS
- **Glassdoor**: No official API, scraping may violate ToS
- **Direct website scraping**: Check robots.txt and Terms of Service

### Recommended Approach

1. **Use official APIs** when available
2. **Respect rate limits** and robots.txt
3. **Add User-Agent** headers to identify your bot
4. **Consider partnerships** with job boards
5. **Use RSS feeds** where provided

## Troubleshooting

### No results found
- Database might be empty on first search
- Try broader search terms
- Check console for scraper errors
- Verify Supabase connection

### Scraping is slow
- Normal! Scraping 40+ companies takes time
- Consider reducing company lists for faster results
- Implement caching for frequently searched terms

### Specific scraper failing
- Check console for error messages
- Company might have changed their board URL
- API might be temporarily down
- Test the URL directly in browser

## Future Improvements

1. **Background Job Processing**: Use cron jobs or queues instead of real-time scraping
2. **Caching**: Store results for 1-6 hours
3. **More Platforms**: Add 104, LinkedIn API, Glassdoor
4. **Webhooks**: Get notified of new job postings
5. **Machine Learning**: Better job matching and recommendations
