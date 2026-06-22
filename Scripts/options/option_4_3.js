module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '⚡ Running Cypress tests (headless)...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('npx', ['cypress','run','--headless','--browser','chrome'], { stdio:'inherit', shell: true })"`);
      await pause();
};
