module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
remoteDockerComposeUp('db-test', '.env.staging', 'badminton-staging', 'staging');
      await pause();
};
