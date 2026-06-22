module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
console.log('\x1b[33mShowing binary environment logs...\x1b[0m');
      runCommand(dc + ' -f docker-compose.binary.yml logs -f');
      await pause();
};
