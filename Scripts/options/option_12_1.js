module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
remoteDockerComposeUp('web-production', '.env.production', 'badminton-production', 'production');
      await pause();
};
