module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
// docker:dev-reset-and-start: rebuild-dev + certs:create + dev-detached + wait-for-ready + reset-db-migrate
      runCommand(
        `echo '🔄 Resetting dev environment and starting fresh...' && ` +
        `echo '🐳 Rebuilding dev services...' && ${dc} --env-file .env.docker --profile dev down -v --rmi all && docker-compose --env-file .env.docker --profile dev build && ` +
        `echo 'Creating openssl certificates...' && node Scripts/generate-certs.js && ` +
        `echo '🚀 Starting development environment (detached)...' && ${dc} --env-file .env.docker --profile dev up -d && ` +
        `node Scripts/wait-for-ready.js && ` +
        `echo '🔄 Resetting database with migrations...' && node Scripts/reset-db-docker.js --migrate`
      );
      await pause();
};
