module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🔄 Force recreating dev containers...' && ${dc} --env-file .env.docker --profile dev up -d --force-recreate`);
      await pause();
};
