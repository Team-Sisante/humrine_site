module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
remoteDeleteImage('web-staging', 'ghcr.io/xmione/badminton_court-web:latest', 'badminton-staging', '.env.staging', 'staging');
      await pause();
};
