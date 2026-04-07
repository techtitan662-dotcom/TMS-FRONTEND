export type DashboardSpotlightKey = 'employee-of-month' | 'manager-monthly-ranking' | 'power-star-of-month';

type SpotlightGroupKey = 'employee' | 'marketer' | 'power_star';

type EmailSetOptions = {
    storageKey: string;
    fallback?: string[];
};

const normalizeEmail = (value: unknown): string => String(value || '').trim().toLowerCase();

const readEmailSetFromLocalStorage = ({ storageKey, fallback = [] }: EmailSetOptions): Set<string> => {
    const normalizedFallback = (fallback || []).map(normalizeEmail).filter(Boolean);
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return new Set(normalizedFallback);
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set(normalizedFallback);
        const normalized = parsed.map(normalizeEmail).filter(Boolean);
        return new Set([...normalizedFallback, ...normalized]);
    } catch {
        return new Set(normalizedFallback);
    }
};

export const DASHBOARD_EMAIL_LIST_STORAGE_KEYS: Record<SpotlightGroupKey, string> = {
    employee: 'dashboard_employee_emails',
    marketer: 'dashboard_marketer_emails',
    power_star: 'dashboard_power_star_emails',
};

export const getDashboardEmployeeEmails = (): Set<string> => {
    return readEmailSetFromLocalStorage({
        storageKey: DASHBOARD_EMAIL_LIST_STORAGE_KEYS.employee,
    });
};

export const getDashboardMarketerEmails = (): Set<string> => {
    return readEmailSetFromLocalStorage({
        storageKey: DASHBOARD_EMAIL_LIST_STORAGE_KEYS.marketer,
    });
};

export const getDashboardPowerStarEmails = (): Set<string> => {
    return readEmailSetFromLocalStorage({
        storageKey: DASHBOARD_EMAIL_LIST_STORAGE_KEYS.power_star,
    });
};

export const getDashboardSpotlightOverrideForEmail = (email: unknown): DashboardSpotlightKey | null => {
    const key = normalizeEmail(email);
    if (!key) return null;

    const employee = getDashboardEmployeeEmails();
    if (employee.has(key)) return 'employee-of-month';

    const marketer = getDashboardMarketerEmails();
    if (marketer.has(key)) return 'manager-monthly-ranking';

    const powerStar = getDashboardPowerStarEmails();
    if (powerStar.has(key)) return 'power-star-of-month';

    return null;
};

export const isEmailInAnyDashboardSpotlightList = (email: unknown): boolean => {
    return getDashboardSpotlightOverrideForEmail(email) != null;
};
