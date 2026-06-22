module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🔄 Resetting database...' && node Scripts/reset-db-docker.js`);
      await pause();
};
