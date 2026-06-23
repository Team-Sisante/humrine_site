module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const inquirer = (await import('inquirer')).default;
      const { target } = await inquirer.prompt({
        type: 'list',
        name: 'target',
        message: 'Select environment file to generate:',
        choices: [
          { name: 'Staging (.env.staging)',        value: { env: 'staging',     file: '.env.staging',  template: '.env.staging.template' } },
          { name: 'Production (.env.production)',  value: { env: 'production',  file: '.env.production',template: '.env.production.template' } },
          { name: 'Docker Dev (.env.docker)',      value: { env: 'docker',      file: '.env.docker',   template: '.env.docker.template' } },
          { name: 'Local Dev (.env.dev)',          value: { env: 'development', file: '.env.dev',      template: '.env.dev.template' } }
        ]
      });

      let cmd = `node Scripts/generate-env.js ${target.env} ${target.file}`;
      if (target.template) {
        cmd += ` --template ${target.template}`;
};
