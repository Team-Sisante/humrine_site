// Scripts/options/option_16_4.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  
  console.log('🚀 Starting Mail container only...');
  const composeFile = 'docker-compose-local-ghcr.yml';
  const command = `${dc} -f ${composeFile} --env-file .env.docker --profile dev up -d mail`;
  
  runCommand(command);
  console.log('✅ Mail container started.');
  await pause();
};