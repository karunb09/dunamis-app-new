// Helpers for the fixed-duration (3 / 6 / 12 month) payment plans.
// A course price row may carry `tenurePlans`; legacy courses won't, in which
// case callers fall back to the top-level monthlyFee / fullPayment fields.

const DEFAULT_PRIMARY_MONTHS = 6;

export const getActiveTenurePlans = (price) => {
    const plans = Array.isArray(price?.tenurePlans) ? price.tenurePlans : [];
    return plans
        .filter((plan) => (plan?.isActive ?? true) && Number(plan?.months) > 0)
        .map((plan) => ({
            months: Number(plan.months),
            monthlyFee: Number(plan.monthlyFee) || 0,
            discount: Number(plan.discount) || 0,
            fullPayment: Number(plan.fullPayment) || 0,
        }))
        .sort((a, b) => a.months - b.months);
};

export const pickDefaultTenure = (plans = []) =>
    plans.find((plan) => plan.months === DEFAULT_PRIMARY_MONTHS) ||
    plans[0] ||
    null;

export const findTenure = (plans = [], months) =>
    plans.find((plan) => plan.months === Number(months)) || null;
