const mongoose = require("mongoose");

const eventPackageSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, },
    price: { type: Number, required: true, },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    url: { type: String, default: "" },
    eventUrlFlag: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isDelete: { type: Boolean, default: false, required: true }
  },
  { timestamps: true }
);

var autoPopulateChildren = function (next) {
  this.populate("event", "title thumbnail shortDescription longDescription eventUrl type timeZone startDate startTime endDate endTime eventAccess restrictedAccessGroups restrictedAccessMemberships photos");
  next();
};

eventPackageSchema.pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren)
  .pre("save", autoPopulateChildren)
  .pre("findOneAndUpdate", autoPopulateChildren)
  .pre("findByIdAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("eventPackage", eventPackageSchema);
