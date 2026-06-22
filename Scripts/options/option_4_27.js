module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[36mAttempting to list Classic PATs...\x1b[0m');
      console.log('\x1b[33mNote: GitHub does not provide a public API endpoint to list Classic PATs for security reasons.\x1b[0m');
      console.log('\x1b[33mClassic PATs can only be viewed through the GitHub web interface.\x1b[0m');
      console.log('\x1b[33mgh auth token (option 13.19) only displays OAuth tokens from keyring, not Classic PATs.\x1b[0m');
      console.log('');
      console.log('\x1b[31mTo view your Classic PATs, you must use the GitHub web interface:\x1b[0m');
      console.log('  https://github.com/settings/tokens');
      console.log('');
      console.log('\x1b[33mWould you like to open the GitHub Personal Access Tokens page in your browser? (y/N)\x1b[0m');
      const openBrowser = await ask('');
      if (openBrowser.toLowerCase() === 'y') {
        runCommand('start https://github.com/settings/tokens');
      }
      await pause();
};
