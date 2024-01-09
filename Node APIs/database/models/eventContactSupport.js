const mongoose = require("mongoose");
Schema = mongoose.Schema;

const contactSupportSchema = new mongoose.Schema({
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    localPhone: { type: String, default: "" },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    isDelete: { type: Boolean, default: false },
}, {
    timestamps: true
});

var autoPopulateChildren = function (next) {
    this.populate("event", "title thumbnail shortDescription longDescription eventUrl type timeZone startDate startTime endDate endTime eventAccess restrictedAccessGroups restrictedAccessMemberships photos");
    next();
};

contactSupportSchema.pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren)
    .pre("save", autoPopulateChildren);

module.exports = mongoose.model("contactsupport", contactSupportSchema);
