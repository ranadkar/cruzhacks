import os
import requests
from dotenv import load_dotenv
from typing import Optional, Dict, Any

# Load environment variables
load_dotenv()

# Load all API keys
NEWS_API_KEYS = []
for i in range(1, 63):  # NEWS_API_KEY1 through NEWS_API_KEY62
    key = os.getenv(f"NEWS_API_KEY{i}")
    if key:
        NEWS_API_KEYS.append(key)

# Track current key index
_current_key_index = 0


def _get_next_api_key() -> str:
    """Get the next API key in rotation."""
    global _current_key_index
    key = NEWS_API_KEYS[_current_key_index]
    _current_key_index = (_current_key_index + 1) % len(NEWS_API_KEYS)
    return key


def search_news(
    query: str,
    domains: Optional[str] = None,
    language: str = "en",
    sort_by: str = "publishedAt",
    page_size: int = 100,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Search for news articles using the News API, automatically cycling through API keys.

    Args:
        query: Search query string
        domains: Comma-separated list of domains to restrict search to
        language: Language code (default: 'en')
        sort_by: Sort order - relevancy, popularity, publishedAt (default: 'publishedAt')
        page_size: Number of results per page (default: 100, max: 100)
        max_retries: Maximum number of retries with different keys (default: 3)

    Returns:
        JSON response from News API

    Raises:
        Exception: If all retries fail
    """
    url = "https://newsapi.org/v2/everything"

    for attempt in range(max_retries):
        api_key = _get_next_api_key()

        headers = {
            "X-Api-Key": api_key,
        }

        params = {
            "q": query,
            "language": language,
            "sortBy": sort_by,
            "pageSize": page_size,
        }

        if domains:
            params["domains"] = domains

        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()

            data = response.json()

            # Check if we hit rate limits
            if data.get("status") == "error":
                if "rateLimit" in data.get("code", "").lower():
                    continue  # Try next key
                else:
                    raise Exception(f"API Error: {data.get('message')}")

            return data

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:  # Rate limited
                continue
            raise
        except Exception:
            if attempt == max_retries - 1:
                raise

    raise Exception(f"Failed after {max_retries} attempts with different API keys")


if __name__ == "__main__":
    # Example usage
    result = search_news(
        query="technology",
        domains="techcrunch.com,wired.com,arstechnica.com",
        sort_by="publishedAt",
    )
    print(f"Found {result.get('totalResults', 0)} articles")
    for article in result.get("articles", [])[:3]:
        print(f"- {article['title']}")
