import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../lib/store';
import { setSelectedIndices, runInsights } from '../lib/searchSlice';
import type { SearchResult, ArticleForInsights } from '../lib/services';
import ThemeToggle from '../components/ThemeToggle';
import styles from '../styles/SelectSources.module.scss';

// Categorize sources
const LEFT_SOURCES = ['cnn', 'msnbc', 'nyt', 'nytimes', 'washington post', 'huffpost', 'vox', 'slate', 'the guardian'];
const RIGHT_SOURCES = ['fox', 'foxnews', 'breitbart', 'wsj', 'wall street journal', 'daily wire', 'newsmax', 'oann', 'the blaze'];
const SOCIAL_SOURCES = ['reddit', 'r/', 'bluesky', 'bsky'];

function categorizeSource(result: SearchResult): 'left' | 'social' | 'right' {
    const lowerSource = result.source.toLowerCase();

    // Check if it's a social source first
    if (SOCIAL_SOURCES.some(s => lowerSource.includes(s)) || result.source.toLowerCase() === 'reddit') {
        return 'social';
    }

    // Use bias field if available
    if (result.bias) {
        if (result.bias === 'left') return 'left';
        if (result.bias === 'right') return 'right';
    }

    // Fallback to source name matching
    if (LEFT_SOURCES.some(s => lowerSource.includes(s))) {
        return 'left';
    }
    if (RIGHT_SOURCES.some(s => lowerSource.includes(s))) {
        return 'right';
    }
    // Default to social for unknown sources
    return 'social';
}

function getBiasForSource(result: SearchResult): string {
    if (result.bias) return result.bias;
    const category = categorizeSource(result);
    if (category === 'left') return 'left';
    if (category === 'right') return 'right';
    return 'neutral';
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

function formatCount(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
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

// Reddit SVG icon
const RedditIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.056 1.597.04.21.06.427.06.646 0 2.734-3.516 4.952-7.84 4.952-4.323 0-7.84-2.218-7.84-4.952 0-.22.021-.435.06-.646A1.757 1.757 0 0 1 3.33 11.995c0-.968.786-1.754 1.754-1.754.463 0 .88.182 1.185.476 1.162-.845 2.783-1.4 4.567-1.487l.888-4.145 3.33.7c.01-.639.524-1.151 1.152-1.151z" />
    </svg>
);


// Bluesky SVG icon
const BlueskyIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 600 530">
        <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
    </svg>
);

interface SourceCardProps {
    result: SearchResult;
    category: 'left' | 'social' | 'right';
    isSelected: boolean;
    onToggle: () => void;
}

// Sentiment bar component - shows negative (left) to positive (right)
const SentimentBar = ({ score }: { score: number }) => {
    // Score ranges from -1 (negative) to 1 (positive)
    // Convert to percentage: -1 = 0%, 0 = 50%, 1 = 100%
    const percentage = ((score + 1) / 2) * 100;

    const getColor = () => {
        if (score <= -0.5) return '#dc2626'; // red
        if (score <= -0.1) return '#f97316'; // orange
        if (score <= 0.1) return '#a3a3a3';  // neutral gray
        if (score <= 0.5) return '#84cc16';  // lime
        return '#22c55e'; // green
    };

    return (
        <div className={styles.sentimentBarContainer}>
            <div className={styles.sentimentBarTrack}>
                <div className={styles.sentimentBarNegative} />
                <div className={styles.sentimentBarPositive} />
                <div
                    className={styles.sentimentBarIndicator}
                    style={{
                        left: `${percentage}%`,
                        backgroundColor: getColor()
                    }}
                />
                <div className={styles.sentimentBarCenter} />
            </div>
        </div>
    );
};

const SourceCard = ({ result, category, isSelected, onToggle }: SourceCardProps) => {
    const isReddit = result.source.toLowerCase().includes('reddit') || result.source.toLowerCase() === 'reddit';
    const isBluesky = result.source.toLowerCase().includes('bluesky') || result.source.toLowerCase().includes('bsky');

    const cardClass = category === 'left' ? styles.cardBlue : category === 'right' ? styles.cardRed : styles.cardNeutral;
    const checkboxClass = category === 'left' ? '' : category === 'right' ? styles.checkboxRed : styles.checkboxNeutral;

    // Get the date
    const date = result.date;

    // Get upvotes/score (Reddit)
    const upvotes = result.score ?? 0;

    // Get comments count (Reddit)
    const comments = result.num_comments ?? 0;

    // Get Bluesky stats (likes come as 'score' from backend)
    const blueskyLikes = result.score ?? 0;
    const reposts = result.reposts ?? 0;
    const replies = result.replies ?? 0;

    // Get author - use display_name for Bluesky if available
    const authorDisplay = isBluesky && result.display_name ? result.display_name : result.author;

    // Get subreddit for Reddit posts
    const subreddit = result.subreddit || '';

    // Helper to truncate text
    const truncateText = (text: string, maxLength: number) => {
        if (!text) return '';
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    const displaySource = isReddit && subreddit ? `r/${subreddit}` : isBluesky ? 'Bluesky' : result.source;

    return (
        <div
            className={`${styles.card} ${cardClass} ${isSelected ? styles.cardSelected : ''}`}
            onClick={onToggle}
        >
            <div className={styles.cardHeader}>
                <div className={styles.sourceHeader}>
                    {isReddit ? (
                        <div className={styles.sourceIconReddit}>
                            <RedditIcon />
                        </div>
                    ) : isBluesky ? (
                        <div className={styles.sourceIconBluesky}>
                            <BlueskyIcon />
                        </div>
                    ) : (
                        <div className={styles.sourceIcon}>
                            {getSourceAbbreviation(result.source)}
                        </div>
                    )}
                    <div className={styles.sourceTextGroup}>
                        <h3 className={styles.sourceName} title={displaySource}>
                            {truncateText(displaySource, 10)}
                        </h3>
                        {authorDisplay && (
                            <p className={styles.cardAuthor} title={isBluesky ? result.author : authorDisplay}>
                                {isBluesky ? truncateText(authorDisplay, 15) : `By ${truncateText(authorDisplay, 15)}`}
                            </p>
                        )}
                    </div>
                </div>
                <div className={styles.headerRight}>
                    {date && (
                        <span className={styles.cardDate}>{formatDate(date)}</span>
                    )}
                    <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.externalLink}
                        onClick={(e) => e.stopPropagation()}
                        title="Open source"
                    >
                        <span className="material-symbols-outlined">open_in_new</span>
                    </a>
                    <input
                        type="checkbox"
                        className={`${styles.checkbox} ${checkboxClass}`}
                        checked={isSelected}
                        onChange={onToggle}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
            <p className={styles.cardTitle}>{result.title || result.contents}</p>

            <div className={styles.cardFooter}>
                <div className={styles.sentimentIndicator}>
                    <span className={styles.sentimentLabel}>Sentiment</span>
                    <SentimentBar score={result.sentiment_score ?? 0} />
                    <span className={styles.sentimentValue}>
                        {(result.sentiment_score ?? 0).toFixed(2)}
                    </span>
                </div>

                {isReddit && (
                    <div className={styles.redditStats}>
                        <div className={styles.statItem}>
                            <span className="material-symbols-outlined">arrow_upward</span>
                            <span>{formatCount(upvotes)}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className="material-symbols-outlined">forum</span>
                            <span>{formatCount(comments)}</span>
                        </div>
                    </div>
                )}

                {isBluesky && (
                    <div className={styles.blueskyStats}>
                        <div className={styles.statItem}>
                            <span className="material-symbols-outlined">favorite</span>
                            <span>{formatCount(blueskyLikes)}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className="material-symbols-outlined">repeat</span>
                            <span>{formatCount(reposts)}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className="material-symbols-outlined">chat_bubble</span>
                            <span>{formatCount(replies)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SelectSources = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { query, results, status } = useAppSelector((state) => state.search);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Initialize all sources as selected
    useEffect(() => {
        if (results.length > 0) {
            setSelectedIds(new Set(results.map((_, i) => i)));
        }
    }, [results]);

    // Redirect if no results
    useEffect(() => {
        if (status === 'idle' && results.length === 0) {
            navigate('/');
        }
    }, [status, results, navigate]);

    // Categorize and sort results by date (newest first)
    const categorizedResults = useMemo(() => {
        const left: Array<{ result: SearchResult; index: number }> = [];
        const social: Array<{ result: SearchResult; index: number }> = [];
        const right: Array<{ result: SearchResult; index: number }> = [];

        results.forEach((result, index) => {
            const category = categorizeSource(result);
            if (category === 'left') {
                left.push({ result, index });
            } else if (category === 'right') {
                right.push({ result, index });
            } else {
                social.push({ result, index });
            }
        });

        // Sort each category by date (newest first)
        const sortByDate = (a: { result: SearchResult }, b: { result: SearchResult }) => {
            const dateA = a.result.date ?? 0;
            const dateB = b.result.date ?? 0;
            return dateB - dateA;
        };

        left.sort(sortByDate);
        social.sort(sortByDate);
        right.sort(sortByDate);

        return { left, social, right };
    }, [results]);

    const toggleSelection = (index: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const selectAll = (indices: number[]) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            indices.forEach((i) => next.add(i));
            return next;
        });
    };

    const selectNone = (indices: number[]) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            indices.forEach((i) => next.delete(i));
            return next;
        });
    };

    const handleProceed = async () => {
        const selectedIndicesArray = Array.from(selectedIds);

        // Save selected indices to store
        dispatch(setSelectedIndices(selectedIndicesArray));

        // Prepare articles for insights (only left and right biased)
        const articles: ArticleForInsights[] = selectedIndicesArray
            .map(index => results[index])
            .filter(result => {
                const category = categorizeSource(result);
                return category === 'left' || category === 'right';
            })
            .map(result => ({
                url: result.url,
                bias: getBiasForSource(result),
            }));

        // Fetch insights if we have left/right articles
        if (articles.length > 0) {
            dispatch(runInsights(articles));
        }

        // Navigate to dashboard
        navigate('/dashboard');
    };

    const selectedCount = selectedIds.size;
    const totalCount = results.length;

    // Calculate diversity dots
    const leftSelected = categorizedResults.left.filter(({ index }) => selectedIds.has(index)).length;
    const rightSelected = categorizedResults.right.filter(({ index }) => selectedIds.has(index)).length;

    return (
        <div className={styles.selectSources}>
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
                        <div className={styles.divider}></div>
                        <div className={styles.topicBadge}>
                            <span className={styles.topicLabel}>Active Topic</span>
                            <div className={styles.topicPill}>
                                <span className={styles.topicDot}></span>
                                <span className={styles.topicText}>{query}</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.sourceCount}>
                            <div className={styles.sourceCountLabel}>Sources Selected</div>
                            <div className={styles.sourceCountValue}>{selectedCount} / {totalCount} Available</div>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.meshGradient}></div>
                <div className={styles.gridPattern}></div>

                <div className={styles.container}>
                    <div className={styles.grid}>
                        {/* Left-Leaning Column */}
                        <div className={styles.column}>
                            <div className={styles.columnHeader}>
                                <h2 className={`${styles.columnTitle} ${styles.columnTitleBlue}`}>
                                    Left-Leaning Outlets
                                </h2>
                                <div className={`${styles.columnLine} ${styles.columnLineBlue}`}></div>
                                <div className={styles.selectionButtons}>
                                    <button
                                        className={styles.selectionButton}
                                        onClick={() => selectAll(categorizedResults.left.map(({ index }) => index))}
                                    >
                                        All
                                    </button>
                                    <span className={styles.selectionDivider}>/</span>
                                    <button
                                        className={styles.selectionButton}
                                        onClick={() => selectNone(categorizedResults.left.map(({ index }) => index))}
                                    >
                                        None
                                    </button>
                                </div>
                            </div>
                            <div className={styles.columnContent}>
                                {categorizedResults.left.length > 0 ? (
                                    categorizedResults.left.map(({ result, index }) => (
                                        <SourceCard
                                            key={index}
                                            result={result}
                                            category="left"
                                            isSelected={selectedIds.has(index)}
                                            onToggle={() => toggleSelection(index)}
                                        />
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>
                                        <span className={`material-symbols-outlined ${styles.emptyIcon}`}>
                                            search_off
                                        </span>
                                        <p className={styles.emptyText}>No left-leaning sources found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Social Discourse Column */}
                        <div className={styles.column}>
                            <div className={styles.columnHeader}>
                                <h2 className={`${styles.columnTitle} ${styles.columnTitleNeutral}`}>
                                    Social Discourse
                                </h2>
                                <div className={`${styles.columnLine} ${styles.columnLineNeutral}`}></div>
                                <div className={styles.selectionButtons}>
                                    <button
                                        className={styles.selectionButton}
                                        onClick={() => selectAll(categorizedResults.social.map(({ index }) => index))}
                                    >
                                        All
                                    </button>
                                    <span className={styles.selectionDivider}>/</span>
                                    <button
                                        className={styles.selectionButton}
                                        onClick={() => selectNone(categorizedResults.social.map(({ index }) => index))}
                                    >
                                        None
                                    </button>
                                </div>
                            </div>
                            <div className={styles.columnContent}>
                                {categorizedResults.social.length > 0 ? (
                                    categorizedResults.social.map(({ result, index }) => (
                                        <SourceCard
                                            key={index}
                                            result={result}
                                            category="social"
                                            isSelected={selectedIds.has(index)}
                                            onToggle={() => toggleSelection(index)}
                                        />
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>
                                        <span className={`material-symbols-outlined ${styles.emptyIcon}`}>
                                            search_off
                                        </span>
                                        <p className={styles.emptyText}>No social sources found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right-Leaning Column */}
                        <div className={styles.column}>
                            <div className={styles.columnHeader}>
                                <h2 className={`${styles.columnTitle} ${styles.columnTitleRed}`}>
                                    Right-Leaning Outlets
                                </h2>
                                <div className={`${styles.columnLine} ${styles.columnLineRed}`}></div>
                                <div className={styles.selectionButtons}>
                                    <button
                                        className={styles.selectionButton}
                                        onClick={() => selectAll(categorizedResults.right.map(({ index }) => index))}
                                    >
                                        All
                                    </button>
                                    <span className={styles.selectionDivider}>/</span>
                                    <button
                                        className={styles.selectionButton}
                                        onClick={() => selectNone(categorizedResults.right.map(({ index }) => index))}
                                    >
                                        None
                                    </button>
                                </div>
                            </div>
                            <div className={styles.columnContent}>
                                {categorizedResults.right.length > 0 ? (
                                    categorizedResults.right.map(({ result, index }) => (
                                        <SourceCard
                                            key={index}
                                            result={result}
                                            category="right"
                                            isSelected={selectedIds.has(index)}
                                            onToggle={() => toggleSelection(index)}
                                        />
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>
                                        <span className={`material-symbols-outlined ${styles.emptyIcon}`}>
                                            search_off
                                        </span>
                                        <p className={styles.emptyText}>No right-leaning sources found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerLeft}>
                        <div className={styles.dataLoad}>
                            <p className={styles.dataLoadLabel}>Current Data Load</p>
                            <div className={styles.dataLoadDots}>
                                {[...Array(Math.min(leftSelected, 3))].map((_, i) => (
                                    <div key={`blue-${i}`} className={`${styles.dataLoadDot} ${styles.dataLoadDotBlue}`} />
                                ))}
                                {[...Array(Math.min(rightSelected, 3))].map((_, i) => (
                                    <div key={`red-${i}`} className={`${styles.dataLoadDot} ${styles.dataLoadDotRed}`} />
                                ))}
                                {[...Array(Math.max(0, 7 - Math.min(leftSelected, 3) - Math.min(rightSelected, 3)))].map((_, i) => (
                                    <div key={`empty-${i}`} className={`${styles.dataLoadDot} ${styles.dataLoadDotEmpty}`} />
                                ))}
                            </div>
                        </div>
                        <div className={styles.diversityMessage}>
                            {leftSelected > 0 && rightSelected > 0
                                ? 'Sufficient diversity detected for balanced analysis.'
                                : 'Select sources from both sides for balanced analysis.'}
                        </div>
                    </div>
                    <div className={styles.footerRight}>

                        <button
                            className={styles.proceedButton}
                            onClick={handleProceed}
                            disabled={selectedCount === 0}
                        >
                            Analyze Sources
                            <span className="material-symbols-outlined">auto_fix_high</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SelectSources;
