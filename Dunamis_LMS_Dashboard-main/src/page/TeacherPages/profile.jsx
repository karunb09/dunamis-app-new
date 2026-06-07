import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getUserById } from "../../redux/User/UserSlice";
import toast from "react-hot-toast";
import PersonalInfo from "./PersonalInfo";
import BankDetails from "./BankDetails";

const Profile = () => {
  const dispatch = useDispatch();
  const { selectedUser, loading, error } = useSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData && userData._id) {
      const token = localStorage.getItem("token");
      dispatch(getUserById({ id: userData._id, token }));
    }
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  if (loading && !selectedUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6">
      <div className="bg-white shadow rounded-2xl p-2 md:p-6">
        <div className="flex flex-wrap gap-4 border-b">
          <button
            onClick={() => setActiveTab("personal")}
            className={`pb-2 ${activeTab === "personal"
                ? "border-b-2 border-black font-semibold"
                : "text-gray-500"
              }`}
          >
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={`pb-2 ${activeTab === "bank"
                ? "border-b-2 border-black font-semibold"
                : "text-gray-500"
              }`}
          >
            Bank Details
          </button>
        </div>

        <div className="mt-4">
          {activeTab === "personal" && (
            <PersonalInfo user={selectedUser} loading={loading} />
          )}
          {activeTab === "bank" && (
            <BankDetails user={selectedUser} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
