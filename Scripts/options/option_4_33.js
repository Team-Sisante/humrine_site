module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const inquirer = (await import('inquirer')).default;
      const { envName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'envName',
          message: 'Select environment to list GitHub variables:',
          choices: ['development', 'docker', 'staging', 'production']
};
