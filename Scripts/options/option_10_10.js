module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
runCommand(`echo '🔄 Resetting environment (keeping base images)...' && ${dc} --env-file .env.docker --profile dev down -v && docker-compose --env-file .env.docker --profile test down -v && docker-compose --env-file .env.docker --profile dev --profile presentation down -v && docker-compose --env-file .env.docker --profile dev --profile tunnel down -v && docker system prune -f --filter 'until=24h'`);
      await pause();
};
