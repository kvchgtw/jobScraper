import axios from "axios";
import { v5 as uuidv5 } from "uuid";
import { supabaseServer } from "@/lib/supabase/server";
import { LEVER_COMPANIES } from "@/lib/lever-companies";
import type { Job, ScrapeLog } from "@/lib/types";

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const SOURCE = "lever";

interface ScrapeResult {
  success: boolean;
  jobsFound: number;
  jobsUpserted: number;
  jobsMarkedInactive: number;
  duration: number;
  error?: string;
}

interface LeverJob {
  id: string;
  text: string;
  categories: {
    team?: string;
    department?: string;
    location?: string;
    commitment?: string;
  };
  description: string;
  descriptionPlain: string;
  lists: Array<{
    text: string;
    content: string;
  }>;
  additional: string;
  additionalPlain: string;
  hostedUrl: string;
  applyUrl: string;
  createdAt: number;
}

/**
 * Scrapes all Lever company job boards and updates the database
 * Features:
 * - Upserts jobs (creates new, updates existing)
 * - Tracks first_seen_at and last_seen_at
 * - Marks jobs as inactive when they disappear
 * - Logs scrape results to scrape_logs table
 */
export async function scrapeLever(): Promise<ScrapeResult> {
  const startTime = Date.now();
  const scrapedJobUrls = new Set<string>();
  let jobsFound = 0;
  let jobsUpserted = 0;

  try {
    const totalCompanies = LEVER_COMPANIES.length;
    console.log(`[Lever] Starting scrape of ${totalCompanies} companies`);

    // Scrape all companies
    for (let i = 0; i < LEVER_COMPANIES.length; i++) {
      const company = LEVER_COMPANIES[i];
      const progress = ((i / totalCompanies) * 100).toFixed(1);

      try {
        console.log(`[Lever] [${i + 1}/${totalCompanies}] (${progress}%) Scraping ${company.name}...`);
        const companyJobs = await scrapeLeverCompany(company.name, company.slug);
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
        console.error(`[Lever] Error scraping ${company.name}:`, error.message);
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

    console.log(`[Lever] ✅ Scrape complete: ${jobsFound} jobs found, ${jobsUpserted} upserted, ${jobsMarkedInactive} marked inactive in ${duration}ms`);

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

    console.error(`[Lever] ❌ Scrape failed:`, errorMessage);

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
 * Scrapes a single Lever company's job board using their JSON API
 * Lever provides a simple JSON API at: https://api.lever.co/v0/postings/{slug}
 */
async function scrapeLeverCompany(companyName: string, slug: string): Promise<Job[]> {
  const jobs: Job[] = [];

  try {
    // Lever has a public API endpoint for job postings
    const response = await axios.get(
      `https://api.lever.co/v0/postings/${slug}`,
      {
        params: {
          mode: 'json',
          skip: 0,
          limit: 1000, // Get all jobs
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 15000,
      }
    );

    const jobPostings: LeverJob[] = response.data || [];

    for (const posting of jobPostings) {
      const jobUrl = posting.hostedUrl;
      const jobId = uuidv5(jobUrl, NAMESPACE);

      // Determine location and remote status
      let location = posting.categories.location || "Not specified";
      let isRemote = false;

      // Check if location indicates remote work
      const locationLower = location.toLowerCase();
      if (locationLower.includes('remote') || locationLower.includes('anywhere')) {
        isRemote = true;
      }

      // Get job description (use plain text for better search)
      const description = posting.descriptionPlain || posting.description || `${posting.text} at ${companyName}`;

      jobs.push({
        id: jobId,
        title: posting.text,
        company: companyName,
        location,
        remote: isRemote,
        description: description.substring(0, 5000), // Limit description length
        url: jobUrl,
        source: SOURCE,
        scraped_at: new Date().toISOString(),
      });
    }

    console.log(`[Lever] ${companyName}: ✓ Found ${jobs.length} active jobs`);
    return jobs;

  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`[Lever] ${companyName}: No job board found (404)`);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[Lever] ${companyName}: Request timeout`);
    } else {
      console.error(`[Lever] ${companyName}: Error -`, error.message);
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
        console.error(`[Lever] Error updating job ${job.url}:`, error.message);
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
        console.error(`[Lever] Error inserting job ${job.url}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error(`[Lever] Error upserting job:`, error.message);
  }
}

/**
 * Marks jobs as inactive if they weren't found in this scrape
 * This indicates the job posting has been closed
 */
async function markMissingJobsInactive(scrapedUrls: Set<string>): Promise<number> {
  try {
    // Get all active Lever jobs
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
      console.error(`[Lever] Error marking jobs inactive:`, error.message);
      return 0;
    }

    console.log(`[Lever] Marked ${urlsToDeactivate.length} jobs as inactive`);
    return urlsToDeactivate.length;

  } catch (error: any) {
    console.error(`[Lever] Error in markMissingJobsInactive:`, error.message);
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
      console.error(`[Lever] Error logging scrape:`, error.message);
    }
  } catch (error: any) {
    console.error(`[Lever] Error in logScrape:`, error.message);
  }
}
