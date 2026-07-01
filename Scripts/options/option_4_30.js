// Scripts/options/option_4_30.js

const dotenv = require('dotenv');
const path = require('path');

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path: _path, isWindows, sleep, os } = helpers;
  console.log('\x1b[33mSetting up / updating social media apps…\x1b[0m');

  // ------------------------------------------------------------
  // 1. Prompt for the target environment
  // ------------------------------------------------------------
  const { default: inquirer } = await import('inquirer');
  const { target } = await inquirer.prompt([
    {
      type: 'list',
      name: 'target',
      message: 'Select the environment to set up/update social media apps:',
      choices: [
        { name: 'Localhost', value: 'local' },
        { name: 'Badminton Court - Staging', value: 'badminton-staging' },
        { name: 'Badminton Court - Production', value: 'badminton-production' },
        { name: 'Humrine Site - Staging', value: 'humrine-staging' },
        { name: 'Humrine Site - Production', value: 'humrine-production' },
      ],
    },
  ]);

  // ------------------------------------------------------------
  // 2. Load environment files (.env.common + target-specific)
  // ------------------------------------------------------------
  const projectRoot = _path.resolve(__dirname, '..', '..'); // assuming script is in Scripts/options/
  const commonEnv = _path.join(projectRoot, '.env.common');
  const envMapping = {
    'local-dev': '.env.dev',
    'local-docker': '.env.docker',
    'badminton-staging': '.env.staging',
    'badminton-production': '.env.production',
    'humrine-staging': '.env.staging',
    'humrine-production': '.env.production',
  };
  const targetEnvFile = envMapping[target];
  const targetEnvPath = _path.join(projectRoot, targetEnvFile);

  // Load .env.common first (always)
  if (fs.existsSync(commonEnv)) {
    dotenv.config({ path: commonEnv });
    console.log(`\x1b[32mLoaded ${commonEnv}\x1b[0m`);
  } else {
    console.warn(`\x1b[33mWarning: ${commonEnv} not found – skipping.\x1b[0m`);
  }

  // Then load the target‑specific env file (overrides common variables)
  if (fs.existsSync(targetEnvPath)) {
    dotenv.config({ path: targetEnvPath });
    console.log(`\x1b[32mLoaded ${targetEnvPath}\x1b[0m`);
  } else {
    console.warn(`\x1b[33mWarning: ${targetEnvPath} not found – skipping.\x1b[0m`);
  }

  // ------------------------------------------------------------
  // 3. Execute the appropriate command
  // ------------------------------------------------------------
  if (target === 'local') {
    // Local: run management command in the current venv
    runCommand('python manage.py setup_social_apps');
  } else {
    // Remote: run the compiled binary inside the target container via SSH
    const containers = {
      'badminton-staging': 'badminton-staging-web-staging-1',
      'badminton-production': 'badminton-production-web-production-1',
      'humrine-staging': 'humrine-web-staging',
      'humrine-production': 'humrine-web-production',
    };
    const container = containers[target];
    const remoteCmd = `sudo docker exec ${container} /app/badminton_court_linux setup_social_apps`;
    const SSH_OPTS = '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o KexAlgorithms=+diffie-hellman-group14-sha256 -o LogLevel=ERROR';
    const sshKey = _path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
    // Use the environment variables that were just loaded (or fallback to process.env)
    const sshUser = process.env.VM_SSH_USER || 'your-default-user';
    const gcpIp = process.env.GCP_VM_IP || 'your-default-ip';
    const sshCmd = `ssh -i "${sshKey}" ${SSH_OPTS} ${sshUser}@${gcpIp} "${remoteCmd}"`;
    runCommand(sshCmd);
  }
};