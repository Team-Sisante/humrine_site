// Scripts/options/option_12_6.js  (humrine_site)
module.exports = async function(helpers) {
  const { runCommand, pause, path } = helpers;
  const { spawnSync } = require('child_process');
  const fs = require('fs');
  const dotenv = require('dotenv');

  // 1. Load environment files (same order as menu.js)
  const envCommon = path.resolve(process.cwd(), '.env.common');
  const envProduction = path.resolve(process.cwd(), '.env.production');
  if (fs.existsSync(envCommon)) dotenv.config({ path: envCommon, override: true });
  if (fs.existsSync(envProduction)) dotenv.config({ path: envProduction, override: true });

  // 2. Validate SSH connection (no defaults)
  const sshUser = process.env.VM_SSH_USER;
  const vmIp    = process.env.GCP_VM_IP;
  if (!sshUser || !sshUser.trim()) {
    throw new Error('CRITICAL: VM_SSH_USER is missing. Check .env.common / .env.production.');
  }
  if (!vmIp || !vmIp.trim()) {
    throw new Error('CRITICAL: GCP_VM_IP is missing. Check .env.common / .env.production.');
  }
  const sshKey = path.resolve(process.cwd(), '..', 'gocd-server', 'secrets', 'agent-key');

  // 3. Build export statements – only valid shell variable names
  const validNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const exportLines = [];
  for (const key of Object.keys(process.env)) {
    if (!validNameRegex.test(key)) continue;
    const value = process.env[key] || '';
    const escaped = value.replace(/'/g, `'\\''`);
    exportLines.push(`export ${key}='${escaped}'`);
  }

  // 4. Remote script – production profile
  console.log(`\x1b[33mStarting production containers on VM…\x1b[0m`);
  const script = `
${exportLines.join('\n')}

# Ensure PATH includes common locations
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/games

# Remove stale nginx container (ignore errors)
/usr/bin/sudo docker rm -f humrine_site-nginx-production 2>/dev/null || true

# Start all production services
cd /opt/humrine_site
/usr/bin/sudo -E docker compose -p humrine-production -f docker-compose.vm.yml --profile production up -d --remove-orphans --force-recreate
`.trim();

  // 5. Pipe the script into bash via stdin
  const sshArgs = [
    '-i', sshKey,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    `${sshUser}@${vmIp}`,
    'bash -s'
  ];
  const result = spawnSync('ssh', sshArgs, {
    stdio: ['pipe', 'inherit', 'inherit'],
    input: script,
    shell: false,
    encoding: 'utf8'
  });

  if (result.error) {
    console.error('\x1b[31mFailed to start production containers:\x1b[0m', result.error.message);
  } else if (result.status !== 0) {
    console.error(`\x1b[31mRemote command exited with code ${result.status}\x1b[0m`);
  } else {
    console.log('\x1b[32mAll production containers are up with live secrets.\x1b[0m');
  }

  await pause();
};