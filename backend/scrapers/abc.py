from __future__ import annotations

import requests
from bs4 import BeautifulSoup


def fetch_abc(url: str, *, timeout_s: float = 10.0) -> str:
    """
    Fetch HTML from the URL and return concatenated text from
    article content paragraphs.
    """
    response = requests.get(url, timeout=timeout_s)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    
    # ABC News uses div.FITT_Article_main__body for article content
    content_body = soup.select_one("div.FITT_Article_main__body")
    if content_body:
        # Remove any ads or unwanted elements
        for unwanted in content_body.select(".Ad, .ad-slot, .advertisement, .related-content"):
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
        fetch_abc(
            "https://abcnews.go.com/Politics/national-guard-remain-nations-capital-2026/story?id=129295281"
        )
    )
