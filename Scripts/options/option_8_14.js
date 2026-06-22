module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🐳 Building tunnel service (no cache)...' && ${dc} --env-file .env.docker --profile dev --profile tunnel --progress=plain build tunnel --no-cache`);
      await pause();
};
