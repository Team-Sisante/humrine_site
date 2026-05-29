// Scripts/generate-certs.js
// Cross‑platform certificate generation + host configuration.
// On Windows: triggers a UAC dialog to perform admin tasks.
// On macOS/Linux: runs admin tasks directly (requires sudo/root).

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

console.log('--- Starting Certificate Generation and Host Configuration (Node.js) ---');

// ---------------------------------------------------------------------
// 1. Load environment variables
// ---------------------------------------------------------------------
const envDevPath = path.resolve(__dirname, '..', '.env.dev');
const envDockerPath = path.resolve(__dirname, '..', '.env.docker');

console.log('Loading environment variables from both .env files...');

if (fs.existsSync(envDevPath)) {
  dotenv.config({ path: envDevPath });
  console.log('✓ Loaded .env.dev');
} else {
  console.warn('⚠ Warning: .env.dev not found');
}

let envDockerHostname = null;
if (fs.existsSync(envDockerPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envDockerPath));
  console.log('✓ Loaded .env.docker');
  envDockerHostname = envConfig.POSTE_HOSTNAME;
} else {
  console.warn('⚠ Warning: .env.docker not found');
}

// ---------------------------------------------------------------------
// 2. Collect configuration
// ---------------------------------------------------------------------
const environment = process.env.ENVIRONMENT || 'development';
const primaryEnvFile = environment === 'docker' ? '.env.docker' : '.env.dev';

const certDir = process.env.CERT_DIR || 'certs';
const certName = process.env.CERT_NAME || 'posteio';
const hostIp = process.env.HOST_IP || '127.0.0.1';

// Build set of all hostnames from both .env files, always include localhost
const hostnames = new Set(['localhost']);
const envDevHostname = process.env.POSTE_HOSTNAME;
if (envDevHostname) hostnames.add(envDevHostname);
if (envDockerHostname) hostnames.add(envDockerHostname);
const hostnamesArray = Array.from(hostnames).filter(Boolean);

const commonName = environment === 'docker' ? envDockerHostname : envDevHostname;

console.log(`\nConfiguration:`);
console.log(`  Primary environment: ${environment} (using ${primaryEnvFile})`);
console.log(`  Primary hostname (CN): ${commonName}`);
console.log(`  All hostnames (SAN): ${hostnamesArray.join(', ')}`);
console.log(`  IP: ${hostIp}`);
console.log(`  Cert Directory: ${certDir}`);
console.log(`  Cert Name: ${certName}`);

// ---------------------------------------------------------------------
// 3. Certificate generation (no admin needed)
// ---------------------------------------------------------------------
function generateCertificates() {
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Remove old certs
  const filesToRemove = [`${certName}-cert.pem`, `${certName}-key.pem`, 'ca.pem'];
  filesToRemove.forEach(file => {
    const filePath = path.join(certDir, file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  // Create OpenSSL config with multiple SAN entries
  const sanEntries = hostnamesArray.map((host, idx) => `DNS.${idx + 1} = ${host}`).join('\n');
  const sslConfig = `
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${commonName}

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
${sanEntries}
IP.1 = ${hostIp}
`;
  const configPath = path.join(certDir, 'openssl.cnf');
  fs.writeFileSync(configPath, sslConfig);

  console.log('=> Generating new certificates with OpenSSL (including SAN)...');
  try {
    execSync(
      `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "${path.join(certDir, `${certName}-key.pem`)}" -out "${path.join(certDir, `${certName}-cert.pem`)}" -config "${configPath}"`,
      { stdio: 'inherit' }
    );
    // Copy the generated cert as the CA for simplicity
    const certContent = fs.readFileSync(path.join(certDir, `${certName}-cert.pem`));
    fs.writeFileSync(path.join(certDir, 'ca.pem'), certContent);
    fs.unlinkSync(configPath);
    console.log('--- Certificate Generation Complete ---');
  } catch (error) {
    console.error('Error generating certificates:', error.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------
// 4. Privileged tasks – platform specific
// ---------------------------------------------------------------------

// ---- Windows helpers (used inside the elevated PowerShell script) ----
function buildWindowsElevatedScript() {
  const caPath = path.resolve(certDir, 'ca.pem').replace(/\\/g, '/');
  const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';

  let lines = [];

  // 4.1 Clean up old certificates – fixed extraction
  hostnamesArray.forEach(host => {
    if (host === 'localhost') return;
    lines.push(
      `Write-Host "Cleaning old '${host}' certificates..."`,
      `$serials = certutil -store Root "${host}" 2>$null | Select-String -Pattern 'Serial Number:\\s*(.*)' | ForEach-Object { $_.Matches.Groups[1].Value }`,
      `foreach ($s in $serials) { certutil -delstore Root $s 2>$null }`,
      `Write-Host "  Done."`
    );
  });

  // 4.2 Trust the CA
  lines.push(
    `Write-Host "Trusting CA certificate at ${caPath}..."`,
    `$result = certutil -addstore -f "Root" "${caPath}" 2>&1`,
    `if ($LASTEXITCODE -ne 0) { throw "certutil failed: $result" }`,
    `Write-Host "CA certificate trusted."`
  );

  // 4.3 Add host entries
  hostnamesArray.forEach(host => {
    if (host === 'localhost') return;
    const entry = `${hostIp}\t${host}`;
    lines.push(
      `Write-Host "Checking hosts file for ${host}..."`,
      `$hosts = Get-Content -Path "${hostsPath}" -ErrorAction SilentlyContinue`,
      `if (-not ($hosts -match '${host}')) {`,
      `  Add-Content -Path "${hostsPath}" -Value "\`n# Added by badminton_court project\`n${entry}\`n"`,
      `  Write-Host "Added ${host} to hosts file."`,
      `} else { Write-Host "Host ${host} already present." }`
    );
  });

  // 4.4 Clear SSL cache
  lines.push(
    `Write-Host "Clearing SSL cache..."`,
    `certutil -pulse`,
    `Write-Host "Done."`
  );

  // 4.5 Keep window open so user can read output
  lines.push(
    `Write-Host "\`nAll privileged tasks completed. Press Enter to close this window."`,
    `Read-Host`
  );

  return lines.join('\n');
}

function performWindowsPrivilegedTasks() {
  const psScript = buildWindowsElevatedScript();
  const scriptPath = path.join(os.tmpdir(), 'humrine-certs-admin.ps1');
  fs.writeFileSync(scriptPath, psScript);

  // Convert backslashes to forward slashes for use inside PowerShell command
  const scriptPathForPS = scriptPath.replace(/\\/g, '/');

  console.log('\n--- Requesting Administrator Privileges (UAC) ---');
  console.log('A UAC dialog will appear. Click "Yes" to allow certificate setup.');

  try {
    // Invoke PowerShell to launch another elevated PowerShell instance
    // that runs the temporary script.
    // The outer `powershell -NoProfile -Command` executes the Start-Process cmdlet,
    // which triggers the UAC prompt and waits for the elevated script to finish.
    execSync(
      `powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \\"${scriptPathForPS}\\""'`,
      { stdio: 'inherit' }
    );
    fs.unlinkSync(scriptPath);
    console.log('✓ Privileged tasks completed successfully.');
  } catch (error) {
    console.error('✖ Failed to execute privileged tasks.');
    console.error(error.message);
    console.error(`Temporary script kept at: ${scriptPath} for debugging.`);
    process.exit(1);
  }
}

// ---- macOS / Linux helpers (require sudo/root already) ----
function addToHostsUnix() {
  const hostsPath = '/etc/hosts';
  hostnamesArray.forEach(host => {
    if (host === 'localhost') return;
    const entry = `${hostIp}\t${host}`;
    try {
      const content = fs.readFileSync(hostsPath, 'utf8');
      if (content.includes(host)) {
        console.log(`=> Hosts file already contains an entry for '${host}'. Skipping.`);
        return;
      }
    } catch (e) { /* ignore */ }

    console.log(`=> Adding "${entry}" to hosts file...`);
    fs.appendFileSync(hostsPath, `\n# Added by badminton_court project\n${entry}\n`);
    console.log(`✓ Successfully added '${host}' to hosts file.`);
  });
}

function trustCaUnix() {
  const caPath = path.resolve(certDir, 'ca.pem');
  console.log(`=> Trusting the CA certificate at '${caPath}'...`);
  try {
    if (os.platform() === 'darwin') {
      execSync(`security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${caPath}"`, { stdio: 'inherit' });
      console.log('✓ Successfully trusted CA certificate on macOS.');
    } else {
      // Linux (Debian/Ubuntu)
      execSync(`cp "${caPath}" /usr/local/share/ca-certificates/`, { stdio: 'inherit' });
      execSync('update-ca-certificates', { stdio: 'inherit' });
      console.log('✓ Successfully trusted CA certificate on Linux.');
    }
  } catch (error) {
    console.error('✖ Failed to trust CA certificate. Are you running as root?');
    console.error(error);
    process.exit(1);
  }
}

function clearOsSslCacheUnix() {
  console.log('=> Clearing OS SSL cache...');
  console.log('✓ No cache flush needed (restart applications if necessary).');
}

// ---------------------------------------------------------------------
// 5. Main execution flow
// ---------------------------------------------------------------------

// Always generate certificates first (no admin needed)
generateCertificates();

// Then perform privileged tasks based on the platform
if (os.platform() === 'win32') {
  // Windows: use UAC via PowerShell
  performWindowsPrivilegedTasks();
} else {
  // macOS / Linux: assume the user already ran the script with sufficient privileges
  console.log('\n--- Running Privileged Host Configuration (Unix) ---');
  addToHostsUnix();
  trustCaUnix();
  clearOsSslCacheUnix();
  console.log('--- Host Configuration Finished ---');
}