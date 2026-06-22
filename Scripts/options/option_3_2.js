module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🚀 Running migrations...' && cross-env ENVIRONMENT=development python manage.py migrate`);
      runCommand(`echo '🚀 Running Cypress tests (headed)...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('npx', ['cypress','run','--headed','--browser','chrome'], { stdio:'inherit', shell: true })"`);
      await pause();
};
