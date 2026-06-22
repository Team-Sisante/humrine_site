module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
runCommand(`echo '🚀 Ensuring certificates exist and starting dev environment...' && echo 'Creating openssl certificates...' && node Scripts/generate-certs.js && echo '🚀 Starting development environment (detached)...' && ${dc} --env-file .env.docker --profile dev up -d`);
      await pause();
};
