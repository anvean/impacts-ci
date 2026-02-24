import * as core from '@actions/core';
import { execSync } from 'child_process';
import * as path from 'path';

async function run() {
  try {
    const baseBranch = core.getInput('base-branch') || 'main';
    const eventName = process.env.GITHUB_EVENT_NAME;
    
    // 1. Determine the correct Diff Command
    let diffCommand: string;

    if (eventName === 'pull_request') {
      // Compare the feature branch against the base branch
      diffCommand = `git diff --name-only origin/${baseBranch}...HEAD`;
      core.info(`Running in PR mode: Comparing against ${baseBranch}`);
    } else {
      // Compare the current commit against the previous one (for direct pushes to main)
      diffCommand = `git diff --name-only HEAD^ HEAD`;
      core.info(`Running in Push mode: Comparing HEAD to parent (HEAD^)`);
    }

    // 2. Get the list of changed files
    const diff = execSync(diffCommand)
      .toString()
      .split('\n')
      .filter(file => file.length > 0);

    core.info(`Files detected: ${JSON.stringify(diff)}`);

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
            // Recursive search in src/test for matching filenames
            const findCmd = `find src/test -name "${testName}"`;
            const found = execSync(findCmd).toString().split('\n').filter(f => f.trim());

            found.forEach(testPath => {
              const cleanPath = testPath.replace('./', '');
              impactedUnitTests.add(cleanPath);
              core.info(`📍 Found matching test: ${cleanPath}`);
            });
          } catch (e) {
            // No file found for this pattern
          }
        });

        // B. FEATURE/FOLDER DETECTION
        const pathParts = file.split('/');
        if (pathParts.length > 1) {
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