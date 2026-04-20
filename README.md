# DealDigger AI

<div align="center">
  <img src="public/logo.png" alt="DealDigger AI Logo" width="200" />
</div>


DealDigger AI is an intelligent deal-hunting assistant that scours the web to unearth personalized, high-value deals tailored to your preferences. Shoppers often waste time and miss out on the best deals due to the overwhelming number of online offers, especially those that are hidden or region-specific. DealDigger AI automates the deal discovery process by leveraging Google Gemini AI and Google Search grounding to curate, verify, and monitor the best deals, preventing deal-fatigue. 

---

## Table of Contents
- [Installation & Requirements](#installation--requirements)
- [Usage Instructions & Examples](#usage-instructions--examples)
- [Technologies Used](#technologies-used)
- [Contribution Guidelines](#contribution-guidelines)
- [Testing Instructions](#testing-instructions)
- [License Information](#license-information)

---

## Installation & Requirements

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Setup Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/dhaatrik/dealdigger-ai.git
   cd dealdigger-ai
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your Google Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
   ```
4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to view the application in your browser.

---

## Usage Instructions & Examples

Upon launching the application, you can interact with DealDigger AI in several ways to find the best deals:

1. **Search for Deals:** Enter keywords in the search bar (e.g., "gaming laptops") and click "Find Deals".
2. **Apply Filters:** Open the filters panel to specify location scopes or categorize your search (e.g., Electronics, Fashion).
3. **Enable Google Search Grounding:** Toggle the "Use Google Search" option for real-time deal fetching via Gemini. If disabled, AI will generate mock contextual deal suggestions.
4. **Verify Deals:** On any generated deal card, click "Verify Deal" to let the AI assess the deal's authenticity and determine its value score.
5. **Analyze Price History:** Click "Price History" on a deal card to open a modal exhibiting recent pricing charts to visually identify the optimum purchasing window.

---

## Technologies Used

DealDigger AI is built natively for speed and scalability using a modern web development stack:

- **Frontend Framework:** React 19, TypeScript
- **Styling:** Tailwind CSS
- **Data Visualization:** Recharts (for price tracking tools)
- **AI Integration:** `@google/genai` (Google Gemini API via Web SDK)
- **Tooling & Build:** Vite, ESLint, Vitest, Node.js

---

## Contribution Guidelines

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

To contribute to this project:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

*Please ensure your code builds and passes the CI test suite prior to opening a PR.* For detailed instructions, please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file at the root of the repository.

---

## Testing Instructions

This project ensures high quality and regression safety through automated CI/CD checks powered by `Vitest` and `ESLint`.

To run tests locally:
```bash
# Run unit tests
npm run test

# Run linter
npm run lint

# To perform a production build manually
npm run build
```

---

## License Information

This repository is licensed under the MIT License. You are free to use, distribute, and modify the contents of this repository according to the obligations set inside the `LICENSE` file.
