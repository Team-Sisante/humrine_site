// Scripts/options/option_11_4.js
module.exports = async function (helpers) {
  const { runCommand, ask, pause, path } = helpers;
  const sshKey = path.resolve(process.cwd(), '..', 'gocd-server', 'secrets', 'agent-key');
  const sshUser = process.env.VM_SSH_USER || 'xmione';
  const vmIp = process.env.GCP_VM_IP || '35.198.231.9';
  const containerName = 'humrine-web-production';

  const confirm = await ask('⚠ This will create a full database backup on staging. Continue? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Backup cancelled.');
    await pause();
    return;
  }

  const cmd = `ssh -q -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "sudo docker exec ${containerName} /app/humrine_site_linux backup_db --output-dir=/app/data/backups"`;
  console.log('📦 Running database backup on staging...');
  runCommand(cmd);
};