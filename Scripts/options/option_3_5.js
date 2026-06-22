module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
// Restore database from a JSON fixture backup
      const filename = await ask('Enter backup filename (e.g., db_backup_20260617_120000.json): ');
      if (!filename) {
        console.log('\x1b[31mNo filename entered. Aborting.\x1b[0m');
        await pause();
};
