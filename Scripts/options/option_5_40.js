module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[33mBuilding binary-based image...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml build');
      await pause();
};
