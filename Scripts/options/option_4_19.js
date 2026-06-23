module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const inquirer = (await import('inquirer')).default;

      // One prompt only – choose the GitHub Environment
      const { targetEnv } = await inquirer.prompt({
        type: 'list',
        name: 'targetEnv',
        message: 'Which GitHub Environment should receive the variables?',
        choices: [
          { name: 'development', value: 'development' },
          { name: 'docker', value: 'docker' },
          { name: 'staging', value: 'staging' },
          { name: 'production', value: 'production' }   // typo fixed
        ]
      });

      // Automatically pick the matching .env file
      const envFileMap = {
        development: '.env.dev',
        docker:      '.env.docker',
        staging:     '.env.staging',
        production:  '.env.production'
      };
      const sourceFile = envFileMap[targetEnv];

      if (!sourceFile) {
        console.error(`\x1b[31mNo source file mapped for environment "${targetEnv}"\x1b[0m`);
        await pause();
};
