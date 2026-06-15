#!/usr/bin/env node
/**
 * =============================================================================
 *  humrine_site/Scripts/build-and-push.js – Artifact Generation & Registry Push
 * =============================================================================
 */

const { execSync } = require('child_process');

const TOKEN = process.env.GITHUB_TOKEN;
const GIT_REPO_USERNAME = process.env.GIT_REPO_USERNAME;

if (!TOKEN) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Generate .env.docker and compile the binary (SKIP FOR NOW)
// ---------------------------------------------------------------------------
// execSync('node Scripts/generate-env.js development .env.docker', { stdio: 'inherit' });
// execSync('node Scripts/compile.js', { stdio: 'inherit' });

// Get current Git SHA for tagging
const gitSha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const shaTag = `sha-${gitSha}`;

// 2. Login to GitHub Container Registry
execSync(`echo "${TOKEN}" | docker login ghcr.io -u ${GIT_REPO_USERNAME} --password-stdin`, { stdio: 'inherit' });

// 3. Build and push with retries
const images = [
  { dockerfile: 'Dockerfile', name: 'humrine_site-web' }
];

for (let attempt = 1; attempt <= 3; attempt++) {
  let success = true;
  for (const { dockerfile, name } of images) {
    try {
      const latestTag = `ghcr.io/${GIT_REPO_USERNAME}/${name}:latest`;
      const versionTag = `ghcr.io/${GIT_REPO_USERNAME}/${name}:${shaTag}`;
      
      console.log(`Building and pushing ${latestTag} and ${versionTag}...`);
      
      // Build and tag with both latest and versionTag
      const buildCmd = `DOCKER_BUILDKIT=1 docker build ` +
        `--cache-from ${latestTag} ` +
        `--cache-to type=registry,ref=${latestTag},mode=max ` +
        `-t ${latestTag} -t ${versionTag} -f ${dockerfile} .`;
      execSync(buildCmd, { stdio: 'inherit' });
      
      execSync(`docker push ${latestTag}`, { stdio: 'inherit' });
      execSync(`docker push ${versionTag}`, { stdio: 'inherit' });
    } catch (e) {
      success = false;
      console.error(`Push of ${name} failed on attempt ${attempt}: ${e.message}`);
      break;
    }
  }
  if (success) {
    console.log('All images built and pushed successfully.');
    process.exit(0);
  }
  if (attempt < 3) {
    console.log(`Waiting 10 seconds before retry…`);
    execSync('sleep 10', { stdio: 'inherit' });
  }
}
console.error('Failed to push all images after 3 attempts.');
process.exit(1);