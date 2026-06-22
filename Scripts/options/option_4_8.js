module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo 'Creating openssl certificates...' && node Scripts/generate-certs.js`);
      await pause();
};
