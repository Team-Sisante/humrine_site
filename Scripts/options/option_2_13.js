module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🏷️ Showing a human-readable list of images in the all-images.tar archive...' && node Scripts/listBackupImageNames.js`);
      await pause();
};
