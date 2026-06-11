// cypress-install.js – self-contained Cypress installation helper
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function cypressInstall() {
  // 1. Read Cypress version from its own package.json (inside node_modules)
  const cypressPkgPath = path.join('node_modules', 'cypress', 'package.json');
  if (!fs.existsSync(cypressPkgPath)) {
    console.error('❌ Cypress is not installed. Run `npm install` first.');
    return;
  }
  const cypressPkg = JSON.parse(fs.readFileSync(cypressPkgPath, 'utf8'));
  const cleanVersion = cypressPkg.version;

  // 2. Build cache path (cross‑platform)
  const cacheBase = process.env.LOCALAPPDATA ||
                    (process.env.HOME ? path.join(process.env.HOME, 'Library', 'Caches') : '/tmp');
  const cacheDir = path.join(cacheBase, 'Cypress', 'Cache', cleanVersion, 'Cypress');
  const binaryPath = path.join(cacheDir, 'Cypress.exe');

  // 3. If binary already exists, just verify and exit
  if (fs.existsSync(binaryPath)) {
    console.log('✅ Cypress binary already cached. Verifying...');
    try {
      execSync('npx cypress verify', { stdio: 'inherit' });
      console.log('✅ Cypress is ready.');
    } catch (e) {
      console.error('❌ Verification failed – cache may be corrupted.');
    }
    return;
  }

  // 4. Binary not found – start manual download & extraction
  console.log('Cypress binary not found. Starting manual download & extraction...\n');

  const { default: inquirer } = await import('inquirer');

  const { mirror } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mirror',
      message: 'Select Cypress download mirror:',
      default: 'https://download.cypress.io',
      choices: [
        { name: 'Official CDN (default)', value: 'https://download.cypress.io' },
        { name: 'npmmirror.com (China)', value: 'https://cdn.npmmirror.com/binaries/cypress' },
        { name: 'Aliyun OSS (China)', value: 'https://mirrors.aliyun.com/cypress' },
        { name: 'Huawei Cloud (China)', value: 'https://mirrors.huaweicloud.com/cypress' },
        { name: 'Tencent Cloud (China)', value: 'https://mirrors.cloud.tencent.com/cypress' },
        { name: 'USTC Mirror (China)', value: 'https://mirrors.ustc.edu.cn/cypress' },
        { name: 'TUNA (Tsinghua, China)', value: 'https://mirrors.tuna.tsinghua.edu.cn/cypress' },
        { name: 'Custom URL', value: 'custom' },
      ],
    },
  ]);

  let downloadUrl = mirror;
  if (mirror === 'custom') {
    const { customUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customUrl',
        message: 'Enter the custom mirror URL:',
        validate: input => input.startsWith('http') ? true : 'Please enter a valid URL',
      },
    ]);
    downloadUrl = customUrl;
  }

  const zipUrl = `${downloadUrl}/desktop/${cleanVersion}?platform=win32&arch=x64`;
  const zipFile = 'cypress.zip';

  console.log(`📦 Downloading from: ${zipUrl}`);
  console.log('Progress will be shown with curl.\n');

  try {
    // 5. Download with curl (progress bar)
    execSync(`curl -L -# -o "${zipFile}" "${zipUrl}"`, { stdio: 'inherit' });

    // 6. Create cache directory (Node.js recursive, no shell flags)
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log(`Cache directory created: ${cacheDir}`);

    // 7. Extract the zip
    console.log('Extracting...');
    if (process.platform === 'win32') {
      // Try unzip (Git Bash usually has it), fallback to PowerShell
      try {
        execSync(`unzip -o "${zipFile}" -d "${cacheDir}"`, { stdio: 'inherit' });
      } catch {
        console.log('unzip failed, trying PowerShell Expand-Archive...');
        execSync(
          `powershell -Command "Expand-Archive -Force -Path '${zipFile}' -DestinationPath '${cacheDir}'"`,
          { stdio: 'inherit' }
        );
      }
    } else {
      // macOS / Linux – unzip is almost always available
      execSync(`unzip -o "${zipFile}" -d "${cacheDir}"`, { stdio: 'inherit' });
    }

    // 8. Move files from "Cypress/" subfolder up to cacheDir (platform‑independent)
    const extractedTop = path.join(cacheDir, 'Cypress');
    if (fs.existsSync(extractedTop) && fs.statSync(extractedTop).isDirectory()) {
      console.log('Restructuring extracted files...');
      const files = fs.readdirSync(extractedTop);
      for (const file of files) {
        const src = path.join(extractedTop, file);
        const dest = path.join(cacheDir, file);
        fs.renameSync(src, dest);
      }
      // Remove the now‑empty Cypress/ folder
      fs.rmdirSync(extractedTop);
    }

    // 9. Clean up downloaded zip
    fs.unlinkSync(zipFile);

    // 10. Verify installation
    console.log('Verifying Cypress...');
    execSync('npx cypress verify', { stdio: 'inherit' });
    console.log('✅ Cypress installed and ready.');
  } catch (err) {
    console.error('❌ Installation failed:', err.message);
    console.error('You can try again or manually run the curl + unzip commands.');
  }
}

module.exports = cypressInstall;