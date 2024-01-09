const mongoose = require("mongoose");
Schema = mongoose.Schema;
 
const notificationSchema = new mongoose.Schema({
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    role: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdFor: { type: mongoose.Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false },
    isDelete: { type: Boolean, default: false },
}, {
    timestamps: true
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;