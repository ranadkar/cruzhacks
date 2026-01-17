import asyncio
import os
import re
import uvicorn
from datetime import datetime

import asyncpraw
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from reddit_sentiment import search_reddit
from bluesky import search_bluesky
from scrapers.cnn import fetch_cnn
from scrapers.fox import fetch_fox
from scrapers.cbs import fetch_cbs
from scrapers.nbc import fetch_nbc
from scrapers.abc import fetch_abc
from scrapers.breitbart import fetch_breitbart
from scrapers.nypost import fetch_nypost
from scrapers.oann import fetch_oann
from search_news import search_news
from atproto import AsyncClient

load_dotenv()


def strip_html_tags(text: str) -> str:
    """Remove HTML tags from text."""
    if not text:
        return text
    # Remove HTML tags
    clean_text = re.sub(r"<[^>]+>", "", text)
    # Normalize all whitespace (spaces, newlines, tabs, etc.) to single spaces
    clean_text = re.sub(r"\s+", " ", clean_text)
    # Clean up extra whitespace at start/end
    clean_text = clean_text.strip()
    return clean_text


def to_epoch_time(iso_timestamp: str) -> int:
    """Convert ISO 8601 UTC timestamp to epoch time."""
    if not iso_timestamp:
        return 0
    # Parse ISO 8601 format like "2026-01-16T22:36:55Z"
    dt = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
    return int(dt.timestamp())


client = OpenAI()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

reddit = asyncpraw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT"),
)

bluesky_client = AsyncClient()
bluesky_logged_in = False

sentiment_analyzer = SentimentIntensityAnalyzer()

# Global storage for articles keyed by URL
articles_by_url = {}

# Outlet configuration mapping
OUTLETS = {
    "cnn.com": {"source": "CNN", "bias": "left"},
    "cbsnews.com": {"source": "CBS News", "bias": "left"},
    "nbcnews.com": {"source": "NBC News", "bias": "left"},
    "abcnews.go.com": {"source": "ABC News", "bias": "left"},
    "foxnews.com": {"source": "Fox News", "bias": "right"},
    "breitbart.com": {"source": "Breitbart", "bias": "right"},
    "nypost.com": {"source": "NY Post", "bias": "right"},
    "oann.com": {"source": "OANN", "bias": "right"},
}


def analyze_sentiment(title: str, content: str) -> tuple[str, float]:
    """Analyze sentiment of text and return category and score."""
    text_content = title + " " + (content or "")
    sentiment_scores = sentiment_analyzer.polarity_scores(text_content)
    compound_score = sentiment_scores["compound"]

    sentiment_category = (
        "positive"
        if compound_score >= 0.05
        else "negative"
        if compound_score <= -0.05
        else "neutral"
    )

    return sentiment_category, compound_score


async def classify_bias(title: str, content: str, subreddit: str = "") -> str:
    """Use OpenAI to classify political bias of a post as 'left' or 'right'."""
    try:
        subreddit_info = f"\nSubreddit: r/{subreddit}" if subreddit else ""
        prompt = f"""Analyze the political bias of this social media post. Classify it as either 'left' (liberal/progressive) or 'right' (conservative).

Title: {title}
Content: {content[:500]}{subreddit_info}

Respond with ONLY one word: either 'left' or 'right'."""

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )

        bias = response.choices[0].message.content.strip().lower()
        return bias if bias in ["left", "right"] else "left"
    except Exception as e:
        print(f"Error classifying bias: {e}")
        return "left"


@app.get("/")
async def root():
    return {"message": "goon"}


@app.get("/search")
async def search(q: str):
    global bluesky_logged_in

    # Login to Bluesky if not already logged in
    if not bluesky_logged_in:
        await bluesky_client.login(
            os.getenv("BLUESKY_HANDLE"), os.getenv("BLUESKY_APP_PASSWORD")
        )
        bluesky_logged_in = True

    # Run news search, Reddit search, and Bluesky search in parallel
    news_task = asyncio.create_task(
        asyncio.to_thread(
            search_news,
            q,
            "cnn.com, cbsnews.com, nbcnews.com, abcnews.go.com, foxnews.com, breitbart.com, nypost.com, oann.com",
        )
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
        if len(outputs) >= 50:
            break

        # Find matching outlet
        outlet_info = next(
            (info for domain, info in OUTLETS.items() if domain in article["url"]), None
        )
        if not outlet_info:
            continue

        bias = outlet_info["bias"]
        source = outlet_info["source"]

        # Check if we've hit the limit for this bias type
        if bias == "left":
            if left_count >= 20:
                continue
            left_count += 1
        else:  # right
            if right_count >= 20:
                continue
            right_count += 1

        sentiment, sentiment_score = analyze_sentiment(
            article["title"], strip_html_tags(article["content"])
        )

        output = {
            "source": source,
            "title": article["title"],
            "url": article["url"],
            "contents": strip_html_tags(article["content"]),
            "bias": bias,
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "author": article["author"],
            "date": to_epoch_time(article["publishedAt"]),
        }
        outputs.append(output)
        articles_by_url[article["url"]] = output

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
        articles_by_url[post["url"]] = post

    # Process Bluesky posts
    bluesky_posts = bluesky_result.get("posts", []) if bluesky_result else []

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
        articles_by_url[post["url"]] = post

    return outputs


if __name__ == "__main__":
    uvicorn.run("server:app")
