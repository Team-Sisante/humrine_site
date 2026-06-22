module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[31mWARNING: This will reset Docker Desktop to factory defaults!\x1b[0m');
      const confirmFactory = await ask('Continue? (y/n): ');
      if (confirmFactory === 'y') {
        console.log('\x1b[33mPlease reset manually via Docker Desktop UI.\x1b[0m');
      }
      await pause();
};
