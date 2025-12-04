# How the Current Scraper Works & Coverage Analysis

## Executive Summary

**Current Coverage:** Your Greenhouse scraper covers **only 10 companies** out of **7,000+ companies** that use Greenhouse ATS.

**Coverage Rate:** ~0.14% (10 out of 7,000)

**Why:** The current approach uses a **hardcoded company list**, not a discovery mechanism.

---

## How the Current Scraper Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    GREENHOUSE SCRAPER                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  HARDCODED COMPANY LIST (10 companies) │
         │  - airbnb                              │
         │  - stripe                              │
         │  - datadog                             │
         │  - gitlab                              │
         │  - coinbase                            │
         │  - grammarly                           │
         │  - canva                               │
         │  - notion                              │
         │  - figma                               │
         │  - airtable                            │
         └────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   FOR EACH COMPANY            │
              │                               │
              │   1. Build API URL            │
              │   2. Fetch jobs via Axios     │
              │   3. Filter by query/location │
              │   4. Normalize to Job schema  │
              │   5. Add 200ms delay          │
              └───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Return Job[]   │
                    └─────────────────┘
```

### Step-by-Step Process

#### 1. **Company List Initialization**

The scraper starts with a hardcoded array of 10 companies:

```typescript
const greenhouseCompanies = [
  "airbnb",
  "stripe",
  "datadog",
  "gitlab",
  "coinbase",
  "grammarly",
  "canva",
  "notion",
  "figma",
  "airtable",
];
```

**Key Point:** This list is **manually maintained** and **static**.

#### 2. **API Call to Greenhouse Public API**

For each company, the scraper makes an HTTP GET request to:

```
https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true
```

**Example:**
```
https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true
```

**API Response Structure:**
```json
{
  "jobs": [
    {
      "id": 7271799,
      "title": "Engineering Manager, Data Frameworks",
      "location": {
        "name": "Remote - US"
      },
      "absolute_url": "https://careers.airbnb.com/positions/7271799",
      "content": "<p>Job description HTML...</p>",
      "updated_at": "2025-01-10T12:34:56Z"
    }
  ]
}
```

#### 3. **Filtering**

Jobs are filtered using case-insensitive string matching:

```typescript
.filter((job: any) => {
  const matchesQuery = query
    ? job.title.toLowerCase().includes(query.toLowerCase())
    : true;
  const matchesLocation = location
    ? job.location?.name?.toLowerCase().includes(location.toLowerCase())
    : true;
  return matchesQuery && matchesLocation;
})
```

**Example:** If query = "engineer" and location = "remote":
- ✅ "Senior Software Engineer" + "Remote - US" → **MATCH**
- ❌ "Product Manager" + "Remote - US" → **NO MATCH** (title)
- ❌ "Software Engineer" + "San Francisco, CA" → **NO MATCH** (location)

#### 4. **Normalization**

Each job is transformed into the standard `Job` schema:

```typescript
{
  id: uuidv5(rawJob.absolute_url, NAMESPACE),  // Deterministic UUID
  title: rawJob.title,
  company: "airbnb",
  location: rawJob.location?.name || "Not specified",
  remote: rawJob.location?.name?.toLowerCase().includes("remote") || false,
  salary: undefined,  // Not provided by Greenhouse API
  description: rawJob.content || "",
  url: rawJob.absolute_url,
  source: "greenhouse",
  posted_date: rawJob.updated_at,
  scraped_at: new Date().toISOString()
}
```

**UUID Generation:** Uses UUID v5 (SHA-1 hash) based on job URL for consistent IDs across multiple scrapes.

#### 5. **Rate Limiting**

200ms delay between company requests to avoid:
- API rate limiting
- IP blocking
- Server overload

#### 6. **Error Handling**

```typescript
catch (error: any) {
  if (error.response?.status === 404) {
    console.log(`Greenhouse board not found for ${company}`);
  } else {
    console.error(`Error scraping...`);
  }
}
```

Errors are **logged but don't stop** the scraper from processing other companies.

---

## Coverage Analysis

### Current Coverage: 10 Companies

| Company | Industry | Status | Jobs Found (Test) |
|---------|----------|--------|-------------------|
| **Airbnb** | Travel/Hospitality | ✅ Working | ~30-50 |
| **Stripe** | Fintech | ✅ Working | ~100+ |
| **Datadog** | DevOps/Monitoring | ✅ Working | ~50+ |
| **GitLab** | DevOps/SaaS | ✅ Working | ~30+ |
| **Coinbase** | Cryptocurrency | ✅ Working | ~20+ |
| **Grammarly** | EdTech/Writing | ✅ Working | ~15+ |
| **Canva** | Design Software | ❌ 404 Error | 0 |
| **Notion** | Productivity | ❌ 404 Error | 0 |
| **Figma** | Design Software | ✅ Working | ~30+ |
| **Airtable** | Collaboration | ✅ Working | ~25+ |

**Active Companies:** 8/10 (80%)
**Total Jobs (typical scrape):** ~350-400 jobs

### Why Only 10 Companies?

The current scraper uses a **manual discovery approach**:

1. Developer manually researches which companies use Greenhouse
2. Developer verifies the company slug works (e.g., "airbnb")
3. Developer adds it to the hardcoded array
4. This list **never updates automatically**

**Limitations:**
- ❌ No automatic discovery of new Greenhouse clients
- ❌ No removal of companies that migrate away
- ❌ Biased toward well-known tech companies
- ❌ Missing 6,990+ other companies using Greenhouse

---

## How Does It "Know" It Covered All Companies?

**Short Answer:** **It doesn't.**

The scraper has **no mechanism** to:
- Discover all Greenhouse companies
- Verify coverage completeness
- Update the company list automatically

### What It Actually Does

It simply iterates through the 10 hardcoded companies and reports:

```
Greenhouse: Scraped 8 companies, found 177 matching jobs
```

This means:
- **8 companies responded successfully** (not 404)
- **177 jobs matched** the search query
- **Nothing** about how many companies were missed

---

## The Greenhouse Ecosystem

### Total Market Size

According to market research:

| Source | Estimated Companies |
|--------|---------------------|
| **Official (Greenhouse)** | 7,000+ |
| **6sense (Third-party)** | 20,294 |
| **Enlyft** | 3,734 |
| **Conservative Estimate** | **~7,000** |

### Industry Distribution

Companies using Greenhouse span:
- Technology (SaaS, Fintech, DevOps)
- Healthcare
- Retail/E-commerce
- Education
- Finance
- Manufacturing
- Non-profits

**Your Current Coverage:** Only covers **Technology sector**, specifically **well-known startups/unicorns**.

### Notable Missing Companies

Large companies using Greenhouse that your scraper **misses**:

- **HubSpot** (Marketing/Sales)
- **HelloFresh** (Food delivery)
- **Duolingo** (EdTech)
- **Peloton** (Fitness)
- **Reddit** (Social media)
- **Robinhood** (Fintech)
- **Twilio** (Communications)
- **Zoom** (Video conferencing)
- **DoorDash** (Food delivery)
- **Instacart** (Grocery delivery)
- ... and **6,980+ more**

---

## Similar Patterns in Other Scrapers

### Lever Scraper (7 Companies)

```typescript
const leverCompanies = [
  "netflix",
  "grafana",
  "benchling",
  "gusto",
  "samsara",
  "affirm",
  "rippling",
];
```

**Coverage:** 7 out of ~2,000-3,000 companies using Lever
**Rate:** ~0.2-0.3%

### Ashby Scraper (35+ Companies)

```typescript
export const ASHBY_COMPANIES: AshbyCompany[] = [
  { name: "The Browser Company", slug: "thebrowsercompany" },
  { name: "Anthropic", slug: "anthropic" },
  { name: "Replit", slug: "replit" },
  // ... 35+ total
];
```

**Coverage:** 35 out of ~500-1,000 companies using Ashby
**Rate:** ~3-7%

**Better Strategy:** Ashby scraper also uses **search engine discovery** (Google/DuckDuckGo) to find companies dynamically, which improves coverage significantly.

---

## Pros & Cons of Current Approach

### ✅ Advantages

1. **Reliable:** Direct API calls, predictable response format
2. **Fast:** Parallel requests, 200ms rate limiting
3. **Quality:** Official API provides structured data
4. **No parsing errors:** JSON responses, not HTML scraping
5. **Easy to maintain:** Simple code, easy to debug

### ❌ Disadvantages

1. **Extremely low coverage:** 0.14% of total market
2. **Manual maintenance:** Requires developer to add companies
3. **Stale data:** Companies may change slugs or migrate away
4. **Bias:** Only covers famous tech companies
5. **Scalability:** Cannot scale to thousands of companies
6. **No discovery:** Cannot find new Greenhouse clients automatically

---

## How to Improve Coverage

### Option 1: Expand Hardcoded List (Manual)

**Effort:** High (ongoing research)
**Coverage:** Medium (100-500 companies)
**Maintenance:** High (constant updates)

**Steps:**
1. Research companies using Greenhouse (LinkedIn, job boards)
2. Verify company slugs work
3. Add to hardcoded list
4. Repeat monthly

**Limitations:**
- Still requires manual work
- Will never reach 100% coverage
- Time-intensive

### Option 2: Build a Company Discovery System (Automated)

**Effort:** High (initial build)
**Coverage:** High (5,000+ companies)
**Maintenance:** Low (self-updating)

**Approach A: Search Engine Discovery**
```
1. Search Google/DuckDuckGo for "site:greenhouse.io/companies"
2. Parse results to extract company slugs
3. Store in database
4. Scrape all discovered companies
```

**Approach B: Greenhouse Directory Scraping**
```
1. Find Greenhouse's public company directory (if it exists)
2. Scrape all listed companies
3. Build master company list
4. Update weekly
```

**Approach C: Third-Party Data**
```
1. Purchase company list from:
   - 6sense.com
   - Enlyft.com
   - HG Data
2. Import into your database
3. Scrape all companies
```

**Approach D: Crowdsourcing**
```
1. Track which companies users search for
2. Attempt to scrape new companies on-demand
3. Cache successful company slugs
4. Build database organically over time
```

### Option 3: Hybrid Approach (Recommended)

**Combine:**
1. **Curated list** of 100-200 high-quality companies (manual)
2. **Search engine discovery** for dynamic expansion (automated)
3. **User-driven discovery** for niche companies (crowdsourced)

**Example Implementation:**
```typescript
async function scrapeGreenhouse(query: string, location?: string) {
  // 1. Scrape curated list (100 companies)
  const curatedJobs = await scrapeCuratedCompanies(query, location);

  // 2. Discover companies via search
  const discoveredCompanies = await discoverGreenhouseCompanies(query);
  const discoveredJobs = await scrapeDiscoveredCompanies(
    discoveredCompanies,
    query,
    location
  );

  // 3. Merge results
  return [...curatedJobs, ...discoveredJobs];
}
```

---

## Comparison: Greenhouse vs Other ATS

| ATS Platform | Your Coverage | Estimated Total Companies | Coverage % |
|--------------|---------------|---------------------------|------------|
| **Greenhouse** | 10 | 7,000 | 0.14% |
| **Lever** | 7 | 2,000 | 0.35% |
| **Ashby** | 35 + discovery | 500 | 7%+ |
| **Workday** | 0 | 10,000+ | 0% |
| **Indeed** | 0 (disabled) | Millions | 0% |
| **LinkedIn** | 0 | Millions | 0% |

**Total Coverage Across All Platforms:** ~52 companies explicitly + search discovery

---

## Performance Characteristics

### Current Greenhouse Scraper Metrics

From test results:

| Metric | Value |
|--------|-------|
| **Companies queried** | 10 |
| **Companies responding** | 8 |
| **Total execution time** | ~6-10 seconds |
| **Jobs found (typical)** | 150-350 |
| **Rate limiting delay** | 200ms between companies |
| **Timeout per request** | 5 seconds |
| **Success rate** | 80% (2/10 return 404) |

### Scaling Projections

If you expanded to **1,000 companies**:

| Metric | Current (10) | Scaled (1,000) |
|--------|--------------|----------------|
| **Execution time** | 10s | **~16 minutes** |
| **Network requests** | 10 | 1,000 |
| **Delay overhead** | 2s | 200s (3.3 min) |
| **Jobs found** | 300 | 30,000+ |
| **Memory usage** | Negligible | ~50-100 MB |

**Challenges at Scale:**
- ⚠️ Request timeouts
- ⚠️ Rate limiting from Greenhouse
- ⚠️ Memory consumption
- ⚠️ Database write performance

**Solutions:**
- Use queuing system (Bull, BullMQ)
- Implement batch processing
- Cache results with TTL
- Parallelize with worker threads
- Use Redis for deduplication

---

## Recommendations

### Immediate Actions (Low Effort)

1. **Expand company list to 50-100**
   - Research top tech companies
   - Add to greenhouseCompanies array
   - Test each one

2. **Fix broken companies**
   - Remove "canva" and "notion" (404 errors)
   - Or investigate correct slugs

3. **Add monitoring**
   - Track success/failure rates
   - Alert when companies return 404
   - Log performance metrics

### Medium-Term (Moderate Effort)

1. **Build company database**
   - Create `greenhouse_companies` table in Supabase
   - Store company slugs, last_scraped, success_rate
   - Update list programmatically

2. **Implement search discovery**
   - Use Google/DuckDuckGo to find companies
   - Extract company slugs from job URLs
   - Add discovered companies to database

3. **Add priority system**
   - Mark high-value companies (FAANG, unicorns)
   - Scrape priority companies first
   - Optional: scrape others in background

### Long-Term (High Effort)

1. **Build comprehensive ATS database**
   - 500+ Greenhouse companies
   - 200+ Lever companies
   - 100+ Ashby companies
   - 50+ Workday companies

2. **Implement intelligent discovery**
   - ML-based company detection
   - Automatic slug generation/testing
   - Self-healing when companies migrate

3. **Scale infrastructure**
   - Queue-based scraping
   - Distributed workers
   - Caching layer
   - Real-time updates

---

## Conclusion

Your current Greenhouse scraper:

✅ **Works well** for what it does (reliable, fast, clean data)
❌ **Covers only 0.14%** of the total Greenhouse market
❌ **Has no discovery mechanism** to expand coverage
❌ **Requires manual maintenance** to add new companies

**Bottom Line:** The scraper **doesn't know** it has covered almost all Greenhouse clients—because it **hasn't**. It only knows about the 10 companies hardcoded in the array.

To achieve comprehensive coverage, you need to implement an **automated discovery system** or **significantly expand the company list**.
