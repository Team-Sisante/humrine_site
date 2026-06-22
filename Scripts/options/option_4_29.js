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
            }
          } catch (err) {
            console.error('\x1b[31mFailed to remove existing venv:\x1b[0m', err.message);
            proceed = false;
          }
        }
      }
      if (proceed) {
        try {
          console.log('\x1b[36mCreating new venv...\x1b[0m');
          // Create in parent dir of Script, which is root
          execSync('python -m venv venv', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
          console.log('\x1b[32mvenv created successfully.\x1b[0m');
        } catch (err) {
          console.error('\x1b[31mFailed to create venv:\x1b[0m', err.message);
        }
      }
      await pause();
};
