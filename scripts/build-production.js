#!/usr/bin/env node

/**
 * Production Build Script
 * Comprehensive production build with optimizations and checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n🔧 ${description}...`, 'blue');
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    log(`✅ ${description} completed`, 'green');
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkEnvironmentVariables() {
  log('\n🔍 Checking frontend environment variables...', 'blue');
  
  // Only check frontend-specific variables
  const frontendEnvVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = frontendEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`⚠️  Missing frontend environment variables: ${missingVars.join(', ')}`, 'yellow');
    log('These should be set in your hosting platform (Vercel, Netlify, etc.)', 'cyan');
    log('Backend configuration is handled separately in your backend deployment.', 'cyan');
  } else {
    log('✅ Frontend environment variables check passed', 'green');
  }
}

function generateBuildInfo() {
  log('\n📝 Generating build information...', 'blue');
  
  const buildInfo = {
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    gitCommit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
    gitBranch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
    packageVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'public', 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );
  
  log('✅ Build information generated', 'green');
}

function runLighthouseAudit() {
  log('\n🔍 Running Lighthouse audit...', 'blue');
  
  try {
    // This would run after the build is complete and server is running
    log('ℹ️  Lighthouse audit will run after build completion', 'yellow');
    log('   Run: npm run audit:lighthouse', 'cyan');
  } catch (error) {
    log(`⚠️  Lighthouse audit skipped: ${error.message}`, 'yellow');
  }
}

function main() {
  log('🚀 Starting Production Build Process', 'magenta');
  log('=====================================', 'magenta');
  
  // Step 1: Environment check
  checkEnvironmentVariables();
  
  // Step 2: Clean previous builds
  execCommand('npm run clean', 'Cleaning previous builds');
  
  // Step 3: Install dependencies
  execCommand('npm ci --only=production', 'Installing production dependencies');
  
  // Step 4: Type checking
  execCommand('npm run type-check', 'Running TypeScript type check');
  
  // Step 5: Linting
  execCommand('npm run lint', 'Running ESLint');
  
  // Step 6: Security audit
  execCommand('npm run audit', 'Running security audit');
  
  // Step 7: Generate build info
  generateBuildInfo();
  
  // Step 8: Production build
  execCommand('npm run build:production', 'Building for production');
  
  // Step 9: Bundle analysis (optional)
  if (process.argv.includes('--analyze')) {
    execCommand('npm run build:analyze', 'Building with bundle analysis');
  }
  
  // Step 10: Lighthouse audit setup
  runLighthouseAudit();
  
  log('\n🎉 Production Build Complete!', 'green');
  log('=====================================', 'green');
  log('📦 Build artifacts are in the .next directory', 'cyan');
  log('🚀 Ready for deployment to AWS, Vercel, or any CDN', 'cyan');
  log('\nNext steps:', 'yellow');
  log('1. Test the production build: npm run start:production', 'white');
  log('2. Run Lighthouse audit: npm run audit:lighthouse', 'white');
  log('3. Deploy to your hosting platform', 'white');
}

if (require.main === module) {
  main();
}

module.exports = { main, checkEnvironmentVariables, generateBuildInfo };
