module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🛑 Stopping Cypress container...' && ${dc} --env-file .env.docker --profile test stop cypress`);
      await pause();
};
