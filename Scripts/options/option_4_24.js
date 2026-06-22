module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('\x1b[36mGITHUB_TOKEN Setup Options:\x1b[0m');
      console.log('  1. Manual: Read GITHUB_TOKEN from .env file and set it automatically');
      console.log('  2. GitHub CLI: gh auth login (select personal account)');
      const tokenChoice = await ask('Select option (1 or 2): ');
      if (tokenChoice === '1') {
        console.log('\x1b[33mManual GITHUB_TOKEN setup from .env file:\x1b[0m');
        
        // Try to read GITHUB_TOKEN from .env.dev
        const envDevPath = path.join(__dirname, '..', '.env.dev');
        let token = '';
        
        if (fs.existsSync(envDevPath)) {
          const envContent = fs.readFileSync(envDevPath, 'utf8');
          const match = envContent.match(/^GITHUB_TOKEN=(.+)$/m);
          if (match) {
            token = match[1].trim();
            console.log(`\x1b[32mFound GITHUB_TOKEN in .env.dev\x1b[0m`);
            console.log(`\x1b[33mToken value: ${token}\x1b[0m`);
          }
        }
        
        if (!token) {
          token = await ask('GITHUB_TOKEN not found in .env.dev. Enter your GITHUB_TOKEN: ');
        }
        
        console.log('\x1b[36mUnsetting existing GITHUB_TOKEN environment variable...\x1b[0m');
        if (isWindows) {
          runCommand('set GITHUB_TOKEN=');
        } else {
          runCommand('unset GITHUB_TOKEN');
        }
        delete process.env.GITHUB_TOKEN;
        delete process.env.GITHUB_ENTERPRISE_TOKEN;
        
        // Validate that GITHUB_TOKEN is unset
        console.log('\x1b[36mValidating GITHUB_TOKEN is unset...\x1b[0m');
        if (process.env.GITHUB_TOKEN) {
          console.log('\x1b[31mWarning: GITHUB_TOKEN is still set in process environment. Clearing...\x1b[0m');
          delete process.env.GITHUB_TOKEN;
        }
        console.log('\x1b[32mGITHUB_TOKEN successfully unset.\x1b[0m');
        
        console.log('\x1b[36mSetting GITHUB_TOKEN for current session and verifying...\x1b[0m');
        // Check if running in Git Bash/MINGW64
        const isGitBash = process.env.MSYSTEM === 'MINGW64' || process.env.MSYSTEM === 'MINGW32';
        
        if (isWindows && !isGitBash) {
          // Windows cmd.exe
          runCommand(`setx GITHUB_TOKEN "${token}"`);
          console.log('\x1b[32mGITHUB_TOKEN saved for future sessions.\x1b[0m');
          runCommand(`cmd /c "set GITHUB_TOKEN=${token} && gh auth status"`);
        } else {
          // Git Bash/MINGW64 or Unix - use bash explicitly
          if (isWindows) {
            runCommand(`setx GITHUB_TOKEN "${token}"`);
            console.log('\x1b[32mGITHUB_TOKEN saved for future sessions.\x1b[0m');
            // Use bash explicitly for Git Bash
            runCommand(`bash -c 'GITHUB_TOKEN="${token}" gh auth status'`);
          } else {
            runCommand(`export GITHUB_TOKEN="${token}"`);
            console.log('\x1b[32mGITHUB_TOKEN set for current session.\x1b[0m');
            console.log('\x1b[33mNote: Add to ~/.bashrc or ~/.zshrc for persistence.\x1b[0m');
            runCommand(`GITHUB_TOKEN="${token}" gh auth status`);
          }
        }
        
        await pause();
      } else if (tokenChoice === '2') {
        console.log('\x1b[33mClearing existing GITHUB_TOKEN environment variable...\x1b[0m');
        if (isWindows) {
          // On Windows, we need to use set to clear it for the current session
          // Note: This only affects the current command prompt session
          runCommand('set GITHUB_TOKEN=');
          // Also clear it in the current process environment
          delete process.env.GITHUB_TOKEN;
          delete process.env.GITHUB_ENTERPRISE_TOKEN;
        } else {
          runCommand('unset GITHUB_TOKEN');
          delete process.env.GITHUB_TOKEN;
          delete process.env.GITHUB_ENTERPRISE_TOKEN;
        }
        console.log('\x1b[32mGITHUB_TOKEN cleared.\x1b[0m');
        
        console.log('\x1b[33mRunning gh auth login with web browser...\x1b[0m');
        runCommand('gh auth login --web');
        console.log('\x1b[36mVerifying authentication status...\x1b[0m');
        runCommand('gh auth status');
        await pause();
      } else {
        console.log('\x1b[31mInvalid option.\x1b[0m');
      }
};
