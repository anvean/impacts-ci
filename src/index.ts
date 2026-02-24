import * as core from '@actions/core';
import { execSync } from 'child_process';
import * as path from 'path';

async function run() {
  try {
    const baseBranch = core.getInput('base-branch') || 'main';
    
    // 1. Get changed files - comparing the merge base to current HEAD
    const diff = execSync(`git diff --name-only origin/${baseBranch}...HEAD`)
      .toString()
      .split('\n')
      .filter(file => file.length > 0);

    const impactedUnitTests = new Set<string>();
    const impactedFeatures = new Set<string>();

    diff.forEach(file => {
      const ext = path.extname(file);
      const basename = path.basename(file, ext); // e.g., UserController

      // A. UNIT/INTEGRATION TEST DETECTION
      if (['.java', '.kt', '.ts', '.js', '.py'].includes(ext)) {
        // We look for common test naming conventions based on the file changed
        const possibleTestNames = [
          `${basename}Test${ext}`, 
          `${basename}IT${ext}`, 
          `test_${basename}${ext}`,
          `${basename}.spec${ext}`
        ];

        possibleTestNames.forEach(testName => {
          try {
            // Find files by name anywhere in the src/test directory
            // This ignores folder structure differences between src/main and src/test
            const findCmd = `find src/test -name "${testName}"`;
            const found = execSync(findCmd).toString().split('\n').filter(f => f.trim());

            found.forEach(testPath => {
              impactedUnitTests.add(testPath.trim());
            });
          } catch (e) {
            // No matches found for this specific pattern
          }
        });

        // B. FEATURE/FOLDER DETECTION
        const pathParts = file.split('/');
        if (pathParts.length > 1) {
          // Grabs the parent directory (e.g., 'user' in '.../user/UserController.java')
          const feature = pathParts[pathParts.length - 2];
          const ignored = ['src', 'main', 'java', 'test', 'com', 'app', 'ecommerce'];
          
          if (feature && !ignored.includes(feature) && feature !== basename) {
            impactedFeatures.add(feature);
          }
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