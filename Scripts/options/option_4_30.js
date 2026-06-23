module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[33mSetting up / updating social media apps…\x1b[0m');
      runCommand('python manage.py setup_social_apps');
      await pause();
};
