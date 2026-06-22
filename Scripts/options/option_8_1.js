module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🚀 Starting Cypress container...' && ${dc} --env-file .env.docker --profile test up -d cypress`);
      await pause();
};
