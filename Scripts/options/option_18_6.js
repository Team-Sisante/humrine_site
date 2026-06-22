module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
remoteFullCleanup('badminton-staging', '.env.staging', 'staging');
      await pause();
};
