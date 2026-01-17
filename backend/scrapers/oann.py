from __future__ import annotations

import requests
from bs4 import BeautifulSoup


def fetch_oann(url: str, *, timeout_s: float = 10.0) -> str:
    """
    Fetch HTML from the URL and return concatenated text from
    article content paragraphs.
    """
    response = requests.get(url, timeout=timeout_s)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    
    # OANN typically uses div.entry-content for article content
    content_body = soup.select_one("div.entry-content")
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
        fetch_oann(
            "https://www.oann.com/newsroom/michael-cohen-i-felt-pressured-and-coerced-by-letitia-james-and-alvin-bragg-to-testify-against-trump/"
        )
    )
