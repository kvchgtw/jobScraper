import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch company logo from various sources
 * Priority: Google Favicon API (reliable and free)
 */
async function fetchCompanyLogo(companyName: string, domain?: string): Promise<string | null> {
  // If we have a domain, use Google's favicon service (very reliable)
  if (domain) {
    try {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      return faviconUrl;
    } catch (error) {
      console.log(`Google favicon failed for ${domain}:`, error);
    }
  }

  // Try to guess domain from company name
  if (!domain) {
    const guessedDomain = companyName.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .concat('.com');

    try {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${guessedDomain}&sz=128`;
      return faviconUrl;
    } catch (error) {
      console.log(`Google favicon guess failed for ${guessedDomain}:`, error);
    }
  }

  return null;
}

/**
 * Extract domain from job URL
 */
function extractDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * GET endpoint to fetch logo for a specific company
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyName = searchParams.get('company');

  if (!companyName) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 });
  }

  try {
    // Check if logo already exists in database
    const { data: existingLogo } = await supabase
      .from('company_logos')
      .select('*')
      .eq('company_name', companyName)
      .single();

    if (existingLogo?.logo_url) {
      return NextResponse.json({
        company: companyName,
        logoUrl: existingLogo.logo_url,
        domain: existingLogo.company_domain,
        cached: true
      });
    }

    // Try to get domain from jobs table
    const { data: job } = await supabase
      .from('jobs')
      .select('url')
      .eq('company', companyName)
      .limit(1)
      .single();

    const domain = job?.url ? extractDomainFromUrl(job.url) : null;

    // Fetch logo from external sources
    const logoUrl = await fetchCompanyLogo(companyName, domain || undefined);

    // Generate fallback color
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const fallbackColor = colors[companyName.length % colors.length];

    // Store in database
    const { error: upsertError } = await supabase
      .from('company_logos')
      .upsert({
        company_name: companyName,
        company_domain: domain,
        logo_url: logoUrl,
        fallback_color: fallbackColor
      }, {
        onConflict: 'company_name'
      });

    if (upsertError) {
      console.error('Error storing logo:', upsertError);
    }

    return NextResponse.json({
      company: companyName,
      logoUrl: logoUrl,
      domain: domain,
      fallbackColor: fallbackColor,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching company logo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company logo' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to batch fetch logos for multiple companies
 */
export async function POST(request: NextRequest) {
  try {
    const { companies } = await request.json();

    if (!Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json({ error: 'Companies array required' }, { status: 400 });
    }

    // Fetch logos for all companies in parallel
    const results = await Promise.all(
      companies.map(async (companyName: string) => {
        try {
          // Check existing logo
          const { data: existingLogo } = await supabase
            .from('company_logos')
            .select('*')
            .eq('company_name', companyName)
            .single();

          if (existingLogo?.logo_url) {
            return {
              company: companyName,
              logoUrl: existingLogo.logo_url,
              fallbackColor: existingLogo.fallback_color,
              cached: true
            };
          }

          // Get domain from jobs
          const { data: job } = await supabase
            .from('jobs')
            .select('url')
            .eq('company', companyName)
            .limit(1)
            .single();

          const domain = job?.url ? extractDomainFromUrl(job.url) : null;
          const logoUrl = await fetchCompanyLogo(companyName, domain || undefined);

          const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
          const fallbackColor = colors[companyName.length % colors.length];

          // Store in database
          await supabase
            .from('company_logos')
            .upsert({
              company_name: companyName,
              company_domain: domain,
              logo_url: logoUrl,
              fallback_color: fallbackColor
            }, {
              onConflict: 'company_name'
            });

          return {
            company: companyName,
            logoUrl: logoUrl,
            fallbackColor: fallbackColor,
            cached: false
          };

        } catch (error) {
          console.error(`Error processing ${companyName}:`, error);
          const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
          return {
            company: companyName,
            logoUrl: null,
            fallbackColor: colors[companyName.length % colors.length],
            error: true
          };
        }
      })
    );

    return NextResponse.json({ logos: results });

  } catch (error) {
    console.error('Error in batch logo fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company logos' },
      { status: 500 }
    );
  }
}
