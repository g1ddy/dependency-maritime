# Scripts & Environment Management

This directory contains utility scripts for managing the development environment and CI/CD workflows.

## `setup.sh`

The `setup.sh` script is the **Single Source of Truth** for the development environment. It defines the exact state of a "fresh" machine required to run, build, and test this project.

### Usage

Run this script to bootstrap or repair your development environment:

```bash
./scripts/setup.sh
```

## `verify_env.sh`

Run this script to verify that the environment is correctly configured and all dependencies are present.

```bash
./scripts/verify_env.sh
```

### Configuring a Jules Environment Snapshot

Jules uses **Environment Snapshots** to speed up tasks. A snapshot is a saved state of the VM after running your setup script. This snapshot is reused for future tasks, avoiding repetitive installation steps.

#### How to Configure:

1.  **Define the Script:** Ensure `setup.sh` contains all necessary installation steps. For example:
    ```bash
    npm install
    npx playwright install chromium webkit
    npx playwright install-deps
    ```
2.  **Jules UI Setup:**
    *   Go to the **Jules Dashboard**.
    *   Select this repository under "Codebases".
    *   Click **Configuration** at the top.
    *   In the **"Initial Setup"** window, enter the command to run your script:
        ```bash
        ./scripts/setup.sh
        ```
3.  **Create Snapshot:**
    *   Click **"Run and Snapshot"**.
    *   Jules will execute the script. Upon success, it saves the environment state as a snapshot.

#### Validation Tips:
*   You can add version checks (e.g., `node -v`) to `setup.sh` to verify installations in the output logs.
*   Use the "Run to Validate" feature in the UI to catch errors early without creating a snapshot.

### What’s Pre-installed?

Jules VMs run Ubuntu Linux and come with many popular tools pre-installed, so you don't need to install them manually. These include:
*   **Languages:** Node.js, Python, Go, Java, Rust
*   **Utilities:** git, curl, jq, make, docker, gcc, clang

*Note: Even if a tool is pre-installed, it is good practice to explicitly list project-specific version requirements or critical dependencies in `setup.sh` to ensure consistency.*

### Rules for Dependency Management

1.  **No Silent Installs:** Do not manually install tools (e.g., `apt-get install`) without recording it in `setup.sh`.
2.  **The "Fix & Record" Pattern:**
    *   If you find a missing dependency, fix it locally to unblock yourself.
    *   **Immediately** add the installation command to `setup.sh`.
    *   Update the snapshot via the Jules UI.

#### Example: Adding a new system tool

If you need `jq` (and it wasn't pre-installed):

1.  Update `setup.sh`:
    ```bash
    # ... inside setup.sh
    sudo apt-get update
    sudo apt-get update
    sudo apt-get install -y jq
    ```
2.  Go to the Jules UI -> Configuration -> **Run and Snapshot**.
