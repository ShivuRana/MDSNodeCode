const mongoose = require("mongoose");

const eventLocationSchema = mongoose.Schema(
  {
    name: { type: String, required: true, },
    address: { type: String, required: true, },
    country: { type: String, required: true },
    postalCode: { type: String, default: "" },
    city: { type: String, required: true, },
    placeId: { type: String, required: true, },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    latitude: { type: String, default: "0" },
    longitude: { type: String, default: "0" },
    locationImages: { type: Array },
    locationVisible: { type: Boolean, default: false, },
    isDelete: { type: Boolean, default: false, }
  },
  { timestamps: true }
);

var autoPopulateChildren = function (next) {
  // this.populate("event", "title thumbnail shortDescription longDescription eventUrl type timeZone startDate startTime endDate endTime eventAccess restrictedAccessGroups restrictedAccessMemberships photos");
  next();
};

eventLocationSchema.pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren)
  .pre("save", autoPopulateChildren)
  .pre("findOneAndUpdate", autoPopulateChildren)
  .pre("findByIdAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("eventLocation", eventLocationSchema);
