module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
// Interactive env loading, then docker compose
      const evalCmd = `eval $(node "${path.join(__dirname, 'load-vm-env.js')}") && ` +
                      `docker compose -p humrine-staging -f docker-compose.vm.yml --profile staging up -d`;
      console.log('\x1b[36mLoading secrets and starting humrine_site staging containers…\x1b[0m');
      runCommand(evalCmd);
      await pause();
};
