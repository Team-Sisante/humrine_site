module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🐳 Building Cypress service image...' && ${dc} --env-file .env.docker --profile test --progress=plain build cypress`);
      await pause();
};
