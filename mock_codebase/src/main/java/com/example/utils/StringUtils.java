// This file simulates a clean, cohesive utility class.
// The TechDebtAnalyzer should correctly identify this as NOT being tech debt.
public class StringUtils {
    /**
     * Checks if a string is null or empty.
     * @param s The string to check.
     * @return true if the string is null or empty, false otherwise.
     */
    public static boolean isNullOrEmpty(String s) {
        return s == null || s.isEmpty();
    }

    /**
     * Truncates a string to a maximum length, adding ellipsis if truncated.
     * @param s The string to truncate.
     * @param length The maximum length.
     * @return The truncated string.
     */
    public static String truncate(String s, int length) {
        if (s == null || s.length() <= length) {
            return s;
        }
        return s.substring(0, length) + "...";
    }
}
