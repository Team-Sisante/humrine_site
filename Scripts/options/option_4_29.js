module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const venvPath2 = path.join(__dirname, '..', 'venv');
      let proceed = true;
      if (fs.existsSync(venvPath2)) {
        const confirm = await ask('venv already exists. Overwrite? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
          proceed = false;
        } else {
          // Remove old venv
          try {
            if (isWindows) {
              execSync(`rmdir /s /q "${venvPath2}"`);
            } else {
              execSync(`rm -rf "${venvPath2}"`);
};
