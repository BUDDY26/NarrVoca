# NarrVoca

Collaborators: Ruben Aleman (@BUDDY26), Silvia Osuna (@mozzarellastix)

NarrVoca is a multilingual, database-driven language reinforcement platform that delivers narrative-based comprehensible input for learners studying Spanish, Mandarin, and English. Built as an extension of the original Vocora system, NarrVoca transforms AI-generated stories into structured, interactive learning experiences with adaptive progression and performance tracking.

## About the Project
NarrVoca is based on Vocora, an AI-powered language reinforcement platform developed at UTRGV (Spring 2025, CSCI 4390).
The original Vocora system was built with:
- Next.js
- TypeScript
- Supabase (PostgreSQL)
- AI-powered story, image, audio, and feedback generation

Vocora supports:
- AI-generated short stories
- Vocabulary lists
- Writing practice with AI feedback
- Audio generation (text-to-speech)
- Image generation
- Chat-based interaction
- Real-time Supabase integration via React hooks

## What NarrVoca Adds
NarrVoca expands the base platform into a structured narrative learning engine by introducing:
- Story decomposition (stories → nodes → multilingual text)
- Grammar mapping at the node level
- Node-level vocabulary targets
- User progress tracking per node and per story
- Interaction logging for performance scoring and adaptive branching
- Spaced repetition support via vocabulary mastery tracking

## Database-Driven Design
NarrVoca introduces a structured relational database architecture that ensures:
- Data integrity across stories, grammar, vocabulary, and user progress
- Scalable multilingual support
- Extensibility for:
  - Additional languages
  - Tutoring modes
  - Analytics features

## Core Philosophy
Unlike traditional Learning Management Systems (LMS), NarrVoca organizes learning around story moments (nodes) rather than lessons or modules.

Each node represents:
- A discrete, contextual learning unit
- A vocabulary and grammar target
- A trackable interaction point

This allows for adaptive progression and personalized reinforcement.

## Tech Stack
- Frontend: Next.js + TypeScript
- Backend: Supabase (PostgreSQL)
- AI Integration: Story generation, feedback, audio, and images
- Project Structure (High-Level):
  - /app or /pages  →  Routes
  - /components     →  UI components
  - /hooks          →  Custom React hooks
  - /lib            →  Supabase client + utilities

## Running the Project Locally

1. Clone the Repository
   - git clone [https://github.com/andreag02/NarrVoca.git]

2. cd narrvoca

3. Install Dependencies
   - npm install

4. Set Up Environment Variables
   - Create a .env.local file in the root directory:
   - GOOGLE_CLIENT_ID=your_google_client_id
   - GOOGLE_CLIENT_SECRET=your_google_client_secret
   - NEXTAUTH_SECRET=your_next_auth_secret_key
   - NEXT_PUBLIC_NEXTAUTH_URL=http://localhost:3000
   - NEXT_PUBLIC_OAUTH_REDIRECT_URL=http://localhost:3000/success
   - NEXT_PUBLIC_SUPABASE_URL=your_subabase_url
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   - NEXT_PUBLIC_SHARED_USER_ID=your_supabase_shared_user_id
   - NEXT_PUBLIC_MERRIAM_API_KEY_COLLEGIATE=your_meriam_dictionary_api_key_collegitate
   - NEXT_PUBLIC_MERRIAM_API_KEY_LEARNERS=your_meriam_dictionary_api_key_learners
   - OPENAI_API_KEY=your_open_api_key
   - FIREWORKS_API_KEY=your_fireworks_api_key

5. Run Development Server
   - npm run dev
   - Then open: http://localhost:3000
