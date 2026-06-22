module.exports = async function(helpers) {
  const { runCommand, ask, pause, execSync } = helpers;
  const containerName = 'mail-test';
    const volumeName = 'humrine_site_poste_data';

  console.log(`\x1b[33m⚠ WARNING: This will DELETE all dev mail data (mailboxes, domains, settings).\x1b[0m`);
  console.log(`\x1b[33m  Container: ${containerName}\x1b[0m`);
  console.log(`\x1b[33m  Volume:    ${volumeName}\x1b[0m`);
  const confirmWipe = await ask('Are you absolutely sure? Type "yes" to confirm: ');
  if (confirmWipe === 'yes') {
    console.log(`\x1b[36mWiping and recreating mail-test container + volume...\x1b[0m`);
    try {
      // Step 1: Stop and remove the container
      console.log(`\x1b[36mStep 1: Stopping container ${containerName}...\x1b[0m`);
      try {
        execSync(`docker rm -f ${containerName}`, { stdio: 'inherit' });
      } catch (e) {
        console.log(`\x1b[33mContainer removal note: ${e.message}\x1b[0m`);
      }

      // Step 2: Remove the volume with verification
      console.log(`\x1b[36mStep 2: Removing volume ${volumeName}...\x1b[0m`);
      const removeVolumeWithVerify = (attempt = 1) => {
        try {
          execSync(`docker volume rm -f ${volumeName}`, { stdio: 'inherit' });
        } catch (e) {
          console.log(`\x1b[33mVolume removal attempt ${attempt} failed: ${e.message}\x1b[0m`);
        }
        // Verify it's actually gone
        try {
          const checkResult = execSync(`docker volume ls -q -f name=${volumeName}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
          if (checkResult === '') {
            console.log(`\x1b[32m✓ Volume ${volumeName} confirmed removed (attempt ${attempt})\x1b[0m`);
            return true;
          } else if (attempt < 10) {
            console.log(`\x1b[33mVolume still exists (attempt ${attempt}/10), waiting 5s...\x1b[0m`);
            execSync('ping -n 6 127.0.0.1 >nul', { stdio: 'ignore' }); // ~5s wait on Windows
            return removeVolumeWithVerify(attempt + 1);
          } else {
            console.log(`\x1b[31mFATAL: Could not remove volume ${volumeName} after 10 attempts.\x1b[0m`);
            console.log(`\x1b[33mDocker Desktop may be holding a lock. Try:\x1b[0m`);
            console.log(`\x1b[33m  1. Quit Docker Desktop\x1b[0m`);
            console.log(`\x1b[33m  2. Restart Docker Desktop\x1b[0m`);
            console.log(`\x1b[33m  3. Run this option again\x1b[0m`);
            return false;
          }
        } catch (e) {
          console.log(`\x1b[32m✓ Volume ${volumeName} confirmed removed (attempt ${attempt})\x1b[0m`);
          return true;
        }
      };

      const volumeRemoved = removeVolumeWithVerify();
      if (!volumeRemoved) {
        await pause();
        return;
      }

      // Step 3: Recreate the container with a fresh volume
      console.log(`\x1b[36mStep 3: Recreating mail-test container with fresh volume...\x1b[0m`);
      execSync(`docker-compose --env-file .env.common --env-file .env.dev --profile dev up -d ${containerName}`, { stdio: 'inherit' });
      console.log(`\x1b[32mmail-test container recreated with fresh volume.\x1b[0m`);

      // Step 4: 90-second countdown for Poste.io initialization
      console.log(`\x1b[33mWaiting 90 seconds for Poste.io to initialize...\x1b[0m`);
      for (let i = 90; i > 0; i--) {
        process.stdout.write(`\r\x1b[33m  Poste.io initializing: ${i}s remaining...\x1b[0m    `);
        try {
          execSync('ping -n 2 127.0.0.1 >nul', { stdio: 'ignore' }); // ~1s wait on Windows
        } catch (e) {
          const start = Date.now();
          while (Date.now() - start < 1000) { /* busy wait */ }
        }
      }
      console.log('\r\x1b[32m✓ Poste.io initialization wait complete.          \x1b[0m');
      console.log(`\x1b[33mNote: Run the Cypress test to trigger the setup wizard (creates admin mailbox).\x1b[0m`);
    } catch (err) {
      console.error(`\x1b[31mFailed to wipe/recreate mail-test: ${err.message}\x1b[0m`);
    }
  } else {
    console.log('\x1b[33mWipe cancelled.\x1b[0m');
  }
  await pause();
};