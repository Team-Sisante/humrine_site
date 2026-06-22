module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🚀 Running docker migrations...' && ${dc} --env-file .env.docker --profile dev exec -T web-dev python manage.py migrate`);
};
