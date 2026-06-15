// Scripts/getGitHubVars.js
const axios = require('axios');

async function getGitHubVars(repo, env, token) {
  const allVars = [];
  let url = `https://api.github.com/repos/${repo}/environments/${env}/variables?per_page=100`;

  try {
    while (url) {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Node.js',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.data.variables) allVars.push(...response.data.variables);
      
      const link = response.headers.link;
      if (link) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        url = match ? match[1] : null;
      } else {
        url = null;
      }
    }
    // Log to stderr so stdout stays clean
    console.error(`Fetched ${allVars.length} variables from GitHub.`);
    return allVars;
  } catch (e) {
    console.error(`Failed to fetch GitHub variables: ${e.response ? e.response.status : e.message}`);
    return [];
  }
}

// When run as a script, output JSON array to stdout
const repo = process.argv[2];
const env  = process.argv[3];
const token = process.argv[4];
if (repo && env && token) {
  getGitHubVars(repo, env, token)
    .then(vars => console.log(JSON.stringify(vars)))
    .catch(() => process.exit(1));
}