module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🔄 Full database reset with test data...' && node Scripts/reset-db-docker.js --migrate --load-test-data`);
      await pause();
};
