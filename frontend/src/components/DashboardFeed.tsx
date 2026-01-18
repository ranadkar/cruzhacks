import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../lib/store';
import { fetchSummary, type SearchResult, type SummaryResult } from '../lib/services';
import ThemeToggle from './ThemeToggle';
import styles from '../styles/Dashboard.module.scss';

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
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatCount(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
}

// Icons
const RedditIcon = () => (
    <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.056 1.597.04.21.06.427.06.646 0 2.734-3.516 4.952-7.84 4.952-4.323 0-7.84-2.218-7.84-4.952 0-.22.021-.435.06-.646A1.757 1.757 0 0 1 3.33 11.995c0-.968.786-1.754 1.754-1.754.463 0 .88.182 1.185.476 1.162-.845 2.783-1.4 4.567-1.487l.888-4.145 3.33.7c.01-.639.524-1.151 1.152-1.151z" />
    </svg>
);

const BlueskyIcon = () => (
    <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 600 530">
        <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
);

interface FeedItemProps {
    result: SearchResult;
    summary: SummaryResult | null;
    isLoading: boolean;
    category: 'left' | 'social' | 'right';
}

const FeedItem = ({ result, summary, isLoading, category }: FeedItemProps) => {
    const isReddit = result.source.toLowerCase().includes('reddit');
    const isBluesky = result.source.toLowerCase().includes('bluesky') || result.source.toLowerCase().includes('bsky');
    const isSocial = isReddit || isBluesky;

    const categoryClass = category === 'left' ? styles.feedItemLeft : category === 'right' ? styles.feedItemRight : styles.feedItemSocial;

    const getSourceIcon = () => {
        if (isReddit) return <RedditIcon />;
        if (isBluesky) return <BlueskyIcon />;
        return null;
    };

    const getSourceDisplay = () => {
        if (isReddit && result.subreddit) return `r/${result.subreddit}`;
        if (isBluesky) return 'Bluesky';
        return result.source;
    };

    return (
        <article className={`${styles.feedItem} ${categoryClass}`}>
            <div className={styles.feedItemAccent}></div>
            <div className={styles.feedItemContent}>
                <div className={styles.feedItemHeader}>
                    <div className={styles.sourceInfo}>
                        {isSocial ? (
                            <div className={`${styles.sourceIconSocial} ${isReddit ? styles.reddit : styles.bluesky}`}>
                                {getSourceIcon()}
                            </div>
                        ) : (
                            <div className={`${styles.sourceIconNews} ${category === 'left' ? styles.left : styles.right}`}>
                                <span className="material-symbols-outlined">newspaper</span>
                            </div>
                        )}
                        <div className={styles.sourceText}>
                            <span className={styles.sourceName}>{getSourceDisplay()}</span>
                            {result.author && (
                                <span className={styles.authorName}>
                                    {isSocial && result.display_name ? result.display_name : `By ${result.author}`}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={styles.feedItemMeta}>
                        {result.date && (
                            <span className={styles.dateTag}>{formatDate(result.date)}</span>
                        )}
                        <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.externalLink}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="material-symbols-outlined">open_in_new</span>
                        </a>
                    </div>
                </div>

                <h3 className={styles.feedItemTitle}>
                    {result.title || result.contents}
                </h3>

                <div className={styles.summarySection}>
                    <div className={styles.summaryHeader}>
                        <span className="material-symbols-outlined">auto_awesome</span>
                        <span>AI Summary</span>
                    </div>
                    {isLoading ? (
                        <div className={styles.summaryLoading}>
                            <div className={styles.loadingDots}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span>Generating summary...</span>
                        </div>
                    ) : summary ? (
                        <p className={styles.summaryText}>{summary.summary}</p>
                    ) : (
                        <p className={styles.summaryError}>Unable to generate summary</p>
                    )}
                </div>

                <div className={styles.feedItemFooter}>
                    <div className={styles.sentimentBadge}>
                        <span className="material-symbols-outlined">
                            {result.sentiment_score > 0.1 ? 'sentiment_satisfied' : result.sentiment_score < -0.1 ? 'sentiment_dissatisfied' : 'sentiment_neutral'}
                        </span>
                        <span className={styles.sentimentValue}>
                            {result.sentiment_score?.toFixed(2) ?? '0.00'}
                        </span>
                    </div>

                    {isSocial && (
                        <div className={styles.engagementStats}>
                            {isReddit && (
                                <>
                                    <div className={styles.statItem}>
                                        <span className="material-symbols-outlined">arrow_upward</span>
                                        <span>{formatCount(result.score ?? 0)}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className="material-symbols-outlined">forum</span>
                                        <span>{formatCount(result.num_comments ?? 0)}</span>
                                    </div>
                                </>
                            )}
                            {isBluesky && (
                                <>
                                    <div className={styles.statItem}>
                                        <span className="material-symbols-outlined">favorite</span>
                                        <span>{formatCount(result.score ?? 0)}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className="material-symbols-outlined">repeat</span>
                                        <span>{formatCount(result.reposts ?? 0)}</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className="material-symbols-outlined">chat_bubble</span>
                                        <span>{formatCount(result.replies ?? 0)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {!isSocial && result.bias && (
                        <div className={`${styles.biasBadge} ${result.bias === 'left' ? styles.biasLeft : styles.biasRight}`}>
                            <span>{result.bias === 'left' ? 'Left-Leaning' : 'Right-Leaning'}</span>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
};

const DashboardFeed = () => {
    const navigate = useNavigate();
    const { query, results, selectedIndices } = useAppSelector((state) => state.search);
    const [summaries, setSummaries] = useState<Map<string, SummaryResult>>(new Map());
    const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
    const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

    // Get selected results
    const selectedResults = useMemo(() => {
        return selectedIndices
            .map(index => results[index])
            .filter((result): result is SearchResult => result !== undefined)
            .sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
    }, [results, selectedIndices]);

    // Redirect if no selected results
    useEffect(() => {
        if (selectedResults.length === 0 && results.length === 0) {
            navigate('/');
        }
    }, [selectedResults, results, navigate]);

    // Fetch summaries for all selected sources
    const sessionId = useAppSelector((state) => state.search.sessionId);
    useEffect(() => {
        const fetchAllSummaries = async () => {
            for (const result of selectedResults) {
                if (!result.url || summaries.has(result.url) || loadingUrls.has(result.url) || failedUrls.has(result.url)) {
                    continue;
                }

                setLoadingUrls(prev => new Set(prev).add(result.url));

                try {
                    const summary = await fetchSummary(result.url, sessionId ?? '');
                    setSummaries(prev => new Map(prev).set(result.url, summary));
                } catch (error) {
                    console.error(`Failed to fetch summary for ${result.url}:`, error);
                    setFailedUrls(prev => new Set(prev).add(result.url));
                } finally {
                    setLoadingUrls(prev => {
                        const next = new Set(prev);
                        next.delete(result.url);
                        return next;
                    });
                }
            }
        };

        fetchAllSummaries();
    }, [selectedResults, summaries, loadingUrls, failedUrls, sessionId]);

    // Categorize selected results
    const categorizedResults = useMemo(() => {
        const left = selectedResults.filter(r => categorizeSource(r) === 'left');
        const social = selectedResults.filter(r => categorizeSource(r) === 'social');
        const right = selectedResults.filter(r => categorizeSource(r) === 'right');
        return { left, social, right };
    }, [selectedResults]);

    const totalSources = selectedResults.length;
    const loadedSummaries = summaries.size;

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
                        <nav className={styles.nav}>
                            <a href="#" className={styles.navLinkActive}>Feed</a>
                            <a href="#" className={styles.navLink}>Analysis</a>
                        </nav>
                    </div>
                    <div className={styles.headerRight}>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.meshGradient}></div>

                <div className={styles.container}>
                    {/* Page Header */}
                    <div className={styles.pageHeader}>
                        <div className={styles.pageHeaderContent}>
                            <div className={styles.breadcrumb}>
                                <span className={styles.breadcrumbLink}>Dashboard</span>
                                <span className={styles.breadcrumbSeparator}>/</span>
                                <span className={styles.breadcrumbCurrent}>Source Feed</span>
                            </div>
                            <h1 className={styles.pageTitle}>Perspectives Feed</h1>
                            <p className={styles.pageSubtitle}>
                                Analyzing <span className={styles.highlight}>{totalSources} sources</span> on{' '}
                                <span className={styles.highlight}>"{query}"</span>
                            </p>
                        </div>
                        <div className={styles.pageHeaderStats}>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>{categorizedResults.left.length}</span>
                                <span className={styles.statLabel}>Left-Leaning</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>{categorizedResults.social.length}</span>
                                <span className={styles.statLabel}>Social</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>{categorizedResults.right.length}</span>
                                <span className={styles.statLabel}>Right-Leaning</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {loadingUrls.size > 0 && (
                        <div className={styles.progressSection}>
                            <div className={styles.progressHeader}>
                                <span className="material-symbols-outlined">auto_awesome</span>
                                <span>Generating AI Summaries</span>
                                <span className={styles.progressCount}>{loadedSummaries} / {totalSources}</span>
                            </div>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${(loadedSummaries / totalSources) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Feed Columns */}
                    <div className={styles.feedColumns}>
                        {/* Left Column */}
                        <div className={styles.feedColumn}>
                            <div className={styles.feedColumnHeader}>
                                <div className={`${styles.columnIndicator} ${styles.columnLeft}`}></div>
                                <span>Left-Leaning</span>
                            </div>
                            <div className={styles.feedColumnContent}>
                                {categorizedResults.left.map((result, index) => (
                                    <FeedItem
                                        key={result.url || `left-${index}`}
                                        result={result}
                                        summary={summaries.get(result.url) ?? null}
                                        isLoading={loadingUrls.has(result.url)}
                                        category="left"
                                    />
                                ))}
                                {categorizedResults.left.length === 0 && (
                                    <div className={styles.columnEmpty}>No left-leaning sources</div>
                                )}
                            </div>
                        </div>

                        {/* Social Column */}
                        <div className={styles.feedColumn}>
                            <div className={styles.feedColumnHeader}>
                                <div className={`${styles.columnIndicator} ${styles.columnSocial}`}></div>
                                <span>Social</span>
                            </div>
                            <div className={styles.feedColumnContent}>
                                {categorizedResults.social.map((result, index) => (
                                    <FeedItem
                                        key={result.url || `social-${index}`}
                                        result={result}
                                        summary={summaries.get(result.url) ?? null}
                                        isLoading={loadingUrls.has(result.url)}
                                        category="social"
                                    />
                                ))}
                                {categorizedResults.social.length === 0 && (
                                    <div className={styles.columnEmpty}>No social sources</div>
                                )}
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className={styles.feedColumn}>
                            <div className={styles.feedColumnHeader}>
                                <div className={`${styles.columnIndicator} ${styles.columnRight}`}></div>
                                <span>Right-Leaning</span>
                            </div>
                            <div className={styles.feedColumnContent}>
                                {categorizedResults.right.map((result, index) => (
                                    <FeedItem
                                        key={result.url || `right-${index}`}
                                        result={result}
                                        summary={summaries.get(result.url) ?? null}
                                        isLoading={loadingUrls.has(result.url)}
                                        category="right"
                                    />
                                ))}
                                {categorizedResults.right.length === 0 && (
                                    <div className={styles.columnEmpty}>No right-leaning sources</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {selectedResults.length === 0 && (
                        <div className={styles.emptyState}>
                            <span className="material-symbols-outlined">inbox</span>
                            <h3>No sources selected</h3>
                            <p>Go back and select some sources to analyze</p>
                            <button onClick={() => navigate('/select-sources')} className={styles.backButton}>
                                Select Sources
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DashboardFeed;
