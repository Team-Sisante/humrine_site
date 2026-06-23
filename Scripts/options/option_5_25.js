module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🗑️  Stopping all services and removing volumes...' && ${dc} --env-file .env.docker --profile dev down -v`);
      await pause();
};
