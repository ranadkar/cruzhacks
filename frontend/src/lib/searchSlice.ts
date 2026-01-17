import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchSearchResults, type SearchResult } from './search';

interface SearchState {
    query: string;
    results: SearchResult[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: SearchState = {
    query: '',
    results: [],
    status: 'idle',
    error: null,
};

export const runSearch = createAsyncThunk<
    SearchResult[],
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

const searchSlice = createSlice({
    name: 'search',
    initialState,
    reducers: {
        setQuery(state, action: PayloadAction<string>) {
            state.query = action.payload;
        },
        clearResults(state) {
            state.results = [];
            state.status = 'idle';
            state.error = null;
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
                state.results = action.payload;
            })
            .addCase(runSearch.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? 'Search request failed';
            });
    },
});

export const { setQuery, clearResults } = searchSlice.actions;
export default searchSlice.reducer;
