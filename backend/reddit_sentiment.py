import os
from dotenv import load_dotenv
import asyncpraw
import asyncio
import time
import json
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()
app_id = os.getenv("REDDIT_CLIENT_ID")
client_secret = os.getenv("REDDIT_CLIENT_SECRET")

analyzer = SentimentIntensityAnalyzer()


def get_async_reddit():
    return asyncpraw.Reddit(
        client_id=app_id,
        client_secret=client_secret,
        user_agent="android:" + app_id + ":v1.0 (by u/K6av6ai82j0zo8HB721)",
    )


async def get_reddit_search_data(
    query: str, subreddit_name: str = "all", limit: int = 50
):
    """Fetch Reddit posts with sentiment analysis for any search query."""
    reddit = get_async_reddit()
    posts = []

    try:
        subreddit = await reddit.subreddit(subreddit_name)
        async for submission in subreddit.search(query, limit=limit, sort="relevance"):
            text_content = (
                submission.title
                + " "
                + (submission.selftext if submission.selftext else "")
            )
            sentiment_scores = analyzer.polarity_scores(text_content)
            compound_score = sentiment_scores["compound"]

            if compound_score >= 0.05:
                sentiment_category = "positive"
            elif compound_score <= -0.05:
                sentiment_category = "negative"
            else:
                sentiment_category = "neutral"

            posts.append(
                {
                    "source": "Reddit",
                    "id": submission.id,
                    "title": submission.title,
                    "username": f"u/{submission.author.name}"
                    if submission.author
                    else "u/[deleted]",
                    "handle": submission.author.name
                    if submission.author
                    else "[deleted]",
                    "contents": submission.selftext[:500]
                    if submission.selftext
                    else "[Link post]",
                    "platform": "reddit",
                    "date": submission.created_utc,
                    "created_utc": submission.created_utc,
                    "sentiment": sentiment_category,
                    "sentiment_score": compound_score,
                    "score": submission.score,
                    "likes": submission.score,
                    "num_comments": submission.num_comments,
                    "comments": [],
                    "url": f"https://reddit.com{submission.permalink}",
                    "subreddit": submission.subreddit.display_name
                    if submission.subreddit
                    else "unknown",
                    "ai_summary": f"{sentiment_category.title()} sentiment post about {submission.title[:50]}...",
                }
            )
    finally:
        await reddit.close()

    return posts


async def categorize_overall_sentiment(
    query: str, subreddit_name: str = "all", limit: int = 50
):
    """Get overall sentiment analysis for a search query."""
    posts = await get_reddit_search_data(query, subreddit_name, limit)

    if not posts:
        return {
            "sentiment": "No sentiment data available",
            "score": 0.0,
            "post_count": 0,
        }

    sentiment_scores = [post["sentiment_score"] for post in posts]
    avg_sentiment = sum(sentiment_scores) / len(sentiment_scores)

    if avg_sentiment >= 0.05:
        category = "Positive sentiment"
    elif avg_sentiment <= -0.05:
        category = "Negative sentiment"
    else:
        category = "Neutral sentiment"

    return {
        "sentiment": category,
        "score": avg_sentiment,
        "post_count": len(posts),
        "posts": posts,
    }


async def search_posts_fast():
    """Fast sentiment-analyzed Reddit search with instant results."""
    try:
        query = input("Enter your search query: ").strip()
        if not query:
            print("No query provided. Exiting.")
            return

        subreddit_name = (
            input("Enter subreddit to search (default: all): ").strip() or "all"
        )
        limit = input("How many posts to retrieve? (default: 50): ").strip()
        limit = int(limit) if limit.isdigit() else 50

        print(f"\nSearching r/{subreddit_name} for: '{query}' (up to {limit} posts)...")
        print("Analyzing sentiment...")

        start_time = time.time()

        # Get posts with sentiment analysis
        result = await categorize_overall_sentiment(query, subreddit_name, limit)
        posts = result["posts"]

        elapsed = time.time() - start_time

        if not posts:
            print("No results found.")
            return

        # Save results
        output_file = f"sentiment_analysis_{subreddit_name}_{query.replace(' ', '_')}_{len(posts)}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "query": query,
                    "subreddit": subreddit_name,
                    "overall_sentiment": result["sentiment"],
                    "average_score": result["score"],
                    "post_count": result["post_count"],
                    "posts": posts,
                    "timestamp": time.time(),
                },
                f,
                indent=2,
                ensure_ascii=False,
            )

        print(f"\n{'=' * 60}")
        print("⚡ SENTIMENT ANALYSIS COMPLETE!")
        print(f"✓ Analyzed {len(posts)} posts in {elapsed:.1f}s")
        print(f"✓ Speed: {len(posts) / elapsed:.1f} posts/sec")
        print(f"✓ Overall Sentiment: {result['sentiment']}")
        print(f"✓ Average Score: {result['score']:.3f}")
        print(f"✓ Saved to: {output_file}")
        print(f"{'=' * 60}")

        # Show sentiment breakdown
        positive = sum(1 for p in posts if p["sentiment"] == "positive")
        negative = sum(1 for p in posts if p["sentiment"] == "negative")
        neutral = sum(1 for p in posts if p["sentiment"] == "neutral")

        print("\n📊 Sentiment Breakdown:")
        print(f"   Positive: {positive} posts ({positive / len(posts) * 100:.1f}%)")
        print(f"   Negative: {negative} posts ({negative / len(posts) * 100:.1f}%)")
        print(f"   Neutral:  {neutral} posts ({neutral / len(posts) * 100:.1f}%)")

    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(search_posts_fast())
