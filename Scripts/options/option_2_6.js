module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
runCommand(`echo '⚡ Running Post-Process Videos...' && node -e "require('dotenv').config({path:'.env.dev'}); process.env.ENVIRONMENT='development'; process.env.CYPRESS='true'; const { spawnSync } = require('child_process'); spawnSync('node', ['Scripts/post-process-videos.js'], { stdio:'inherit', shell: true })"`);
      await pause();
};
