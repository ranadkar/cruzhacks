from __future__ import annotations

import requests
from bs4 import BeautifulSoup


def fetch_fox_html_without_ads(url: str, *, timeout_s: float = 10.0) -> str:
    """
    Fetch HTML from the URL and return the text content inside the
    <div class="article-content-wrap"> with any elements having
    class "add-container" removed.
    """
    response = requests.get(url, timeout=timeout_s)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    content_wrap = soup.select_one("div.article-content-wrap")
    if content_wrap is None:
        return ""

    for ad_container in content_wrap.select(".add-container"):
        ad_container.decompose()

    text = content_wrap.get_text(separator="\n", strip=True)
    return text

if __name__ == "__main__":
    print(
        fetch_fox_html_without_ads(
            "https://www.foxnews.com/tech/pornhub-hit-massive-user-data-leak-exposing-200-million-records"
        )
    )