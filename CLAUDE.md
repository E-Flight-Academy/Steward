# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-Flight Virtual Ops is an AI-powered chat assistant for E-Flight Academy. It answers questions from students, instructors, and visitors about flight training operations.

## Tech Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS v4
- Google Gemini API for AI responses
- Scaleway Object Storage (S3) for FAQ images
- Deployed on Scaleway Serverless Containers

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

Copy `.env.example` to `.env.local` and set:
- `GEMINI_API_KEY` - Google Gemini API key (get from https://aistudio.google.com/apikey)

## Architecture

```
src/
├── app/
│   ├── api/chat/route.ts   # Gemini chat API endpoint
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (chat interface)
│   └── globals.css         # Global styles
└── components/
    └── Chat.tsx            # Chat interface component
```

The chat flow:
1. User sends message via Chat component
2. POST request to `/api/chat` with message history
3. API route forwards to Gemini API with conversation context
4. Response streamed back to Chat component

## E-Flight Gateway

Airtable calls (and later Wings/Shopify/Notion) are routed through the E-Flight Gateway — a separate Next.js API service.

- **Repo**: https://github.com/E-Flight-Academy/eflight-gateway
- **Production URL**: `https://steward18cc86cd-eflight-gateway.functions.fnc.nl-ams.scw.cloud`
- **Auth**: `Authorization: Bearer <GATEWAY_API_KEY>`
- **Endpoints**: `/api/airtable/users?email=`, `/api/airtable/search?q=`, `/api/health`

In `src/lib/airtable.ts`: if `GATEWAY_URL` + `GATEWAY_API_KEY` are set, all calls route through the gateway. Falls back to direct Airtable calls if not configured.

## Post-Feature Checklist

After completing a new feature or significant change, ask the user:
> "Moet de Steward documentatie in Notion worden bijgewerkt?"
> (Link: https://www.notion.so/eflight/Steward-Documentation-31b274a52e66809eb1f1e47a614363bc)
