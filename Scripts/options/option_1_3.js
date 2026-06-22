module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🛑 Stopping local dev server development...' && node Scripts/stop-server.js`);
      await pause();
};
