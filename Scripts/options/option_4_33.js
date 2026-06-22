module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const inquirer = (await import('inquirer')).default;
      const { envName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'envName',
          message: 'Select environment to list GitHub variables:',
          choices: ['development', 'docker', 'staging', 'production']
        }
      ]);

      const repoFull = `${process.env.GIT_REPO_USERNAME}/${process.env.GIT_REPO_REPONAME}`;
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        console.error('\x1b[31mGITHUB_TOKEN is not set.\x1b[0m');
        await pause();
};
