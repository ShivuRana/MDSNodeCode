const accessResource = require("../../database/models/collaborator/accessResource");
const inviteCollaborator = require("../../database/models/collaborator/inviteCollaborator");
const User = require("../../database/models/airTableSync");
const MembershipPlan = require("../../database/models/membershipPlanManagement/membership_plan");
const ContentEvent = require("../../database/models/contentArchive_event");
const { sendEmail } = require("../../config/common");
const ObjectId = require("mongoose").Types.ObjectId;
const AWS = require("aws-sdk");
var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// create collaborator user
exports.createCollaboratorUser = async (req, res) => {
    try {
        const body = req.body;
        const collaboratorId = ObjectId(body.collaboratorId);
        const existCollaborator = await inviteCollaborator.findOne({
            _id: collaboratorId,
            isDelete: false,
        }, { _id: 1, email: 1, firstName: 1, lastName: 1, name: 1, memberShipPlanDetails: 1, sharedUserDetails: 1, teamMateInvitationStatus: 1, collaboratorPlan: 1, isOTPVerified: 1 }).lean();

        const existUserData = await User.findOne({ "Preferred Email": existCollaborator.email, $or: [{ isDelete: false }, { isDelete: { $exists: false } }], }, { _id: 1, PreferredEmail: "$Preferred Email", auth0Id: 1 });

        if (!body.auth0Id) {
            return res.status(401).json({ status: false, message: `Auth0 details is missing, please try again.`, });
        } else if (!body.facebookLinkedinId) {
            return res.status(401).json({ status: false, message: `Authentication details is missing, please try again.`, });
        } else {
            if (existUserData !== null) {
                return res.status(409).json({ status: false, message: `This account is already exist in system, please try with other account.`, });
            } else {
                const newCollaboratorUser = new User({
                    "Preferred Email": existCollaborator.email,
                    facebookLinkedinId: body.facebookLinkedinId,
                    otherdetail: {
                        [`${process.env.USER_FN_ID}`]: body.firstName,
                        [`${process.env.USER_LN_ID}`]: body.lastName,
                        [`${process.env.USER_EMAIL_ID}`]: existCollaborator.email,
                    },
                    email: existCollaborator.email,
                    auth0Id: body.auth0Id,
                    provider: body.provider,
                    isSocial: true,
                    payment_id: null,
                    purchased_plan: existCollaborator.memberShipPlanDetails.planId,
                    isDelete: false,
                    register_status: true,
                    userEvents: { "others": true },
                    isCollaborator: true,
                });
                const collaboratorUserData = await newCollaboratorUser.save();

                if (collaboratorUserData) {
                    await inviteCollaborator.findOneAndUpdate({ _id: collaboratorId }, {
                        teamMateInvitationStatus: "accepted",
                        collaboratorPlan: true,
                        inviteAcceptedDate: new Date()
                    });
                    return res.status(200).json({ status: true, message: `Collaborator user created successfully.`, data: collaboratorUserData, });
                } else {
                    return res.status(401).json({ status: false, message: `Something went wrong while sending invitation to the collaborator!`, });
                }
            }
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};