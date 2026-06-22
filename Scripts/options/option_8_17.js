module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🛑 Stopping docker tunnel...' && ${dc} --env-file .env.docker --profile dev --profile tunnel stop tunnel`);
      await pause();
};
