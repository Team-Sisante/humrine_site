#!/usr/bin/env node
// Scripts/generate-env.js

const { exec, execSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const path = require("path");
const util = require("util");
const execPromise = util.promisify(exec);

// ---- Simple .env parser (no external dependencies) ----
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

// ---- Auto-load .env files so the script works standalone ----
const ENV = process.argv[2] || "development";
const OUTPUT_FILE = process.argv[3] || ".env";
const templateIndex = process.argv.indexOf("--template");
const TEMPLATE_FILE = templateIndex !== -1 ? process.argv[templateIndex + 1] : null;

// Load common variables first (from repo root)
const commonEnvPath = path.join(__dirname, "..", ".env.common");
loadEnvFile(commonEnvPath);
console.log(`Loaded shared variables from ${commonEnvPath}`);

// Load environment‑specific file (overrides common where needed)
const envSpecificPath = path.join(__dirname, "..", `.env.${ENV}`);
loadEnvFile(envSpecificPath);
console.log(`Loaded environment‑specific variables from ${envSpecificPath}`);

// ---- Ensure GCP auth is ready ----
if (process.env.GCP_SA_KEY_PATH) {
  const keyPath = path.isAbsolute(process.env.GCP_SA_KEY_PATH)
    ? process.env.GCP_SA_KEY_PATH
    : path.join(__dirname, "..", process.env.GCP_SA_KEY_PATH);
  if (fs.existsSync(keyPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
    console.log(`Using GCP service account: ${keyPath}`);
  }
}

// Now that .env files are loaded, grab required variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PROJECT_ID = process.env.GCP_PROJECT_ID;

if (!GITHUB_TOKEN || !PROJECT_ID) {
  console.error("Missing GITHUB_TOKEN or GCP_PROJECT_ID");
  process.exit(1);
}

const REPO = process.env.GIT_REPO_USERNAME && process.env.GIT_REPO_REPONAME
  ? `${process.env.GIT_REPO_USERNAME}/${process.env.GIT_REPO_REPONAME}`
  : "xmione/badminton_court";

const secretCache = new Map();

// ---- Fix gcloud TLS CA bundle on Windows (Git Bash / MSYS2) ----
if (process.platform === 'win32') {
  const possibleCerts = [
    'C:\\Program Files\\Git\\mingw64\\etc\\ssl\\cert.pem',
    'C:\\Program Files\\Git\\mingw64\\etc\\ssl\\certs\\ca-bundle.crt',
    'C:\\Program Files\\Git\\usr\\ssl\\cert.pem',
    'C:\\Program Files\\Git\\usr\\ssl\\certs\\ca-bundle.crt',
    'C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\lib\\third_party\\certifi\\cacert.pem'
  ];
  for (const certPath of possibleCerts) {
    if (fs.existsSync(certPath)) {
      process.env.CLOUDSDK_CA_CERTS_FILE = certPath;
      process.env.REQUESTS_CA_BUNDLE = certPath;
      console.log(`\x1b[36mUsing CA bundle: ${certPath}\x1b[0m`);
      break;
    }
  }
  if (!process.env.CLOUDSDK_CA_CERTS_FILE) {
    console.log('\x1b[33mWarning: No CA bundle found; gcloud may fail with TLS errors.\x1b[0m');
  }
}

async function getGCPSecret(key) {
  if (secretCache.has(key)) return secretCache.get(key);

  const certFile = process.env.CLOUDSDK_CA_CERTS_FILE;
  const childEnv = { ...process.env };
  if (certFile) {
    childEnv.CLOUDSDK_CA_CERTS_FILE = certFile;
    childEnv.REQUESTS_CA_BUNDLE = certFile;
  }

  const cmd = `gcloud secrets versions access latest --secret="${key}" --project ${PROJECT_ID}`;

  try {
    const stdout = execSync(cmd, { env: childEnv, encoding: 'utf8' });
    const val = stdout.trim();
    secretCache.set(key, val);
    return val;
  } catch (e) {
    console.error(`\x1b[31mgcloud error for ${key}: ${e.stderr || e.message}\x1b[0m`);
    return null;
  }
}

function getGitHubVars(env) {
  try {
    const stdout = execSync(
      `node Scripts/getGitHubVars.js ${REPO} ${env} ${GITHUB_TOKEN}`,
      {
        env: { ...process.env, GITHUB_TOKEN },
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
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
  envVars.forEach((v) => (uniqueVars[v.name] = v.value));

  console.log(
    `Fetched ${envVars.length} variables from GitHub. Processing template...`
  );
  console.log(`TEMPLATE_FILE: ${TEMPLATE_FILE}, OUTPUT_FILE: ${OUTPUT_FILE}`);
  if (TEMPLATE_FILE) {
    let content = fs.readFileSync(TEMPLATE_FILE, "utf8");
    const secretsToFetch = (
      content.match(/^[A-Z_]+=<\?secret\?>/gm) || []
    ).map((m) => m.split("=")[0]);
    console.log(`Fetching ${secretsToFetch.length} secrets in parallel...`);
    await Promise.all(secretsToFetch.map(getGCPSecret));

    // For <?var?> – log missing ones
    let missingVars = 0;
    content = content.replace(/^(\w+)=<\?var\?>$/gm, (m, k) => {
      if (uniqueVars[k] !== undefined) {
        return `${k}="${uniqueVars[k]}"`;
      } else {
        console.log(`⚠️  Variable not found in GitHub: ${k}`);
        missingVars++;
        return m;
      }
    });

    // For <?secret?> – substitute and log
    let foundSecrets = 0,
      missingSecrets = 0;
    content = content.replace(/^(\w+)=<\?secret\?>$/gm, (m, k) => {
      const val = secretCache.get(k);
      if (val !== null && val !== undefined) {
        foundSecrets++;
        console.log(`🔐 Secret substituted: ${k}`);
        return `${k}="${val}"`;
      } else {
        console.log(`⚠️  Secret not found in GCP: ${k}`);
        missingSecrets++;
        return m;
      }
    });

    console.log(
      `Secrets substituted: ${foundSecrets}, missing: ${missingSecrets}`
    );
    console.log(
      `Variables substituted: ${Object.keys(uniqueVars).length}, missing: ${missingVars}`
    );

    if (missingSecrets > 0) {
      console.error(
        `\x1b[31mABORTING: ${missingSecrets} secret(s) could not be fetched from GCP.\x1b[0m`
      );
      console.error(
        `\x1b[33mThe existing ${OUTPUT_FILE} was NOT modified.\x1b[0m`
      );
      console.error(
        `\x1b[33mFix GCP authentication, then re-run the generation.\x1b[0m`
      );
      process.exit(1);
    }

    fs.writeFileSync(OUTPUT_FILE, content);
  }
  console.log("Successfully created .env");
}
generate();