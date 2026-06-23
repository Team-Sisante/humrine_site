module.exports = async function(helpers) {
  const { runCommand, ask, pause, execSync, fs, path, isWindows } = helpers;
  const inquirer = (await import('inquirer')).default;
  const { envFileName } = await inquirer.prompt({
    type: 'list',
    name: 'envFileName',
    message: 'Select environment to test:',
    choices: [
      { name: 'Development (.env.test.dev)',        value: '.env.test.dev' },
      { name: 'Docker (.env.test.docker)',          value: '.env.test.docker' },
      { name: 'Staging (.env.test.staging)',        value: '.env.test.staging' },
      { name: 'Production (.env.test.production)',  value: '.env.test.production' }
    ]
  });

  // FIX: __dirname is now Scripts/options/, so we go up two levels to reach the app root
  const appRoot = path.resolve(__dirname, '..', '..');
  const envPath = path.resolve(appRoot, envFileName);
  
  if (!fs.existsSync(envPath)) {
    console.error(`\x1b[31mEnvironment file ${envFileName} not found at ${envPath}\x1b[0m`);
    await pause();
    return;
  }

  // Check if test environment is running AND healthy
  const checkCmd = 'docker compose --profile test ps --format json';
  let isRunning = false;
  let isHealthy = false;
  try {
    const output = execSync(checkCmd, { stdio: 'pipe', encoding: 'utf8' });
    if (output.trim()) {
      const containers = JSON.parse(`[${output.trim().split(/\r?\n/).join(',')}]`);
      isRunning = containers.some(c => c.State === 'running');
      isHealthy = containers.every(c => !c.State || c.State.includes('running') || c.State.includes('healthy'));
    }
  } catch (err) {
    // Assume not running if command fails
  }

  if (!isRunning || !isHealthy) {
    console.log('\x1b[31m--- ENVIRONMENT ALERT ---\x1b[0m');
    if (!isRunning) {
        console.log('The test backend is not running.');
    } else {
        console.log('The test backend appears to be in an unhealthy or crashed state.');
    }
    console.log('Suggestions:');
    console.log('1. Run option "5.17" to check logs for errors.');
    console.log('2. If containers are stuck, use option "5.25" to reset volumes.');
    console.log('3. Restart via option "5.15" after cleaning.');
    console.log('\x1b[31m-------------------------\x1b[0m');
    
    await pause();
    return;
  }

  console.log(`\x1b[36mOpening Cypress using ${envFileName}\x1b[0m`);

  const venvScriptPath = path.join(appRoot, 'venv', 'Scripts', 'activate.bat');
  const venvBinPath = path.join(appRoot, 'venv', 'Scripts');
  
  let cypressCmd = `npx cypress open`;
  let modifiedEnv = { ...process.env, CYPRESS_ENV_FILE: envPath };

  if (fs.existsSync(venvScriptPath)) {
    console.log(`\x1b[32mInjecting Python virtual environment variables into Cypress...\x1b[0m`);
    
    if (process.env.PATH) {
      modifiedEnv.PATH = `${venvBinPath}${path.delimiter}${process.env.PATH}`;
    } else {
      modifiedEnv.PATH = venvBinPath;
    }
    
    modifiedEnv.VIRTUAL_ENV = path.join(appRoot, 'venv');
    cypressCmd = `call "${venvScriptPath}" && npx cypress open`;
  }

  try {
    execSync(cypressCmd, {
      stdio: 'inherit',
      cwd: appRoot,
      env: modifiedEnv,
      shell: 'cmd.exe'
    });
  } catch (err) {
    // Cypress exits with non-zero when closed; ignore
  }
  await pause();
};