module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
console.log('\x1b[36mLaunching shell with venv activated...\x1b[0m');
      if (!fs.existsSync(venvPath)) {
        console.log('\x1b[31m✗ Virtual environment not found at: ' + venvPath + '\x1b[0m');
        await pause();
};
