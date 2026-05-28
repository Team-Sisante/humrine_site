#!/usr/bin/env node
/**
 * =============================================================================
 *  badminton_court/Scripts/build-and-push.js – Artifact Generation & Registry Push
 * =============================================================================
 *
 *  PURPOSE
 *  -------
 *  Orchestrates the complete artifact pipeline for the badminton_court project:
 *    1. Generates a valid `.env.docker` file
 *    2. Compiles the Django application into a standalone Linux binary
 *    3. Builds Docker images for the web application and the mail server
 *    4. Pushes those images to the GitHub Container Registry (ghcr.io)
 *
 *  This script is the single entry point for the `badminton_court-artifacts`
 *  pipeline in GoCD. It is called from the pipeline task definition.
 *
 *  RUNTIME ENVIRONMENT
 *  -------------------
 *  Runs on the **GoCD agent** (a Linux Docker container) that has:
 *    - Node.js installed
 *    - Docker CLI available (bound to the host's Docker daemon)
 *    - Access to the full repository checkout at /badminton_court
 *    - The environment variable GITHUB_TOKEN injected by the pipeline
 *
 *  It does **not** run on the GCP deployment VM (gocd-deploy-target).
 *
 *  PROCESS FLOW
 *  ------------
 *  1.  GENERATE .env.docker
 *      Calls `Scripts/generate-env.js development .env.docker` to fetch all
 *      required secrets and variables from GitHub Environments and GCP Secret
 *      Manager. The resulting `.env.docker` is written to the project root.
 *      This file is used later by `compile.js` (via the static Dockerfile) to
 *      allow Django to load its settings completely during PyInstaller analysis.
 *
 *  2.  COMPILE THE BINARY
 *      Calls `Scripts/compile.js`, which uses the static `Dockerfile.compile`
 *      and the freshly generated `.env.docker` to produce a standalone Linux
 *      binary at `dist_linux/badminton_court_linux`.
 *
 *  3.  LOGIN TO GHCR
 *      Authenticates to the GitHub Container Registry using the provided
 *      `GITHUB_TOKEN`. The token is piped into `docker login` so it never
 *      appears in process listings or logs.
 *
 *  4.  BUILD & PUSH DOCKER IMAGES (with retry logic)
 *      Two images are built and pushed:
 *
 *      a. `ghcr.io/xmione/badminton_court-web:latest`
 *         Built from `Dockerfile.binary`.  This image contains only the
 *         compiled binary and a minimal Ubuntu runtime – no Python, no
 *         source code.
 *
 *      b. `ghcr.io/xmione/badminton_court-mail:latest`
 *         Built from `Dockerfile.posteio`.  This image is based on
 *         analogic/poste.io and adds a custom init script to disable
 *         auto‑blocking and enable STARTTLS.
 *
 *      Build & push attempts up to 3 times for each image.  If any image
 *      fails, the entire attempt is retried after a 10‑second delay.
 *
 *  OUTPUT
 *  ------
 *  On success, the two Docker images are publicly available in GHCR and can
 *  be pulled by the staging/production deployment pipelines.
 *
 *  REQUIREMENTS
 *  ------------
 *  - GITHUB_TOKEN environment variable must be set (passed by GoCD)
 *  - Docker available on the agent
 *  - Node.js and the project scripts accessible
 *  - The repository contains:
 *      - `Scripts/generate-env.js`
 *      - `Scripts/compile.js`
 *      - `Dockerfile.compile` (used by compile.js)
 *      - `Dockerfile.binary`
 *      - `Dockerfile.posteio`
 *
 *  EXIT CODES
 *  ----------
 *  0 – All images built and pushed successfully
 *  1 – Failure (missing token, compilation error, or push failure after
 *      all retries)
 *
 *  USAGE
 *  -----
 *  - Via GoCD pipeline: automatically invoked by the task
 *  - Manual testing:     `node Scripts/build-and-push.js` (requires
 *                         GITHUB_TOKEN to be set)
 *
 * =============================================================================
 */

const { execSync } = require('child_process');

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Generate .env.docker and compile the binary (SKIP FOR NOW)
// ---------------------------------------------------------------------------
// execSync('node Scripts/generate-env.js development .env.docker', { stdio: 'inherit' });
// execSync('node Scripts/compile.js', { stdio: 'inherit' });

// ---------------------------------------------------------------------------
// 2. Login to GitHub Container Registry
// ---------------------------------------------------------------------------
execSync(`echo "${TOKEN}" | docker login ghcr.io -u xmione --password-stdin`, { stdio: 'inherit' });

// ---------------------------------------------------------------------------
// 3. Build and push with retries
// ---------------------------------------------------------------------------
const images = [
  { dockerfile: 'Dockerfile', tag: 'ghcr.io/xmione/humrine_site-web:latest' }
];

for (let attempt = 1; attempt <= 3; attempt++) {
  let success = true;
  for (const { dockerfile, tag } of images) {
    try {
      // Enable BuildKit with registry cache
      const buildCmd = `DOCKER_BUILDKIT=1 docker build ` +
        `--cache-from ${tag} ` +
        `--cache-to type=registry,ref=${tag},mode=max ` +
        `-t ${tag} -f ${dockerfile} .`;
      execSync(buildCmd, { stdio: 'inherit' });
      execSync(`docker push ${tag}`, { stdio: 'inherit' });
    } catch (e) {
      success = false;
      console.error(`Push of ${tag} failed on attempt ${attempt}`);
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