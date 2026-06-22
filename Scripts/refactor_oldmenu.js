// Scripts/refactor_oldmenu.js
const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, 'oldmenu.js');
if (!fs.existsSync(targetFile)) {
  console.error('❌ ERROR: oldmenu.js not found in the Scripts folder!');
  process.exit(1);
}

const code = fs.readFileSync(targetFile, 'utf8');
const options = [];
const optionScriptsDir = path.join(__dirname, 'options');

if (!fs.existsSync(optionScriptsDir)) {
  fs.mkdirSync(optionScriptsDir, { recursive: true });
}

// The Master Mapping Table
// [OldID, NewID, Name, Section]
const mapping = [
  ['1.1', '1.1', 'Start local dev', 1],
  ['1.2', '1.2', 'Start local dev (detached)', 1],
  ['1.3', '1.3', 'Stop local dev', 1],
  ['1.5', '1.4', 'Start dev tunnel', 1],

  ['13.1', '2.1', 'Create SSL certs', 2],
  ['13.2', '2.2', 'Create SSL certs (Admin)', 2],

  ['1.4', '3.1', 'Load local dev data', 3],
  ['101', '3.2', 'Fix development DB permissions', 3],
  ['102', '3.3', 'Run development migrations', 3],
  ['12.9', '3.4', 'Backup database (dumpdata)', 3],
  ['12.10', '3.5', 'Restore database from backup', 3],

  ['2.1', '4.1', 'Open Cypress interactive', 4],
  ['2.2', '4.2', 'Run Cypress (headed)', 4],
  ['2.3', '4.3', 'Run Cypress (headless)', 4],
  ['2.4', '4.4', 'Run Cypress for presentation (headed)', 4],
  ['2.5', '4.5', 'Select Cypress test for presentation', 4],
  ['2.6', '4.6', 'Post-process videos', 4],
  ['2.7', '4.7', 'Run Cypress spec (headed)', 4],
  ['2.8', '4.8', 'Wipe and recreate mail-test volume (DESTRUCTIVE)', 4],
  ['13.0', '4.9', 'Setup Linux System (Install dependencies)', 4],
  ['13.3', '4.10', 'Open shell in service', 4],
  ['13.4', '4.11', 'Print project structure', 4],
  ['13.5', '4.12', 'Encrypt env files', 4],
  ['13.6', '4.13', 'Decrypt env files', 4],
  ['13.7', '4.14', 'Create PostIO container', 4],
  ['13.8', '4.15', 'Uninstall Docker', 4],
  ['13.9', '4.16', 'Generate README', 4],
  ['13.10', '4.17', 'Search keyword in Git history', 4],
  ['13.11', '4.18', 'Generate .env from GitHub/GCP', 4],
  ['13.12', '4.19', 'Migrate to GitHub Environments', 4],
  ['13.13', '4.20', 'Migrate to GCP Secret Manager', 4],
  ['13.14', '4.21', 'Make the repository private', 4],
  ['13.15', '4.22', 'Authenticate GitHub CLI (gh auth login)', 4],
  ['13.16', '4.23', 'Update GITHUB_TOKEN in all .env files', 4],
  ['13.17', '4.24', 'Set GITHUB_TOKEN (manual or gh auth)', 4],
  ['13.18', '4.25', 'Display GitHub authentication status', 4],
  ['13.19', '4.26', 'Display current GitHub token (if authenticated via gh)', 4],
  ['13.20', '4.27', 'Open GitHub Personal Access Tokens page in browser', 4],
  ['13.21', '4.28', 'Activate local venv shell', 4],
  ['13.22', '4.29', 'Create/Recreate local venv', 4],
  ['13.25', '4.30', 'Setup/Update social media apps', 4],
  ['13.26', '4.31', 'Validate social media secrets', 4],
  ['13.27', '4.32', 'List GCP secrets', 4],
  ['13.28', '4.33', 'List GitHub Environment variables', 4],
  ['13.29', '4.34', 'Authorise PAT for SAML SSO (org)', 4],

  ['3.1', '5.1', 'Start dev environment', 5],
  ['3.2', '5.2', 'Start dev (detached)', 5],
  ['3.3', '5.3', 'Stop dev', 5],
  ['3.4', '5.4', 'Show dev logs', 5],
  ['3.5', '5.5', 'Restart web-dev', 5],
  ['3.6', '5.6', 'Start dev with certs', 5],
  ['3.7', '5.7', 'Reset and start dev', 5],
  ['3.8', '5.8', 'Force recreate dev containers', 5],
  ['4.1', '5.9', 'Start test environment', 5],
  ['4.2', '5.10', 'Start test (detached)', 5],
  ['4.3', '5.11', 'Stop test', 5],
  ['4.4', '5.12', 'Show test logs', 5],
  ['4.5', '5.13', 'Setup test data', 5],
  ['10.1', '5.14', 'Rebuild all', 5],
  ['10.2', '5.15', 'Rebuild dev', 5],
  ['10.3', '5.16', 'Rebuild test', 5],
  ['10.4', '5.17', 'Rebuild presentation', 5],
  ['10.5', '5.18', 'Show service logs', 5],
  ['10.6', '5.19', 'Open shell in service', 5],
  ['10.7', '5.20', 'Down & remove volumes - DESTRUCTIVE RESET', 5],
  ['10.8', '5.21', 'Prune unused Docker resources', 5],
  ['10.9', '5.22', 'Full reset (remove all) - DESTRUCTIVE RESET', 5],
  ['10.10', '5.23', 'Full reset (keep images) - DESTRUCTIVE RESET', 5],
  ['10.11', '5.24', 'Show service status', 5],
  ['11.1', '5.25', 'Complete system prune', 5],
  ['11.2', '5.26', 'Deep cleanup (restart Docker Desktop)', 5],
  ['11.3', '5.27', 'Factory reset Docker Desktop', 5],
  ['11.4', '5.28', 'Clean content store (fix blob errors)', 5],
  ['11.5', '5.29', 'COMPLETE Docker reset', 5],
  ['11.6', '5.30', 'Full reset and restart dev', 5],
  ['14.1', '5.31', 'Stop containers', 5],
  ['14.2', '5.32', 'Remove containers & volumes', 5],
  ['14.3', '5.33', 'Remove images', 5],
  ['14.4', '5.34', 'System prune related objects', 5],
  ['15.1', '5.35', 'Build binary image', 5],
  ['15.2', '5.36', 'Start binary env', 5],
  ['15.3', '5.37', 'Start binary env (detached)', 5],
  ['15.4', '5.38', 'Stop binary env', 5],
  ['15.5', '5.39', 'Show binary env logs', 5],
  ['15.6', '5.40', 'Reset binary env (remove volumes)', 5],

  ['9.1', '6.1', 'Build all images', 6],
  ['9.2', '6.2', 'Build all (no cache)', 6],
  ['9.3', '6.3', 'Build dev images', 6],
  ['9.4', '6.4', 'Build dev (no cache)', 6],
  ['9.5', '6.5', 'Build Cypress image', 6],
  ['9.6', '6.6', 'Build Cypress (no cache)', 6],
  ['9.7', '6.7', 'Build presentation images', 6],
  ['9.8', '6.8', 'Build presentation (no cache)', 6],
  ['12.1', '6.9', 'Backup all images', 6],
  ['12.2', '6.10', 'Restore all images', 6],
  ['12.3', '6.11', 'Backup individual images', 6],
  ['12.4', '6.12', 'Restore specific image', 6],
  ['12.5', '6.13', 'List backups', 6],
  ['12.6', '6.14', 'List backup contents', 6],
  ['12.7', '6.15', 'List backup image names', 6],
  ['12.8', '6.16', 'Save containers to Docker Hub', 6],

  ['8.1', '7.1', 'Run migrations', 7],
  ['8.2', '7.2', 'Reset DB', 7],
  ['8.3', '7.3', 'Reset DB with migrations', 7],
  ['8.4', '7.4', 'Full DB reset with test data', 7],
  ['103', '7.5', 'Fix docker DB permissions', 7],
  ['104', '7.6', 'Run docker migrations', 7],

  ['5.1', '8.1', 'Start Cypress container', 8],
  ['5.2', '8.2', 'Open Cypress in container', 8],
  ['5.3', '8.3', 'Run Cypress in container', 8],
  ['5.4', '8.4', 'Stop Cypress container', 8],
  ['5.5', '8.5', 'Run Cypress headed (new container)', 8],
  ['5.6', '8.6', 'Run Cypress headless (new container)', 8],
  ['5.7', '8.7', 'Run connectivity tests', 8],
  ['5.8', '8.8', 'Install Cypress', 8],
  ['5.9', '8.9', 'Clear Cypress cache', 8],
  ['6.1', '8.10', 'Select presentation test', 8],
  ['6.2', '8.11', 'Post-process videos', 8],
  ['6.3', '8.12', 'Run presentation spec', 8],
  ['7.1', '8.13', 'Build tunnel', 8],
  ['7.2', '8.14', 'Build tunnel (no cache)', 8],
  ['7.3', '8.15', 'Start tunnel', 8],
  ['7.4', '8.16', 'Start tunnel (detached)', 8],
  ['7.5', '8.17', 'Stop tunnel', 8],
  ['7.6', '8.18', 'Show tunnel logs', 8],
  ['14.5', '8.19', 'Compile app into Linux binary', 8],

  ['16.1', '9.1', 'Web (web-staging)', 9],
  ['16.2', '9.2', 'Database (db-test)', 9],
  ['16.3', '9.3', 'Redis', 9],
  ['16.4', '9.4', 'Mail', 9],
  ['16.5', '9.5', 'Nginx (HTTPS)', 9],
  ['16.6', '9.6', 'Start/Restart all staging containers', 9],
  ['16.7', '9.7', 'Wipe and recreate mail-staging volume (DESTRUCTIVE)', 9],

  ['18.1', '10.1', 'Web (web-staging)', 10],
  ['18.2', '10.2', 'Database (db-test)', 10],
  ['18.3', '10.3', 'Redis', 10],
  ['18.4', '10.4', 'Mail', 10],
  ['18.5', '10.5', 'Nginx (HTTPS)', 10],
  ['18.6', '10.6', 'FULL CLEAN (containers, images, volumes, cache)', 10],

  ['20.2', '11.1', 'Fix staging DB permissions', 11],
  ['20.4', '11.2', 'Run staging migrations', 11],

  ['17.1', '12.1', 'Web (web-production)', 12],
  ['17.2', '12.2', 'Database (db)', 12],
  ['17.3', '12.3', 'Redis', 12],
  ['17.4', '12.4', 'Mail', 12],
  ['17.5', '12.5', 'Nginx (HTTPS – future)', 12],
  ['17.6', '12.6', 'Start/Restart all production containers', 12],
  ['17.7', '12.7', 'Wipe and recreate mail-production volume (DESTRUCTIVE)', 12],

  ['19.1', '13.1', 'Web (web-production)', 13],
  ['19.2', '13.2', 'Database (db)', 13],
  ['19.3', '13.3', 'Redis', 13],
  ['19.4', '13.4', 'Mail', 13],
  ['19.5', '13.5', 'Nginx (HTTPS – future)', 13],
  ['19.6', '13.6', 'FULL CLEAN (containers, images, volumes, cache)', 13],

  ['20.3', '14.1', 'Fix production DB permissions', 14],
  ['20.5', '14.2', 'Run production migrations', 14],

  ['20.1', '15.1', 'Full Docker system reset (⚠ DESTROYS everything)', 15]
];

// Hardcoded bodies for the 4 new DB options (escaped properly)
const newOptionBodies = {
  '101': `runCommand("echo '🔧 Fixing development DB permissions...' && sudo chown -R $USER:$USER ./data db.sqlite3 2>/dev/null || true");`,
  '102': `runCommand("echo '🚀 Running development migrations...' && cross-env ENVIRONMENT=development python manage.py migrate");`,
  '103': `runCommand("echo '🔧 Fixing docker DB permissions...' && docker exec -u root web-dev chown -R appuser:appuser /app/data && docker restart web-dev");`,
  '104': 'runCommand(`echo \'🚀 Running docker migrations...\' && ${dc} --env-file .env.docker --profile dev exec -T web-dev python manage.py migrate`);'
};

const sections = [
  { id: 1,  name: "DEVELOPMENT CONTAINERS" },
  { id: 2,  name: "DEVELOPMENT IMAGES" },
  { id: 3,  name: "DEVELOPMENT DATABASE MANAGEMENT" },
  { id: 4,  name: "DEVELOPMENT UTILITIES" },
  { id: 5,  name: "DOCKER CONTAINERS" },
  { id: 6,  name: "DOCKER IMAGES" },
  { id: 7,  name: "DOCKER DATABASE MANAGEMENT" },
  { id: 8,  name: "DOCKER UTILITIES" },
  { id: 9,  name: "STAGING CONTAINERS" },
  { id: 10, name: "STAGING IMAGES" },
  { id: 11, name: "STAGING DATABASE MANAGEMENT" },
  { id: 12, name: "PRODUCTION CONTAINERS" },
  { id: 13, name: "PRODUCTION IMAGES" },
  { id: 14, name: "PRODUCTION DATABASE MANAGEMENT" },
  { id: 15, name: "GCP VM MANAGEMENT" }
];

let processedCount = 0;

mapping.forEach(([oldId, newId, name, section]) => {
  let body = '';
  
  if (newOptionBodies[oldId]) {
    body = newOptionBodies[oldId];
  } else {
    // Extract case block from oldmenu.js (Fixed regex for Windows/Unix line endings)
    const caseRegex = new RegExp(`case ['"]${oldId}['"]:[\\s\\S]*?\\n([\\s\\S]*?)\\n\\s*break;`);
    const match = code.match(caseRegex);
    if (match) {
      body = match[1].trim();
    } else {
      console.warn(`⚠️ Warning: Could not find case '${oldId}' in oldmenu.js. Skipping ${newId}.`);
      return; // Skip if not found (useful for Humrine site missing options)
    }
  }

  // Create the option script file
  const scriptName = `option_${newId.replace(/\./g, '_')}.js`;
  const scriptContent = `module.exports = async function(helpers) {\n  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os } = helpers;\n${body}\n};\n`;
  
  fs.writeFileSync(path.join(optionScriptsDir, scriptName), scriptContent);
  
  // Add to options JSON mapping
  options.push({
    id: newId,
    name: name,
    script: scriptName,
    section: section
  });
  
  processedCount++;
});

// Write menu_sections.json
fs.writeFileSync(path.join(__dirname, 'menu_sections.json'), JSON.stringify(sections, null, 2));

// Write menu_options.json
fs.writeFileSync(path.join(__dirname, 'menu_options.json'), JSON.stringify(options, null, 2));

console.log(`✅ Refactor complete! Generated ${processedCount} option scripts, menu_sections.json, and menu_options.json.`);