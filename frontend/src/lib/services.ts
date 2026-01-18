const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface SearchResult {
    // Common fields
    source: string;
    title: string;
    url: string;
    contents: string;
    author: string;
    date: number;
    sentiment_score: number;

    // Reddit-specific fields
    id?: string;
    sentiment?: string;
    score?: number;  // Also used by Bluesky for likes
    num_comments?: number;
    subreddit?: string;

    // News-specific fields
    bias?: string;

    // Bluesky-specific fields
    display_name?: string;
    reposts?: number;
    replies?: number;
    quotes?: number;
    bookmarks?: number;

    // Optional/Legacy
    ai_summary?: string;
}

export interface SearchResponse {
    session_id: string;
    results: SearchResult[];
}

export async function fetchSearchResults(query: string): Promise<SearchResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
        return { session_id: '', results: [] };
    }

    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(trimmed)}`);

    if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
    }

    return response.json() as Promise<SearchResponse>;
}

export interface SummaryResult {
    url: string;
    title: string;
    source: string;
    summary: string;
}

export async function fetchSummary(url: string, sessionId: string): Promise<SummaryResult> {
    const params = new URLSearchParams({
        url,
        session_id: sessionId,
    });
    const response = await fetch(`${API_BASE_URL}/summary?${params}`);

    if (!response.ok) {
        throw new Error(`Summary fetch failed with status ${response.status}`);
    }

    return response.json() as Promise<SummaryResult>;
}

export interface CommonGroundItem {
    title: string;
    bullet_point: string;
}

export interface InsightsResult {
    key_takeaway_left: string;
    key_takeaway_right: string;
    common_ground: CommonGroundItem[];
}

export interface ArticleForInsights {
    url: string;
    bias: string;
}

export async function fetchInsights(articles: ArticleForInsights[], sessionId: string): Promise<InsightsResult> {
    // Pass articles directly as [{url, bias}, ...] format
    const response = await fetch(`${API_BASE_URL}/insights`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId, articles: articles }),
    });

    if (!response.ok) {
        throw new Error(`Insights fetch failed with status ${response.status}`);
    }

    return response.json() as Promise<InsightsResult>;
}
