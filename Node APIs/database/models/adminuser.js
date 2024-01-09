const mongoose = require("mongoose");
const validator = require("validator");

const adminUserSchema = mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is a required field"],
      unique: true,
      lowercase: true,
      validate: async (value) => {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email address");
        }
        const data = await AdminUser.find({ email: value });
        if (data.length > 0) {
          throw new Error("Email already exists!");
        }
      },
    },
    contact_number: {
      type: String,
      required: true,
    },
    oauthId: {
      type: String,
      required: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userrole",
    },
    resource: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "adminresource",
      },
    ],
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const AdminUser = mongoose.model("adminuser", adminUserSchema);

const adminresourceSchema = mongoose.Schema(
  {
    resource_name: {
      type: String,
      required: true,
      trim: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const AdminResource = mongoose.model("adminresource", adminresourceSchema);

module.exports = {
  AdminUser: AdminUser,
  AdminResource: AdminResource,
};
