module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo 'Run this in an Administrator terminal!' && node Scripts/generate-certs.js --elevated`);
      await pause();
};
