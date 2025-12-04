const axios = require('axios');

async function testAshbyAPI() {
  const graphqlQuery = {
    operationName: "ApiJobBoardWithTeams",
    variables: {
      organizationHostedJobsPageName: "ramp",
    },
    query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
      jobBoard: jobBoardWithTeams(
        organizationHostedJobsPageName: $organizationHostedJobsPageName
      ) {
        jobPostings {
          id
          title
          locationId
          locationName
          employmentType
        }
      }
    }`,
  };

  try {
    const response = await axios.post(
      "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams",
      graphqlQuery,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    console.log('Response status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAshbyAPI();
