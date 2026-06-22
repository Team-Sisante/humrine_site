module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🐳 Completely rebuilding all services...' && ${dc} --env-file .env.docker --profile dev down -v --rmi all && docker-compose --env-file .env.docker --profile test down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile presentation down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile tunnel down -v --rmi all && echo '🐳 Building all service images...' && docker-compose --env-file .env.docker --profile dev --profile test --profile tunnel --profile presentation --progress=plain build`);
      await pause();
};
