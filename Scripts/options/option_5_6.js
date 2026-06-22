module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const dockerDevDetachedParam = await ask('Enter additional parameter for cruise-config.xml (optional): ');
      let dockerDevDetachedCommand = `echo '🚀 Starting development environment (detached)...' && ${dc} --env-file .env.docker --profile dev up -d`;
      if (dockerDevDetachedParam) dockerDevDetachedCommand += ` ${dockerDevDetachedParam}`;
      runCommand(dockerDevDetachedCommand);
      await pause();
};
