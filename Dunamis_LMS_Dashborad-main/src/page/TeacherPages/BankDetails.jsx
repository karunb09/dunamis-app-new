import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addBankDetails } from "../../redux/Intructor/teacherSlice";
import toast from "react-hot-toast";

const BankDetails = ({ user, loading }) => {
    const dispatch = useDispatch();
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        branchAddress: "",
    });
    const [isBankDetailsSubmitted, setIsBankDetailsSubmitted] = useState(false);

    useEffect(() => {
        if (user?.roleId?.isBankDetailsSubmitted) {
            setIsBankDetailsSubmitted(true);
            setBankDetails(user.roleId.bankDetails);
        }
    }, [user]);

    const handleBankChange = (e) => {
        setBankDetails({ ...bankDetails, [e.target.name]: e.target.value });
    };

    const handleSaveBankDetails = (e) => {
        e.preventDefault();
        if (
            !bankDetails.accountHolderName ||
            !bankDetails.accountNumber ||
            !bankDetails.ifscCode ||
            !bankDetails.bankName
        ) {
            toast.error("Please fill all required bank fields.");
            return;
        }

        const token = localStorage.getItem("token");
        if (user && user.roleId?._id) {
            dispatch(
                addBankDetails({
                    id: user.roleId._id,
                    bankDetails: bankDetails,
                    token,
                })
            )
                .unwrap()
                .then((response) => {
                    toast.success(response.message || "Bank details saved successfully!");
                    setIsBankDetailsSubmitted(true);
                    setBankDetails(response.teacher.bankDetails);
                })
                .catch((err) =>
                    toast.error(err.message || "Failed to save bank details.")
                );
        } else {
            toast.error("Could not find user role ID. Please try again.");
        }
    };

    return (
        <div className="bg-white shadow rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Bank Details</h2>
            {isBankDetailsSubmitted ? (
                <div>
                    <p className="mb-4 text-green-600 font-medium">
                        Your bank details have been submitted and cannot be changed.
                    </p>
                    <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            <p className="text-sm text-gray-500">Account Holder:</p>
                            <p className="font-medium">{bankDetails.accountHolderName}</p>
                            <p className="text-sm text-gray-500">Account Number:</p>
                            <p className="font-medium">{bankDetails.accountNumber}</p>
                            <p className="text-sm text-gray-500">IFSC Code:</p>
                            <p className="font-medium">{bankDetails.ifscCode}</p>
                            <p className="text-sm text-gray-500">Bank Name:</p>
                            <p className="font-medium">{bankDetails.bankName}</p>
                            <p className="text-sm text-gray-500">Branch Address:</p>
                            <p className="font-medium">{bankDetails.branchAddress}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSaveBankDetails} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            name="accountHolderName"
                            value={bankDetails.accountHolderName}
                            onChange={handleBankChange}
                            placeholder="Account Holder Name"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                        <input
                            name="accountNumber"
                            value={bankDetails.accountNumber}
                            onChange={handleBankChange}
                            placeholder="Account Number"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            name="ifscCode"
                            value={bankDetails.ifscCode}
                            onChange={handleBankChange}
                            placeholder="IFSC Code"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                        <input
                            name="bankName"
                            value={bankDetails.bankName}
                            onChange={handleBankChange}
                            placeholder="Bank Name"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <input
                            name="branchAddress"
                            value={bankDetails.branchAddress}
                            onChange={handleBankChange}
                            placeholder="Branch Address"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() =>
                                setBankDetails({
                                    accountHolderName: "",
                                    accountNumber: "",
                                    ifscCode: "",
                                    bankName: "",
                                    branchAddress: "",
                                })
                            }
                            className="px-4 py-2 border rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-black text-white rounded-lg disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Save Bank Details"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default BankDetails;
