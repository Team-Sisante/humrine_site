module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
runCommand("echo '🔧 Fixing development DB permissions...' && sudo chown -R $USER:$USER ./data db.sqlite3 2>/dev/null || true");
};
