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
    score?: number;
    num_comments?: number;
    subreddit?: string;

    // News-specific fields
    bias?: string;

    // Optional/Legacy
    ai_summary?: string;
}

export async function fetchSearchResults(query: string): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
        return [];
    }

    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(trimmed)}`);

    if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
    }

    return response.json() as Promise<SearchResult[]>;
}
