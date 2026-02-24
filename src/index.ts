import * as core from '@actions/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  try {
    const baseBranch = core.getInput('base-branch') || 'main';
    
    // 1. Get the list of changed files
    const diff = execSync(`git diff --name-only origin/${baseBranch}...HEAD`)
      .toString()
      .split('\n')
      .filter(file => file.length > 0);

    const impactedUnitTests = new Set<string>();
    const impactedFeatures = new Set<string>();

    // Generic naming patterns for tests
    const testPatterns = [
      { suffix: 'Test', ext: ['.java', '.kt'] },      // Java/Kotlin
      { suffix: '.spec', ext: ['.ts', '.js', '.jsx'] }, // Node/React
      { prefix: 'test_', ext: ['.py'] }               // Python
    ];

    diff.forEach(file => {
      const ext = path.extname(file);
      const dirname = path.dirname(file);
      const basename = path.basename(file, ext);

      // A. UNIT TEST DETECTION (Sibling/Mirror)
      testPatterns.forEach(pattern => {
        if (pattern.ext.includes(ext)) {
          let testCandidate = '';
          if (pattern.suffix) {
            // e.g., UserService.java -> UserServiceTest.java
            testCandidate = file.replace(`${basename}${ext}`, `${basename}${pattern.suffix}${ext}`);
          } else if (pattern.prefix) {
            // e.g., logic.py -> test_logic.py
            testCandidate = file.replace(basename, `${pattern.prefix}${basename}`);
          }

          // Check if sibling exists, or look in a 'test' mirror directory
          const mirrorCandidate = testCandidate.replace('src/main', 'src/test');
          
          if (fs.existsSync(testCandidate)) impactedUnitTests.add(testCandidate);
          else if (fs.existsSync(mirrorCandidate)) impactedUnitTests.add(mirrorCandidate);
        }
      });

      // B. FEATURE/E2E DETECTION (Generic Folder Extraction)
      // Grabs the first relevant directory name as a "feature tag"
      const pathParts = file.split('/');
      if (pathParts.length > 1) {
        // Skip common root folders to get to the feature (e.g., src, main, java)
        const ignored = ['src', 'main', 'java', 'app', 'com', 'org'];
        const feature = pathParts.find(part => !ignored.includes(part));
        if (feature && feature !== basename) impactedFeatures.add(feature);
      }
    });

    core.setOutput('impacted-unit', JSON.stringify([...impactedUnitTests]));
    core.setOutput('impacted-e2e', JSON.stringify([...impactedFeatures]));

  } catch (error: any) {
    core.setFailed(`Action Failed: ${error.message}`);
  }
}

run();