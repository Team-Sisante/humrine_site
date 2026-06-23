module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '⚡ Running Post-Process Videos in Docker...' && ${dc} --env-file .env.docker --profile dev --profile presentation run --rm presentation node Scripts/post-process-videos-docker.js`);
      await pause();
};
