# Contributing to DealDigger AI

First off, thank you for considering contributing to DealDigger AI! It's people like you that make DealDigger AI such a great tool for everyone. We welcome contributions of all kinds, including bug reports, feature requests, documentation improvements, and code changes.

## Development Setup

To set up the project locally:

1. **Fork and Clone**
   Fork the repository and clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/dealdigger-ai.git
   cd dealdigger-ai
   ```

2. **Install Dependencies**
   The project uses npm as its package manager.
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory and add your Google Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the Development Server**
   Start Vite's local development server:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:5173` to see your changes.

## Testing & Linting

Before you commit or open a Pull Request, please ensure all tests and linter checks pass:

- **Tests:** Run natively using `npm run test` (Vitest powered).
- **Linting:** Validate types and style standards using `npm run lint`.

We use ESLint for static analysis to keep code consistent and bug-free. Please adhere to the warnings produced by this command.

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations, and container parameters.
3. Your PR should target the `main` branch. 
4. Include a detailed description of the changes you've made. We squash all commits when merging so make sure your PR title is descriptive!

Thanks again for contributing!
