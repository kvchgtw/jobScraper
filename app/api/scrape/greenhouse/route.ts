import { NextRequest, NextResponse } from "next/server";
import { scrapeGreenhouse } from "@/lib/scrapers/greenhouse-scraper";

/**
 * POST /api/scrape/greenhouse
 *
 * Triggers the Greenhouse scraper to update job listings
 *
 * This endpoint:
 * - Scrapes all known Greenhouse company job boards
 * - Upserts jobs to the database
 * - Marks missing jobs as inactive
 * - Logs scrape results
 *
 * In production, this should be:
 * - Protected with authentication
 * - Called by a cron job (e.g., Vercel Cron)
 * - Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('[API] Starting Greenhouse scrape...');

    const result = await scrapeGreenhouse();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Greenhouse scrape completed successfully',
        data: {
          jobsFound: result.jobsFound,
          jobsUpserted: result.jobsUpserted,
          jobsMarkedInactive: result.jobsMarkedInactive,
          durationMs: result.duration,
        },
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Greenhouse scrape failed',
        error: result.error,
        data: {
          jobsFound: result.jobsFound,
          jobsUpserted: result.jobsUpserted,
          durationMs: result.duration,
        },
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API] Scrape error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/scrape/greenhouse
 *
 * Returns the status of recent Greenhouse scrapes
 */
export async function GET(request: NextRequest) {
  try {
    // Import supabase here to avoid circular dependencies
    const { supabase } = await import("@/lib/supabase/client");

    // Get recent scrape logs for Greenhouse
    const { data: logs, error } = await supabase
      .from("scrape_logs")
      .select("*")
      .eq("source", "greenhouse")
      .order("timestamp", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch scrape logs',
      }, { status: 500 });
    }

    // Get count of active Greenhouse jobs
    const { count: activeJobs } = await supabase
      .from("jobs")
      .select("*", { count: 'exact', head: true })
      .eq("source", "greenhouse")
      .eq("is_active", true);

    // Get count of inactive Greenhouse jobs
    const { count: inactiveJobs } = await supabase
      .from("jobs")
      .select("*", { count: 'exact', head: true })
      .eq("source", "greenhouse")
      .eq("is_active", false);

    const lastScrape = logs?.[0];
    const recentScrapes = logs || [];

    return NextResponse.json({
      success: true,
      data: {
        activeJobs: activeJobs || 0,
        inactiveJobs: inactiveJobs || 0,
        lastScrape: lastScrape ? {
          timestamp: lastScrape.timestamp,
          status: lastScrape.status,
          jobsFound: lastScrape.jobs_found,
          duration: lastScrape.duration_ms,
          error: lastScrape.error,
        } : null,
        recentScrapes: recentScrapes.map(log => ({
          timestamp: log.timestamp,
          status: log.status,
          jobsFound: log.jobs_found,
          duration: log.duration_ms,
        })),
      },
    });

  } catch (error: any) {
    console.error('[API] Error fetching scrape status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
