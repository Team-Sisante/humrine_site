#!/usr/bin/env node
/**
 * migrate-to-gcp-secrets.js
 * 1. Decrypts .e.env.*.enc files
 * 2. Extracts secrets based on template placeholders (<?secret?>)
 * 3. Uploads them to GCP Secret Manager using gcloud CLI
 *    Secret names are prefixed with the app name to avoid collisions
 *    (e.g. humrine_site_POSTGRES_PASSWORD).
 *
 * Usage:
 *   node Scripts/migrate-to-gcp-secrets.js staging <app_name>
 *   node Scripts/migrate-to-gcp-secrets.js          (interactive)
 *   node Scripts/migrate-to-gcp-secrets.js staging  (specify environment) 
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const dotenv = require('dotenv');

// ----- Fix gcloud TLS CA bundle on Windows (Git Bash / MSYS2) -----
if (os.platform() === 'win32') {
    const possibleCerts = [
        'C:\\Program Files\\Git\\mingw64\\etc\\ssl\\cert.pem',
        'C:\\Program Files\\Git\\mingw64\\etc\\ssl\\certs\\ca-bundle.crt',
        'C:\\Program Files\\Git\\usr\\ssl\\cert.pem',
        'C:\\Program Files\\Git\\usr\\ssl\\certs\\ca-bundle.crt',
        'C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\lib\\third_party\\certifi\\cacert.pem'
    ];
    let foundCert = null;
    for (const certPath of possibleCerts) {
        if (fs.existsSync(certPath)) {
            foundCert = certPath;
            break;
        }
    }
    if (foundCert) {
        process.env.CLOUDSDK_CA_CERTS_FILE = foundCert;
        process.env.REQUESTS_CA_BUNDLE = foundCert;
        process.env.CURL_CA_BUNDLE = foundCert;
        console.log(`\x1b[36mUsing CA bundle: ${foundCert}\x1b[0m`);
    } else {
        console.log('\x1b[31mNo CA bundle found. gcloud commands may fail.\x1b[0m');
    }
}

// Interactive prompt helper
function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ----- Map environment to .env file -----
const ENV_FILE_MAP = {
    'staging':     path.join(__dirname, '..', '.env.staging'),
    'production':  path.join(__dirname, '..', '.env.production'),
    'development': path.join(__dirname, '..', '.env.dev'),
    'docker':      path.join(__dirname, '..', '.env.docker')
};

const FILES = [
    '.e.env.dev.enc', '.e.env.docker.enc', '.e.env.staging.enc', '.e.env.production.enc',
    '.e.env.common.enc'
];

// ----- Read template files to know which keys are secrets -----
const templateFiles = [
    path.join(__dirname, '..', '.env.staging.template'),
    path.join(__dirname, '..', '.env.production.template')
];
const secretKeysFromTemplates = new Set();
templateFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.matchAll(/^(\w+)=\<\?secret\?\>\s*$/gm);
        for (const match of matches) {
            secretKeysFromTemplates.add(match[1]);
        }
    }
});

// ---- Also load common template to capture its <?secret?> keys ----
const commonTemplatePath = path.join(__dirname, '..', '.env.common.template');
if (fs.existsSync(commonTemplatePath)) {
    const commonContent = fs.readFileSync(commonTemplatePath, 'utf8');
    const commonMatches = commonContent.matchAll(/^(\w+)=\<\?secret\?\>\s*$/gm);
    for (const match of commonMatches) {
        secretKeysFromTemplates.add(match[1]);
    }
    console.log(`\x1b[36mCommon secret keys from template: ${[...secretKeysFromTemplates].join(', ')}\x1b[0m`);
} else {
    console.log(`\x1b[33mNo .env.common.template found – common secrets will be uploaded if present in any encrypted file.\x1b[0m`);
}

console.log(`\x1b[36mSecret keys from templates: ${[...secretKeysFromTemplates].join(', ')}\x1b[0m`);

function run(command, silent = false) {
    if (!silent) console.log(`\x1b[36mRunning: ${command}\x1b[0m`);
    try {
        return execSync(command, { encoding: 'utf8', env: { ...process.env } }).trim();
    } catch (e) {
        if (!silent) console.error(`\x1b[31mCommand failed: ${command}\x1b[0m`);
        return null;
    }
}

function parseEnvContent(content) {
    const lines = content.split('\n');
    const env = {};
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const index = trimmed.indexOf('=');
            const key = trimmed.substring(0, index).trim();
            const value = trimmed.substring(index + 1).trim().replace(/^["']|["']$/g, '');
            if (key) env[key] = value;
        }
    });
    return env;
}

function decryptEncFile(encryptedFile, passphrase) {
    const input = fs.readFileSync(encryptedFile);
    if (input.length < 44) throw new Error('File too short');
    
    const salt = input.slice(0, 16);
    const iv = input.slice(16, 28);
    const authTag = input.slice(28, 44);
    const ciphertext = input.slice(44);
    
    const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

async function migrate() {
    // Determine environment (interactive or from argument)
    let environment = process.argv[2];

    // If no argument, prompt interactively with a list
    if (!environment) {
        const { default: inquirer } = await import('inquirer');
        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'env',
                message: 'Select environment to load secrets from:',
                choices: Object.keys(ENV_FILE_MAP),
            }
        ]);
        environment = answer.env.toLowerCase();
    }

    if (!ENV_FILE_MAP[environment]) {
        console.error(`\x1b[31mInvalid environment: ${environment}\x1b[0m`);
        process.exit(1);
    }

    // Load the .env file for this environment
    const envFilePath = ENV_FILE_MAP[environment];
    if (fs.existsSync(envFilePath)) {
        dotenv.config({ path: envFilePath });
        console.log(`\x1b[36mLoaded environment variables from ${envFilePath}\x1b[0m`);
    } else {
        console.log(`\x1b[33mWarning: ${envFilePath} not found. Proceeding with existing env vars.\x1b[0m`);
    }

    // ---- Determine app name for secret prefix ----
    let appName = process.argv[3];                     // explicit argument
    if (!appName) {
        // Also try GIT_REPO_REPONAME from the loaded environment
        appName = process.env.GIT_REPO_REPONAME;
    }
    if (!appName) {
        console.error('\x1b[31mError: App name must be provided as second argument or via GIT_REPO_REPONAME.\x1b[0m');
        console.error('\x1b[33mUsage: node Scripts/migrate-to-gcp-secrets.js staging humrine_site\x1b[0m');
        process.exit(1);
    }
    const prefix = `${appName}_`;
    console.log(`\x1b[32mUsing secret name prefix: ${prefix}\x1b[0m`);

    // Now check required variables
    if (!process.env.ENC_PASSPHRASE) {
        console.error('\x1b[31mError: ENC_PASSPHRASE environment variable is not set.\x1b[0m');
        process.exit(1);
    }
    if (!process.env.GCP_PROJECT_ID) {
        console.error('\x1b[31mError: GCP_PROJECT_ID environment variable is not set.\x1b[0m');
        process.exit(1);
    }

    console.log('\x1b[32mStarting Migration to GCP Secret Manager...\x1b[0m');

    // 1. Ensure Secret Manager API is enabled
    console.log('\x1b[34mEnsuring Secret Manager API is enabled...\x1b[0m');
    const apiAlreadyEnabled = run(
        `gcloud services list --enabled --filter="config.name=secretmanager.googleapis.com" --project ${process.env.GCP_PROJECT_ID} --format="value(config.name)"`,
        true
    );
    if (!apiAlreadyEnabled) {
        const enableResult = run(
            `gcloud services enable secretmanager.googleapis.com --project ${process.env.GCP_PROJECT_ID}`,
            true
        );
        if (enableResult === null) {
            console.log('\x1b[33m  Could not enable Secret Manager API (permission may be missing). Continuing anyway – the API might already be enabled.\x1b[0m');
        }
    } else {
        console.log('\x1b[32m  Secret Manager API is already enabled.\x1b[0m');
    }

    const allSecrets = {};

    // 2. Decrypt and collect secrets (only those in templates)
    FILES.forEach(file => {
        if (!fs.existsSync(file)) return;
        console.log(`\x1b[34mProcessing ${file}...\x1b[0m`);
        
        let content;
        try {
            content = decryptEncFile(file, process.env.ENC_PASSPHRASE);
        } catch (e) {
            console.log(`\x1b[33m⚠ Failed to decrypt ${file}: ${e.message}\x1b[0m`);
            return;
        }

        const env = parseEnvContent(content);
        
        for (const [key, value] of Object.entries(env)) {
            if (secretKeysFromTemplates.has(key)) {
                allSecrets[key] = value;
            }
        }
    });

    // 3. Upload to GCP (with prefix)
    console.log(`\x1b[34mUploading ${Object.keys(allSecrets).length} secrets to GCP...\x1b[0m`);
    for (const [key, value] of Object.entries(allSecrets)) {
        const fullSecretName = prefix + key;
        console.log(`\x1b[36mProcessing secret: ${key} → ${fullSecretName}\x1b[0m`);
        
        const exists = run(`gcloud secrets describe ${fullSecretName} --project ${process.env.GCP_PROJECT_ID}`, true);
        if (!exists) {
            run(`gcloud secrets create ${fullSecretName} --replication-policy="automatic" --project ${process.env.GCP_PROJECT_ID}`);
        }
        
        const tmpFile = path.join(os.tmpdir(), `gcp_secret_${Date.now()}.tmp`);
        fs.writeFileSync(tmpFile, value, 'utf8');
        run(`gcloud secrets versions add ${fullSecretName} --data-file="${tmpFile}" --project ${process.env.GCP_PROJECT_ID}`);
        fs.unlinkSync(tmpFile);
    }

    console.log('\x1b[32m\nMigration to GCP Secret Manager Complete!\x1b[0m');
}

migrate().catch(err => {
    console.error(`\x1b[31mMigration failed: ${err.message}\x1b[0m`);
    process.exit(1);
});