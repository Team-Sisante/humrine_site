module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[36mDisplaying GitHub authentication status...\x1b[0m');
      runCommand('gh auth status');
      await pause();
};
