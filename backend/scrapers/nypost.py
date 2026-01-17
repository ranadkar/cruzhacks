from __future__ import annotations

import requests
from bs4 import BeautifulSoup


def fetch_nypost(url: str, *, timeout_s: float = 10.0) -> str:
    """
    Fetch HTML from the URL and return concatenated text from
    article content paragraphs.
    """
    response = requests.get(url, timeout=timeout_s)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    
    # NY Post uses div.single__content for article content
    content_body = soup.select_one("div.single__content")
    if content_body:
        # Remove any ads or unwanted elements
        for unwanted in content_body.select(".ad-container, .advertisement, .related-content"):
            unwanted.decompose()
        
        # Get all paragraph text
        paragraphs = [
            p.get_text(strip=True) for p in content_body.find_all("p")
        ]
        return "\n".join(filter(None, paragraphs))
    
    # Fallback: try to find paragraphs in article tag
    article = soup.find("article")
    if article:
        paragraphs = [
            p.get_text(strip=True) for p in article.find_all("p")
        ]
        return "\n".join(filter(None, paragraphs))
    
    return ""


if __name__ == "__main__":
    print(
        fetch_nypost(
            "https://nypost.com/2026/01/17/us-news/minneapolis-protesters-attack-jake-lang-as-he-shouts-we-deserve-a-future-for-white-americans/"
        )
    )
