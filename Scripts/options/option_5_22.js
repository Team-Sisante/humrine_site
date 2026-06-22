module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🐳 Rebuilding presentation services...' && ${dc} --env-file .env.docker --profile dev --profile presentation down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile presentation build`);
      await pause();
};
