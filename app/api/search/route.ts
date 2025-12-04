import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { z } from "zod";
import type { SearchResponse } from "@/lib/types";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Validation schema
const searchSchema = z.object({
  q: z.string().min(0).max(100).optional(),
  query: z.string().min(0).max(100).optional(), // Support both 'q' and 'query'
  location: z.string().max(50).optional(),
  company: z.string().max(50).optional(),
  remote: z.enum(['true', 'false', '1', '0']).optional(),
  source: z.string().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 20 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimitResult = await rateLimit(`search:${clientIp}`, 20, 60000);

    // Add rate limit headers
    const headers = new Headers({
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers,
        }
      );
    }

    // Parse and validate query parameters
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const validated = searchSchema.safeParse(params);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validated.error.issues
        },
        { status: 400 }
      );
    }

    const {
      q,
      query,
      location,
      company,
      remote,
      source,
      limit,
      cursor
    } = validated.data;

    // Use 'q' or 'query' interchangeably
    const searchQuery = q || query;

    // Build Supabase query
    let supabaseQuery = supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true) // Only show active jobs
      .order("scraped_at", { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there's more

    // Apply cursor pagination
    if (cursor) {
      supabaseQuery = supabaseQuery.lt("scraped_at", cursor);
    }

    // Full-text search across title, company, and description
    if (searchQuery) {
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
      );
    }

    // Filter by location
    if (location) {
      supabaseQuery = supabaseQuery.ilike("location", `%${location}%`);
    }

    // Filter by company
    if (company) {
      supabaseQuery = supabaseQuery.ilike("company", `%${company}%`);
    }

    // Filter by remote
    if (remote === 'true' || remote === '1') {
      supabaseQuery = supabaseQuery.eq("remote", true);
    }

    // Filter by source
    if (source) {
      supabaseQuery = supabaseQuery.eq("source", source);
    }

    const { data: jobs, error } = await supabaseQuery;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to search jobs", jobs: [] },
        { status: 500 }
      );
    }

    // Pagination logic
    const hasMore = (jobs?.length || 0) > limit;
    const items = hasMore ? jobs!.slice(0, limit) : (jobs || []);
    const nextCursor = hasMore ? items[items.length - 1].scraped_at : null;
    const lastUpdated = items.length > 0 ? items[0].scraped_at : null;

    const response: SearchResponse = {
      jobs: items,
      total: items.length,
      limit,
      nextCursor,
      hasMore,
      lastUpdated: lastUpdated || undefined,
    };

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error", jobs: [] },
      { status: 500 }
    );
  }
}
