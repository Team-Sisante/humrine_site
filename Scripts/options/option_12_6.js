module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const vmIpProd = process.env.GCP_VM_IP;
      const sshUserProd = process.env.VM_SSH_USER;
      const sshKeyProd = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
      // FIX: Use explicit docker-compose command on remote Linux VM and literal filename
      const remoteCmdProd = [
        `cd /opt/badminton_court`,
        `sudo docker compose -p badminton-production -f docker-compose.vm.yml --env-file .env.production --profile production up -d --force-recreate --remove-orphans`
      ].join(' && ');
      const sshCmdProd = `ssh -i "${sshKeyProd}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUserProd}@${vmIpProd} "${remoteCmdProd}"`;
      console.log(`\x1b[36mRestarting all production containers...\x1b[0m`);
      try {
        execSync(sshCmdProd, { stdio: 'inherit' });
        console.log(`\x1b[32mAll production containers started successfully.\x1b[0m`);
      } catch (err) {
        console.error(`\x1b[31mFailed to start production containers: ${err.message}\x1b[0m`);
      }
      await pause();
};
