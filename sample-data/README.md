# Sample Data Generation

This directory contains instructions on how to generate the dependency graph data required for Dependency Maritime.

## Generating the Data

To visualize a project's architecture, you need to generate a JSON report using `dependency-cruiser`.

1.  Navigate to the root directory of the **target application** you want to analyze.
2.  Run the following command:

    ```bash
    npx dependency-cruiser src --output-type json > maritime-sample.json
    ```

    *   `src`: This argument specifies the directory to scan. Adjust this if your source code is located elsewhere (e.g., `lib`, `app`).
    *   `--output-type json`: This flag ensures the output is in the JSON format that Dependency Maritime expects.
    *   `> maritime-sample.json`: This redirects the output to a file named `maritime-sample.json`.

3.  The resulting `maritime-sample.json` file contains the raw dependency data.

## Usage

Currently, this generated file is used for testing and development purposes.

### Future Capabilities

In a future phase, the Dependency Maritime application will include a UI feature allowing users to directly upload this `maritime-sample.json` file to visualize their codebase.
