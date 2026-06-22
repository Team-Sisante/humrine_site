module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
        const sshUser = process.env.VM_SSH_USER || 'xmione';
        const vmIp = process.env.GCP_VM_IP || '35.198.231.9';
        const cmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "sudo docker exec humrine-web-production python manage.py migrate"`;
        console.log(`\x1b[33mRunning migrations on humrine-web-production…\x1b[0m`);
        runCommand(cmd);
};
