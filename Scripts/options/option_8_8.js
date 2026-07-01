// Scripts/options/option_8_8.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  const cypressInstall = require('./../cypress-install');
  await cypressInstall();
};
