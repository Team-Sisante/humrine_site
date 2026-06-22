module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '📋 Listing available backup files in the ./backups directory...' && node Scripts/listBackups.js`);
      await pause();
};
