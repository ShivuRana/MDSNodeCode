const accessResource = require("../../database/models/collaborator/accessResource");
const inviteCollaborator = require("../../database/models/collaborator/inviteCollaborator");
const User = require("../../database/models/airTableSync");
const MembershipPlan = require("../../database/models/membershipPlanManagement/membership_plan");
const { sendEmail } = require("../../config/common");
const ObjectId = require("mongoose").Types.ObjectId;

const AWS = require("aws-sdk");

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// invite collaborator api code
exports.inviteCollaborator = async (req, res) => {
    try {
        const body = req.body;
        const userId = ObjectId(body.userId);

        const existCollaborator = await inviteCollaborator.findOne({
            email: body.emailAddress,
            $or: [{ isDelete: false }, { isDelete: { $exists: false } }]
        }, { _id: 1, email: 1, teamMateInvitationStatus: 1 }).lean();


        if (existCollaborator !== null && existCollaborator.teamMateInvitationStatus !== "revoked") {
            return res.status(200).json({ status: false, message: `Collaborator email already exist in database!`, });
        } else {
            const userData = await User.findOne({ _id: userId, $or: [{ isDelete: false }, { isDelete: { $exists: false } }], },
                {
                    _id: 1, PreferredEmail: "$Preferred Email", auth0Id: 1, otherdetail: 1,
                    attendeeDetail: {
                        name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                        firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                        lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                    },
                    purchased_plan: 1,
                });
            if (userData) {
                const planDeteails = await MembershipPlan.findOne({ _id: userData.purchased_plan, isDelete: false }, { _id: 1, plan_name: 1, plan_price: 1, plan_description: 1, plan_id_by_admin: 1, auth0_plan_id: 1, apple_plan_id: 1, play_store_plan_id: 1, isTeamMate: 1, no_of_team_mate: 1 });

                if (planDeteails !== undefined && planDeteails !== null) {

                    if (planDeteails.isTeamMate === false) {
                        return res.status(200).json({ status: false, message: `For ${planDeteails.plan_name} plan collaborator invite is not activated!`, });
                    } else {
                        const existCollaboratorCota = await inviteCollaborator.countDocuments({
                            [`memberShipPlanDetails.planId`]: planDeteails._id,
                            [`sharedUserDetails.userId`]: userId,
                            isDelete: false,
                        }, { _id: 1, email: 1, }).lean();

                        if (existCollaboratorCota.toString() === planDeteails.no_of_team_mate.toString()) {
                            return res.status(200).json({ status: false, message: `${planDeteails.plan_name} plan does not have more quote to invite collaborators!`, });
                        } else {
                            const userName = userData.auth0Id && userData.auth0Id.length ? userData.otherdetail ? userData.otherdetail[process.env.USER_FN_ID] + " " + userData.otherdetail[process.env.USER_LN_ID] : "" : userData.attendeeDetail ? userData.attendeeDetail.name : "";

                            const collaboratorName = body.firstName && body.lastName ? body.firstName + " " + body.lastName : ""

                            const newCollaboratorData = new inviteCollaborator({
                                email: body.emailAddress ? body.emailAddress.toLowerCase() : "",
                                firstName: body.firstName ? body.firstName : "",
                                lastName: body.lastName ? body.lastName : "",
                                name: body.firstName && body.lastName ? body.firstName + " " + body.lastName : "",
                                isDelete: false,
                                invitationAccepted: false,
                                sharedUserDetails: {
                                    userId: userData._id,
                                    firstName: userData.otherdetail[`${process.env.USER_FN_ID}`],
                                    lastName: userData.otherdetail[`${process.env.USER_LN_ID}`],
                                    email: userData["Preferred Email"],
                                    auth0Id: userData.auth0Id,
                                    purchased_plan: userData.purchased_plan,
                                },
                                memberShipPlanDetails: {
                                    planId: planDeteails._id,
                                    plan_name: planDeteails.plan_name,
                                    plan_price: planDeteails.plan_price,
                                    plan_description: planDeteails.plan_description,
                                    plan_id_by_admin: planDeteails.plan_id_by_admin,
                                    auth0_plan_id: planDeteails.auth0_plan_id,
                                    apple_plan_id: planDeteails.apple_plan_id,
                                    play_store_plan_id: planDeteails.play_store_plan_id,
                                    isTeamMate: planDeteails.isTeamMate,
                                    no_of_team_mate: planDeteails.no_of_team_mate,
                                    accessResources: planDeteails.accessResources,
                                },
                            });
                            const collaboratorData = await newCollaboratorData.save();

                            if (collaboratorData) {
                                const mailData = {
                                    email: `${collaboratorData.email}`,
                                    subject: `Invitation for the MDS Collaborator for User ${userName}.`,
                                    html: `<div style="max-width: 500px; width: 100%; margin: 30px; font-family: arial; line-height: 24px;">
                                <div style="margin-bottom: 25px;">Hello,</div>
                                <div style="margin-bottom: 25px;">You’ve received an invitation to join the MDS Community as a collaborator with ${userName}.</div>
                                <div style="margin-bottom: 25px;">Kindly click the link below to set up your MDS Account: 
                                <br><a style="text-decoration: underline" href="${process.env.ADMIN_URL}/collaborator?id=${collaboratorData._id}">Join as a Collaborator
                                </a></div>
                                <div>Warm regards,</div>
                                <div>Team MDS</div></div>`,
                                };
                                await sendEmail(mailData);

                                return res.status(200).json({ status: true, message: `Invitation sent successfully to the collaborator user.`, data: collaboratorData, });
                            } else {
                                return res.status(401).json({ status: false, message: `Something went wrong while sending invitation to the collaborator!`, });
                            }
                        }
                    }
                } else {
                    return res.status(200).json({ status: false, message: `Selected member has not assigned any plan!`, });
                }

            } else {
                return res.status(200).json({ status: false, message: `User details not found!`, });
            }

        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// send verification code to collaborator
exports.sendVerificationCode = async (req, res) => {
    try {
        const collaboratorId = ObjectId(req.query.id);
        const existCollaborator = await inviteCollaborator.findOne({ _id: collaboratorId, isDelete: false, }, { _id: 1, email: 1, name: 1, collaboratorPlan: 1, }).lean();

        if (existCollaborator === null) {
            return res.status(404).json({ status: false, message: `Collaborator does not exist in database!`, });
        } else if (existCollaborator.collaboratorPlan === true) {
            return res.status(200).json({ status: false, message: `"Your collaboration plan is already activated", please login here.`, });
        } else {

            const random = Math.floor(100000 + Math.random() * 900000);
            const mail_data = {
                email: existCollaborator.email,
                subject: `MDS collaborator verification code`,
                html: `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

                <head>
                    <title></title>
                    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
                    <style>
                        * {
                            box-sizing: border-box;
                        }
                
                        body {
                            margin: 0;
                            padding: 0;
                        }
                
                        a[x-apple-data-detectors] {
                            color: inherit !important;
                            text-decoration: inherit !important;
                        }
                
                        #MessageViewBody a {
                            color: inherit;
                            text-decoration: none;
                        }
                
                        p {
                            line-height: inherit
                        }
                
                        .desktop_hide,
                        .desktop_hide table {
                            mso-hide: all;
                            display: none;
                            max-height: 0px;
                            overflow: hidden;
                        }
                
                        .image_block img+div {
                            display: none;
                        }
                
                        @media (max-width:700px) {
                            .desktop_hide table.icons-inner {
                                display: inline-block !important;
                            }
                
                            .icons-inner {
                                text-align: center;
                            }
                
                            .icons-inner td {
                                margin: 0 auto;
                            }
                
                            .row-content {
                                width: 100% !important;
                            }
                
                            .mobile_hide {
                                display: none;
                            }
                
                            .stack .column {
                                width: 100%;
                                display: block;
                            }
                
                            .mobile_hide {
                                min-height: 0;
                                max-height: 0;
                                max-width: 0;
                                overflow: hidden;
                                font-size: 0px;
                            }
                
                            .desktop_hide,
                            .desktop_hide table {
                                display: table !important;
                                max-height: none !important;
                            }
                
                            .row-2 .column-1 .block-2.text_block td.pad {
                                padding: 15px 10px !important;
                            }
                
                            .row-2 .column-1 .block-1.heading_block h1 {
                                text-align: center !important;
                                font-size: 20px !important;
                            }
                
                            .row-2 .column-1 .block-1.heading_block td.pad {
                                padding: 40px 10px 5px !important;
                            }
                
                            .row-1 .column-1 .block-2.image_block td.pad {
                                padding: 0 0 0 20px !important;
                            }
                
                            .row-2 .column-1 {
                                padding: 0 !important;
                            }
                        }
                    </style>
                </head>
                
                <body style="margin: 0; background-color: #fbfbfb; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
                    <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                        <tbody>
                            <tr>
                                <td>
                                    <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                        role="presentation"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                        cellspacing="0" role="presentation"
                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; color: #000000; width: 680px;"
                                                        width="680">
                                                        <tbody>
                                                            <tr>
                                                                <td class="column column-1" width="100%"
                                                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                    <div class="spacer_block block-1"
                                                                        style="height:30px;line-height:30px;font-size:1px;">&#8202;
                                                                    </div>
                                                                    <table class="image_block block-2" width="100%" border="0"
                                                                        cellpadding="0" cellspacing="0" role="presentation"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                        <tr>
                                                                            <td class="pad"
                                                                                style="width:100%;padding-right:0px;padding-left:0px;">
                                                                                <div class="alignment" align="left"
                                                                                    style="line-height:10px"><img
                                                                                        src="https://mds-community.s3.us-east-2.amazonaws.com/weblogo.png"
                                                                                        style="display: block; height: auto; border: 0; width: 136px; max-width: 100%;"
                                                                                        width="136" alt="Web Logo" title="Logo">
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                    <div class="spacer_block block-3"
                                                                        style="height:15px;line-height:15px;font-size:1px;">&#8202;
                                                                    </div>
                                                                    <div class="spacer_block block-4"
                                                                        style="height:15px;line-height:15px;font-size:1px;">&#8202;
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                        role="presentation"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; background-position: center top;">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                        cellspacing="0" role="presentation"
                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-bottom: 1px solid #CCD6DD; border-left: 1px solid #CCD6DD; border-radius: 4px; border-right: 1px solid #CCD6DD; border-top: 1px solid #CCD6DD; color: #000000; width: 680px;"
                                                        width="680">
                                                        <tbody>
                                                            <tr>
                                                                <td class="column column-1" width="100%"
                                                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                    <table class="heading_block block-1" width="100%" border="0"
                                                                        cellpadding="0" cellspacing="0" role="presentation"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                        <tr>
                                                                            <td class="pad"
                                                                                style="padding-bottom:5px;padding-left:20px;padding-right:15px;padding-top:40px;text-align:center;width:100%;">
                                                                                <h1
                                                                                    style="margin: 0; color: #171719; direction: ltr; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 30px; font-weight: 400; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;">
                                                                                    Just checking to be sure you're you.</h1>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                    <table class="text_block block-2" width="100%" border="0"
                                                                        cellpadding="0" cellspacing="0" role="presentation"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                        <tr>
                                                                            <td class="pad"
                                                                                style="padding-bottom:15px;padding-left:20px;padding-right:35px;padding-top:15px;">
                                                                                <div style="font-family: Arial, sans-serif">
                                                                                    <div class
                                                                                        style="font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; mso-line-height-alt: 21px; color: #171719; line-height: 1.5;">
                                                                                        <p
                                                                                            style="margin: 0; text-align: center; mso-line-height-alt: 24px;">
                                                                                            <span style="font-size:16px;">Please copy
                                                                                                and paste the following code into the
                                                                                                Verification Code field.</span>
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                    <table class="button_block block-3" width="100%" border="0"
                                                                        cellpadding="0" cellspacing="0" role="presentation"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                        <tr>
                                                                            <td class="pad"
                                                                                style="padding-bottom:40px;padding-left:25px;padding-right:25px;padding-top:25px;text-align:center;">
                                                                                <div class="alignment" align="center">
                                                                                    <span
                                                                                        style="text-decoration:none;display:inline-block;color:#171719;background-color:transparent;border-radius:10px;width:auto;border-top:1px solid #AFAFAF;font-weight:400;border-right:1px solid #AFAFAF;border-bottom:1px solid #AFAFAF;border-left:1px solid #AFAFAF;padding-top:5px;padding-bottom:5px;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:21px;text-align:center;mso-border-alt:none;word-break:keep-all;"><span
                                                                                            style="padding-left:60px;padding-right:60px;font-size:21px; display:inline-block;letter-spacing:1px;"><span
                                                                                                dir="ltr"
                                                                                                style="word-break: break-word; line-height: 42px;"><strong>${random}</strong></span></span></span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                        role="presentation"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                        cellspacing="0" role="presentation"
                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; color: #000000; width: 680px;"
                                                        width="680">
                                                        <tbody>
                                                            <tr>
                                                                <td class="column column-1" width="100%"
                                                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                    <div class="spacer_block block-1"
                                                                        style="height:55px;line-height:55px;font-size:1px;">&#8202;
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </body>
                
                </html>`,
            };

            await sendEmail(mail_data);
            const updateData = await inviteCollaborator.findOneAndUpdate(
                { _id: collaboratorId },
                {
                    otp: random,
                    otpExpireTime: new Date(new Date().setMinutes(new Date().getMinutes() + 5)),
                    isOTPVerified: false,
                },
                { new: true }
            );

            if (updateData !== null) {
                res.status(200).json({ status: true, data: updateData, message: "OTP sent sucessfully.", });
            } else {
                res.status(200).json({ status: false, message: "Collabortor details not found!" });
            }
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// collaboratorDetail to User
exports.collaboratorDetail = async (req, res) => {
    try {
        const collaboratorId = ObjectId(req.query.id);
        const existCollaborator = await inviteCollaborator.findOne({ _id: collaboratorId, isDelete: false, }, { _id: 1, email: 1, name: 1, collaboratorPlan: 1, sharedUserDetails: 1 }).lean();

        if (existCollaborator === null) {
            return res.status(200).json({ status: false, message: `Collaborator does not exist in database!`, });
        } else {
            return res.status(200).json({ status: true, message: `Collaborator details retrived.`, data: existCollaborator });
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// resend verification code to collaborator
exports.resendVerificationCode = async (req, res) => {
    try {
        const collaboratorId = ObjectId(req.query.id);
        const existCollaborator = await inviteCollaborator.findOne({ _id: collaboratorId, isDelete: false, }, { _id: 1, email: 1, name: 1, collaboratorPlan: 1, }).lean();

        if (existCollaborator === null) {
            return res.status(404).json({ status: false, message: `Collaborator does not exist in database!`, });
        } else if (existCollaborator.collaboratorPlan === true) {
            return res.status(200).json({ status: false, message: `"Your collaboration plan is already activated", please login here.`, });
        } else {

            const random = Math.floor(100000 + Math.random() * 900000);
            const mail_data = {
                email: existCollaborator.email,
                subject: `MDS collaborator resend verification code`,
                html: `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
                <head>
                    <title></title>
                    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
                    <style>
                        * {
                            box-sizing: border-box;
                        }
                
                        body {
                            margin: 0;
                            padding: 0;
                        }
                
                        a[x-apple-data-detectors] {
                            color: inherit !important;
                            text-decoration: inherit !important;
                        }
                
                        #MessageViewBody a {
                            color: inherit;
                            text-decoration: none;
                        }
                
                        p {
                            line-height: inherit
                        }
                
                        .desktop_hide,
                        .desktop_hide table {
                            mso-hide: all;
                            display: none;
                            max-height: 0px;
                            overflow: hidden;
                        }
                
                        .image_block img+div {
                            display: none;
                        }
                
                        @media (max-width:700px) {
                            .desktop_hide table.icons-inner {
                                display: inline-block !important;
                            }
                
                            .icons-inner {
                                text-align: center;
                            }
                
                            .icons-inner td {
                                margin: 0 auto;
                            }
                
                            .row-content {
                                width: 100% !important;
                            }
                
                            .mobile_hide {
                                display: none;
                            }
                
                            .stack .column {
                                width: 100%;
                                display: block;
                            }
                
                            .mobile_hide {
                                min-height: 0;
                                max-height: 0;
                                max-width: 0;
                                overflow: hidden;
                                font-size: 0px;
                            }
                
                            .desktop_hide,
                            .desktop_hide table {
                                display: table !important;
                                max-height: none !important;
                            }
                
                            .row-2 .column-1 .block-2.text_block td.pad {
                                padding: 15px 10px !important;
                            }
                
                            .row-2 .column-1 .block-1.heading_block h1 {
                                text-align: center !important;
                                font-size: 20px !important;
                            }
                
                            .row-2 .column-1 .block-1.heading_block td.pad {
                                padding: 40px 10px 5px !important;
                            }
                
                            .row-1 .column-1 .block-2.image_block td.pad {
                                padding: 0 0 0 20px !important;
                            }
                
                            .row-2 .column-1 {
                                padding: 0 !important;
                            }
                        }
                    </style>
                </head>
                
                <body style="margin: 0; background-color: #fbfbfb; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
                    <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                        <tbody>
                            <tr>
                                <td>
                                    <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                        role="presentation"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                        cellspacing="0" role="presentation"
                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; color: #000000; width: 680px;"
                                                        width="680">
                                                        <tbody>
                                                            <tr>
                                                                <td class="column column-1" width="100%"
                                                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                    <div class="spacer_block block-1"
                                                                        style="height:30px;line-height:30px;font-size:1px;">&#8202;
                                                                    </div>
                                                                    <table class="image_block block-2" width="100%" border="0"
                                                                        cellpadding="0" cellspacing="0" role="presentation"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                        <tr>
                                                                            <td class="pad"
                                                                                style="width:100%;padding-right:0px;padding-left:0px;">
                                                                                <div class="alignment" align="left"
                                                                                    style="line-height:10px"><img
                                                                                        src="https://mds-community.s3.us-east-2.amazonaws.com/weblogo.png"
                                                                                        style="display: block; height: auto; border: 0; width: 136px; max-width: 100%;"
                                                                                        width="136" alt="Web Logo" title="Logo">
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                    <div class="spacer_block block-3"
                                                                        style="height:15px;line-height:15px;font-size:1px;">&#8202;
                                                                    </div>
                                                                    <div class="spacer_block block-4"
                                                                        style="height:15px;line-height:15px;font-size:1px;">&#8202;
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                        role="presentation"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; background-position: center top;">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                        cellspacing="0" role="presentation"
                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-bottom: 1px solid #CCD6DD; border-left: 1px solid #CCD6DD; border-radius: 4px; border-right: 1px solid #CCD6DD; border-top: 1px solid #CCD6DD; color: #000000; width: 680px;"
                                                        width="680">
                                                        <tbody>
                                                            <tr>
                                                                <td class="column column-1" width="100%"
                                                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                    <table class="heading_block block-1" width="100%" border="0"
                                                                        cellpadding="0" cellspacing="0" role="presentation"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                        <tr>
                                                                            <td class="pad"
                                                                                style="padding-bottom:5px;padding-left:20px;padding-right:15px;padding-top:40px;text-align:center;width:100%;">
                                                                                <h1
                                                                                    style="margin: 0; color: #171719; direction: ltr; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 30px; font-weight: 400; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;">
                                                                                    Just checking to be sure you're you.</h1>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                    <table class="text_block block-2" width="100%" border="0"
                                                                        cellpadding="0" cellspacing="0" role="presentation"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                        <tr>
                                                                            <td class="pad"
                                                                                style="padding-bottom:15px;padding-left:20px;padding-right:35px;padding-top:15px;">
                                                                                <div style="font-family: Arial, sans-serif">
                                                                                    <div class
                                                                                        style="font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; mso-line-height-alt: 21px; color: #171719; line-height: 1.5;">
                                                                                        <p
                                                                                            style="margin: 0; text-align: center; mso-line-height-alt: 24px;">
                                                                                            <span style="font-size:16px;">Please copy
                                                                                                and paste the following code into the
                                                                                                Verification Code field.</span>
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                    <table class="button_block block-3" width="100%" border="0"
                                                                        cellpadding="0" cellspacing="0" role="presentation"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                        <tr>
                                                                            <td class="pad"
                                                                                style="padding-bottom:40px;padding-left:25px;padding-right:25px;padding-top:25px;text-align:center;">
                                                                                <div class="alignment" align="center">
                                                                                    <span
                                                                                        style="text-decoration:none;display:inline-block;color:#171719;background-color:transparent;border-radius:10px;width:auto;border-top:1px solid #AFAFAF;font-weight:400;border-right:1px solid #AFAFAF;border-bottom:1px solid #AFAFAF;border-left:1px solid #AFAFAF;padding-top:5px;padding-bottom:5px;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:21px;text-align:center;mso-border-alt:none;word-break:keep-all;"><span
                                                                                            style="padding-left:60px;padding-right:60px;font-size:21px; display:inline-block;letter-spacing:1px;"><span
                                                                                                dir="ltr"
                                                                                                style="word-break: break-word; line-height: 42px;"><strong>${random}</strong></span></span></span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                        role="presentation"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                        cellspacing="0" role="presentation"
                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; color: #000000; width: 680px;"
                                                        width="680">
                                                        <tbody>
                                                            <tr>
                                                                <td class="column column-1" width="100%"
                                                                    style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                    <div class="spacer_block block-1"
                                                                        style="height:55px;line-height:55px;font-size:1px;">&#8202;
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </body>
                
                </html>`,
            };

            await sendEmail(mail_data);
            const updateData = await inviteCollaborator.findOneAndUpdate(
                { _id: collaboratorId },
                {
                    otp: random,
                    otpExpireTime: new Date(new Date().setMinutes(new Date().getMinutes() + 5)),
                    isOTPVerified: false,
                },
                { new: true }
            );

            if (updateData !== null) {
                res.status(200).json({ status: true, data: updateData, message: "OTP resent sucessfully.", });
            } else {
                res.status(200).json({ status: false, message: "Collabortor details not found!" });
            }
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// resend invitation or revoke collaborator user
exports.reInviteAndRevokeCollaborator = async (req, res) => {
    try {
        const body = req.body;
        const collaboratorId = ObjectId(body.collaboratorId);
        const existCollaborator = await inviteCollaborator.findOne({
            _id: collaboratorId,
            isDelete: false,
        }, { _id: 1, email: 1, sharedUserDetails: 1, }).lean();

        if (existCollaborator === null) {
            return res.status(404).json({ status: false, message: `Collaborator details not found!`, });
        } else {
            const userData = await User.findOne({ _id: existCollaborator?.sharedUserDetails?.userId, isDelete: false, },
                {
                    _id: 1, PreferredEmail: "$Preferred Email", auth0Id: 1, otherdetail: 1,
                    attendeeDetail: {
                        name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                        firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                        lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                    },
                    purchased_plan: 1,
                });

            if (body.type === "resend") {
                if (existCollaborator !== null) {
                    const userName = userData.auth0Id && userData.auth0Id.length ? userData.otherdetail ? userData.otherdetail[process.env.USER_FN_ID] + " " + userData.otherdetail[process.env.USER_LN_ID] : "" : userData.attendeeDetail ? userData.attendeeDetail.name : "";

                    const collaboratorName = existCollaborator.firstName && existCollaborator.lastName ? existCollaborator.firstName + " " + existCollaborator.lastName : "";

                    const updateCollaborator = await inviteCollaborator.findOneAndUpdate(
                        { _id: collaboratorId },
                        {
                            teamMateInvitationStatus: "pending",
                            collaboratorPlan: false,
                        },
                        { new: true }
                    );

                    if (updateCollaborator) {
                        const mailData = {
                            email: `${existCollaborator.email}`,
                            subject: `Resend Invitation for the MDS Collaborator for User ${userName}.`,
                            html: `<div style="max-width: 500px; width: 100%; margin: 30px; font-family: arial; line-height: 24px;">
                                <div style="margin-bottom: 25px;">Dear ${collaboratorName},</div>
                                <div style="margin-bottom: 25px;">You are being invited to join our MDS platform as the role of collaborator through ${userName}.</div>
                                <div style="margin-bottom: 25px;">Please click on the link below and join us through our social media account. <a href="${process.env.ADMIN_URL}/collaborator?id=${existCollaborator._id}">Join as Collaborator</a></div>
                                <div>Best regards,</div>
                                <div>Team MDS</div></div>`,
                        };
                        await sendEmail(mailData);

                        return res.status(200).json({ status: true, message: `Invitation resent successfully to the collaborator user.`, data: updateCollaborator, });
                    } else {
                        return res.status(401).json({ status: false, message: `Something went wrong while resending invitation to the collaborator!`, });
                    }
                }
            } else if (body.type === "revoke") {
                if (existCollaborator !== null) {
                    const updateCollaborator = await inviteCollaborator.findOneAndUpdate(
                        { _id: collaboratorId },
                        {
                            teamMateInvitationStatus: "revoked",
                            collaboratorPlan: false,
                            isDelete: true
                        },
                        { new: true }
                    );
                    if (updateCollaborator) {
                        return res.status(200).json({ status: true, message: `Collaborator revoked successfully.`, data: updateCollaborator, });
                    } else {
                        return res.status(401).json({ status: false, message: `Something went wrong while revoking collaborator!`, });
                    }
                }
            }
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// invitation accepted of collaborator
exports.acceptInvitation = async (req, res) => {
    try {
        const body = req.body;
        const collaboratorId = ObjectId(body.collaboratorId);
        const existCollaborator = await inviteCollaborator.findOne({
            _id: collaboratorId,
            otp: body.otp,
            isDelete: false,
        }, { _id: 1, email: 1, sharedUserDetails: 1, otpExpireTime: 1, otp: 1, }).lean();

        if (existCollaborator !== null) {
            if (new Date(existCollaborator.otpExpireTime).getTime() < new Date().getTime()) {
                return res.status(200).json({ status: false, message: `OTP has been expired for this collaborator!`, data: [], });
            } else {
                const updateCollaborator = await inviteCollaborator.findOneAndUpdate(
                    { _id: collaboratorId },
                    {
                        otp: null,
                        otpExpireTime: null,
                        isOTPVerified: true,
                    },
                    { new: true }
                );
                if (updateCollaborator) {
                    return res.status(200).json({ status: true, message: `Collaborator invitation accepted successfully.`, data: updateCollaborator, });
                } else {
                    return res.status(401).json({ status: false, message: `Something went wrong while accepting collaborator invitation!`, });
                }
            }
        } else {
            return res.status(200).json({ status: false, message: `OTP is invalid, Please enter correct OTP for this collaborator.`, data: [], });
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// get all pending collaborator
exports.getPendingCollaborators = async (req, res) => {
    try {
        const pendingCollaborators = await inviteCollaborator.find({ isDelete: false, teamMateInvitationStatus: "pending" }, { email: 1, isDelete: 1, name: 1, firstName: 1, lastName: 1, teamMateInvitationStatus: 1, collaboratorPlan: 1, sharedUserDetails: 1, });

        if (pendingCollaborators.length > 0) {
            return res.status(200).json({ status: true, message: `Pending invitation collaborators list retrive sucessfully.`, data: pendingCollaborators });
        } else {
            return res.status(401).json({ status: false, message: `Something went wrong while getting collaborators list!`, });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// get all accepted collaborator
exports.getAcceptedCollaborators = async (req, res) => {
    try {
        const acceptedCollaborators = await inviteCollaborator.find({ isDelete: false, teamMateInvitationStatus: "accepted" }, { email: 1, isDelete: 1, name: 1, firstName: 1, lastName: 1, teamMateInvitationStatus: 1, collaboratorPlan: 1, sharedUserDetails: 1, });

        if (acceptedCollaborators.length > 0) {
            return res.status(200).json({ status: true, message: `Accepted invitation collaborators list retrive sucessfully.`, data: acceptedCollaborators });
        } else {
            return res.status(401).json({ status: false, message: `Something went wrong while getting collaborators list!`, });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// get all revoked collaborator
exports.getRevokedCollaborators = async (req, res) => {
    try {
        const acceptedCollaborators = await inviteCollaborator.find({ isDelete: true , teamMateInvitationStatus: "revoked" }, { email: 1, isDelete: 1, name: 1, firstName: 1, lastName: 1, teamMateInvitationStatus: 1, collaboratorPlan: 1, sharedUserDetails: 1, });
        //const acceptedCollaborators = await inviteCollaborator.find({ isDelete: false, teamMateInvitationStatus: "revoked" }, { email: 1, isDelete: 1, name: 1, firstName: 1, lastName: 1, teamMateInvitationStatus: 1, collaboratorPlan: 1, sharedUserDetails: 1, });

        if (acceptedCollaborators.length > 0) {
            return res.status(200).json({ status: true, message: `Revoked invitation collaborators list retrive sucessfully.`, data: acceptedCollaborators });
        } else {
            return res.status(401).json({ status: false, message: `Something went wrong while getting collaborators list!`, });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// access resource detail
exports.getAccessResourceById = async (req, res) => {
    try {
        const accessResourceDetail = await accessResource.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (accessResourceDetail) {
            return res.status(200).json({ status: true, message: `Resource detail retrive sucessfully.`, data: accessResourceDetail });
        } else {
            return res.status(404).json({ status: false, message: `No data found for this resource id!` });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all access resource for user
exports.getAllResource = async (req, res) => {
    try {
        const accessResourceList = await accessResource.find({ isDelete: false });

        if (accessResourceList)
            return res.status(200).json({ status: true, message: `Resource list retrive sucessfully.`, data: accessResourceList });
        else
            return res.status(401).json({ status: false, message: `Something went wrong while getting resource list!`, });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};