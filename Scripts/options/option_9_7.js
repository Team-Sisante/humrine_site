module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const vmIpStaging = process.env.GCP_VM_IP;
      const sshUserStaging = process.env.VM_SSH_USER;
      const sshKeyStaging = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
      const localEnvStaging = path.resolve(__dirname, '..', '.env.staging');
      const localEnvCommon = path.resolve(__dirname, '..', '.env.common');
      const containerNameStaging = 'badminton-staging-mail-staging-1';
      const volumeNameStaging = 'badminton-staging_poste_data_staging';

      console.log(`\x1b[33m⚠ WARNING: This will DELETE all staging mail data (mailboxes, domains, settings).\x1b[0m`);
      console.log(`\x1b[33m  Container: ${containerNameStaging}\x1b[0m`);
      console.log(`\x1b[33m  Volume:    ${volumeNameStaging}\x1b[0m`);
      const confirmStaging = await ask('Are you absolutely sure? Type "yes" to confirm: ');
      if (confirmStaging === 'yes') {
        console.log(`\x1b[36mWiping and recreating mail-staging volume...\x1b[0m`);
        try {
          // Step 1: Stop and remove the container, then remove the volume
          console.log(`\x1b[36mStep 1: Stopping container ${containerNameStaging}...\x1b[0m`);
          const wipeCmdStaging = [
            `sudo docker stop ${containerNameStaging} 2>/dev/null || true`,
            `sudo docker rm -f ${containerNameStaging} 2>/dev/null || true`,
            `sudo docker volume rm ${volumeNameStaging} 2>/dev/null || true`,
            `if sudo docker volume ls -q -f name=${volumeNameStaging} | grep -q .; then echo "WARNING: Volume ${volumeNameStaging} still exists — may be in use"; else echo "OK: Volume ${volumeNameStaging} removed"; fi`
          ].join(' && ');
          const wipeSshCmdStaging = `ssh -i "${sshKeyStaging}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUserStaging}@${vmIpStaging} "${wipeCmdStaging}"`;
          execSync(wipeSshCmdStaging, { stdio: 'inherit' });

          // Step 2: Load env vars locally and export them in the SSH session
          console.log(`\x1b[36mStep 2: Recreating mail-staging container with fresh volume...\x1b[0m`);
          const dotenv = require('dotenv');
          const commonEnv = dotenv.parse(fs.readFileSync(localEnvCommon, 'utf8'));
          const stagingEnv = dotenv.parse(fs.readFileSync(localEnvStaging, 'utf8'));
          const mergedEnv = { ...commonEnv, ...stagingEnv };

          const escapeShell = (val) => `'${String(val).replace(/'/g, `'\\''`)}'`;
          const exportLines = Object.entries(mergedEnv)
            .map(([key, val]) => `export ${key}=${escapeShell(val)}`)
            .join('; ');

          const remoteCmdStaging = [
            `cd /opt/badminton_court`,
            `${exportLines}`,
            `sudo -E docker compose -p badminton-staging -f docker-compose.vm.yml --profile staging up -d --force-recreate mail-staging`
          ].join(' && ');
          const sshCmdStaging = `ssh -i "${sshKeyStaging}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUserStaging}@${vmIpStaging} "${remoteCmdStaging.replace(/"/g, '\\"')}"`;
          execSync(sshCmdStaging, { stdio: 'inherit' });
          console.log(`\x1b[32mmail-staging container recreated with fresh volume.\x1b[0m`);
          console.log(`\x1b[33mWaiting 90 seconds for Poste.io to initialize...\x1b[0m`);
          for (let i = 90; i > 0; i--) {
            process.stdout.write(`\r\x1b[33m  Poste.io initializing: ${i}s remaining...\x1b[0m    `);
            try {
              execSync('sleep 1', { stdio: 'ignore' });
            } catch (e) {
              const start = Date.now();
              while (Date.now() - start < 1000) { /* busy wait */ }
            }
          }
          console.log('\r\x1b[32m✓ Poste.io initialization wait complete.          \x1b[0m');
        } catch (err) {
          console.error(`\x1b[31mFailed to wipe/recreate mail-staging: ${err.message}\x1b[0m`);
        }
      } else {
        console.log('\x1b[33mWipe cancelled.\x1b[0m');
      }
      await pause();
};
