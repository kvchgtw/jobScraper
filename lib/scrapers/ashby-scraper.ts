import axios from "axios";
import { v5 as uuidv5 } from "uuid";
import { supabaseServer } from "@/lib/supabase/server";
import { ASHBY_COMPANIES } from "@/lib/ashby-companies";
import type { Job, ScrapeLog } from "@/lib/types";

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const SOURCE = "ashby";

interface ScrapeResult {
  success: boolean;
  jobsFound: number;
  jobsUpserted: number;
  jobsMarkedInactive: number;
  duration: number;
  error?: string;
}

/**
 * Scrapes all Ashby company job boards and updates the database
 * Features:
 * - Upserts jobs (creates new, updates existing)
 * - Tracks first_seen_at and last_seen_at
 * - Marks jobs as inactive when they disappear
 * - Logs scrape results to scrape_logs table
 */
export async function scrapeAshby(): Promise<ScrapeResult> {
  const startTime = Date.now();
  const scrapedJobUrls = new Set<string>();
  let jobsFound = 0;
  let jobsUpserted = 0;

  try {
    console.log(`[Ashby] Starting scrape of ${ASHBY_COMPANIES.length} companies`);

    // Scrape all companies
    for (const company of ASHBY_COMPANIES) {
      try {
        const companyJobs = await scrapeAshbyCompany(company.name, company.slug);
        jobsFound += companyJobs.length;

        // Upsert each job to database
        for (const job of companyJobs) {
          scrapedJobUrls.add(job.url);
          await upsertJob(job);
          jobsUpserted++;
        }

        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`[Ashby] Error scraping ${company.name}:`, error.message);
      }
    }

    // Mark jobs as inactive if they weren't found in this scrape
    const jobsMarkedInactive = await markMissingJobsInactive(scrapedJobUrls);

    const duration = Date.now() - startTime;

    // Log successful scrape
    await logScrape({
      source: SOURCE,
      status: "success",
      jobs_found: jobsFound,
      duration_ms: duration,
    });

    console.log(`[Ashby] ✅ Scrape complete: ${jobsFound} jobs found, ${jobsUpserted} upserted, ${jobsMarkedInactive} marked inactive in ${duration}ms`);

    return {
      success: true,
      jobsFound,
      jobsUpserted,
      jobsMarkedInactive,
      duration,
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || "Unknown error";

    // Log failed scrape
    await logScrape({
      source: SOURCE,
      status: "failed",
      jobs_found: jobsFound,
      duration_ms: duration,
      error: errorMessage,
    });

    console.error(`[Ashby] ❌ Scrape failed:`, errorMessage);

    return {
      success: false,
      jobsFound,
      jobsUpserted,
      jobsMarkedInactive: 0,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Scrapes a single Ashby company's job board using their GraphQL API
 */
async function scrapeAshbyCompany(companyName: string, slug: string): Promise<Job[]> {
  const jobs: Job[] = [];

  try {
    // Ashby uses a GraphQL API to fetch job listings
    const graphqlQuery = {
      operationName: "ApiJobBoardWithTeams",
      variables: {
        organizationHostedJobsPageName: slug,
      },
      query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
        jobBoard: jobBoardWithTeams(
          organizationHostedJobsPageName: $organizationHostedJobsPageName
        ) {
          teams {
            id
            name
            parentTeamId
          }
          jobPostings {
            id
            title
            teamId
            locationId
            locationName
            employmentType
            secondaryLocations {
              locationId
              locationName
            }
          }
        }
      }`,
    };

    const response = await axios.post(
      "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams",
      graphqlQuery,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 15000,
      }
    );

    const jobPostings = response.data?.data?.jobBoard?.jobPostings || [];

    for (const posting of jobPostings) {
      const jobUrl = `https://jobs.ashbyhq.com/${slug}/${posting.id}`;
      const jobId = uuidv5(jobUrl, NAMESPACE);

      // Determine location and remote status from location name
      let location = posting.locationName || "Not specified";
      let isRemote = false;

      // Check if location indicates remote work
      const locationLower = location.toLowerCase();
      if (locationLower.includes('remote')) {
        isRemote = true;
      }

      jobs.push({
        id: jobId,
        title: posting.title,
        company: companyName,
        location,
        remote: isRemote,
        description: `${posting.title} at ${companyName}`,
        url: jobUrl,
        source: SOURCE,
        scraped_at: new Date().toISOString(),
      });
    }

    console.log(`[Ashby] ${companyName}: Found ${jobs.length} jobs`);
    return jobs;

  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`[Ashby] ${companyName}: No job board found (404)`);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[Ashby] ${companyName}: Request timeout`);
    } else if (error.response?.data?.errors) {
      console.error(`[Ashby] ${companyName}: GraphQL error -`, error.response.data.errors[0]?.message);
    } else {
      console.error(`[Ashby] ${companyName}: Error -`, error.message);
    }
    return [];
  }
}

/**
 * Upserts a job to the database
 * - If job exists (by URL), update last_seen_at and scrape_count
 * - If job is new, set first_seen_at and insert
 */
async function upsertJob(job: Job): Promise<void> {
  try {
    // Check if job already exists
    const { data: existingJob } = await supabaseServer
      .from("jobs")
      .select("id, first_seen_at")
      .eq("url", job.url)
      .single();

    const now = new Date().toISOString();

    if (existingJob) {
      // Update existing job
      const { error } = await supabaseServer
        .from("jobs")
        .update({
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          description: job.description,
          scraped_at: now,
          last_seen_at: now,
          is_active: true, // Reactivate if it was inactive
        })
        .eq("url", job.url);

      if (error) {
        console.error(`[Ashby] Error updating job ${job.url}:`, error.message);
      }
    } else {
      // Insert new job
      const { error } = await supabaseServer
        .from("jobs")
        .insert({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          description: job.description,
          url: job.url,
          source: job.source,
          scraped_at: now,
          first_seen_at: now,
          last_seen_at: now,
          is_active: true,
          scrape_count: 1,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error(`[Ashby] Error inserting job ${job.url}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error(`[Ashby] Error upserting job:`, error.message);
  }
}

/**
 * Marks jobs as inactive if they weren't found in this scrape
 * This indicates the job posting has been closed
 */
async function markMissingJobsInactive(scrapedUrls: Set<string>): Promise<number> {
  try {
    // Get all active Ashby jobs
    const { data: activeJobs } = await supabaseServer
      .from("jobs")
      .select("url")
      .eq("source", SOURCE)
      .eq("is_active", true);

    if (!activeJobs) return 0;

    const urlsToDeactivate = activeJobs
      .filter((job: any) => !scrapedUrls.has(job.url))
      .map((job: any) => job.url);

    if (urlsToDeactivate.length === 0) return 0;

    // Mark as inactive
    const { error } = await supabaseServer
      .from("jobs")
      .update({
        is_active: false,
        closed_at: new Date().toISOString(),
      })
      .in("url", urlsToDeactivate);

    if (error) {
      console.error(`[Ashby] Error marking jobs inactive:`, error.message);
      return 0;
    }

    console.log(`[Ashby] Marked ${urlsToDeactivate.length} jobs as inactive`);
    return urlsToDeactivate.length;

  } catch (error: any) {
    console.error(`[Ashby] Error in markMissingJobsInactive:`, error.message);
    return 0;
  }
}

/**
 * Logs scrape execution to scrape_logs table
 */
async function logScrape(log: Omit<ScrapeLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const { error } = await supabaseServer
      .from("scrape_logs")
      .insert({
        source: log.source,
        status: log.status,
        jobs_found: log.jobs_found,
        duration_ms: log.duration_ms,
        error: log.error,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error(`[Ashby] Error logging scrape:`, error.message);
    }
  } catch (error: any) {
    console.error(`[Ashby] Error in logScrape:`, error.message);
  }
}
