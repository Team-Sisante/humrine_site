module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[33mResetting binary environment (removing volumes)...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml down -v');
      await pause();
};
