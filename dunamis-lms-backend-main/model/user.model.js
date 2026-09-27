const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { DEPARTMENTS, DESIGNATION_KEYS, WORK_MODES } = require("../utils/orgStructure");

const ref = (model) => [{ type: mongoose.Schema.Types.ObjectId, ref: model }];

// Where a staff member sits in the org chart and what they are responsible
// for (utils/orgStructure.js). Written only through services/orgPlacement.js.
const orgSchema = new mongoose.Schema(
  {
    department: { type: String, enum: DEPARTMENTS },
    designation: { type: String, enum: DESIGNATION_KEYS },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    workMode: { type: String, enum: WORK_MODES },
    branches: ref("Branch"),
    zones: ref("Zone"),
    cities: ref("City"),
    courses: ref("course"),
    subCategories: ref("SubCategory"),
    categories: ref("Category"),
  },
  { _id: false }
);

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
    // Absent (not null) for students/legacy docs — sparse unique index requires the field to be unset.
    employeeId: {
      type: String,
      uppercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    accountStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    lastLoginAt: {
      type: Date,
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
    // Absent for students; staff only. `default: undefined` stops Mongoose
    // writing six empty scope arrays onto every student it saves.
    org: { type: orgSchema, default: undefined },
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

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.index({ accountType: 1, createdAt: -1 });
userSchema.index({ "org.designation": 1 });
userSchema.index({ "org.reportsTo": 1 });

module.exports = mongoose.model("user", userSchema);
