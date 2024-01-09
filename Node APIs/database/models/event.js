const mongoose = require("mongoose");

const eventSchema = mongoose.Schema(
    {
        title: { type: String, required: true, },
        thumbnail: { type: String, },
        shortDescription: { type: String, },
        longDescription: { type: String, },
        eventUrl: { type: String, },
        type: {
            typeId: { type: mongoose.Schema.Types.ObjectId, ref: "eventtype", default: null },
            name: { type: String, default: "" },
        },
        timeZone: { type: String },
        startDate: { type: String },
        startTime: { type: String },
        endDate: { type: String },
        endTime: { type: String },
        year: { type: String, default: "" },
        eventAccess: { type: String, enum: ["public", "admin/staff", "restricted"] },
        restrictedAccessGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "group", }],
        restrictedAccessMemberships: [{ type: mongoose.Schema.Types.ObjectId, ref: "groupmembership_plan", }],
        photos: { type: Array },
        activities: [{ type: mongoose.Schema.Types.ObjectId, ref: "eventActivity" }],
        contactSupport: {
            email: { type: String, default: "" },
            phone: { type: String, default: "" },
            localPhone: { type: String, default: "" },
        },
        isPreRegister: { type: Boolean, default: false, },
        preRegisterTitle: { type: String, default: "", },
        preRegisterDescription: { type: String, default: "", },
        preRegisterBtnTitle: { type: String, default: "", },
        preRegisterBtnLink: { type: String, default: "", },
        preRegisterStartDate: { type: String, default: null, },
        preRegisterEndDate: { type: String, default: null, },
        location: {
            address: { type: String, default: "", },
            country: { type: String, default: "", },
            city: { type: String, default: "", },
            postalCode: { type: String, default: "", },
            latitude: { type: String, default: "0" },
            longitude: { type: String, default: "0" },
            placeId: { type: String, default: "", },
            locationImages: { type: Array },
        },
        isLocation: { type: Boolean, default: false, },
        isDelete: { type: Boolean, default: false, },
        airTableEventName: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("event", eventSchema);
