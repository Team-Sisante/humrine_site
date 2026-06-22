module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '💾 Saving running containers to Docker Hub...' && node Scripts/saveToDockerHub.js`);
      await pause();
};
