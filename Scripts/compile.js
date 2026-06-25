#!/usr/bin/env node
/**
 * humrine_site/Scripts/compile.js – Binary Compilation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist_linux');

function compile() {
    console.log('\x1b[36m%s\x1b[0m', '🚀 Starting humrine_site binary compilation...');

    if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR, { recursive: true });
    }

    const dockerfilePath = path.join(PROJECT_ROOT, 'Dockerfile.compile');
    if (!fs.existsSync(dockerfilePath)) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Dockerfile.compile not found.');
        process.exit(1);
    }

    const BUILD_TAG = 'humrine-builder';
    const CONTAINER_NAME = 'humrine-temp-builder';

    try {
        console.log('📦 Building compilation container...');
        execSync(`docker build -t ${BUILD_TAG} -f "${dockerfilePath}" .`, {
            cwd: PROJECT_ROOT,
            stdio: 'inherit',
            env: { ...process.env, DOCKER_BUILDKIT: '1' }
        });

        console.log('🚚 Extracting binary...');
        try { execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' }); } catch (e) {}
        execSync(`docker create --name ${CONTAINER_NAME} ${BUILD_TAG}`);
        execSync(`docker cp ${CONTAINER_NAME}:/app/dist/humrine_site_linux "${DIST_DIR}/"`);

        console.log('\x1b[32m%s\x1b[0m', `✅ Binary created at ${path.join(DIST_DIR, 'humrine_site_linux')}`);
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Compilation failed!');
        console.error(error.message);
        process.exit(1);
    } finally {
        try { execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' }); } catch (e) {}
    }
}

if (require.main === module) {
    compile();
}