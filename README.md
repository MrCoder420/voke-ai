# Voke - AI-Powered Job Interview & Career Platform

Voke is a modern, AI-driven platform designed to revolutionize interview preparation and career growth. Built with **React**, **Supabase**, and powered by **Amazon Web Services (AWS)**, Voke provides real-time feedback and intelligent career insights.

## 🚀 Key Features

- **Voice & Video Interviews**: Conduct realistic mock interviews with real-time AI feedback.
- **AI Career Guidance**: personalized career paths and goal tracking.
- **Resume Analysis**: Intelligent parsing and feedback on professional profiles.
- **Job Trend Research**: Real-time market data analysis for various tech categories.
- **Coding Playground**: Integrated environment for technical interview preparation.

## 🧠 AWS Integration & AI Infrastructure

Voke leverages high-performance **AWS Cloud Infrastructure** to deliver state-of-the-art AI capabilities.

### Amazon Bedrock
The core AI engine of Voke is powered by **Amazon Bedrock**, which provides secure access to leading foundation models. We specifically utilize:

- **Model ID**: `meta.llama3-3-70b-instruct-v1:0` (Llama 3.3 70B)
- **Use Cases**:
  - **Interview Evaluation**: Deep analysis of transcripts using the **6Q Personality Framework** (IQ, EQ, CQ, AQ, SQ, MQ).
  - **Resume Parsing**: High-accuracy data extraction from professional documents.
  - **Career Mapping**: Strategic generation of career progression steps.
  - **Job Market Analysis**: Real-time research on industry trends and salary ranges.

### AWS SDK Usage
The project integrates with the AWS ecosystem using the following tools:
- `@aws-sdk/client-bedrock-runtime`: For low-latency inference and conversation management via Bedrock's Converse API.
- **Edge Deployment**: AI logic is encapsulated in Supabase Edge Functions, optimized for worldwide performance.

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion.
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **AI/LLM**: Amazon Bedrock, Groq SDK (Voice Transcription/Whisper).
- **Deployment**: Vercel & Supabase.

## 📖 Documentation Links

- [Video Interview Protocols](./README_VIDEO.md) - Deep dive into video recording and analysis.
- [Setup Guide](./SETUP_GUIDE.md) - Instructions for local development and environment variables.
- [Business Model](./BUSINESS_MODEL.md) - Overview of the platform's strategic vision.
- [Job API Integration](./JOB_API_INTEGRATION.md) - Details on external data sources.

## ⚙️ Environment Configuration

To run the project with AWS features, ensure the following keys are set in your environment:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

---
*Voke is optimized for high-performance AI interactions and secure professional data management.*
