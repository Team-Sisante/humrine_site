// Scripts/options/option_4_20.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  runCommand('node Scripts/migrate-to-gcp-secrets.js');
};
