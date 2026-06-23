// Scripts/refactor_menu.js
const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2];
if (!targetFile) {
  console.error('Please provide the path to menu.js (e.g., Scripts/menu.js)');
  process.exit(1);
}

const code = fs.readFileSync(targetFile, 'utf8');

const sections = [];
const options = [];
const optionScriptsDir = path.join(path.dirname(targetFile), 'options');

if (!fs.existsSync(optionScriptsDir)) {
  fs.mkdirSync(optionScriptsDir, { recursive: true });
}

// 1. Extract sections
const sectionRegex = /console\.log\('\\x1b\[36m(\d+)\. ([^']+)\\x1b\[0m'\);/g;
let match;
while ((match = sectionRegex.exec(code)) !== null) {
  sections.push({
    id: parseInt(match[1], 10),
    name: match[2]
  });
}

// 2. Extract options
const optionRegex = /console\.log\('   (\d+\.\d+)\. ([^']+)'\);/g;
while ((match = optionRegex.exec(code)) !== null) {
  options.push({
    id: match[1],
    name: match[2],
    script: `option_${match[1].replace(/\./g, '_')}.js`,
    section: parseInt(match[1].split('.')[0], 10)
  });
}

// 3. Extract case blocks and write to individual files
const caseRegex = /case '(\d+\.\d+)':\n([\s\S]*?)\n\s*break;/g;
while ((match = caseRegex.exec(code)) !== null) {
  const id = match[1];
  const body = match[2].trim();
  const option = options.find(o => o.id === id);
  if (option) {
    const scriptContent = `module.exports = async function(helpers) {\n  const { runCommand, ask, pause, dc, execSync, fs, path, isWindows, sleep, os, remoteDockerComposeUp, remoteDockerComposeDownRmi, remoteDeleteImage, remoteFullCleanup, remoteDockerSystemPrune, cypressInstall, venvPath, process } = helpers;\n${body}\n};\n`;
    fs.writeFileSync(path.join(optionScriptsDir, option.script), scriptContent);
  }
}

// Add exit option manually
options.push({
  id: "0",
  name: "Exit",
  script: null,
  section: 0
});

fs.writeFileSync(path.join(path.dirname(targetFile), 'menu_sections.json'), JSON.stringify(sections, null, 2));
fs.writeFileSync(path.join(path.dirname(targetFile), 'menu_options.json'), JSON.stringify(options, null, 2));

console.log('✅ Refactor complete! Generated menu_sections.json, menu_options.json, and options/*.js');