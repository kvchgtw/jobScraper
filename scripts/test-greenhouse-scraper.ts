/**
 * Test Greenhouse Scraper
 *
 * This script tests the Greenhouse scraper with a sample company
 * to verify it's working correctly before running on all companies.
 *
 * Run with: npm run test:greenhouse
 */

import axios from 'axios';

// Test a well-known company using Greenhouse
const TEST_COMPANY = {
  name: "Stripe",
  slug: "stripe"
};

interface GreenhouseJob {
  id: number;
  title: string;
  location: {
    name: string;
  };
  absolute_url: string;
  updated_at: string;
}

interface GreenhouseDepartment {
  id: number;
  name: string;
  jobs: GreenhouseJob[];
}

async function testGreenhouseScraper() {
  console.log(`\n🧪 Testing Greenhouse Scraper`);
  console.log(`=`.repeat(50));
  console.log(`\nCompany: ${TEST_COMPANY.name}`);
  console.log(`Slug: ${TEST_COMPANY.slug}`);
  console.log(`API URL: https://boards-api.greenhouse.io/v1/boards/${TEST_COMPANY.slug}/jobs\n`);

  try {
    // Test API request
    console.log(`📡 Fetching jobs from Greenhouse API...`);
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${TEST_COMPANY.slug}/jobs`;

    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`✅ Response received successfully\n`);

    const responseData = response.data;

    // Parse jobs from response
    let jobPostings: GreenhouseJob[] = [];

    if (responseData.jobs && Array.isArray(responseData.jobs)) {
      // Direct array of jobs
      jobPostings = responseData.jobs;
      console.log(`📊 Response Format: Direct jobs array`);
    } else if (responseData.departments && Array.isArray(responseData.departments)) {
      // Jobs grouped by departments
      console.log(`📊 Response Format: Jobs grouped by departments`);
      console.log(`📁 Departments found: ${responseData.departments.length}`);

      for (const dept of responseData.departments as GreenhouseDepartment[]) {
        if (dept.jobs && Array.isArray(dept.jobs)) {
          console.log(`   - ${dept.name}: ${dept.jobs.length} jobs`);
          jobPostings.push(...dept.jobs);
        }
      }
    }

    console.log(`\n📈 Total Jobs Found: ${jobPostings.length}\n`);

    if (jobPostings.length === 0) {
      console.log(`⚠️  No jobs found. This could mean:`);
      console.log(`   - The company has no open positions`);
      console.log(`   - The API format has changed`);
      console.log(`   - The company slug is incorrect\n`);
      return;
    }

    // Display sample jobs
    console.log(`📝 Sample Jobs (showing first 5):`);
    console.log(`${'─'.repeat(50)}\n`);

    const sampleJobs = jobPostings.slice(0, 5);
    sampleJobs.forEach((job, index) => {
      const location = job.location?.name || "Not specified";
      const isRemote = location.toLowerCase().includes('remote');

      console.log(`${index + 1}. ${job.title}`);
      console.log(`   📍 Location: ${location} ${isRemote ? '(Remote)' : ''}`);
      console.log(`   🔗 URL: ${job.absolute_url}`);
      console.log(`   🆔 ID: ${job.id}`);
      console.log(`   📅 Updated: ${job.updated_at}`);
      console.log();
    });

    // Statistics
    const remoteJobs = jobPostings.filter(job =>
      job.location?.name?.toLowerCase().includes('remote') ||
      job.location?.name?.toLowerCase().includes('anywhere')
    ).length;

    const locations = new Set(jobPostings.map(job => job.location?.name).filter(Boolean));

    console.log(`📊 Statistics:`);
    console.log(`${'─'.repeat(50)}`);
    console.log(`   Total Jobs: ${jobPostings.length}`);
    console.log(`   Remote Jobs: ${remoteJobs} (${((remoteJobs / jobPostings.length) * 100).toFixed(1)}%)`);
    console.log(`   Unique Locations: ${locations.size}`);
    console.log();

    // Show locations
    if (locations.size <= 10) {
      console.log(`📍 All Locations:`);
      Array.from(locations).forEach(loc => console.log(`   - ${loc}`));
      console.log();
    }

    console.log(`✅ Test completed successfully!\n`);
    console.log(`💡 Next steps:`);
    console.log(`   1. Review the sample jobs above`);
    console.log(`   2. Verify the data looks correct`);
    console.log(`   3. Run the full scraper with: npm run scrape:greenhouse`);
    console.log();

  } catch (error: any) {
    console.error(`\n❌ Test failed!`);
    console.error(`${'─'.repeat(50)}\n`);

    if (error.response) {
      console.error(`HTTP Error: ${error.response.status} ${error.response.statusText}`);
      console.error(`URL: ${error.config?.url}`);

      if (error.response.status === 404) {
        console.error(`\n⚠️  Job board not found. Possible reasons:`);
        console.error(`   - Company slug is incorrect`);
        console.error(`   - Company doesn't use Greenhouse`);
        console.error(`   - Job board is private or disabled`);
      } else if (error.response.status === 403) {
        console.error(`\n⚠️  Access forbidden. Possible reasons:`);
        console.error(`   - Job board is private`);
        console.error(`   - IP/User-Agent is blocked`);
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error(`Request timeout - server took too long to respond`);
    } else {
      console.error(`Error: ${error.message}`);
    }

    console.error();
    process.exit(1);
  }
}

// Run the test
console.log(`\n🚀 Starting Greenhouse Scraper Test\n`);
testGreenhouseScraper();
