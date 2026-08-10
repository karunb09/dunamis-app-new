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

// Shortest available plan (plans are sorted ascending by months) — used as the
// pre-selected duration in the enroll plan step.
export const pickShortestTenure = (plans = []) => plans[0] || null;

export const findTenure = (plans = [], months) =>
    plans.find((plan) => plan.months === Number(months)) || null;

// Named promotional offers on a price row. Full payment only; `durationMonths`
// is how long access runs, which may exceed what was paid for (e.g. buy 3
// months, get 1 free).
export const getActiveCustomPlans = (price) => {
    const plans = Array.isArray(price?.customPlans) ? price.customPlans : [];
    return plans
        .filter((plan) => (plan?.isActive ?? true) && Number(plan?.fullPayment) > 0)
        .map((plan) => ({
            id: plan._id,
            name: plan.name || "Special offer",
            description: plan.description || "",
            fullPayment: Number(plan.fullPayment) || 0,
            originalPrice: Number(plan.originalPrice) || 0,
            durationMonths: Number(plan.durationMonths) || null,
            perks: Array.isArray(plan.perks) ? plan.perks : [],
        }));
};

export const monthsLabel = (months) =>
    `${months} ${Number(months) === 1 ? "month" : "months"}`;

export const findCustomPlan = (plans = [], id) =>
    plans.find((plan) => String(plan.id) === String(id)) || null;
