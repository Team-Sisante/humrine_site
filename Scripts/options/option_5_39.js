module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand(dc + ' --env-file .env.docker down -v --rmi all');
      runCommand('docker system prune -a --volumes -f');
      await pause();
};
