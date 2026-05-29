#!/usr/bin/env node
/**
 * badminton_court/Scripts/migrate-to-gcp-secrets.js
 * 1. Decrypts .e.env.*.enc files
 * 2. Extracts secrets based on template placeholders (<?secret?>), not keywords
 * 3. Uploads them to GCP Secret Manager using gcloud CLI
 *
 * Usage:
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

const FILES = ['.e.env.dev.enc', '.e.env.docker.enc', '.e.env.staging.enc', '.e.env.production.enc'];

// ----- Read template files to know which keys are secrets -----
const templateFiles = [
    path.join(__dirname, '..', '.env.staging.template'),
    path.join(__dirname, '..', '.env.production.template')
];
const secretKeysFromTemplates = new Set();
templateFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.matchAll(/^(\w+)=\<\?secret\?\>$/gm);
        for (const match of matches) {
            secretKeysFromTemplates.add(match[1]);
        }
    }
});
console.log(`\x1b[36mSecret keys from templates: ${[...secretKeysFromTemplates].join(', ')}\x1b[0m`);

function run(command, silent = false) {
    if (!silent) console.log(`\x1b[36mRunning: ${command}\x1b[0m`);
    try {
        return execSync(command, { encoding: 'utf8' }).trim();
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
    if (!environment) {
        const choices = Object.keys(ENV_FILE_MAP);
        const answer = await ask(`Select environment to load secrets from (${choices.join('/')}): `);
        environment = answer.toLowerCase();
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

    // 1. Enable API (ignore if already enabled)
    console.log('\x1b[34mEnsuring Secret Manager API is enabled...\x1b[0m');
    run(`gcloud services enable secretmanager.googleapis.com --project ${process.env.GCP_PROJECT_ID}`, true);

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

    // 3. Upload to GCP
    console.log(`\x1b[34mUploading ${Object.keys(allSecrets).length} secrets to GCP...\x1b[0m`);
    for (const [key, value] of Object.entries(allSecrets)) {
        console.log(`\x1b[36mProcessing secret: ${key}\x1b[0m`);
        
        const exists = run(`gcloud secrets describe ${key} --project ${process.env.GCP_PROJECT_ID}`, true);
        if (!exists) {
            run(`gcloud secrets create ${key} --replication-policy="automatic" --project ${process.env.GCP_PROJECT_ID}`);
        }
        
        const tmpFile = path.join(os.tmpdir(), `gcp_secret_${Date.now()}.tmp`);
        fs.writeFileSync(tmpFile, value, 'utf8');
        run(`gcloud secrets versions add ${key} --data-file="${tmpFile}" --project ${process.env.GCP_PROJECT_ID}`);
        fs.unlinkSync(tmpFile);
    }

    console.log('\x1b[32m\nMigration to GCP Secret Manager Complete!\x1b[0m');
}

migrate().catch(err => {
    console.error(`\x1b[31mMigration failed: ${err.message}\x1b[0m`);
    process.exit(1);
});