const mongoose = require("mongoose");
const schema = new mongoose.Schema({
    name: { type: String, default: "" },
    notificationFor: { type: String, default: "" },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    idsFor: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdFor: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdBy: { type: String, default: "", },
    notification: {},
}, { timestamps: true });
const ScheduledNotification = mongoose.model("scheduledNotification", schema);
module.exports = ScheduledNotification;