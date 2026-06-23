module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo 'Uninstalling Docker...' && node Scripts/uninstall-docker.js`);
      await pause();
};
