import axios from "axios";
import { v5 as uuidv5 } from "uuid";
import { supabaseServer } from "@/lib/supabase/server";
import { GREENHOUSE_COMPANIES } from "@/lib/greenhouse-companies";
import type { Job, ScrapeLog } from "@/lib/types";

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const SOURCE = "greenhouse";

interface ScrapeResult {
  success: boolean;
  jobsFound: number;
  jobsUpserted: number;
  jobsMarkedInactive: number;
  duration: number;
  error?: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  location: {
    name: string;
  };
  absolute_url: string;
  updated_at: string;
  metadata: any[];
}

interface GreenhouseDepartment {
  id: number;
  name: string;
  jobs: GreenhouseJob[];
}

/**
 * Scrapes all Greenhouse company job boards and updates the database
 * Features:
 * - Upserts jobs (creates new, updates existing)
 * - Tracks first_seen_at and last_seen_at
 * - Marks jobs as inactive when they disappear
 * - Logs scrape results to scrape_logs table
 */
export async function scrapeGreenhouse(): Promise<ScrapeResult> {
  const startTime = Date.now();
  const scrapedJobUrls = new Set<string>();
  let jobsFound = 0;
  let jobsUpserted = 0;

  try {
    const totalCompanies = GREENHOUSE_COMPANIES.length;
    console.log(`[Greenhouse] Starting scrape of ${totalCompanies} companies`);

    // Scrape all companies
    for (let i = 0; i < GREENHOUSE_COMPANIES.length; i++) {
      const company = GREENHOUSE_COMPANIES[i];
      const progress = ((i / totalCompanies) * 100).toFixed(1);

      try {
        console.log(`[Greenhouse] [${i + 1}/${totalCompanies}] (${progress}%) Scraping ${company.name}...`);
        const companyJobs = await scrapeGreenhouseCompany(company.name, company.slug);
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
        console.error(`[Greenhouse] Error scraping ${company.name}:`, error.message);
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

    console.log(`[Greenhouse] ✅ Scrape complete: ${jobsFound} jobs found, ${jobsUpserted} upserted, ${jobsMarkedInactive} marked inactive in ${duration}ms`);

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

    console.error(`[Greenhouse] ❌ Scrape failed:`, errorMessage);

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
 * Scrapes a single Greenhouse company's job board using their JSON API
 * Greenhouse provides a public JSON endpoint at: boards.greenhouse.io/{slug}/embed/jobs
 */
async function scrapeGreenhouseCompany(companyName: string, slug: string): Promise<Job[]> {
  const jobs: Job[] = [];

  try {
    // Greenhouse provides a JSON API for job listings
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    const responseData = response.data;

    // Greenhouse API returns jobs grouped by departments
    let jobPostings: GreenhouseJob[] = [];

    if (responseData.jobs && Array.isArray(responseData.jobs)) {
      // Direct array of jobs
      jobPostings = responseData.jobs;
    } else if (responseData.departments && Array.isArray(responseData.departments)) {
      // Jobs grouped by departments
      for (const dept of responseData.departments as GreenhouseDepartment[]) {
        if (dept.jobs && Array.isArray(dept.jobs)) {
          jobPostings.push(...dept.jobs);
        }
      }
    }

    for (const posting of jobPostings) {
      const jobUrl = posting.absolute_url;
      const jobId = uuidv5(jobUrl, NAMESPACE);

      // Determine location and remote status
      let location = posting.location?.name || "Not specified";
      let isRemote = false;

      // Check if location indicates remote work
      const locationLower = location.toLowerCase();
      if (
        locationLower.includes('remote') ||
        locationLower.includes('anywhere') ||
        locationLower.includes('virtual')
      ) {
        isRemote = true;
      }

      // Build description from title
      let description = `${posting.title} at ${companyName}`;

      jobs.push({
        id: jobId,
        title: posting.title,
        company: companyName,
        location,
        remote: isRemote,
        description,
        url: jobUrl,
        source: SOURCE,
        scraped_at: new Date().toISOString(),
      });
    }

    console.log(`[Greenhouse] ${companyName}: ✓ Found ${jobs.length} jobs`);
    return jobs;

  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`[Greenhouse] ${companyName}: No job board found (404)`);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[Greenhouse] ${companyName}: Request timeout`);
    } else if (error.response?.status === 403) {
      console.error(`[Greenhouse] ${companyName}: Access forbidden (403) - board may be private`);
    } else {
      console.error(`[Greenhouse] ${companyName}: Error -`, error.message);
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
        console.error(`[Greenhouse] Error updating job ${job.url}:`, error.message);
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
        console.error(`[Greenhouse] Error inserting job ${job.url}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error(`[Greenhouse] Error upserting job:`, error.message);
  }
}

/**
 * Marks jobs as inactive if they weren't found in this scrape
 * This indicates the job posting has been closed
 */
async function markMissingJobsInactive(scrapedUrls: Set<string>): Promise<number> {
  try {
    // Get all active Greenhouse jobs
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
      console.error(`[Greenhouse] Error marking jobs inactive:`, error.message);
      return 0;
    }

    console.log(`[Greenhouse] Marked ${urlsToDeactivate.length} jobs as inactive`);
    return urlsToDeactivate.length;

  } catch (error: any) {
    console.error(`[Greenhouse] Error in markMissingJobsInactive:`, error.message);
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
      console.error(`[Greenhouse] Error logging scrape:`, error.message);
    }
  } catch (error: any) {
    console.error(`[Greenhouse] Error in logScrape:`, error.message);
  }
}
