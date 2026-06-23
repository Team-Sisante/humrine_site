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

// Bulletproof function to extract case body
function extractCaseBody(sourceCode, caseId) {
  // Match from this case to the next case, default, or end of switch
  const regex = new RegExp(`case ['"]${caseId}['"]:[\\s\\S]*?(?=\\n\\s*case ['"]|\\n\\s*default:|\\n\\s*\\}\\s*\\n)`);
  const match = sourceCode.match(regex);
  if (!match) return null;
  
  let body = match[0];
  
  // Remove the "case 'X.Y':" prefix
  body = body.replace(new RegExp(`case ['"]${caseId}['"]:`), '').trim();
  
  // Replace all 'break;' with 'return;' so they are valid inside an async function
  body = body.replace(/\bbreak\s*;/g, 'return;');

  // Remove leading { if present
  if (body.startsWith('{')) {
    body = body.slice(1).trim();
  }

  // Remove trailing } if present (if the case was wrapped in a block)
  if (body.endsWith('}')) {
    body = body.slice(0, -1).trim();
  }

  // Remove the trailing return; that was the original case break
  body = body.replace(/\n\s*return\s*;\s*$/, '').trim();

  return body;
}

// The Master Mapping Table
// [OldID, NewID, Name, Section]
const mapping = [
  // --- 1. DEVELOPMENT CONTAINERS (Uniform 1-8) ---
  ['1.2', '1.1', 'Web', 1],
  ['1.2', '1.2', 'Database', 1], 
  ['1.2', '1.3', 'Redis', 1],
  ['1.2', '1.4', 'Mail', 1],
  ['101', '1.5', 'Nginx (not applicable)', 1],
  ['1.2', '1.6', 'Start/Restart all development containers', 1],
  ['2.8', '1.7', 'Wipe and recreate mail-test volume (DESTRUCTIVE)', 1],
  ['1.3', '1.8', 'Stop local dev', 1],
  ['1.1', '1.9', 'Start local dev (foreground)', 1],
  ['1.5', '1.10', 'Start dev tunnel', 1],
  
  // --- 2. DEVELOPMENT IMAGE MANAGEMENT (Uniform 1-6) ---
  ['201', '2.1', 'Delete Web image (not applicable)', 2],
  ['201', '2.2', 'Delete Database image (not applicable)', 2],
  ['201', '2.3', 'Delete Redis image (not applicable)', 2],
  ['201', '2.4', 'Delete Mail image (not applicable)', 2],
  ['201', '2.5', 'Delete Nginx image (not applicable)', 2],
  ['11.1', '2.6', 'FULL CLEAN (delete all containers, images, volumes, cache)', 2],
  ['12.1', '2.7', 'Backup all images', 2],
  ['12.2', '2.8', 'Restore all images', 2],
  ['12.3', '2.9', 'Backup individual images', 2],
  ['12.4', '2.10', 'Restore specific image', 2],
  ['12.5', '2.11', 'List backups', 2],
  ['12.6', '2.12', 'List backup contents', 2],
  ['12.7', '2.13', 'List backup image names', 2],
  ['12.8', '2.14', 'Save containers to Docker Hub', 2],

  // --- 3. DEVELOPMENT DATABASE MANAGEMENT ---
  ['102', '3.1', 'Fix development DB permissions (not applicable)', 3],
  ['2.2', '3.2', 'Run development migrations', 3], 
  ['1.4', '3.3', 'Load local dev data', 3],
  ['12.9', '3.4', 'Backup database (dumpdata)', 3],
  ['12.10', '3.5', 'Restore database from backup', 3],

  // --- 4. DEVELOPMENT UTILITIES ---
  ['2.1', '4.1', 'Open Cypress interactive', 4],
  ['2.3', '4.2', 'Run Cypress (headless)', 4],
  ['2.4', '4.3', 'Run Cypress for presentation (headed)', 4],
  ['2.5', '4.4', 'Select Cypress test for presentation', 4],
  ['2.6', '4.5', 'Post-process videos', 4],
  ['2.7', '4.6', 'Run Cypress spec (headed)', 4],
  ['13.0', '4.7', 'Setup Linux System (Install dependencies)', 4],
  ['13.1', '4.8', 'Create SSL certs', 4],
  ['13.2', '4.9', 'Create SSL certs (Admin)', 4],
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

  // --- 5. DOCKER CONTAINERS (Uniform 1-8) ---
  ['3.1', '5.1', 'Web', 5],
  ['3.1', '5.2', 'Database', 5],
  ['3.1', '5.3', 'Redis', 5],
  ['3.1', '5.4', 'Mail', 5],
  ['3.1', '5.5', 'Nginx', 5],
  ['3.2', '5.6', 'Start/Restart all docker containers', 5],
  ['103', '5.7', 'Wipe and recreate mail-docker volume (not applicable)', 5],
  ['3.3', '5.8', 'Stop dev', 5],
  ['3.4', '5.9', 'Show dev logs', 5],
  ['3.5', '5.10', 'Restart web-dev', 5],
  ['3.6', '5.11', 'Start dev with certs', 5],
  ['3.7', '5.12', 'Reset and start dev', 5],
  ['3.8', '5.13', 'Force recreate dev containers', 5],
  ['4.1', '5.14', 'Start test environment', 5],
  ['4.2', '5.15', 'Start test (detached)', 5],
  ['4.3', '5.16', 'Stop test', 5],
  ['4.4', '5.17', 'Show test logs', 5],
  ['4.5', '5.18', 'Setup test data', 5],
  ['10.1', '5.19', 'Rebuild all', 5],
  ['10.2', '5.20', 'Rebuild dev', 5],
  ['10.3', '5.21', 'Rebuild test', 5],
  ['10.4', '5.22', 'Rebuild presentation', 5],
  ['10.5', '5.23', 'Show service logs', 5],
  ['10.6', '5.24', 'Open shell in service', 5],
  ['10.7', '5.25', 'Down & remove volumes - DESTRUCTIVE RESET', 5],
  ['10.8', '5.26', 'Prune unused Docker resources', 5],
  ['10.9', '5.27', 'Full reset (remove all) - DESTRUCTIVE RESET', 5],
  ['10.10', '5.28', 'Full reset (keep images) - DESTRUCTIVE RESET', 5],
  ['10.11', '5.29', 'Show service status', 5],
  ['11.1', '5.30', 'Complete system prune', 5],
  ['11.2', '5.31', 'Deep cleanup (restart Docker Desktop)', 5],
  ['11.3', '5.32', 'Factory reset Docker Desktop', 5],
  ['11.4', '5.33', 'Clean content store (fix blob errors)', 5],
  ['11.5', '5.34', 'COMPLETE Docker reset', 5],
  ['11.6', '5.35', 'Full reset and restart dev', 5],
  ['14.1', '5.36', 'Stop containers', 5],
  ['14.2', '5.37', 'Remove containers & volumes', 5],
  ['14.3', '5.38', 'Remove images', 5],
  ['14.4', '5.39', 'System prune related objects', 5],
  ['15.1', '5.40', 'Build binary image', 5],
  ['15.2', '5.41', 'Start binary env', 5],
  ['15.3', '5.42', 'Start binary env (detached)', 5],
  ['15.4', '5.43', 'Stop binary env', 5],
  ['15.5', '5.44', 'Show binary env logs', 5],
  ['15.6', '5.45', 'Reset binary env (remove volumes)', 5],

  // --- 6. DOCKER IMAGE MANAGEMENT (Uniform 1-6) ---
  ['201', '6.1', 'Delete Web image (not applicable)', 6],
  ['201', '6.2', 'Delete Database image (not applicable)', 6],
  ['201', '6.3', 'Delete Redis image (not applicable)', 6],
  ['201', '6.4', 'Delete Mail image (not applicable)', 6],
  ['201', '6.5', 'Delete Nginx image (not applicable)', 6],
  ['14.3', '6.6', 'FULL CLEAN (delete all containers, images, volumes, cache)', 6],
  ['9.1', '6.7', 'Build all images', 6],
  ['9.2', '6.8', 'Build all (no cache)', 6],
  ['9.3', '6.9', 'Build dev images', 6],
  ['9.4', '6.10', 'Build dev (no cache)', 6],
  ['9.5', '6.11', 'Build Cypress image', 6],
  ['9.6', '6.12', 'Build Cypress (no cache)', 6],
  ['9.7', '6.13', 'Build presentation images', 6],
  ['9.8', '6.14', 'Build presentation (no cache)', 6],

  // --- 7. DOCKER DATABASE MANAGEMENT ---
  ['104', '7.1', 'Fix docker DB permissions (not applicable)', 7],
  ['8.1', '7.2', 'Run docker migrations', 7],
  ['8.2', '7.3', 'Reset DB', 7],
  ['8.3', '7.4', 'Reset DB with migrations', 7],
  ['8.4', '7.5', 'Full DB reset with test data', 7],

  // --- 8. DOCKER UTILITIES ---
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

  // --- 9. STAGING CONTAINERS (Uniform 1-8) ---
  ['16.1', '9.1', 'Web', 9],
  ['16.2', '9.2', 'Database', 9],
  ['16.3', '9.3', 'Redis', 9],
  ['16.4', '9.4', 'Mail', 9],
  ['16.5', '9.5', 'Nginx', 9],
  ['16.6', '9.6', 'Start/Restart all staging containers', 9],
  ['16.7', '9.7', 'Wipe and recreate mail-staging volume (DESTRUCTIVE)', 9],

  // --- 10. STAGING IMAGE MANAGEMENT (Uniform 1-6) ---
  ['18.1', '10.1', 'Delete Web image', 10],
  ['18.2', '10.2', 'Delete Database image', 10],
  ['18.3', '10.3', 'Delete Redis image', 10],
  ['18.4', '10.4', 'Delete Mail image', 10],
  ['18.5', '10.5', 'Delete Nginx image', 10],
  ['18.6', '10.6', 'FULL CLEAN (delete all containers, images, volumes, cache)', 10],

  // --- 11. STAGING DATABASE MANAGEMENT ---
  ['20.2', '11.1', 'Fix staging DB permissions', 11],
  ['20.4', '11.2', 'Run staging migrations', 11],

  // --- 12. PRODUCTION CONTAINERS (Uniform 1-8) ---
  ['17.1', '12.1', 'Web', 12],
  ['17.2', '12.2', 'Database', 12],
  ['17.3', '12.3', 'Redis', 12],
  ['17.4', '12.4', 'Mail', 12],
  ['17.5', '12.5', 'Nginx', 12],
  ['17.6', '12.6', 'Start/Restart all production containers', 12],
  ['17.7', '12.7', 'Wipe and recreate mail-production volume (DESTRUCTIVE)', 12],

  // --- 13. PRODUCTION IMAGE MANAGEMENT (Uniform 1-6) ---
  ['19.1', '13.1', 'Delete Web image', 13],
  ['19.2', '13.2', 'Delete Database image', 13],
  ['19.3', '13.3', 'Delete Redis image', 13],
  ['19.4', '13.4', 'Delete Mail image', 13],
  ['19.5', '13.5', 'Delete Nginx image', 13],
  ['19.6', '13.6', 'FULL CLEAN (delete all containers, images, volumes, cache)', 13],

  // --- 14. PRODUCTION DATABASE MANAGEMENT ---
  ['20.3', '14.1', 'Fix production DB permissions', 14],
  ['20.5', '14.2', 'Run production migrations', 14],

  // --- 15. GCP VM MANAGEMENT ---
  ['20.1', '15.1', 'Full Docker system reset (⚠ DESTROYS everything)', 15]
];

// Hardcoded bodies for the new dummy options
const newOptionBodies = {
  '101': "console.log('⚠️ Not applicable: Development runs directly on your host machine. No permission fix is needed.');",
  '102': "console.log('⚠️ Not applicable: Development runs directly on your host machine. No permission fix is needed.');",
  '103': "console.log('⚠️ Not applicable: Docker dev/test containers manage permissions automatically. If corrupted, rebuild the container.');",
  '104': "console.log('⚠️ Not applicable: Docker dev/test containers manage permissions automatically. If corrupted, rebuild the container.');",
  '201': "console.log('⚠️ Not applicable: Individual image deletion is not used for local environments. Use FULL CLEAN instead.');"
};

const sections = [
  { id: 1,  name: "DEVELOPMENT CONTAINERS (start/restart)" },
  { id: 2,  name: "DEVELOPMENT IMAGE MANAGEMENT" },
  { id: 3,  name: "DEVELOPMENT DATABASE MANAGEMENT" },
  { id: 4,  name: "DEVELOPMENT UTILITIES" },
  { id: 5,  name: "DOCKER CONTAINERS (start/restart)" },
  { id: 6,  name: "DOCKER IMAGE MANAGEMENT" },
  { id: 7,  name: "DOCKER DATABASE MANAGEMENT" },
  { id: 8,  name: "DOCKER UTILITIES" },
  { id: 9,  name: "STAGING CONTAINERS (start/restart)" },
  { id: 10, name: "STAGING IMAGE MANAGEMENT" },
  { id: 11, name: "STAGING DATABASE MANAGEMENT" },
  { id: 12, name: "PRODUCTION CONTAINERS (start/restart)" },
  { id: 13, name: "PRODUCTION IMAGE MANAGEMENT" },
  { id: 14, name: "PRODUCTION DATABASE MANAGEMENT" },
  { id: 15, name: "GCP VM MANAGEMENT" }
];

let processedCount = 0;

mapping.forEach(([oldId, newId, name, section]) => {
  let body = '';
  
  if (newOptionBodies[oldId]) {
    body = newOptionBodies[oldId];
  } else {
    body = extractCaseBody(code, oldId);
    if (!body) {
      console.warn(`⚠️ Warning: Could not find case '${oldId}' in oldmenu.js. Skipping ${newId}.`);
      return; // Skip if not found
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