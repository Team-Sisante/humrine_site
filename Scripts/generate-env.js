#!/usr/bin/env node
const { exec } = require("child_process");
const fs = require("fs");
const https = require("https");
const util = require("util");
const execPromise = util.promisify(exec);

const REPO = process.env.GIT_REPO_USERNAME && process.env.GIT_REPO_REPONAME ? `${process.env.GIT_REPO_USERNAME}/${process.env.GIT_REPO_REPONAME}` : "xmione/badminton_court";
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const ENV = process.argv[2] || "development";
const OUTPUT_FILE = process.argv[3] || ".env";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const templateIndex = process.argv.indexOf("--template");
const TEMPLATE_FILE = templateIndex !== -1 ? process.argv[templateIndex + 1] : null;

if (!GITHUB_TOKEN || !PROJECT_ID) { console.error("Missing GITHUB_TOKEN or GCP_PROJECT_ID"); process.exit(1); }

const secretCache = new Map();
async function getGCPSecret(key) {
  if (secretCache.has(key)) return secretCache.get(key);
  try {
    const { stdout } = await execPromise(`gcloud secrets versions access latest --secret="${key}" --project ${PROJECT_ID}`);
    const val = stdout.trim();
    secretCache.set(key, val);
    return val;
  } catch (e) { return null; }
}

const { execSync } = require('child_process');

function getGitHubVars(env) {
  try {
    const stdout = execSync(
      `node Scripts/getGitHubVars.js ${REPO} ${env} ${GITHUB_TOKEN}`,
      {
        env: { ...process.env, GITHUB_TOKEN },
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']   // stdout: JSON, stderr: logs, ignore stdin
      }
    );
    const variables = JSON.parse(stdout);
    console.log(`Fetched ${variables.length} variables from GitHub.`);
    return Array.isArray(variables) ? variables : [];
  } catch (e) {
    console.error(`Failed to fetch GitHub variables: ${e.message}`);
    return [];
  }
}

async function generate() {
  console.log(`Optimized generation for ${ENV}...`);
  const envVars = await getGitHubVars(ENV);
  const uniqueVars = {};
  envVars.forEach(v => uniqueVars[v.name] = v.value);

  console.log(`Fetched ${envVars.length} variables from GitHub. Processing template...`);
  console.log("Variables fetched:", Object.keys(uniqueVars));
  console.log(`TEMPLATE_FILE: ${TEMPLATE_FILE}, OUTPUT_FILE: ${OUTPUT_FILE}`);
  if (TEMPLATE_FILE) {
    let content = fs.readFileSync(TEMPLATE_FILE, "utf8").replace(/\r/g, "");
    const secretsToFetch = (content.match(/^[A-Z_]+=<\?secret\?>/gm) || []).map(m => m.split("=")[0]);
    console.log(`Fetching ${secretsToFetch.length} secrets in parallel...`);
    await Promise.all(secretsToFetch.map(getGCPSecret));

    // For <?var?> – log missing ones
    let missingVars = 0;
    content = content.replace(/^(\w+)=<\?var\?>$/gm, (m, k) => {
      console.log(`Checking variable: ${k}, found: ${uniqueVars[k] !== undefined}, value: ${uniqueVars[k]}`);
      if (uniqueVars[k] !== undefined) {
        return `${k}="${uniqueVars[k]}"`;
      } else {
        console.log(`⚠️  Variable not found in GitHub: ${k}`);
        missingVars++;
        return m;
      }
    });

    // For <?secret?> – log found/missing keys (no values)
    let foundSecrets = 0, missingSecrets = 0;
    content = content.replace(/^(\w+)=<\?secret\?>$/gm, (m, k) => {
      const val = secretCache.get(k);
      if (val) {
        foundSecrets++;
        console.log(`🔐 Secret substituted: ${k}`);
        return `${k}="${val}"`;
      } else {
        console.log(`⚠️  Secret not found in GCP: ${k}`);
        missingSecrets++;
        return m;
      }
    });

    console.log(`Secrets substituted: ${foundSecrets}, missing: ${missingSecrets}`);
    console.log(`Variables substituted: ${Object.keys(uniqueVars).length}, missing: ${missingVars}`);

    // ----- ADDED: Prevent writing broken file if any secret is missing -----
    if (missingSecrets > 0) {
      console.error(`\x1b[31mABORTING: ${missingSecrets} secret(s) could not be fetched from GCP.\x1b[0m`);
      console.error(`\x1b[33mThe existing ${OUTPUT_FILE} was NOT modified.\x1b[0m`);
      console.error(`\x1b[33mFix GCP authentication, then re-run the generation.\x1b[0m`);
      process.exit(1);
    }

    fs.writeFileSync(OUTPUT_FILE, content);
  }
  console.log("Successfully created .env");
}
generate();