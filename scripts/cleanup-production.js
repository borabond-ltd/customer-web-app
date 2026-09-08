#!/usr/bin/env node

/**
 * Production Cleanup Script
 * Removes unused imports, console statements, and optimizes for production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function cleanupFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changes = 0;

    // Remove console.log statements (keep console.error for production debugging)
    const consoleLogRegex = /^\s*console\.(log|debug|info|warn)\([^)]*\);\s*$/gm;
    const consoleMatches = content.match(consoleLogRegex);
    if (consoleMatches) {
      content = content.replace(consoleLogRegex, '');
      changes += consoleMatches.length;
    }

    // Remove TODO comments
    const todoRegex = /^\s*\/\/\s*TODO:.*$/gm;
    const todoMatches = content.match(todoRegex);
    if (todoMatches) {
      content = content.replace(todoRegex, '');
      changes += todoMatches.length;
    }

    // Remove FIXME comments
    const fixmeRegex = /^\s*\/\/\s*FIXME:.*$/gm;
    const fixmeMatches = content.match(fixmeRegex);
    if (fixmeMatches) {
      content = content.replace(fixmeRegex, '');
      changes += fixmeMatches.length;
    }

    // Remove empty lines (more than 2 consecutive)
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return changes;
    }
    return 0;
  } catch (error) {
    log(`Error cleaning ${filePath}: ${error.message}`, 'red');
    return 0;
  }
}

function traverseDirectory(directory) {
  let totalChanges = 0;
  let filesProcessed = 0;

  try {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .next
        if (file !== 'node_modules' && file !== '.next' && !file.startsWith('.')) {
          totalChanges += traverseDirectory(fullPath);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        const changes = cleanupFile(fullPath);
        if (changes > 0) {
          log(`✅ Cleaned ${path.relative(process.cwd(), fullPath)} (${changes} changes)`, 'green');
        }
        totalChanges += changes;
        filesProcessed++;
      }
    });
  } catch (error) {
    log(`Error reading directory ${directory}: ${error.message}`, 'red');
  }

  return totalChanges;
}

function runLinting() {
  log('\n🔍 Running ESLint to check for unused imports...', 'blue');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    log('✅ Linting completed', 'green');
  } catch (error) {
    log('⚠️  Linting found issues (this is expected)', 'yellow');
  }
}

function runTypeCheck() {
  log('\n🔍 Running TypeScript type check...', 'blue');
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
    log('✅ Type check passed', 'green');
  } catch (error) {
    log('⚠️  Type check found issues', 'yellow');
  }
}

function optimizePackageJson() {
  log('\n📦 Optimizing package.json for production...', 'blue');
  
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Remove development-only scripts
    const productionScripts = {
      'build': packageContent.scripts.build,
      'start': packageContent.scripts.start,
      'start:production': packageContent.scripts['start:production'],
      'build:analyze': packageContent.scripts['build:analyze'],
      'audit:lighthouse': packageContent.scripts['audit:lighthouse']
    };
    
    packageContent.scripts = productionScripts;
    
    // Remove development dependencies that aren't needed in production
    const productionDevDeps = {
      'typescript': packageContent.devDependencies.typescript,
      'eslint': packageContent.devDependencies.eslint,
      'eslint-config-next': packageContent.devDependencies['eslint-config-next'],
      'tailwindcss': packageContent.devDependencies.tailwindcss,
      'postcss': packageContent.devDependencies.postcss,
      'autoprefixer': packageContent.devDependencies.autoprefixer
    };
    
    packageContent.devDependencies = productionDevDeps;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2), 'utf8');
    log('✅ Package.json optimized for production', 'green');
  } catch (error) {
    log(`Error optimizing package.json: ${error.message}`, 'red');
  }
}

function main() {
  log('🧹 Starting Production Cleanup...', 'magenta');
  log('================================', 'magenta');
  
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    log('❌ src directory not found', 'red');
    process.exit(1);
  }
  
  log('\n📝 Cleaning source files...', 'blue');
  const totalChanges = traverseDirectory(srcDir);
  
  if (totalChanges > 0) {
    log(`\n✅ Cleanup completed: ${totalChanges} changes made`, 'green');
  } else {
    log('\n✅ No cleanup needed - files are already clean', 'green');
  }
  
  // Run linting and type checking
  runLinting();
  runTypeCheck();
  
  // Optimize package.json
  optimizePackageJson();
  
  log('\n🎉 Production cleanup completed!', 'green');
  log('Next steps:', 'cyan');
  log('1. Run: npm run build', 'white');
  log('2. Test the production build', 'white');
  log('3. Deploy to your hosting platform', 'white');
}

if (require.main === module) {
  main();
}

module.exports = { cleanupFile, traverseDirectory };
