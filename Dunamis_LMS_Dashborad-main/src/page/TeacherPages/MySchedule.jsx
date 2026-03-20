import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import Availability from "./Availability";
import { getStoredUser } from "../../utils/authSession";
import { fetchTeacherById } from "../../redux/Intructor/teacherSlice";

const MySchedule = () => {
  const storedUser = useMemo(() => getStoredUser(), []);
  const dispatch = useDispatch();
  const { selectedTeacher, loading, error } = useSelector(
    (state) => state.teachers
  );
  const teacherId =
    storedUser?.roleId?._id || storedUser?.roleId?.id || storedUser?.roleId;
  const teacherName =
    (typeof storedUser?.name === "string" && storedUser.name) ||
    [
      storedUser?.name?.firstName,
      storedUser?.name?.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    storedUser?.fullName ||
    storedUser?.roleId?.name ||
    "Teacher";

  useEffect(() => {
    if (!teacherId) return;

    dispatch(fetchTeacherById(teacherId))
      .unwrap()
      .catch(() => {});
  }, [dispatch, teacherId]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <Availability
        teacher={selectedTeacher || null}
        user={storedUser}
        loading={loading}
        title="Availability"
        description={`Pick and manage the time slots that learners can book with you, ${teacherName}. You can structure group classes, individual sessions, and demos from one place.`}
      />
    </div>
  );
};

export default MySchedule;
