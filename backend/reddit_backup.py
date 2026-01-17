import os
from dotenv import load_dotenv
import asyncpraw
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import asyncio
import json
import time
from datetime import datetime


load_dotenv()
app_id = os.getenv("REDDIT_CLIENT_ID")
client_secret = os.getenv("REDDIT_CLIENT_SECRET")

analyzer = SentimentIntensityAnalyzer()


def get_async_reddit():
    return asyncpraw.Reddit(
        client_id=app_id,
        client_secret=client_secret,
        user_agent="android:" + app_id + ":v1.0 (by u/K6av6ai82j0zo8HB721)"
    )


async def search_posts_by_query():
    
    reddit = get_async_reddit()
    
    try:
        # Get user query
        query = input("Enter your search query: ").strip()
        if not query:
            print("No query provided. Exiting.")
            return
        
        subreddit_name = input("Enter subreddit to search (default: PoliticalDebate): ").strip()
        if not subreddit_name:
            subreddit_name = "PoliticalDebate"
        
        limit = input("How many posts to retrieve? (default: 50): ").strip()
        limit = int(limit) if limit.isdigit() else 50
        
        print(f"\nSearching r/{subreddit_name} for: '{query}'")
        print(f"Retrieving up to {limit} posts...\n")
        
        subreddit = await reddit.subreddit(subreddit_name)
        
        # Search posts
        search_results = []
        count = 0
        
        async for submission in subreddit.search(query, limit=limit, sort='relevance'):
            count += 1
            search_results.append({
                "index": count,
                "id": submission.id,
                "title": submission.title,
                "score": submission.score,
                "num_comments": submission.num_comments,
                "url": f"https://reddit.com{submission.permalink}",
                "created_utc": submission.created_utc
            })
        
        if not search_results:
            print("No results found.")
            return
        
        # Display results
        print(f"\n{'='*80}")
        print(f"Found {len(search_results)} posts:")
        print(f"{'='*80}\n")
        
        for result in search_results:
            print(f"[{result['index']}] {result['title'][:70]}")
            print(f"    Score: {result['score']} | Comments: {result['num_comments']}")
            print(f"    URL: {result['url']}")
            print()
        
        # Save search results to file
        search_file = f"search_results_{subreddit_name}_{query.replace(' ', '_')[:30]}.json"
        with open(search_file, 'w', encoding='utf-8') as f:
            json.dump(search_results, f, indent=2, ensure_ascii=False)
        
        print(f"Search results saved to: {search_file}")
        
        # Automatically select all posts
        print("\n" + "="*80)
        print(f"Auto-selecting all {len(search_results)} posts for scraping...")
        selected_posts = search_results
        print(f"\nScraping {len(selected_posts)} posts with ALL comments using {min(5, len(selected_posts))} concurrent workers...\n")
        
        # Scrape selected posts with comments using concurrent workers
        async def scrape_single_post(post_info, idx, total):
            """Scrape a single post with all its comments"""
            local_reddit = get_async_reddit()
            
            async def build_comment_dict(comment, depth=0):
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
                
                # Recursively build replies (now all MoreComments are expanded)
                if hasattr(comment, 'replies') and comment.replies:
                    for reply in comment.replies:
                        if not isinstance(reply, asyncpraw.models.MoreComments):
                            reply_data = await build_comment_dict(reply, depth + 1)
                            if reply_data:
                                comment_data["replies"].append(reply_data)
                
                return comment_data
            
            try:
                print(f"[{idx}/{total}] Scraping: {post_info['title'][:60]}...")
                
                submission = await local_reddit.submission(post_info['id'])
                await submission.load()
                
                # Replace all MoreComments objects to get ALL comments
                print(f"    [{idx}] Expanding all comment threads...")
                try:
                    await submission.comments.replace_more(limit=None)
                except Exception as e:
                    print(f"    [{idx}] ⚠ Warning: Could not expand all comments: {e}")
                
                # Fetch all top-level comments and their nested replies
                print(f"    [{idx}] Processing comments...")
                comments_list = []
                comment_count = 0
                max_comments = 10  # Limit to 10 comments
                
                # Use .list() to get ALL comments in a flat structure, then rebuild tree
                all_comments = submission.comments.list()
                top_level_comments = [c for c in all_comments if c.is_root]
                
                for comment in top_level_comments:
                    if comment_count >= max_comments:  # Stop after max_comments
                        break
                    if not isinstance(comment, asyncpraw.models.MoreComments):
                        comment_data = await build_comment_dict(comment, depth=0)
                        if comment_data:
                            comments_list.append(comment_data)
                            comment_count += 1
                
                post_data = {
                    "source": "Reddit",
                    "title": submission.title,
                    "ai_summary": f"Post about {submission.title[:50]}... with {submission.num_comments} comments and {submission.score} upvotes",
                    "contents": submission.selftext if submission.selftext else "[Link post - no text content]",
                    "url": f"https://reddit.com{submission.permalink}",
                    "score": submission.score,
                    "num_comments": submission.num_comments,
                    "created_utc": submission.created_utc,
                    "comments": comments_list
                }
                
                print(f"    [{idx}] ✓ Scraped {comment_count} top-level comments ({len(all_comments)} total)")
                await local_reddit.close()
                return post_data
                
            except Exception as e:
                print(f"    [{idx}] ✗ Error: {e}")
                await local_reddit.close()
                return None
        
        # Process posts concurrently with a semaphore to limit concurrent workers
        max_workers = min(5, len(selected_posts))  # Limit to 5 concurrent workers
        semaphore = asyncio.Semaphore(max_workers)
        
        async def scrape_with_semaphore(post_info, idx, total):
            async with semaphore:
                return await scrape_single_post(post_info, idx, total)
        
        # Create tasks for all posts
        tasks = [
            scrape_with_semaphore(post_info, idx + 1, len(selected_posts))
            for idx, post_info in enumerate(selected_posts)
        ]
        
        # Run all tasks concurrently and gather results
        scraped_posts = await asyncio.gather(*tasks)
        
        # Filter out None values (failed scrapes)
        scraped_posts = [p for p in scraped_posts if p is not None]
        
        # Save scraped posts
        output_file = f"selected_posts_{subreddit_name}_{len(scraped_posts)}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(scraped_posts, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*80}")
        print(f"Successfully scraped {len(scraped_posts)} posts!")
        print(f"Output file: {output_file}")
        print(f"{'='*80}")
        
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await reddit.close()
        print("Done!")


async def scrape_subreddit_posts():
  
    reddit = get_async_reddit()
    
    try:
        # Target: r/PoliticalDebate, scrape 1000 posts with all comments
        subreddit_name = "PoliticalDebate"
        target_posts = 1000
        
        subreddit = await reddit.subreddit(subreddit_name)
        print(f"Starting to scrape {target_posts} posts from r/{subreddit_name}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        all_posts = []
        post_count = 0
        request_count = 0
        start_time = time.time()
        
        # Build the Comment structure recursively
        async def build_comment_dict(comment, depth=0):
            # Skip MoreComments objects
            if isinstance(comment, asyncpraw.models.MoreComments):
                return None
            
            # Skip AutoModerator comments
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
            
            # Get all replies (limit depth to 3 to avoid infinite nesting)
            if depth < 3 and hasattr(comment, 'replies') and comment.replies:
                for reply in comment.replies:
                    if not isinstance(reply, asyncpraw.models.MoreComments):
                        reply_data = await build_comment_dict(reply, depth + 1)
                        if reply_data:
                            comment_data["replies"].append(reply_data)
            
            return comment_data
        
        # Scrape posts from hot, then top if needed
        async for submission in subreddit.hot(limit=target_posts):
            if post_count >= target_posts:
                break
            
            try:
                # Load submission to access comments
                await submission.load()
                request_count += 1
                
                # Fetch all top-level comments (asyncpraw handles rate limiting internally)
                comments_list = []
                async for comment in submission.comments:
                    if not isinstance(comment, asyncpraw.models.MoreComments):
                        comment_data = await build_comment_dict(comment, depth=0)
                        if comment_data:
                            comments_list.append(comment_data)
                
                # Build the Post structure
                post_data = {
                    "source": "Reddit",
                    "title": submission.title,
                    "ai_summary": f"Post about {submission.title[:50]}... with {submission.num_comments} comments and {submission.score} upvotes",
                    "contents": submission.selftext if submission.selftext else "[Link post - no text content]",
                    "url": f"https://reddit.com{submission.permalink}",
                    "score": submission.score,
                    "num_comments": submission.num_comments,
                    "created_utc": submission.created_utc,
                    "comments": comments_list
                }
                
                all_posts.append(post_data)
                post_count += 1
                
                # Progress update every 10 posts
                if post_count % 10 == 0:
                    elapsed = time.time() - start_time
                    print(f"Progress: {post_count}/{target_posts} posts scraped | "
                          f"Elapsed: {elapsed/60:.1f} min | "
                          f"Last: {submission.title[:60]}...")
                    
                    # Save checkpoint every 50 posts
                    if post_count % 50 == 0:
                        checkpoint_file = f"checkpoint_{post_count}.json"
                        with open(checkpoint_file, 'w', encoding='utf-8') as f:
                            json.dump(all_posts, f, indent=2, ensure_ascii=False)
                        print(f"  → Checkpoint saved: {checkpoint_file}")
                
            except Exception as e:
                print(f"Error processing post {post_count + 1}: {e}")
                continue
        
        # Save final results
        output_file = f"r_{subreddit_name}_{post_count}_posts.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_posts, f, indent=2, ensure_ascii=False)
        
        elapsed = time.time() - start_time
        print(f"\n{'='*80}")
        print("Scraping complete!")
        print(f"Total posts scraped: {post_count}")
        print(f"Total time: {elapsed/60:.1f} minutes ({elapsed/3600:.1f} hours)")
        print(f"Output file: {output_file}")
        print(f"{'='*80}")
    
    except Exception as e:
        print(f"Fatal error occurred: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await reddit.close()
        print("Done!")


if __name__ == "__main__":
    import asyncio
    # asyncio.run(test_scrape())
    # asyncio.run(scrape_subreddit_posts())
    asyncio.run(search_posts_by_query())