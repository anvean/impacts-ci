# **⚡ Impact-CI**

**Impact-CI** is a GitHub Actions plugin that intelligently detects **changed code files** and identifies **impacted tests** across repositories. It helps teams **run only the tests affected by code changes**, saving time and CI/CD resources.

---
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/anvean/impact-ci?color=green&label=version&logo=github&style=flat-square)](https://github.com/anvean/impact-ci/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://github.com/anvean/impact-ci/blob/main/LICENSE)
---

### **Smart Test Selection**

* **Unit tests:** Identifies specific spec files in the same repository as the code (supports .ts, .js, .java, .py).  
* **Regression/E2E tests:** Identifies tags or suites (Selenium, Playwright, etc.) stored in a separate repository using a mapping file.

**Impact-CI** bridges the gap between your source code and external test suites, allowing you to trigger downstream workflows only when relevant modules are touched.

---

## **🚀 Features**

* **Automated Diff Analysis:** Detects changed files in a PR or commit automatically.  
* **Language Agnostic:** Maps source files to unit tests across different languages (e.g., user.ts → user.spec.ts or User.java → UserTest.java).  
* **Cross-Repo Intelligence:** Uses an impact-mapping.json to identify tags for external repositories.  
* **JSON Outputs:** Provides clean stringified arrays for easy consumption by subsequent workflow steps.  
* **Resource Optimization:** Drastically reduces "noise" in your CI pipeline by skipping unrelated tests.

---

## **📦 Usage**

1. Create an impact-mapping.json in your root directory:  
 ```

{

  "src/auth/": "@security",

  "src/billing/": "@payments"

}
```
2. Add this to your .github/workflows/ci.yml:

```

name: CI Selective Test Runner

on:

  pull_request:

    branches: [ main ]

jobs:

  analyze:

    runs-on: ubuntu-latest

    outputs:

      unit: ${{ steps.impact.outputs.impacted-unit }}

      e2e: ${{ steps.impact.outputs.impacted-e2e }}

    steps:

      - name: Checkout code

        uses: actions/checkout@v4

        with:

          fetch-depth: 0 # Essential for git diff accuracy

      - name: Run Impact-CI

        id: impact

        uses: anvean/impact-ci@v1

        with:

          base-branch: 'main'

      - name: Run Unit Tests

        if: steps.impact.outputs.impacted-unit != '[]'

        run: |

          echo "Running unit tests: ${{ steps.impact.outputs.impacted-unit }}"

          # Example: npm test -- ${{ join(fromJSON(steps.impact.outputs.impacted-unit), ' ') }}
```
---

## **⚙️ Inputs**

| Input | Description | Required | Default |
| :---- | :---- | :---- | :---- |
| base-branch | The branch to compare the current HEAD against for changes. | ❌ | main |

## **⚙️ Outputs**

| Output | Description | Example |
| :---- | :---- | :---- |
| impacted-unit | JSON array of impacted local unit test paths. | ["src/auth.spec.ts"] |
| impacted-e2e | JSON array of tags/suites for the regression repo. | ["@security", "@payments"] |

---

## **🛠 Multi-Repo Workflow**

1. **Change Detected:** A developer pushes code to the **App Repo**.  
2. **Impact Analysis:** Impact-CI identifies that src/billing/ was modified.  
3. **Internal Test:** The App Repo runs only the billing unit tests.  
4. **External Trigger:** A repository_dispatch is sent to the **Regression Repo** with the payload ["@payments"].  
5. **Targeted E2E:** The Regression Repo (Selenium/Playwright) runs only tests tagged with @payments.

---

## **💡 Best Practices**

* **Mapping File:** Maintain your impact-mapping.json as your project grows to ensure new modules trigger the correct regression suites.  
* **Tagging:** In your regression repo, use tags that match your mapping (e.g., @security). This works regardless of whether you use **Java/Maven**, **Python/Pytest**, or **Playwright**.  
* **Shallow Clones:** Always use fetch-depth: 0 in your checkout step, otherwise the action cannot see the history required for a git diff.

---

## **📄 License**

MIT License © 2026 **Anvean Technologies**

*Helping teams ship faster and cheaper* 🚀

---

