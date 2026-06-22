module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const shellService = await ask('Enter service name: ');
      runCommand(`echo '🖥️  Opening shell in service container...' && ${dc} --profile dev exec "${shellService}"`);
      await pause();
};
