/**
 * Schema Verification Script
 * Tests that the database schema is properly set up with all required tables, columns, and policies
 */

import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function verifySchema(): Promise<void> {
  console.log("🔍 Starting schema verification...\n");

  // Dynamically import supabase after env vars are loaded
  const { supabaseServer } = await import("../lib/supabase/server");

  const results: VerificationResult[] = [];

  // Test 1: Check if jobs table exists and has required columns
  console.log("1️⃣  Checking jobs table structure...");
  try {
    const { data, error } = await supabaseServer
      .from("jobs")
      .select("*")
      .limit(0);

    if (error) {
      results.push({
        passed: false,
        message: "Jobs table check failed",
        details: error.message,
      });
    } else {
      results.push({
        passed: true,
        message: "Jobs table exists and is accessible",
      });
    }
  } catch (error: any) {
    results.push({
      passed: false,
      message: "Jobs table check error",
      details: error.message,
    });
  }

  // Test 2: Check if scrape_logs table exists
  console.log("2️⃣  Checking scrape_logs table...");
  try {
    const { data, error } = await supabaseServer
      .from("scrape_logs")
      .select("*")
      .limit(0);

    if (error) {
      results.push({
        passed: false,
        message: "Scrape_logs table check failed",
        details: error.message,
      });
    } else {
      results.push({
        passed: true,
        message: "Scrape_logs table exists and is accessible",
      });
    }
  } catch (error: any) {
    results.push({
      passed: false,
      message: "Scrape_logs table check error",
      details: error.message,
    });
  }

  // Test 3: Check if job_changes table exists
  console.log("3️⃣  Checking job_changes table...");
  try {
    const { data, error } = await supabaseServer
      .from("job_changes")
      .select("*")
      .limit(0);

    if (error) {
      results.push({
        passed: false,
        message: "Job_changes table check failed",
        details: error.message,
      });
    } else {
      results.push({
        passed: true,
        message: "Job_changes table exists and is accessible",
      });
    }
  } catch (error: any) {
    results.push({
      passed: false,
      message: "Job_changes table check error",
      details: error.message,
    });
  }

  // Test 4: Test insert permissions on jobs table
  console.log("4️⃣  Testing insert permissions on jobs table...");
  try {
    const testJob = {
      id: "00000000-0000-0000-0000-000000000000",
      title: "Test Job",
      company: "Test Company",
      location: "Test Location",
      remote: false,
      description: "Test Description",
      url: "https://test.com/job/test-" + Date.now(),
      source: "test",
      scraped_at: new Date().toISOString(),
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      is_active: true,
      scrape_count: 1,
    };

    const { error: insertError } = await supabaseServer
      .from("jobs")
      .insert(testJob);

    if (insertError) {
      results.push({
        passed: false,
        message: "Insert permission test failed",
        details: insertError.message,
      });
    } else {
      // Clean up test data
      await supabaseServer.from("jobs").delete().eq("url", testJob.url);
      results.push({
        passed: true,
        message: "Insert permissions work correctly",
      });
    }
  } catch (error: any) {
    results.push({
      passed: false,
      message: "Insert permission test error",
      details: error.message,
    });
  }

  // Test 5: Test update permissions on jobs table
  console.log("5️⃣  Testing update permissions on jobs table...");
  try {
    const testJob = {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Test Job Update",
      company: "Test Company",
      location: "Test Location",
      remote: false,
      description: "Test Description",
      url: "https://test.com/job/update-" + Date.now(),
      source: "test",
      scraped_at: new Date().toISOString(),
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      is_active: true,
      scrape_count: 1,
    };

    // Insert first
    const { error: insertError } = await supabaseServer
      .from("jobs")
      .insert(testJob);

    if (insertError) {
      results.push({
        passed: false,
        message: "Update test setup failed (insert)",
        details: insertError.message,
      });
    } else {
      // Try to update
      const { error: updateError } = await supabaseServer
        .from("jobs")
        .update({ title: "Updated Title" })
        .eq("url", testJob.url);

      if (updateError) {
        results.push({
          passed: false,
          message: "Update permission test failed",
          details: updateError.message,
        });
      } else {
        results.push({
          passed: true,
          message: "Update permissions work correctly",
        });
      }

      // Clean up
      await supabaseServer.from("jobs").delete().eq("url", testJob.url);
    }
  } catch (error: any) {
    results.push({
      passed: false,
      message: "Update permission test error",
      details: error.message,
    });
  }

  // Test 6: Test logging to scrape_logs
  console.log("6️⃣  Testing scrape_logs insert...");
  try {
    const { error } = await supabaseServer.from("scrape_logs").insert({
      source: "test",
      status: "success",
      jobs_found: 0,
      duration_ms: 100,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      results.push({
        passed: false,
        message: "Scrape_logs insert failed",
        details: error.message,
      });
    } else {
      results.push({
        passed: true,
        message: "Scrape_logs insert works correctly",
      });
    }
  } catch (error: any) {
    results.push({
      passed: false,
      message: "Scrape_logs insert error",
      details: error.message,
    });
  }

  // Test 7: Check if job_stats view exists
  console.log("7️⃣  Checking job_stats view...");
  try {
    const { data, error } = await supabaseServer
      .from("job_stats")
      .select("*")
      .limit(1);

    if (error) {
      results.push({
        passed: false,
        message: "Job_stats view check failed",
        details: error.message,
      });
    } else {
      results.push({
        passed: true,
        message: "Job_stats view exists and is accessible",
      });
    }
  } catch (error: any) {
    results.push({
      passed: false,
      message: "Job_stats view check error",
      details: error.message,
    });
  }

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("📊 VERIFICATION RESULTS");
  console.log("=".repeat(60) + "\n");

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} Test ${index + 1}: ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log(
    `Total: ${results.length} tests | ✅ Passed: ${passedCount} | ❌ Failed: ${failedCount}`
  );
  console.log("=".repeat(60) + "\n");

  if (failedCount === 0) {
    console.log("🎉 All tests passed! Schema is correctly set up.\n");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Please check your schema setup.\n");
    process.exit(1);
  }
}

// Run verification
verifySchema().catch((error) => {
  console.error("❌ Verification script error:", error);
  process.exit(1);
});
