module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '📋 Showing development logs...' && ${dc} --env-file .env.docker --profile dev logs -f`);
      await pause();
};
