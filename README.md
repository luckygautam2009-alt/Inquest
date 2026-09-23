# INQUEST — AI Complaint Investigation & Intelligent Handoff System

> **Team**: Code-Crusaders | Noda Institute of Engineering and Technology

INQUEST is an AI-powered complaint resolution system where every customer complaint is autonomously investigated against evidence (orders, payments, tickets, return policies) before deciding whether to auto-resolve, ask the customer for confirmation, or escalate to a human with full contextual intelligence.

---

## 🏗️ Project Architecture

```
Inquest/
├── inquest-backend/     # Node.js + Express + Google Gemini API pipeline
│   ├── src/
│   │   ├── config/      # Environment & configuration
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Security, rate-limiting, error handling
│   │   ├── mockData/    # Mock customers, orders, policies
│   │   ├── routes/      # REST API endpoints
│   │   ├── services/    # Engines: Intent, Root Cause, Decision, Handoff
│   │   └── utils/
│   └── package.json
│
└── inquest-frontend/    # React 19 + Vite + Tailwind CSS + React Flow UI
    ├── src/
    │   ├── api/         # Backend API client
    │   ├── components/  # Evidence graph, handoff cards, status indicators
    │   └── ...
    └── package.json
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd inquest-backend
npm install
cp .env.example .env    # Configure your GEMINI_API_KEY
npm run dev
```

Backend will run on [http://localhost:5001](http://localhost:5001).

### 2. Frontend Setup

```bash
cd inquest-frontend
npm install
npm run dev
```

Frontend will run on [http://localhost:5173](http://localhost:5173).

---

## ⚡ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, ReactFlow
- **Backend**: Node.js, Express, Helmet, CORS, Express Rate Limit
- **AI / LLM**: Google Gemini API (`@google/generative-ai`)
