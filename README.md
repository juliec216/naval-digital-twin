# naval-digital-twin

A Naval Ravikant–style AI agent that talks over iMessage. It answers incoming texts in Naval's voice using a small RAG pipeline over a curated corpus, and pushes a daily quote to recently-active users.

## Stack

- TypeScript on Node 20, run via `tsx`
- Anthropic SDK (`@anthropic-ai/sdk`) for the LLM
- `@photon-ai/advanced-imessage-kit` for sending/receiving iMessages
- In-repo vector store + retriever + prompt templates for RAG

## Layout

```
src/
  index.ts              # entry point: init RAG, start bot, schedule daily push
  config.ts             # env-driven config
  chat/
    imessage-bot.ts     # listens for incoming iMessages
    chat-engine.ts      # LLM reply logic
  daily-push/
    sender.ts           # sends the daily quote batch
  knowledge/
    active-users.ts     # tracks who is "active" for daily push
    daily-quotes.ts     # quote selection
    sources/            # corpus
  rag/
    vectorstore.ts
    retriever.ts
    prompt-templates.ts
```

## Configuration

Create a `.env` file at the repo root:

```
PHOTON_SERVER_URL=...      # required
PHOTON_API_KEY=...         # required
ANTHROPIC_API_KEY=...      # required
DAILY_QUOTE_TIME=08:00     # optional, 24h HH:MM, default 08:00
INACTIVITY_DAYS=2          # optional, default 2
```

`INACTIVITY_DAYS` is the cutoff after which a user is considered inactive and stops receiving daily quotes.

## Running

```sh
npm install
npm start            # continuous: bot + scheduled daily push
npm run send-now     # one-off daily push, then exit
npm run dev          # tsx watch mode
npm run build        # tsc to dist/
```

## Docker

```sh
docker build -t naval-digital-twin .
docker run --env-file .env naval-digital-twin
```
