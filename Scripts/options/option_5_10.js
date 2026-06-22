module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🔄 Restarting web-dev container...' && ${dc} --env-file .env.docker --profile dev restart web-dev`);
      await pause();
};
