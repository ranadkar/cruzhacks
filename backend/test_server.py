"""
Test cases for server.py endpoints.
Tests the /search, /summary, and /insights endpoints.
"""
import requests
import json

BASE_URL = "http://localhost:8000"


def test_search_abortion():
    """Test the /search endpoint with search term 'abortion'."""
    print("\n=== Testing Search for 'abortion' ===")
    response = requests.get(f"{BASE_URL}/search", params={"q": "abortion"})
    
    if response.status_code != 200:
        print(f"❌ Failed: Status code {response.status_code}")
        return None, None
    
    data = response.json()
    session_id = data.get("session_id")
    articles = data.get("results", [])
    
    print(f"✓ Session ID: {session_id}")
    print(f"✓ Found {len(articles)} articles")
    
    if len(articles) > 0:
        article = articles[0]
        print(f"  First article: {article['title'][:60]}...")
        print(f"  Source: {article['source']}")
        print(f"  Bias: {article['bias']}")
        print(f"  Sentiment: {article['sentiment']} ({article['sentiment_score']:.2f})")
        print(f"  Content length: {len(article['contents'])} chars")
    
    # Count by bias
    left_count = len([a for a in articles if a['bias'] == 'left'])
    right_count = len([a for a in articles if a['bias'] == 'right'])
    sources = set([article['source'] for article in articles])
    
    print(f"  Sources: {', '.join(sources)}")
    print(f"  Left bias: {left_count}, Right bias: {right_count}")
    
    return session_id, articles


def test_summary(url, session_id):
    """Test the /summary endpoint."""
    print(f"\n=== Testing Summary for URL ===")
    response = requests.get(f"{BASE_URL}/summary", params={"url": url, "session_id": session_id})
    
    if response.status_code != 200:
        print(f"❌ Failed: Status code {response.status_code}")
        if response.status_code == 404:
            print(f"   Detail: {response.json().get('detail', 'Unknown error')}")
        return None
    
    data = response.json()
    
    if "error" in data:
        print(f"❌ Error: {data['error']}")
        return None
    
    print(f"✓ Summary generated")
    print(f"  Title: {data['title'][:60]}...")
    print(f"  Source: {data['source']}")
    print(f"  Summary: {data['summary'][:150]}...")
    
    return data


def test_insights(articles, session_id):
    """Test the /insights endpoint."""
    print(f"\n=== Testing Insights ===")
    
    # Prepare article list - use ALL articles
    left_articles = [{"url": a["url"], "bias": "left"} for a in articles if a["bias"] == "left"]
    right_articles = [{"url": a["url"], "bias": "right"} for a in articles if a["bias"] == "right"]
    
    article_list = left_articles + right_articles
    
    print(f"  Using {len(left_articles)} left and {len(right_articles)} right articles")
    
    response = requests.post(f"{BASE_URL}/insights", json={"session_id": session_id, "articles": article_list})
    
    if response.status_code != 200:
        print(f"❌ Failed: Status code {response.status_code}")
        if response.status_code == 404:
            print(f"   Detail: {response.json().get('detail', 'Unknown error')}")
        return None
    
    data = response.json()
    
    if "error" in data:
        print(f"❌ Error: {data['error']}")
        return None
    
    print(f"✓ Insights generated")
    print(f"\n  LEFT TAKEAWAY:")
    print(f"  {data['key_takeaway_left']}")
    print(f"\n  RIGHT TAKEAWAY:")
    print(f"  {data['key_takeaway_right']}")
    print(f"\n  COMMON GROUND:")
    
    # Display common ground with titles and bullet points
    common_ground = data.get('common_ground', [])
    if isinstance(common_ground, list):
        for i, item in enumerate(common_ground, 1):
            if isinstance(item, dict):
                print(f"\n  {i}. {item.get('title', 'N/A')}")
                print(f"     {item.get('bullet_point', 'N/A')}")
            else:
                print(f"  {i}. {item}")
    else:
        print(f"  {common_ground}")
    
    return data


def test_chat(session_id):
    """Test the /chat endpoint."""
    print(f"\n=== Testing Chat ===")
    
    message = "What are the main perspectives on this topic?"
    
    response = requests.post(
        f"{BASE_URL}/chat", 
        json={"session_id": session_id, "message": message}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed: Status code {response.status_code}")
        if response.status_code == 404:
            print(f"   Detail: {response.json().get('detail', 'Unknown error')}")
        return None
    
    data = response.json()
    
    if "error" in data:
        print(f"❌ Error: {data['error']}")
        return None
    
    print(f"✓ Chat response generated")
    print(f"\n  USER: {message}")
    print(f"\n  ASSISTANT: {data.get('response', '')[:200]}...")
    
    suggestions = data.get('follow_up_suggestions', [])
    if suggestions:
        print(f"\n  FOLLOW-UP SUGGESTIONS ({len(suggestions)}):")
        for i, suggestion in enumerate(suggestions, 1):
            if isinstance(suggestion, dict):
                print(f"    {i}. {suggestion.get('short', '')} → {suggestion.get('full', '')}")
            else:
                print(f"    {i}. {suggestion}")
    else:
        print(f"\n  No follow-up suggestions")
    
    return data


if __name__ == "__main__":
    print("Starting API Tests...")
    print("Make sure the server is running on http://localhost:8000")
    
    # Test 1: Search for "abortion"
    session_id, abortion_results = test_search_abortion()
    
    # Test 2: Get summary for first article
    if session_id and abortion_results and len(abortion_results) > 0:
        test_summary(abortion_results[0]["url"], session_id)
    
    # Test 3: Get insights from all abortion articles
    if session_id and abortion_results and len(abortion_results) > 0:
        test_insights(abortion_results, session_id)
    
    # Test 4: Chat with the assistant
    if session_id and abortion_results and len(abortion_results) > 0:
        test_chat(session_id)
    
    print("\n=== All Tests Complete ===")
