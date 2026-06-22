module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🔄 COMPLETE Docker reset (fixes content store corruption)...' && node Scripts/docker-desktop-reset.js`);
      await pause();
};
