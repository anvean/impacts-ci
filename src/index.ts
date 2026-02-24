import * as core from '@actions/core';
import { execSync } from 'child_process';
import * as path from 'path';

async function run() {
  try {
    const baseBranch = core.getInput('base-branch') || 'main';
    const before = core.getInput('before');
    const after = core.getInput('after');
    const eventName = process.env.GITHUB_EVENT_NAME;
    
    // 1. Determine the correct Diff Command
    let diffCommand: string;

    if (eventName === 'pull_request') {
      diffCommand = `git diff --name-only origin/${baseBranch}...HEAD`;
      core.info(`🚀 Mode: Pull Request (Comparing vs origin/${baseBranch})`);
    } else if (before && after && before !== '0000000000000000000000000000000000000000') {
      // Handles multi-commit pushes by comparing the "before" state to "after"
      diffCommand = `git diff --name-only ${before}...${after}`;
      core.info(`🚀 Mode: Multi-commit Push (${before.substring(0,7)}...${after.substring(0,7)})`);
    } else {
      // Fallback for single commits or initial pushes
      diffCommand = `git diff --name-only HEAD^ HEAD`;
      core.info(`🚀 Mode: Single Commit Push (HEAD^ to HEAD)`);
    }

    // 2. Execute Diff and filter empty lines
    const diff = execSync(diffCommand)
      .toString()
      .split('\n')
      .filter(file => file.length > 0);

    core.info(`Files detected in diff: ${JSON.stringify(diff)}`);

    const impactedUnitTests = new Set<string>();
    const impactedFeatures = new Set<string>();

    diff.forEach(file => {
      const ext = path.extname(file);
      const basename = path.basename(file, ext);

      // A. UNIT/INTEGRATION TEST DETECTION
      if (['.java', '.kt', '.ts', '.js', '.py'].includes(ext)) {
        const searchPatterns = [
          `${basename}Test${ext}`, 
          `${basename}IT${ext}`, 
          `test_${basename}${ext}`,
          `${basename}.spec${ext}`
        ];

        searchPatterns.forEach(testName => {
          try {
            // Find matches anywhere in src/test
            const findCmd = `find src/test -name "${testName}"`;
            const found = execSync(findCmd).toString().split('\n').filter(f => f.trim());

            found.forEach(testPath => {
              const cleanPath = testPath.replace('./', '');
              impactedUnitTests.add(cleanPath);
              core.info(`📍 Found matching test: ${cleanPath}`);
            });
          } catch (e) {
            // Silent catch if find returns nothing
          }
        });

        // B. FEATURE/FOLDER DETECTION (Generic)
        const pathParts = file.split('/');
        if (pathParts.length > 1) {
          const feature = pathParts[pathParts.length - 2];
          const ignored = ['src', 'main', 'java', 'test', 'com', 'app', 'ecommerce', 'org'];
          
          if (feature && !ignored.includes(feature) && feature !== basename) {
            impactedFeatures.add(feature);
          }
        }
      }
    });

    // 3. Set Final Outputs
    core.setOutput('impacted-unit', JSON.stringify([...impactedUnitTests]));
    core.setOutput('impacted-e2e', JSON.stringify([...impactedFeatures]));

  } catch (error: any) {
    core.setFailed(`Action Failed: ${error.message}`);
  }
}

run();