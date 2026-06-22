module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
{
        const sshKey = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
        const sshUser = process.env.VM_SSH_USER || 'xmione';
        const vmIp = process.env.GCP_VM_IP || '35.198.231.9';
        const cmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "sudo docker exec -u root humrine-web-staging chown -R appuser:appuser /app/data && sudo docker restart humrine-web-staging"`;
        console.log(`\x1b[33mFixing permissions on humrine-web-staging data volume and restarting…\x1b[0m`);
        runCommand(cmd);
      }
      await pause();
};
