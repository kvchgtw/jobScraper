# Greenhouse Job Scraper

Complete guide for the Greenhouse job board scraper implementation.

## Overview

The Greenhouse scraper automatically fetches job listings from companies using Greenhouse's applicant tracking system (ATS). Greenhouse is one of the most popular ATS platforms, used by thousands of companies including Stripe, Figma, Dropbox, Cloudflare, and many more.

## How It Works

### Greenhouse API Structure

Greenhouse provides a public JSON API for job listings:
- **API Endpoint**: `https://boards-api.greenhouse.io/v1/boards/{company-slug}/jobs`
- **Format**: Returns JSON with job listings
- **Authentication**: None required (public API)
- **Rate Limiting**: Respectful delays implemented (500ms between companies)

### Response Format

Greenhouse API returns jobs in one of two formats:

**Format 1: Direct jobs array**
```json
{
  "jobs": [
    {
      "id": 7374073,
      "title": "Account Executive, AI Sales",
      "location": { "name": "SF" },
      "absolute_url": "https://stripe.com/jobs/search?gh_jid=7374073",
      "updated_at": "2025-12-16T17:08:54-05:00"
    }
  ]
}
```

**Format 2: Jobs grouped by departments**
```json
{
  "departments": [
    {
      "id": 123,
      "name": "Engineering",
      "jobs": [ /* jobs array */ ]
    }
  ]
}
```

The scraper handles both formats automatically.

## Files Structure

```
lib/
├── greenhouse-companies.ts          # List of companies using Greenhouse
└── scrapers/
    └── greenhouse-scraper.ts        # Main scraper implementation

app/api/scrape/greenhouse/
└── route.ts                         # API endpoint to trigger scraper

scripts/
└── test-greenhouse-scraper.ts       # Test script
```

## Company List

The company list is maintained in `lib/greenhouse-companies.ts`:

```typescript
export interface GreenhouseCompany {
  name: string;  // Display name
  slug: string;  // URL slug for Greenhouse board
}

export const GREENHOUSE_COMPANIES: GreenhouseCompany[] = [
  { name: "Stripe", slug: "stripe" },
  { name: "Figma", slug: "figma" },
  // ... more companies
];
```

### Finding New Companies

To check if a company uses Greenhouse:

1. **Method 1**: Check their careers page
   - Look for URLs containing `boards.greenhouse.io`
   - Example: `https://boards.greenhouse.io/stripe`

2. **Method 2**: Try the API directly
   ```bash
   curl https://boards-api.greenhouse.io/v1/boards/COMPANY-SLUG/jobs
   ```

3. **Method 3**: Check job posting URLs
   - Greenhouse job URLs contain `gh_jid=` parameter
   - Example: `https://stripe.com/jobs/search?gh_jid=7374073`

### Adding New Companies

1. Open `lib/greenhouse-companies.ts`
2. Add the company to the array:
   ```typescript
   { name: "Company Name", slug: "company-slug" },
   ```
3. Test with: `npm run test:greenhouse`

## Usage

### Testing the Scraper

Test with a single company before running on all companies:

```bash
npm run test:greenhouse
```

This tests the scraper with Stripe and displays:
- Number of jobs found
- Sample job listings
- Statistics (remote jobs, locations, etc.)
- Any errors encountered

**Expected output:**
```
🧪 Testing Greenhouse Scraper
Company: Stripe
Slug: stripe

📡 Fetching jobs from Greenhouse API...
✅ API Response Status: 200
✅ Response received successfully

📊 Response Format: Direct jobs array

📈 Total Jobs Found: 542

📝 Sample Jobs (showing first 5):
1. Account Executive, AI Sales
   📍 Location: SF
   🔗 URL: https://stripe.com/jobs/search?gh_jid=7374073
   ...

✅ Test completed successfully!
```

### Running the Full Scraper

**Option 1: Via API Endpoint**

Trigger scraper via HTTP POST:

```bash
curl -X POST http://localhost:3000/api/scrape/greenhouse
```

**Option 2: Programmatically**

```typescript
import { scrapeGreenhouse } from '@/lib/scrapers/greenhouse-scraper';

const result = await scrapeGreenhouse();
console.log(`Found ${result.jobsFound} jobs`);
```

### Checking Scrape Status

Get status and recent scrape history:

```bash
curl http://localhost:3000/api/scrape/greenhouse
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeJobs": 5420,
    "lastScrape": {
      "timestamp": "2025-12-22T10:30:00Z",
      "status": "success",
      "jobsFound": 5500,
      "duration": 180000
    },
    "recentScrapes": [ /* last 10 scrapes */ ]
  }
}
```

## Features

### 1. Job Upsert Logic

**New Jobs:**
- Creates new job record
- Sets `first_seen_at` timestamp
- Marks as `is_active: true`
- Sets `scrape_count: 1`

**Existing Jobs:**
- Updates job details (title, location, etc.)
- Updates `last_seen_at` timestamp
- Increments `scrape_count`
- Reactivates if previously inactive

### 2. Job Lifecycle Tracking

Jobs are tracked through their lifecycle:

| Field | Description |
|-------|-------------|
| `first_seen_at` | When job was first discovered |
| `last_seen_at` | Last time job was found in scrape |
| `scrape_count` | Number of times job was seen |
| `is_active` | Whether job is currently active |
| `closed_at` | When job was marked inactive |

### 3. Inactive Job Detection

After each scrape:
1. Compare scraped jobs with database
2. Jobs not found in scrape are marked inactive
3. Sets `is_active: false` and `closed_at` timestamp
4. Helps track when positions close

### 4. Remote Job Detection

Automatically detects remote positions:
```typescript
const isRemote =
  location.includes('remote') ||
  location.includes('anywhere') ||
  location.includes('virtual');
```

### 5. Scrape Logging

All scrapes are logged to `scrape_logs` table:
- Timestamp
- Success/failure status
- Number of jobs found
- Duration in milliseconds
- Error messages (if failed)

## Scheduling & Automation

### Local Development

Manually trigger scrapes during development:
```bash
curl -X POST http://localhost:3000/api/scrape/greenhouse
```

### Production (Vercel Cron)

1. Create `vercel.json` in project root:
```json
{
  "crons": [
    {
      "path": "/api/scrape/greenhouse",
      "schedule": "0 2 * * *"
    }
  ]
}
```

2. Add authentication to API route:
```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

3. Set `CRON_SECRET` in Vercel environment variables

### Recommended Schedule

- **Daily**: `0 2 * * *` (2 AM daily)
- **Twice Daily**: `0 2,14 * * *` (2 AM and 2 PM)
- **Hourly**: `0 * * * *` (Every hour)

## Performance

### Scrape Duration

For 56 companies (current list):
- **Estimated time**: ~30-60 seconds
- **Per company**: ~500-1000ms
- **Includes**: 500ms delay between companies

### Database Operations

- **Bulk operations**: Jobs upserted one-by-one (could be optimized with batch operations)
- **Inactive marking**: Single bulk update operation
- **Indexing**: Database indexes ensure fast lookups by URL

### Scalability

The scraper can handle:
- ✅ Hundreds of companies
- ✅ Thousands of jobs
- ✅ Concurrent API requests (respects rate limits)
- ⚠️  For 500+ companies, consider batching into multiple scrape jobs

## Error Handling

### Common Errors

**404 Not Found**
```
[Greenhouse] Company Name: No job board found (404)
```
**Causes:**
- Incorrect company slug
- Company doesn't use Greenhouse
- Job board is private or disabled

**403 Forbidden**
```
[Greenhouse] Company Name: Access forbidden (403)
```
**Causes:**
- Private job board
- IP blocked (rare)
- User-Agent blocked (rare)

**Timeout**
```
[Greenhouse] Company Name: Request timeout
```
**Causes:**
- Slow API response
- Network issues
- Increase timeout in scraper settings

### Error Recovery

The scraper is fault-tolerant:
- Errors for individual companies don't stop the scrape
- Other companies continue to be scraped
- Errors are logged but scrape completes
- Final result includes success/failure status

## Monitoring

### Check Active Jobs

```sql
SELECT COUNT(*) FROM jobs
WHERE source = 'greenhouse'
AND is_active = true;
```

### Recent Scrapes

```sql
SELECT * FROM scrape_logs
WHERE source = 'greenhouse'
ORDER BY timestamp DESC
LIMIT 10;
```

### Jobs by Company

```sql
SELECT company, COUNT(*) as job_count
FROM jobs
WHERE source = 'greenhouse'
AND is_active = true
GROUP BY company
ORDER BY job_count DESC;
```

### Failed Scrapes

```sql
SELECT * FROM scrape_logs
WHERE source = 'greenhouse'
AND status = 'failed'
ORDER BY timestamp DESC;
```

## Comparison: Greenhouse vs Ashby

| Feature | Greenhouse | Ashby |
|---------|------------|-------|
| **API Format** | REST JSON | GraphQL |
| **Public API** | ✅ Yes | ✅ Yes |
| **Auth Required** | ❌ No | ❌ No |
| **Response Format** | Simple JSON | Nested GraphQL |
| **Job Status Check** | Not needed | Requires page check |
| **Complexity** | Low | Medium |
| **Speed** | Fast | Slower (needs page checks) |
| **Companies** | 56+ | 49+ |

## Troubleshooting

### Jobs Not Appearing

1. **Check if scrape ran successfully:**
   ```bash
   curl http://localhost:3000/api/scrape/greenhouse
   ```

2. **Verify jobs in database:**
   ```sql
   SELECT * FROM jobs
   WHERE source = 'greenhouse'
   AND company = 'Stripe'
   ORDER BY scraped_at DESC
   LIMIT 10;
   ```

3. **Check scrape logs:**
   ```sql
   SELECT * FROM scrape_logs
   WHERE source = 'greenhouse'
   ORDER BY timestamp DESC
   LIMIT 1;
   ```

### Company Not Scraping

1. **Test company slug:**
   ```bash
   curl https://boards-api.greenhouse.io/v1/boards/SLUG/jobs
   ```

2. **Check for errors in logs:**
   ```bash
   npm run test:greenhouse
   ```

3. **Verify company is in list:**
   - Check `lib/greenhouse-companies.ts`
   - Ensure slug is correct

## Best Practices

1. **Test Before Adding**: Always test new companies with `npm run test:greenhouse`
2. **Monitor Performance**: Check scrape duration in logs
3. **Review Inactive Jobs**: Periodically review jobs marked inactive
4. **Update Company List**: Add new companies as you discover them
5. **Rate Limiting**: Keep 500ms delay to be respectful
6. **Error Handling**: Check logs for recurring errors
7. **Database Cleanup**: Periodically archive very old inactive jobs

## Future Enhancements

Potential improvements:
- [ ] Batch database operations for better performance
- [ ] Parallel company scraping (with rate limiting)
- [ ] Retry logic for failed companies
- [ ] Email notifications on scrape failures
- [ ] Job description scraping (requires page fetch)
- [ ] Salary parsing from job details
- [ ] Department/category tracking
- [ ] Job type detection (full-time, contract, etc.)
- [ ] Applicant tracking (views, applications)

## API Reference

### POST /api/scrape/greenhouse

Triggers a full Greenhouse scrape.

**Request:**
```bash
curl -X POST http://localhost:3000/api/scrape/greenhouse
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Greenhouse scrape completed successfully",
  "data": {
    "jobsFound": 5500,
    "jobsUpserted": 5500,
    "jobsMarkedInactive": 45,
    "durationMs": 180000
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Greenhouse scrape failed",
  "error": "Network error",
  "data": {
    "jobsFound": 0,
    "jobsUpserted": 0,
    "durationMs": 5000
  }
}
```

### GET /api/scrape/greenhouse

Gets scrape status and history.

**Request:**
```bash
curl http://localhost:3000/api/scrape/greenhouse
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeJobs": 5420,
    "lastScrape": {
      "timestamp": "2025-12-22T10:30:00Z",
      "status": "success",
      "jobsFound": 5500,
      "duration": 180000,
      "error": null
    },
    "recentScrapes": [
      {
        "timestamp": "2025-12-22T10:30:00Z",
        "status": "success",
        "jobsFound": 5500,
        "duration": 180000
      }
    ]
  }
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in database
3. Test with `npm run test:greenhouse`
4. Check Greenhouse API status
5. Verify company slugs are correct
