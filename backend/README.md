# Polaryx Backend

News Sentiment and Bias Analysis API - A FastAPI backend that aggregates and analyzes news articles from multiple sources with bias classification and sentiment analysis.

## Project Structure

```
backend/
├── server.py              # FastAPI application and endpoint handlers
├── database.py            # Database operations (sessions, articles)
├── config.py              # Configuration and constants
├── sentiment.py           # Sentiment analysis and bias classification
├── utils.py               # Utility functions (text processing, time conversion)
├── search/                # Search integrations
│   ├── __init__.py
│   ├── news.py           # News API integration
│   ├── reddit.py         # Reddit API integration
│   └── bluesky.py        # Bluesky API integration
├── scrapers/             # News outlet scrapers
│   ├── cnn.py
│   ├── fox.py
│   ├── cbs.py
│   ├── nbc.py
│   ├── abc.py
│   ├── breitbart.py
│   ├── nypost.py
│   └── oann.py
├── requirements.txt      # Python dependencies
├── .env                  # Environment variables (not in git)
└── test_server.py       # API tests

```

## Module Overview

### `server.py`
Main FastAPI application with three endpoints:
- `GET /search` - Search for news across multiple sources
- `GET /summary` - Generate AI summary for an article
- `POST /insights` - Generate comparative insights from articles

### `database.py`
PostgreSQL database operations using asyncpg:
- Connection pool management
- Session creation and validation
- Article storage and retrieval

### `config.py`
Centralized configuration:
- API credentials
- News outlet definitions with bias labels
- Content limits and thresholds

### `sentiment.py`
AI-powered analysis:
- Sentiment analysis using VADER
- Bias classification using OpenAI GPT-4o-mini
- Summary generation
- Insights generation

### `utils.py`
Helper functions:
- HTML tag stripping
- ISO timestamp to epoch conversion

### `search/`
Platform-specific search integrations:
- `news.py` - News API with automatic key rotation
- `reddit.py` - Reddit API via asyncpraw
- `bluesky.py` - Bluesky AT Protocol API

### `scrapers/`
News outlet content scrapers for full article extraction

## API Endpoints

### Search
```http
GET /search?q=query
```
Returns a session_id and search results from news outlets, Reddit, and Bluesky.

### Summary
```http
GET /summary?url=article_url&session_id=session_id
```
Generates a 3-5 sentence summary of the article.

### Insights
```http
POST /insights
Content-Type: application/json

{
  "session_id": "uuid",
  "articles": [
    {"url": "...", "bias": "left"},
    {"url": "...", "bias": "right"}
  ]
}
```
Returns key takeaways from left and right perspectives plus common ground.

### Chat
```http
POST /chat
Content-Type: application/json

{
  "session_id": "uuid",
  "message": "What are the main perspectives on this topic?"
}
```
Returns an AI-generated response (under 400 chars) based on all articles in the session, plus 0-3 follow-up suggestions with short UI labels:
```json
{
  "response": "The debate centers around...",
  "follow_up_suggestions": [
    {
      "short": "Conservative view?",
      "full": "What do conservative sources say about this?"
    },
    {
      "short": "Compare to 2020?",
      "full": "How does this situation compare to what happened in 2020?"
    }
  ]
}
```

**UI Usage:** Display `short` as clickable buttons, send `full` as the next message when clicked.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
BLUESKY_HANDLE=...
BLUESKY_APP_PASSWORD=...
NEWS_API_KEY1=...
```

3. Run the server:
```bash
python server.py
```

## Testing

Run the test suite:
```bash
python test_server.py
```

## Database Schema

### sessions
- `session_id` (UUID, PK)
- `created_at` (TIMESTAMP)

### articles
- `id` (SERIAL, PK)
- `session_id` (UUID, FK)
- `url` (TEXT)
- `data` (JSONB)
- Unique constraint on (session_id, url)
