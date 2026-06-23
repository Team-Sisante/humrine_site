module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo '🎬 Select a Cypress test from the list and run it for presentation (headed) in Docker...' && ${dc} --env-file .env.docker --profile dev --profile presentation run --rm presentation node Scripts/create-presentation-docker.js`);
      await pause();
};
