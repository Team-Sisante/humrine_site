// Scripts/options/option_1_8.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;

  console.log('🛑 Stopping all development containers...');
  runCommand(`${dc} down`);
  console.log('✅ All containers stopped.');
  await pause();
};