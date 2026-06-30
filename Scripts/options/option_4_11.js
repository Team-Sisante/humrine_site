// Scripts/options/option_4_11.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  runCommand(`echo 'Prints Project Folder Structure..' && node Scripts/pfs.js`);
};
