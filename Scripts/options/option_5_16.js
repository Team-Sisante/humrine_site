module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🛑 Stopping test services...' && ${dc} --env-file .env.docker --profile test down`);
      await pause();
};
