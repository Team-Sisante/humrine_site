module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(`echo 'Generating a README.md file...' && npx @catmeow/readme-ai`);
      await pause();
};
