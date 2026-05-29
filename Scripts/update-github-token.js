#!/usr/bin/env node
/**
 * Scripts/update‑github‑token.js
 *
 * Replaces GITHUB_TOKEN in all relevant .env files with a new value.
 *
 * Usage:
 *   node Scripts/update-github-token.js <new_token>   (non‑interactive)
 *   node Scripts/update-github-token.js                (prompts for token)
 *
 * Files updated:
 *   badminton_court/.env.dev
 *   badminton_court/.env.docker
 *   badminton_court/.env.staging
 *   badminton_court/.env.production
 *   gocd-server/.env.docker  (if present)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

async function main() {
  // 1. Get new token (command line or prompt)
  const args = process.argv.slice(2);
  let newToken = args[0] && args[0].trim();

  if (!newToken) {
    console.log('\x1b[33mNote: The token will be visible as you type.\x1b[0m');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = () => new Promise(resolve => rl.question('Enter the new GITHUB_TOKEN: ', ans => {
      rl.close();
      resolve(ans.trim());
    }));
    newToken = await question();
  }

  if (!newToken) {
    console.error('\x1b[31mNo token provided. Aborting.\x1b[0m');
    process.exit(1);
  }

  // 2. Files to update
  const badmintonDir = path.join(__dirname, '..');
  const gocdServerDir = path.join(__dirname, '..', '..', 'gocd-server');

  const filesToUpdate = [
    path.join(badmintonDir, '.env.dev'),
    path.join(badmintonDir, '.env.docker'),
    path.join(badmintonDir, '.env.staging'),
    path.join(badmintonDir, '.env.production'),
    path.join(gocdServerDir, '.env.docker')
  ];

  let updatedCount = 0;

  for (const filePath of filesToUpdate) {
    if (!fs.existsSync(filePath)) {
      console.log(`\x1b[33mSkipping (not found): ${filePath}\x1b[0m`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/^GITHUB_TOKEN=.*/m, `GITHUB_TOKEN=${newToken}`);

    if (newContent === content) {
      console.log(`\x1b[33mNo GITHUB_TOKEN line found in ${filePath} – skipping.\x1b[0m`);
      continue;
    }

    fs.writeFileSync(filePath, newContent);
    console.log(`\x1b[32mUpdated GITHUB_TOKEN in ${path.basename(filePath)}\x1b[0m`);
    updatedCount++;
  }

  console.log(`\n\x1b[36mDone. ${updatedCount} file(s) updated.\x1b[0m`);

  // 3. Also update GitHub environment secret
  try {
    execSync(`gh secret set GITHUB_TOKEN --env development -b"${newToken}"`, {
      stdio: 'pipe',
      env: { ...process.env, GITHUB_TOKEN: newToken }
    });
    console.log('\x1b[32mUpdated GitHub development secret GITHUB_TOKEN\x1b[0m');
  } catch (e) {
    console.log('\x1b[33mCould not update GitHub secret (maybe not logged in or insufficient permissions).\x1b[0m');
  }
}

main().catch(err => {
  console.error('\x1b[31mError:\x1b[0m', err.message);
  process.exit(1);
});