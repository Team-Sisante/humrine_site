module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
runCommand(`echo '🔄 Resetting environment...' && ${dc} --env-file .env.docker --profile dev down -v --rmi all && docker-compose --env-file .env.docker --profile test down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile presentation down -v --rmi all && docker-compose --env-file .env.docker --profile dev --profile tunnel down -v --rmi all && docker system prune -f`);
      await pause();
};
