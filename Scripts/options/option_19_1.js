module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
remoteDeleteImage('web-production', 'ghcr.io/xmione/badminton_court-web:latest', 'badminton-production', '.env.production', 'production');
      await pause();
};
