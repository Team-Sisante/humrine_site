// Scripts/options/option_9_6.js  (humrine_site)
module.exports = async function(helpers) {
  const { runCommand, pause, path } = helpers;
  const { spawnSync } = require('child_process');
  const fs = require('fs');
  const dotenv = require('dotenv');

  // 1. Load environment files
  const envCommon = path.resolve(process.cwd(), '.env.common');
  const envStaging = path.resolve(process.cwd(), '.env.staging');
  if (fs.existsSync(envCommon)) dotenv.config({ path: envCommon, override: true });
  if (fs.existsSync(envStaging)) dotenv.config({ path: envStaging, override: true });

  // 2. Validate SSH (no defaults)
  const sshUser = process.env.VM_SSH_USER;
  const vmIp    = process.env.GCP_VM_IP;
  if (!sshUser || !sshUser.trim()) throw new Error('VM_SSH_USER missing');
  if (!vmIp    || !vmIp.trim())    throw new Error('GCP_VM_IP missing');
  const sshKey = path.resolve(process.cwd(), '..', 'gocd-server', 'secrets', 'agent-key');

  // 3. Collect all valid environment variables
  const validName = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const envVars = [];
  for (const key of Object.keys(process.env)) {
    if (!validName.test(key)) continue;
    const val = process.env[key] || '';
    envVars.push({ key, val });
  }

  // 4. Build the remote script
  console.log(`\x1b[33mStarting staging containers on VM…\x1b[0m`);

  // Build the sudo command with all env vars inline
  const sudoEnv = envVars.map(({ key, val }) => {
    const escaped = val.replace(/'/g, `'\\''`);
    return `${key}='${escaped}'`;
  }).join(' \\\n  ');

  const script = `
export PATH=/usr/local/bin:/usr/bin:/bin

/usr/bin/sudo docker rm -f humrine_site-nginx-staging 2>/dev/null || true

cd /opt/humrine_site
/usr/bin/sudo \\
  ${sudoEnv} \\
  docker compose -p humrine-staging -f docker-compose.vm.yml --profile staging up -d --remove-orphans --force-recreate
`.trim();

  // 5. Pipe the script into remote bash
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
    console.log('\x1b[32mAll staging containers are up.\x1b[0m');
  }
  await pause();
};