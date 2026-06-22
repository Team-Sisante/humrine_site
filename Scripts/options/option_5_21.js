module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🐳 Rebuilding test services...' && ${dc} --env-file .env.docker --profile test down -v --rmi all && docker-compose --env-file .env.docker --profile test build`);
      await pause();
};
