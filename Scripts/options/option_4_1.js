module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
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

      const envPath = path.resolve(__dirname, '..', envFileName);
      if (!fs.existsSync(envPath)) {
        console.error(`\x1b[31mEnvironment file ${envFileName} not found at ${envPath}\x1b[0m`);
        await pause();
};
