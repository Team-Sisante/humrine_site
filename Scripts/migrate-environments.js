#!/usr/bin/env node
/**
 * badminton_court/Scripts/migrate-environments.js
 * Automates the migration of local .env files to GitHub Environments.
 * 1. Reads a .env file
 * 2. Uploads ONLY variables marked <?var?> in the matching environment template
 *    directly via the GitHub API (no environment existence check).
 *
 * Usage:
 *   node Scripts/migrate-environments.js .env.staging development
 *   node Scripts/migrate-environments.js                    (interactive)
 *
 * Requires GITHUB_TOKEN in the loaded environment.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

// Interactive prompt helper
function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ----- Map GitHub Environment to its template file -----
const ENV_TEMPLATE_MAP = {
    'staging':     path.join(__dirname, '..', '.env.staging.template'),
    'production':  path.join(__dirname, '..', '.env.production.template'),
    'development': path.join(__dirname, '..', '.env.dev.template'),
    'docker':      path.join(__dirname, '..', '.env.docker.template')
};

// Map target environment to the corresponding .env file
const ENV_FILE_MAP = {
    'staging':     path.join(__dirname, '..', '.env.staging'),
    'production':  path.join(__dirname, '..', '.env.production'),
    'development': path.join(__dirname, '..', '.env.dev'),
    'docker':      path.join(__dirname, '..', '.env.docker')
};

function apiRequest(method, apiPath, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: apiPath,
            method: method,
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'User-Agent': 'Node.js/migrate-environments',
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        if (body) {
            const data = JSON.stringify(body);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`\x1b[33mWarning: ${filePath} not found.\x1b[0m`);
        return {};
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const index = trimmed.indexOf('=');
            const key = trimmed.substring(0, index).trim();
            let value = trimmed.substring(index + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            if (key) env[key] = value;
        }
    });
    return env;
}

async function migrate() {
    let inputFile = process.argv[2];
    let environment = process.argv[3];

    // If arguments are missing, prompt interactively
    if (!inputFile || !environment) {
        console.log('\x1b[36mNo arguments provided – switching to interactive mode.\x1b[0m');
        const choices = Object.keys(ENV_FILE_MAP);
        const answer = await ask(`Select environment (${choices.join('/')}): `);
        environment = answer.toLowerCase();
        if (!ENV_FILE_MAP[environment]) {
            console.error(`\x1b[31mInvalid environment: ${environment}\x1b[0m`);
            process.exit(1);
        }
        inputFile = ENV_FILE_MAP[environment];   // use the .env file for this environment
    }

    // Load the .env file for the chosen environment (to get GITHUB_TOKEN, etc.)
    const envFilePath = ENV_FILE_MAP[environment] || inputFile;
    if (fs.existsSync(envFilePath)) {
        dotenv.config({ path: envFilePath });
        console.log(`\x1b[36mLoaded environment variables from ${envFilePath}\x1b[0m`);
    } else {
        console.log(`\x1b[33mWarning: ${envFilePath} not found. Proceeding with existing env vars.\x1b[0m`);
    }

    // ---- NEW: Load .env.common ----
    const commonEnvPath = path.join(__dirname, '..', '.env.common');
    if (fs.existsSync(commonEnvPath)) {
        dotenv.config({ path: commonEnvPath });
        console.log(`\x1b[36mLoaded shared variables from ${commonEnvPath}\x1b[0m`);
    } else {
        console.log(`\x1b[33mWarning: .env.common not found – shared variables will be skipped.\x1b[0m`);
    }
    const commonVars = fs.existsSync(commonEnvPath) ? parseEnv(commonEnvPath) : {};

    // Read .env.common.template if it exists to know which common keys are marked <?var?>
    const commonTemplatePath = path.join(__dirname, '..', '.env.common.template');
    const commonVarKeys = new Set();
    if (fs.existsSync(commonTemplatePath)) {
        const templateContent = fs.readFileSync(commonTemplatePath, 'utf8');
        const matches = templateContent.matchAll(/^(\w+)=\<\?var\?\>$/gm);
        for (const match of matches) commonVarKeys.add(match[1]);
        console.log(`\x1b[36mCommon template variables (<?var?>): ${[...commonVarKeys].join(', ')}\x1b[0m`);
    } else {
        // No template → upload all common variables
        Object.keys(commonVars).forEach(k => commonVarKeys.add(k));
        console.log(`\x1b[33mNo .env.common.template found – all common variables will be uploaded.\x1b[0m`);
    }

    // Now check required variables
    if (!process.env.GITHUB_TOKEN) {
        console.error('\x1b[31mError: GITHUB_TOKEN environment variable is not set.\x1b[0m');
        process.exit(1);
    }
    const REPO = process.env.GIT_REPO_USERNAME && process.env.GIT_REPO_REPONAME
        ? `${process.env.GIT_REPO_USERNAME}/${process.env.GIT_REPO_REPONAME}`
        : 'xmione/badminton_court';

    console.log(`\x1b[32mMigrating ${inputFile} to GitHub Environment "${environment}"...\x1b[0m`);

    // 1. Read the environment‑specific template to get <?var?> keys
    const templatePath = ENV_TEMPLATE_MAP[environment];
    const varKeysFromTemplate = new Set();
    let templateFound = false;

    if (templatePath && fs.existsSync(templatePath)) {
        templateFound = true;
        const content = fs.readFileSync(templatePath, 'utf8');
        const matches = content.matchAll(/^(\w+)=\<\?var\?\>$/gm);
        for (const match of matches) {
            varKeysFromTemplate.add(match[1]);
        }
        console.log(`\x1b[36mUsing template: ${templatePath}\x1b[0m`);
        console.log(`\x1b[36mVariables from template (<?var?>): ${[...varKeysFromTemplate].join(', ')}\x1b[0m`);
    } else {
        console.log('\x1b[33m⚠ Template file not found for this environment. All variables will be uploaded (fallback).\x1b[0m');
    }

    // 2. Read local .env files and merge: common vars first, then environment‑specific (env overrides common)
    const vars = parseEnv(inputFile);
    const allVars = { ...commonVars, ...vars };   // env-specific wins

    let skipped = 0;
    for (const [key, value] of Object.entries(allVars)) {
        // Skip if a template exists but the key is not in either template
        if (templateFound && !varKeysFromTemplate.has(key) && !commonVarKeys.has(key)) {
            skipped++;
            continue;
        }
        if (key === 'GITHUB_TOKEN') {
            console.log(`\x1b[33m⚠ Skipping GITHUB_TOKEN\x1b[0m`);
            continue;
        }

        console.log(`\x1b[36m  Setting variable: ${key}\x1b[0m`);
        try {
            // Try to update an existing variable first
            await apiRequest('PATCH', `/repos/${REPO}/environments/${environment}/variables/${key}`, {
                name: key,
                value: value
            });
        } catch (e) {
            // If it doesn't exist, create it
            if (e.message.includes('404')) {
                await apiRequest('POST', `/repos/${REPO}/environments/${environment}/variables`, {
                    name: key,
                    value: value
                });
            } else {
                console.error(`\x1b[31m  Failed to set ${key}: ${e.message}\x1b[0m`);
            }
        }
    }
    if (skipped > 0) {
        console.log(`\x1b[33mSkipped ${skipped} variables not marked as <?var?> in the template.\x1b[0m`);
    }

    console.log(`\x1b[32mMigration of ${inputFile} to ${environment} complete.\x1b[0m`);
}

migrate().catch(err => {
    console.error(`\x1b[31mMigration failed: ${err.message}\x1b[0m`);
    process.exit(1);
});