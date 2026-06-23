module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
// FIXED: Safely handle both standard CommonJS and ES Module default wrappers
      const inquirerModule = require('inquirer');
      const inquirer = inquirerModule.default || inquirerModule;

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'keyword',
          message: 'Enter keyword to search:'
        },
        {
          type: 'list',
          name: 'searchScope',
          message: 'Select search scope:',
          choices: [
            { name: '1. Search all files in history', value: 'all' },
            { name: '2. Search a specific file in history', value: 'specific' }
          ],
          when: (currAnswers) => currAnswers.keyword && currAnswers.keyword.trim() !== ''
        },
        {
          type: 'input',
          name: 'filePath',
          message: 'Enter file path(s) (space-separated for multiple, e.g., roadmap_progress.lst Docs/Roadmap_Environments.md):',
          when: (currAnswers) => currAnswers.searchScope === 'specific'
};
