# DocuMind AI — Smart Document Interaction
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel&logoColor=white)](https://tropangai.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Next.js%2016-Tailwind%204-blue?logo=next.js&logoColor=white)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Firebase-Realtime-orange?logo=firebase&logoColor=white)](https://firebase.google.com)

DocuMind AI is a professional-grade **Retrieval-Augmented Generation (RAG)** platform that transforms static documents into dynamic, conversational knowledge. Featuring **TropangAI**, a context-aware assistant designed to chat naturally with your PDFs, Word documents, and Excel spreadsheets.

---

##  Key Features

- ** Lightning-Fast RAG**: Optimized with Groq's high-speed inference and a custom BM25 ranking engine for instant responses.
- ** Multi-Format Support**: 
  - **PDFs**: Full text extraction and indexing.
  - **DOCX**: Seamless parsing of Word documents.
  - **XLSX**: Intelligent spreadsheet analysis and data extraction.
- ** Premium UI/UX**:
  - **Glassmorphism Design**: A sleek, modern interface built with Tailwind CSS 4.
  - **Dynamic Toasts**: Framer Motion-powered notifications for real-time feedback.
  - **High-Fidelity Markdown**: Beautiful rendering for lists, headings, and code blocks.
- ** Robust Failover**: Automatic switching between Llama 3.1, Mixtral, and Gemma models to ensure 100% uptime.
- ** Secure Authentication**: Integrated with Firebase Auth for personal document isolation.

---

##  Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Intelligence**: [Groq](https://groq.com/) via [LangChain](https://js.langchain.com/)
- **Database/Auth**: [Firebase](https://firebase.google.com/) (Firestore + Firebase Admin)
- **Parsing**: `pdf-parse`, `mammoth`, `xlsx`
- **Visualization**: [Recharts](https://recharts.org/)

---

##  Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/documind-ai.git
cd documind-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory:
```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Firebase Admin (Service Account)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# AI Intelligence
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

### 4. Run Development Server
```bash
npm run dev
```

---

##  Meet TropangAI
Unlike typical robotic assistants, **TropangAI** is tuned for natural conversation. It prioritizes clarity and directness, acting more like a smart colleague than a data auditor.

**Capabilities:**
-  Summarizing complex financial reports from Excel.
-  Explaining concepts from PDFs (e.g., Ikigai, Technical Specs).
-  Handling multiple documents simultaneously for cross-reference.

---

## ⚠️ Ownership & Usage

> [!IMPORTANT]
> **Copyright & Ownership**: This project and its source code are **strictly proprietary**. It is prohibited for others to copy, distribute, or modify this code without explicit permission. **Jun Alvior** is the sole owner of this project.

**Why is this public?**
This repository is currently set to **Public** only because I don't have the funds for hosting or private repository features right now. As I always say, *"im broke nigga"* hahaha. Please respect the code and do not kopyahin or steal the implementation.

---

*Built with  by [Jun Alvior](https://github.com/junalvior21)*
