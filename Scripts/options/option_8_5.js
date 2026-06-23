module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🚀 Running Cypress tests (headed) in new container...' && ${dc} --env-file .env.docker --profile test run --rm cypress cypress run --headed`);
      await pause();
};
