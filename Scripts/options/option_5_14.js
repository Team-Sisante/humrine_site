module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🧪 Starting test environment...' && ${dc} --env-file .env.docker --profile test up`);
      await pause();
};
