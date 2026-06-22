module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
console.log('\x1b[33mUpdating GITHUB_TOKEN in all .env files...\x1b[0m');
      runCommand('node Scripts/update-github-token.js');
      await pause();
};
