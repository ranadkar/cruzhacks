import ThemeToggle from './ThemeToggle';
import styles from '../styles/LandingNav.module.scss';

const LandingNav = () => {
    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.logoWrapper}>
                    <div className={styles.logoIcon}>
                        <span className="material-symbols-outlined">balance</span>
                    </div>
                    <span className={styles.logoText}>Pulse.</span>
                </div>
                <nav className={styles.nav}>
                    <a className={styles.navLink} href="#methodology">How it Works</a>
                    <a className={styles.navLink} href="#challenge">The Challenge</a>
                    <a className={styles.navLink} href="#methodology">Methodology</a>
                </nav>
                <div className={styles.actions}>
                    <ThemeToggle />
                    <button className={styles.mobileMenuButton}>
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default LandingNav;
