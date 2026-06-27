// Scripts/options/option_1_9.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;

  console.log('🚀 Starting development containers in foreground (logs will stream)...');
  console.log('Press Ctrl+C to stop the containers.');
  const command = `${dc} --env-file .env.docker --profile dev up`;  // no -d
  runCommand(command);
  // The script will block until user interrupts; after that, containers will be stopped.
  await pause();
};