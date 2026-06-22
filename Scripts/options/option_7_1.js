module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🔧 Running database migrations in dev container...' && ${dc} --env-file .env.docker --profile dev exec -T web-dev python manage.py migrate`);
      await pause();
};
