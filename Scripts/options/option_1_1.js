module.exports = async function(helpers) {
  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;
console.log('DEBUG: ENVIRONMENT:', process.env.ENVIRONMENT, 'SECRET_KEY:', process.env.SECRET_KEY ? 'IS SET' : 'IS NOT SET');
      // runCommand("docker stop web-dev >/dev/null 2>&1 || true");
      // runCommand("docker stop web-test >/dev/null 2>&1 || true");
      let localDevCommand = `echo '🚀 Starting local development environment...' && cross-env ENVIRONMENT=development python manage.py runserver 0.0.0.0:8000`;
      runCommand(localDevCommand);
      await pause();
};
