module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
try {
        // 1. Check if gh is installed
        let ghExists = false;
        try {
          execSync('gh --version', { stdio: 'pipe', encoding: 'utf8' });
          ghExists = true;
        } catch (_) { /* not found */ }

        if (!ghExists) {
          console.log('\x1b[31mGitHub CLI (gh) is not installed or not in PATH.\x1b[0m');
          console.log('\x1b[33mInstall it from https://cli.github.com/\x1b[0m');
          await pause();
};
