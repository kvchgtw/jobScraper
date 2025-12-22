import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    // Build the query to aggregate companies
    let query = supabase
      .from('jobs')
      .select('company, location, remote, is_active');

    // Apply search filter if provided
    if (searchQuery) {
      query = query.ilike('company', `%${searchQuery}%`);
    }

    // Only get active jobs
    query = query.eq('is_active', true);

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      );
    }

    // Aggregate companies data (case-insensitive grouping)
    const companiesMap = new Map<string, {
      name: string;
      jobCount: number;
      activeJobCount: number;
      locations: Set<string>;
      remoteAvailable: boolean;
    }>();

    jobs?.forEach((job) => {
      const companyName = job.company;
      const companyKey = companyName.toLowerCase(); // Use lowercase for grouping

      if (!companiesMap.has(companyKey)) {
        companiesMap.set(companyKey, {
          name: companyName, // Store original name (will be the first occurrence)
          jobCount: 0,
          activeJobCount: 0,
          locations: new Set(),
          remoteAvailable: false,
        });
      }

      const company = companiesMap.get(companyKey)!;

      // Prefer capitalized version of the name
      if (companyName.charAt(0) === companyName.charAt(0).toUpperCase() &&
          company.name.charAt(0) === company.name.charAt(0).toLowerCase()) {
        company.name = companyName;
      }

      company.jobCount++;

      if (job.is_active) {
        company.activeJobCount++;
      }

      if (job.location) {
        company.locations.add(job.location);
      }

      if (job.remote) {
        company.remoteAvailable = true;
      }
    });

    // Convert to array and sort by active job count
    const allCompanies = Array.from(companiesMap.values())
      .map(company => ({
        name: company.name,
        jobCount: company.jobCount,
        activeJobCount: company.activeJobCount,
        locations: Array.from(company.locations),
        remoteAvailable: company.remoteAvailable,
      }))
      .sort((a, b) => b.activeJobCount - a.activeJobCount);

    // Apply pagination
    const total = allCompanies.length;
    const companies = allCompanies.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    // Fetch company logos from database
    const companyNames = companies.map(c => c.name);
    const { data: logos } = await supabase
      .from('company_logos')
      .select('company_name, logo_url, fallback_color')
      .in('company_name', companyNames);

    // Create a map for quick logo lookup
    const logoMap = new Map(
      logos?.map(logo => [logo.company_name, { logoUrl: logo.logo_url, fallbackColor: logo.fallback_color }]) || []
    );

    // Add logo info to companies
    const companiesWithLogos = companies.map(company => ({
      ...company,
      logoUrl: logoMap.get(company.name)?.logoUrl || null,
      fallbackColor: logoMap.get(company.name)?.fallbackColor || null,
    }));

    return NextResponse.json({
      companies: companiesWithLogos,
      total,
      hasMore,
      offset,
      limit
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
