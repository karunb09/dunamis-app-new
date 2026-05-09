const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
    },
    password: {
      type: String,
      required: true,
    },
    mobileNo: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      enum: ["admin", "teacher", "student", "superadmin"],
      default: "student",
    },
    accountStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    image: {
      type: String,
    },
    location: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    roleId: {
      type: mongoose.Schema.ObjectId,
      refPath: "roleModel",
    },
    roleModel: {
      type: String,
      enum: ["admin", "teacher", "student"],
    },
    notices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "adminNotice",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("adminDetails", {
  ref: "admin",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

userSchema.virtual("teacherDetails", {
  ref: "teacher",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

userSchema.virtual("studentDetails", {
  ref: "student",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

// Virtual for permissions
userSchema.virtual("permissions").get(function () {
  if (this.accountType === "admin" && this.adminDetails) {
    return this.adminDetails.permission;
  }
  return [];
});

// Virtual for role
userSchema.virtual("role").get(function () {
  if (this.accountType === "admin" && this.adminDetails) {
    return this.adminDetails.role;
  }
  if (this.accountType === "teacher" && this.teacherDetails) {
    return this.teacherDetails.role;
  }
  if (this.accountType === "student" && this.studentDetails) {
    return this.studentDetails.role;
  }
  return null;
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

module.exports = mongoose.model("user", userSchema);
