module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🛑 Stopping development services...' && ${dc} --env-file .env.docker --profile dev down`);
      await pause();
};
