const mongoose = require("mongoose");

const inviteCollaboratorSchema = new mongoose.Schema({
    email: { type: String },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    name: { type: String, default: "" },
    sharedUserDetails: {
        userId: { type: mongoose.Schema.Types.ObjectId, default: null },
        firstName: { type: String, default: "" },
        lastName: { type: String, default: "" },
        email: { type: String, default: "" },
        auth0Id: { type: String, default: "" },
        purchased_plan: { type: mongoose.Schema.Types.ObjectId, ref: "membership_plan", default: null },
    },
    memberShipPlanDetails: {
        planId: { type: mongoose.Schema.Types.ObjectId, ref: "membership_plan", default: null },
        plan_name: { type: String, default: "" },
        plan_price: { type: Number, default: 0, },
        plan_description: { type: String, default: "", },
        plan_id_by_admin: { type: String, default: "", },
        auth0_plan_id: { type: String, default: "", },
        apple_plan_id: { type: String, default: "", },
        play_store_plan_id: { type: String, default: "", },
        isTeamMate: { type: Boolean, default: false, },
        no_of_team_mate: { type: String, default: "0", },
        accessResources: [{ type: mongoose.Schema.Types.ObjectId, ref: "accessResource", default: [] }],
    },
    teamMateInvitationStatus: { type: String, default: "pending", enum: ["pending", "accepted", "revoked"] },
    collaboratorPlan: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpireTime: { type: Date, default: null },
    isOTPVerified: { type: Boolean, default: false },
    isDelete: { type: Boolean, default: false },
    inviteAcceptedDate: { type: Date, default: null },
},
    { timestamps: true }
);

module.exports = mongoose.model("inviteCollaborator", inviteCollaboratorSchema);
