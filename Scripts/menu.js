#!/usr/bin/env node
// Scripts/menu.js - Humrine Site Menu

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

// Load environment variables (default to docker)
const ENVIRONMENT = process.env.ENVIRONMENT || 'docker';
const envFile = `.env.${ENVIRONMENT}`;
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '..', envFile);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function runCommand(command, options = {}) {
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function pause() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('
Press Enter to continue...', () => { rl.close(); resolve(); });
  });
}

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

async function showMenu() {
  while (true) {
    console.clear();
    console.log('Humrine Site Management Menu');
    console.log('============================');
    console.log('1. Start Production (Detached)');
    console.log('2. Stop Production');
    console.log('3. Show Logs');
    console.log('4. Run Migrations');
    console.log('5. Rebuild Images');
    console.log('0. Exit');

    const choice = await ask('Select option: ');
    switch (choice) {
      case '1': runCommand('docker compose -f docker-compose.vm.yml --env-file .env.production --profile production up -d'); await pause(); break;
      case '2': runCommand('docker compose -f docker-compose.vm.yml --env-file .env.production --profile production down'); await pause(); break;
      case '3': runCommand('docker compose -f docker-compose.vm.yml --env-file .env.production --profile production logs -f'); await pause(); break;
      case '4': runCommand('docker compose -f docker-compose.vm.yml --env-file .env.production --profile production exec web-production python manage.py migrate'); await pause(); break;
      case '5': runCommand('docker compose -f docker-compose.vm.yml --env-file .env.production --profile production build'); await pause(); break;
      case '0': process.exit(0);
      default: console.log('Invalid option'); await pause();
    }
  }
}

showMenu();
