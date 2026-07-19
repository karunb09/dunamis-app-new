const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const Assignment = require("../model/assignment.model");
const mailSender = require("../utils/mailSender");

const checkAndSendOverdueReminders = async () => {
  console.log("Checking for overdue assignments...");

  try {
    const now = new Date();

    const assignments = await Assignment.find({
      "students.status": { $in: ["assigned", "overdue"] },
      dueDate: { $lt: now },
    })
      .populate({
        path: "students.studentId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("teacherId", "name")
      .populate("category", "name");

    if (!assignments.length) {
      console.log("No overdue assignments found");
      return;
    }

    for (const assignment of assignments) {
      let updated = false;

      for (const student of assignment.students) {
        const studentEmail = student?.studentId?.userId?.email;
        const studentName =
          student?.studentId?.userId?.name?.firstName || "Student";

        if (
          ["assigned", "overdue"].includes(student.status) &&
          assignment.dueDate < now &&
          !student.reminderSent
        ) {
          student.status = "overdue";
          updated = true;

          if (studentEmail) {
            const emailBody = `
              <p>Hi ${studentName},</p>
              <p>Your assignment "<strong>${
                assignment.title
              }</strong>" was due on 
              <strong>${assignment.dueDate.toDateString()}</strong> and is now <span style="color:red;">overdue</span>.</p>
              <p>Please submit it as soon as possible to avoid penalties.</p>
              <p>Regards,<br/>Dunamis LMS</p>
            `;

            try {
              await mailSender(
                studentEmail,
                "Assignment Overdue Reminder",
                emailBody
              );
              student.reminderSent = true;
              console.log(`Reminder sent to ${studentEmail}`);
            } catch (err) {
              console.error("Failed to send email:", err.message);
            }
          } else {
            console.warn(
              `No email found for student ${student?.studentId?._id}`
            );
          }
        }
      }

      if (updated) {
        await assignment.save();
        console.log(`Updated assignment: ${assignment.title}`);
      }
    }

    console.log("Overdue check complete.");
  } catch (error) {
    console.error("Error in overdue reminder cron job:", error);
  }
};

scheduleWithHeartbeat("overdueReminder", "0 0 * * *", checkAndSendOverdueReminders);
