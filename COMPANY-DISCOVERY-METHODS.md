# Methods to Get Complete Company Lists for ATS Platforms

## TL;DR - Best Methods Ranked

| Method | Coverage | Cost | Effort | Legality | Recommended? |
|--------|----------|------|--------|----------|--------------|
| **1. Search Engine Discovery** | High (70-80%) | Free | Medium | ✅ Legal | ⭐⭐⭐⭐⭐ |
| **2. Third-Party Data** | High (50-60%) | $$$$ | Low | ✅ Legal | ⭐⭐⭐⭐ |
| **3. Job Aggregator APIs** | Very High (90%+) | $$-$$$ | Low | ✅ Legal | ⭐⭐⭐⭐⭐ |
| **4. Crowdsourced Discovery** | Medium (40-60%) | Free | Low | ✅ Legal | ⭐⭐⭐⭐ |
| **5. Manual Curation** | Low (5-10%) | Free | Very High | ✅ Legal | ⭐⭐ |
| **6. Common Crawl** | Very High (80%+) | Free | Very High | ✅ Legal | ⭐⭐⭐ |
| **7. Sitemap Analysis** | Low-Medium | Free | Medium | ⚠️ Gray area | ⭐⭐ |

---

## Method 1: Search Engine Discovery (RECOMMENDED)

### Overview
Use Google, DuckDuckGo, or Bing to find all job boards hosted on Greenhouse/Lever/Ashby domains.

### How It Works

#### A. Google Search API
```bash
# Search for all Greenhouse job boards
site:boards.greenhouse.io OR site:job-boards.greenhouse.io

# With filters
site:boards.greenhouse.io "software engineer"
```

**Implementation:**
```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';

async function discoverGreenhouseCompanies(): Promise<string[]> {
  const companies = new Set<string>();

  // Use Google Custom Search API (requires API key)
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  for (let page = 0; page < 10; page++) {
    const startIndex = page * 10 + 1;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=site:boards.greenhouse.io&start=${startIndex}`;

    const response = await axios.get(url);

    if (response.data.items) {
      response.data.items.forEach((item: any) => {
        // Extract company from URL: https://boards.greenhouse.io/{company}
        const match = item.link.match(/boards\.greenhouse\.io\/([^\/]+)/);
        if (match) {
          companies.add(match[1]);
        }
      });
    }
  }

  return Array.from(companies);
}
```

**Cost:** Free tier: 100 queries/day, Paid: $5/1000 queries

#### B. DuckDuckGo HTML Search (No API Key Required)
```typescript
async function discoverViaDuckDuckGo(): Promise<string[]> {
  const companies = new Set<string>();

  for (let page = 0; page < 50; page++) {
    const response = await axios.post(
      'https://html.duckduckgo.com/html/',
      new URLSearchParams({
        q: 'site:boards.greenhouse.io',
        s: String(page * 30), // DuckDuckGo pagination
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; JobAggregator/1.0)',
        },
      }
    );

    const $ = cheerio.load(response.data);
    const results = $('.result__url');

    if (results.length === 0) break; // No more results

    results.each((_, element) => {
      const url = $(element).text();
      const match = url.match(/boards\.greenhouse\.io\/([^\/]+)/);
      if (match) {
        companies.add(match[1]);
      }
    });

    await delay(1000); // Rate limiting
  }

  return Array.from(companies);
}
```

**Cost:** Free, no API key needed
**Limitations:** Rate limiting, may get blocked

#### C. Bing Search API
```typescript
async function discoverViaBing(): Promise<string[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY;
  const companies = new Set<string>();

  for (let offset = 0; offset < 1000; offset += 50) {
    const response = await axios.get(
      'https://api.bing.microsoft.com/v7.0/search',
      {
        params: {
          q: 'site:boards.greenhouse.io',
          count: 50,
          offset: offset,
        },
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
      }
    );

    if (response.data.webPages?.value) {
      response.data.webPages.value.forEach((result: any) => {
        const match = result.url.match(/boards\.greenhouse\.io\/([^\/]+)/);
        if (match) {
          companies.add(match[1]);
        }
      });
    }
  }

  return Array.from(companies);
}
```

**Cost:** Free tier: 3 transactions/sec, 1000 calls/month

### Pros & Cons

✅ **Pros:**
- High coverage (can discover 70-80% of companies)
- Free or low-cost
- Legal (using public search APIs)
- Automated and scalable
- Discovers new companies automatically

❌ **Cons:**
- Requires API keys (except DuckDuckGo)
- Rate limiting
- May miss recently added companies
- Requires parsing and validation

### Estimated Coverage
- **Greenhouse:** 5,000-6,000 companies (out of 7,000)
- **Lever:** 1,500-2,000 companies (out of 2,500)
- **Ashby:** 400-500 companies (out of 500-600)

---

## Method 2: Third-Party Data Providers

### Overview
Purchase verified company lists from B2B data vendors.

### Providers

#### A. **6sense** (https://6sense.com)
- **Dataset:** 20,294 companies using Greenhouse (as of 2025)
- **Data includes:** Company name, domain, industry, employee count, revenue
- **Cost:** Contact for pricing (typically $5,000-$50,000/year)
- **Quality:** High (verified through web tracking)

#### B. **Enlyft** (https://enlyft.com)
- **Dataset:** 3,734 companies using Greenhouse
- **Data includes:** Company details, technographic data
- **Cost:** $500-$5,000 depending on volume
- **Quality:** Medium-High

#### C. **HG Data** (https://hgdata.com)
- **Dataset:** Thousands of companies using various ATS
- **Data includes:** Company name, contract dates, spend estimates
- **Cost:** Enterprise pricing (contact sales)
- **Quality:** Very High (tracks contracts and spend)

#### D. **TechDataPark** (https://techdatapark.com)
- **Dataset:** Comprehensive Greenhouse customer list
- **Data includes:** Decision-maker contact information
- **Cost:** $500-$2,000 per list
- **Quality:** Medium

#### E. **ReadyContacts** (https://readycontacts.com)
- **Dataset:** 346+ verified Greenhouse customers
- **Data includes:** Complete company and contact info
- **Cost:** $1,000-$3,000
- **Quality:** Medium-High

### Example Usage
```typescript
// After purchasing data (typically CSV format)
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

async function importThirdPartyData(csvPath: string) {
  const companies: string[] = [];

  const parser = createReadStream(csvPath).pipe(
    parse({ columns: true })
  );

  for await (const record of parser) {
    // Assuming CSV has 'company_slug' or 'domain' column
    companies.push(record.company_slug);
  }

  // Store in database
  await storeCompaniesInDatabase(companies);
}
```

### Pros & Cons

✅ **Pros:**
- High-quality verified data
- Includes additional metadata (industry, size, etc.)
- Legal and compliant
- Low effort (just import)
- Updated regularly by vendor

❌ **Cons:**
- **Expensive** ($500-$50,000+)
- May not have company slugs (just domains)
- Still need to map domains to ATS board URLs
- Subscription required for updates

---

## Method 3: Job Aggregator APIs (BEST FOR COMPREHENSIVE COVERAGE)

### Overview
Use existing job aggregation services that already track ATS platforms.

### Providers

#### A. **Adzuna API** (https://www.adzuna.com/developers)
- **Coverage:** 125k+ company career sites, 37+ ATS platforms
- **Cost:** Free tier available, paid plans from $0.0025/call
- **Data:** Job postings with company info, ATS detection
- **API Endpoint:** `https://api.adzuna.com/v1/api/jobs/{country}/search`

```typescript
async function scrapeViaAdzuna(query: string) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  const response = await axios.get(
    `https://api.adzuna.com/v1/api/jobs/us/search/1`,
    {
      params: {
        app_id: appId,
        app_key: appKey,
        what: query,
        where: 'remote',
        results_per_page: 50,
      },
    }
  );

  return response.data.results
    .filter((job: any) => job.redirect_url?.includes('greenhouse.io'))
    .map((job: any) => normalizeJob(job));
}
```

#### B. **The Muse API** (https://www.themuse.com/developers)
- **Coverage:** 1,000+ companies
- **Cost:** Free
- **Data:** Job postings from major tech companies

#### C. **GitHub Jobs API** (Deprecated but alternatives exist)
- Use RemoteOK API, We Work Remotely, etc.

#### D. **Common Job Aggregators to Scrape:**
- Indeed (requires partnership)
- LinkedIn (requires API access)
- ZipRecruiter
- Glassdoor (limited API)

### Pros & Cons

✅ **Pros:**
- **Highest coverage** (90%+ of companies)
- Fresh, up-to-date data
- Includes job content (titles, descriptions)
- Legal APIs
- Already normalized

❌ **Cons:**
- API costs can add up
- Rate limiting
- May not expose ATS platform info directly
- Need to parse redirect URLs

---

## Method 4: Crowdsourced Discovery (SMART LONG-TERM STRATEGY)

### Overview
Build your company database organically as users search for jobs.

### Implementation Strategy

```typescript
// Store discovered companies in database
async function attemptCompanyScrape(companySlug: string) {
  try {
    const response = await axios.get(
      `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs`,
      { timeout: 5000 }
    );

    if (response.status === 200 && response.data.jobs) {
      // Company exists! Store it
      await db.insert('greenhouse_companies', {
        slug: companySlug,
        discovered_at: new Date(),
        last_scraped: new Date(),
        job_count: response.data.jobs.length,
        status: 'active',
      });

      return true;
    }
  } catch (error) {
    // Company doesn't exist or error occurred
    return false;
  }
}

// When user searches for a company, try to discover it
async function searchWithDiscovery(companyName: string, query: string) {
  // Generate potential slugs
  const slugs = generatePotentialSlugs(companyName);
  // ["apple", "apple-inc", "appleinc", "apple-careers"]

  for (const slug of slugs) {
    const exists = await attemptCompanyScrape(slug);
    if (exists) {
      console.log(`Discovered new company: ${slug}`);
      break;
    }
  }
}

function generatePotentialSlugs(companyName: string): string[] {
  const normalized = companyName.toLowerCase().trim();
  return [
    normalized.replace(/\s+/g, ''),          // "Apple Inc" → "appleinc"
    normalized.replace(/\s+/g, '-'),         // "Apple Inc" → "apple-inc"
    normalized.replace(/[^a-z0-9]/g, ''),    // Remove special chars
    normalized.split(' ')[0],                 // First word only
    `${normalized.split(' ')[0]}careers`,    // "applecareers"
  ];
}
```

### Database Schema
```sql
CREATE TABLE ats_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,  -- 'greenhouse', 'lever', 'ashby'
  slug TEXT NOT NULL,
  company_name TEXT,
  domain TEXT,
  discovered_at TIMESTAMP DEFAULT NOW(),
  last_scraped TIMESTAMP,
  job_count INTEGER,
  status TEXT DEFAULT 'active',  -- 'active', 'inactive', 'migrated'
  UNIQUE(platform, slug)
);

CREATE INDEX idx_ats_companies_platform ON ats_companies(platform);
CREATE INDEX idx_ats_companies_status ON ats_companies(platform, status);
```

### Pros & Cons

✅ **Pros:**
- **Free** (no API costs)
- Grows organically over time
- Discovers companies relevant to your users
- Low maintenance
- Self-updating

❌ **Cons:**
- Slow growth initially
- May miss companies users don't search for
- Requires initial seed data
- Incomplete coverage

### Estimated Timeline
- **Month 1:** 50-100 companies
- **Month 6:** 500-1,000 companies
- **Year 1:** 2,000-3,000 companies
- **Year 2:** 4,000-5,000 companies

---

## Method 5: Manual Curation

### Overview
Manually research and add companies to your list.

### Sources for Research

1. **Tech Company Lists:**
   - Y Combinator companies (https://www.ycombinator.com/companies)
   - Crunchbase (https://www.crunchbase.com)
   - TechCrunch funding announcements
   - Forbes Cloud 100
   - Built In company lists

2. **Industry-Specific Lists:**
   - Fintech: Fintech50, CB Insights Fintech 250
   - HealthTech: Rock Health, CB Insights Digital Health
   - EdTech: EdSurge, GSV 150
   - E-commerce: Internet Retailer Top 1000

3. **Job Board Analysis:**
   - Visit company career pages
   - Check if URL contains `greenhouse.io`, `lever.co`, `ashbyhq.com`
   - Extract company slug

### Example Workflow
```bash
# 1. Get Y Combinator companies
# Visit: https://www.ycombinator.com/companies
# Export to CSV

# 2. For each company:
#    - Google: "{company name} careers"
#    - Check career page URL
#    - If greenhouse.io → extract slug
#    - Add to list

# 3. Validate each slug:
curl https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
```

### Pros & Cons

✅ **Pros:**
- **Free**
- High-quality curated list
- Can prioritize valuable companies
- No technical complexity

❌ **Cons:**
- **Extremely time-consuming**
- Does not scale
- Quickly becomes outdated
- Requires constant maintenance
- Human error prone

### Estimated Effort
- **1 hour:** 10-20 companies
- **1 day:** 50-100 companies
- **1 week:** 200-500 companies
- **1 month:** 1,000-2,000 companies

---

## Method 6: Common Crawl Dataset

### Overview
Use Common Crawl's web archive to find all URLs matching ATS patterns.

### What is Common Crawl?
- Free, open-source web crawl data
- 3+ billion web pages per month
- Updated monthly
- Petabytes of data available via S3

### Implementation

```python
# Requires AWS CLI and athena-cli
import boto3
from urllib.parse import urlparse

def query_common_crawl_for_greenhouse():
    """
    Query Common Crawl index for Greenhouse URLs
    """
    athena = boto3.client('athena')

    query = """
    SELECT url, COUNT(*) as count
    FROM ccindex
    WHERE crawl = 'CC-MAIN-2025-04'
      AND (url_host_name = 'boards.greenhouse.io'
           OR url_host_name = 'job-boards.greenhouse.io')
    GROUP BY url
    ORDER BY count DESC
    """

    response = athena.start_query_execution(
        QueryString=query,
        QueryExecutionContext={'Database': 'ccindex'},
        ResultConfiguration={'OutputLocation': 's3://your-bucket/results/'}
    )

    # Parse results to extract company slugs
    # ...
```

### Pros & Cons

✅ **Pros:**
- **Free**
- Comprehensive coverage (billions of pages)
- Historical data available
- Legally obtained data

❌ **Cons:**
- **Very technical** (requires AWS, Athena, big data skills)
- Data processing complexity
- Delayed updates (monthly)
- Requires infrastructure
- Large dataset (petabytes)

---

## Method 7: Sitemap Analysis (Gray Area)

### Overview
Check if Greenhouse/Lever/Ashby have sitemaps listing all customer job boards.

### Approach
```typescript
async function checkSitemap() {
  // Try common sitemap locations
  const sitemapUrls = [
    'https://www.greenhouse.io/sitemap.xml',
    'https://boards.greenhouse.io/sitemap.xml',
    'https://job-boards.greenhouse.io/sitemap.xml',
    'https://boards.greenhouse.io/robots.txt',
  ];

  for (const url of sitemapUrls) {
    try {
      const response = await axios.get(url);
      console.log(response.data);
      // Parse XML sitemap to extract company URLs
    } catch (error) {
      console.log(`No sitemap at ${url}`);
    }
  }
}
```

### Reality Check
Based on research:
- ❌ Greenhouse does **NOT** publish a master sitemap with all customer job boards
- ❌ Each company's job board is independent
- ❌ No centralized directory exists

### Pros & Cons

✅ **Pros:**
- Would be easy if it existed
- Legal (public sitemap)

❌ **Cons:**
- **Doesn't exist** for Greenhouse/Lever/Ashby
- Not applicable

---

## Recommended Implementation Strategy

### Phase 1: Quick Start (Week 1)
1. **Manual curation:** Add 50-100 high-value companies
2. **Search engine discovery:** Use DuckDuckGo to find 500+ companies
3. **Store in database**

### Phase 2: Automation (Weeks 2-4)
1. **Implement crowdsourced discovery:** Learn from user searches
2. **Set up search API:** Use Google/Bing for automated discovery
3. **Schedule weekly discovery runs**

### Phase 3: Scale (Months 2-6)
1. **Purchase third-party data:** One-time import of 3,000+ companies
2. **Integrate job aggregator API:** Add Adzuna or similar
3. **Implement Common Crawl** (optional, for completeness)

### Phase 4: Maintenance (Ongoing)
1. **Monitor company status:** Detect 404s, migrations
2. **Update company metadata**
3. **Add new platforms** (Workday, iCIMS, etc.)

---

## Code Example: Complete Discovery System

```typescript
// lib/discovery.ts
import axios from 'axios';
import { db } from './supabase';

export class CompanyDiscovery {
  // Method 1: DuckDuckGo search
  async discoverViaDuckDuckGo(platform: 'greenhouse' | 'lever' | 'ashby') {
    const domains = {
      greenhouse: 'boards.greenhouse.io',
      lever: 'jobs.lever.co',
      ashby: 'jobs.ashbyhq.com',
    };

    const companies = await this.searchDuckDuckGo(
      `site:${domains[platform]}`
    );

    await this.storeCompanies(companies, platform);
  }

  // Method 4: Crowdsourced discovery
  async discoverOnDemand(companyName: string) {
    const slugs = this.generateSlugs(companyName);

    for (const platform of ['greenhouse', 'lever', 'ashby']) {
      for (const slug of slugs) {
        const exists = await this.validateCompany(platform, slug);
        if (exists) {
          await db.insert('ats_companies', {
            platform,
            slug,
            company_name: companyName,
            discovered_at: new Date(),
          });
          return { platform, slug };
        }
      }
    }

    return null;
  }

  // Validate company exists
  async validateCompany(platform: string, slug: string): Promise<boolean> {
    const urls = {
      greenhouse: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
      lever: `https://api.lever.co/v0/postings/${slug}`,
      ashby: `https://jobs.ashbyhq.com/${slug}`,
    };

    try {
      const response = await axios.get(urls[platform], { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private generateSlugs(name: string): string[] {
    const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    return [
      normalized.replace(/\s+/g, ''),
      normalized.replace(/\s+/g, '-'),
      normalized.split(' ')[0],
    ];
  }
}
```

---

## Summary & Recommendations

### For Your Job Aggregator:

**Immediate (This Week):**
1. ✅ Use **DuckDuckGo search discovery** to find 500-1,000 companies (free)
2. ✅ Implement **crowdsourced discovery** for long-term growth (free)

**Short-term (This Month):**
3. ✅ Get Google Search API key and automate discovery (free tier)
4. ✅ Build database to track companies with status monitoring

**Long-term (This Quarter):**
5. 💰 Consider purchasing **third-party data** for one-time boost ($500-$2,000)
6. 💰 Integrate **Adzuna API** for comprehensive coverage ($25-$100/month)

### Expected Coverage After Implementation:

| Platform | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|----------|---------|---------------|---------------|---------------|
| Greenhouse | 10 (0.14%) | 1,000 (14%) | 3,000 (43%) | 5,000+ (70%+) |
| Lever | 7 (0.35%) | 500 (25%) | 1,500 (60%) | 2,000+ (80%+) |
| Ashby | 35 (7%) | 200 (40%) | 400 (80%) | 500+ (90%+) |

This strategy will take you from **0.14% coverage to 70%+ coverage** in 3-6 months.
