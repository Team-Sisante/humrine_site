// Scripts/options/option_4_13.js
module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  console.log('\x1b[31mWARNING: This will decrypt all .env files.\x1b[0m');
  const confirmDecrypt = await ask('Are you sure? Type "yes" to proceed: ');
  if (confirmDecrypt.toLowerCase() === 'yes') {
    runCommand(`echo 'Decrypting .env files...' && node Scripts/decryptenvfiles.js`);
  }
};
