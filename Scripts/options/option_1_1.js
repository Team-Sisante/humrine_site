// Scripts/options/option_1_1.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  runCommand("docker stop web-dev");
  runCommand("docker stop web-test");
  console.log('Ensuring development containers are running...');
  runCommand(`${dc} --env-file .env.docker --env-file .env.common --profile dev up -d db redis mail-test`);
  // wait for db healthy (optional, but recommended)
  const localDevDetachedCommand = `echo '🚀 Starting local development environment in detached mode...' && node Scripts/run-detached.js`;
  runCommand(localDevDetachedCommand);
  
  console.log('✅ Web container started.');  
};
