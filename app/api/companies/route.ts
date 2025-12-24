import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchQuery = (searchParams.get('q') || '').trim();
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const { data: companyRows, error: companiesError } = await supabase.rpc(
      'get_active_companies',
      {
        search_term: searchQuery || null,
        result_limit: limit,
        result_offset: offset,
      }
    );

    if (companiesError) {
      console.error('Supabase error:', companiesError);
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      );
    }

    const normalizedCompanies = (companyRows || []).map((company: any) => ({
      name: company.name,
      jobCount: company.job_count,
      activeJobCount: company.active_job_count,
      locations: Array.isArray(company.locations) ? company.locations : [],
      remoteAvailable: company.remote_available,
    }));

    // Get total count of distinct companies for accurate pagination
    const { data: totalCount, error: countError } = await supabase
      .rpc('count_active_companies', { search_term: searchQuery || null });

    if (countError) {
      console.error('Supabase count error:', countError);
    }

    const total = typeof totalCount === 'number'
      ? totalCount
      : offset + normalizedCompanies.length;

    const hasMore = offset + normalizedCompanies.length < total;

    // Fetch company logos from database
    const companyNames = normalizedCompanies.map(c => c.name);
    let logosData: { company_name: string; logo_url: string | null; fallback_color: string | null; }[] | null = [];
    if (companyNames.length > 0) {
      const { data: logos } = await supabase
        .from('company_logos')
        .select('company_name, logo_url, fallback_color')
        .in('company_name', companyNames);
      logosData = logos;
    }

    // Create a map for quick logo lookup
    const logoMap = new Map(
      logosData?.map(logo => [logo.company_name, { logoUrl: logo.logo_url, fallbackColor: logo.fallback_color }]) || []
    );

    // Add logo info to companies
    const companiesWithLogos = normalizedCompanies.map(company => ({
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
