module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  console.log('\x1b[31mWARNING: This will encrypt all .env files.\x1b[0m');
  const confirmEncrypt = await ask('Are you sure? Type "yes" to proceed: ');
  if (confirmEncrypt.toLowerCase() === 'yes') {
    runCommand(`echo 'Encrypting .env files...' && node Scripts/encryptenvfiles.js`);
  }
};
