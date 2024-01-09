const { timeStamp, time } = require("console");
const mongoose = require("mongoose");
Schema = mongoose.Schema;

const SessionSchema = new mongoose.Schema({
    title: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    longDescription: { type: String, default: "" },
    date: { type: String, default: "" },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "room", default: null },
    speakerId: [{ type: mongoose.Schema.Types.ObjectId, ref: "airtable-syncs", default: [] }],
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    reserved: { type: Boolean, default: false },
    reserved_URL: { type: String, default: "" },
    reservedLabelForListing: {type: String, default: "" },
    reservedLabelForDetail: {type: String, default: "" },
    member: { type: Boolean, default: false },
    speaker: { type: Boolean, default: false },
    partner: { type: Boolean, default: false },
    guest: { type: Boolean, default: false },
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
    this.populate("speakerId", "attendeeDetail profileImg speakerIcon");
    this.populate("room", "name location");
    // this.populate("event", "title thumbnail shortDescription longDescription eventUrl type timeZone startDate startTime endDate endTime eventAccess restrictedAccessGroups restrictedAccessMemberships photos");
    next();
};

SessionSchema.pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("save", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("session", SessionSchema);