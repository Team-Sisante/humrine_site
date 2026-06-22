module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
console.log('\x1b[33mEnsuring social apps are up to date and validating…\x1b[0m');
      runCommand('python manage.py setup_social_apps');
      runCommand('python manage.py validate_social_secrets');
      await pause();
};
