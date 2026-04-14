# Fullstack Chat App

Real-time chat application with direct messaging, group chat, AI assistant commands, and Google OAuth 2.0.

## Features

- Direct and group messaging with Socket.IO
- JWT auth with HTTP-only cookies
- Google OAuth 2.0 login (Passport)
- Image upload with Cloudinary
- AI commands:
  - `@meta` for normal AI replies
  - `@meta_pro` for context-aware replies using Pinecone vectors

## Stack

- Frontend: React, TypeScript, Vite, Zustand, Tailwind, DaisyUI
- Backend: Node.js, Express, TypeScript, Socket.IO, MongoDB (Mongoose)
- AI/RAG: Groq-compatible LLM endpoint, `@xenova/transformers`, Pinecone

## Project Structure

```text
backend/   API, auth, sockets, DB models
frontend/  React app and state stores
```

## Quick Start

1. Install and build from root:

```bash
npm run build
```

2. Create `backend/.env`:

```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

LLM_API_KEY=your_llm_api_key
LLM_MODEL=llama-3.3-70b-versatile
LLM_COMPLETIONS_URL=https://api.groq.com/openai/v1/chat/completions

PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index
PINECONE_HOST=your_pinecone_host
EMBED_MODEL=Xenova/all-MiniLM-L6-v2
EMBED_DIM=1024
```

3. Run backend:

```bash
cd backend
npm run dev
```

4. Run frontend in another terminal:

```bash
cd frontend
npm run dev
```

## Scripts

- Root:
  - `npm run build`
  - `npm start`
- Backend:
  - `npm run dev`
  - `npm start`
  - `npm test`
- Frontend:
  - `npm run dev`
  - `npm run build`
  - `npm run preview`
  - `npm run lint`
