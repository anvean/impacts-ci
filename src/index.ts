import * as core from '@actions/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  try {
    const baseBranch = core.getInput('base-branch') || 'main';
    
    const diff = execSync(`git diff --name-only origin/${baseBranch}...HEAD`)
      .toString()
      .split('\n')
      .filter(file => file.length > 0);

    const impactedUnitTests = new Set<string>();
    const impactedFeatures = new Set<string>();

    const testPatterns = [
      { suffix: 'Test', ext: ['.java', '.kt'] },
      { suffix: 'IT', ext: ['.java'] }, // Added IT support specifically for you
      { suffix: '.spec', ext: ['.ts', '.js', '.jsx'] },
      { prefix: 'test_', ext: ['.py'] }
    ];

    diff.forEach(file => {
      const ext = path.extname(file);
      const basename = path.basename(file, ext);

      // --- A. UNIT TEST DETECTION (Deep Search) ---
      testPatterns.forEach(pattern => {
        if (pattern.ext.includes(ext)) {
          let fileNameToFind = '';
          if (pattern.suffix) {
            fileNameToFind = `${basename}${pattern.suffix}${ext}`;
          } else if (pattern.prefix) {
            fileNameToFind = `${pattern.prefix}${basename}${ext}`;
          }

          if (fileNameToFind) {
            try {
              // Instead of guessing the path, we ask the OS to find the file
              // inside the 'src/test' folder recursively.
              const found = execSync(`find src/test -name "${fileNameToFind}"`)
                .toString()
                .split('\n')
                .filter(f => f.length > 0);

              found.forEach(testPath => impactedUnitTests.add(testPath));
            } catch (e) {
              // No file found with that name
            }
          }
        }
      });

      // --- B. FEATURE/E2E DETECTION ---
      const pathParts = file.split('/');
      if (pathParts.length > 1) {
        // We look for the folder name where the file sits (e.g., 'user' or 'controller')
        // This is more accurate for deep structures like yours.
        const feature = pathParts[pathParts.length - 2]; 
        const ignored = ['src', 'main', 'java', 'app', 'com', 'org', 'ecommerce'];
        
        if (feature && !ignored.includes(feature) && feature !== basename) {
          impactedFeatures.add(feature);
        }
      }
    });

    core.setOutput('impacted-unit', JSON.stringify([...impactedUnitTests]));
    core.setOutput('impacted-e2e', JSON.stringify([...impactedFeatures]));

  } catch (error: any) {
    core.setFailed(`Action Failed: ${error.message}`);
  }
}

run();