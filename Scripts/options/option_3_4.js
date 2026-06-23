module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
// Backup database (Django dumpdata)
      runCommand(`echo '📦 Backing up database to JSON fixture...' && python manage.py backup_db`);
      await pause();
};
