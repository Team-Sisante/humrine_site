module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const dockerDevParam = await ask('Enter additional parameter for cruise-config.xml (optional): ');
      let dockerDevCommand = `echo '🚀 Starting development environment...' && ${dc} --env-file .env.docker --profile dev up`;
      if (dockerDevParam) dockerDevCommand += ` ${dockerDevParam}`;
      runCommand(dockerDevCommand);
      await pause();
};
