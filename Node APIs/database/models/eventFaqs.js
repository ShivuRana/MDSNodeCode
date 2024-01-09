const mongoose = require("mongoose");
Schema = mongoose.Schema;

const faqSchema = new mongoose.Schema({
    question: { type: String, default: "" },
    answer: { type: String, default: "" },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    isDelete: { type: Boolean, default: false },
}, {
    timestamps: true
});

var autoPopulateChildren = function (next) {
    this.populate("event", "title thumbnail shortDescription longDescription eventUrl type timeZone startDate startTime endDate endTime eventAccess restrictedAccessGroups restrictedAccessMemberships photos");
    next();
};

faqSchema.pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren)
    .pre("save", autoPopulateChildren);

module.exports = mongoose.model("faq", faqSchema);
