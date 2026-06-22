module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[36mDisplaying current GitHub token...\x1b[0m');
      console.log('\x1b[33mNote: This displays the token from the keyring (gh auth login).\x1b[0m');
      console.log('\x1b[33mIf you set GITHUB_TOKEN via environment variable, this will show the keyring token instead.\x1b[0m');
      
      // Clear GITHUB_TOKEN from environment to ensure we get the keyring token
      const envWithoutToken = { ...process.env };
      delete envWithoutToken.GITHUB_TOKEN;
      delete envWithoutToken.GITHUB_ENTERPRISE_TOKEN;
      
      try {
        const token = execSync('gh auth token', { 
          encoding: 'utf8',
          env: envWithoutToken,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        console.log('\x1b[32mKeyring token:\x1b[0m');
        console.log(token.trim());
      } catch (error) {
        console.error('\x1b[31mFailed to get keyring token. You may not be authenticated via gh auth login.\x1b[0m');
};
