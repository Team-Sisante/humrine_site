module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[33mPerforming complete system cleanup...\x1b[0m');
      runCommand('docker system prune -a --volumes -f');
      await pause();
};
