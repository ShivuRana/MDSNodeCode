const mongoose = require("mongoose");

const roleSchema = mongoose.Schema(
  {
    role_name: {
      type: String,
      required: true,
      trim: true,
    },
    role_description: {
      type: String,
      required: true,
      trim: true,
    },
    auth0_role_id: {
      type: String,
      required: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const UserRole = mongoose.model("userrole", roleSchema);

module.exports = UserRole;
