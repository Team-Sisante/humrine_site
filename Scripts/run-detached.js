// Scripts/run-detached.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

/**
 * Pauses and waits for Enter, then exits.
 */
function pauseAndExit(code = 0) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('\x1b[33mPress Enter to continue...\x1b[0m', () => {
    rl.close();
    process.exit(code);
  });
}

// ----- Locate the venv Python -----
const scriptDir = __dirname;                           // Scripts/
const projectRoot = path.resolve(scriptDir, '..');     // badminton_court/
const isWindows = process.platform === 'win32';

let pythonPath;
const venvDir = path.join(projectRoot, 'venv');
if (fs.existsSync(venvDir)) {
  pythonPath = isWindows
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python');
  console.log(`Using venv Python: ${pythonPath}`);
} else {
  console.warn('\x1b[33mWarning: venv not found. Falling back to system python.\x1b[0m');
  pythonPath = 'python';
}

try {
  console.log('\x1b[36mRunning migrations...\x1b[0m');
  execSync(`"${pythonPath}" manage.py migrate`, { cwd: projectRoot, stdio: 'inherit' });
  console.log('\x1b[32mMigrations completed.\x1b[0m');

  if (isWindows) {
    // Open a **new console window** that stays open after the server ends/crashes.
    // `cmd /k` keeps the window alive, showing any error messages.
    // The window title is set to "Django Server".
    const cmd = `start "Django Server" cmd /k "cd /d "${projectRoot}" && "${pythonPath}" manage.py runserver 0.0.0.0:8000"`;
    execSync(cmd, { stdio: 'inherit', shell: true });
  } else {
    // Unix/macOS: run detached with nohup (no new window)
    execSync(`nohup "${pythonPath}" manage.py runserver 0.0.0.0:8000 > server.log 2>&1 &`, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });
  }

  console.log('\x1b[32mDjango server started in a new window (detached mode)\x1b[0m');
  console.log('Check the new window for live output.');
  pauseAndExit(0);
} catch (err) {
  console.error('\x1b[31mError starting Django server:\x1b[0m', err.message);
  pauseAndExit(1);
}