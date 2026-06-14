#!/usr/bin/env node
// Scripts/menu.js
// Merged version: all original functionality + new features (generate-env, migrations, binary management, error log filter).
// Cross‑platform: runs on Windows, macOS, Linux with Node.js.
// All npm run references have been replaced with raw commands (package.json scripts removed).

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

// 1. Strictly extract the environment without falling back to a default
const ENVIRONMENT = process.env.ENVIRONMENT || process.argv[2];
const ALLOWED_ENVIRONMENTS = ['development', 'docker', 'staging', 'production'];

// 2. Guard Clause: Block execution if completely missing
if (!ENVIRONMENT) {
  console.error('\n\x1b[41m\x1b[37m FATAL ERROR \x1b[0m');
  console.error('\x1b[31mMissing target environment configuration!\x1b[0m');
  console.error('You must explicitly declare the environment when starting this menu.');
  console.error('\x1b[36mExamples:\x1b[0m');
  console.error('  node Scripts/menu.js development');
  console.error('  cross-env ENVIRONMENT=docker node Scripts/menu.js\n');
  process.exit(1);
}

// 3. Guard Clause: Block execution if the string is garbage/typoed
if (!ALLOWED_ENVIRONMENTS.includes(ENVIRONMENT)) {
  console.error('\n\x1b[41m\x1b[37m INVALID ENVIRONMENT \x1b[0m');
  console.error(`\x1b[31m"${ENVIRONMENT}" is not a recognized environment profile.\x1b[0m`);
  console.error(`Allowed options are: \x1b[33m${ALLOWED_ENVIRONMENTS.join(', ')}\x1b[0m\n`);
  process.exit(1);
}

// 4. Resolve the correct env file based on strict validation
const envSuffix = ENVIRONMENT === 'development' ? 'dev' : ENVIRONMENT;
const envPath = path.resolve(process.cwd(), `.env.${envSuffix}`);
const commonEnvPath = path.resolve(process.cwd(), `.env.common`);

console.log(`\x1b[32m✔ Target environment verified: [${ENVIRONMENT.toUpperCase()}]\x1b[0m`);
console.log(`Loading configurations from: ${envPath}\n`);

// Load the exact dotEnv file validated above
dotenv.config({ path: envPath });
dotenv.config({ path: commonEnvPath });

// --- Helper for Docker Compose ---
function getDockerCompose() {
    // Linux/macOS modern systems prefer 'docker compose' (v2), but 'docker-compose' might exist.
    // Windows often uses 'docker-compose' from Docker Toolbox or older installs.
    try {
        execSync('docker compose version', { stdio: 'ignore' });
        return 'docker compose';
    } catch (e) {
        return 'docker-compose';
    }
}
const dc = getDockerCompose();

// ----- Helper functions -----
function sleep(seconds) {
  if (os.platform() === 'win32') {
    execSync(`timeout /t ${seconds}`, { stdio: 'pipe' });
  } else {
    execSync(`sleep ${seconds}`, { stdio: 'pipe' });
  }
}

// Helper function to execute commands
function runCommand(command, options = {}) {
  try {
    // Check if this is a Python/Django command that needs venv
    const needsVenv = command.includes('python') ||
      command.includes('manage.py') ||
      command.includes('django-admin');

    let finalCommand = command;

    if (needsVenv) {
      const isVenvActivated = process.env.VIRTUAL_ENV !== undefined;

      if (!isVenvActivated) {
        // Check if venv exists
        if (!fs.existsSync(venvPath)) {
          console.log('\x1b[31m✗ Virtual environment not found at: ' + venvPath + '\x1b[0m');
          console.log('\x1b[33mPlease create a virtual environment first by running: python -m venv venv\x1b[0m');
          return { success: false, error: 'Virtual environment not found' };
        }

        // Prepend activation command based on platform
        if (isWindows) {
          finalCommand = `"${path.join(venvPath, 'Scripts', 'activate.bat')}" && ${command}`;
        } else {
          finalCommand = `source "${path.join(venvPath, 'bin', 'activate')}" && ${command}`;
        }

        console.log('\x1b[33m⚠ Activating virtual environment automatically...\x1b[0m');
      } else {
        console.log('\x1b[32m✓ Virtual environment already activated\x1b[0m');
      }
    }

    // Default to inheriting stdio so output shows in real-time
    const defaultOptions = {
      encoding: 'utf8',
      stdio: 'inherit',
      ...options,
      env: { ...process.env, ...options.env }
    };

    // Use bash if in Git Bash/MINGW64 environment
    const isGitBash = process.env.MSYSTEM === 'MINGW64' || process.env.MSYSTEM === 'MINGW32';
    if (isGitBash && !defaultOptions.shell) {
      defaultOptions.shell = 'bash';
    }

    execSync(finalCommand, defaultOptions);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

// Run a shell command with extra environment variables, piping I/O to the terminal
function runCommandWithEnv(command, args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

function remoteDockerComposeUp(service, envFile, projectName, profile) {
  const vmIp = process.env.GCP_VM_IP;
  const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) {
    console.error('\x1b[31mGCP_VM_IP and VM_SSH_USER must be set.\x1b[0m');
    return;
  }
  // FIX: Force 'docker-compose' binary for Linux VM and fixed filename
  const remoteCmd = `sudo docker compose -p ${projectName} -f docker-compose.vm.yml --env-file ${envFile} --profile ${profile} up -d --force-recreate ${service}`;
  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "cd /opt/badminton_court && ${remoteCmd}"`;
  console.log(`\x1b[36mStarting ${service} (${projectName})...\x1b[0m`);
  try {
    execSync(sshCmd, { stdio: 'inherit' });
    console.log(`\x1b[32m${service} started successfully.\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31mFailed to start ${service}: ${err.message}\x1b[0m`);
  }
}

function remoteDockerComposeDownRmi(projectName, envFile, profile) {
  const vmIp = process.env.GCP_VM_IP;
  const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) {
    console.error('\x1b[31mGCP_VM_IP and VM_SSH_USER must be set.\x1b[0m');
    return;
  }
  // FIX: Force 'docker-compose' binary for Linux VM and fixed filename
  const remoteCmd = `sudo docker compose -p ${projectName} -f docker-compose.vm.yml --env-file ${envFile} --profile ${profile} down --rmi all`;
  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "cd /opt/badminton_court && ${remoteCmd}"`;
  console.log(`\x1b[33mRemoving all ${projectName} images and stopping containers...\x1b[0m`);
  try {
    execSync(sshCmd, { stdio: 'inherit' });
    console.log(`\x1b[32m${projectName} images removed.\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31mFailed to remove images: ${err.message}\x1b[0m`);
  }
}

function remoteDeleteImage(service, imageTag, projectName, envFile, profile) {
  const vmIp = process.env.GCP_VM_IP;
  const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) {
    console.error('\x1b[31mGCP_VM_IP and VM_SSH_USER must be set.\x1b[0m');
    return;
  }

  // FIX: Force 'docker-compose' binary for Linux VM and fixed filename
  const remoteCmd = `sudo docker compose -p ${projectName} -f docker-compose.vm.yml --env-file ${envFile} --profile ${profile} rm -sf ${service} 2>/dev/null && sudo docker rmi ${imageTag} 2>/dev/null || echo "Image ${imageTag} not found or already removed."`;
  
  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "cd /opt/badminton_court && ${remoteCmd}"`;
  console.log(`\x1b[33mRemoving image for ${service} (${imageTag})...\x1b[0m`);
  try {
    execSync(sshCmd, { stdio: 'inherit' });
    console.log(`\x1b[32mImage ${imageTag} removed.\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31mFailed to remove image: ${err.message}\x1b[0m`);
  }
}

function remoteFullCleanup(projectName, envFile, profile) {
  const vmIp = process.env.GCP_VM_IP;
  const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) {
    console.error('\x1b[31mGCP_VM_IP and VM_SSH_USER must be set.\x1b[0m');
    return;
  }

  const remoteCmd = [
    `echo "=== Stopping and removing containers, images, volumes for ${projectName} ==="`,
    `cd /opt/badminton_court`,
    `sudo docker compose -p ${projectName} -f docker-compose.vm.yml --env-file ${envFile} --profile ${profile} down -v --rmi all`,
    `echo "=== Pruning all unused Docker resources ==="`,
    `sudo docker system prune -af --volumes`
  ].join(' ; ');

  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "${remoteCmd}"`;
  console.log(`\x1b[33mPerforming full cleanup on ${projectName}...\x1b[0m`);
  try {
    execSync(sshCmd, { stdio: 'inherit' });
    console.log(`\x1b[32mFull cleanup complete.\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31mFull cleanup failed: ${err.message}\x1b[0m`);
  }
}

function pause() {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('\x1b[33mPress Enter to continue...\x1b[0m', () => {
      rl.close();
      resolve();
    });
  });
}

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function remoteDockerSystemPrune() {
  const vmIp = process.env.GCP_VM_IP;
  const sshUser = process.env.VM_SSH_USER;
  const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
  if (!vmIp || !sshUser) {
    console.error('\x1b[31mGCP_VM_IP and VM_SSH_USER must be set.\x1b[0m');
    return;
  }

  const remoteCmd = [
    `echo "=== Stopping ALL containers ==="`,
    `sudo docker stop $(sudo docker ps -q) 2>/dev/null || true`,
    `echo "=== Removing ALL containers, images, volumes, and build cache ==="`,
    `sudo docker system prune -af --volumes`
  ].join(' ; ');

  const sshCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "${remoteCmd}"`;

  console.log(`\x1b[33mPerforming FULL Docker system cleanup on VM ${vmIp}...\x1b[0m`);
  try {
    execSync(sshCmd, { stdio: 'inherit' });
    console.log(`\x1b[32mDocker system cleanup completed.\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31mCleanup failed: ${err.message}\x1b[0m`);
  }
}

async function executeMenuOption(choice) {
  switch (choice) {
    // ==================== 1. LOCAL DEVELOPMENT ====================
    case '1.1':
      console.log('DEBUG: ENVIRONMENT:', process.env.ENVIRONMENT, 'SECRET_KEY:', process.env.SECRET_KEY ? 'IS SET' : 'IS NOT SET');
      // runCommand("docker stop web-dev >/dev/null 2>&1 || true");
      // runCommand("docker stop web-test >/dev/null 2>&1 || true");
      let localDevCommand = `echo '🚀 Starting local development environment...' && cross-env ENVIRONMENT=development python manage.py runserver 0.0.0.0:8000`;
      runCommand(localDevCommand);
      await pause();
      break;
    case '1.2': {
      const venvPath = path.join(__dirname, '..', 'venv');
      // runCommand("docker stop web-dev");
      // runCommand("docker stop web-test");
      console.log('Ensuring development containers are running...');
      
      // Auto-setup venv and dependencies if missing
      if (!fs.existsSync(venvPath)) {
        console.log('\x1b[33m⚠ venv not found. Setting up virtual environment...\x1b[0m');
        const venvRes = runCommand('python -m venv venv');
        
        if (venvRes.success) {
          let pipCmd = isWindows 
            ? path.join(venvPath, 'Scripts', 'pip')
            : path.join(venvPath, 'bin', 'pip');
          
          console.log('\x1b[33m⚠ Installing dependencies...\x1b[0m');
          runCommand(`"${pipCmd}" install -r requirements.txt`);
        } else {
          console.error('\x1b[31mFailed to create venv: ' + venvRes.error + '\x1b[0m');
        }
      }

      // TODO (Future): Enable these services once defined in docker-compose.yml
      // runCommand(`${getDockerCompose()} --env-file .env.common --env-file .env.docker --profile dev up -d db redis mail-test`);
      
      // wait for db healthy (optional, but recommended)
      const localDevDetachedCommand = `echo '🚀 Starting local development environment in detached mode...' && node Scripts/run-detached.js`;
      runCommand(localDevDetachedCommand);
      await pause();
      break;
    }
    case '1.3':
      runCommand(`echo '🛑 Stopping local dev server development...' && node Scripts/stop-server.js`);
      await pause();
      break;
    case '1.4':
      runCommand(`echo '📊 Loading local dev data...' && cross-env ENVIRONMENT=development python manage.py load_test_data`);
      await pause();
      break;
    case '1.5':
      runCommand(`echo '🚀 Starting dev tunnel...' && python tunnel.py`);
      await pause();
      break;

    // ==================== 2. LOCAL CYPRESS TESTING ====================
    case '2.1': {
      const inquirer = (await import('inquirer')).default;
      const { envFileName } = await inquirer.prompt({
        type: 'list',
        name: 'envFileName',
        message: 'Select environment to test:',
        choices: [
          { name: 'Development (.env.test.dev)',        value: '.env.test.dev' },
          { name: 'Docker (.env.test.docker)',          value: '.env.test.docker' },
          { name: 'Staging (.env.test.staging)',        value: '.env.test.staging' },
          { name: 'Production (.env.test.production)',  value: '.env.test.production' }
        ]
      });

      const envPath = path.resolve(__dirname, '..', envFileName);
      if (!fs.existsSync(envPath)) {
        console.error(`\x1b[31mEnvironment file ${envFileName} not found at ${envPath}\x1b[0m`);
        await pause();
        break;
      }

      // Check if test environment is running AND healthy
      const checkCmd = 'docker compose --profile test ps --format json';
      let isRunning = false;
      let isHealthy = false;
      try {
        const output = execSync(checkCmd, { stdio: 'pipe', encoding: 'utf8' });
        if (output.trim()) {
          const containers = JSON.parse(`[${output.trim().split(/\r?\n/).join(',')}]`);
          isRunning = containers.some(c => c.State === 'running');
          // Basic health check simulation: look for 'healthy' in the State (if defined)
          isHealthy = containers.every(c => !c.State || c.State.includes('running') || c.State.includes('healthy'));
        }
      } catch (err) {
        // Assume not running if command fails
      }

      if (!isRunning || !isHealthy) {
        console.log('\x1b[31m--- ENVIRONMENT ALERT ---\x1b[0m');
        if (!isRunning) {
            console.log('The test backend is not running.');
        } else {
            console.log('The test backend appears to be in an unhealthy or crashed state.');
        }
        console.log('Suggestions:');
        console.log('1. Run option "4.4" to check logs for errors.');
        console.log('2. If containers are stuck, use option "10.7" to reset volumes.');
        console.log('3. Restart via option "4.2" after cleaning.');
        console.log('\x1b[31m-------------------------\x1b[0m');
        
        await pause();
        break;
      }

      console.log(`\x1b[36mOpening Cypress using ${envFileName}\x1b[0m`);

      // Resolve absolute paths for the virtual environment relative to the script location
      const appRoot = path.resolve(__dirname, '..');
      const venvScriptPath = path.join(appRoot, 'venv', 'Scripts', 'activate.bat');
      const venvBinPath = path.join(appRoot, 'venv', 'Scripts');
      
      let cypressCmd = `npx cypress open`;
      let modifiedEnv = { ...process.env, CYPRESS_ENV_FILE: envPath };

      // If a venv exists, modify the environment context variables and the execution chain
      if (fs.existsSync(venvScriptPath)) {
        console.log(`\x1b[32mInjecting Python virtual environment variables into Cypress...\x1b[0m`);
        
        // Prepend venv bin directory so that any downstream 'python' commands execution defaults here
        if (process.env.PATH) {
          modifiedEnv.PATH = `${venvBinPath}${path.delimiter}${process.env.PATH}`;
        } else {
          modifiedEnv.PATH = venvBinPath;
        }
        
        // Set standard Python tracking properties
        modifiedEnv.VIRTUAL_ENV = path.join(appRoot, 'venv');
        
        // Chain the native Windows activation batch file with the call keyword
        cypressCmd = `call "${venvScriptPath}" && npx cypress open`;
      }

      // Launch Cypress with CYPRESS_ENV_FILE explicitly in the environment
      try {
        execSync(cypressCmd, {
          stdio: 'inherit',
          cwd: appRoot,
          env: modifiedEnv,
          shell: 'cmd.exe' // Forces native command prompt routing to process .bat execution smoothly
        });
      } catch (err) {
        // Cypress exits with non-zero when closed; ignore
      }
      await pause();
      break;
    }
    case '2.2':
      runCommand(`echo '🚀 Running migrations...' && cross-env ENVIRONMENT=development python manage.py migrate`);
      runCommand(`echo '🚀 Running Cypress tests (headed)...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('npx', ['cypress','run','--headed','--browser','chrome'], { stdio:'inherit', shell: true })"`);
      await pause();
      break;
    case '2.3':
      runCommand(`echo '⚡ Running Cypress tests (headless)...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('npx', ['cypress','run','--headless','--browser','chrome'], { stdio:'inherit', shell: true })"`);
      await pause();
      break;
    case '2.4':
      runCommand(`echo '⚡ Running Cypress tests for presentation (headed)...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('npx', ['cypress','run','--headed','--browser','chrome','--config','video=true'], { stdio:'inherit', shell: true })" && echo '⚡ Running Post-Process Videos...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('node', ['Scripts/post-process-videos.js'], { stdio:'inherit', shell: true })"`);
      await pause();
      break;
    case '2.5':
      runCommand(`echo '🎬 Select a Cypress test from the list and run it for presentation (headed)...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('node', ['Scripts/create-presentation.js'], { stdio:'inherit', shell: true })"`);
      await pause();
      break;
    case '2.6':
      runCommand(`echo '⚡ Running Post-Process Videos...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('node', ['Scripts/post-process-videos.js'], { stdio:'inherit', shell: true })"`);
      await pause();
      break;
    case '2.7': {
      const spec = await ask('Enter spec file path (optional): ');
      let cmd = `echo '⚡ Running Cypress tests for presentation spec (headed)...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('npx', ['cypress','run','--headed','--browser','chrome','--config','video=true','--spec'`;
      if (spec) cmd += `,'${spec}'`; else cmd += `,''`;
      cmd += `], { stdio:'inherit', shell: true })" && echo '⚡ Running Post-Process Videos...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('node', ['Scripts/post-process-videos.js'], { stdio:'inherit', shell: true })"`;
      runCommand(cmd);
      await pause();
      break;
    }

    // ==================== 3. DOCKER DEVELOPMENT ENVIRONMENT ====================
    case '3.1':
      const dockerDevParam = await ask('Enter additional parameter for cruise-config.xml (optional): ');
      let dockerDevCommand = `echo '🚀 Starting development environment...' && ${dc} --env-file .env.docker --profile dev up`;
      if (dockerDevParam) dockerDevCommand += ` ${dockerDevParam}`;
      runCommand(dockerDevCommand);
      await pause();
      break;
    case '3.2':
      const dockerDevDetachedParam = await ask('Enter additional parameter for cruise-config.xml (optional): ');
      let dockerDevDetachedCommand = `echo '🚀 Starting development environment (detached)...' && ${dc} --env-file .env.docker --profile dev up -d`;
      if (dockerDevDetachedParam) dockerDevDetachedCommand += ` ${dockerDevDetachedParam}`;
      runCommand(dockerDevDetachedCommand);
      await pause();
      break;
    case '3.3':
      runCommand(`echo '🛑 Stopping development services...' && ${dc} --env-file .env.docker --profile dev down`);
      await pause();
      break;
    case '3.4':
      runCommand(`echo '📋 Showing development logs...' && ${dc} --env-file .env.docker --profile dev logs -f`);
      await pause();
      break;
    case '3.5':
      runCommand(`echo '🔄 Restarting web-dev container...' && ${dc} --env-file .env.docker --profile dev restart web-dev`);
      await pause();
      break;
    case '3.6':
      // docker:dev-start: certs:create + docker:dev-detached
      runCommand(`echo '🚀 Ensuring certificates exist and starting dev environment...' && echo 'Creating openssl certificates...' && node Scripts/generate-certs.js && echo '🚀 Starting development environment (detached)...' && ${dc} --env-file .env.docker --profile dev up -d`);
      await pause();
      break;
    case '3.7':
      // docker:dev-reset-and-start: rebuild-dev + certs:create + dev-detached + wait-for-ready + reset-db-migrate
      runCommand(
        `echo '🔄 Resetting dev environment and starting fresh...' && ` +
        `echo '🐳 Rebuilding dev services...' && ${dc} --env-file .env.docker --profile dev down -v --rmi all && docker-compose --env-file .env.docker --profile dev build && ` +
        `echo 'Creating openssl certificates...' && node Scripts/generate-certs.js && ` +
        `echo '🚀 Starting development environment (detached)...' && ${dc} --env-file .env.docker --profile dev up -d && ` +
        `node Scripts/wait-for-ready.js && ` +
        `echo '🔄 Resetting database with migrations...' && node Scripts/reset-db-docker.js --migrate`
      );
      await pause();
      break;
    case '3.8':
      runCommand(`echo '🔄 Force recreating dev containers...' && ${dc} --env-file .env.docker --profile dev up -d --force-recreate`);
      await pause();
      break;

    // ==================== 4. DOCKER TESTING ENVIRONMENT ====================
    case '4.1':
      runCommand(`echo '🧪 Starting test environment...' && ${dc} --env-file .env.docker --profile test up`);
      await pause();
      break;
    case '4.2':
      runCommand(`echo '🧪 Starting test environment (detached)...' && ${dc} --env-file .env.docker --profile test up -d`);
      await pause();
      break;
    case '4.3':
      runCommand(`echo '🛑 Stopping test services...' && ${dc} --env-file .env.docker --profile test down`);
      await pause();
      break;
    case '4.4':
      runCommand(`echo '📋 Showing test logs...' && ${dc} --env-file .env.docker --profile test logs -f`);
      await pause();
      break;
    case '4.5':
      runCommand(`echo '🔧 Setting up test data...' && ${dc} --env-file .env.docker --profile test run --rm test-setup`);
      await pause();
      break;

    // ==================== 5. DOCKER CYPRESS TESTING ====================
    case '5.1':
      runCommand(`echo '🚀 Starting Cypress container...' && ${dc} --env-file .env.docker --profile test up -d cypress`);
      await pause();
      break;
    case '5.2':
      runCommand(`echo '🔍 Opening Cypress in existing container...' && ${dc} --env-file .env.docker --profile test exec cypress open`);
      await pause();
      break;
    case '5.3':
      runCommand(`echo '⚡ Running Cypress tests in existing container...' && ${dc} --env-file .env.docker --profile test exec cypress run`);
      await pause();
      break;
    case '5.4':
      runCommand(`echo '🛑 Stopping Cypress container...' && ${dc} --env-file .env.docker --profile test stop cypress`);
      await pause();
      break;
    case '5.5':
      runCommand(`echo '🚀 Running Cypress tests (headed) in new container...' && ${dc} --env-file .env.docker --profile test run --rm cypress cypress run --headed`);
      await pause();
      break;
    case '5.6':
      runCommand(`echo '⚡ Running Cypress tests (headless) in new container...' && ${dc} --env-file .env.docker --profile test run --rm cypress cypress run --headless $@`);
      await pause();
      break;
    case '5.7':
      runCommand(`echo '⚡ Running connectivity tests (headless) in new container...' && ${dc} --env-file .env.docker --profile test run --rm cypress cypress run --headless --spec 'cypress/e2e/connectivity.cy.js'`);
      await pause();
      break;
    case '5.8':
      await cypressInstall();
      await pause();
      break;
    case '5.9':
      runCommand(`npx cypress cache clear`);
      await pause();
      break;

    // ==================== 6. DOCKER PRESENTATION ENVIRONMENT ====================
    case '6.1':
      runCommand(`echo '🎬 Select a Cypress test from the list and run it for presentation (headed) in Docker...' && ${dc} --env-file .env.docker --profile dev --profile presentation run --rm presentation node Scripts/create-presentation-docker.js`);
      await pause();
      break;
    case '6.2':
      runCommand(`echo '⚡ Running Post-Process Videos in Docker...' && ${dc} --env-file .env.docker --profile dev --profile presentation run --rm presentation node Scripts/post-process-videos-docker.js`);
      await pause();
      break;
    case '6.3': {
      const presentationSpec = await ask('Enter spec file path (optional): ');
      let dockerCypressPresentationSpecCommand = `echo '🚀 Running Docker Cypress tests for presentation spec...' && ${dc} --env-file .env.docker --profile test exec cypress run --headed --browser chrome --config video=true --spec`;
      if (presentationSpec) dockerCypressPresentationSpecCommand += ` ${presentationSpec}`;
      dockerCypressPresentationSpecCommand += ` && echo '⚡ Running Post-Process Videos in Docker...' && ${dc} --env-file .env.docker --profile dev --profile presentation run --rm presentation node Scripts/post-process-videos-docker.js`;
      runCommand(dockerCypressPresentationSpecCommand);
      await pause();
      break;
    }

    // ==================== 7. DOCKER TUNNEL MANAGEMENT ====================
    case '7.1':
      runCommand(`echo '🐳 Building tunnel service...' && ${dc} --env-file .env.docker --profile dev --profile tunnel --progress=plain build tunnel`);
      await pause();
      break;
    case '7.2':
      runCommand(`echo '🐳 Building tunnel service (no cache)...' && ${dc} --env-file .env.docker --profile dev --profile tunnel --progress=plain build tunnel --no-cache`);
      await pause();
      break;
    case '7.3':
      runCommand(`echo '🚀 Starting docker tunnel...' && ${dc} --env-file .env.docker --profile dev --profile tunnel up tunnel`);
      await pause();
      break;
    case '7.4':
      runCommand(`echo '🚀 Starting docker tunnel (detached)...' && ${dc} --env-file .env.docker --profile dev --profile tunnel up -d tunnel`);
      await pause();
      break;
    case '7.5':
      runCommand(`echo '🛑 Stopping docker tunnel...' && ${dc} --env-file .env.docker --profile dev --profile tunnel stop tunnel`);
      await pause();
      break;
    case '7.6':
      runCommand(`echo '📋 Showing tunnel logs...' && ${dc} --env-file .env.docker --profile dev --profile tunnel logs -f tunnel`);
      await pause();
      break;

    // ==================== 8. DOCKER DATABASE MANAGEMENT ====================
    case '8.1':
      runCommand(`echo '🔧 Running database migrations in dev container...' && ${dc} --env-file .env.docker --profile dev exec -T web-dev python manage.py migrate`);
      await pause();
      break;
    case '8.2':
      runCommand(`echo '🔄 Resetting database...' && node Scripts/reset-db-docker.js`);
      await pause();
      break;
    case '8.3':
      runCommand(`echo '🔄 Resetting database with migrations...' && node Scripts/reset-db-docker.js --migrate`);
      await pause();
      break;
    case '8.4':
      runCommand(`echo '🔄 Full database reset with test data...' && node Scripts/reset-db-docker.js --migrate --load-test-data`);
      await pause();
      break;

    // ==================== 9. DOCKER IMAGE MANAGEMENT ====================
    case '9.1':
      runCommand(`echo '🐳 Building all service images...' && ${dc} --env-file .env.docker --profile dev --profile test --profile tunnel --profile presentation --progress=plain build`);
      await pause();
      break;
    case '9.2':
      runCommand(`echo '🐳 Building all service images (no cache)...' && ${dc} --env-file .env.docker --profile dev --profile test --profile tunnel --profile presentation --progress=plain build --no-cache`);
      await pause();
      break;
    case '9.3':
      runCommand(`echo '🐳 Building dev service images...' && ${dc} --env-file .env.docker --profile dev --progress=plain build`);
      await pause();
      break;
    case '9.4':
      runCommand(`echo '🐳 Building dev service images (no cache)...' && ${dc} --env-file .env.docker --profile dev --progress=plain build --no-cache`);
      await pause();
      break;
    case '9.5':
      runCommand(`echo '🐳 Building Cypress service image...' && ${dc} --env-file .env.docker --profile test --progress=plain build cypress`);
      await pause();
      break;
    case '9.6':
      runCommand(`echo '🐳 Building Cypress service image (no cache)...' && ${dc} --env-file .env.docker --profile test --progress=plain build cypress --no-cache`);
      await pause();
      break;
    case '9.7':
      runCommand(`echo '🐳 Building presentation service images...' && ${dc} --env-file .env.docker --profile dev --profile presentation --progress=plain build`);
      await pause();
      break;
    case '9.8':
      runCommand(`echo '🐳 Building presentation service images (no cache)...' && ${dc} --env-file .env.docker --profile dev --profile presentation --progress=plain build --no-cache`);
      await pause();
      break;

    // ==================== 10. DOCKER SYSTEM MANAGEMENT ====================
    case '10.1':
      runCommand(`echo '🐳 Completely rebuilding all services...' && ${dc} --env-file .env.docker --profile dev down -v --rmi all && docker-compose --env-file .env.docker --profile test down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile presentation down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile tunnel down -v --rmi all && echo '🐳 Building all service images...' && docker-compose --env-file .env.docker --profile dev --profile test --profile tunnel --profile presentation --progress=plain build`);
      await pause();
      break;
    case '10.2':
      runCommand(`echo '🐳 Rebuilding dev services...' && ${dc} --env-file .env.docker --profile dev down -v --rmi all && docker-compose --env-file .env.docker --profile dev build`);
      await pause();
      break;
    case '10.3':
      runCommand(`echo '🐳 Rebuilding test services...' && ${dc} --env-file .env.docker --profile test down -v --rmi all && docker-compose --env-file .env.docker --profile test build`);
      await pause();
      break;
    case '10.4':
      runCommand(`echo '🐳 Rebuilding presentation services...' && ${dc} --env-file .env.docker --profile dev --profile presentation down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile presentation build`);
      await pause();
      break;
    case '10.5':
      runCommand(`echo '📋 Showing service logs...' && ${dc} --env-file .env.docker --profile dev logs -f`);
      await pause();
      break;
    case '10.6': {
      const serviceName = await ask('Enter service name: ');
      runCommand(`echo '🖥️  Opening shell in service container...' && ${dc} --profile dev exec "${serviceName}"`);
      await pause();
      break;
    }
    case '10.7':
      runCommand(`echo '🗑️  Stopping all services and removing volumes...' && ${dc} --env-file .env.docker --profile dev down -v`);
      await pause();
      break;
    case '10.8':
      runCommand(`echo '🧹 Cleaning up unused Docker resources...' && docker system prune -f`);
      await pause();
      break;
    case '10.9':
      runCommand(`echo '🔄 Resetting environment...' && ${dc} --env-file .env.docker --profile dev down -v --rmi all && docker-compose --env-file .env.docker --profile test down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile presentation down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile tunnel down -v --rmi all && docker system prune -f`);
      await pause();
      break;
    case '10.10':
      runCommand(`echo '🔄 Resetting environment (keeping base images)...' && ${dc} --env-file .env.docker --profile dev down -v && docker-compose --env-file .env.docker --profile test down -v && docker-compose --env-file .env.docker --profile dev --profile presentation down -v && docker-compose --env-file .env.docker --profile dev --profile tunnel down -v && docker system prune -f --filter 'until=24h'`);
      await pause();
      break;
    case '10.11':
      runCommand(`echo '📊 Showing service status...' && ${dc} ps`);
      await pause();
      break;

    // ==================== 11. ADVANCED CLEANUP ====================
    case '11.1':
      console.log('\x1b[33mPerforming complete system cleanup...\x1b[0m');
      runCommand('docker system prune -a --volumes -f');
      await pause();
      break;
    case '11.2':
      console.log('\x1b[33mDeep cleanup with Docker Desktop restart...\x1b[0m');
      if (isWindows) {
        runCommand('taskkill /F /IM "Docker Desktop"');
        sleep(10);
        runCommand('docker system prune -a --volumes');
        runCommand('start ""C:\Program Files\Docker\Docker\Docker Desktop.exe""');
        sleep(30);
        console.log('\x1b[32mDocker Desktop should be starting. Wait for it to initialize.\x1b[0m');
      } else {
        runCommand('pkill -f "Docker Desktop"');
        sleep(10);
        runCommand('docker system prune -a --volumes');
        runCommand('open -a Docker Desktop');
        sleep(30);
      }
      await pause();
      break;
    case '11.3':
      console.log('\x1b[31mWARNING: This will reset Docker Desktop to factory defaults!\x1b[0m');
      const confirmFactory = await ask('Continue? (y/n): ');
      if (confirmFactory === 'y') {
        console.log('\x1b[33mPlease reset manually via Docker Desktop UI.\x1b[0m');
      }
      await pause();
      break;
    case '11.4':
      console.log('\x1b[33mCleaning Docker content store...\x1b[0m');
      if (isWindows) {
        runCommand('taskkill /F /IM "Docker Desktop"');
        sleep(10);
        runCommand('docker system prune -a --volumes');
        runCommand('start ""C:\Program Files\Docker\Docker\Docker Desktop.exe""');
        sleep(30);
      } else {
        runCommand('pkill -f "Docker Desktop"');
        sleep(10);
        runCommand('docker system prune -a --volumes');
        runCommand('open -a Docker Desktop');
        sleep(30);
      }
      await pause();
      break;
    case '11.5':
      runCommand(`echo '🔄 COMPLETE Docker reset (fixes content store corruption)...' && node Scripts/docker-desktop-reset.js`);
      await pause();
      break;
    case '11.6':
      const confirmRebuild = await ask('Are you sure? (y/n): ');
      if (confirmRebuild === 'y') runCommand(`echo '🔄 COMPLETE Docker reset and rebuild everything...' && node Scripts/docker-desktop-reset-and-rebuild.js`);
      await pause();
      break;

    // ==================== 12. BACKUP & RESTORE ====================
    case '12.1':
      runCommand(`echo '📦 Backing up all available Docker images into a single archive (all-images.tar)...' && node Scripts/backupImages.js`);
      await pause();
      break;
    case '12.2':
      runCommand(`echo '📦 Restoring all Docker images from a single archive (all-images.tar)...' && node Scripts/restoreImages.js`);
      await pause();
      break;
    case '12.3':
      const backupImgNames = await ask('Enter image name(s): ');
      runCommand(`echo '➕ Adding one or more images to the all-images.tar archive (e.g.: npm run docker:backup-individual -- web-dev)...' && node Scripts/backupIndividual.js ${backupImgNames}`);
      await pause();
      break;
    case '12.4':
      const restoreImgName = await ask('Enter image name: ');
      runCommand(`echo '📦 Restoring a specific Docker image from the all-images.tar archive (e.g.: npm run docker:restore-image -- web-dev)...' && node Scripts/restoreImage.js ${restoreImgName}`);
      await pause();
      break;
    case '12.5':
      runCommand(`echo '📋 Listing available backup files in the ./backups directory...' && node Scripts/listBackups.js`);
      await pause();
      break;
    case '12.6':
      runCommand(`echo '📋 Listing the raw contents of the all-images.tar archive...' && node Scripts/listBackupContents.js`);
      await pause();
      break;
    case '12.7':
      runCommand(`echo '🏷️ Showing a human-readable list of images in the all-images.tar archive...' && node Scripts/listBackupImageNames.js`);
      await pause();
      break;
    case '12.8':
      runCommand(`echo '💾 Saving running containers to Docker Hub...' && node Scripts/saveToDockerHub.js`);
      await pause();
      break;

    // ==================== 13. UTILITIES ====================
    case '13.1':
      runCommand(`echo 'Creating openssl certificates...' && node Scripts/generate-certs.js`);
      await pause();
      break;
    case '13.2':
      runCommand(`echo 'Run this in an Administrator terminal!' && node Scripts/generate-certs.js --elevated`);
      await pause();
      break;
    case '13.3': {
      const shellService = await ask('Enter service name: ');
      runCommand(`echo '🖥️  Opening shell in service container...' && ${dc} --profile dev exec "${shellService}"`);
      await pause();
      break;
    }
    case '13.4':
      runCommand(`echo 'Prints Project Folder Structure..' && node Scripts/pfs.js`);
      await pause();
      break;

    case '13.5':
      console.log('\x1b[31mWARNING: This will encrypt all .env files.\x1b[0m');
      const confirmEncrypt = await ask('Are you sure? Type "yes" to proceed: ');
      if (confirmEncrypt.toLowerCase() === 'yes') {
        runCommand(`echo 'Encrypting .env files...' && node Scripts/encryptenvfiles.js`);
      }
      await pause();
      break;
    case '13.6':
      console.log('\x1b[31mWARNING: This will decrypt all .env files.\x1b[0m');
      const confirmDecrypt = await ask('Are you sure? Type "yes" to proceed: ');
      if (confirmDecrypt.toLowerCase() === 'yes') {
        runCommand(`echo 'Decrypting .env files...' && node Scripts/decryptenvfiles.js`);
      }
      await pause();
      break;
    case '13.7':
      runCommand(`echo 'Creating PostIO container...' && node Scripts/createpostio.js`);
      await pause();
      break;
    case '13.8':
      runCommand(`echo 'Uninstalling Docker...' && node Scripts/uninstall-docker.js`);
      await pause();
      break;
    case '13.9':
      runCommand(`echo 'Generating a README.md file...' && npx @catmeow/readme-ai`);
      await pause();
      break;
    case '13.10': {
      // FIXED: Safely handle both standard CommonJS and ES Module default wrappers
      const inquirerModule = require('inquirer');
      const inquirer = inquirerModule.default || inquirerModule;

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'keyword',
          message: 'Enter keyword to search:'
        },
        {
          type: 'list',
          name: 'searchScope',
          message: 'Select search scope:',
          choices: [
            { name: '1. Search all files in history', value: 'all' },
            { name: '2. Search a specific file in history', value: 'specific' }
          ],
          when: (currAnswers) => currAnswers.keyword && currAnswers.keyword.trim() !== ''
        },
        {
          type: 'input',
          name: 'filePath',
          message: 'Enter file path(s) (space-separated for multiple, e.g., roadmap_progress.lst Docs/Roadmap_Environments.md):',
          when: (currAnswers) => currAnswers.searchScope === 'specific'
        }
      ]);

      const { keyword, searchScope, filePath } = answers;

      if (!keyword || keyword.trim() === '') {
        await pause();
        break;
      }

      const safeKeyword = keyword.replace(/"/g, '\\"');
      let fileDelimiter = '';
      if (searchScope === 'specific' && filePath && filePath.trim() !== '') {
        fileDelimiter = `-- ${filePath.trim()}`;
      }

      const isWindows = process.platform === 'win32';

      if (isWindows) {
        const gitBashPaths = [
          'C:\\Program Files\\Git\\git-bash.exe',
          'C:\\Program Files (x86)\\Git\\git-bash.exe',
        ];
        
        let gitBash = null;
        for (const p of gitBashPaths) {
          if (fs.existsSync(p)) { gitBash = p; break; }
        }
        
        if (gitBash) {
          const bashCmd = `git log -S"${safeKeyword}" --all -p --color=always ${fileDelimiter} | less -R -p "${safeKeyword}" && read -p "Press enter..."`;
          execSync(`start "" "${gitBash}" -c "${bashCmd.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
        } else {
          runCommand(`git -c color.ui=always log -S"${safeKeyword}" --all -p ${fileDelimiter} | less -R`);
        }
      } else {
        runCommand(`git -c color.ui=always log -S"${safeKeyword}" --all -p ${fileDelimiter} | less -R -p "${safeKeyword}"`);
      }

      await pause();
      break;
    }
    case '13.11': {
      const inquirer = (await import('inquirer')).default;
      const { target } = await inquirer.prompt({
        type: 'list',
        name: 'target',
        message: 'Select environment file to generate:',
        choices: [
          { name: 'Staging (.env.staging)',        value: { env: 'staging',     file: '.env.staging',  template: '.env.staging.template' } },
          { name: 'Production (.env.production)',  value: { env: 'production',  file: '.env.production',template: '.env.production.template' } },
          { name: 'Docker Dev (.env.docker)',      value: { env: 'docker',      file: '.env.docker',   template: '.env.docker.template' } },
          { name: 'Local Dev (.env.dev)',          value: { env: 'development', file: '.env.dev',      template: '.env.dev.template' } }
        ]
      });

      let cmd = `node Scripts/generate-env.js ${target.env} ${target.file}`;
      if (target.template) {
        cmd += ` --template ${target.template}`;
      }

      // Explicitly pass the current environment so GOOGLE_APPLICATION_CREDENTIALS is inherited
      execSync(cmd, {
        stdio: 'inherit',
        env: { ...process.env }
      });
      await pause();
      break;
    }
    case '13.12': {
      const inquirer = (await import('inquirer')).default;

      // One prompt only – choose the GitHub Environment
      const { targetEnv } = await inquirer.prompt({
        type: 'list',
        name: 'targetEnv',
        message: 'Which GitHub Environment should receive the variables?',
        choices: [
          { name: 'development', value: 'development' },
          { name: 'docker', value: 'docker' },
          { name: 'staging', value: 'staging' },
          { name: 'production', value: 'production' }   // typo fixed
        ]
      });

      // Automatically pick the matching .env file
      const envFileMap = {
        development: '.env.dev',
        docker:      '.env.docker',
        staging:     '.env.staging',
        production:  '.env.production'
      };
      const sourceFile = envFileMap[targetEnv];

      if (!sourceFile) {
        console.error(`\x1b[31mNo source file mapped for environment "${targetEnv}"\x1b[0m`);
        await pause();
        break;
      }

      console.log(`\x1b[36mUsing source file: ${sourceFile}\x1b[0m`);
      const cmd = `node Scripts/migrate-environments.js ${sourceFile} ${targetEnv}`;
      execSync(cmd, {
        stdio: 'inherit',
        env: { ...process.env }
      });
      await pause();
      break;
    }
    case '13.13':
      runCommand('node Scripts/migrate-to-gcp-secrets.js');
      await pause();
      break;

    case '13.14': {
      const repoOwner = process.env.GIT_REPO_USERNAME;
      const repoName = process.env.GIT_REPO_REPONAME;
      if (!repoOwner || !repoName) {
        console.log('\x1b[31mERROR: GIT_REPO_USERNAME and GIT_REPO_REPONAME must be set in .env.staging\x1b[0m');
        break;
      }
      const visibilityCommand = `gh repo edit ${repoOwner}/${repoName} --visibility private --accept-visibility-change-consequences`;
      runCommand(visibilityCommand);
      break;
    }
    case '13.15': 
      try {
        // 1. Check if gh is installed
        let ghExists = false;
        try {
          execSync('gh --version', { stdio: 'pipe', encoding: 'utf8' });
          ghExists = true;
        } catch (_) { /* not found */ }

        if (!ghExists) {
          console.log('\x1b[31mGitHub CLI (gh) is not installed or not in PATH.\x1b[0m');
          console.log('\x1b[33mInstall it from https://cli.github.com/\x1b[0m');
          await pause();
          break;
        }

        // 2. Check if GITHUB_TOKEN is set (prevents interactive login)
        if (process.env.GITHUB_TOKEN) {
          console.log('\x1b[33mℹ️  GITHUB_TOKEN is already set in your environment.\x1b[0m');
          console.log('\x1b[33m   gh will use it for authentication – no separate login needed.\x1b[0m');
          console.log('');
          console.log('\x1b[36m   If you still want to run "gh auth login" (e.g. to store credentials),\x1b[0m');
          console.log('\x1b[36m   the GITHUB_TOKEN must be temporarily unset.\x1b[0m');
          const choice = await ask('Do you want to temporarily unset GITHUB_TOKEN and proceed? (y/N): ');
          if (choice.toLowerCase() !== 'y') {
            console.log('\x1b[32mSkipping authentication – already authenticated via GITHUB_TOKEN.\x1b[0m');
            await pause();
            break;
          }
          // Proceed with clearing the variable for the subprocess
          console.log('\x1b[33mTemporarily unsetting GITHUB_TOKEN for the login session...\x1b[0m');
        }

        // 3. Run gh auth login with a custom environment (no GITHUB_TOKEN)
        console.log('\x1b[33mStarting GitHub CLI authentication...\x1b[0m');
        try {
          const envWithoutToken = { ...process.env };
          delete envWithoutToken.GITHUB_TOKEN;
          delete envWithoutToken.GITHUB_ENTERPRISE_TOKEN; // just in case
          execSync('gh auth login', { stdio: 'inherit', env: envWithoutToken });
          console.log('\x1b[32mGitHub CLI authenticated successfully.\x1b[0m');
        } catch (loginError) {
          // loginError could be user cancelled (Ctrl+C) or other failure
          if (loginError.signal === 'SIGINT') {
            console.log('\x1b[33mAuthentication cancelled.\x1b[0m');
          } else {
            console.log('\x1b[31mGitHub CLI authentication failed.\x1b[0m');
            console.log(`\x1b[31m${loginError.stderr || loginError.message}\x1b[0m`);
          }
        }
      } catch (unexpectedError) {
        console.log('\x1b[31mAn unexpected error occurred during GitHub authentication.\x1b[0m');
        console.log(`\x1b[31m${unexpectedError.message}\x1b[0m`);
      }
      await pause();
      break;

    // ==================== 14. DOCKER COMPOSE MANAGEMENT ====================
    case '14.1':
      runCommand('${dc} --env-file .env.docker down');
      await pause();
      break;
    case '14.2':
      runCommand(dc + ' --env-file .env.docker down -v');
      await pause();
      break;
    case '14.3':
      runCommand(dc + ' --env-file .env.docker down -v --rmi all');
      await pause();
      break;
    case '14.4':
      runCommand(dc + ' --env-file .env.docker down -v --rmi all');
      runCommand('docker system prune -a --volumes -f');
      await pause();
      break;
    case '14.5':
      runCommand('echo "Compiling..." && node Scripts/compile.js');
      await pause();
      break;

    // ==================== 15. BINARY DOCKER MANAGEMENT ====================
    case '15.1':
      console.log('\x1b[33mBuilding binary-based image...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml build');
      await pause();
      break;
    case '15.2':
      console.log('\x1b[33mStarting binary environment...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml up');
      await pause();
      break;
    case '15.3':
      console.log('\x1b[33mStarting binary environment (detached)...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml up -d');
      await pause();
      break;
    case '15.4':
      console.log('\x1b[33mStopping binary environment...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml down');
      await pause();
      break;
    case '15.5':
      console.log('\x1b[33mShowing binary environment logs...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml logs -f');
      await pause();
      break;
    case '15.6':
      console.log('\x1b[33mResetting binary environment (removing volumes)...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml down -v');
      await pause();
      break;
    case '13.16':
      console.log('\x1b[33mUpdating GITHUB_TOKEN in all .env files...\x1b[0m');
      runCommand('node Scripts/update-github-token.js');
      await pause();
      break;
    case '13.17':
      console.log('\x1b[36mGITHUB_TOKEN Setup Options:\x1b[0m');
      console.log('  1. Manual: Read GITHUB_TOKEN from .env file and set it automatically');
      console.log('  2. GitHub CLI: gh auth login (select personal account)');
      const tokenChoice = await ask('Select option (1 or 2): ');
      if (tokenChoice === '1') {
        console.log('\x1b[33mManual GITHUB_TOKEN setup from .env file:\x1b[0m');
        
        // Try to read GITHUB_TOKEN from .env.dev
        const envDevPath = path.join(__dirname, '..', '.env.dev');
        let token = '';
        
        if (fs.existsSync(envDevPath)) {
          const envContent = fs.readFileSync(envDevPath, 'utf8');
          const match = envContent.match(/^GITHUB_TOKEN=(.+)$/m);
          if (match) {
            token = match[1].trim();
            console.log(`\x1b[32mFound GITHUB_TOKEN in .env.dev\x1b[0m`);
            console.log(`\x1b[33mToken value: ${token}\x1b[0m`);
          }
        }
        
        if (!token) {
          token = await ask('GITHUB_TOKEN not found in .env.dev. Enter your GITHUB_TOKEN: ');
        }
        
        console.log('\x1b[36mUnsetting existing GITHUB_TOKEN environment variable...\x1b[0m');
        if (isWindows) {
          runCommand('set GITHUB_TOKEN=');
        } else {
          runCommand('unset GITHUB_TOKEN');
        }
        delete process.env.GITHUB_TOKEN;
        delete process.env.GITHUB_ENTERPRISE_TOKEN;
        
        // Validate that GITHUB_TOKEN is unset
        console.log('\x1b[36mValidating GITHUB_TOKEN is unset...\x1b[0m');
        if (process.env.GITHUB_TOKEN) {
          console.log('\x1b[31mWarning: GITHUB_TOKEN is still set in process environment. Clearing...\x1b[0m');
          delete process.env.GITHUB_TOKEN;
        }
        console.log('\x1b[32mGITHUB_TOKEN successfully unset.\x1b[0m');
        
        console.log('\x1b[36mSetting GITHUB_TOKEN for current session and verifying...\x1b[0m');
        // Check if running in Git Bash/MINGW64
        const isGitBash = process.env.MSYSTEM === 'MINGW64' || process.env.MSYSTEM === 'MINGW32';
        
        if (isWindows && !isGitBash) {
          // Windows cmd.exe
          runCommand(`setx GITHUB_TOKEN "${token}"`);
          console.log('\x1b[32mGITHUB_TOKEN saved for future sessions.\x1b[0m');
          runCommand(`cmd /c "set GITHUB_TOKEN=${token} && gh auth status"`);
        } else {
          // Git Bash/MINGW64 or Unix - use bash explicitly
          if (isWindows) {
            runCommand(`setx GITHUB_TOKEN "${token}"`);
            console.log('\x1b[32mGITHUB_TOKEN saved for future sessions.\x1b[0m');
            // Use bash explicitly for Git Bash
            runCommand(`bash -c 'GITHUB_TOKEN="${token}" gh auth status'`);
          } else {
            runCommand(`export GITHUB_TOKEN="${token}"`);
            console.log('\x1b[32mGITHUB_TOKEN set for current session.\x1b[0m');
            console.log('\x1b[33mNote: Add to ~/.bashrc or ~/.zshrc for persistence.\x1b[0m');
            runCommand(`GITHUB_TOKEN="${token}" gh auth status`);
          }
        }
        
        await pause();
      } else if (tokenChoice === '2') {
        console.log('\x1b[33mClearing existing GITHUB_TOKEN environment variable...\x1b[0m');
        if (isWindows) {
          // On Windows, we need to use set to clear it for the current session
          // Note: This only affects the current command prompt session
          runCommand('set GITHUB_TOKEN=');
          // Also clear it in the current process environment
          delete process.env.GITHUB_TOKEN;
          delete process.env.GITHUB_ENTERPRISE_TOKEN;
        } else {
          runCommand('unset GITHUB_TOKEN');
          delete process.env.GITHUB_TOKEN;
          delete process.env.GITHUB_ENTERPRISE_TOKEN;
        }
        console.log('\x1b[32mGITHUB_TOKEN cleared.\x1b[0m');
        
        console.log('\x1b[33mRunning gh auth login with web browser...\x1b[0m');
        runCommand('gh auth login --web');
        console.log('\x1b[36mVerifying authentication status...\x1b[0m');
        runCommand('gh auth status');
        await pause();
      } else {
        console.log('\x1b[31mInvalid option.\x1b[0m');
      }
      break;
    case '13.18':
      console.log('\x1b[36mDisplaying GitHub authentication status...\x1b[0m');
      runCommand('gh auth status');
      await pause();
      break;
    case '13.19':
      console.log('\x1b[36mDisplaying current GitHub token...\x1b[0m');
      console.log('\x1b[33mNote: This displays the token from the keyring (gh auth login).\x1b[0m');
      console.log('\x1b[33mIf you set GITHUB_TOKEN via environment variable, this will show the keyring token instead.\x1b[0m');
      
      // Clear GITHUB_TOKEN from environment to ensure we get the keyring token
      const envWithoutToken = { ...process.env };
      delete envWithoutToken.GITHUB_TOKEN;
      delete envWithoutToken.GITHUB_ENTERPRISE_TOKEN;
      
      try {
        const token = execSync('gh auth token', { 
          encoding: 'utf8',
          env: envWithoutToken,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        console.log('\x1b[32mKeyring token:\x1b[0m');
        console.log(token.trim());
      } catch (error) {
        console.error('\x1b[31mFailed to get keyring token. You may not be authenticated via gh auth login.\x1b[0m');
      }
      
      console.log('\x1b[33mTo regenerate a token, go to GitHub Settings → Developer Settings → Personal access tokens.\x1b[0m');
      await pause();
      break;
    case '13.20':
      console.log('\x1b[36mAttempting to list Classic PATs...\x1b[0m');
      console.log('\x1b[33mNote: GitHub does not provide a public API endpoint to list Classic PATs for security reasons.\x1b[0m');
      console.log('\x1b[33mClassic PATs can only be viewed through the GitHub web interface.\x1b[0m');
      console.log('\x1b[33mgh auth token (option 13.19) only displays OAuth tokens from keyring, not Classic PATs.\x1b[0m');
      console.log('');
      console.log('\x1b[31mTo view your Classic PATs, you must use the GitHub web interface:\x1b[0m');
      console.log('  https://github.com/settings/tokens');
      console.log('');
      console.log('\x1b[33mWould you like to open the GitHub Personal Access Tokens page in your browser? (y/N)\x1b[0m');
      const openBrowser = await ask('');
      if (openBrowser.toLowerCase() === 'y') {
        runCommand('start https://github.com/settings/tokens');
      }
      await pause();
      break;      
    case '13.21':
      console.log('\x1b[36mLaunching shell with venv activated...\x1b[0m');
      if (!fs.existsSync(venvPath)) {
        console.log('\x1b[31m✗ Virtual environment not found at: ' + venvPath + '\x1b[0m');
        await pause();
        break;
      }
      if (isWindows) {
        // cmd /k keeps the window open
        execSync(`start "Venv Shell" cmd /k "${path.join(venvPath, 'Scripts', 'activate.bat')}"`, { stdio: 'inherit' });
      } else {
        // Unix: use bash, but sourcing venv in bash normally closes if run directly.
        // Needs a shell that stays open. 'bash --rcfile' is good.
        const activateScript = path.join(venvPath, 'bin', 'activate');
        // Create a temporary init file that sources the venv and sets prompt
        const initFile = path.join(os.tmpdir(), 'venv_init.sh');
        fs.writeFileSync(initFile, `source "${activateScript}" && PS1="(venv) $PS1"`);
        execSync(`bash --rcfile "${initFile}"`, { stdio: 'inherit' });
        fs.unlinkSync(initFile);
      }
      await pause();
      break;
    case '13.22': {
      const venvPath2 = path.join(__dirname, '..', 'venv');
      let proceed = true;
      if (fs.existsSync(venvPath2)) {
        const confirm = await ask('venv already exists. Overwrite? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
          proceed = false;
        } else {
          // Remove old venv
          try {
            if (isWindows) {
              execSync(`rmdir /s /q "${venvPath2}"`);
            } else {
              execSync(`rm -rf "${venvPath2}"`);
            }
          } catch (err) {
            console.error('\x1b[31mFailed to remove existing venv:\x1b[0m', err.message);
            proceed = false;
          }
        }
      }
      if (proceed) {
        try {
          console.log('\x1b[36mCreating new venv...\x1b[0m');
          // Create in parent dir of Script, which is root
          execSync('python -m venv venv', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
          console.log('\x1b[32mvenv created successfully.\x1b[0m');
        } catch (err) {
          console.error('\x1b[31mFailed to create venv:\x1b[0m', err.message);
        }
      }
      await pause();
      break;
    }
    case '13.25':
      console.log('\x1b[33mSetting up / updating social media apps…\x1b[0m');
      runCommand('python manage.py setup_social_apps');
      await pause();
      break;
    case '13.26':
      console.log('\x1b[33mEnsuring social apps are up to date and validating…\x1b[0m');
      runCommand('python manage.py setup_social_apps');
      runCommand('python manage.py validate_social_secrets');
      await pause();
      break;
    case '13.27':
      console.log('\x1b[33mListing GCP secrets…\x1b[0m');
      runCommand(`gcloud secrets list --project=${process.env.GCP_PROJECT_ID}`);
      await pause();
      break;         
    case '13.28': {
      const inquirer = (await import('inquirer')).default;
      const { envName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'envName',
          message: 'Select environment to list GitHub variables:',
          choices: ['development', 'docker', 'staging', 'production']
        }
      ]);

      const repoFull = `${process.env.GIT_REPO_USERNAME}/${process.env.GIT_REPO_REPONAME}`;
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        console.error('\x1b[31mGITHUB_TOKEN is not set.\x1b[0m');
        await pause();
        break;
      }
      try {
        console.log(`\x1b[33mFetching GitHub Environment variables for ${envName}…\x1b[0m`);
        const result = execSync(
          `node Scripts/getGitHubVars.js ${repoFull} ${envName} ${token}`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        const variables = JSON.parse(result);
        if (!Array.isArray(variables) || variables.length === 0) {
          console.log(`\x1b[33mNo variables found for ${envName}.\x1b[0m`);
        } else {
          console.log(`\x1b[36mVariables (${variables.length}):\x1b[0m`);
          variables.forEach(v => {
            // Show full value – if you want to mask, shorten or hide here
            console.log(`  ${v.name} = ${v.value}`);
          });
        }
      } catch (e) {
        console.error(`\x1b[31mFailed to fetch GitHub variables: ${e.message}\x1b[0m`);
      }
      await pause();
      break;
    }

    // ==================== 16. STAGING CONTAINERS (now uses badminton-staging) ====================
    case '16.1':
      remoteDockerComposeUp('web-staging', '.env.staging', 'badminton-staging', 'staging');
      await pause();
      break;
    case '16.2':
      remoteDockerComposeUp('db-test', '.env.staging', 'badminton-staging', 'staging');
      await pause();
      break;
    case '16.3':
      remoteDockerComposeUp('redis', '.env.staging', 'badminton-staging', 'staging');
      await pause();
      break;
    case '16.4':
      remoteDockerComposeUp('mail-staging', '.env.staging', 'badminton-staging', 'staging');
      await pause();
      break;
    case '16.5':
      remoteDockerComposeUp('nginx-staging', '.env.staging', 'badminton-staging', 'staging');
      await pause();
      break;
    case '16.6':
      const vmIpStaging = process.env.GCP_VM_IP;
      const sshUserStaging = process.env.VM_SSH_USER;
      const sshKeyStaging = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
      // FIX: Use explicit docker-compose command on remote Linux VM and literal filename
      const remoteCmdStaging = [
        `cd /opt/badminton_court`,
        `sudo docker compose -p badminton-staging -f docker-compose.vm.yml --env-file .env.staging --profile staging up -d --force-recreate --remove-orphans`
      ].join(' && ');
      const sshCmdStaging = `ssh -i "${sshKeyStaging}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUserStaging}@${vmIpStaging} "${remoteCmdStaging}"`;
      console.log(`\x1b[36mRestarting all staging containers...\x1b[0m`);
      try {
        execSync(sshCmdStaging, { stdio: 'inherit' });
        console.log(`\x1b[32mAll staging containers started successfully.\x1b[0m`);
      } catch (err) {
        console.error(`\x1b[31mFailed to start staging containers: ${err.message}\x1b[0m`);
      }
      await pause();
      break;

    // ==================== 17. PRODUCTION CONTAINERS ====================
    case '17.1':
      remoteDockerComposeUp('web-production', '.env.production', 'badminton-production', 'production');
      await pause();
      break;
    case '17.2':
      remoteDockerComposeUp('db', '.env.production', 'badminton-production', 'production');
      await pause();
      break;
    case '17.3':
      remoteDockerComposeUp('redis', '.env.production', 'badminton-production', 'production');
      await pause();
      break;
    case '17.4':
      remoteDockerComposeUp('mail-production', '.env.production', 'badminton-production', 'production');
      await pause();
      break;
    case '17.5':
      console.log('\x1b[33mnginx-production is not yet configured.\x1b[0m');
      await pause();
      break;      
    case '17.6':
      const vmIpProd = process.env.GCP_VM_IP;
      const sshUserProd = process.env.VM_SSH_USER;
      const sshKeyProd = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
      // FIX: Use explicit docker-compose command on remote Linux VM and literal filename
      const remoteCmdProd = [
        `cd /opt/badminton_court`,
        `sudo docker compose -p badminton-production -f docker-compose.vm.yml --env-file .env.production --profile production up -d --force-recreate --remove-orphans`
      ].join(' && ');
      const sshCmdProd = `ssh -i "${sshKeyProd}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUserProd}@${vmIpProd} "${remoteCmdProd}"`;
      console.log(`\x1b[36mRestarting all production containers...\x1b[0m`);
      try {
        execSync(sshCmdProd, { stdio: 'inherit' });
        console.log(`\x1b[32mAll production containers started successfully.\x1b[0m`);
      } catch (err) {
        console.error(`\x1b[31mFailed to start production containers: ${err.message}\x1b[0m`);
      }
      await pause();
      break;      
 
    // ==================== 18. DELETE STAGING IMAGES (now uses badminton-staging) ====================
    case '18.1':
      remoteDeleteImage('web-staging', 'ghcr.io/xmione/badminton_court-web:latest', 'badminton-staging', '.env.staging', 'staging');
      await pause();
      break;
    case '18.2':
      remoteDeleteImage('db-test', 'postgres:14', 'badminton-staging', '.env.staging', 'staging');
      await pause();
      break;
    case '18.3':
      remoteDeleteImage('redis', 'redis:7-alpine', 'badminton-staging', '.env.staging', 'staging');
      await pause();
      break;
    case '18.4':
      remoteDeleteImage('mail-staging', 'analogic/poste.io', 'badminton-staging', '.env.staging', 'staging');
      await pause();
      break;
    case '18.5':
      remoteDeleteImage('nginx-staging', 'nginx:alpine', 'badminton-staging', '.env.staging', 'staging');
      await pause();
      break;
    case '18.6':
      remoteFullCleanup('badminton-staging', '.env.staging', 'staging');
      await pause();
      break;

    // ==================== 19. DELETE PRODUCTION IMAGES ====================
    case '19.1':
      remoteDeleteImage('web-production', 'ghcr.io/xmione/badminton_court-web:latest', 'badminton-production', '.env.production', 'production');
      await pause();
      break;
    case '19.2':
      remoteDeleteImage('db', 'postgres:14', 'badminton-production', '.env.production', 'production');
      await pause();
      break;
    case '19.3':
      remoteDeleteImage('redis', 'redis:7-alpine', 'badminton-production', '.env.production', 'production');
      await pause();
      break;
    case '19.4':
      remoteDeleteImage('mail-production', 'analogic/poste.io', 'badminton-production', '.env.production', 'production');
      await pause();
      break;
    case '19.5':
      console.log('\x1b[33mnginx-production is not yet configured.\x1b[0m');
      await pause();
      break;
    case '19.6':
      remoteFullCleanup('badminton-production', '.env.production', 'production');
      await pause();
      break;

    // ==================== 20. GCP VM MANAGEMENT ====================
    case '20.1':
      console.log('\x1b[31m⚠ WARNING: This will remove ALL Docker containers, images, volumes, and build cache on the VM.\x1b[0m');
      const confirmPrune = await ask('Are you absolutely sure? Type "yes" to confirm: ');
      if (confirmPrune === 'yes') {
        remoteDockerSystemPrune();
      } else {
        console.log('Cleanup cancelled.');
      }
      await pause();
      break;

    case '0':
      process.exit(0);
    default:
      console.log('\x1b[31mInvalid option.\x1b[0m');
      await pause();      
  }  
}  

async function showMenu() {
  while (true) {
    // if (isWindows) { runCommand('cls'); } else { runCommand('clear'); }

    console.log('\x1b[32mHumrine Site Management Menu\x1b[0m');
    console.log('\x1b[32m========================\x1b[0m');
    console.log('');
    console.log('\x1b[36m1. LOCAL DEVELOPMENT\x1b[0m');
    console.log('   1.1. Start local dev');
    console.log('   1.2. Start local dev (detached)');
    console.log('   1.3. Stop local dev');
    console.log('   1.4. Load local dev data');
    console.log('   1.5. Start dev tunnel');
    console.log('');
    console.log('\x1b[36m2. LOCAL CYPRESS TESTING\x1b[0m');
    console.log('   2.1. Open Cypress interactive');
    console.log('   2.2. Run Cypress (headed)');
    console.log('   2.3. Run Cypress (headless)');
    console.log('   2.4. Run Cypress for presentation (headed)');
    console.log('   2.5. Select Cypress test for presentation');
    console.log('   2.6. Post-process videos');
    console.log('   2.7. Run Cypress spec (headed)');
    console.log('');
    console.log('\x1b[36m3. DOCKER DEVELOPMENT ENVIRONMENT\x1b[0m');
    console.log('   3.1. Start dev environment');
    console.log('   3.2. Start dev (detached)');
    console.log('   3.3. Stop dev');
    console.log('   3.4. Show dev logs');
    console.log('   3.5. Restart web-dev');
    console.log('   3.6. Start dev with certs');
    console.log('   3.7. Reset and start dev');
    console.log('   3.8. Force recreate dev containers');
    console.log('');
    console.log('\x1b[36m4. DOCKER TESTING ENVIRONMENT\x1b[0m');
    console.log('   4.1. Start test environment');
    console.log('   4.2. Start test (detached)');
    console.log('   4.3. Stop test');
    console.log('   4.4. Show test logs');
    console.log('   4.5. Setup test data');
    console.log('');
    console.log('\x1b[36m5. DOCKER CYPRESS TESTING\x1b[0m');
    console.log('   5.1. Start Cypress container');
    console.log('   5.2. Open Cypress in container');
    console.log('   5.3. Run Cypress in container');
    console.log('   5.4. Stop Cypress container');
    console.log('   5.5. Run Cypress headed (new container)');
    console.log('   5.6. Run Cypress headless (new container)');
    console.log('   5.7. Run connectivity tests');
    console.log('   5.8. Install Cypress');
    console.log('   5.9. Clear Cypress cache');
    console.log('');
    console.log('\x1b[36m6. DOCKER PRESENTATION ENVIRONMENT\x1b[0m');
    console.log('   6.1. Select presentation test');
    console.log('   6.2. Post-process videos');
    console.log('   6.3. Run presentation spec');
    console.log('');
    console.log('\x1b[36m7. DOCKER TUNNEL MANAGEMENT\x1b[0m');
    console.log('   7.1. Build tunnel');
    console.log('   7.2. Build tunnel (no cache)');
    console.log('   7.3. Start tunnel');
    console.log('   7.4. Start tunnel (detached)');
    console.log('   7.5. Stop tunnel');
    console.log('   7.6. Show tunnel logs');
    console.log('');
    console.log('\x1b[36m8. DOCKER DATABASE MANAGEMENT\x1b[0m');
    console.log('   8.1. Run migrations');
    console.log('   8.2. Reset DB');
    console.log('   8.3. Reset DB with migrations');
    console.log('   8.4. Full DB reset with test data');
    console.log('');
    console.log('\x1b[36m9. DOCKER IMAGE MANAGEMENT\x1b[0m');
    console.log('   9.1. Build all images');
    console.log('   9.2. Build all (no cache)');
    console.log('   9.3. Build dev images');
    console.log('   9.4. Build dev (no cache)');
    console.log('   9.5. Build Cypress image');
    console.log('   9.6. Build Cypress (no cache)');
    console.log('   9.7. Build presentation images');
    console.log('   9.8. Build presentation (no cache)');
    console.log('');
    console.log('\x1b[36m10. DOCKER SYSTEM MANAGEMENT\x1b[0m');
    console.log('   10.1. Rebuild all');
    console.log('   10.2. Rebuild dev');
    console.log('   10.3. Rebuild test');
    console.log('   10.4. Rebuild presentation');
    console.log('   10.5. Show service logs');
    console.log('   10.6. Open shell in service');
    console.log('   10.7. Down & remove volumes - DESTRUCTIVE RESET');
    console.log('   10.8. Prune unused Docker resources');
    console.log('   10.9. Full reset (remove all) - DESTRUCTIVE RESET');
    console.log('   10.10. Full reset (keep images) - DESTRUCTIVE RESET');
    console.log('   10.11. Show service status');
    console.log('   \x1b[31mNote: Use 10.7-10.9 ONLY to fix corrupted environments.\x1b[0m');
    console.log('');
    console.log('\x1b[36m11. ADVANCED CLEANUP\x1b[0m');
    console.log('   11.1. Complete system prune');
    console.log('   11.2. Deep cleanup (restart Docker Desktop)');
    console.log('   11.3. Factory reset Docker Desktop');
    console.log('   11.4. Clean content store (fix blob errors)');
    console.log('   11.5. COMPLETE Docker reset');
    console.log('   11.6. Full reset and restart dev');
    console.log('');
    console.log('\x1b[36m12. BACKUP & RESTORE\x1b[0m');
    console.log('   12.1. Backup all images');
    console.log('   12.2. Restore all images');
    console.log('   12.3. Backup individual images');
    console.log('   12.4. Restore specific image');
    console.log('   12.5. List backups');
    console.log('   12.6. List backup contents');
    console.log('   12.7. List backup image names');
    console.log('   12.8. Save containers to Docker Hub');
    console.log('');
    console.log('\x1b[36m13. UTILITIES\x1b[0m');
    console.log('   13.1. Create SSL certs');
    console.log('   13.2. Create SSL certs (Admin)');
    console.log('   13.3. Open shell in service');
    console.log('   13.4. Print project structure');
    console.log('   13.5. Encrypt env files');
    console.log('   13.6. Decrypt env files');
    console.log('   13.7. Create PostIO container');
    console.log('   13.8. Uninstall Docker');
    console.log('   13.9. Generate README');
    console.log('   13.10. Search keyword in Git history');
    console.log('   13.11. Generate .env from GitHub/GCP');
    console.log('   13.12. Migrate to GitHub Environments');
    console.log('   13.13. Migrate to GCP Secret Manager');
    console.log('   13.14. Make the repository private');
    console.log('   13.15. Authenticate GitHub CLI (gh auth login)');
    console.log('   13.16. Update GITHUB_TOKEN in all .env files');
    console.log('   13.17. Set GITHUB_TOKEN (manual or gh auth)');
    console.log('   13.18. Display GitHub authentication status');
    console.log('   13.19. Display current GitHub token (if authenticated via gh)');
    console.log('   13.20. Open GitHub Personal Access Tokens page in browser');
    console.log('   13.21. Activate local venv shell');
    console.log('   13.22. Create/Recreate local venv');
    console.log('   13.25. Setup/Update social media apps');
    console.log('   13.26. Validate social media secrets');
    console.log('   13.27. List GCP secrets');
    console.log('   13.28. List GitHub Environment variables');
    console.log('');
    console.log('\x1b[36m14. DOCKER COMPOSE MANAGEMENT\x1b[0m');
    console.log('   14.1. Stop containers');
    console.log('   14.2. Remove containers & volumes');
    console.log('   14.3. Remove images');
    console.log('   14.4. System prune related objects');
    console.log('   14.5. Compile app into Linux binary');
    console.log('');
    console.log('\x1b[36m15. BINARY DOCKER MANAGEMENT\x1b[0m');
    console.log('   15.1. Build binary image');
    console.log('   15.2. Start binary env');
    console.log('   15.3. Start binary env (detached)');
    console.log('   15.4. Stop binary env');
    console.log('   15.5. Show binary env logs');
    console.log('   15.6. Reset binary env (remove volumes)');
    console.log('');
    console.log('\x1b[36m16. STAGING CONTAINERS (start/restart)\x1b[0m');
    console.log('   16.1. Web (web-staging)');
    console.log('   16.2. Database (db-test)');
    console.log('   16.3. Redis');
    console.log('   16.4. Mail');
    console.log('   16.5. Nginx (HTTPS)');
    console.log('   16.6. Start/Restart all staging containers');
    console.log('');
    console.log('\x1b[36m17. PRODUCTION CONTAINERS (start/restart)\x1b[0m');
    console.log('   17.1. Web (web-production)');
    console.log('   17.2. Database (db)');
    console.log('   17.3. Redis');
    console.log('   17.4. Mail');
    console.log('   17.5. Nginx (HTTPS – future)');
    console.log('   17.6. Start/Restart all production containers');
    console.log('');
    console.log('\x1b[36m18. DELETE STAGING IMAGES (stop container & remove image)\x1b[0m');
    console.log('   18.1. Web (web-staging)');
    console.log('   18.2. Database (db-test)');
    console.log('   18.3. Redis');
    console.log('   18.4. Mail');
    console.log('   18.5. Nginx (HTTPS)');
    console.log('   18.6. FULL CLEAN (containers, images, volumes, cache)');   
    console.log('');
    console.log('\x1b[36m19. DELETE PRODUCTION IMAGES (stop container & remove image)\x1b[0m');
    console.log('   19.1. Web (web-production)');
    console.log('   19.2. Database (db)');
    console.log('   19.3. Redis');
    console.log('   19.4. Mail');
    console.log('   19.5. Nginx (HTTPS – future)');
    console.log('   19.6. FULL CLEAN (containers, images, volumes, cache)');      
    console.log('');   
    console.log('\x1b[36m20. GCP VM MANAGEMENT\x1b[0m');
    console.log('   20.1. Full Docker system reset (⚠ DESTROYS everything)');
    console.log('');     
    console.log('\x1b[30m0. Exit\x1b[0m');

    const choice = await ask('Select option: ');
    try {
      await executeMenuOption(choice);
    } catch (err) {
      console.error('\x1b[31mUnexpected error:\x1b[0m', err.message);
      console.log('\x1b[33mPress Enter to return to the menu...\x1b[0m');
      await pause();
    }
  }
}

// ----- Main entry point with graceful handling of missing env vars -----
async function main() {
  // ----- Validate required environment variables (GitHub essentials) -----
  const requiredVars = [
    'GITHUB_TOKEN',
    'GIT_REPO_USERNAME',
    'GIT_REPO_REPONAME'
  ];

  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.error('\x1b[31mWARNING: Missing environment variables: ' + missingVars.join(', ') + '\x1b[0m');
    console.log('\x1b[33mThe menu will still launch, but some functions may fail.\x1b[0m');
    await pause();
  }

  // ---- Auto‑authenticate GCP via service account key (if available) ----
  if (process.env.GCP_SA_KEY_PATH) {
    const keyPath = path.isAbsolute(process.env.GCP_SA_KEY_PATH)
      ? process.env.GCP_SA_KEY_PATH
      : path.join(__dirname, '..', process.env.GCP_SA_KEY_PATH);
    if (fs.existsSync(keyPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
      console.log(`\x1b[32mUsing GCP service account: ${keyPath}\x1b[0m`);
      // Pause so you can see the message before the menu clears
      await pause();
    } else {
      console.log(`\x1b[33mGCP key file not found at ${keyPath}\x1b[0m`);
      await pause();
    }
  }

  // Normal operation
  const args = process.argv.slice(2);
  if (args.length > 0) {
    for (const choice of args) { await executeMenuOption(choice); }
    process.exit(0);
  } else {
    await showMenu();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
