// Scripts/options/option_16_2.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  
  console.log('🚀 Starting Database container only...');
  const command = `${dc} --env-file .env.docker --profile dev up -d db`;
  
  runCommand(command);
  console.log('✅ Database container started.');
  await pause();
};