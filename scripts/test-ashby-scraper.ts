/**
 * Test Ashby Scraper
 * Runs the Ashby scraper to test database connectivity and scraping functionality
 */

import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function testAshbyScraper(): Promise<void> {
  console.log("🚀 Testing Ashby Scraper...\n");
  console.log("=".repeat(60));

  try {
    // Dynamically import scraper after env vars are loaded
    const { scrapeAshby } = await import("../lib/scrapers/ashby-scraper");

    console.log("Starting scrape...\n");
    const startTime = Date.now();

    const result = await scrapeAshby();

    const duration = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log("📊 SCRAPE RESULTS");
    console.log("=".repeat(60) + "\n");

    if (result.success) {
      console.log("✅ Status: SUCCESS");
      console.log(`📝 Jobs Found: ${result.jobsFound}`);
      console.log(`💾 Jobs Upserted: ${result.jobsUpserted}`);
      console.log(`❌ Jobs Marked Inactive: ${result.jobsMarkedInactive}`);
      console.log(`⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.log("\n" + "=".repeat(60));
      console.log("🎉 Scraper test completed successfully!\n");
      process.exit(0);
    } else {
      console.log("❌ Status: FAILED");
      console.log(`📝 Jobs Found: ${result.jobsFound}`);
      console.log(`💾 Jobs Upserted: ${result.jobsUpserted}`);
      console.log(`⏱️  Duration: ${duration}ms`);
      if (result.error) {
        console.log(`⚠️  Error: ${result.error}`);
      }
      console.log("\n" + "=".repeat(60));
      console.log("⚠️  Scraper test failed. Check the error above.\n");
      process.exit(1);
    }
  } catch (error: any) {
    console.log("\n" + "=".repeat(60));
    console.error("❌ ERROR: Scraper test failed");
    console.log("=".repeat(60) + "\n");
    console.error(error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    console.log("");
    process.exit(1);
  }
}

// Run test
testAshbyScraper().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
