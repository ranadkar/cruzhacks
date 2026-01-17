from __future__ import annotations

from typing import Optional

import requests
from bs4 import BeautifulSoup


def fetch_cnn_paragraphs(url: str, *, timeout_s: float = 10.0) -> str:
    """
    Fetch HTML from the URL and return concatenated text from
    <p class="paragraph-elevate"> elements separated by newlines.
    """
    response = requests.get(url, timeout=timeout_s)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    paragraphs = [
        p.get_text(strip=True)
        for p in soup.find_all("p", class_="paragraph-elevate")
    ]

    return "\n".join(filter(None, paragraphs))

if __name__ == "__main__":
    print(fetch_cnn_paragraphs("https://www.cnn.com/2026/01/05/politics/tim-walz-minnesota-reelection"))