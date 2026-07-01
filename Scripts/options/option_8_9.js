// Scripts/options/option_8_9.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  runCommand(`npx cypress cache clear`);
  return;
};
