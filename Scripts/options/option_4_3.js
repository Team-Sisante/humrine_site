module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '⚡ Running Cypress tests for presentation (headed)...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('npx', ['cypress','run','--headed','--browser','chrome','--config','video=true'], { stdio:'inherit', shell: true })" && echo '⚡ Running Post-Process Videos...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('node', ['Scripts/post-process-videos.js'], { stdio:'inherit', shell: true })"`);
      await pause();
};
