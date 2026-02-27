const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema({
  sessionType: {
    type: String,
    enum: ["standard", "premium"],
    required: true,
  },
  monthlyFee: {
    type: Number,
    required: true,
  },
  fullPayment: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
  installments: {
    type: Number,
    default: 1,
  },
});

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
    },
    subCategory: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "SubCategory",
        required: true,
      },
    ],
    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    courseType: {
      type: String,
      enum: ["fixed", "running"],
      required: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    certification: {
      type: String,
      enum: ["certification", "non-certification"],
      required: true,
    },
    startDate: {
      type: Date,
      required: function () {
        return this.courseType === "fixed";
      },
    },
    endDate: {
      type: Date,
      required: function () {
        return this.courseType === "fixed";
      },
    },
    teacher: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "teacher",
        required: true,
      },
    ],
    // student: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: "student",
    //   },
    // ],
    objectives: {
      type: [String],
      default: [],
    },
    content: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Content",
      },
    ],
    branches: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Branch",
        required: function () {
          return this.mode === "offline";
        },
      },
    ],
    image: {
      type: String,
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    price: [priceSchema],
  },
  { timestamps: true }
);

courseSchema.pre("remove", async function (next) {
  await Teacher.updateMany(
    { course: this._id },
    { $pull: { course: this._id } }
  );
  next();
});

module.exports = mongoose.model("course", courseSchema);
