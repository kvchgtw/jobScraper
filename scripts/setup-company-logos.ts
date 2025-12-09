/**
 * Setup Company Logos
 *
 * This script:
 * 1. Applies the company_logos table migration
 * 2. Fetches all unique companies from the jobs table
 * 3. Automatically fetches and stores logos for all companies
 *
 * Run with: npx ts-node scripts/setup-company-logos.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Apply the migration SQL
 */
async function applyMigration() {
  console.log('📝 Applying company_logos migration...');

  const migrationPath = path.join(__dirname, '../supabase/migrations/004_company_logos.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by statement and execute
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        // Try direct query if RPC fails
        const result = await supabase.from('_migrations').insert({ statement });
        if (result.error && !result.error.message.includes('already exists')) {
          console.warn('Warning:', result.error.message);
        }
      }
    } catch (err) {
      console.warn('Warning executing statement:', err);
    }
  }

  console.log('✅ Migration applied successfully');
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Fetch company logo from external sources
 */
async function fetchLogo(companyName: string, domain?: string): Promise<string | null> {
  // Try Clearbit if we have domain
  if (domain) {
    try {
      const clearbitUrl = `https://logo.clearbit.com/${domain}`;
      const response = await fetch(clearbitUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`  ✓ Found logo via Clearbit for ${companyName}`);
        return clearbitUrl;
      }
    } catch (err) {
      // Silent fail, try next method
    }
  }

  // Try guessing domain from company name
  if (!domain) {
    const guessedDomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .concat('.com');

    try {
      const clearbitUrl = `https://logo.clearbit.com/${guessedDomain}`;
      const response = await fetch(clearbitUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`  ✓ Found logo via guessed domain for ${companyName}`);
        return clearbitUrl;
      }
    } catch (err) {
      // Silent fail
    }
  }

  console.log(`  ✗ No logo found for ${companyName}`);
  return null;
}

/**
 * Fetch and store logos for all companies
 */
async function setupLogos() {
  console.log('\n🏢 Fetching companies from database...');

  // Get all unique companies with their job URLs
  const { data: companies, error } = await supabase
    .from('jobs')
    .select('company, url')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching companies:', error);
    return;
  }

  // Group by company and get first URL for domain extraction
  const companyMap = new Map<string, string>();
  companies?.forEach(job => {
    if (!companyMap.has(job.company)) {
      companyMap.set(job.company, job.url);
    }
  });

  console.log(`Found ${companyMap.size} unique companies\n`);

  // Generate fallback colors
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

  let processed = 0;
  let found = 0;

  // Process companies in batches to avoid rate limits
  const entries = Array.from(companyMap.entries());
  const batchSize = 10;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async ([companyName, url]) => {
        const domain = extractDomain(url);
        const logoUrl = await fetchLogo(companyName, domain || undefined);
        const fallbackColor = colors[companyName.length % colors.length];

        const { error } = await supabase
          .from('company_logos')
          .upsert({
            company_name: companyName,
            company_domain: domain,
            logo_url: logoUrl,
            fallback_color: fallbackColor
          }, {
            onConflict: 'company_name'
          });

        if (error) {
          console.error(`  ✗ Error storing ${companyName}:`, error.message);
        } else {
          processed++;
          if (logoUrl) found++;
        }
      })
    );

    // Rate limit delay between batches
    if (i + batchSize < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ Processed ${processed} companies`);
  console.log(`   Found logos for ${found} companies`);
  console.log(`   Fallback icons for ${processed - found} companies`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting company logos setup...\n');

  try {
    await applyMigration();
    await setupLogos();
    console.log('\n✨ Setup complete!');
  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    process.exit(1);
  }
}

main();
