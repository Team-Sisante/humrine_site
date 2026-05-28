#!/usr/bin/env node
/**
 * deploy.js – Unified staging / production deployment.
 *
 * Runs on the GoCD agent. Loads .env.docker from the repository root
 * before validating required variables. No external dependencies needed.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
const token = process.argv[3];
console.log(`target: ${target}`);

/**
 * Helper to warn, pause for user input, and exit.
 */
function waitAndExit(message) {
  console.error(`\x1b[31m${message}\x1b[0m`);
  console.log('\x1b[33mPress Enter to exit and stop the process...\x1b[0m');
  try {
    // Wait for Enter key (works in most environments)
    fs.readSync(0, Buffer.alloc(1), 0, 1);
  } catch (err) {
    // Fallback for non-interactive shells
    console.log('Non-interactive shell detected, exiting immediately.');
  }
  process.exit(1);
}

if (token) {
  const masked = token.length > 8
    ? token.substring(0, 4) + '...' + token.substring(token.length - 4)
    : '****';
  console.log(`Using GITHUB_TOKEN: ${masked}`);
} else {
  console.log('WARNING: GITHUB_TOKEN is not set in environment');
}

// ------------------------------------------------------------------
// Override GITHUB_TOKEN with the pipeline’s token so child processes use it
// ------------------------------------------------------------------
// Common SSH options – suppress host key prompts and post‑quantum KEX warnings
const SSH_OPTS = '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o KexAlgorithms=+diffie-hellman-group14-sha256';
const SCP_OPTS = SSH_OPTS;   // scp accepts the same options

if (!target || !token) {
  console.error('Usage: deploy.js staging|production <github_token>');
  process.exit(1);
}

// ------------------------------------------------------------------
// Load .env.docker from the repository (available via volume mount)
// ------------------------------------------------------------------
const envFilePath = path.join(__dirname, '..', '.env.docker');
if (fs.existsSync(envFilePath)) {
  const content = fs.readFileSync(envFilePath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const value = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
  console.log(`\x1b[36mLoaded .env.docker from ${envFilePath}\x1b[0m`);
} else {
  console.log('\x1b[33m.env.docker not found at ' + envFilePath + '\x1b[0m');
}

// ----- Validate required environment variables (no defaults) -----
const missing = [];
if (!process.env.GCP_PROJECT_ID) missing.push('GCP_PROJECT_ID');
if (!process.env.GCP_ZONE) missing.push('GCP_ZONE');
if (!process.env.GIT_REPO_USERNAME) missing.push('GIT_REPO_USERNAME');
if (!process.env.VM_SSH_USER) missing.push('VM_SSH_USER');

if (missing.length > 0) {
  let errorMsg = 'ERROR: The following required environment variables are missing:\n';
  missing.forEach(v => errorMsg += `  - ${v}\n`);
  errorMsg += '\nPlease ensure they are defined in .env.docker.';
  waitAndExit(errorMsg);
}

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GIT_REPO_USERNAME = process.env.GIT_REPO_USERNAME;
const SSH_USER = process.env.VM_SSH_USER;

process.env.GITHUB_TOKEN = token;

const config = {
  development: {
    env: 'development',       
    envFile: '.env.dev',    
    profile: 'development' 
  },
  docker: { 
    env: 'docker',  
    envFile: '.env.docker', 
    profile: 'docker' 
  },  
  staging: {
    env: 'staging',       
    envFile: '.env.staging',    
    profile: 'staging' 
  },
  production: { 
    env: 'production',  
    envFile: '.env.production', 
    profile: 'production' 
  }
};

const cfg = config[target];
if (!cfg) {
  console.error(`Unknown target: ${target}. Use staging or production.`);
  process.exit(1);
}

// Consistent project naming: humrine-<environment>
const projectName = `humrine-${cfg.env}`;
const composeFile = 'docker-compose.vm.yml';

process.chdir('/humrine_site');

// 1. Fix SSH key permissions
try {
  execSync('chmod 600 /secret/agent-key', { stdio: 'pipe' });
} catch (_) { /* ignore if chmod fails */ }

// 2. Generate environment file (with matching template)
const templateMap = {
  development: '.env.dev.template',
  docker: '.env.docker.template',
  staging: '.env.staging.template',
  production: '.env.production.template'
};
const templateFile = templateMap[target];
const templateArg = templateFile ? ` --template ${templateFile}` : '';
execSync(`node Scripts/generate-env.js ${cfg.env} ${cfg.envFile}${templateArg}`, { stdio: 'inherit' });

// ------------------------------------------------------------------
// Auto-sync: ensure the current VM IP is in ALLOWED_HOSTS and
// CSRF_TRUSTED_ORIGINS so Django accepts requests after VM recreation.
// ------------------------------------------------------------------
const vmIpForSync = process.env.GCP_VM_IP;
if (vmIpForSync && (target === 'staging' || target === 'production')) {
  let envContent = fs.readFileSync(cfg.envFile, 'utf8');
  let modified = false;

  // Ensure ALLOWED_HOSTS contains the VM IP
  const ahMatch = envContent.match(/^ALLOWED_HOSTS=(.*)$/m);
  if (ahMatch) {
    const rawValue = ahMatch[1].replace(/^["']|["']$/g, '');
    if (!rawValue.split(',').map(h => h.trim()).includes(vmIpForSync)) {
      const newValue = rawValue ? `${rawValue},${vmIpForSync}` : vmIpForSync;
      envContent = envContent.replace(/^ALLOWED_HOSTS=.*$/m, `ALLOWED_HOSTS="${newValue}"`);
      modified = true;
      console.log(`\x1b[32mAuto-added ${vmIpForSync} to ALLOWED_HOSTS\x1b[0m`);
    }
  }

  // Ensure CSRF_TRUSTED_ORIGINS contains https://<VM_IP>:<HTTPS_PORT>
  const portMatch = envContent.match(/^WEB_HTTPS_PORT=(.+)$/m);
  const httpsPort = portMatch ? portMatch[1].replace(/['"]/g, '').trim() : '';
  if (httpsPort) {
    const csrfOrigin = `https://${vmIpForSync}:${httpsPort}`;
    const csrfMatch = envContent.match(/^CSRF_TRUSTED_ORIGINS=(.*)$/m);
    if (csrfMatch) {
      const rawCsrf = csrfMatch[1].replace(/^["']|["']$/g, '');
      if (!rawCsrf.split(',').map(o => o.trim()).includes(csrfOrigin)) {
        const newCsrf = rawCsrf ? `${rawCsrf},${csrfOrigin}` : csrfOrigin;
        envContent = envContent.replace(/^CSRF_TRUSTED_ORIGINS=.*$/m, `CSRF_TRUSTED_ORIGINS="${newCsrf}"`);
        modified = true;
        console.log(`\x1b[32mAuto-added ${csrfOrigin} to CSRF_TRUSTED_ORIGINS\x1b[0m`);
      }
    }
  }

  if (modified) {
    fs.writeFileSync(cfg.envFile, envContent);
    console.log(`\x1b[32mUpdated ${cfg.envFile} with current VM IP\x1b[0m`);
  }
}

// Safety check: Ensure no placeholders leaked into the environment file
const generatedEnvContent = fs.readFileSync(cfg.envFile, 'utf8');
if (generatedEnvContent.includes('<?var?>') || generatedEnvContent.includes('<?secret?>')) {
  waitAndExit(`ERROR: ${cfg.envFile} contains unresolved placeholders (<?var?> or <?secret?>). Please check GitHub Environments and GCP Secret Manager.`);
}

// 3. Setup nginx if the template and certificates exist
let useNginx = false;
if (target === 'staging' || target === 'production') {
  const nginxTemplatePath = 'nginx-staging.conf.template';
  if (fs.existsSync(nginxTemplatePath)) {
    // Check for certificates directory (must be pre‑generated and committed)
    const certsDir = 'certs';
    if (!fs.existsSync(certsDir) || !fs.existsSync(path.join(certsDir, 'posteio-cert.pem'))) {
      waitAndExit(`ERROR: nginx is enabled for ${target} but the certs/ directory (with posteio-cert.pem) is missing.\nPlease run "node Scripts/generate-certs.js" first and commit the resulting certs/ folder.`);
    }

    // Read the real WEB_HTTPS_PORT from the freshly generated .env file
    const portMatch = generatedEnvContent.match(/^WEB_HTTPS_PORT=(.+)$/m);
    // Strict lookup: generated .env -> .env.docker (process.env)
    const webHttpsPort = portMatch ? portMatch[1].replace(/"/g, '').trim() : process.env.WEB_HTTPS_PORT;
    
    if (!webHttpsPort) {
      waitAndExit(`ERROR: WEB_HTTPS_PORT is not defined in ${cfg.envFile} or environment.`);
    }

    const nginxTemplate = fs.readFileSync(nginxTemplatePath, 'utf8');
    const webBackendService = `web-${target}`;
    const nginxConf = nginxTemplate
      .replace(/__WEB_HTTPS_PORT__/g, webHttpsPort)
      .replace(/__BACKEND_SERVICE__/g, webBackendService);
    
    const nginxConfFile = `nginx-${target}.conf`;
    fs.writeFileSync(nginxConfFile, nginxConf);
    console.log(`\x1b[32mGenerated ${nginxConfFile} with port ${webHttpsPort}\x1b[0m`);
    useNginx = true;

    // Ensure the HTTPS firewall rule exists for the correct port (idempotent)
    if (GCP_PROJECT_ID) {
      const ruleName = `allow-web-https-${target}`;
      const targetTag = process.env.GCP_VM_NAME;
      if (!targetTag) {
        waitAndExit('ERROR: GCP_VM_NAME is not defined in environment (expected e.g., "gocd-deploy-target").');
      }

      console.log(`Ensuring firewall rule ${ruleName} for port ${webHttpsPort} on tag ${targetTag}...`);
      try {
        // Check existing rule port
        const existingPort = execSync(
          `gcloud compute firewall-rules describe ${ruleName} --project=${GCP_PROJECT_ID} --format="value(allowed[0].ports)"`,
          { stdio: 'pipe', encoding: 'utf8' }
        ).trim();
        if (existingPort === webHttpsPort) {
          console.log(`Firewall rule ${ruleName} already exists for port ${webHttpsPort}.`);
        } else {
          console.log(`Firewall rule exists but for port ${existingPort} instead of ${webHttpsPort}. Deleting and recreating...`);
          execSync(`gcloud compute firewall-rules delete ${ruleName} --project=${GCP_PROJECT_ID} --quiet`, { stdio: 'inherit' });
          throw new Error('recreate');
        }
      } catch (e) {
        // Rule doesn't exist or was deleted – create it
        console.log(`Creating firewall rule ${ruleName} for port ${webHttpsPort}...`);
        execSync(
          `gcloud compute firewall-rules create ${ruleName} ` +
          `--project=${GCP_PROJECT_ID} ` +
          `--direction=INGRESS --priority=1000 ` +
          `--network=default --action=ALLOW ` +
          `--rules=tcp:${webHttpsPort} ` +
          `--source-ranges=0.0.0.0/0 ` +
          `--target-tags=${targetTag}`,
          { stdio: 'inherit' }
        );
      }
    }
  } else {
    console.log('\x1b[33mnginx-staging.conf.template not found – skipping HTTPS setup.\x1b[0m');
    console.log(`\x1b[33m${target} will be available via HTTP only.\x1b[0m`);
  }
}

// 4. Ensure Unix line endings on compose file
execSync(`sed -i 's/\\r$//' ${composeFile}`, { stdio: 'inherit' });

// 5. Get VM IP
const vmIP = process.env.GCP_VM_IP;
if (!vmIP) {
  waitAndExit('ERROR: GCP_VM_IP is not set in environment.');
}

// ------------------------------------------------------------------
// 6. Ensure Docker daemon DNS & MTU are correctly configured (idempotent)
//    Also perform a pre‑deploy health check to avoid TLS timeouts
// ------------------------------------------------------------------
const DOCKER_CONF = '{"dns":["8.8.8.8"],"mtu":1460}';
try {
  const currentConf = execSync(
    `ssh -i /secret/agent-key ${SSH_OPTS} -o LogLevel=ERROR ${SSH_USER}@${vmIP} "cat /etc/docker/daemon.json 2>/dev/null || echo ''"`,
    { encoding: 'utf8', stdio: 'pipe' }
  ).trim();

  if (currentConf !== DOCKER_CONF) {
    console.log('Configuring Docker daemon DNS and MTU on VM...');
    execSync(
      `ssh -i /secret/agent-key ${SSH_OPTS} ${SSH_USER}@${vmIP} ` +
      `"sudo bash -c 'echo \\'${DOCKER_CONF}\\' > /etc/docker/daemon.json && systemctl restart docker'"`,
      { stdio: 'inherit' }
    );
  }
} catch (e) {
  console.log(`\x1b[33mWarning: Failed to verify/configure Docker daemon: ${e.message}\x1b[0m`);
}

// ------------------------------------------------------------------
// Pre‑deploy health check: verify system load
// ------------------------------------------------------------------
console.log('Running pre‑deploy health checks...');
const healthCheckResult = execSync(
  `ssh -i /secret/agent-key ${SSH_OPTS} -o LogLevel=ERROR ${SSH_USER}@${vmIP} ` +
  `"sudo bash -c '` +
    `load=$(awk \"{print \\\\$1}\" /proc/loadavg); ` +
    `echo \"LOAD=\\$load\"'` +
  `"`,
  { encoding: 'utf8', stdio: 'pipe' }
).trim();
console.log(`  VM health: ${healthCheckResult}`);

const loadMatch = healthCheckResult.match(/LOAD=([0-9.]+)/);
const systemLoad = loadMatch ? parseFloat(loadMatch[1]) : 0;

if (systemLoad > 2.0) {
  console.log(`\x1b[33mWarning: System load is ${systemLoad}, which may cause timeouts. Consider stopping heavy processes before deploying.\x1b[0m`);
}
console.log('\x1b[32mPre‑deploy health checks passed.\x1b[0m');

// ------------------------------------------------------------------
// Check ghcr.io connectivity before deployment
// ------------------------------------------------------------------
console.log('Checking ghcr.io connectivity...');
try {
  execSync(`ssh -i /secret/agent-key ${SSH_OPTS} ${SSH_USER}@${vmIP} "curl -v --connect-timeout 10 https://ghcr.io/v2/ 2>&1 | head -20"`, { stdio: 'inherit' });
  console.log('\x1b[32mghcr.io is reachable.\x1b[0m');
} catch (e) {
  console.error('\x1b[31mghcr.io is unreachable. Deployment aborted to prevent using stale cached images.\x1b[0m');
  console.error('\x1b[33mRetry the deployment when network connectivity is restored.\x1b[0m');
  process.exit(1);
}

// ------------------------------------------------------------------
// Prepare VM directory (fix ownership so SCP can create subdirs)
// ------------------------------------------------------------------
console.log('Preparing deployment directory on VM...');
execSync(`ssh -i /secret/agent-key ${SSH_OPTS} ${SSH_USER}@${vmIP} "sudo mkdir -p /opt/humrine_site/certs /opt/humrine_site/Scripts && sudo chown -R ${SSH_USER}:${SSH_USER} /opt/humrine_site"`, { stdio: 'inherit' });

// 7. Copy files to VM
console.log('Copying deployment files to VM...');
const scpBase = `scp -i /secret/agent-key ${SSH_OPTS}`;
const vmDest = `${SSH_USER}@${vmIP}:/opt/humrine_site/`;

// Copy env file and compose file
execSync(`${scpBase} ${cfg.envFile} ${composeFile} ${vmDest}`, { stdio: 'inherit' });

// Copy nginx config and certs if using HTTPS
if (useNginx) {
  const nginxConfFile = `nginx-${target}.conf`;
  execSync(`${scpBase} ${nginxConfFile} ${vmDest}`, { stdio: 'inherit' });
  console.log('Copying pre‑generated certs/ directory to VM...');
  execSync(`${scpBase} -r certs ${vmDest}`, { stdio: 'inherit' });
}

// 8. Verify files
console.log('Verifying uploaded files…');
let verifyFiles = `ls -la /opt/humrine_site/${composeFile} /opt/humrine_site/${cfg.envFile}`;
if (useNginx) {
  const nginxConfFile = `nginx-${target}.conf`;
  verifyFiles += ` /opt/humrine_site/${nginxConfFile} /opt/humrine_site/certs/posteio-cert.pem /opt/humrine_site/certs/posteio-key.pem`;
}
const verifyCmd = `ssh -i /secret/agent-key ${SSH_OPTS} ${SSH_USER}@${vmIP} "${verifyFiles} && head -5 /opt/humrine_site/${composeFile}"`;
execSync(verifyCmd, { stdio: 'inherit' });

// 9. Deploy – login using piped token (no file on remote, no token in logs)
console.log('Logging into ghcr.io and deploying...');
const tokenFile = '/tmp/gh_token';
fs.writeFileSync(tokenFile, token, { mode: 0o600 });

const deployCmd = [
  `sudo docker compose -p ${projectName} -f /opt/humrine_site/${composeFile} --env-file /opt/humrine_site/${cfg.envFile} --profile ${cfg.profile} down --remove-orphans`,
  `sudo docker compose -p ${projectName} -f /opt/humrine_site/${composeFile} --env-file /opt/humrine_site/${cfg.envFile} --profile ${cfg.profile} up -d --pull always --remove-orphans`
].join(' ; ');

const fullRemote = `sudo docker login ghcr.io -u ${GIT_REPO_USERNAME} --password-stdin && ${deployCmd}`;

let success = false;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    if (attempt > 1) console.log(`\x1b[33mRetry attempt ${attempt}/3...\x1b[0m`);
    execSync(`ssh -i /secret/agent-key ${SSH_OPTS} -o LogLevel=ERROR ${SSH_USER}@${vmIP} "${fullRemote.replace(/"/g, '\\"')}" < ${tokenFile}`, { stdio: 'inherit' });
    success = true;
    break;
  } catch (e) {
    console.error(`\x1b[31mDeployment attempt ${attempt} failed: ${e.message}\x1b[0m`);
    if (attempt < 3) {
      console.log('Waiting 10 seconds before retrying...');
      execSync('sleep 10', { stdio: 'inherit' });
    }
  }
}

// Cleanup token file
try { fs.unlinkSync(tokenFile); } catch (_) { }

if (success) {
  console.log('\x1b[32m✓ Deployment completed successfully.\x1b[0m');
  console.log('\x1b[36mNote: Connectivity validation is now handled by Cypress tests.\x1b[0m');
} else {
  waitAndExit(`Failed to deploy ${target} after 3 attempts.`);
}