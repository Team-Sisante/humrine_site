module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const restoreImgName = await ask('Enter image name: ');
      runCommand(`echo '📦 Restoring a specific Docker image from the all-images.tar archive (e.g.: npm run docker:restore-image -- web-dev)...' && node Scripts/restoreImage.js ${restoreImgName}`);
      await pause();
};
