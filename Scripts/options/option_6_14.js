module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🐳 Building presentation service images (no cache)...' && ${dc} --env-file .env.docker --profile dev --profile presentation --progress=plain build --no-cache`);
      await pause();
      return;

    // ==================== 10. DOCKER SYSTEM MANAGEMENT ====================
};
