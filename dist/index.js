"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function run() {
    try {
        const baseBranch = core.getInput('base-branch') || 'main';
        // 1. Get the list of changed files
        const diff = (0, child_process_1.execSync)(`git diff --name-only origin/${baseBranch}...HEAD`)
            .toString()
            .split('\n')
            .filter(file => file.length > 0);
        const impactedUnitTests = new Set();
        const impactedFeatures = new Set();
        // Generic naming patterns for tests
        const testPatterns = [
            { suffix: 'Test', ext: ['.java', '.kt'] }, // Java/Kotlin
            { suffix: '.spec', ext: ['.ts', '.js', '.jsx'] }, // Node/React
            { prefix: 'test_', ext: ['.py'] } // Python
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
                    }
                    else if (pattern.prefix) {
                        // e.g., logic.py -> test_logic.py
                        testCandidate = file.replace(basename, `${pattern.prefix}${basename}`);
                    }
                    // Check if sibling exists, or look in a 'test' mirror directory
                    const mirrorCandidate = testCandidate.replace('src/main', 'src/test');
                    if (fs.existsSync(testCandidate))
                        impactedUnitTests.add(testCandidate);
                    else if (fs.existsSync(mirrorCandidate))
                        impactedUnitTests.add(mirrorCandidate);
                }
            });
            // B. FEATURE/E2E DETECTION (Generic Folder Extraction)
            // Grabs the first relevant directory name as a "feature tag"
            const pathParts = file.split('/');
            if (pathParts.length > 1) {
                // Skip common root folders to get to the feature (e.g., src, main, java)
                const ignored = ['src', 'main', 'java', 'app', 'com', 'org'];
                const feature = pathParts.find(part => !ignored.includes(part));
                if (feature && feature !== basename)
                    impactedFeatures.add(feature);
            }
        });
        core.setOutput('impacted-unit', JSON.stringify([...impactedUnitTests]));
        core.setOutput('impacted-e2e', JSON.stringify([...impactedFeatures]));
    }
    catch (error) {
        core.setFailed(`Action Failed: ${error.message}`);
    }
}
run();
