module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '📋 Showing tunnel logs...' && ${dc} --env-file .env.docker --profile dev --profile tunnel logs -f tunnel`);
      await pause();
      return;

    // ==================== 8. DOCKER DATABASE MANAGEMENT ====================
};
