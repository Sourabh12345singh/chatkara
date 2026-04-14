# Fullstack Chat App

A production-style real-time chat platform built with a TypeScript-first MERN architecture.  
The application supports direct messaging, group chat, online presence, media sharing, JWT authentication, and Google OAuth login, with a modern React frontend and Socket.IO-powered real-time delivery.

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [AI Assistant Modes](#ai-assistant-modes)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [API Surface](#api-surface)

## Project Overview

This repository contains a fullstack chat system organized into:

- `frontend`: React + Vite single-page application
- `backend`: Express + Socket.IO + MongoDB API server

The backend exposes REST APIs for authentication, direct conversations, and group management. Socket events are used for low-latency message delivery, online user updates, and group activity synchronization.

## Key Features

- User authentication with JWT cookies
- Google OAuth 2.0 login integration via Passport
- One-to-one chat with unread counts and read receipts
- Group chat with member management and room-based real-time updates
- Online user presence using Socket.IO
- Profile image upload support through Cloudinary
- AI assistant trigger modes with `@meta` and `@meta_pro`
- Pinecone-backed vector retrieval for contextual answers in `@meta_pro`
- TypeScript in both backend and frontend

## Architecture

### High-Level Flow

1. Frontend communicates with backend REST endpoints for auth, user lists, and chat history.
2. Frontend opens a Socket.IO connection after authentication.
3. Backend maps `userId -> socketId` for targeted event delivery.
4. Direct and group messages are persisted in MongoDB and emitted in real time.
5. State management in the client (Zustand) keeps UI, unread counts, and socket events synchronized.

### Authentication Design

- JWT is issued as an HTTP-only cookie for API session continuity.
- Google OAuth 2.0 is handled with Passport (`passport-google-oauth20`).
- OAuth callback creates the same JWT cookie flow as normal login and redirects to the frontend.

### AI Message Design

- Any message containing `@meta` triggers an AI response based on recent chat context.
- Any message containing `@meta_pro` triggers AI response plus vector retrieval context from Pinecone.
- AI replies are posted back into the same conversation/group as a system user (`metaAI`).
- Vector embeddings are persisted for both user and AI messages and scoped by conversation or group.

### Backend Layers

- `routes/`: API route definitions (`auth`, `messages`, `groups`, `google auth`)
- `controllers/`: request handlers and business logic
- `models/`: Mongoose schemas (users, messages, conversations, groups)
- `middleware/`: route protection and auth checks
- `lib/`: infrastructure helpers (DB, Socket.IO, Cloudinary, Passport, AI utilities)

### Frontend Layers

- `pages/`: route-level pages (home, auth, groups, profile, settings)
- `components/`: reusable UI units (chat container, message input, sidebar, navbar)
- `store/`: Zustand stores for auth, direct chat, group chat, and theming
- `lib/`: axios client + utility helpers
- `constants/`: API and route constants

## AI Assistant Modes

The chat supports two inline AI command modes:

- `@meta`: prompt-based assistant response using recent message history.
- `@meta_pro`: assistant response with retrieval-augmented context from Pinecone vectors.

### How It Works

1. User sends a message containing `@meta` or `@meta_pro`.
2. Backend parses intent and strips the command token.
3. Message is saved and emitted normally in real time.
4. AI worker generates a follow-up reply:
  - `@meta`: recent chat context only.
  - `@meta_pro`: recent chat context + Pinecone nearest-neighbor matches.
5. AI reply is persisted and emitted as another real-time message.

### Vector Context Rules

- Vector retrieval is enabled only when Pinecone is configured.
- Queries are filtered by scope (`conversationId` or `groupId`) and kind (`direct` or `group`).
- Returned matches are appended as context for the completion prompt.

### AI Configuration

You can configure model and endpoint with:

- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_COMPLETIONS_URL`

Vector retrieval uses:

- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `PINECONE_HOST`
- `EMBED_MODEL`
- `EMBED_DIM`

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Zustand
- Tailwind CSS
- DaisyUI
- Axios
- Socket.IO Client
- React Router
- Framer Motion

### Backend

- Node.js
- Express
- TypeScript (tsx runtime for dev/start)
- Socket.IO
- MongoDB + Mongoose
- JSON Web Token (JWT)
- Passport + `passport-google-oauth20`
- Cloudinary
- Cookie Parser, CORS, Express Session

### AI / Retrieval Utilities (Optional)

- Groq-compatible chat completion endpoint (configurable)
- `@xenova/transformers` for local embedding generation
- Pinecone vector database integration

## Monorepo Structure

```text
fullstack-chat-app/
  backend/
    src/
      controllers/
      lib/
      middleware/
      models/
      routes/
      index.ts
    test/
      chat.system.latency.test.ts
    package.json
  frontend/
    src/
      components/
      constants/
      lib/
      pages/
      store/
      App.tsx
      main.tsx
    package.json
  package.json
  README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB instance (local or cloud)

### 1) Clone and Install

```bash
git clone <your-repo-url>
cd fullstack-chat-app
npm run build
```

The root `build` script installs dependencies for both `backend` and `frontend`, then builds the frontend.

### 2) Configure Environment

Create `backend/.env` and add required values (see Environment Variables section).

### 3) Run Backend

```bash
cd backend
npm run dev
```

Backend defaults to port `5001` unless `PORT` is overridden.

### 4) Run Frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Frontend defaults to `http://localhost:5173`.

## Environment Variables

Create `backend/.env`:

```env
# Core
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Cloudinary (profile/message images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional AI / LLM
LLM_API_KEY=your_llm_api_key
LLM_MODEL=llama-3.3-70b-versatile
LLM_COMPLETIONS_URL=https://api.groq.com/openai/v1/chat/completions

# Optional Vector DB
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index
PINECONE_HOST=your_pinecone_host
EMBED_MODEL=Xenova/all-MiniLM-L6-v2
EMBED_DIM=1024
```

Notes:

- Some variables also support alternative names in code (for backward compatibility).
- Keep secrets out of source control.
- For local OAuth testing, ensure your Google OAuth callback URI includes `http://localhost:5001/api/auth/google/callback`.

## Available Scripts

### Root

- `npm run build`: install backend/frontend dependencies and build frontend
- `npm start`: start backend from root workspace

### Backend (`backend/package.json`)

- `npm run dev`: run backend with file watching (`tsx watch`)
- `npm start`: run backend once (`tsx src/index.ts`)
- `npm test`: run latency/system test suite

### Frontend (`frontend/package.json`)

- `npm run dev`: start Vite dev server
- `npm run build`: production build
- `npm run preview`: preview production build
- `npm run lint`: run ESLint

## Testing

Backend includes a latency-oriented system test:

- `backend/test/chat.system.latency.test.ts`

Run:

```bash
cd backend
npm test
```

## API Surface

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `PUT /api/auth/update-profile`
- `GET /api/auth/check`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`

Google OAuth 2.0 flow:

1. Frontend opens `GET /api/auth/google`.
2. User authenticates in Google consent screen.
3. Google redirects to `GET /api/auth/google/callback`.
4. Backend issues JWT cookie and redirects user back to frontend.

### Direct Messages

- `GET /api/messages/users`
- `GET /api/messages/unread-counts`
- `POST /api/messages/read/:id`
- `GET /api/messages/:id`
- `POST /api/messages/send/:id`

### Groups

- `POST /api/groups`
- `GET /api/groups`
- `GET /api/groups/unread-counts`
- `GET /api/groups/:groupId`
- `GET /api/groups/:groupId/messages`
- `POST /api/groups/:groupId/read`
- `POST /api/groups/:groupId/messages`
- `PUT /api/groups/:groupId`
- `POST /api/groups/:groupId/members`
- `DELETE /api/groups/:groupId/members/:userId`
- `POST /api/groups/:groupId/leave`
- `DELETE /api/groups/:groupId`
