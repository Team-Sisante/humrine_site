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
 *   node Scripts/migrate-environments.js .env.production docker-production
 *
 * Requires GITHUB_TOKEN environment variable.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GIT_REPO_USERNAME && process.env.GIT_REPO_REPONAME
    ? `${process.env.GIT_REPO_USERNAME}/${process.env.GIT_REPO_REPONAME}`
    : 'xmione/badminton_court';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
    console.error('\x1b[31mError: GITHUB_TOKEN environment variable is not set.\x1b[0m');
    process.exit(1);
}

// ----- Map GitHub Environment to its template file -----
const ENV_TEMPLATE_MAP = {
    'staging':     path.join(__dirname, '..', '.env.staging.template'),
    'production':  path.join(__dirname, '..', '.env.production.template'),
    'development': path.join(__dirname, '..', '.env.dev.template'),
    'docker':      path.join(__dirname, '..', '.env.docker.template')
};

function apiRequest(method, apiPath, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: apiPath,
            method: method,
            headers: {
                'Authorization': `token ${TOKEN}`,
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
    const inputFile = process.argv[2] || '.env.dev';
    const environment = process.argv[3] || 'development';

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

    // 2. Read local .env file and upload only variables that appear in the template as <?var?>
    const vars = parseEnv(inputFile);
    let skipped = 0;
    for (const [key, value] of Object.entries(vars)) {
        if (templateFound && !varKeysFromTemplate.has(key)) {
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