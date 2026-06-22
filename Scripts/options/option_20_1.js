module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
console.log('\x1b[31m⚠ WARNING: This will remove ALL Docker containers, images, volumes, and build cache on the VM.\x1b[0m');
      const confirmPrune = await ask('Are you absolutely sure? Type "yes" to confirm: ');
      if (confirmPrune === 'yes') {
        remoteDockerSystemPrune();
      } else {
        console.log('Cleanup cancelled.');
      }
      await pause();
};
