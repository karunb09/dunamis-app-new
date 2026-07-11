import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { FaSearch, FaTrash } from "react-icons/fa";
import { FiPlus, FiX } from "react-icons/fi";
import PageTabBar from "../../../components/PageTabBar";
import DataCards from "../../../components/DataCards";
import PersonCard from "../../../components/cards/PersonCard";
import {
    fetchReferrals,
    updateReferralReward,
    fetchPartners,
    createPartner,
    updatePartner,
    deletePartner,
} from "../../../redux/Referral/ReferralSlice";

const TABS = ["Referrals", "Freelancers"];

const REWARD_BADGES = {
    pending: { label: "Pending", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: true, dotClass: "bg-amber-500" },
    rewarded: { label: "Rewarded", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: true, dotClass: "bg-emerald-500" },
};

const PARTNER_BADGES = {
    active: { label: "Active", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: true, dotClass: "bg-emerald-500" },
    inactive: { label: "Inactive", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", dot: true, dotClass: "bg-rose-500" },
};

const EMPTY_PARTNER_FORM = { name: "", phone: "", email: "", city: "", area: "" };

const suggestCode = ({ city, area, name }) =>
    `${city.replace(/[^a-zA-Z]/g, "").slice(0, 3)}${area.replace(/[^a-zA-Z]/g, "").slice(0, 3)}${name.replace(/[^a-zA-Z]/g, "").slice(0, 3)}`.toUpperCase();

const getStudentName = (referral) => {
    const name = referral.studentId?.userId?.name;
    if (!name) return "—";
    return `${name.firstName || ""} ${name.lastName || ""}`.trim() || "—";
};

const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const ReferralManagementPage = () => {
    const dispatch = useDispatch();
    const { referrals, partners, loading, partnersLoading, error } = useSelector((state) => state.referral);

    const [activeTab, setActiveTab] = useState("Referrals");
    const [searchTerm, setSearchTerm] = useState("");
    const [rewardFilter, setRewardFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [partnerModal, setPartnerModal] = useState({ open: false, partner: null });
    const [partnerForm, setPartnerForm] = useState(EMPTY_PARTNER_FORM);
    const [partnerCode, setPartnerCode] = useState("");
    const [codeTouched, setCodeTouched] = useState(false);
    const [savingPartner, setSavingPartner] = useState(false);

    useEffect(() => {
        dispatch(fetchReferrals());
        dispatch(fetchPartners());
    }, [dispatch]);

    const filteredReferrals = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return referrals.filter((referral) => {
            if (rewardFilter && referral.rewardStatus !== rewardFilter) return false;
            if (typeFilter && referral.referrerType !== typeFilter) return false;
            if (!term) return true;
            const haystack = `${referral.referrerName} ${referral.code} ${getStudentName(referral)} ${referral.courseId?.name || ""}`.toLowerCase();
            return haystack.includes(term);
        });
    }, [referrals, searchTerm, rewardFilter, typeFilter]);

    const filteredPartners = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return partners;
        return partners.filter((partner) =>
            `${partner.name} ${partner.code} ${partner.city} ${partner.area}`.toLowerCase().includes(term)
        );
    }, [partners, searchTerm]);

    const handleToggleReward = async (referral) => {
        const next = referral.rewardStatus === "rewarded" ? "pending" : "rewarded";
        const { value: note, isConfirmed } = await Swal.fire({
            title: next === "rewarded" ? "Mark as rewarded?" : "Move back to pending?",
            text: `${referral.referrerName} — ${referral.code}`,
            input: "text",
            inputValue: referral.rewardNote || "",
            inputPlaceholder: "Optional note (e.g. paid in July payroll)",
            showCancelButton: true,
            confirmButtonText: next === "rewarded" ? "Mark Rewarded" : "Mark Pending",
            confirmButtonColor: "#FF6B35",
        });
        if (!isConfirmed) return;
        try {
            await dispatch(updateReferralReward({ id: referral._id, rewardStatus: next, rewardNote: note })).unwrap();
            toast.success(next === "rewarded" ? "Marked as rewarded." : "Moved back to pending.");
        } catch (err) {
            toast.error(err || "Failed to update reward status.");
        }
    };

    const openPartnerModal = (partner = null) => {
        setPartnerModal({ open: true, partner });
        setPartnerForm(
            partner
                ? { name: partner.name, phone: partner.phone || "", email: partner.email || "", city: partner.city, area: partner.area }
                : EMPTY_PARTNER_FORM
        );
        setPartnerCode(partner?.code || "");
        setCodeTouched(Boolean(partner));
    };

    const closePartnerModal = () => {
        if (savingPartner) return;
        setPartnerModal({ open: false, partner: null });
    };

    const handlePartnerField = (field) => (event) => {
        const value = event.target.value;
        setPartnerForm((prev) => {
            const nextForm = { ...prev, [field]: value };
            if (!codeTouched) setPartnerCode(suggestCode(nextForm));
            return nextForm;
        });
    };

    const handleSavePartner = async () => {
        const code = partnerCode.trim().toUpperCase();
        if (!partnerForm.name.trim() || !partnerForm.city.trim() || !partnerForm.area.trim()) {
            toast.error("Name, city, and area are required.");
            return;
        }
        if (!/^[A-Z]{9}$/.test(code)) {
            toast.error("Code must be exactly 9 letters, e.g. BLRKSNFTM.");
            return;
        }

        const payload = {
            name: partnerForm.name.trim(),
            phone: partnerForm.phone.trim(),
            email: partnerForm.email.trim(),
            city: partnerForm.city.trim(),
            area: partnerForm.area.trim(),
            code,
        };

        setSavingPartner(true);
        try {
            if (partnerModal.partner) {
                await dispatch(updatePartner({ id: partnerModal.partner._id, partnerData: payload })).unwrap();
                toast.success("Freelancer updated.");
            } else {
                await dispatch(createPartner(payload)).unwrap();
                toast.success(`Freelancer added with code ${code}.`);
            }
            setPartnerModal({ open: false, partner: null });
        } catch (err) {
            toast.error(err || "Failed to save freelancer.");
        } finally {
            setSavingPartner(false);
        }
    };

    const handleTogglePartnerStatus = async (partner) => {
        const next = partner.status === "active" ? "inactive" : "active";
        try {
            await dispatch(updatePartner({ id: partner._id, partnerData: { status: next } })).unwrap();
            toast.success(next === "active" ? "Code enabled." : "Code disabled — it will no longer be accepted at payment.");
        } catch (err) {
            toast.error(err || "Failed to update status.");
        }
    };

    const handleDeletePartner = async (partner) => {
        const { isConfirmed } = await Swal.fire({
            title: "Delete this freelancer?",
            text: `${partner.name} — code ${partner.code} will stop working immediately. Past referral records are kept.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Delete",
            confirmButtonColor: "#e11d48",
        });
        if (!isConfirmed) return;
        try {
            await dispatch(deletePartner(partner._id)).unwrap();
            toast.success("Freelancer deleted.");
        } catch (err) {
            toast.error(err || "Failed to delete freelancer.");
        }
    };

    const handleCopyCode = (partner) => {
        navigator.clipboard
            .writeText(partner.code)
            .then(() => toast.success(`Code ${partner.code} copied.`))
            .catch(() => toast.error("Failed to copy code."));
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Referral Management</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Referrals & Freelancers</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Track referral codes entered by students at payment and manage freelancer codes.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <PageTabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
                {activeTab === "Freelancers" && (
                    <button
                        onClick={() => openPartnerModal()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#fd5a1f]"
                    >
                        <FiPlus /> Add Freelancer
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={activeTab === "Referrals" ? "Search referrer, code, student, course..." : "Search name, code, city..."}
                        className="w-72 rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                </div>

                {activeTab === "Referrals" && (
                    <>
                        <select
                            value={rewardFilter}
                            onChange={(event) => setRewardFilter(event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                        >
                            <option value="">All statuses</option>
                            <option value="pending">Pending</option>
                            <option value="rewarded">Rewarded</option>
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                        >
                            <option value="">All referrers</option>
                            <option value="employee">Employees</option>
                            <option value="freelancer">Freelancers</option>
                        </select>
                    </>
                )}
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            {activeTab === "Referrals" ? (
                loading ? (
                    <p className="text-sm text-slate-500">Loading referrals...</p>
                ) : (
                    <DataCards
                        data={filteredReferrals}
                        selectable={false}
                        emptyMessage="No referrals yet — codes entered by students at payment will appear here."
                        renderCard={(row) => (
                            <PersonCard
                                key={row._id}
                                name={row.referrerName}
                                subtitle={`${row.code} · ${row.referrerType === "employee" ? "Employee" : "Freelancer"}`}
                                statusBadge={REWARD_BADGES[row.rewardStatus] || REWARD_BADGES.pending}
                                meta={[
                                    { label: "Student", value: getStudentName(row) },
                                    { label: "Course", value: row.courseId?.name || "—" },
                                    { label: "Amount", value: formatAmount(row.amount) },
                                    { label: "Date", value: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—" },
                                ]}
                                onView={() => handleToggleReward(row)}
                                primaryLabel={row.rewardStatus === "rewarded" ? "Mark as Pending" : "Mark as Rewarded"}
                            >
                                {row.rewardNote && (
                                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{row.rewardNote}</p>
                                )}
                            </PersonCard>
                        )}
                    />
                )
            ) : partnersLoading ? (
                <p className="text-sm text-slate-500">Loading freelancers...</p>
            ) : (
                <DataCards
                    data={filteredPartners}
                    selectable={false}
                    emptyMessage="No freelancers yet — add one to generate a referral code."
                    renderCard={(row) => (
                        <PersonCard
                            key={row._id}
                            name={row.name}
                            subtitle={`${row.city} · ${row.area}`}
                            statusBadge={PARTNER_BADGES[row.status] || PARTNER_BADGES.active}
                            meta={[
                                { label: "Code", value: row.code, render: (value) => <span className="font-mono font-semibold">{value}</span> },
                                { label: "Phone", value: row.phone || "—" },
                                { label: "Email", value: row.email || "—" },
                                { label: "Added", value: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—" },
                            ]}
                            onView={() => openPartnerModal(row)}
                            primaryLabel="Edit Freelancer"
                            menuItems={[
                                { label: "Copy Code", onClick: () => handleCopyCode(row) },
                                {
                                    label: row.status === "active" ? "Disable Code" : "Enable Code",
                                    onClick: () => handleTogglePartnerStatus(row),
                                },
                                {
                                    label: "Delete Freelancer",
                                    icon: <FaTrash size={13} />,
                                    onClick: () => handleDeletePartner(row),
                                    danger: true,
                                },
                            ]}
                        />
                    )}
                />
            )}

            {partnerModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={closePartnerModal}>
                    <div
                        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {partnerModal.partner ? "Edit Freelancer" : "Add Freelancer"}
                            </h2>
                            <button onClick={closePartnerModal} className="text-slate-400 hover:text-slate-700">
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                                <input
                                    type="text"
                                    value={partnerForm.name}
                                    onChange={handlePartnerField("name")}
                                    placeholder="e.g. Fathima Begum"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
                                    <input
                                        type="text"
                                        value={partnerForm.city}
                                        onChange={handlePartnerField("city")}
                                        placeholder="e.g. Bangalore"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Area</label>
                                    <input
                                        type="text"
                                        value={partnerForm.area}
                                        onChange={handlePartnerField("area")}
                                        placeholder="e.g. Kasturi Nagar"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                                    <input
                                        type="tel"
                                        value={partnerForm.phone}
                                        onChange={handlePartnerField("phone")}
                                        placeholder="Optional"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                                    <input
                                        type="email"
                                        value={partnerForm.email}
                                        onChange={handlePartnerField("email")}
                                        placeholder="Optional"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Referral Code</label>
                                <input
                                    type="text"
                                    value={partnerCode}
                                    maxLength={9}
                                    onChange={(event) => {
                                        setCodeTouched(true);
                                        setPartnerCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
                                    }}
                                    placeholder="e.g. BLRKSNFTM"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 font-mono text-sm uppercase tracking-widest focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    9 letters — city (3) + area (3) + name (3). Auto-suggested, edit if needed.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={closePartnerModal}
                                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePartner}
                                disabled={savingPartner}
                                className="rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#fd5a1f] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {savingPartner ? "Saving..." : partnerModal.partner ? "Save Changes" : "Create Code"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReferralManagementPage;
