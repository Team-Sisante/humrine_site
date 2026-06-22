module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const containerName = 'mail-test';
      const volumeName = 'badminton_court_poste_data';

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
};
