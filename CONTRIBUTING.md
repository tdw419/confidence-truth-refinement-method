# Contributing to CTRM

We enthusiastically welcome contributions to the Confidence-based Truth Refinement Method (CTRM) project! Your input, bug reports, feature requests, and code contributions are invaluable in advancing the field of self-programming and aligned AI.

Please take a moment to review this document to understand our contribution process and guidelines.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## How Can I Contribute?

### 🐛 Reporting Bugs

Bugs are an inevitable part of any complex software system. If you find a bug, please help us by [opening an issue on GitHub](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME/issues). When reporting a bug, please include:

-   A clear and concise description of the bug.
-   Steps to reproduce the behavior.
-   Expected behavior.
-   Actual behavior.
-   Any relevant error messages or logs.
-   Your environment details (OS, Node.js version, LM Studio version, etc.).

### 💡 Suggesting Enhancements

We're always looking for ways to improve CTRM. If you have an idea for a new feature or an enhancement to an existing one, please [open an issue on GitHub](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME/issues) to propose your idea. Explain:

-   What problem your suggestion solves.
-   How it might be implemented (if you have thoughts).
-   Why it would be beneficial to the project.

### 💻 Code Contributions

We follow a "fork and pull request" workflow.

1.  **Fork the repository**: Start by forking the [CTRM repository on GitHub](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME).
2.  **Clone your fork**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
    cd YOUR_REPOSITORY_NAME
    ```
3.  **Create a new branch**: Choose a descriptive name for your branch (e.g., `feature/my-new-opcode`, `fix/daemon-bug`).
    ```bash
    git checkout -b feature/your-feature-name
    ```
4.  **Make your changes**: Implement your bug fix or feature.
    -   Adhere to existing coding style and conventions (TypeScript, ESLint, Prettier).
    -   Add comments where necessary to explain complex logic.
    -   Write tests for your changes (unit tests, integration tests, CLI tests) to ensure correctness and prevent regressions.
    -   Ensure the theological review system (Truth 000) and alignment principles are respected.
5.  **Run tests and compile**: Before committing, ensure all tests pass and the project compiles without errors.
    ```bash
    npm test # If tests are implemented
    npx tsc
    ```
6.  **Commit your changes**: Write clear, concise commit messages. Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification (e.g., `feat: Add new VECTOR_ROTATE opcode`, `fix: Correct daemon cycle logic`).
    ```bash
    git add .
    git commit -m "feat: Describe your changes concisely"
    ```
7.  **Push to your fork**:
    ```bash
    git push origin feature/your-feature-name
    ```
8.  **Open a Pull Request**: Go to the original [CTRM repository on GitHub](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME) and open a new Pull Request.
    -   Provide a clear title and description of your changes.
    -   Reference any related issues (e.g., `Fixes #123`, `Closes #456`).
    -   Be responsive to feedback from maintainers.

### 📖 Documentation Contributions

Improved documentation helps everyone! If you find areas that could be clearer, more detailed, or better organized, please submit a pull request with your changes or open an issue to discuss.

### 🧪 Testing

Help us by writing more tests! Comprehensive test coverage is vital for a self-programming system. Look for areas with insufficient testing or contribute new types of tests (e.g., performance benchmarks, adversarial tests).

## Development Setup

After cloning the repository, ensure you install all dependencies and compile the project:
```bash
npm install
npx tsc
```

Thank you for contributing to CTRM!
