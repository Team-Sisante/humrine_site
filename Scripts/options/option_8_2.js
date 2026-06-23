module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🔍 Opening Cypress in existing container...' && ${dc} --env-file .env.docker --profile test exec cypress open`);
      await pause();
};
