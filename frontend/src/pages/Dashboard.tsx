import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../lib/store';
import { addSummary } from '../lib/searchSlice';
import { fetchSummary, type SearchResult } from '../lib/services';
import DashboardAnalysis from '../components/DashboardAnalysis';
import ThemeToggle from '../components/ThemeToggle';
import styles from '../styles/Dashboard.module.scss';

type DashboardView = 'feed' | 'analysis';

// Categorize sources
const LEFT_SOURCES = ['cnn', 'msnbc', 'nyt', 'nytimes', 'washington post', 'huffpost', 'vox', 'slate', 'the guardian'];
const RIGHT_SOURCES = ['fox', 'foxnews', 'breitbart', 'wsj', 'wall street journal', 'daily wire', 'newsmax', 'oann', 'the blaze'];
const SOCIAL_SOURCES = ['reddit', 'r/', 'bluesky', 'bsky'];

function categorizeSource(result: SearchResult): 'left' | 'social' | 'right' {
    const lowerSource = result.source.toLowerCase();
    if (SOCIAL_SOURCES.some(s => lowerSource.includes(s)) || result.source.toLowerCase() === 'reddit') {
        return 'social';
    }
    if (result.bias) {
        if (result.bias === 'left') return 'left';
        if (result.bias === 'right') return 'right';
    }
    if (LEFT_SOURCES.some(s => lowerSource.includes(s))) {
        return 'left';
    }
    if (RIGHT_SOURCES.some(s => lowerSource.includes(s))) {
        return 'right';
    }
    return 'social';
}

function formatDate(epochTime: number | undefined): string {
    if (!epochTime) return '';
    const date = new Date(epochTime * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeTime(epochTime: number | undefined): string {
    if (!epochTime) return '';
    const now = Date.now() / 1000;
    const diff = now - epochTime;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(epochTime);
}

function getSourceAbbreviation(source: string): string {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('cnn')) return 'CNN';
    if (lowerSource.includes('msnbc')) return 'MSN';
    if (lowerSource.includes('nyt') || lowerSource.includes('new york times')) return 'NYT';
    if (lowerSource.includes('fox')) return 'FOX';
    if (lowerSource.includes('wsj') || lowerSource.includes('wall street')) return 'WSJ';
    if (lowerSource.includes('breitbart')) return 'BRE';
    if (lowerSource.includes('washington post')) return 'WP';
    if (lowerSource.includes('guardian')) return 'GUA';
    if (lowerSource.includes('huffpost')) return 'HP';
    if (lowerSource.includes('daily wire')) return 'DW';
    return source.substring(0, 3).toUpperCase();
}

// Icons
const RedditIcon = () => (
    <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.056 1.597.04.21.06.427.06.646 0 2.734-3.516 4.952-7.84 4.952-4.323 0-7.84-2.218-7.84-4.952 0-.22.021-.435.06-.646A1.757 1.757 0 0 1 3.33 11.995c0-.968.786-1.754 1.754-1.754.463 0 .88.182 1.185.476 1.162-.845 2.783-1.4 4.567-1.487l.888-4.145 3.33.7c.01-.639.524-1.151 1.152-1.151z" />
    </svg>
);

const BlueskyIcon = () => (
    <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 600 530">
        <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
);

export default function Dashboard() {
    const navigate = useNavigate();
    const { results, selectedIndices } = useAppSelector((state) => state.search);
    const [currentView, setCurrentView] = useState<DashboardView>('feed');

    // Redirect if no results or no selected sources - use Navigate component for proper declarative redirect
    if (results.length === 0 || selectedIndices.length === 0) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerLeft}>
                        <div className={styles.logo} onClick={() => navigate('/')}>
                            <div className={styles.logoIcon}>
                                <span className="material-symbols-outlined">balance</span>
                            </div>
                            <span className={styles.logoText} onClick={() => navigate('/')}>Polaryx.</span>
                        </div>
                        <div className={styles.headerDivider}></div>
                        <nav className={styles.nav}>
                            <button
                                className={currentView === 'feed' ? styles.navLinkActive : styles.navLink}
                                onClick={() => setCurrentView('feed')}
                            >
                                Feed
                            </button>
                            <button
                                className={currentView === 'analysis' ? styles.navLinkActive : styles.navLink}
                                onClick={() => setCurrentView('analysis')}
                            >
                                Analysis
                            </button>
                        </nav>
                    </div>
                    <div className={styles.headerRight}>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            {currentView === 'feed' ? (
                <DashboardFeedView />
            ) : (
                <main className={`${styles.main} ${currentView === 'analysis' ? styles.analysisScrollableContent : ''}`}>
                    <div className={styles.meshGradient}></div>
                    <div className={styles.container}>
                        <DashboardAnalysis onSwitchToFeed={() => setCurrentView('feed')} />
                    </div>
                </main>
            )}
        </div>
    );
}

// Feed View Component
function DashboardFeedView() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { query, results, selectedIndices, summaries } = useAppSelector((state) => state.search);
    const [selectedArticleIndex, setSelectedArticleIndex] = useState<number>(0);
    const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'news' | 'social'>('all');

    // Get selected results sorted by date
    const selectedResults = useMemo(() => {
        return selectedIndices
            .map(index => results[index])
            .filter((result): result is SearchResult => result !== undefined)
            .sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
    }, [results, selectedIndices]);

    // Filter results
    const filteredResults = useMemo(() => {
        if (filter === 'all') return selectedResults;
        if (filter === 'news') return selectedResults.filter(r => categorizeSource(r) !== 'social');
        return selectedResults.filter(r => categorizeSource(r) === 'social');
    }, [selectedResults, filter]);

    // Currently selected article
    const selectedArticle = filteredResults[selectedArticleIndex] ?? filteredResults[0];

    // Redirect if no results
    useEffect(() => {
        if (selectedResults.length === 0 && results.length === 0) {
            navigate('/');
        }
    }, [selectedResults, results, navigate]);

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedArticleIndex(0);
    }, [filter]);

    // Fetch summary only for the currently selected article (if not already in store)
    const sessionId = useAppSelector((state) => state.search.sessionId);
    useEffect(() => {
        const fetchCurrentSummary = async () => {
            if (!selectedArticle?.url) return;
            if (summaries[selectedArticle.url]) return; // Already in store

            setLoadingUrl(selectedArticle.url);
            try {
                const summary = await fetchSummary(selectedArticle.url, sessionId ?? '');
                dispatch(addSummary(summary)); // Save to Redux store
            } catch (error) {
                console.error(`Failed to fetch summary for ${selectedArticle.url}:`, error);
            } finally {
                setLoadingUrl(null);
            }
        };

        fetchCurrentSummary();
    }, [selectedArticle?.url, summaries, dispatch, sessionId]);

    const currentSummary = selectedArticle ? summaries[selectedArticle.url] : null;
    const isLoadingSummary = loadingUrl === selectedArticle?.url;

    const getBiasLabel = (result: SearchResult) => {
        const category = categorizeSource(result);
        if (category === 'left') return 'Liberal';
        if (category === 'right') return 'Conservative';
        return 'Social';
    };

    const getSourceDisplay = (result: SearchResult) => {
        const isReddit = result.source.toLowerCase().includes('reddit');
        const isBluesky = result.source.toLowerCase().includes('bluesky') || result.source.toLowerCase().includes('bsky');
        if (isReddit && result.subreddit) return `r/${result.subreddit}`;
        if (isBluesky) return 'Bluesky';
        return result.source;
    };

    return (
        <main className={styles.feedLayout}>
            {/* Sidebar */}
            <aside className={styles.feedSidebar}>
                <div className={styles.sidebarHeader}>
                    <h3 className={styles.sidebarTitle}>Content Feed</h3>
                    <p className={styles.sidebarSubtitle}>"{query}"</p>
                </div>
                <div className={styles.filterTabs}>
                    <button
                        className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All Sources
                    </button>
                    <button
                        className={`${styles.filterTab} ${filter === 'news' ? styles.filterTabActive : ''}`}
                        onClick={() => setFilter('news')}
                    >
                        News
                    </button>
                    <button
                        className={`${styles.filterTab} ${filter === 'social' ? styles.filterTabActive : ''}`}
                        onClick={() => setFilter('social')}
                    >
                        Social
                    </button>
                </div>
                <div className={styles.articleList}>
                    {filteredResults.map((result, index) => {
                        const category = categorizeSource(result);
                        const isSelected = index === selectedArticleIndex;
                        const isReddit = result.source.toLowerCase().includes('reddit');
                        const isBluesky = result.source.toLowerCase().includes('bluesky') || result.source.toLowerCase().includes('bsky');

                        return (
                            <div
                                key={result.url || index}
                                className={`${styles.articleListItem} ${isSelected ? styles.articleListItemActive : ''}`}
                                onClick={() => setSelectedArticleIndex(index)}
                            >
                                <div className={styles.articleListHeader}>
                                    <span className={`${styles.biasPill} ${category === 'left' ? styles.biasPillLeft :
                                        category === 'right' ? styles.biasPillRight :
                                            styles.biasPillNeutral
                                        }`}>
                                        {getBiasLabel(result)}
                                    </span>
                                    <span className={styles.articleTime}>{formatRelativeTime(result.date)}</span>
                                </div>
                                <h4 className={styles.articleListTitle}>
                                    {result.title || result.contents?.substring(0, 100)}
                                </h4>
                                <div className={styles.articleListSource}>
                                    {isReddit ? (
                                        <div className={styles.sourceIconSmallReddit}><RedditIcon /></div>
                                    ) : isBluesky ? (
                                        <div className={styles.sourceIconSmallBluesky}><BlueskyIcon /></div>
                                    ) : (
                                        <div className={`${styles.sourceIconSmall} ${category === 'left' ? styles.sourceIconLeft :
                                            category === 'right' ? styles.sourceIconRight :
                                                ''
                                            }`}>
                                            {getSourceAbbreviation(result.source)}
                                        </div>
                                    )}
                                    <span>{getSourceDisplay(result)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Main Content */}
            <section className={styles.feedContent}>
                {selectedArticle ? (
                    <div className={styles.articleReader}>
                        {/* Article Header */}
                        <div className={styles.readerHeader}>
                            <div className={styles.readerSourceInfo}>
                                {(() => {
                                    const isReddit = selectedArticle.source.toLowerCase().includes('reddit');
                                    const isBluesky = selectedArticle.source.toLowerCase().includes('bluesky') || selectedArticle.source.toLowerCase().includes('bsky');
                                    const category = categorizeSource(selectedArticle);

                                    if (isReddit) {
                                        return <div className={styles.readerSourceIconReddit}><span className="material-symbols-outlined">forum</span></div>;
                                    }
                                    if (isBluesky) {
                                        return <div className={styles.readerSourceIconBluesky}><BlueskyIcon /></div>;
                                    }
                                    return (
                                        <div className={`${styles.readerSourceIcon} ${category === 'left' ? styles.readerSourceIconLeft :
                                            category === 'right' ? styles.readerSourceIconRight : ''
                                            }`}>
                                            {getSourceAbbreviation(selectedArticle.source)}
                                        </div>
                                    );
                                })()}
                                <div>
                                    <div className={styles.readerSourceName}>
                                        Published by {getSourceDisplay(selectedArticle)}
                                    </div>
                                    <div className={styles.readerSourceMeta}>
                                        {formatDate(selectedArticle.date)}
                                        {selectedArticle.author && ` • By ${selectedArticle.author}`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Article Title */}
                        <h1 className={styles.readerTitle}>
                            {selectedArticle.title || selectedArticle.contents}
                        </h1>

                        {/* Article Meta */}
                        <div className={styles.readerMeta}>
                            <div className={styles.readerMetaItem}>
                                <span className={`${styles.readerMetaDot} ${categorizeSource(selectedArticle) === 'left' ? styles.dotBlue :
                                    categorizeSource(selectedArticle) === 'right' ? styles.dotRed :
                                        styles.dotGray
                                    }`}></span>
                                <span>{getBiasLabel(selectedArticle)} Source</span>
                            </div>
                            <div className={styles.readerMetaDivider}></div>
                            <div className={styles.readerMetaItem}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: selectedArticle.sentiment_score > 0 ? '#22c55e' : selectedArticle.sentiment_score < 0 ? '#ef4444' : '#94a3b8' }}>
                                    {selectedArticle.sentiment_score > 0.1 ? 'trending_up' : selectedArticle.sentiment_score < -0.1 ? 'trending_down' : 'trending_flat'}
                                </span>
                                <span>Sentiment: {selectedArticle.sentiment_score?.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* AI Summary */}
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryCardDecor}>
                                <span className="material-symbols-outlined">auto_awesome</span>
                            </div>
                            <div className={styles.summaryCardHeader}>
                                <span className="material-symbols-outlined">auto_awesome</span>
                                <h3>AI Summary</h3>
                            </div>
                            {isLoadingSummary ? (
                                <div className={styles.summaryLoading}>
                                    <div className={styles.loadingDots}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span>Generating summary...</span>
                                </div>
                            ) : currentSummary ? (
                                <p className={styles.summaryCardText}>{currentSummary.summary}</p>
                            ) : (
                                <p className={styles.summaryCardPlaceholder}>Summary unavailable</p>
                            )}
                        </div>

                        {/* Original Content Preview */}
                        {selectedArticle.contents && (
                            <div className={styles.contentPreview}>
                                <p>{selectedArticle.contents}</p>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className={styles.readerFooter}>
                            <a
                                href={selectedArticle.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.readOriginalBtn}
                            >
                                READ ORIGINAL SOURCE
                                <span className="material-symbols-outlined">open_in_new</span>
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <span className="material-symbols-outlined">article</span>
                        <h3>No article selected</h3>
                        <p>Select an article from the list to read</p>
                    </div>
                )}
            </section>
        </main>
    );
}
