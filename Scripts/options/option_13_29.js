module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
console.log('\x1b[33mAuthorising a Classic PAT for SAML SSO...\x1b[0m');
      try {
        execSync('node Scripts/authorize-pat-sso.js', {
          stdio: 'inherit',
          env: { ...process.env }
        });
      } catch (e) {
        console.error(`\x1b[31mAuthorisation script failed: ${e.message}\x1b[0m`);
      }
      await pause();
};
