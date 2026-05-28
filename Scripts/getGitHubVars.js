// Scripts/getGitHubVars.js
const https = require('https');

async function getGitHubVars(repo, env, token) {
  const allVars = [];
  let url = `/repos/${repo}/environments/${env}/variables?per_page=100`;

  try {
    while (url) {
      const page = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.github.com',
          path: url,
          headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Node.js',
            'Accept': 'application/vnd.github.v3+json'
          }
        };
        https.get(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              const parsed = JSON.parse(data);
              if (parsed.variables) allVars.push(...parsed.variables);
              const link = res.headers.link;
              if (link) {
                const match = link.match(/<([^>]+)>;\s*rel="next"/);
                url = match ? match[1] : null;
              } else {
                url = null;
              }
              resolve();
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        }).on('error', reject);
      });
    }
    // Log to stderr so stdout stays clean
    console.error(`Fetched ${allVars.length} variables from GitHub.`);
    return allVars;
  } catch (e) {
    console.error(`Failed to fetch GitHub variables: ${e.message}`);
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