import { useAppDispatch, useAppSelector } from '../lib/store';
import { toggleTheme } from '../lib/themeSlice';
import styles from '../styles/ThemeToggle.module.scss';

interface ThemeToggleProps {
    className?: string;
}

const ThemeToggle = ({ className }: ThemeToggleProps) => {
    const dispatch = useAppDispatch();
    const theme = useAppSelector((state) => state.theme.mode);

    return (
        <button
            className={`${styles.toggle} ${className ?? ''}`}
            onClick={() => dispatch(toggleTheme())}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <span className={`material-symbols-outlined ${styles.icon}`}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
};

export default ThemeToggle;
