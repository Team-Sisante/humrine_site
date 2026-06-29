// Scripts/options/option_4_22.js

module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  try {
    // 1. Check if gh is installed
    let ghExists = false;
    try {
      execSync('gh --version', { stdio: 'pipe', encoding: 'utf8' });
      ghExists = true;
    } catch (_) { /* not found */ }

    if (!ghExists) {
      console.log('\x1b[31mGitHub CLI (gh) is not installed or not in PATH.\x1b[0m');
      console.log('\x1b[33mInstall it from https://cli.github.com/\x1b[0m');
      await pause();
      return;
    }

    // 2. Check if GITHUB_TOKEN is set (prevents interactive login)
    if (process.env.GITHUB_TOKEN) {
      console.log('\x1b[33mℹ️  GITHUB_TOKEN is already set in your environment.\x1b[0m');
      console.log('\x1b[33m   gh will use it for authentication – no separate login needed.\x1b[0m');
      console.log('');
      console.log('\x1b[36m   If you still want to run "gh auth login" (e.g. to store credentials),\x1b[0m');
      console.log('\x1b[36m   the GITHUB_TOKEN must be temporarily unset.\x1b[0m');
      const choice = await ask('Do you want to temporarily unset GITHUB_TOKEN and proceed? (y/N): ');
      if (choice.toLowerCase() !== 'y') {
        console.log('\x1b[32mSkipping authentication – already authenticated via GITHUB_TOKEN.\x1b[0m');
        await pause();
        return;
      }
      // Proceed with clearing the variable for the subprocess
      console.log('\x1b[33mTemporarily unsetting GITHUB_TOKEN for the login session...\x1b[0m');
    }

    // 3. Run gh auth login with a custom environment (no GITHUB_TOKEN)
    console.log('\x1b[33mStarting GitHub CLI authentication...\x1b[0m');
    try {
      const envWithoutToken = { ...process.env };
      delete envWithoutToken.GITHUB_TOKEN;
      delete envWithoutToken.GITHUB_ENTERPRISE_TOKEN; // just in case
      execSync('gh auth login', { stdio: 'inherit', env: envWithoutToken });
      console.log('\x1b[32mGitHub CLI authenticated successfully.\x1b[0m');
    } catch (loginError) {
      // loginError could be user cancelled (Ctrl+C) or other failure
      if (loginError.signal === 'SIGINT') {
        console.log('\x1b[33mAuthentication cancelled.\x1b[0m');
      } else {
        console.log('\x1b[31mGitHub CLI authentication failed.\x1b[0m');
        console.log(`\x1b[31m${loginError.stderr || loginError.message}\x1b[0m`);
      }
    }
  } catch (unexpectedError) {
    console.log('\x1b[31mAn unexpected error occurred during GitHub authentication.\x1b[0m');
    console.log(`\x1b[31m${unexpectedError.message}\x1b[0m`);
  }
  await pause();
};
