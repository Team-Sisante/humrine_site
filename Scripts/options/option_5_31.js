module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[33mDeep cleanup with Docker Desktop restart...\x1b[0m');
      if (isWindows) {
        runCommand('taskkill /F /IM "Docker Desktop"');
        sleep(10);
        runCommand('docker system prune -a --volumes');
        runCommand('start ""C:\Program Files\Docker\Docker\Docker Desktop.exe""');
        sleep(30);
        console.log('\x1b[32mDocker Desktop should be starting. Wait for it to initialize.\x1b[0m');
      } else {
        runCommand('pkill -f "Docker Desktop"');
        sleep(10);
        runCommand('docker system prune -a --volumes');
        runCommand('open -a Docker Desktop');
        sleep(30);
      }
      await pause();
};
