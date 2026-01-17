import os
from dotenv import load_dotenv
import asyncpraw
import asyncio

load_dotenv()
app_id = os.getenv("REDDIT_CLIENT_ID")
client_secret = os.getenv("REDDIT_CLIENT_SECRET")
reddit_user_agent = os.getenv("REDDIT_USER_AGENT")


async def search_reddit(reddit, query: str, subreddit_name: str = "all", limit: int = 50):
    if not query:
        return None
    
    posts = []
    
    subreddit = await reddit.subreddit(subreddit_name)
    # Fetch more posts to account for filtered link posts
    async for submission in subreddit.search(query, limit=limit * 3, sort="hot"):
        # Skip link posts (posts without text content)
        if not submission.selftext:
            continue
        
        # if submission.score < 2 or submission.num_comments < 2:
        #     continue
        
        # Skip posts with less than 100 characters of content
        if len(submission.selftext) < 100:
            continue

        posts.append({
            "source": "Reddit",
            "id": submission.id,
            "title": submission.title,
            "author": f"u/{submission.author.name}" if submission.author else "u/[deleted]",
            "contents": submission.selftext[:500],
            "date": submission.created_utc,
            "score": submission.score,
            "num_comments": submission.num_comments,
            "url": f"https://reddit.com{submission.permalink}",
            "subreddit": submission.subreddit.display_name if submission.subreddit else "unknown",
        })
        
        # Stop once we have enough posts with actual content
        if len(posts) >= limit:
            break

    return posts


if __name__ == "__main__":
    import sys
    
    async def main():
        query = sys.argv[1] if len(sys.argv) > 1 else input("Enter your search query: ").strip()
        subreddit_name = sys.argv[2] if len(sys.argv) > 2 else (input("Enter subreddit to search (default: all): ").strip() or "all")
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else (int(input("How many posts to retrieve? (default: 50): ").strip() or "50"))
        
        reddit = asyncpraw.Reddit(
            client_id=app_id,
            client_secret=client_secret,
            user_agent=reddit_user_agent,
        )
        
        try:
            await search_reddit(reddit, query, subreddit_name, limit)
        finally:
            await reddit.close()
    
    asyncio.run(main())