// Scripts/options/option_14_5.js
module.exports = async function (helpers) {
  const { runCommand, ask, pause, execSync, path } = helpers;
  const sshKey = path.resolve(process.cwd(), '..', 'gocd-server', 'secrets', 'agent-key');
  const sshUser = process.env.VM_SSH_USER || 'xmione';
  const vmIp = process.env.GCP_VM_IP || '35.198.231.9';
  const containerName = 'humrine-web-production';
  const backupDir = '/app/data/backups';   // inside the container

  try {
    const listCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "sudo docker exec ${containerName} sh -c 'ls -1 ${backupDir}/*.json 2>/dev/null'"`;
    console.log('📂 Fetching backup file list...');
    const output = execSync(listCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();

    if (!output) {
      console.log(`\x1b[33m⚠ No backup files found in ${backupDir}.\x1b[0m`);
      await pause();
      return;
    }

    const files = output.split('\n').map(f => f.trim()).filter(Boolean);
    console.log('\n\x1b[36mAvailable backup files:\x1b[0m');
    files.forEach((file, i) => console.log(`  ${i + 1}. ${file.replace(backupDir + '/', '')}`));

    const choice = await ask(`\nSelect a file number (1-${files.length}) or enter filename manually: `);
    let selectedFile;
    const num = parseInt(choice, 10);
    if (!isNaN(num) && num >= 1 && num <= files.length) {
      selectedFile = files[num - 1].replace(backupDir + '/', '');
    } else if (choice.trim()) {
      selectedFile = choice.trim();
    } else {
      console.log('\x1b[31mNo valid selection. Aborting.\x1b[0m');
      await pause();
      return;
    }

    const confirm = await ask(`⚠ This will WIPE the current database and replace it with "${selectedFile}". Continue? (y/N): `);
    if (confirm.toLowerCase() !== 'y') {
      console.log('Restore cancelled.');
      await pause();
      return;
    }

    const restoreCmd = `ssh -i "${sshKey}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${sshUser}@${vmIp} "sudo docker exec ${containerName} /app/humrine_site_linux restore_db ${selectedFile} --yes"`;
    console.log('♻ Restoring database...');
    runCommand(restoreCmd);

  } catch (err) {
    console.error('\x1b[31mError while listing or restoring backup:\x1b[0m', err.message);
    await pause();
  }
};