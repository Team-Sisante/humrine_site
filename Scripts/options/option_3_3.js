module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '📊 Loading local dev data...' && cross-env ENVIRONMENT=development python manage.py load_test_data`);
      await pause();
};
