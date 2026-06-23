module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🧹 Cleaning up unused Docker resources...' && docker system prune -f`);
      await pause();
};
