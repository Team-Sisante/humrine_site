// Scripts/options/option_16_6.js

module.exports = async function (helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;

  console.log('🚀 Starting/restarting all development containers (db, redis, mail, web)...');
  const composeFile = 'docker-compose-local-ghcr.yml';
  const command = `${dc} -f ${composeFile} --env-file .env.docker --profile dev up -d`;
  runCommand(command);
  console.log('✅ All containers started.');
  await pause();
};