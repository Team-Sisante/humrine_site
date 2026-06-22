module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🔧 Setting up test data...' && ${dc} --env-file .env.docker --profile test run --rm test-setup`);
      await pause();
};
