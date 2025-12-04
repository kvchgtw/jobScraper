# Job Aggregation API Documentation

## Base URL
```
http://localhost:3000/api  (development)
https://your-app.vercel.app/api  (production)
```

## Endpoints

### 1. Search Jobs

Search for jobs with various filters.

**Endpoint:** `GET /api/search`

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `q` or `query` | string | No | Search keyword (title, company, description) | `engineer` |
| `location` | string | No | Filter by location | `San Francisco` |
| `company` | string | No | Filter by company name | `Anthropic` |
| `remote` | boolean | No | Filter remote jobs only | `true` |
| `source` | string | No | Filter by job board | `greenhouse` |
| `limit` | number | No | Results per page (1-100, default: 50) | `50` |
| `cursor` | string | No | Pagination cursor from previous response | `2025-01-14T10:30:00Z` |

**Response:**

```json
{
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Senior Software Engineer",
      "company": "Anthropic",
      "location": "San Francisco, CA",
      "remote": true,
      "salary": "$150k - $200k",
      "salary_min": 150000,
      "salary_max": 200000,
      "salary_currency": "USD",
      "description": "We are looking for...",
      "url": "https://jobs.ashbyhq.com/anthropic/...",
      "source": "ashby",
      "posted_date": "2025-01-10T12:00:00Z",
      "scraped_at": "2025-01-14T10:30:00Z",
      "is_active": true,
      "first_seen_at": "2025-01-10T12:00:00Z",
      "last_seen_at": "2025-01-14T10:30:00Z",
      "scrape_count": 5
    }
  ],
  "total": 42,
  "limit": 50,
  "nextCursor": "2025-01-14T09:15:00Z",
  "hasMore": false,
  "lastUpdated": "2025-01-14T10:30:00Z"
}
```

**Rate Limiting:**
- 20 requests per minute per IP
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Examples:**

```bash
# Search for AI jobs
curl "http://localhost:3000/api/search?q=AI+Engineer"

# Remote jobs only
curl "http://localhost:3000/api/search?remote=true"

# Jobs at a specific company
curl "http://localhost:3000/api/search?company=Anthropic"

# Combined filters
curl "http://localhost:3000/api/search?q=engineer&location=San+Francisco&remote=true&limit=20"

# Pagination (use nextCursor from previous response)
curl "http://localhost:3000/api/search?q=engineer&cursor=2025-01-14T09:15:00Z"
```

**Error Responses:**

```json
// 400 Bad Request - Invalid parameters
{
  "error": "Invalid query parameters",
  "details": [
    {
      "code": "too_big",
      "maximum": 100,
      "path": ["q"]
    }
  ]
}

// 429 Too Many Requests
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "jobs": []
}
```

---

### 2. Health Check

Check system health and scraper status.

**Endpoint:** `GET /api/health`

**Response:**

```json
{
  "status": "healthy",
  "sources": [
    {
      "source": "greenhouse",
      "status": "healthy",
      "lastSuccess": "2025-01-14T06:00:00Z",
      "failureRate": 0.1,
      "avgDuration": 4523
    },
    {
      "source": "lever",
      "status": "healthy",
      "lastSuccess": "2025-01-14T06:05:00Z",
      "failureRate": 0,
      "avgDuration": 6234
    },
    {
      "source": "ashby",
      "status": "unhealthy",
      "lastSuccess": "2025-01-13T18:00:00Z",
      "failureRate": 0.8,
      "avgDuration": 8912
    }
  ],
  "timestamp": "2025-01-14T12:00:00Z"
}
```

**Status Codes:**
- `200` - System is healthy
- `503` - System is degraded or unhealthy

**Health Status Values:**
- `healthy` - All sources working properly
- `degraded` - Some sources having issues
- `unhealthy` - All sources failing or database down

**Example:**

```bash
curl "http://localhost:3000/api/health"
```

---

## Database Schema

### Jobs Table

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  remote BOOLEAN DEFAULT FALSE,
  salary TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  url TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  posted_date TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  closed_at TIMESTAMPTZ,
  scrape_count INTEGER DEFAULT 1
);
```

### Indexes

```sql
CREATE INDEX idx_jobs_active ON jobs(is_active) WHERE is_active = true;
CREATE INDEX idx_jobs_company_active ON jobs(company) WHERE is_active = true;
CREATE INDEX idx_jobs_location_active ON jobs(location) WHERE is_active = true;
CREATE INDEX idx_jobs_remote_active ON jobs(remote) WHERE is_active = true;
CREATE INDEX idx_jobs_search ON jobs USING GIN(to_tsvector('english', title || ' ' || description || ' ' || company));
```

---

## Setup Instructions

### 1. Database Migration

Run the migration SQL files in order:

```bash
# Apply migrations to Supabase
psql $DATABASE_URL -f supabase/schema.sql
psql $DATABASE_URL -f supabase/migrations/002_enhanced_schema.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

---

## Rate Limiting

Current implementation:
- **Search API**: 20 requests per minute per IP
- **In-memory storage** (resets on server restart)

For production, consider:
- Upstash Redis for distributed rate limiting
- Different limits for authenticated vs anonymous users
- Per-user limits instead of per-IP

---

## Future Enhancements

1. **Caching** - Redis/KV cache for popular queries
2. **Webhooks** - Real-time job updates
3. **Authentication** - User accounts and saved searches
4. **Analytics** - Track popular searches and click-through rates
5. **Job alerts** - Email notifications for new matching jobs
6. **Company pages** - Dedicated pages for each company
7. **Salary insights** - Aggregate salary data and trends
