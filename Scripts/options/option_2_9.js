module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const backupImgNames = await ask('Enter image name(s): ');
      runCommand(`echo '➕ Adding one or more images to the all-images.tar archive (e.g.: npm run docker:backup-individual -- web-dev)...' && node Scripts/backupIndividual.js ${backupImgNames}`);
      await pause();
};
