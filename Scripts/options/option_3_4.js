// Scripts/options/option_3_4.js
module.exports = async function (helpers) {
  const { runCommand, ask, pause } = helpers;

  const confirm = await ask('⚠ This will create a full database backup. Continue? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Backup cancelled.');
    await pause();
    return;
  }

  console.log('📦 Backing up entire database...');
  // Use --output-dir if you want a custom location; default is data/backups/
  runCommand('python manage.py backup_db --output-dir=data/backups');
};