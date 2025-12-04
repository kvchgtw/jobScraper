# Scraper Testing Sub-Agent

A comprehensive testing tool for validating all job scrapers in the application.

## Quick Start

```bash
# Test all scrapers
npm run test:scrapers

# Test a specific scraper
npm run test:scrapers -- --scraper=greenhouse
npm run test:scrapers -- --scraper=lever
npm run test:scrapers -- --scraper=ashby
npm run test:scrapers -- --scraper=ashby-google
npm run test:scrapers -- --scraper=ashby-duckduckgo
npm run test:scrapers -- --scraper=ashby-direct

# Custom search query
npm run test:scrapers -- --query="frontend developer"

# Custom location
npm run test:scrapers -- --location="San Francisco"

# Combined options
npm run test:scrapers -- --scraper=greenhouse --query="AI engineer" --location="remote"
```

## What It Tests

### 1. **Scraper Functionality**
- ✓ Scraper executes without errors
- ✓ Returns data in expected format
- ✓ Handles network failures gracefully
- ✓ Completes within reasonable time

### 2. **Data Validation**
All jobs are validated against the Job schema:

**Required Fields:**
- `id` - Valid UUID string
- `title` - Non-empty string
- `company` - Non-empty string
- `location` - Valid string
- `remote` - Boolean value
- `description` - Non-empty string
- `url` - Valid URL
- `source` - Platform name
- `scraped_at` - ISO timestamp

**Optional Fields:**
- `salary` - String (if present, must be non-empty)
- `posted_date` - ISO date string

### 3. **Data Quality Checks**
- ✓ No duplicate URLs within results
- ✓ All URLs are accessible and properly formatted
- ✓ Company names are properly normalized
- ✓ Remote flag matches location data

### 4. **Performance Metrics**
- Execution time per scraper
- Jobs found per scraper
- Success/failure rates
- Average response times

## Output Format

### Summary Table
```
┌──────────────────────────────┬──────────┬────────────┬───────────────┐
│ Scraper                      │ Status   │ Jobs Found │ Duration (ms) │
├──────────────────────────────┼──────────┼────────────┼───────────────┤
│ greenhouse                   │ ✓ PASS   │ 45         │ 3240          │
│ lever                        │ ✓ PASS   │ 28         │ 2890          │
│ ashby                        │ ✓ PASS   │ 15         │ 5120          │
└──────────────────────────────┴──────────┴────────────┴───────────────┘
```

### Detailed Results
For each scraper, you'll see:
- **Status**: Pass/fail indicator
- **Duration**: Execution time in milliseconds
- **Jobs Found**: Total number of jobs scraped
- **Errors**: Any exceptions or failures
- **Warnings**: Non-critical issues (e.g., no jobs found, duplicates)
- **Validation Errors**: Schema violations with details
- **Sample Jobs**: First 3 jobs with full details

### Example Output
```
─────────────────────────────────────────────────────────────
Testing: GREENHOUSE
─────────────────────────────────────────────────────────────
Query: "software engineer"
Location: "remote"
Running scraper...
✓ Scraper completed in 3240ms
✓ Found 45 jobs
✓ All jobs passed validation

Sample Jobs:

  1. Senior Software Engineer
     Company: Stripe
     Location: Remote
     Remote: Yes
     Source: greenhouse
     URL: https://boards.greenhouse.io/stripe/jobs/123456

  2. Frontend Engineer
     Company: Airbnb
     Location: San Francisco, CA
     Remote: No
     Source: greenhouse
     URL: https://boards.greenhouse.io/airbnb/jobs/789012
```

## Available Scrapers

| Scraper | Description | Companies Covered |
|---------|-------------|-------------------|
| **greenhouse** | Greenhouse ATS API | Airbnb, Stripe, Datadog, GitLab, Coinbase, Grammarly, Canva, Notion, Figma, Airtable |
| **lever** | Lever ATS API | Netflix, Grafana, Benchling, Gusto, Samsara, Affirm, Rippling |
| **ashby** | Ashby via DuckDuckGo search | The Browser Company, Anthropic, Replit, OpenAI, Vercel, Scale AI, etc. |
| **ashby-google** | Ashby via Google search | Same as ashby (alternative method) |
| **ashby-duckduckgo** | Ashby via DuckDuckGo (direct) | Same as ashby (primary method) |
| **ashby-direct** | Direct HTML scraping | Specific Ashby companies |

## Common Use Cases

### Pre-Deployment Testing
```bash
# Run full test suite before deploying
npm run test:scrapers

# Ensure all scrapers pass
# Check for validation errors
# Verify performance benchmarks
```

### Debugging a Specific Scraper
```bash
# Test only the problematic scraper
npm run test:scrapers -- --scraper=greenhouse

# Use verbose output to see detailed errors
# Check sample jobs for data quality issues
```

### Testing New Search Terms
```bash
# Test how scrapers handle different queries
npm run test:scrapers -- --query="data scientist"
npm run test:scrapers -- --query="product manager"
npm run test:scrapers -- --query="designer"
```

### Performance Monitoring
```bash
# Run tests regularly to track performance trends
# Monitor duration metrics
# Identify slow scrapers
# Detect rate limiting or blocking issues
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

This makes it easy to integrate with CI/CD pipelines:

```bash
# In CI/CD pipeline
npm run test:scrapers || exit 1
```

## Interpreting Results

### ✓ PASS - Everything is working correctly
- Scraper executed successfully
- All data passed validation
- No critical errors

### ✗ FAIL - Action required
Common causes:
- **Network errors**: Site is down or blocking requests
- **Schema changes**: API/HTML structure changed
- **Rate limiting**: Too many requests, need to add delays
- **Validation errors**: Data quality issues

### ⚠ WARNINGS - Review recommended
Common warnings:
- **No jobs found**: Query too specific or scraper issue
- **Duplicate URLs**: Scraper logic needs deduplication
- **Missing optional fields**: Salary or posted_date not available

## Extending the Agent

### Adding a New Scraper

1. Create the scraper function in [app/api/jobs/scrapers/](app/api/jobs/scrapers/)
2. Add import to [test-scraper-agent.ts](test-scraper-agent.ts):
   ```typescript
   import { scrapeNewPlatform } from "./app/api/jobs/scrapers/new-platform";
   ```
3. Add to SCRAPERS object:
   ```typescript
   const SCRAPERS = {
     // ... existing scrapers
     "new-platform": scrapeNewPlatform,
   };
   ```
4. Run tests:
   ```bash
   npm run test:scrapers -- --scraper=new-platform
   ```

### Adding Custom Validation

Edit the `validateJob()` function in [test-scraper-agent.ts](test-scraper-agent.ts):

```typescript
function validateJob(job: Job, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Add custom validation logic
  if (job.salary && !job.salary.includes('$')) {
    errors.push({
      jobIndex: index,
      field: "salary",
      issue: "Salary must include currency symbol",
      value: job.salary,
    });
  }

  return errors;
}
```

## Troubleshooting

### "Module not found" errors
```bash
npm install
```

### "ts-node: command not found"
```bash
npm install --save-dev ts-node
```

### All scrapers failing
- Check internet connection
- Verify API endpoints haven't changed
- Check for rate limiting (wait and retry)

### Specific scraper consistently failing
- Review scraper implementation
- Check if site HTML/API structure changed
- Verify company list is up to date
- Test with different queries

### Validation errors on all jobs
- Check Job type definition in [lib/types.ts](lib/types.ts)
- Ensure scraper normalizes data correctly
- Verify schema hasn't changed

## Best Practices

1. **Run tests regularly** - Catch breaking changes early
2. **Test with varied queries** - Ensure scrapers handle different inputs
3. **Monitor performance trends** - Identify degradation over time
4. **Keep company lists updated** - Add new companies as you find them
5. **Review validation errors** - Fix data quality issues promptly
6. **Use specific scrapers for debugging** - Faster iteration
7. **Check sample jobs** - Spot data issues quickly

## Architecture

```
test-scraper-agent.ts
├── Configuration
│   ├── Default query/location
│   ├── Scraper registry
│   └── Validation rules
├── Validation Layer
│   ├── Schema validation
│   ├── URL validation
│   └── Duplicate detection
├── Test Execution
│   ├── Parallel scraper execution
│   ├── Error handling
│   └── Performance tracking
└── Reporting
    ├── Detailed results
    ├── Summary table
    └── Exit codes
```

## Related Files

- [lib/types.ts](lib/types.ts) - Job schema definition
- [app/api/jobs/route.ts](app/api/jobs/route.ts) - API orchestrator
- [app/api/jobs/scrapers/](app/api/jobs/scrapers/) - Individual scrapers
- [package.json](package.json) - npm scripts

## Support

For issues or questions:
1. Check validation errors for specific problems
2. Review scraper implementation
3. Test with different queries/locations
4. Check if external APIs/sites have changed
