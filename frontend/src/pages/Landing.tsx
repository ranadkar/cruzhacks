import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingNav from '../components/LandingNav';
import { useAppDispatch, useAppSelector } from '../lib/store';
import { runSearch, setQuery } from '../lib/searchSlice';
import styles from '../styles/Landing.module.scss';

const Landing = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { query, status } = useAppSelector((state) => state.search);
  const isLoading = status === 'loading';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      dispatch(runSearch(query));
      navigate('/loading');
    }
  };

  return (
    <div className={styles.landing}>
      <LandingNav />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.heroSection} id="demo">
          <div className={styles.gridBgDark}></div>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.badgeDotRed}></span>
              <span className={styles.badgeDotBlue}></span>
              <span className={styles.badgeText}>Bipartisan Analysis Engine</span>
            </div>
            <h1 className={styles.heroTitle}>
              Democratizing Insight in a <span className={styles.heroTitleItalic}>Divided</span> Information Age
            </h1>
            <p className={styles.heroSubtitle}>
              Comparative linguistics and cluster analysis to decode political discourse, stripping away rhetoric to reveal core disagreements and shared realities.
            </p>
            <div className={styles.searchBox}>
              <form className={styles.searchForm} onSubmit={handleSubmit}>
                <div className={styles.searchInputWrapper}>
                  <div className={styles.searchIcon}>
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    className={styles.searchInput}
                    placeholder="Enter a topic (e.g. NATO Funding, Tax Policy)"
                    type="text"
                    value={query}
                    onChange={(e) => dispatch(setQuery(e.target.value))}
                  />
                </div>
                <button
                  className={styles.searchButton}
                  type="submit"
                  disabled={isLoading || !query.trim()}
                >
                  <span className={styles.searchButtonText}>
                    {isLoading ? 'Analyzing...' : 'Analyze Discussion'}
                  </span>
                  <span className="material-symbols-outlined">analytics</span>
                </button>
              </form>
              <div className={styles.searchMeta}>
                <div className={styles.statusIndicator}>
                  <span className={styles.statusDot}></span>
                  <span>System Active</span>
                </div>
                <div className={styles.dataSource}>
                  <span className="material-symbols-outlined">database</span>
                  <span>Reddit / BlueSky / NewsAPI</span>
                </div>
                <div className={styles.nodeTags}>
                  <span className={styles.nodeTagBlue}>LIB_NODES</span>
                  <span className={styles.nodeTagRed}>CON_NODES</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Liberal/Methodology Section */}
        <section className={styles.methodologySection} id="methodology">
          <div className={styles.sectionContainer}>
            <div className={styles.sectionGrid}>
              <div className={`${styles.contentWrapper} ${styles.contentOrder2}`}>
                <div className={styles.sectionLabel}>
                  <span className={`${styles.sectionLabelText} ${styles.sectionLabelBlue}`}>01 — Linguistic Patterns</span>
                  <div className={`${styles.sectionLabelLine} ${styles.sectionLabelLineBlue}`}></div>
                </div>
                <h2 className={styles.sectionTitle}>Liberal Narrative Analysis</h2>
                <p className={styles.sectionDescription}>
                  Our algorithm maps the semantic density of Liberal discourse across major news outlets and social media platforms such as Reddit and bluesky. We isolate specific value-anchors—such as systemic equity and collective welfare—that define the core arguments within these information silos.
                </p>
                <div className={styles.featureCards}>
                  <div className={`${styles.featureCard} ${styles.featureCardBlue}`}>
                    <h4 className={styles.featureCardTitle}>Signal Identification</h4>
                    <p className={styles.featureCardDesc}>Identifying cross-citation patterns across Reddit threads, Bluesky conversations, and news articles.</p>
                  </div>
                  <div className={`${styles.featureCard} ${styles.featureCardBlue}`}>
                    <h4 className={styles.featureCardTitle}>Sentiment Variance</h4>
                    <p className={styles.featureCardDesc}>Measuring the internal consistency of discourse across social media platforms and news coverage.</p>
                  </div>
                </div>
              </div>
              <div className={`${styles.contentOrder1}`}>
                <div className={`${styles.visualizationCard} ${styles.visualizationCardBlue}`}>
                  <div className={`${styles.visualizationInner} ${styles.visualizationInnerBlue}`}>
                    <div className={styles.visualizationHeader}>
                      <div className={`${styles.datasetLabel} ${styles.datasetLabelBlue}`}>DATASET_LIB_ALPHA</div>
                      <span className={`material-symbols-outlined ${styles.visualizationIconBlue}`}>hub</span>
                    </div>
                    <div className={styles.visualizationSvgWrapper}>
                      <svg className={styles.visualizationSvg} viewBox="0 0 200 200">
                        <circle cx="100" cy="100" fill="none" r="80" stroke="#3B82F6" strokeDasharray="4 4" strokeWidth="0.5"></circle>
                        <circle cx="100" cy="100" fill="#3B82F6" fillOpacity="0.1" r="40"></circle>
                        <g style={{ color: '#3B82F6' }}>
                          <circle cx="60" cy="70" fill="currentColor" r="4"></circle>
                          <circle cx="140" cy="120" fill="currentColor" r="6"></circle>
                          <circle cx="80" cy="150" fill="currentColor" r="3"></circle>
                          <circle cx="120" cy="50" fill="currentColor" r="5"></circle>
                          <line opacity="0.3" stroke="currentColor" strokeWidth="0.5" x1="60" x2="100" y1="70" y2="100"></line>
                          <line opacity="0.3" stroke="currentColor" strokeWidth="0.5" x1="140" x2="100" y1="120" y2="100"></line>
                        </g>
                      </svg>
                    </div>
                    <div className={styles.cohesionBar}>
                      <div className={`${styles.cohesionBarTrack} ${styles.cohesionBarTrackBlue}`}>
                        <div className={`${styles.cohesionBarFill} ${styles.cohesionBarFillBlue}`}></div>
                      </div>
                      <div className={styles.cohesionLabels}>
                        <span>COHESION INDEX</span>
                        <span>88.4%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Conservative Section */}
        <section className={styles.conservativeSection} id="conservative">
          <div className={styles.sectionContainer}>
            <div className={styles.sectionGrid}>
              <div>
                <div className={`${styles.visualizationCard} ${styles.visualizationCardRed}`}>
                  <div className={`${styles.visualizationInner} ${styles.visualizationInnerRed}`}>
                    <div className={styles.visualizationHeader}>
                      <div className={`${styles.datasetLabel} ${styles.datasetLabelRed}`}>DATASET_CON_OMEGA</div>
                      <span className={`material-symbols-outlined ${styles.visualizationIconRed}`}>leaderboard</span>
                    </div>
                    <div className={styles.visualizationSvgWrapper}>
                      <svg className={styles.visualizationSvg} viewBox="0 0 200 200">
                        <rect fill="none" height="160" stroke="#EF4444" strokeDasharray="4 4" strokeWidth="0.5" width="160" x="20" y="20"></rect>
                        <rect fill="#EF4444" fillOpacity="0.1" height="40" width="40" x="80" y="80"></rect>
                        <g style={{ color: '#EF4444' }}>
                          <rect fill="currentColor" height="8" width="8" x="50" y="40"></rect>
                          <rect fill="currentColor" height="10" width="10" x="150" y="140"></rect>
                          <rect fill="currentColor" height="6" width="6" x="30" y="160"></rect>
                          <rect fill="currentColor" height="9" width="9" x="130" y="30"></rect>
                          <line opacity="0.3" stroke="currentColor" strokeWidth="0.5" x1="54" x2="100" y1="44" y2="100"></line>
                          <line opacity="0.3" stroke="currentColor" strokeWidth="0.5" x1="155" x2="100" y1="145" y2="100"></line>
                        </g>
                      </svg>
                    </div>
                    <div className={styles.cohesionBar}>
                      <div className={`${styles.cohesionBarTrack} ${styles.cohesionBarTrackRed}`}>
                        <div className={`${styles.cohesionBarFill} ${styles.cohesionBarFillRed}`}></div>
                      </div>
                      <div className={styles.cohesionLabels}>
                        <span>COHESION INDEX</span>
                        <span>91.2%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.contentWrapper}>
                <div className={styles.sectionLabel}>
                  <span className={`${styles.sectionLabelText} ${styles.sectionLabelRed}`}>02 — Structural Analysis</span>
                  <div className={`${styles.sectionLabelLine} ${styles.sectionLabelLineRed}`}></div>
                </div>
                <h2 className={styles.sectionTitle}>Conservative Reality Anchors</h2>
                <p className={styles.sectionDescription}>
                  We analyze Conservative discourse across Reddit, Bluesky, and news channels to detect high-relevance topics like institutional trust and fiscal heritage. Our tools filter through the noise to map the underlying policy frameworks.
                </p>
                <div className={styles.featureCards}>
                  <div className={`${styles.featureCard} ${styles.featureCardRed}`}>
                    <h4 className={styles.featureCardTitle}>Citation Verification</h4>
                    <p className={styles.featureCardDesc}>Tracing primary source usage across Reddit, Bluesky, and news outlets to distinguish grassroots sentiment from coordinated messaging.</p>
                  </div>
                  <div className={`${styles.featureCard} ${styles.featureCardRed}`}>
                    <h4 className={styles.featureCardTitle}>Thematic Stability</h4>
                    <p className={styles.featureCardDesc}>Tracking the lifecycle of specific policy arguments from social media discussions to mainstream news coverage.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Challenge/Verification Section */}
        <section className={styles.challengeSection} id="challenge">
          <div className={`${styles.sectionContainer} ${styles.challengeSectionContainer}`}>
            <div className={styles.sectionGrid}>
              <div>
                <div className={styles.challengeCard}>
                  <div className={styles.challengeCardGlow}></div>
                  <div className={styles.challengeCardContent}>
                    <div className={styles.challengeRow}>
                      <div className={`${styles.challengeIcon} ${styles.challengeIconWarning}`}>
                        <span className="material-symbols-outlined">report_problem</span>
                      </div>
                      <div className={`${styles.challengeQuote} ${styles.challengeQuoteWarning}`}>
                        "The proposed regulation will eliminate 15% of total manufacturing jobs by Q4."
                      </div>
                    </div>
                    <div className={styles.challengeArrow}>
                      <div className={`${styles.challengeArrowLine} ${styles.challengeArrowLineTop}`}></div>
                      <div className={styles.challengeArrowLabel}>Polaryx Verification</div>
                      <div className={`${styles.challengeArrowLine} ${styles.challengeArrowLineBottom}`}></div>
                    </div>
                    <div className={styles.challengeRow}>
                      <div className={`${styles.challengeIcon} ${styles.challengeIconSuccess}`}>
                        <span className="material-symbols-outlined">fact_check</span>
                      </div>
                      <div className={`${styles.challengeQuote} ${styles.challengeQuoteSuccess}`}>
                        <span className={styles.challengeQuoteLabel}>Context Verified:</span> BLS projections show a potential 0.8% shift, primarily through attrition. Job loss claims are statistically unverified.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.contentWrapper}>
                <div className={styles.sectionLabel}>
                  <span className={`${styles.sectionLabelText} ${styles.sectionLabelMuted}`}>03 — Verification</span>
                  <div className={`${styles.sectionLabelLine} ${styles.sectionLabelLineMuted}`}></div>
                </div>
                <h2 className={styles.sectionTitle}>Combating Misinformation</h2>
                <p className={styles.sectionDescription}>
                  Polaryx acts as a citation-backed buffer. We don't just "flag" content; we provide an immediate, verifiable record from non-partisan sources like the CBO, BLS, and academic archives.
                </p>
                {/* <button className={styles.viewProtocolButton}>
                  View Verification Protocol
                  <span className="material-symbols-outlined">arrow_right_alt</span>
                </button> */}
              </div>
            </div>
          </div>
        </section>

        {/* Synthesis Section */}
        <section className={styles.synthesisSection} id="synthesis">
          <div className={styles.synthesisGridBg}></div>
          <div className={styles.synthesisContainer}>
            <div className={styles.synthesisHeader}>
              <span className={styles.synthesisLabel}>Final Stage — Synthesis</span>
              <h2 className={styles.synthesisTitle}>Bridging the Narrative Gap</h2>
              <p className={styles.synthesisDescription}>
                Finding the signal in the noise means looking for where the circles overlap. Our synthesis engine highlights the "Truth Core" of any national debate.
              </p>
            </div>
            <div className={styles.synthesisGrid}>
              <div className={`${styles.synthesisCard} ${styles.synthesisCardDark}`}>
                <div className={`${styles.synthesisCardIcon} ${styles.synthesisCardIconBlue}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.875rem' }}>psychology</span>
                </div>
                <h3 className={styles.synthesisCardTitle}>Emotional Mapping</h3>
                <p className={styles.synthesisCardDesc}>
                  Detecting shared anxieties that transcend party lines. Often, both sides are identifying the same failure from different perspectives.
                </p>
              </div>
              <div className={`${styles.synthesisCard} ${styles.synthesisCardLight}`}>
                <div className={styles.consensusVisual}>
                  <div className={`${styles.consensusCircle} ${styles.consensusCircleBlue}`}></div>
                  <div className={`${styles.consensusCircle} ${styles.consensusCircleRed}`}></div>
                  <div className={styles.consensusCenter}>
                    <div className={styles.consensusCenterIcon}>
                      <span className="material-symbols-outlined">verified</span>
                    </div>
                    <div className={styles.consensusCenterLabel}>Common Ground</div>
                  </div>
                </div>
                <h3 className={styles.synthesisCardTitleCenter}>Consensus Detection</h3>
                <p className={styles.synthesisCardDescCenter}>
                  Our engine highlights specific data points that both Liberal and Conservative clusters accept as factually true, providing a foundation for debate.
                </p>
              </div>
              <div className={`${styles.synthesisCard} ${styles.synthesisCardDark}`}>
                <div className={`${styles.synthesisCardIcon} ${styles.synthesisCardIconRed}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.875rem' }}>auto_fix_high</span>
                </div>
                <h3 className={styles.synthesisCardTitle}>Strategic Reframing</h3>
                <p className={styles.synthesisCardDesc}>
                  Polaryx suggests alternative linguistic framings that respect the core values of the opposing side, facilitating more productive dialogue.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <span className="material-symbols-outlined">balance</span>
                <span className={styles.footerLogoText}>Polaryx.</span>
              </div>
              <p className={styles.footerTagline}>
                An advanced analytical framework for the modern citizen. We believe that clarity in disagreement is the first step toward national health.
              </p>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span className={styles.footerBuilt}>
              Built for Clarity <span className={styles.footerDot}></span> Santa Cruz, CA.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
