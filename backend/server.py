"""FastAPI server for News Sentiment and Bias Analysis API."""
import asyncio
from contextlib import asynccontextmanager
import asyncpraw
from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from atproto import AsyncClient

from config import (
    REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET,
    REDDIT_USER_AGENT,
    BLUESKY_HANDLE,
    BLUESKY_APP_PASSWORD,
    OUTLETS,
    NEWS_DOMAINS,
    MAX_LEFT_ARTICLES,
    MAX_RIGHT_ARTICLES,
    MAX_TOTAL_ARTICLES,
    MIN_CONTENT_LENGTH,
)
from database import (
    init_db,
    close_db,
    create_session,
    session_exists,
    store_articles_batch,
    get_article,
    get_all_articles,
)
from sentiment import analyze_sentiment, classify_bias, generate_summary, generate_insights, chat_with_context
from utils import strip_html_tags, to_epoch_time
from search import search_news, search_reddit, search_bluesky


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Reddit client
reddit = asyncpraw.Reddit(
    client_id=REDDIT_CLIENT_ID,
    client_secret=REDDIT_CLIENT_SECRET,
    user_agent=REDDIT_USER_AGENT,
)

# Initialize Bluesky client
bluesky_client = AsyncClient()
bluesky_logged_in = False

# Global cache for scraped full content
scraped_content_cache = {}


@app.get("/")
async def root():
    return {"message": "Welcome to the News Sentiment and Bias Analysis API"}


@app.get("/search")
async def search(q: str):
    global bluesky_logged_in

    # Generate a new session ID for this search
    session_id = await create_session()
    articles_to_store = []

    # Login to Bluesky if not already logged in
    if not bluesky_logged_in:
        await bluesky_client.login(BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)
        bluesky_logged_in = True

    # Run news search, Reddit search, and Bluesky search in parallel
    news_task = asyncio.create_task(
        asyncio.to_thread(search_news, q, NEWS_DOMAINS)
    )
    reddit_task = asyncio.create_task(search_reddit(reddit, q, "all", limit=20))
    bluesky_task = asyncio.create_task(
        search_bluesky(bluesky_client, q, "top", limit=20)
    )

    # Wait for all to complete
    news_results, reddit_posts, bluesky_result = await asyncio.gather(
        news_task, reddit_task, bluesky_task
    )

    results = news_results["articles"]
    outputs = []
    left_count = 0
    right_count = 0

    for article in results:
        if len(outputs) >= MAX_TOTAL_ARTICLES:
            break

        # Find matching outlet
        outlet_info = next(
            (info for domain, info in OUTLETS.items() if domain in article["url"]), None
        )
        if not outlet_info:
            continue

        # Filter out articles with less than minimum content length
        clean_content = strip_html_tags(article["content"])
        if len(clean_content) < MIN_CONTENT_LENGTH:
            continue

        bias = outlet_info["bias"]
        source = outlet_info["source"]

        # Check if we've hit the limit for this bias type
        if bias == "left":
            if left_count >= MAX_LEFT_ARTICLES:
                continue
            left_count += 1
        else:  # right
            if right_count >= MAX_RIGHT_ARTICLES:
                continue
            right_count += 1

        sentiment, sentiment_score = analyze_sentiment(article["title"], clean_content)

        output = {
            "source": source,
            "title": article["title"],
            "url": article["url"],
            "contents": clean_content,
            "bias": bias,
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "author": article["author"],
            "date": to_epoch_time(article["publishedAt"]),
        }
        outputs.append(output)
        articles_to_store.append((article["url"], output))

    # Analyze sentiment and classify bias for Reddit posts
    bias_tasks = [
        classify_bias(
            post["title"], post.get("contents", ""), post.get("subreddit", "")
        )
        for post in reddit_posts
    ]
    biases = await asyncio.gather(*bias_tasks)

    # Add bias and sentiment to each Reddit post
    for post, bias in zip(reddit_posts, biases):
        post["bias"] = bias
        sentiment, sentiment_score = analyze_sentiment(
            post["title"], post.get("contents", "")
        )
        post["sentiment"] = sentiment
        post["sentiment_score"] = sentiment_score
        outputs.append(post)
        articles_to_store.append((post["url"], post))

    # Process Bluesky posts
    bluesky_posts = bluesky_result if bluesky_result else []

    # Analyze sentiment and classify bias for Bluesky posts
    bluesky_bias_tasks = [
        classify_bias(post["title"], post.get("contents", ""), "")
        for post in bluesky_posts
    ]
    bluesky_biases = await asyncio.gather(*bluesky_bias_tasks)

    # Add bias and sentiment to each Bluesky post
    for post, bias in zip(bluesky_posts, bluesky_biases):
        post["bias"] = bias
        sentiment, sentiment_score = analyze_sentiment(
            post["title"], post.get("contents", "")
        )
        post["sentiment"] = sentiment
        post["sentiment_score"] = sentiment_score
        outputs.append(post)
        articles_to_store.append((post["url"], post))

    # Store all articles in the database
    await store_articles_batch(session_id, articles_to_store)

    return {"session_id": session_id, "results": outputs}


@app.get("/summary")
async def summary(url: str, session_id: str):
    """Generate a summary for a given article URL."""
    # Check if the session exists
    if not await session_exists(session_id):
        raise HTTPException(
            status_code=404, detail="Session not found. Please search for content first."
        )

    # Check if the URL exists in our session
    article = await get_article(session_id, url)
    if not article:
        raise HTTPException(
            status_code=404,
            detail="URL not found in this session. Please search for content first.",
        )

    source = article.get("source", "")
    content_to_summarize = article.get("contents", "")

    # Determine if this is a news article that needs scraping
    if source in [
        "CNN",
        "CBS News",
        "NBC News",
        "ABC News",
        "Fox News",
        "Breitbart",
        "NY Post",
        "OANN",
    ]:
        # Check cache first
        if url in scraped_content_cache:
            content_to_summarize = scraped_content_cache[url]
        else:
            # Find the appropriate scraper
            scraper = None
            for domain, info in OUTLETS.items():
                if domain in url:
                    scraper = info.get("scraper")
                    break

            if scraper:
                try:
                    # Scrape the full content
                    full_content = await asyncio.to_thread(scraper, url)
                    scraped_content_cache[url] = full_content
                    content_to_summarize = full_content
                except Exception as e:
                    print(f"Error scraping {url}: {e}")
                    # Fallback to existing content
                    content_to_summarize = article.get("contents", "")

    # Generate summary using OpenAI
    try:
        title = article.get("title", "")
        summary_text = await generate_summary(title, content_to_summarize)
        return {"url": url, "title": title, "source": source, "summary": summary_text}
    except Exception as e:
        print(f"Error generating summary: {e}")
        return {"error": f"Failed to generate summary: {str(e)}"}


@app.post("/insights")
async def insights(session_id: str = Body(...), articles: list[dict] = Body(...)):
    """
    Generate key takeaways for left and right perspectives, plus common ground.

    Args:
        session_id: The session ID from the search endpoint
        articles: List of dicts with 'url' and 'bias' keys

    Returns:
        {
            "key_takeaway_left": str,
            "key_takeaway_right": str,
            "common_ground": str
        }
    """
    # Check if the session exists
    if not await session_exists(session_id):
        raise HTTPException(
            status_code=404, detail="Session not found. Please search for content first."
        )

    # Separate articles by bias
    left_articles = []
    right_articles = []

    for item in articles:
        url = item.get("url")
        bias = item.get("bias")

        article = await get_article(session_id, url)
        if not article:
            continue

        # Get full content if it's a news article
        source = article.get("source", "")
        content = article.get("contents", "")

        if source in [
            "CNN",
            "CBS News",
            "NBC News",
            "ABC News",
            "Fox News",
            "Breitbart",
            "NY Post",
            "OANN",
        ]:
            # Check cache first
            if url in scraped_content_cache:
                content = scraped_content_cache[url]
            else:
                scraper = None
                for domain, info in OUTLETS.items():
                    if domain in url:
                        scraper = info.get("scraper")
                        break

                if scraper:
                    try:
                        full_content = await asyncio.to_thread(scraper, url)
                        scraped_content_cache[url] = full_content
                        content = full_content
                    except Exception as e:
                        print(f"Error scraping {url}: {e}")

        article_data = {
            "title": article.get("title", ""),
            "source": source,
            "content": content[:2000],  # Limit content length
        }

        if bias == "left":
            left_articles.append(article_data)
        elif bias == "right":
            right_articles.append(article_data)

    # Build context strings
    left_context = "\n\n".join(
        [f"[{a['source']}] {a['title']}\n{a['content']}" for a in left_articles]
    )

    right_context = "\n\n".join(
        [f"[{a['source']}] {a['title']}\n{a['content']}" for a in right_articles]
    )

    # Generate insights using OpenAI
    try:
        insights_data = await generate_insights(left_context, right_context)

        return {
            "key_takeaway_left": insights_data.get("key_takeaway_left", ""),
            "key_takeaway_right": insights_data.get("key_takeaway_right", ""),
            "common_ground": insights_data.get("common_ground", ""),
        }
    except Exception as e:
        print(f"Error generating insights: {e}")
        return {"error": f"Failed to generate insights: {str(e)}"}


@app.post("/chat")
async def chat(session_id: str = Body(...), message: str = Body(...)):
    """
    Chat with the AI assistant based on articles in the session.
    
    Args:
        session_id: The session ID from the search endpoint
        message: User's message/question
        
    Returns:
        {
            "response": str (max 400 chars),
            "follow_up_suggestions": [
                {"short": "2-4 words", "full": "complete question"}
            ]
        }
    """
    # Check if the session exists
    if not await session_exists(session_id):
        raise HTTPException(
            status_code=404, detail="Session not found. Please search for content first."
        )
    
    # Get all articles from the session
    articles = await get_all_articles(session_id)
    
    if not articles:
        raise HTTPException(
            status_code=400, 
            detail="No articles found in this session. Please search for content first."
        )
    
    # Generate chat response with follow-up suggestions
    try:
        result = await chat_with_context(message, articles)
        return result
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return {"error": f"Failed to generate response: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000)
