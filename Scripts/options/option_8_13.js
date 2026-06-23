module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🐳 Building tunnel service...' && ${dc} --env-file .env.docker --profile dev --profile tunnel --progress=plain build tunnel`);
      await pause();
};
