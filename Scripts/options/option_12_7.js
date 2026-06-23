module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const vmIpProd = process.env.GCP_VM_IP;
      const sshUserProd = process.env.VM_SSH_USER;
      const sshKeyProd = path.resolve(__dirname, '..', '..', 'gocd-server', 'secrets', 'agent-key');
      const localEnvProduction = path.resolve(__dirname, '..', '.env.production');
      const localEnvCommon = path.resolve(__dirname, '..', '.env.common');
      const containerNameProd = 'badminton-production-mail-production-1';
      const volumeNameProd = 'badminton-production_poste_data_production';

      console.log(`\x1b[33m⚠ WARNING: This will DELETE all PRODUCTION mail data (mailboxes, domains, settings).\x1b[0m`);
      console.log(`\x1b[33m  Container: ${containerNameProd}\x1b[0m`);
      console.log(`\x1b[33m  Volume:    ${volumeNameProd}\x1b[0m`);
      const confirmProd = await ask('Are you absolutely sure? Type "yes" to confirm: ');
      if (confirmProd === 'yes') {
        console.log(`\x1b[36mWiping and recreating mail-production volume...\x1b[0m`);
        try {
          // Step 1: Stop and remove the container, then remove the volume
          console.log(`\x1b[36mStep 1: Stopping container ${containerNameProd}...\x1b[0m`);
          const wipeCmdProd = [
            `sudo docker stop ${containerNameProd} 2>/dev/null || true`,
            `sudo docker rm -f ${containerNameProd} 2>/dev/null || true`,
            `sudo docker volume rm ${volumeNameProd} 2>/dev/null || true`,
            `if sudo docker volume ls -q -f name=${volumeNameProd} | grep -q .; then echo "WARNING: Volume ${volumeNameProd} still exists — may be in use"; else echo "OK: Volume ${volumeNameProd} removed"; fi`
          ].join(' && ');
          const wipeSshCmdProd = `ssh -i "${sshKeyProd}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUserProd}@${vmIpProd} "${wipeCmdProd}"`;
          execSync(wipeSshCmdProd, { stdio: 'inherit' });

          // Step 2: Load env vars locally and export them in the SSH session
          console.log(`\x1b[36mStep 2: Recreating mail-production container with fresh volume...\x1b[0m`);
          const dotenv = require('dotenv');
          const commonEnv = dotenv.parse(fs.readFileSync(localEnvCommon, 'utf8'));
          const productionEnv = dotenv.parse(fs.readFileSync(localEnvProduction, 'utf8'));
          const mergedEnv = { ...commonEnv, ...productionEnv };

          const escapeShell = (val) => `'${String(val).replace(/'/g, `'\\''`)}'`;
          const exportLines = Object.entries(mergedEnv)
            .map(([key, val]) => `export ${key}=${escapeShell(val)}`)
            .join('; ');

          const remoteCmdProd = [
            `cd /opt/badminton_court`,
            `${exportLines}`,
            `sudo -E docker compose -p badminton-production -f docker-compose.vm.yml --profile production up -d --force-recreate mail-production`
          ].join(' && ');
          const sshCmdProd = `ssh -i "${sshKeyProd}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUserProd}@${vmIpProd} "${remoteCmdProd.replace(/"/g, '\\"')}"`;
          execSync(sshCmdProd, { stdio: 'inherit' });
          console.log(`\x1b[32mmail-production container recreated with fresh volume.\x1b[0m`);
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
          console.error(`\x1b[31mFailed to wipe/recreate mail-production: ${err.message}\x1b[0m`);
        }
      } else {
        console.log('\x1b[33mWipe cancelled.\x1b[0m');
      }
      await pause();
};
