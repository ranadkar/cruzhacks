import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../lib/store';
import type { SearchResult } from '../lib/search';
import ThemeToggle from '../components/ThemeToggle';
import styles from '../styles/SelectSources.module.scss';

// Categorize sources
const LEFT_SOURCES = ['cnn', 'msnbc', 'nyt', 'nytimes', 'washington post', 'huffpost', 'vox', 'slate', 'the guardian'];
const RIGHT_SOURCES = ['fox', 'foxnews', 'breitbart', 'wsj', 'wall street journal', 'daily wire', 'newsmax', 'oann', 'the blaze'];
const SOCIAL_SOURCES = ['reddit', 'twitter', 'x.com', 'r/'];

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

// Twitter/X SVG icon
const TwitterIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
    const isTwitter = result.source.toLowerCase().includes('twitter') || result.source.toLowerCase().includes('x.com');

    const cardClass = category === 'left' ? styles.cardBlue : category === 'right' ? styles.cardRed : styles.cardNeutral;
    const checkboxClass = category === 'left' ? '' : category === 'right' ? styles.checkboxRed : styles.checkboxNeutral;

    // Get the date
    const date = result.date;

    // Get upvotes/score
    const upvotes = result.score ?? 0;

    // Get comments count
    const comments = result.num_comments ?? 0;

    // Get author
    const authorDisplay = result.author;

    // Get subreddit for Reddit posts
    const subreddit = result.subreddit || '';

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
                    ) : isTwitter ? (
                        <div className={styles.sourceIconTwitter}>
                            <TwitterIcon />
                        </div>
                    ) : (
                        <div className={styles.sourceIcon}>
                            {getSourceAbbreviation(result.source)}
                        </div>
                    )}
                    <div className={styles.sourceTextGroup}>
                        <h3 className={styles.sourceName}>
                            {isReddit && subreddit ? `r/${subreddit}` : result.source}
                        </h3>
                        {authorDisplay && (
                            <p className={styles.cardAuthor}>By {authorDisplay}</p>
                        )}
                    </div>
                </div>
                <div className={styles.headerRight}>
                    {date && (
                        <span className={styles.cardDate}>{formatDate(date)}</span>
                    )}
                    <input
                        type="checkbox"
                        className={`${styles.checkbox} ${checkboxClass}`}
                        checked={isSelected}
                        onChange={onToggle}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
            <p className={styles.cardTitle}>{result.title}</p>

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
            </div>
        </div>
    );
};

const SelectSources = () => {
    const navigate = useNavigate();
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

    // Categorize results
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

    const handleProceed = () => {
        // TODO: Navigate to synthesis/results page with selected sources
        navigate('/search-results');
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
                        <div className={styles.logo}>
                            <div className={styles.logoIcon}>
                                <span className="material-symbols-outlined">balance</span>
                            </div>
                            <span className={styles.logoText}>Pulse.</span>
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
                                ? 'Sufficient diversity detected for balanced synthesis.'
                                : 'Select sources from both sides for balanced analysis.'}
                        </div>
                    </div>
                    <div className={styles.footerRight}>
                        <div className={styles.versionText}>
                            Pulse Analysis Engine. v4.2.0-stable
                        </div>
                        <button
                            className={styles.proceedButton}
                            onClick={handleProceed}
                            disabled={selectedCount === 0}
                        >
                            Proceed to Synthesis
                            <span className="material-symbols-outlined">auto_fix_high</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SelectSources;
