module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const confirmRebuild = await ask('Are you sure? (y/n): ');
      if (confirmRebuild === 'y') runCommand(`echo '🔄 COMPLETE Docker reset and rebuild everything...' && node Scripts/docker-desktop-reset-and-rebuild.js`);
      await pause();
};
