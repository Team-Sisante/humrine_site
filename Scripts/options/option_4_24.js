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
};
