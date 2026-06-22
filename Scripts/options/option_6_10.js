module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '📦 Restoring all Docker images from a single archive (all-images.tar)...' && node Scripts/restoreImages.js`);
      await pause();
};
