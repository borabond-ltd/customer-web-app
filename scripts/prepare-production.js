#!/usr/bin/env node

/**
 * Production Preparation Script
 * Removes development logs and prepares the app for production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '../src');

// Files to exclude from console log removal
const EXCLUDE_FILES = [
  'lib/logger.ts', // Our logger utility
  'scripts/', // Script files
  '.test.', // Test files
  '.spec.', // Spec files
];

// Console methods to replace
const CONSOLE_METHODS = ['log', 'debug', 'info', 'warn'];

function shouldExcludeFile(filePath) {
  return EXCLUDE_FILES.some(exclude => filePath.includes(exclude));
}

function replaceConsoleStatements(filePath) {
  if (shouldExcludeFile(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file already imports logger
  const hasLoggerImport = content.includes("import { logger } from '@/lib/logger'") || 
                         content.includes('import { logger } from "@/lib/logger"');

  // Replace console statements
  CONSOLE_METHODS.forEach(method => {
    const regex = new RegExp(`console\\.${method}`, 'g');
    if (content.includes(`console.${method}`)) {
      content = content.replace(regex, `logger.${method}`);
      modified = true;
    }
  });

  // Replace console.error (always keep errors)
  if (content.includes('console.error')) {
    content = content.replace(/console\.error/g, 'logger.error');
    modified = true;
  }

  // Add logger import if needed and file was modified
  if (modified && !hasLoggerImport) {
    // Find the last import statement
    const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      
      content = content.slice(0, insertIndex) + 
                "\nimport { logger } from '@/lib/logger'" + 
                content.slice(insertIndex);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${path.relative(SRC_DIR, filePath)}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      replaceConsoleStatements(filePath);
    }
  });
}

function main() {
  console.log('🚀 Starting production preparation...');
  console.log('📝 Removing development console logs...');
  
  processDirectory(SRC_DIR);
  
  console.log('✅ Console log removal complete!');
  console.log('🔧 Next steps:');
  console.log('   1. Check environment variables');
  console.log('   2. Run production build');
  console.log('   3. Verify no warnings');
}

if (require.main === module) {
  main();
}

module.exports = { processDirectory, replaceConsoleStatements };
