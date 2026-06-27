// Scripts/options/option_1_1.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
  
  console.log('🚀 Starting Web container only...');
  const composeFile = 'docker-compose-local-ghcr.yml';
  const command = `${dc} -f ${composeFile} --env-file .env.docker --profile dev up -d web`;
  
  runCommand(command);
  console.log('✅ Web container started.');
  await pause();
};