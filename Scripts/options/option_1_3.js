module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const venvPath = path.join(__dirname, '..', 'venv');
      // runCommand("docker stop web-dev");
      // runCommand("docker stop web-test");
      console.log('Ensuring development containers are running...');
      
      // Auto-setup venv and dependencies if missing
      if (!fs.existsSync(venvPath)) {
        console.log('\x1b[33m⚠ venv not found. Setting up virtual environment...\x1b[0m');
        const venvRes = runCommand('python -m venv venv');
        
        if (venvRes.success) {
          let pipCmd = isWindows 
            ? path.join(venvPath, 'Scripts', 'pip')
            : path.join(venvPath, 'bin', 'pip');
          
          console.log('\x1b[33m⚠ Installing dependencies...\x1b[0m');
          runCommand(`"${pipCmd}" install -r requirements.txt`);
        } else {
          console.error('\x1b[31mFailed to create venv: ' + venvRes.error + '\x1b[0m');
        }
      }

      // TODO (Future): Enable these services once defined in docker-compose.yml
      // runCommand(`${getDockerCompose()} --env-file .env.common --env-file .env.docker --profile dev up -d db redis mail-test`);
      
      // wait for db healthy (optional, but recommended)
      const localDevDetachedCommand = `echo '🚀 Starting local development environment in detached mode...' && node Scripts/run-detached.js`;
      runCommand(localDevDetachedCommand);
      await pause();
};
