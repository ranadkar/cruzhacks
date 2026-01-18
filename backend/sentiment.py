"""Sentiment analysis and bias classification."""
import asyncio
import os
from dotenv import load_dotenv
from openai import OpenAI
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from google import genai

load_dotenv()

# Initialize analyzers
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
sentiment_analyzer = SentimentIntensityAnalyzer()


def analyze_sentiment(title: str, content: str) -> tuple[str, float]:
    """Analyze sentiment of text and return category and score."""
    text_content = title + " " + (content or "")
    sentiment_scores = sentiment_analyzer.polarity_scores(text_content)
    compound_score = sentiment_scores["compound"]

    sentiment_category = (
        "positive"
        if compound_score >= 0.05
        else "negative"
        if compound_score <= -0.05
        else "neutral"
    )

    return sentiment_category, compound_score


async def classify_bias(title: str, content: str, subreddit: str = "") -> str:
    """Use OpenAI to classify political bias of a post as 'left' or 'right'."""
    try:
        subreddit_info = f"\nSubreddit: r/{subreddit}" if subreddit else ""
        prompt = f"""Analyze the political bias of this social media post. Classify it as either 'left' (liberal/progressive) or 'right' (conservative).

Title: {title}
Content: {content[:500]}{subreddit_info}

Respond with ONLY one word: either 'left' or 'right'."""

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )

        bias = response.choices[0].message.content.strip().lower()
        return bias if bias in ["left", "right"] else "left"
    except Exception as e:
        print(f"Error classifying bias: {e}")
        return "left"


async def generate_summary(title: str, content: str) -> str:
    """Generate a concise summary of article content."""
    try:
        prompt = f"""Provide a concise summary (3-5 sentences) of the following article. The summary MUST be in English, regardless of the original language.

Title: {title}

Content:
{content[:3000]}

Summary (in English):"""

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )

        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        raise


async def generate_insights(left_context: str, right_context: str) -> dict:
    """Generate key takeaways and common ground from articles."""
    try:
        prompt = f"""Analyze the following articles from different political perspectives and provide insights.

LEFT-LEANING ARTICLES:
{left_context[:8000]}

RIGHT-LEANING ARTICLES:
{right_context[:8000]}

Provide three things:
1. key_takeaway_left: A 2-3 sentence key insight or takeaway from the left-leaning perspective
2. key_takeaway_right: A 2-3 sentence key insight or takeaway from the right-leaning perspective
3. common_ground: An array of EXACTLY 3 objects, each with:
   - "title": A short 2-4 word title for the common ground area (e.g., "Infrastructure Modernization", "Data Privacy Rights", "Energy Security")
   - "bullet_point": A complete sentence describing the common ground or shared concern in that area

Format your response as JSON with these three keys: key_takeaway_left (string), key_takeaway_right (string), common_ground (array of 3 objects with title and bullet_point)"""

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        import json
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        print(f"Error generating insights: {e}")
        raise


async def chat_with_context(message: str, articles: list[dict]) -> dict:
    """
    Chat with the user based on the context of their articles.
    
    Args:
        message: User's message/question
        articles: List of article dictionaries with title, source, bias, contents
        
    Returns:
        {
            "response": str,
            "follow_up_suggestions": list[dict]  # 0-3 suggestions with short/full versions
        }
    """
    try:
        # Build context from articles
        context_parts = []
        for i, article in enumerate(articles[:30], 1):  # Limit to 30 articles for token limits
            source = article.get("source", "Unknown")
            bias = article.get("bias", "unknown")
            title = article.get("title", "")
            contents = article.get("contents", "")[:500]  # Limit content length
            
            context_parts.append(f"[{i}] {source} ({bias}): {title}\n{contents}")
        
        context = "\n\n".join(context_parts)
        
        # Create the prompt
        prompt = f"""You are a helpful assistant analyzing news and social media posts about current events. You have access to articles from various sources with different political perspectives.

CONTEXT - Available articles:
{context[:15000]}

USER QUESTION: {message}

Provide a thoughtful, balanced response that considers multiple perspectives. Be conversational and helpful. IMPORTANT: Keep your response under 400 characters - be concise and to the point."""

        # Use Gemini 3 Flash for chat
        response = await asyncio.to_thread(
            gemini_client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt
        )

        chat_response = response.text.strip()
        
        # Generate follow-up suggestions using Gemini
        suggestions_prompt = f"""Based on this conversation:

User asked: {message}
Assistant responded: {chat_response}

Generate 0-3 brief follow-up questions or rebuttals the user might ask to continue the conversation. 

For each follow-up, provide:
1. A SHORT version (2-4 words) for UI display
2. A FULL version (the complete question, 8-15 words)

Return as JSON with this structure:
{{
  "suggestions": [
    {{"short": "Conservative view?", "full": "What do conservative sources say about this?"}},
    {{"short": "Compare to 2020?", "full": "How does this situation compare to what happened in 2020?"}}
  ]
}}

The suggestions should:
- Explore different angles or perspectives
- Challenge or deepen the discussion
- Be natural conversation continuations

If no good follow-ups exist, return empty array."""

        suggestions_response = await asyncio.to_thread(
            gemini_client.models.generate_content,
            model="gemini-2.5-flash",
            contents=suggestions_prompt,
            config={
                "response_mime_type": "application/json"
            }
        )
        
        import json
        suggestions_data = json.loads(suggestions_response.text.strip())
        
        # Extract suggestions array
        suggestions = suggestions_data.get("suggestions", [])
            
        # Ensure it's a list and limit to 3
        if not isinstance(suggestions, list):
            suggestions = []
        suggestions = suggestions[:3]
        
        # Validate structure
        valid_suggestions = []
        for s in suggestions:
            if isinstance(s, dict) and "short" in s and "full" in s:
                valid_suggestions.append(s)
        
        return {
            "response": chat_response,
            "follow_up_suggestions": valid_suggestions
        }
        
    except Exception as e:
        print(f"Error in chat: {e}")
        raise
