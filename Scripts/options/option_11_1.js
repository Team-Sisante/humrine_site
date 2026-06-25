// Scripts/options/option_11_1.js  (humrine_site – staging DB fix)
module.exports = async function(helpers) {
  const { runCommand, pause, path } = helpers;
  const { spawnSync } = require('child_process');
  const fs = require('fs');
  const dotenv = require('dotenv');

  // 1. Load environment files (staging) – only the two .env files, no system pollution
  const envCommon = path.resolve(process.cwd(), '.env.common');
  const envStaging = path.resolve(process.cwd(), '.env.staging');
  const mergedVars = {};

  if (fs.existsSync(envCommon)) Object.assign(mergedVars, dotenv.parse(fs.readFileSync(envCommon, 'utf8')));
  if (fs.existsSync(envStaging)) Object.assign(mergedVars, dotenv.parse(fs.readFileSync(envStaging, 'utf8')));

  // 2. Validate SSH
  const sshUser = mergedVars.VM_SSH_USER;
  const vmIp    = mergedVars.GCP_VM_IP;
  if (!sshUser || !sshUser.trim()) throw new Error('VM_SSH_USER missing in env files');
  if (!vmIp    || !vmIp.trim())    throw new Error('GCP_VM_IP missing in env files');
  const sshKey = path.resolve(process.cwd(), '..', 'gocd-server', 'secrets', 'agent-key');

  // 3. Build clean env content from merged file variables only
  if (!mergedVars.IMAGE_TAG) mergedVars.IMAGE_TAG = 'latest';
  const envContent = Object.entries(mergedVars)
    .map(([key, val]) => `${key}=${val || ''}`)
    .join('\n');

  // 4. Remote script
  console.log(`\x1b[33mFixing staging permissions and restarting with clean env…\x1b[0m`);

  const script = `
export PATH=/usr/local/bin:/usr/bin:/bin

/usr/bin/sudo docker stop humrine-web-staging 2>/dev/null || true
/usr/bin/sudo docker rm humrine-web-staging 2>/dev/null || true
/usr/bin/sudo chown -R 1000:1000 /opt/humrine_site/data

/usr/bin/sudo tee /tmp/humrine_staging.env > /dev/null <<'EOF'
${envContent}
EOF

cd /opt/humrine_site
/usr/bin/sudo docker compose -p humrine-staging -f docker-compose.vm.yml --profile staging \\
    --env-file /tmp/humrine_staging.env up -d --remove-orphans --force-recreate --pull missing

/usr/bin/sudo rm -f /tmp/humrine_staging.env
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
    console.log('\x1b[32mStaging container restarted with clean environment.\x1b[0m');
  }
  await pause();
};