module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🐳 Rebuilding dev services...' && ${dc} --env-file .env.docker --profile dev down -v --rmi all && docker-compose --env-file .env.docker --profile dev build`);
      await pause();
};
