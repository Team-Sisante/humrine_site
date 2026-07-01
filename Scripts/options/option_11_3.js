// Scripts/options/option_11_3.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  const sshKey = path.resolve(process.cwd(), '..', 'gocd-server', 'secrets', 'agent-key');
  const sshUser = process.env.VM_SSH_USER || 'xmione';
  const vmIp = process.env.GCP_VM_IP || '35.198.231.9';

  // Load staging data (Django loaddata)
  const cmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "sudo docker exec humrine-web-staging sh -c \\"echo '📊 Loading staging data...' && /app/humrine_site_linux load_test_data\\""`;
  runCommand(cmd);
};
