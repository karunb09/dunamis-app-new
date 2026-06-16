import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { FiBriefcase, FiCheck, FiHash, FiMapPin } from "react-icons/fi";
import { addBankDetails } from "../../redux/Intructor/teacherSlice";
import toast from "react-hot-toast";

const FIELD_INPUT = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400";

const BankDetails = ({ user, loading }) => {
  const dispatch = useDispatch();
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchAddress: "",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user?.roleId?.isBankDetailsSubmitted) {
      setSubmitted(true);
      setBankDetails(user.roleId.bankDetails);
    }
  }, [user]);

  const handleChange = (e) => {
    setBankDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const { accountHolderName, accountNumber, ifscCode, bankName } = bankDetails;
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      toast.error("Please fill all required bank fields.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!user?.roleId?._id) { toast.error("Could not find your profile. Please try again."); return; }

    dispatch(addBankDetails({ id: user.roleId._id, bankDetails, token }))
      .unwrap()
      .then((res) => {
        toast.success(res.message || "Bank details saved successfully");
        setSubmitted(true);
        setBankDetails(res.teacher.bankDetails);
      })
      .catch((err) => toast.error(err?.message || "Failed to save bank details."));
  };

  const clearForm = () => {
    setBankDetails({ accountHolderName: "", accountNumber: "", ifscCode: "", bankName: "", branchAddress: "" });
  };

  const detailRows = [
    { label: "Account Holder", value: bankDetails.accountHolderName },
    { label: "Account Number", value: bankDetails.accountNumber },
    { label: "IFSC Code", value: bankDetails.ifscCode },
    { label: "Bank Name", value: bankDetails.bankName },
    { label: "Branch Address", value: bankDetails.branchAddress },
  ];

  if (submitted) {
    return (
      <div>
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <FiCheck className="h-4 w-4 shrink-0" />
          Bank details submitted and locked. Contact admin to make changes.
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Saved Details</h3>
          <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-6">
            {detailRows.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="mb-5">
        <p className="text-sm text-slate-500">
          Your bank details are used for salary disbursement. Once submitted they cannot be changed — please double-check before saving.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiBriefcase className="text-slate-400" /> Account Holder Name <span className="text-rose-500">*</span>
          </span>
          <input
            name="accountHolderName"
            value={bankDetails.accountHolderName}
            onChange={handleChange}
            placeholder="Full name as on bank account"
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiHash className="text-slate-400" /> Account Number <span className="text-rose-500">*</span>
          </span>
          <input
            name="accountNumber"
            value={bankDetails.accountNumber}
            onChange={handleChange}
            placeholder="Enter account number"
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            IFSC Code <span className="text-rose-500">*</span>
          </span>
          <input
            name="ifscCode"
            value={bankDetails.ifscCode}
            onChange={handleChange}
            placeholder="e.g. SBIN0001234"
            className={FIELD_INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Bank Name <span className="text-rose-500">*</span>
          </span>
          <input
            name="bankName"
            value={bankDetails.bankName}
            onChange={handleChange}
            placeholder="e.g. State Bank of India"
            className={FIELD_INPUT}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiMapPin className="text-slate-400" /> Branch Address
          </span>
          <input
            name="branchAddress"
            value={bankDetails.branchAddress}
            onChange={handleChange}
            placeholder="Branch address (optional)"
            className={FIELD_INPUT}
          />
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={clearForm}
          className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-[#FF6B35] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Bank Details"}
        </button>
      </div>
    </form>
  );
};

export default BankDetails;
