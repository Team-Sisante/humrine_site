#!/usr/bin/env node
// Scripts/load-vm-env.js
// Usage: eval $(node Scripts/load-vm-env.js)
// Prompts for environment (staging/production), then outputs export commands
// for all required variables – ready to be sourced before docker compose.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

// ------------------------------------------------------------
// 1. Simple .env parser (same as generate‑env.js)
// ------------------------------------------------------------
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ------------------------------------------------------------
// 2. Set up GCP auth from GCP_SA_KEY_PATH
// ------------------------------------------------------------
function setupGcpAuth() {
  if (process.env.GCP_SA_KEY_PATH) {
    const keyPath = path.isAbsolute(process.env.GCP_SA_KEY_PATH)
      ? process.env.GCP_SA_KEY_PATH
      : path.join(__dirname, '..', process.env.GCP_SA_KEY_PATH);
    if (fs.existsSync(keyPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
    }
  }
}

// ------------------------------------------------------------
// 3. Fetch GitHub Environment variables
// ------------------------------------------------------------
function getGitHubVars(env, repo, token) {
  try {
    const stdout = execSync(
      `node "${path.join(__dirname, 'getGitHubVars.js')}" ${repo} ${env} ${token}`,
      { env: { ...process.env, GITHUB_TOKEN: token }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(stdout);
  } catch (e) {
    console.error('Failed to fetch GitHub variables:', e.message);
    return [];
  }
}

// ------------------------------------------------------------
// 4. Fetch a single GCP secret
// ------------------------------------------------------------
function getGCPSecret(key, projectId) {
  const certFile = process.env.CLOUDSDK_CA_CERTS_FILE;
  const childEnv = { ...process.env };
  if (certFile) {
    childEnv.CLOUDSDK_CA_CERTS_FILE = certFile;
    childEnv.REQUESTS_CA_BUNDLE = certFile;
  }
  try {
    const stdout = execSync(
      `gcloud secrets versions access latest --secret="${key}" --project ${projectId}`,
      { env: childEnv, encoding: 'utf8' }
    );
    return stdout.trim();
  } catch (e) {
    console.error(`GCP secret ${key} fetch failed:`, e.stderr || e.message);
    return null;
  }
}

// ------------------------------------------------------------
// 5. Main logic
// ------------------------------------------------------------
(async () => {
  // ---- A) Prompt for environment ----
  const { envChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'envChoice',
      message: 'Select the environment to load:',
      choices: ['staging', 'production']
    }
  ]);

  // ---- B) Load local .env files to get credentials ----
  const envSuffix = envChoice === 'development' ? 'dev' : envChoice;
  const commonEnvPath = path.join(__dirname, '..', '.env.common');
  const envSpecificPath = path.join(__dirname, '..', `.env.${envSuffix}`);
  loadEnvFile(commonEnvPath);
  loadEnvFile(envSpecificPath);
  setupGcpAuth();

  // ---- C) Validate required variables ----
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const PROJECT_ID = process.env.GCP_PROJECT_ID;
  if (!GITHUB_TOKEN || !PROJECT_ID) {
    console.error('Missing GITHUB_TOKEN or GCP_PROJECT_ID');
    process.exit(1);
  }

  const REPO = process.env.GIT_REPO_USERNAME && process.env.GIT_REPO_REPONAME
    ? `${process.env.GIT_REPO_USERNAME}/${process.env.GIT_REPO_REPONAME}`
    : 'team-sisante/humrine_site';   // safe fallback

  // ---- D) Fetch GitHub environment variables ----
  const githubVars = getGitHubVars(envChoice, REPO, GITHUB_TOKEN);
  const allVars = {};
  for (const v of githubVars) {
    allVars[v.name] = v.value;
  }

  // ---- E) Determine template file for GCP secrets ----
  const templateFile = path.join(__dirname, '..', `.env.${envChoice}.template`);
  if (fs.existsSync(templateFile)) {
    const templateContent = fs.readFileSync(templateFile, 'utf8');
    const secretLines = templateContent.match(/^[A-Z_]+=<\?secret\?>/gm) || [];
    const secretKeys = secretLines.map(line => line.split('=')[0]);

    // Fetch each missing secret from GCP
    for (const key of secretKeys) {
      if (!allVars[key]) {   // GitHub values take priority
        const val = getGCPSecret(key, PROJECT_ID);
        if (val) {
          allVars[key] = val;
        }
      }
    }
  } else {
    console.error(`Template file not found: ${templateFile}`);
    console.error('Skipping GCP secrets – only GitHub variables will be exported.');
  }

  // ---- F) Output export commands ----
  for (const [key, value] of Object.entries(allVars)) {
    // Escape single quotes safely for shell
    const escaped = value.replace(/'/g, "'\\''");
    process.stdout.write(`export ${key}='${escaped}'\n`);
  }
})();