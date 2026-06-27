// Scripts/options/option_16_7.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;

  console.log('\x1b[31m⚠️  WARNING: This will DESTROY all mail data (emails, accounts, etc.)!\x1b[0m');
  const confirm = await ask('Are you sure you want to continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Operation cancelled.');
    await pause();
    return;
  }

  console.log('🗑️  Stopping and removing mail container...');
  const composeFile = 'docker-compose-local-ghcr.yml';
  // Stop and remove the mail container, and remove the volume
  runCommand(`${dc} -f ${composeFile} down -v mail`);  // -v removes volumes associated with mail service
  console.log('✅ Mail volume wiped. You can now restart the mail container.');
  await pause();
};