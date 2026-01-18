import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchSearchResults, fetchInsights, type SearchResult, type SearchResponse, type InsightsResult, type ArticleForInsights, type SummaryResult } from './services';
import type { RootState } from './store';

interface SearchState {
    query: string;
    sessionId: string | null;
    results: SearchResult[];
    selectedIndices: number[];
    insights: InsightsResult | null;
    summaries: Record<string, SummaryResult>; // keyed by URL
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    insightsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    insightsError: string | null;
}

const initialState: SearchState = {
    query: '',
    sessionId: null,
    results: [],
    selectedIndices: [],
    insights: null,
    summaries: {},
    status: 'idle',
    insightsStatus: 'idle',
    error: null,
    insightsError: null,
};

export const runSearch = createAsyncThunk<
    SearchResponse,
    string,
    { rejectValue: string }
>('search/runSearch', async (query, { rejectWithValue }) => {
    try {
        return await fetchSearchResults(query);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Search request failed';
        return rejectWithValue(message);
    }
});

export const runInsights = createAsyncThunk<
    InsightsResult,
    ArticleForInsights[],
    { rejectValue: string; state: RootState }
>('search/runInsights', async (articles, { rejectWithValue, getState }) => {
    try {
        const sessionId = getState().search.sessionId ?? '';
        return await fetchInsights(articles, sessionId);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Insights request failed';
        return rejectWithValue(message);
    }
});

const searchSlice = createSlice({
    name: 'search',
    initialState,
    reducers: {
        setQuery(state, action: PayloadAction<string>) {
            state.query = action.payload;
        },
        setSelectedIndices(state, action: PayloadAction<number[]>) {
            state.selectedIndices = action.payload;
        },
        addSummary(state, action: PayloadAction<SummaryResult>) {
            state.summaries[action.payload.url] = action.payload;
        },
        clearResults(state) {
            state.results = [];
            state.selectedIndices = [];
            state.insights = null;
            state.summaries = {};
            state.status = 'idle';
            state.insightsStatus = 'idle';
            state.error = null;
            state.insightsError = null;
            // Note: sessionId is preserved across searches within the same session
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(runSearch.pending, (state, action) => {
                state.status = 'loading';
                state.error = null;
                state.query = action.meta.arg;
            })
            .addCase(runSearch.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.sessionId = action.payload.session_id;
                state.results = action.payload.results;
            })
            .addCase(runSearch.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? 'Search request failed';
            })
            .addCase(runInsights.pending, (state) => {
                state.insightsStatus = 'loading';
                state.insightsError = null;
            })
            .addCase(runInsights.fulfilled, (state, action) => {
                state.insightsStatus = 'succeeded';
                state.insights = action.payload;
            })
            .addCase(runInsights.rejected, (state, action) => {
                state.insightsStatus = 'failed';
                state.insightsError = action.payload ?? 'Insights request failed';
            });
    },
});

export const { setQuery, setSelectedIndices, addSummary, clearResults } = searchSlice.actions;
export default searchSlice.reducer;
