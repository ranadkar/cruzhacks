import os
from dotenv import load_dotenv
import asyncpraw
import asyncio
import json
import time


load_dotenv()
app_id = os.getenv("REDDIT_CLIENT_ID")
client_secret = os.getenv("REDDIT_CLIENT_SECRET")


def get_async_reddit():
    return asyncpraw.Reddit(
        client_id=app_id,
        client_secret=client_secret,
        user_agent="android:" + app_id + ":v1.0 (by u/K6av6ai82j0zo8HB721)"
    )


def build_comment_dict_sync(comment, depth=0, max_depth=2):
    """Synchronous comment builder - defined once, reused everywhere"""
    if isinstance(comment, asyncpraw.models.MoreComments):
        return None
    if str(comment.author).lower() == "automoderator":
        return None
    
    comment_data = {
        "url": f"https://reddit.com{comment.permalink}",
        "content": comment.body,
        "author": str(comment.author),
        "score": comment.score,
        "replies": [],
        "depth": depth
    }
    
    if depth < max_depth and hasattr(comment, 'replies') and comment.replies:
        for reply in list(comment.replies)[:3]:
            if not isinstance(reply, asyncpraw.models.MoreComments):
                reply_data = build_comment_dict_sync(reply, depth + 1, max_depth)
                if reply_data:
                    comment_data["replies"].append(reply_data)
    
    return comment_data


async def scrape_post_batch(reddit, post_ids, post_infos):
    """Scrape multiple posts using a SINGLE Reddit connection"""
    results = []
    
    for post_id, post_info in zip(post_ids, post_infos):
        try:
            submission = await reddit.submission(post_id)
            await submission.load()
            
            comments_list = []
            comment_count = 0
            max_comments = 10
            
            for comment in submission.comments:
                if comment_count >= max_comments:
                    break
                if not isinstance(comment, asyncpraw.models.MoreComments):
                    comment_data = build_comment_dict_sync(comment, depth=0)
                    if comment_data:
                        comments_list.append(comment_data)
                        comment_count += 1
            
            post_data = {
                "source": "Reddit",
                "title": submission.title,
                "ai_summary": f"Post about {submission.title[:50]}... with {submission.num_comments} comments",
                "contents": submission.selftext if submission.selftext else "[Link post]",
                "url": f"https://reddit.com{submission.permalink}",
                "score": submission.score,
                "num_comments": submission.num_comments,
                "created_utc": submission.created_utc,
                "comments": comments_list
            }
            results.append(post_data)
            print(f"✓ {post_info['title'][:60]}... ({comment_count} comments)")
            
        except Exception as e:
            print(f"✗ Error on {post_info['title'][:40]}: {e}")
            results.append(None)
    
    return results


async def search_posts_by_query():
    reddit = get_async_reddit()
    
    try:
        query = input("Enter your search query: ").strip()
        if not query:
            print("No query provided. Exiting.")
            return
        
        subreddit_name = input("Enter subreddit to search (default: PoliticalDebate): ").strip() or "PoliticalDebate"
        limit = input("How many posts to retrieve? (default: 50): ").strip()
        limit = int(limit) if limit.isdigit() else 50
        
        print(f"\nSearching r/{subreddit_name} for: '{query}' (up to {limit} posts)...\n")
        
        subreddit = await reddit.subreddit(subreddit_name)
        
        # Collect all post info first (fast - single API call)
        search_results = []
        async for submission in subreddit.search(query, limit=limit, sort='relevance'):
            search_results.append({
                "id": submission.id,
                "title": submission.title,
                "score": submission.score,
                "num_comments": submission.num_comments,
                "url": f"https://reddit.com{submission.permalink}",
            })
        
        if not search_results:
            print("No results found.")
            return
        
        print(f"Found {len(search_results)} posts. Starting fast scrape...\n")
        
        start_time = time.time()
        
        # Split into batches and process with multiple Reddit connections
        num_workers = 5
        batch_size = max(1, len(search_results) // num_workers)
        batches = [search_results[i:i + batch_size] for i in range(0, len(search_results), batch_size)]
        
        async def process_batch(batch):
            """Each worker gets ONE Reddit connection for its entire batch"""
            worker_reddit = get_async_reddit()
            try:
                post_ids = [p['id'] for p in batch]
                results = await scrape_post_batch(worker_reddit, post_ids, batch)
                return results
            finally:
                await worker_reddit.close()
        
        # Run all batches concurrently
        batch_results = await asyncio.gather(*[process_batch(batch) for batch in batches])
        
        # Flatten results
        scraped_posts = []
        for batch in batch_results:
            scraped_posts.extend([p for p in batch if p is not None])
        
        elapsed = time.time() - start_time
        
        # Save results
        output_file = f"selected_posts_{subreddit_name}_{len(scraped_posts)}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(scraped_posts, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print(f"✓ Scraped {len(scraped_posts)} posts in {elapsed:.1f}s ({len(scraped_posts)/elapsed:.1f} posts/sec)")
        print(f"✓ Saved to: {output_file}")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await reddit.close()


if __name__ == "__main__":
    asyncio.run(search_posts_by_query())
