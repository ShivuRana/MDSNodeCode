const mongoose = require("mongoose");
Schema = mongoose.Schema;

const roomSchema = new mongoose.Schema({
    name: { type: String, default: "" },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "eventLocation", default: null },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    notifyChanges: { type: Boolean, default: false, },
    notifyChangeText: { type: String, default: "" },
    isDelete: { type: Boolean, default: false },
}, {
    timestamps: true
});

var autoPopulateChildren = function (next) {
    this.populate("location", "name address country city latitude longitude locationImages locationVisible");
    this.populate("event", "title thumbnail shortDescription longDescription eventUrl type timeZone startDate startTime endDate endTime eventAccess restrictedAccessGroups restrictedAccessMemberships photos");
    next();
};

roomSchema.pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren)
    .pre("save", autoPopulateChildren);

module.exports = mongoose.model("room", roomSchema);
