module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const repoOwner = process.env.GIT_REPO_USERNAME;
      const repoName = process.env.GIT_REPO_REPONAME;
      if (!repoOwner || !repoName) {
        console.log('\x1b[31mERROR: GIT_REPO_USERNAME and GIT_REPO_REPONAME must be set in .env.staging\x1b[0m');
};
