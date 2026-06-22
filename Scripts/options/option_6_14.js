module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '📋 Listing the raw contents of the all-images.tar archive...' && node Scripts/listBackupContents.js`);
      await pause();
};
