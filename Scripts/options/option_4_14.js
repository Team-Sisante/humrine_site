module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo 'Creating PostIO container...' && node Scripts/createpostio.js`);
      await pause();
};
