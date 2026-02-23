import * as core from '@actions/core';
import { execSync } from 'child_process';
import * as fs from 'fs';

async function run() {
  try {
    const baseBranch = core.getInput('base-branch');
    const mappingPath = 'impact-mapping.json'; 
    
    // Load cross-repo mapping
    let e2eMapping: Record<string, string> = {};
    if (fs.existsSync(mappingPath)) {
      e2eMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    }

    // Get git diff
    const diff = execSync(`git diff --name-only origin/${baseBranch}...HEAD`)
      .toString()
      .split('\n')
      .filter(file => file.length > 0);

    const impactedUnitTests = new Set<string>();
    const impactedE2ETags = new Set<string>();

    diff.forEach(file => {
      // UNIT TESTS (Same Repo)
      // Handles .ts, .js, .java, .py
      if (!file.includes('.spec.') && !file.includes('Test.')) {
        const unitTest = file.replace(/\.(ts|js|java|py)$/, (match) => {
          return match === '.java' ? 'Test.java' : `.spec${match}`;
        });
        
        // Only add if the test file actually exists locally
        if (fs.existsSync(unitTest)) {
          impactedUnitTests.add(unitTest);
        }
      }

      // E2E/REGRESSION (Cross-Repo)
      for (const [folderPath, tag] of Object.entries(e2eMapping)) {
        if (file.startsWith(folderPath)) {
          impactedE2ETags.add(tag);
        }
      }
    });

    core.setOutput('impacted-unit', JSON.stringify([...impactedUnitTests]));
    core.setOutput('impacted-e2e', JSON.stringify([...impactedE2ETags]));

    core.info(`Found ${impactedUnitTests.size} unit tests and ${impactedE2ETags.size} E2E tags.`);

  } catch (error: any) {
    core.setFailed(`Impact-CI Error: ${error.message}`);
  }
}

run();