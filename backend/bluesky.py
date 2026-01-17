import os
from dotenv import load_dotenv
import asyncio
import time
import json
from atproto import AsyncClient
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()
bluesky_handle = os.getenv("BLUESKY_HANDLE")
bluesky_password = os.getenv("BLUESKY_APP_PASSWORD")

analyzer = SentimentIntensityAnalyzer()


async def search_bluesky(client, query: str, sort: str = "latest", limit: int = 50):
    if not query:
        return None

    if sort not in ["latest", "top"]:
        sort = "latest"

    limit = min(limit, 100)
    posts = []

    # Search for posts
    response = await client.app.bsky.feed.search_posts(
        {"q": query, "limit": limit, "sort": sort}
    )

    for post in response.posts[:limit]:
        text_content = post.record.text if hasattr(post.record, "text") else ""
        
        # Skip posts with no text content (video-only posts) or content less than 100 characters
        if not text_content or not text_content.strip() or len(text_content.strip()) < 100:
            continue
        
        sentiment_scores = analyzer.polarity_scores(text_content)
        compound_score = sentiment_scores["compound"]

        sentiment_category = (
            "positive" if compound_score >= 0.05 
            else "negative" if compound_score <= -0.05 
            else "neutral"
        )

        author_handle = post.author.handle if hasattr(post.author, "handle") else "unknown"
        author_display = post.author.display_name if hasattr(post.author, "display_name") else author_handle

        post_uri_parts = post.uri.split("/")
        post_id = post_uri_parts[-1] if len(post_uri_parts) > 0 else ""
        post_url = f"https://bsky.app/profile/{author_handle}/post/{post_id}"

        posts.append({
            "source": "Bluesky",
            "id": post_id,
            "uri": post.uri,
            "title": text_content[:100] + "..." if len(text_content) > 100 else text_content,
            "author": f"@{author_handle}",
            "display_name": author_display,
            "contents": text_content,
            "date": post.record.created_at if hasattr(post.record, "created_at") else "",
            "sentiment": sentiment_category,
            "sentiment_score": compound_score,
            "likes": post.like_count,
            "reposts": post.repost_count,
            "replies": post.reply_count,
            "quotes": post.quote_count if hasattr(post, "quote_count") else 0,
            "bookmarks": post.bookmark_count if hasattr(post, "bookmark_count") else 0,
            "url": post_url,
        })

    if not posts:
        return None

    # Calculate overall sentiment
    avg_score = sum(p["sentiment_score"] for p in posts) / len(posts)
    overall_sentiment = (
        "Positive sentiment" if avg_score >= 0.05 
        else "Negative sentiment" if avg_score <= -0.05 
        else "Neutral sentiment"
    )

    result = {
        "query": query,
        "platform": "bluesky",
        "sort": sort,
        "overall_sentiment": overall_sentiment,
        "average_score": avg_score,
        "post_count": len(posts),
        "posts": posts,
        "timestamp": time.time(),
    }

    print(f"Analysis complete. Retrieved {len(posts)} posts.")
    return result


if __name__ == "__main__":
    import sys
    
    async def main():
        query = sys.argv[1] if len(sys.argv) > 1 else input("Enter your search query: ").strip()
        sort = sys.argv[2] if len(sys.argv) > 2 else (input("Sort by (latest/top, default: latest): ").strip() or "latest")
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else (int(input("How many posts to retrieve? (default: 50, max: 100): ").strip() or "50"))
        
        client = AsyncClient()
        await client.login(bluesky_handle, bluesky_password)
        
        try:
            await search_bluesky(client, query, sort, limit)
        finally:
            pass
    
    asyncio.run(main())