module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[33mCleaning Docker content store...\x1b[0m');
      if (isWindows) {
        runCommand('taskkill /F /IM "Docker Desktop"');
        sleep(10);
        runCommand('docker system prune -a --volumes');
        runCommand('start ""C:\Program Files\Docker\Docker\Docker Desktop.exe""');
        sleep(30);
      } else {
        runCommand('pkill -f "Docker Desktop"');
        sleep(10);
        runCommand('docker system prune -a --volumes');
        runCommand('open -a Docker Desktop');
        sleep(30);
};
