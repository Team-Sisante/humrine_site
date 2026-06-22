module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
if (isWindows) {
          console.log('Not applicable on Windows.');
      } else {
          runCommand('sudo Scripts/setup-linux-system.sh');
      }
      await pause();
};
