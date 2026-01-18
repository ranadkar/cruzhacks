import { useMemo, useState } from 'react';
import {
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Cell,
    Line,
    ComposedChart,
} from 'recharts';
import { useAppSelector } from '../lib/store';
import type { SearchResult } from '../lib/services';
import styles from '../styles/SentimentTimeline.module.scss';

// Categorize sources
const LEFT_SOURCES = ['cnn', 'msnbc', 'nyt', 'nytimes', 'washington post', 'huffpost', 'vox', 'slate', 'the guardian'];
const RIGHT_SOURCES = ['fox', 'foxnews', 'breitbart', 'wsj', 'wall street journal', 'daily wire', 'newsmax', 'oann', 'the blaze'];
const SOCIAL_SOURCES = ['reddit', 'r/', 'bluesky', 'bsky'];

// Check if source is social media
function isSocialSource(result: SearchResult): boolean {
    const lowerSource = result.source.toLowerCase();
    return SOCIAL_SOURCES.some(s => lowerSource.includes(s)) || lowerSource === 'reddit';
}

// Get the bias of a source (for social media, use their bias field)
function getSourceBias(result: SearchResult): 'left' | 'right' | 'neutral' {
    if (result.bias) {
        if (result.bias === 'left') return 'left';
        if (result.bias === 'right') return 'right';
    }
    const lowerSource = result.source.toLowerCase();
    if (LEFT_SOURCES.some(s => lowerSource.includes(s))) return 'left';
    if (RIGHT_SOURCES.some(s => lowerSource.includes(s))) return 'right';
    return 'neutral';
}

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

// Linear regression for trend line
function calculateTrendLine(data: { x: number; y: number }[]): { slope: number; intercept: number } | null {
    if (data.length < 2) return null;

    const n = data.length;
    const sumX = data.reduce((acc, d) => acc + d.x, 0);
    const sumY = data.reduce((acc, d) => acc + d.y, 0);
    const sumXY = data.reduce((acc, d) => acc + d.x * d.y, 0);
    const sumXX = data.reduce((acc, d) => acc + d.x * d.x, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

// Color palette matching Dashboard
const COLORS = {
    left: '#3B82F6',      // vibrant-blue
    right: '#EF4444',     // vibrant-red  
    social: '#64748B',    // slate
    leftGlow: 'rgba(59, 130, 246, 0.3)',
    rightGlow: 'rgba(239, 68, 68, 0.3)',
    socialGlow: 'rgba(100, 116, 139, 0.3)',
    positive: '#10B981',  // emerald
    negative: '#F43F5E',  // rose
    neutral: '#94A3B8',   // slate-400
    grid: '#334155',      // border-slate
    surface: '#1E293B',   // charcoal-card
    // Lighter trend line colors
    leftTrend: '#93C5FD',   // lighter blue for trend line
    rightTrend: '#FCA5A5',  // lighter red for trend line
};

interface DataPoint {
    x: number;
    y: number;
    z: number;
    category: 'left' | 'social' | 'right';
    bias: 'left' | 'right' | 'neutral';
    isSocial: boolean;
    source: string;
    title: string;
    sentiment: string;
    date: Date;
    url: string;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DataPoint }> }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data || !data.date) return null;

    const sentimentLabel = data.y > 0.1 ? 'Positive' : data.y < -0.1 ? 'Negative' : 'Neutral';
    const sentimentColor = data.y > 0.1 ? COLORS.positive : data.y < -0.1 ? COLORS.negative : COLORS.neutral;

    return (
        <div className={styles.tooltip}>
            <div className={styles.tooltipHeader}>
                <span
                    className={styles.tooltipDot}
                    style={{ backgroundColor: COLORS[data.category] }}
                />
                <span className={styles.tooltipSource}>{data.source}</span>
            </div>
            <p className={styles.tooltipTitle}>{data.title}</p>
            <div className={styles.tooltipMeta}>
                <div className={styles.tooltipSentiment}>
                    <span style={{ color: sentimentColor }}>{sentimentLabel}</span>
                    <span className={styles.tooltipScore}>{data.y.toFixed(2)}</span>
                </div>
                <span className={styles.tooltipDate}>
                    {data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
};

// Get color based on data point
function getPointColor(payload: DataPoint): string {
    // Social media posts are always gray
    if (payload.isSocial) {
        return COLORS.social;
    }
    // Non-social colored by category
    return COLORS[payload.category];
}

// Get border color for social media posts based on their bias
function getSocialBorderColor(payload: DataPoint): string {
    if (payload.bias === 'left') return COLORS.left;
    if (payload.bias === 'right') return COLORS.right;
    return COLORS.social;
}

function getGlowColor(payload: DataPoint, colorByBias: boolean): string {
    // Social media posts use their bias color for subtle glow when colorByBias is true
    if (payload.isSocial && colorByBias) {
        if (payload.bias === 'left') return COLORS.leftGlow;
        if (payload.bias === 'right') return COLORS.rightGlow;
        return COLORS.socialGlow;
    }
    if (payload.isSocial) {
        return COLORS.socialGlow;
    }
    return payload.category === 'left' ? COLORS.leftGlow :
        payload.category === 'right' ? COLORS.rightGlow : COLORS.socialGlow;
}

// Custom dot component with glow effect
const CustomDot = (props: {
    cx?: number;
    cy?: number;
    payload?: DataPoint;
    isHovered?: boolean;
    colorByBias?: boolean;
}) => {
    const { cx, cy, payload, isHovered, colorByBias = true } = props;
    if (!cx || !cy || !payload) return null;

    const color = getPointColor(payload);
    const glowColor = getGlowColor(payload, colorByBias);

    // Social media posts get a colored border based on bias
    const isSocialWithBias = payload.isSocial && colorByBias;
    const borderColor = isSocialWithBias ? getSocialBorderColor(payload) : 'rgba(255,255,255,0.2)';
    const borderWidth = isSocialWithBias ? 1.5 : 1;

    const handleClick = () => {
        if (payload.url) {
            window.open(payload.url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <g onClick={handleClick} style={{ cursor: 'pointer' }}>
            {/* Subtle outer glow - reduced effect */}
            <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 12 : 8}
                fill={glowColor}
                style={{
                    transition: 'all 0.2s ease',
                    filter: `blur(${isHovered ? 4 : 2}px)`,
                    opacity: 0.6,
                }}
            />
            {/* Main dot with bias-colored border for social posts */}
            <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 7 : 5}
                fill={color}
                stroke={borderColor}
                strokeWidth={borderWidth}
                style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                }}
            />
        </g>
    );
};

type FilterType = 'all' | 'left' | 'social' | 'right';

const SentimentTimeline = () => {
    const { results, selectedIndices } = useAppSelector((state) => state.search);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [colorByBias, setColorByBias] = useState<boolean>(true); // Default: show social by bias

    // Transform selected results into chart data
    const chartData = useMemo(() => {
        const selectedResults = selectedIndices
            .map(index => results[index])
            .filter((result): result is SearchResult => result !== undefined);

        return selectedResults
            .filter(r => r.date && r.sentiment_score !== undefined)
            .map(r => ({
                x: r.date * 1000, // Convert to milliseconds
                y: r.sentiment_score,
                z: Math.abs(r.sentiment_score) * 100 + 50, // Size based on sentiment magnitude
                category: categorizeSource(r),
                bias: getSourceBias(r),
                isSocial: isSocialSource(r),
                source: r.source,
                title: r.title || r.contents?.substring(0, 60) + '...' || 'Untitled',
                sentiment: r.sentiment || '',
                date: new Date(r.date * 1000),
                url: r.url,
            }))
            .sort((a, b) => a.x - b.x);
    }, [results, selectedIndices]);

    // Filter data based on active filter
    const filteredData = useMemo(() => {
        if (activeFilter === 'all') return chartData;
        return chartData.filter(d => d.category === activeFilter);
    }, [chartData, activeFilter]);

    // Calculate stats
    const stats = useMemo(() => {
        if (filteredData.length === 0) return { avg: 0, positive: 0, negative: 0, neutral: 0 };

        const sum = filteredData.reduce((acc, d) => acc + d.y, 0);
        const avg = sum / filteredData.length;
        const positive = filteredData.filter(d => d.y > 0.1).length;
        const negative = filteredData.filter(d => d.y < -0.1).length;
        const neutral = filteredData.filter(d => d.y >= -0.1 && d.y <= 0.1).length;

        return { avg, positive, negative, neutral };
    }, [filteredData]);

    // Get date range for axis
    const dateRange = useMemo(() => {
        if (chartData.length === 0) return { min: Date.now() - 86400000, max: Date.now() };
        const dates = chartData.map(d => d.x);
        const min = Math.min(...dates);
        const max = Math.max(...dates);
        const padding = (max - min) * 0.05 || 3600000; // 5% padding or 1 hour
        return { min: min - padding, max: max + padding };
    }, [chartData]);

    // Calculate trend lines for left and right data
    const trendLines = useMemo(() => {
        // When colorByBias is true, include social media posts based on their bias
        const leftData = chartData.filter(d => {
            if (colorByBias) {
                return d.category === 'left' || (d.isSocial && d.bias === 'left');
            }
            return d.category === 'left';
        });
        const rightData = chartData.filter(d => {
            if (colorByBias) {
                return d.category === 'right' || (d.isSocial && d.bias === 'right');
            }
            return d.category === 'right';
        });

        const leftTrend = calculateTrendLine(leftData);
        const rightTrend = calculateTrendLine(rightData);

        // Generate points for trend lines
        const generateTrendPoints = (trend: { slope: number; intercept: number } | null) => {
            if (!trend) return [];
            const { slope, intercept } = trend;
            // Generate points at the start and end of the date range
            return [
                { x: dateRange.min, y: Math.max(-1, Math.min(1, slope * dateRange.min + intercept)) },
                { x: dateRange.max, y: Math.max(-1, Math.min(1, slope * dateRange.max + intercept)) },
            ];
        };

        return {
            left: generateTrendPoints(leftTrend),
            right: generateTrendPoints(rightTrend),
        };
    }, [chartData, dateRange, colorByBias]);

    const formatXAxis = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatYAxis = (value: number) => {
        if (value === 1) return '+1';
        if (value === -1) return '-1';
        if (value === 0) return '0';
        return '';
    };

    const filterButtons: { key: FilterType; label: string; color: string }[] = [
        { key: 'all', label: 'All Sources', color: '#fff' },
        { key: 'left', label: 'Liberal', color: COLORS.left },
        { key: 'right', label: 'Conservative', color: COLORS.right },
        { key: 'social', label: 'Social', color: COLORS.social },
    ];

    if (chartData.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <span className="material-symbols-outlined">timeline</span>
                    <p>No data available for timeline visualization</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}>
                        <span className="material-symbols-outlined">show_chart</span>
                    </div>
                    <div>
                        <h3 className={styles.title}>Sentiment Timeline</h3>
                        <p className={styles.subtitle}>Tracking emotional tone across sources over time</p>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    {/* Color mode toggle */}
                    <div className={styles.colorModeToggle}>
                        <span className={styles.toggleLabel}>Social posts:</span>
                        <button
                            className={`${styles.toggleBtn} ${colorByBias ? styles.toggleBtnActive : ''}`}
                            onClick={() => setColorByBias(true)}
                        >
                            <span className={styles.toggleDotLeft} />
                            <span className={styles.toggleDotRight} />
                            By Bias
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${!colorByBias ? styles.toggleBtnActive : ''}`}
                            onClick={() => setColorByBias(false)}
                        >
                            <span className={styles.toggleDotGray} />
                            Gray
                        </button>
                    </div>
                    <div className={styles.filtersDivider} />
                    <div className={styles.filters}>
                        {filterButtons.map(btn => (
                            <button
                                key={btn.key}
                                className={`${styles.filterBtn} ${activeFilter === btn.key ? styles.filterBtnActive : ''}`}
                                onClick={() => setActiveFilter(btn.key)}
                                style={{
                                    '--btn-color': btn.color,
                                    '--btn-glow': btn.key !== 'all' ? btn.color : 'transparent',
                                } as React.CSSProperties}
                            >
                                {btn.key !== 'all' && (
                                    <span className={styles.filterDot} style={{ backgroundColor: btn.color }} />
                                )}
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Avg Sentiment</span>
                    <span
                        className={styles.statValue}
                        style={{
                            color: stats.avg > 0.1 ? COLORS.positive :
                                stats.avg < -0.1 ? COLORS.negative : COLORS.neutral
                        }}
                    >
                        {stats.avg >= 0 ? '+' : ''}{stats.avg.toFixed(2)}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Positive</span>
                    <span className={styles.statValue} style={{ color: COLORS.positive }}>
                        {stats.positive}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Neutral</span>
                    <span className={styles.statValue} style={{ color: COLORS.neutral }}>
                        {stats.neutral}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Negative</span>
                    <span className={styles.statValue} style={{ color: COLORS.negative }}>
                        {stats.negative}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className={styles.chartWrapper}>
                {/* Y-Axis Labels */}
                <div className={styles.yAxisLabels}>
                    <span className={styles.yLabelPositive}>
                        <span className="material-symbols-outlined">sentiment_satisfied</span>
                        Positive
                    </span>
                    <span className={styles.yLabelNeutral}>Neutral</span>
                    <span className={styles.yLabelNegative}>
                        <span className="material-symbols-outlined">sentiment_dissatisfied</span>
                        Negative
                    </span>
                </div>

                {/* Chart Container */}
                <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height={380}>
                        <ComposedChart
                            margin={{ top: 30, right: 30, bottom: 30, left: 20 }}
                        >
                            <defs>
                                {/* Gradients for reference areas */}
                                <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={COLORS.positive} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={COLORS.positive} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="negativeGradient" x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0%" stopColor={COLORS.negative} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={COLORS.negative} stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <XAxis
                                type="number"
                                dataKey="x"
                                domain={[dateRange.min, dateRange.max]}
                                tickFormatter={formatXAxis}
                                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                                axisLine={{ stroke: COLORS.grid }}
                                tickLine={{ stroke: COLORS.grid }}
                                tickCount={6}
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                domain={[-1, 1]}
                                tickFormatter={formatYAxis}
                                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                                axisLine={{ stroke: COLORS.grid }}
                                tickLine={{ stroke: COLORS.grid }}
                                ticks={[-1, -0.5, 0, 0.5, 1]}
                            />
                            <ZAxis type="number" dataKey="z" range={[40, 200]} />

                            {/* Reference lines */}
                            <ReferenceLine
                                y={0}
                                stroke={COLORS.grid}
                                strokeWidth={2}
                                strokeDasharray="4 4"
                            />
                            <ReferenceLine
                                y={0.5}
                                stroke={COLORS.positive}
                                strokeOpacity={0.2}
                                strokeDasharray="2 4"
                            />
                            <ReferenceLine
                                y={-0.5}
                                stroke={COLORS.negative}
                                strokeOpacity={0.2}
                                strokeDasharray="2 4"
                            />

                            {/* Trend lines */}
                            {trendLines.left.length >= 2 && (
                                <Line
                                    data={trendLines.left}
                                    type="linear"
                                    dataKey="y"
                                    stroke={COLORS.leftTrend}
                                    strokeWidth={2}
                                    strokeDasharray="6 4"
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Left Trend"
                                />
                            )}
                            {trendLines.right.length >= 2 && (
                                <Line
                                    data={trendLines.right}
                                    type="linear"
                                    dataKey="y"
                                    stroke={COLORS.rightTrend}
                                    strokeWidth={2}
                                    strokeDasharray="6 4"
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Right Trend"
                                />
                            )}

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ strokeDasharray: '3 3', stroke: COLORS.grid }}
                            />

                            <Scatter
                                data={filteredData}
                                shape={<CustomDot isHovered={false} colorByBias={colorByBias} />}
                            >
                                {filteredData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={getPointColor(entry)}
                                    />
                                ))}
                            </Scatter>
                        </ComposedChart>
                    </ResponsiveContainer>

                    {/* Background zones */}
                    <div className={styles.zonePositive} />
                    <div className={styles.zoneNegative} />
                </div>
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                <div className={styles.legendSection}>
                    <span className={styles.legendTitle}>Source Type</span>
                    <div className={styles.legendItems}>
                        <div className={styles.legendItem}>
                            <span className={styles.legendDot} style={{ backgroundColor: COLORS.left }} />
                            <span>Liberal</span>
                        </div>
                        <div className={styles.legendItem}>
                            <span className={styles.legendDot} style={{ backgroundColor: COLORS.right }} />
                            <span>Conservative</span>
                        </div>
                        {!colorByBias && (
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ backgroundColor: COLORS.social }} />
                                <span>Social</span>
                            </div>
                        )}
                        {colorByBias && (
                            <div className={styles.legendItem}>
                                <span className={styles.legendDotSocial}>
                                    <span className={styles.legendDotSocialInner} />
                                </span>
                                <span>Social (border = bias)</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className={styles.legendSection}>
                    <span className={styles.legendTitle}>Trend Lines</span>
                    <div className={styles.legendItems}>
                        <div className={styles.legendItem}>
                            <span className={styles.legendLineDashed} style={{ backgroundColor: COLORS.leftTrend }} />
                            <span>Liberal Trend</span>
                        </div>
                        <div className={styles.legendItem}>
                            <span className={styles.legendLineDashed} style={{ backgroundColor: COLORS.rightTrend }} />
                            <span>Conservative Trend</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SentimentTimeline;
