module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
remoteDockerComposeUp('nginx-staging', '.env.staging', 'badminton-staging', 'staging');
      await pause();
};
