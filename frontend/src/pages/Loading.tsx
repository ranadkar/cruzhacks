import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../lib/store';
import styles from '../styles/Loading.module.scss';

const stages = [
    { id: 'reddit', label: 'Scanning Reddit', icon: 'forum', source: 'r/politics, r/debate, r/news, etc' },
    { id: 'bluesky', label: 'Analyzing Bluesky', icon: 'tag', source: 'trending hashtags & threads' },
    { id: 'news', label: 'Processing News', icon: 'newspaper', source: 'CNN, Fox, NBC, etc' },
    { id: 'synthesis', label: 'Synthesizing Data', icon: 'hub', source: 'cross-referencing sources' },
];

const Loading = () => {
    const navigate = useNavigate();
    const { query, status, error } = useAppSelector((state) => state.search);
    const [activeStage, setActiveStage] = useState(0);
    const [completedStages, setCompletedStages] = useState<number[]>([]);
    const [isAnimationDone, setIsAnimationDone] = useState(false);

    // Animate through stages
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStage((prev) => {
                const next = prev + 1;
                if (next < stages.length) {
                    setCompletedStages((completed) => [...completed, prev]);
                    return next;
                }

                setIsAnimationDone(true);
                clearInterval(interval);
                return prev;
            });
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    // Navigate on success
    useEffect(() => {
        if (status === 'succeeded' && isAnimationDone) {
            // Small delay to show completion
            const timeout = setTimeout(() => {
                navigate('/select-sources');
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [status, isAnimationDone, navigate]);

    // Redirect if no query
    useEffect(() => {
        if (!query && status === 'idle') {
            navigate('/');
        }
    }, [query, status, navigate]);

    const handleRetry = () => {
        navigate('/');
    };

    return (
        <div className={styles.loading}>
            {/* Animated background */}
            <div className={styles.gradientBg}></div>
            <div className={styles.gridBg}></div>

            {/* Floating particles */}
            <div className={styles.particles}>
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className={`${styles.particle} ${i % 2 === 0 ? styles.particleBlue : styles.particleRed}`}
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 10}s`,
                            animationDuration: `${8 + Math.random() * 6}s`,
                        }}
                    />
                ))}
            </div>

            <div className={styles.content}>
                {/* Status badge */}
                <div className={styles.statusBadge}>
                    <span className={styles.statusDot}></span>
                    <span className={styles.statusText}>
                        {status === 'failed' ? 'Analysis Failed' : 'Analyzing Discourse'}
                    </span>
                </div>

                {/* Title */}
                <h1 className={styles.title}>
                    Mapping <span className={styles.queryText}>"{query}"</span>
                </h1>

                <p className={styles.subtitle}>
                    Cross-referencing partisan narratives and extracting verified data points from multiple information streams.
                </p>

                <div className={styles.visualSection}>
                    {/* Network visualization */}
                    <div className={styles.networkContainer}>
                        <svg className={styles.networkSvg} viewBox="0 0 400 400">
                            {/* Orbits */}
                            <circle cx="200" cy="200" r="180" className={`${styles.orbit} ${styles.orbitOuter}`} />
                            <circle cx="200" cy="200" r="130" className={`${styles.orbit} ${styles.orbitMiddle}`} />
                            <circle cx="200" cy="200" r="80" className={`${styles.orbit} ${styles.orbitInner}`} />

                            {/* Connection lines */}
                            <line x1="80" y1="120" x2="200" y2="200" className={`${styles.connectionLine} ${styles.connectionLineBlue}`} />
                            <line x1="320" y1="100" x2="200" y2="200" className={`${styles.connectionLine} ${styles.connectionLineRed}`} />
                            <line x1="60" y1="280" x2="200" y2="200" className={`${styles.connectionLine} ${styles.connectionLineBlue}`} />
                            <line x1="340" y1="300" x2="200" y2="200" className={`${styles.connectionLine} ${styles.connectionLineRed}`} />
                            <line x1="200" y1="40" x2="200" y2="200" className={styles.connectionLine} />
                            <line x1="200" y1="360" x2="200" y2="200" className={styles.connectionLine} />

                            {/* Data nodes - Blue (Liberal) */}
                            <g className={styles.nodeGroup}>
                                <circle cx="80" cy="120" r="12" className={styles.nodeBlue} />
                                <circle cx="60" cy="280" r="10" className={styles.nodeBlue} />
                                <circle cx="140" cy="60" r="8" className={styles.nodeBlue} />
                            </g>

                            {/* Data nodes - Red (Conservative) */}
                            <g className={styles.nodeGroup} style={{ animationDelay: '0.5s' }}>
                                <circle cx="320" cy="100" r="12" className={styles.nodeRed} />
                                <circle cx="340" cy="300" r="10" className={styles.nodeRed} />
                                <circle cx="280" cy="350" r="8" className={styles.nodeRed} />
                            </g>

                            {/* Neutral nodes */}
                            <g className={styles.nodeGroup} style={{ animationDelay: '1s' }}>
                                <circle cx="200" cy="40" r="6" className={styles.nodeNeutral} />
                                <circle cx="200" cy="360" r="6" className={styles.nodeNeutral} />
                                <circle cx="380" cy="200" r="5" className={styles.nodeNeutral} />
                                <circle cx="20" cy="200" r="5" className={styles.nodeNeutral} />
                            </g>

                            {/* Center core */}
                            <circle cx="200" cy="200" r="45" className={styles.centerGlow} />
                            <circle cx="200" cy="200" r="35" className={styles.centerCore} />

                            {/* Processing ring */}
                            <circle cx="200" cy="200" r="55" className={styles.processingRing} />
                        </svg>
                    </div>

                    {/* Error state */}
                    {status === 'failed' ? (
                        <div className={styles.errorContainer}>
                            <div className={styles.errorIcon}>
                                <span className="material-symbols-outlined">error</span>
                            </div>
                            <p className={styles.errorMessage}>
                                {error || 'Unable to complete analysis. Please check your connection and try again.'}
                            </p>
                            <button className={styles.retryButton} onClick={handleRetry}>
                                Return Home
                            </button>
                        </div>
                    ) : (
                        /* Progress stages */
                        <div className={styles.stages}>
                            {stages.map((stage, index) => (
                                <div
                                    key={stage.id}
                                    className={`${styles.stage} ${completedStages.includes(index)
                                        ? styles.stageComplete
                                        : activeStage === index
                                            ? styles.stageActive
                                            : ''
                                        }`}
                                >
                                    <div className={styles.stageIcon}>
                                        <span className="material-symbols-outlined">
                                            {completedStages.includes(index) ? 'check_circle' : stage.icon}
                                        </span>
                                    </div>
                                    <div className={styles.stageContent}>
                                        <div className={styles.stageLabel}>{stage.label}</div>
                                        <div className={styles.stageSource}>{stage.source}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Node tags */}
                <div className={styles.nodeTags}>
                    <span className={`${styles.nodeTag} ${styles.nodeTagBlue}`}>LIB_NODES</span>
                    <span className={`${styles.nodeTag} ${styles.nodeTagRed}`}>CON_NODES</span>
                </div>
            </div>
        </div>
    );
};

export default Loading;
