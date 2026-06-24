// Scripts/options/option_14_1.js  (humrine_site – production DB fix)
module.exports = async function(helpers) {
  const { runCommand, pause, path } = helpers;
  const { spawnSync } = require('child_process');
  const fs = require('fs');
  const dotenv = require('dotenv');

  // 1. Load environment files
  const envCommon = path.resolve(process.cwd(), '.env.common');
  const envProduction = path.resolve(process.cwd(), '.env.production');
  if (fs.existsSync(envCommon))    dotenv.config({ path: envCommon, override: true });
  if (fs.existsSync(envProduction)) dotenv.config({ path: envProduction, override: true });

  // 2. Validate SSH
  const sshUser = process.env.VM_SSH_USER;
  const vmIp    = process.env.GCP_VM_IP;
  if (!sshUser || !sshUser.trim()) throw new Error('VM_SSH_USER missing');
  if (!vmIp    || !vmIp.trim())    throw new Error('GCP_VM_IP missing');
  const sshKey = path.resolve(process.cwd(), '..', 'gocd-server', 'secrets', 'agent-key');

  // 3. Build a clean .env file content (every variable from your local env)
  const validName = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const envLines = Object.entries(process.env)
    .filter(([k]) => validName.test(k) && !k.startsWith('npm_'))
    .map(([key, val]) => `${key}=${val || ''}`);

  if (!envLines.find(line => line.startsWith('IMAGE_TAG='))) {
    envLines.push('IMAGE_TAG=latest');
  }

  const envContent = envLines.join('\n');

  // 4. Remote script
  console.log(`\x1b[33mFixing production permissions and restarting with all env vars…\x1b[0m`);

  const script = `
export PATH=/usr/local/bin:/usr/bin:/bin

# Stop & remove broken container
/usr/bin/sudo docker stop humrine-web-production 2>/dev/null || true
/usr/bin/sudo docker rm humrine-web-production 2>/dev/null || true

# Fix ownership of the bind‑mounted data directory
/usr/bin/sudo chown -R 1000:1000 /opt/humrine_site/data

# Write the environment file temporarily on the VM
/usr/bin/sudo tee /tmp/humrine_production.env > /dev/null <<'EOF'
${envContent}
EOF

# Start the service using that env file – secrets are consumed, then file is deleted
cd /opt/humrine_site
/usr/bin/sudo docker compose -p humrine-production -f docker-compose.vm.yml --profile production \\
    --env-file /tmp/humrine_production.env up -d --remove-orphans --force-recreate --pull missing

/usr/bin/sudo rm -f /tmp/humrine_production.env
`.trim();

  const result = spawnSync('ssh', [
    '-i', sshKey,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    `${sshUser}@${vmIp}`,
    'bash -s'
  ], {
    stdio: ['pipe', 'inherit', 'inherit'],
    input: script,
    shell: false,
    encoding: 'utf8'
  });

  if (result.error) {
    console.error('\x1b[31mFailed:', result.error.message, '\x1b[0m');
  } else if (result.status !== 0) {
    console.error(`\x1b[31mExit code ${result.status}\x1b[0m`);
  } else {
    console.log('\x1b[32mProduction container started with all variables correctly injected.\x1b[0m');
  }
  await pause();
};