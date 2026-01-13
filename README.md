# TradeX AI Invest

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-181818?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

TradeX AI Invest is an intelligent investment platform that leverages machine learning and modern web technologies to provide data-driven investment insights and portfolio optimization.

## 🚀 Features

- **AI-Powered Portfolio Analysis**: Get intelligent recommendations for your investment portfolio
- **Real-time Market Data**: Stay updated with the latest stock prices and market trends
- **Portfolio Optimization**: Advanced algorithms to optimize your asset allocation
- **Interactive Dashboard**: Beautiful and intuitive user interface
- **Secure Authentication**: Built-in user authentication and data protection

## 🛠 Tech Stack

### Frontend
- **React** with **TypeScript** for type-safe development
- **Shadcn UI** for beautiful, accessible components
- **Recharts** for interactive data visualization
- **TanStack Query** for data fetching and state management
- **Zod** for runtime type checking
- **Tailwind CSS** for styling

### Backend
- **Supabase** for authentication and database
- **Python** with **FastAPI** for backend services
- **FinRL** for reinforcement learning-based portfolio optimization
- **Pandas** and **NumPy** for data manipulation
- **yfinance** for fetching market data

### Machine Learning
- **FinRL** for reinforcement learning models
- **Scikit-learn** for traditional ML models
- **TensorFlow/PyTorch** for deep learning models
- **NLTK** for sentiment analysis of financial news

## 🏗 Project Structure

```
finrlx-ai-invest/
├── backend/               # Python backend services
│   ├── app.py            # FastAPI application
│   ├── portfolio_optimizer.py  # Portfolio optimization logic
│   └── requirements.txt   # Python dependencies
├── src/
│   ├── components/       # Reusable React components
│   ├── pages/            # Application pages
│   ├── services/         # API services
│   └── styles/           # Global styles
└── supabase/             # Supabase functions and configurations
```

## 🚀 How It Works

1. **Data Collection**:
   - Fetches real-time and historical market data using yfinance
   - Collects financial news and sentiment data
   - Aggregates portfolio data from user inputs

2. **AI Analysis**:
   - Uses reinforcement learning to optimize portfolio allocation
   - Applies sentiment analysis on financial news
   - Generates buy/sell recommendations based on ML models

3. **Portfolio Management**:
   - Tracks user's investment portfolio
   - Provides performance analytics
   - Suggests portfolio rebalancing

4. **Risk Assessment**:
   - Calculates portfolio risk metrics
   - Provides risk-adjusted return analysis
   - Suggests diversification strategies

## 🛠 Installation & Setup

### Prerequisites

- Node.js (v16 or later)
- Python 3.8+
- Supabase account
- Yarn or npm

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Update the .env file with your Supabase credentials
   ```

5. Start the backend server:
   ```bash
   uvicorn app:app --reload
   ```

### Frontend Setup

1. Navigate to the project root directory

2. Install dependencies:
   ```bash
   yarn install
   # or
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Update the .env.local file with your Supabase credentials
   ```

4. Start the development server:
   ```bash
   yarn dev
   # or
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [FinRL](https://github.com/AI4Finance-Foundation/FinRL) - For the reinforcement learning framework
- [Shadcn UI](https://ui.shadcn.com/) - For the beautiful UI components
- [Supabase](https://supabase.com/) - For the amazing backend services

---

<div align="center">
  Made with ❤️ by the TradeX Team
</div>

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

