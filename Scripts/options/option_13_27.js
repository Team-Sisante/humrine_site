module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;
console.log('\x1b[33mListing GCP secrets…\x1b[0m');
      runCommand(`gcloud secrets list --project=${process.env.GCP_PROJECT_ID}`);
      await pause();
};
