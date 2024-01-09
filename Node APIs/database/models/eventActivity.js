const mongoose = require("mongoose");
Schema = mongoose.Schema;

const eventActivitySchema = new mongoose.Schema({
    name: { type: String, default: "" },
    icon: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    longDescription: { type: String, default: "" },
    date: { type: String, default: "" },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    member: { type: Boolean, default: false },
    speaker: { type: Boolean, default: false },
    partner: { type: Boolean, default: false },
    guest: { type: Boolean, default: false },
    reserved: { type: Boolean, default: false },
    reserved_URL: { type: String, default: "" },
    reservedLabelForListing: {type: String, default: "" },
    reservedLabelForDetail: {type: String, default: "" },
    session: [{ type: mongoose.Schema.Types.ObjectId, ref: "session", default: [] }],
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "eventLocation", default: null },
    notifyChanges: { type: Boolean, default: false, },
    notifyChangeText: { type: String, default: "" },
    isEndOrNextDate: { type: Boolean, default: false },
    endDate: { type: String, default: "" },
    scheduleNotify: { type: Boolean, default: false, },
    scheduleNotifyTime: { type: String, default: "" },
    isDelete: { type: Boolean, default: false },
}, {
    timestamps: true
});

var autoPopulateChildren = function (next) {
    this.populate("location", "name address country city latitude longitude locationImages locationVisible");
    this.populate("session", "title description date startTime endTime endDate roomId speakerId reserved reserved_URL");
    this.populate("event", "title thumbnail shortDescription longDescription eventUrl type timeZone startDate startTime endDate endTime eventAccess restrictedAccessGroups restrictedAccessMemberships photos");
    next();
};

eventActivitySchema.pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("save", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("eventActivity", eventActivitySchema);