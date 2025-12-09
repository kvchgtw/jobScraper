# Company Logos System

This document explains how the automatic company logo system works and how to manage it.

## Overview

The company logo system automatically fetches and displays company logos on the Companies page. When a new company is added to the database through job scraping, the system will:

1. **Automatically fetch** the company logo from external sources
2. **Store** the logo URL in the database for fast retrieval
3. **Fallback** to a colorful letter avatar if no logo is found

## How It Works

### Database Schema

The `company_logos` table stores:
- `company_name`: The company name (unique)
- `logo_url`: URL to the company logo image
- `company_domain`: The company's website domain
- `fallback_color`: Color for the letter avatar fallback
- `created_at` / `updated_at`: Timestamps

### Logo Sources (Priority Order)

1. **Clearbit Logo API** - Primary source using company domain
   - Example: `https://logo.clearbit.com/google.com`
   - Free, no API key required
   - High-quality logos for most companies

2. **Domain Guessing** - Fallback method
   - Converts company name to likely domain (e.g., "Google" → "google.com")
   - Tries to fetch logo from Clearbit

3. **Letter Avatar** - Final fallback
   - Displays first letter of company name
   - Uses consistent color based on company name

### Automatic Logo Fetching

**On Companies Page Load:**
- Companies without logos are automatically identified
- Logo fetch happens in the background (doesn't block UI)
- Logos are stored in database for future use
- UI updates dynamically when logos are fetched

**On New Company Discovery:**
- When a new company appears in the jobs table
- The Companies page will automatically fetch and store its logo
- First visit shows letter avatar, subsequent visits show real logo

## Setup & Management

### Initial Setup (One-time)

Run this command to set up logos for all existing companies:

```bash
npm run setup-logos
```

This script will:
1. Apply the `company_logos` table migration
2. Fetch all unique companies from the jobs table
3. Attempt to fetch logos for each company
4. Store results in the database

**Expected output:**
```
🚀 Starting company logos setup...
📝 Applying company_logos migration...
✅ Migration applied successfully

🏢 Fetching companies from database...
Found 150 unique companies

  ✓ Found logo via Clearbit for Google
  ✓ Found logo via guessed domain for Microsoft
  ✗ No logo found for Small Startup Inc

✅ Processed 150 companies
   Found logos for 120 companies
   Fallback icons for 30 companies

✨ Setup complete!
```

### Manual Logo Management

#### Add/Update Logo for Specific Company

Use the API endpoint:

```bash
# Fetch logo for a company
curl http://localhost:3000/api/logos?company=Google

# Returns:
{
  "company": "Google",
  "logoUrl": "https://logo.clearbit.com/google.com",
  "domain": "google.com",
  "cached": false
}
```

#### Batch Fetch Logos

```bash
curl -X POST http://localhost:3000/api/logos \
  -H "Content-Type: application/json" \
  -d '{
    "companies": ["Google", "Microsoft", "Apple"]
  }'
```

#### Manually Set Logo URL

Connect to your Supabase database and run:

```sql
UPDATE company_logos
SET logo_url = 'https://example.com/your-logo.png'
WHERE company_name = 'Your Company';
```

### Database Migration

The migration file is located at:
```
supabase/migrations/004_company_logos.sql
```

If you need to manually apply it to Supabase:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration file contents
4. Run the migration

## Troubleshooting

### Logos Not Appearing

**Check if logo is in database:**
```sql
SELECT * FROM company_logos WHERE company_name = 'Google';
```

**Re-fetch logo:**
```bash
# Delete existing entry to force re-fetch
curl http://localhost:3000/api/logos?company=Google
```

**Check if image URL is accessible:**
- Open the logo URL in a browser
- If it returns 404, the logo may have been removed
- Try manually setting a different logo URL

### Adding Custom Logos

For companies without publicly available logos:

1. Host the logo image (upload to Supabase Storage or image CDN)
2. Update the database:
   ```sql
   UPDATE company_logos
   SET logo_url = 'https://your-cdn.com/logo.png',
       company_domain = 'company.com'
   WHERE company_name = 'Company Name';
   ```

### Performance Optimization

**Logos are cached at multiple levels:**
1. Database - Logo URLs are stored permanently
2. Browser - Images are cached by the browser
3. CDN - Clearbit uses CDN for fast delivery

**Rate Limiting:**
- The batch script processes 10 companies at a time
- 1 second delay between batches to avoid rate limits
- Frontend fetches logos for missing companies in background

## API Reference

### GET `/api/logos?company={name}`

Fetch logo for a single company.

**Parameters:**
- `company` (required): Company name

**Response:**
```json
{
  "company": "Google",
  "logoUrl": "https://logo.clearbit.com/google.com",
  "domain": "google.com",
  "fallbackColor": "#4ECDC4",
  "cached": true
}
```

### POST `/api/logos`

Batch fetch logos for multiple companies.

**Body:**
```json
{
  "companies": ["Google", "Microsoft", "Apple"]
}
```

**Response:**
```json
{
  "logos": [
    {
      "company": "Google",
      "logoUrl": "https://logo.clearbit.com/google.com",
      "fallbackColor": "#4ECDC4",
      "cached": false
    },
    ...
  ]
}
```

## Future Enhancements

Potential improvements:
- Add support for more logo APIs (Logo.dev, Brandfetch, etc.)
- Implement logo verification/quality checks
- Add admin interface for logo management
- Support for custom logo uploads via UI
- Automatic logo refresh/update mechanism
- Analytics on logo fetch success rates

## Files Modified/Created

- `supabase/migrations/004_company_logos.sql` - Database schema
- `app/api/logos/route.ts` - Logo fetching API
- `app/api/companies/route.ts` - Updated to include logos
- `app/companies/page.tsx` - Display logos with fallback
- `scripts/setup-company-logos.ts` - Initial setup script
- `package.json` - Added `setup-logos` command
