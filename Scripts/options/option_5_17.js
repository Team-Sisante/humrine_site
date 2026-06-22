module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '📋 Showing test logs...' && ${dc} --env-file .env.docker --profile test logs -f`);
      await pause();
};
