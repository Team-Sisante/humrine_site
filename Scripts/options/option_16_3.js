// Scripts/options/option_16_3.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  
  console.log('🚀 Starting Redis container only...');
  const composeFile = 'docker-compose-local-ghcr.yml';
  const command = `${dc} -f ${composeFile} --env-file .env.docker --profile dev up -d redis`;
  
  runCommand(command);
  console.log('✅ Redis container started.');
  await pause();
};