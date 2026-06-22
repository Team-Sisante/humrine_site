module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand("echo '🔧 Fixing docker DB permissions...' && docker exec -u root web-dev chown -R appuser:appuser /app/data && docker restart web-dev");
};
