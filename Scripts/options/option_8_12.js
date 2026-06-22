module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
const presentationSpec = await ask('Enter spec file path (optional): ');
      let dockerCypressPresentationSpecCommand = `echo '🚀 Running Docker Cypress tests for presentation spec...' && ${dc} --env-file .env.docker --profile test exec cypress run --headed --browser chrome --config video=true --spec`;
      if (presentationSpec) dockerCypressPresentationSpecCommand += ` ${presentationSpec}`;
      dockerCypressPresentationSpecCommand += ` && echo '⚡ Running Post-Process Videos in Docker...' && ${dc} --env-file .env.docker --profile dev --profile presentation run --rm presentation node Scripts/post-process-videos-docker.js`;
      runCommand(dockerCypressPresentationSpecCommand);
      await pause();
};
