// Scripts/options/option_3_5.js
module.exports = async function (helpers) {
  const { runCommand, ask, pause, fs, path } = helpers;

  const backupDir = path.resolve(process.cwd(), 'data', 'backups');

  try {
    const allFiles = fs.readdirSync(backupDir);
    const files = allFiles.filter(f => f.endsWith('.json')).sort().reverse();

    if (files.length === 0) {
      console.log(`\x1b[33m⚠ No .json backup files found in ${backupDir}.\x1b[0m`);
      await pause();
      return;
    }

    console.log('\n\x1b[36mAvailable backup files:\x1b[0m');
    files.forEach((file, i) => console.log(`  ${i + 1}. ${file}`));

    const choice = await ask(`\nSelect a file number (1-${files.length}) or type filename manually: `);
    let selectedFile;
    const num = parseInt(choice, 10);
    if (!isNaN(num) && num >= 1 && num <= files.length) {
      selectedFile = files[num - 1];
    } else if (choice.trim()) {
      selectedFile = choice.trim();
    } else {
      console.log('\x1b[31mNo valid selection. Aborting.\x1b[0m');
      await pause();
      return;
    }

    const confirm = await ask(`⚠ This will WIPE the current database and replace it with "${selectedFile}". Continue? (y/N): `);
    if (confirm.toLowerCase() !== 'y') {
      console.log('Restore cancelled.');
      await pause();
      return;
    }

    runCommand(`python manage.py restore_db ${selectedFile} --yes`);

  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`\x1b[33m⚠ Backup directory '${backupDir}' does not exist.\x1b[0m`);
    } else {
      console.error('\x1b[31mError while restoring backup:\x1b[0m', err.message);
    }
    await pause();
  }
};