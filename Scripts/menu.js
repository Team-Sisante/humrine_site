#!/usr/bin/env node
// Scripts/menu.js
// Modular menu engine driven by menu_sections.json and menu_options.json

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');
const isWindows = os.platform() === 'win32';
const { spawn } = require('child_process');
const cypressInstall = require('./cypress-install');
const venvPath = path.join(__dirname, '..', 'venv');

// =============================================
// Load environment variables dynamically
// =============================================
const dotenv = require('dotenv');
const ENVIRONMENT = process.env.ENVIRONMENT || process.argv[2];
const ALLOWED_ENVIRONMENTS = ['development', 'docker', 'staging', 'production'];

if (!ENVIRONMENT || !ALLOWED_ENVIRONMENTS.includes(ENVIRONMENT)) {
  console.error('\n\x1b[41m\x1b[37m FATAL ERROR \x1b[0m');
  console.error('\x1b[31mMissing or invalid target environment configuration!\x1b[0m');
  process.exit(1);
}

const envSuffix = ENVIRONMENT === 'development' ? 'dev' : ENVIRONMENT;
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envSuffix}`) });
dotenv.config({ path: path.resolve(process.cwd(), `.env.common`) });

function getDockerCompose() {
    try { execSync('docker compose version', { stdio: 'ignore' }); return 'docker compose'; } 
    catch (e) { return 'docker-compose'; }
}
const dc = getDockerCompose();

// ----- Helper functions -----
function sleep(seconds) { execSync(os.platform() === 'win32' ? `timeout /t ${seconds}` : `sleep ${seconds}`, { stdio: 'pipe' }); }
function runCommand(command, options = {}) {
  try {
    const needsVenv = command.includes('python') || command.includes('manage.py') || command.includes('django-admin');
    let finalCommand = command;
    if (needsVenv) {
      if (!process.env.VIRTUAL_ENV) {
        if (!fs.existsSync(venvPath)) return { success: false, error: 'Virtual environment not found' };
        finalCommand = isWindows ? `"${path.join(venvPath, 'Scripts', 'activate.bat')}" && ${command}` : `source "${path.join(venvPath, 'bin', 'activate')}" && ${command}`;
      }
    }
    const defaultOptions = { encoding: 'utf8', stdio: 'inherit', ...options };
    if ((process.env.MSYSTEM === 'MINGW64' || process.env.MSYSTEM === 'MINGW32') && !defaultOptions.shell) defaultOptions.shell = 'bash';
    execSync(finalCommand, defaultOptions);
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
}
function pause() { return new Promise(resolve => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question('\x1b[33mPress Enter to continue...\x1b[0m', () => { rl.close(); resolve(); }); }); }
function ask(question) { return new Promise(resolve => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(question, answer => { rl.close(); resolve(answer.trim()); }); }); }

// Remote Helpers
function remoteDockerComposeUp(service, envFile, projectName, profile) {
  const vmIp = process.env.GCP_VM_IP; const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) return;
  const remoteCmd = `sudo docker compose -p ${projectName} -f docker-compose.vm.yml --env-file ${envFile} --profile ${profile} up -d --force-recreate ${service}`;
  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "cd /opt/badminton_court && ${remoteCmd}"`;
  try { execSync(sshCmd, { stdio: 'inherit' }); } catch (err) {}
}
function remoteDeleteImage(service, imageTag, projectName, envFile, profile) {
  const vmIp = process.env.GCP_VM_IP; const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) return;
  const remoteCmd = `sudo docker compose -p ${projectName} -f docker-compose.vm.yml --env-file ${envFile} --profile ${profile} rm -sf ${service} 2>/dev/null && sudo docker rmi ${imageTag} 2>/dev/null || echo "Image ${imageTag} not found or already removed."`;
  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "cd /opt/badminton_court && ${remoteCmd}"`;
  try { execSync(sshCmd, { stdio: 'inherit' }); } catch (err) {}
}
function remoteFullCleanup(projectName, envFile, profile) {
  const vmIp = process.env.GCP_VM_IP; const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) return;
  const remoteCmd = `cd /opt/badminton_court && sudo docker compose -p ${projectName} -f docker-compose.vm.yml --env-file ${envFile} --profile ${profile} down -v --rmi all && sudo docker system prune -af --volumes`;
  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "${remoteCmd}"`;
  try { execSync(sshCmd, { stdio: 'inherit' }); } catch (err) {}
}
function remoteDockerSystemPrune() {
  const vmIp = process.env.GCP_VM_IP; const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) return;
  const remoteCmd = `sudo docker stop $(sudo docker ps -q) 2>/dev/null || true && sudo docker system prune -af --volumes`;
  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "${remoteCmd}"`;
  try { execSync(sshCmd, { stdio: 'inherit' }); } catch (err) {}
}

// --- Load Menu Configurations & App Title ---
const sections = require('./menu_sections.json');
const options = require('./menu_options.json');
const packageJson = require('../package.json');

// Use the custom "title" attribute exactly as defined in package.json
const menuTitle = packageJson.title || 'Management Menu';

// --- Menu Engine ---
async function executeMenuOption(choice) {
  if (choice === '0') process.exit(0);
  const option = options.find(o => o.id === choice);
  if (!option) { console.log('\x1b[31mInvalid option.\x1b[0m'); await pause(); return; }
  
  try {
    const optionPath = path.join(__dirname, 'options', option.script);
    if (fs.existsSync(optionPath)) {
      const optionFunc = require(optionPath);
      const helpers = { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process };
      await optionFunc(helpers);
    } else { 
      console.log(`\x1b[31mOption script not found: ${option.script}\x1b[0m`); 
    }
  } catch (err) { 
    console.error('\x1b[31mUnexpected error:\x1b[0m', err.message); 
  }
  
  // FIX: Always pause at the end so the screen doesn't clear immediately,
  // allowing the user to see errors and command output.
  await pause();
}

async function showMenu() {
  while (true) {
    if (isWindows) { execSync('cls', { stdio: 'inherit' }); } else { execSync('clear', { stdio: 'inherit' }); }
    
    console.log('\x1b[32m===============================\x1b[0m');
    console.log(`\x1b[32m${menuTitle}\x1b[0m`);
    console.log('\x1b[32m===============================\x1b[0m');
    console.log('');
    
    sections.forEach(section => {
      console.log(`\x1b[36m${section.id}. ${section.name}\x1b[0m`);
      options.filter(o => o.section === section.id).forEach(o => {
        console.log(`   ${o.id}. ${o.name}`);
      });
      console.log('');
    });
    
    console.log('\x1b[30m0. Exit\x1b[0m');
    console.log('\n\x1b[32m===============================\x1b[0m');
    console.log(`\x1b[32m${menuTitle}\x1b[0m`);
    console.log('\x1b[32m===============================\x1b[0m');

    const choice = await ask('Select option: ');
    await executeMenuOption(choice);
  }
}

async function main() {
  if (process.env.GCP_SA_KEY_PATH) {
    const keyPath = path.isAbsolute(process.env.GCP_SA_KEY_PATH) ? process.env.GCP_SA_KEY_PATH : path.join(__dirname, '..', process.env.GCP_SA_KEY_PATH);
    if (fs.existsSync(keyPath)) process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
  }
  await showMenu();
}
main().catch(err => { console.error('Error:', err); process.exit(1); });