import { useMemo } from 'react';
import { useAppSelector } from '../lib/store';
import type { SearchResult } from '../lib/services';
import SentimentTimeline from './SentimentTimeline';
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

interface DashboardAnalysisProps {
    onSwitchToFeed: () => void;
}

const DashboardAnalysis = ({ onSwitchToFeed: _onSwitchToFeed }: DashboardAnalysisProps) => {
    const { query, results, selectedIndices, insights, insightsStatus, insightsError } = useAppSelector((state) => state.search);

    const isLoading = insightsStatus === 'loading';
    const error = insightsError;

    // Get selected results
    const selectedResults = useMemo(() => {
        return selectedIndices
            .map(index => results[index])
            .filter((result): result is SearchResult => result !== undefined);
    }, [results, selectedIndices]);

    // Categorize selected results
    const categorizedResults = useMemo(() => {
        const left = selectedResults.filter(r => categorizeSource(r) === 'left');
        const social = selectedResults.filter(r => categorizeSource(r) === 'social');
        const right = selectedResults.filter(r => categorizeSource(r) === 'right');
        return { left, social, right };
    }, [selectedResults]);

    // Calculate average sentiment scores for left and right
    const sentimentStats = useMemo(() => {
        const leftScores = categorizedResults.left.map(r => r.sentiment_score ?? 0);
        const rightScores = categorizedResults.right.map(r => r.sentiment_score ?? 0);

        const avgLeft = leftScores.length > 0
            ? leftScores.reduce((a, b) => a + b, 0) / leftScores.length
            : 0;
        const avgRight = rightScores.length > 0
            ? rightScores.reduce((a, b) => a + b, 0) / rightScores.length
            : 0;

        // Calculate position for the indicator (0-100%)
        // Maps -1 to 0%, 0 to 50%, 1 to 100%
        const leftPosition = ((avgLeft + 1) / 2) * 100;
        const rightPosition = ((avgRight + 1) / 2) * 100;

        return {
            leftPosition,
            rightPosition,
            leftRaw: avgLeft,
            rightRaw: avgRight,
        };
    }, [categorizedResults]);

    const totalSources = selectedResults.length;

    // Export report function
    const exportReport = () => {
        const date = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const divider = '═'.repeat(60);
        const sectionDivider = '─'.repeat(60);

        let report = `
${divider}
                    PERSPECTIVES ANALYSIS REPORT
${divider}

Generated: ${date}
Search Query: "${query}"
Total Sources Analyzed: ${totalSources}

${sectionDivider}
                         SOURCE BREAKDOWN
${sectionDivider}

  • Left-Leaning Sources:  ${categorizedResults.left.length}
  • Social Sources:        ${categorizedResults.social.length}
  • Right-Leaning Sources: ${categorizedResults.right.length}

${sectionDivider}
                       SENTIMENT ANALYSIS
${sectionDivider}

CONSERVATIVE BASE
  Sentiment Score: ${sentimentStats.rightRaw.toFixed(2)} (range: -1 to 1)
  Position: ${sentimentStats.rightRaw > 0 ? 'Constructive' : sentimentStats.rightRaw < -0.3 ? 'Hostile' : 'Neutral'}

LIBERAL BASE
  Sentiment Score: ${sentimentStats.leftRaw.toFixed(2)} (range: -1 to 1)
  Position: ${sentimentStats.leftRaw > 0 ? 'Constructive' : sentimentStats.leftRaw < -0.3 ? 'Hostile' : 'Neutral'}

${sectionDivider}
                        KEY TAKEAWAYS
${sectionDivider}

CONSERVATIVE PERSPECTIVE:
${insights?.key_takeaway_right ? `  ${insights.key_takeaway_right}` : '  No insights available'}

LIBERAL PERSPECTIVE:
${insights?.key_takeaway_left ? `  ${insights.key_takeaway_left}` : '  No insights available'}

${sectionDivider}
                    COMMON GROUND SYNTHESIS
${sectionDivider}
${insights?.common_ground?.length ? insights.common_ground.map((item, index) => `
Topic ${String(index + 1).padStart(2, '0')}: ${item.title}
  ${item.bullet_point}
`).join('\n') : '\nNo common ground analysis available\n'}

${sectionDivider}
                       SOURCES ANALYZED
${sectionDivider}

LEFT-LEANING SOURCES:
${categorizedResults.left.length > 0 ? categorizedResults.left.map(r => `  • ${r.source}: ${r.title}`).join('\n') : '  None'}

SOCIAL SOURCES:
${categorizedResults.social.length > 0 ? categorizedResults.social.map(r => `  • ${r.source}: ${r.title}`).join('\n') : '  None'}

RIGHT-LEANING SOURCES:
${categorizedResults.right.length > 0 ? categorizedResults.right.map(r => `  • ${r.source}: ${r.title}`).join('\n') : '  None'}

${divider}
                      END OF REPORT
${divider}
`;

        // Create and download the file
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `perspectives-report-${query.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={styles.analysisContainer}>
            {/* Page Header */}
            <div className={styles.analysisHeader}>
                <div className={styles.analysisHeaderContent}>
                    <h1 className={styles.analysisTitle}>Perspectives Analysis & Common Ground</h1>
                    <p className={styles.analysisSubtitle}>
                        Comparative view of <span className={styles.highlight}>{totalSources} sources</span> on{' '}
                        <span className={styles.highlight}>"{query}"</span>. Identifying diverging narratives and synthesis opportunities.
                    </p>
                </div>
                <div className={styles.analysisActions}>
                    <button className={styles.exportButton} onClick={exportReport}>
                        <span className="material-symbols-outlined">download</span>
                        Export Report
                    </button>
                </div>
            </div>


            {/* Sentiment Cards Grid */}
            <div className={styles.sentimentGrid}>
                {/* Conservative/Right Card */}
                <div className={styles.sentimentCard}>
                    <div className={`${styles.cardAccentBar} ${styles.cardAccentRed}`}></div>
                    <div className={styles.cardBody}>
                        <div className={styles.cardHeaderRow}>
                            <div>
                                <h3 className={styles.cardTitle}>Conservative Base</h3>
                                <p className={styles.cardSubtitle}>Sentiment Spectrum</p>
                            </div>
                            <div className={styles.scoreDisplay}>
                                <span className={`${styles.scoreValue} ${styles.scoreRed}`}>
                                    {sentimentStats.rightRaw.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.spectrumSection}>
                            <div className={styles.spectrumLabels}>
                                <span>Hostile</span>
                                <span>Neutral</span>
                                <span>Constructive</span>
                            </div>
                            <div className={styles.spectrumTrack}>
                                <div className={`${styles.spectrumRange} ${styles.spectrumRangeRed}`}></div>
                                <div
                                    className={`${styles.spectrumIndicator} ${styles.spectrumIndicatorRed}`}
                                    style={{ left: `${sentimentStats.rightPosition}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className={styles.takeawayBox}>
                            <div className={`${styles.takeawayHeader} ${styles.takeawayHeaderRed}`}>
                                <span className="material-symbols-outlined">lightbulb</span>
                                <h4>Key Takeaway</h4>
                            </div>
                            {isLoading ? (
                                <div className={styles.takeawayLoading}>
                                    <div className={styles.loadingDots}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span>Analyzing perspectives...</span>
                                </div>
                            ) : error ? (
                                <p className={styles.takeawayError}>{error}</p>
                            ) : insights ? (
                                <p className={styles.takeawayText}>{insights.key_takeaway_right}</p>
                            ) : (
                                <p className={styles.takeawayPlaceholder}>No insights available</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Liberal/Left Card */}
                <div className={styles.sentimentCard}>
                    <div className={`${styles.cardAccentBar} ${styles.cardAccentBlue}`}></div>
                    <div className={styles.cardBody}>
                        <div className={styles.cardHeaderRow}>
                            <div>
                                <h3 className={styles.cardTitle}>Liberal Base</h3>
                                <p className={styles.cardSubtitle}>Sentiment Spectrum</p>
                            </div>
                            <div className={styles.scoreDisplay}>
                                <span className={`${styles.scoreValue} ${styles.scoreBlue}`}>
                                    {sentimentStats.leftRaw.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.spectrumSection}>
                            <div className={styles.spectrumLabels}>
                                <span>Hostile</span>
                                <span>Neutral</span>
                                <span>Constructive</span>
                            </div>
                            <div className={styles.spectrumTrack}>
                                <div className={`${styles.spectrumRange} ${styles.spectrumRangeBlue}`}></div>
                                <div
                                    className={`${styles.spectrumIndicator} ${styles.spectrumIndicatorBlue}`}
                                    style={{ left: `${sentimentStats.leftPosition}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className={styles.takeawayBox}>
                            <div className={`${styles.takeawayHeader} ${styles.takeawayHeaderBlue}`}>
                                <span className="material-symbols-outlined">lightbulb</span>
                                <h4>Key Takeaway</h4>
                            </div>
                            {isLoading ? (
                                <div className={styles.takeawayLoading}>
                                    <div className={styles.loadingDots}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span>Analyzing perspectives...</span>
                                </div>
                            ) : error ? (
                                <p className={styles.takeawayError}>{error}</p>
                            ) : insights ? (
                                <p className={styles.takeawayText}>{insights.key_takeaway_left}</p>
                            ) : (
                                <p className={styles.takeawayPlaceholder}>No insights available</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Sentiment Timeline Chart */}
            <SentimentTimeline />

            {/* Common Ground Section */}
            <div className={styles.commonGroundSection}>
                <div className={styles.commonGroundHeader}>
                    <div className={styles.commonGroundIcon}>
                        <span className="material-symbols-outlined">join_inner</span>
                    </div>
                    <div>
                        <h3 className={styles.commonGroundTitle}>Common Ground Synthesis</h3>
                        <p className={styles.commonGroundSubtitle}>Emerging areas of bipartisan consensus</p>
                    </div>
                </div>
                <div className={styles.commonGroundContent}>
                    {isLoading ? (
                        <div className={styles.commonGroundLoading}>
                            <div className={styles.loadingDots}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span>Finding common ground...</span>
                        </div>
                    ) : error ? (
                        <p className={styles.commonGroundError}>{error}</p>
                    ) : insights && insights.common_ground?.length > 0 ? (
                        <div className={styles.commonGroundGrid}>
                            {insights.common_ground.map((item, index) => (
                                <div key={index} className={styles.commonGroundItem}>
                                    <p className={styles.commonGroundTopicLabel}>Topic {String(index + 1).padStart(2, '0')}</p>
                                    <h4 className={styles.commonGroundItemTitle}>{item.title}</h4>
                                    <p className={styles.commonGroundItemText}>{item.bullet_point}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.commonGroundPlaceholder}>No common ground analysis available</p>
                    )}
                </div>
            </div>

            {/* Stats Summary */}
            <div className={styles.analysisSummary}>
                <div className={styles.summaryStatItem}>
                    <span className={`${styles.summaryDot} ${styles.summaryDotBlue}`}></span>
                    <span className={styles.summaryLabel}>Left-Leaning Sources:</span>
                    <span className={styles.summaryValue}>{categorizedResults.left.length}</span>
                </div>
                <div className={styles.summaryStatItem}>
                    <span className={`${styles.summaryDot} ${styles.summaryDotGray}`}></span>
                    <span className={styles.summaryLabel}>Social Sources:</span>
                    <span className={styles.summaryValue}>{categorizedResults.social.length}</span>
                </div>
                <div className={styles.summaryStatItem}>
                    <span className={`${styles.summaryDot} ${styles.summaryDotRed}`}></span>
                    <span className={styles.summaryLabel}>Right-Leaning Sources:</span>
                    <span className={styles.summaryValue}>{categorizedResults.right.length}</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalysis;
