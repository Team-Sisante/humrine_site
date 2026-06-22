module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '📦 Backing up all available Docker images into a single archive (all-images.tar)...' && node Scripts/backupImages.js`);
      await pause();
};
