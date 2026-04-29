# naval-digital-twin

Naval Ravikant has become a kind of compass for a generation of builders. His writing on wealth, happiness, and clear thinking is passed around like scripture in tech and investing circles — a few hundred sentences that have rewired how a lot of people approach their careers, money, and minds.

Have you ever wished you had a mentor on call? Someone you could text at 11pm when you're stuck on a career decision, or at 7am when you can't shake the anxiety of too many things you want to do at once? Someone who'd answer in plain words, with no jargon, no hedging — just the thinking framework, then it's up to you?

That's what this is.

**naval-digital-twin** is a Naval Ravikant–style AI agent that lives in your iMessage. It speaks in his voice, drawing on his books, podcasts, tweets, and lectures, and applies his mental operating system — leverage, specific knowledge, desire as a contract with unhappiness, redefine the term and the conclusion follows — to whatever you're sitting with right now.

Four times a day, on your local schedule, it texts you a single thought to chew on. Anytime in between, it's there to talk. Career calls, investment decisions, the relationship you're not sure about, the book you can't finish — anything in his domain.

It's not the real Naval. It's a faithful echo, built carefully from his public work, designed to feel like the kind of conversation he'd actually have.

---

## How it works

The agent runs on iMessage via the Photon iMessage Kit, generates replies with Claude (Anthropic), and pulls grounding context from a 190-entry quote corpus distilled from *The Almanack of Naval Ravikant*, his Twitter writings, and his cognitive operating system. When a new user texts in for the first time, it asks one question: what's your local time right now? From then on, four daily insights arrive on your schedule — 8am, noon, 7pm, and 11pm your time — and a conversation is always one message away.

If you go quiet for two days, the daily push pauses on its own. Write back and it resumes.

## Stack

- TypeScript on Node 20, run via `tsx`
- Anthropic SDK (`@anthropic-ai/sdk`)
- `@photon-ai/advanced-imessage-kit` for sending and receiving iMessages
- A small in-repo retrieval pipeline (vector store + retriever + prompt templates)

## Layout

```
src/
  index.ts              # entry point: init RAG, start bot, start scheduler
  config.ts             # env-driven config
  chat/                 # iMessage bot + LLM reply engine
  daily-push/           # 60s tick scheduler + per-user quote sender
  knowledge/            # active-users store, daily quote logic, source corpus
  onboarding/           # local-time parser, UTC offset math
  rag/                  # vector store, retriever, prompt templates
```

## Configuration

Create a `.env` at the repo root:

```
PHOTON_SERVER_URL=...      # required
PHOTON_API_KEY=...         # required
ANTHROPIC_API_KEY=...      # required
INACTIVITY_DAYS=2          # optional, default 2
```

## Running

```sh
npm install
npm start            # continuous: chat + scheduled daily push
npm run dev          # tsx watch mode
npm run build        # tsc to dist/
```

## Docker

```sh
docker build -t naval-digital-twin .
docker run --env-file .env naval-digital-twin
```

## Credits

The system prompt and a portion of the quotes corpus are adapted from [alchaincyf/naval-skill](https://github.com/alchaincyf/naval-skill) (MIT). See `THIRD_PARTY_LICENSES.md` for the full notice.

This project is an unofficial tribute. Not affiliated with Naval Ravikant.
