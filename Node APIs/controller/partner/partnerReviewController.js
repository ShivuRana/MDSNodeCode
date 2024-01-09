const User = require("../../database/models/airTableSync");
const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const Partner = require("../../database/models/partner/partner");
const PartnerReview = require("../../database/models/partner/partnerReview");
const partnerReasons = require("../../database/models/partner/partnerReasons");
const ObjectId = require("mongoose").Types.ObjectId;
const { deleteImage } = require("../../utils/mediaUpload");
const { sendEmail, sendEmailAdmin } = require("../../config/common");
const AWS = require("aws-sdk");
var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

/** User APIs Starts **/
/** start Create, edit, delete and get all partner **/
// create review
exports.createPartnerReview = async (req, res) => {
    try {
        const body = req.body;
        const userData = await User.findById(req.authUserId).select({ _id: 1, otherdetail: 1, auth0Id: 1, attendeeDetail: 1, ["Preferred Email"]: 1 });
        const partner = await Partner.findById(body.partnerId).select({ companyName: 1, _id: 1 });

        const newReview = new PartnerReview({
            star: body.star !== undefined && body.star !== null && body.star !== "" ? body.star : "0",
            reviewNote: body.reviewNote !== undefined && body.reviewNote !== null && body.reviewNote !== undefined ? body.reviewNote : "",
            userId: userData._id !== undefined && userData._id !== null && userData._id !== "" ? userData._id : "",
            partnerId: body.partnerId !== undefined && body.partnerId !== null && body.partnerId !== "" ? body.partnerId : "",
        });

        const userName = userData.auth0Id && userData.auth0Id.length ? userData.otherdetail ? userData.otherdetail[process.env.USER_FN_ID] + " " + userData.otherdetail[process.env.USER_LN_ID] : "" : userData.attendeeDetail ? userData.attendeeDetail.name : "";
        var reviewText = "";
        if (body.reviewNote !== undefined && body.reviewNote !== "" && body.reviewNote !== null) {
            reviewText = `${body.reviewNote}`;
        }

        const mail_data = {
            email: `${userData["Preferred Email"]}`,
            subject: `New Review Added for Partner ${partner.companyName}`,
            html: `<div style="max-width: 500px; width: 100%; margin: 30px; font-family: arial; line-height: 24px;">
                    <div style="margin-bottom: 25px;">The feedback provided is as follows:</div>
                    <div><b>Reviewer</b>: ${userName}</div>
                    <div><b>Rating</b>: ${body.star}</div>
                    <div style="margin-bottom: 25px;"><b>Feedback</b>: ${reviewText}</div>
                    <div style="margin-bottom: 25px;"> To review the full feedback, simply click the link: <a href="${process.env.ADMIN_URL}/partner/detail?id=${partner._id}">Partner Details</a> </div>
                    <div>Best regards,</div>
                    <div>MDS Admin</div></div>`,
        };

        await sendEmailAdmin(mail_data);

        const reviewData = await newReview.save();
        if (reviewData) {
            return res.status(200).json({ status: true, message: "Review added successfully.", data: reviewData, });
        } else {
            return res.status(200).json({ status: false, message: "Something went wrong while adding review!", });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: `Internal server error. ${error}` });
    }
};

// edit review
exports.editPartnerReview = async (req, res) => {

    try {
        const body = req.body;
        const userData = await User.findById(req.authUserId).select({ _id: 1 });

        const reviewExist = await PartnerReview.findById(req.params.id);
        if (!reviewExist)
            return res.status(404).json({ status: false, message: `Review not found!` });

        const updated = await PartnerReview.findByIdAndUpdate(
            req.params.id,
            {
                star: body.star !== undefined && body.star !== null && body.star !== "" ? body.star : reviewExist.star ?? reviewExist.star,
                reviewNote: body.reviewNote !== undefined && body.reviewNote !== null && body.reviewNote !== "" ? body.reviewNote : reviewExist.reviewNote ?? reviewExist.reviewNote,
                userId: userData._id !== undefined && userData._id !== null && userData._id !== "" ? userData._id : reviewExist.userId ?? reviewExist.userId,
                partnerId: body.partnerId !== undefined && body.partnerId !== null && body.partnerId !== "" ? body.partnerId : reviewExist.partnerId ?? reviewExist.partnerId,
            },
            { new: true }
        );

        if (updated)
            return res.status(200).json({ status: true, message: `Review updated successfully.`, Data: updated, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while updating review!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }

};

// delete review 
exports.deletePartnerReview = async (req, res) => {
    try {
        const userData = await User.findById(req.authUserId).select({ _id: 1 });
        const reviewId = ObjectId(req.params.id);
        const reviewExist = await PartnerReview.findOne({ _id: reviewId, userId: userData._id, isDelete: false });

        if (!reviewExist)
            return res.status(404).json({ status: false, message: `Review not found!` });

        const deletePartner = await PartnerReview.findOneAndUpdate({ _id: reviewId, userId: userData._id }, { isDelete: true });
        if (deletePartner) {
            // Update Average Partner Review rating Code
            const avgRatings = await PartnerReview.aggregate([
                {
                    $match: {
                        partnerId: reviewExist.partnerId._id,
                        isDelete: false,
                        status: "approved"
                    }
                },
                {
                    $group: {
                        _id: 0,
                        rating: { $avg: { $toInt: "$star" } }
                    }
                },
            ]);

            if (avgRatings.length > 0) {
                await Partner.findByIdAndUpdate(reviewExist.partnerId._id,
                    { rating: parseFloat(avgRatings[0].rating).toFixed(1) }, { new: true }
                )
            } else {
                await Partner.findByIdAndUpdate(reviewExist.partnerId._id,
                    { rating: 0 }, { new: true }
                )
            }

            return res.status(200).json({ status: true, message: `Review deleted successfully.` });
        } else {
            return res.status(200).json({ status: false, message: `Something went wrong while deleting review!`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get all review list
exports.getAllPartnerReviewList = async (req, res) => {
    try {
        const partnerReviewList = await PartnerReview.find({ isDelete: false, status: "approved" }).sort({ createdAt: -1 });

        if (partnerReviewList.length > 0) {
            return res.status(200).json({ status: true, message: `Review list retrive successfully.`, data: partnerReviewList, });
        } else {
            return res.status(200).json({ status: true, message: `Something went wrong while getting review list!`, data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};


// get all review list
exports.reportReview = async (req, res) => {
    try {
        if (req.body.id) {
            const userData = await User.findById(req.authUserId).select({ _id: 1 });
            if (userData) {
                const reviewId = ObjectId(req.body.id)
                let alreadyReportExist = await PartnerReview.findOne({
                    _id: reviewId,
                    reportIds: { $in: [req.authUserId] },
                }).select({ reportIds: 1, partnerId: 0, userId: 0, _id: 0 });
                
                if (alreadyReportExist) {
                    return res.status(200).json({ status: false, message: `Report already exists`, data: [] });
                } else {

                    const updateReport = await PartnerReview.findByIdAndUpdate(reviewId, { $addToSet: { reportIds:  req.authUserId } },{new:true});
                    return res.status(200).json({ status: true, message: `Report added`, data: updateReport });
                }
            } else {
                return res.status(200).json({ status: false, message: `User not exists.`, data: [], });
            }
        } else {
            return res.status(200).json({ status: false, message: `Input parameters are missing!`, data: [], });
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

/** User APIs Ends **/

/** Admin APIs Starts **/

// get all review list
exports.getPartnerReviewList = async (req, res) => {
    try {
        const filterType = req.query.filtertype ? req.query.filtertype  : 'pending'

        const partnerReviewList = await PartnerReview.aggregate([
            {
                $match: {
                    isDelete: false,
                    status: (filterType === "pending")? "none" : (filterType === "verified") ? "approved" : {$exists: true} 
                }
            },
            {
                $lookup: {
                    from: "partners",
                    localField: "partnerId",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $match: {
                                isDelete: false
                            }
                        },
                        {
                            $project: {
                                companyName: 1
                            }
                        }
                    ],
                    as: "partnerId",
                },
            },
            { $unwind: "$partnerId" },
            {
                $lookup: {
                    from: "airtable-syncs",
                    localField: "userId",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $match: {
                                isDelete: false
                            }
                        },
                        {
                            $project: {
                                email: 1,
                                otherdetail: 1,
                                profileImg: 1,
                                attendeeDetail: {
                                    name: "$attendeeDetail.name",
                                    firstName: "$attendeeDetail.firstName",
                                    lastName: "$attendeeDetail.lastName",
                                },
                                auth0Id: 1,
                            }
                        }
                    ],
                    as: "userId",
                },
            },

            { $unwind: "$userId" },

            {
                $project: {
                    _id: 1,
                    star: 1,
                    reviewNote: 1,
                    userId: 1,
                    partnerId: 1,
                    status: 1,
                    reasonId: 1,
                    rejectNotes: 1,
                    createdAt: 1,
                    statusUpdateDate: 1,
                    reportCount: { $size: { $ifNull: ["$reportIds", []] } },

                }



            },

        ]);


        if (partnerReviewList.length > 0) {
            return res.status(200).json({ status: true, message: `Review list retrive successfully.`, data: partnerReviewList, });
        } else {
            return res.status(200).json({ status: false, message: `No review data found!`, data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// review list by partner Id api
exports.getPartnerReviewListById = async (req, res) => {
    try {

        const filterType = req.query.filtertype ? req.query.filtertype  : 'pending'

        const reviewList = await Partner.aggregate([
            {
                $match: {
                    _id: ObjectId(req.params.id),
                    isDelete: false,
                }
            },
            {
                $lookup: {
                    from: "partnerreviews",
                    let: { id: "$_id", companyName: "$companyName" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$$id", "$partnerId"] },
                                isDelete: false,
                                status: (filterType === "pending")? "none" : (filterType === "verified") ? "approved" : {$exists: true} 
                            }
                        },

                        {
                            $lookup: {
                                from: "airtable-syncs",
                                localField: "userId",
                                foreignField: "_id",
                                pipeline: [
                                    {
                                        $match: {
                                            isDelete: false
                                        }
                                    },
                                    {
                                        $project: {
                                            email: 1,
                                            otherdetail: 1,
                                            profileImg: 1,
                                            attendeeDetail: {
                                                name: "$attendeeDetail.name",
                                                firstName: "$attendeeDetail.firstName",
                                                lastName: "$attendeeDetail.lastName",
                                            },
                                            auth0Id: 1,
                                        }
                                    }
                                ],
                                as: "userId",
                            },
                        },
                        { $unwind: "$userId" },

                        {
                            $project: {
                                _id: 1,
                                star: 1,
                                reviewNote: 1,
                                userId: 1,
                                partnerId: 1,
                                status: 1,
                                reasonId: 1,
                                rejectNotes: 1,
                                createdAt: 1,
                                statusUpdateDate: 1,
                                reportCount: { $size: { $ifNull: ["$reportIds", []] } },
                                companyName: "$$companyName",
                            }
                        }
                    ],
                    as: "reviews",
                },
            },
            {
                $project: {
                    _id: 1,
                    companyName: 1,
                    companyLogo: 1,
                    darkCompanyLogo: 1,
                    description: 1,
                    reviews: 1,
                }
            }
        ]);
        if (reviewList.length > 0)
            return res.status(200).json({ status: true, message: `Review list retrive successfully.`, data: reviewList });
        else
            return res.status(200).json({ status: false, message: `No reviews data found for this partner!` });
    } catch (error) {
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// review detail api
exports.getPartnerReviewDetail = async (req, res) => {
    try {
        const reviewId = ObjectId(req.params.id);
        const reviewDetail = await PartnerReview.findOne({ _id: reviewId, isDelete: false });
        if (reviewDetail)
            return res.status(200).json({ status: true, message: `Review detail retrive successfully.`, data: reviewDetail });
        else
            return res.status(200).json({ status: false, message: `No data found for this review id!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// delete review by admin
exports.deleteReview = async (req, res) => {
    try {
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "") {
            const reviewId = ObjectId(req.params.id);
            const reviewExist = await PartnerReview.findOne({ _id: reviewId, isDelete: false });

            if (!reviewExist)
                return res.status(404).json({ status: false, message: `Review not found!` });

            const deletePartner = await PartnerReview.findOneAndUpdate({ _id: reviewId }, { isDelete: true });
            if (deletePartner) {
                // Update Average Partner Review rating Code
                const avgRatings = await PartnerReview.aggregate([
                    {
                        $match: {
                            partnerId: reviewExist.partnerId._id,
                            isDelete: false,
                            status: "approved"
                        }
                    },
                    {
                        $group: {
                            _id: 0,
                            rating: { $avg: { $toInt: "$star" } }
                        }
                    },
                ]);

                if (avgRatings.length > 0) {
                    await Partner.findByIdAndUpdate(reviewExist.partnerId._id,
                        { rating: parseFloat(avgRatings[0].rating).toFixed(1) }, { new: true }
                    )
                } else {
                    await Partner.findByIdAndUpdate(reviewExist.partnerId._id,
                        { rating: 0 }, { new: true }
                    )
                }

                return res.status(200).json({ status: true, message: `Review deleted successfully.` });
            } else {
                return res.status(200).json({ status: false, message: `Something went wrong while deleting review!`, });
            }
        } else {
            return res.status(404).json({ status: false, message: `Review not found!`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// approve or reject partner review
exports.approveOrRejectPartnerReview = async (req, res) => {
    try {
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "") {
            const body = req.body;
            const reviewId = ObjectId(req.params.id);
            const reviewDetail = await PartnerReview.findOne({ _id: reviewId, isDelete: false });
            if (reviewDetail !== null) {

                if (body.status === "rejected") {
                    if (body.reasonId === null && body.reasonId === undefined && body.reasonId === "") {
                        return res.status(200).send({ status: false, message: "Reason Must be compulsory" })
                    }
                }

                const userData = await User.findById(reviewDetail.userId._id).select({ _id: 1, otherdetail: 1, auth0Id: 1, attendeeDetail: 1, ["Preferred Email"]: 1 });
                const partner = await Partner.findById(reviewDetail.partnerId).select({ companyName: 1, _id: 1 });
                const reasonId = body.reasonId !== undefined && body.reasonId !== null && body.reasonId !== "" ? body.reasonId : reviewDetail.reasonId ?? null;
                const reasonData = await partnerReasons.findById(reasonId);

                const userName = userData.auth0Id && userData.auth0Id.length ? userData.otherdetail ? userData.otherdetail[process.env.USER_FN_ID] + " " + userData.otherdetail[process.env.USER_LN_ID] : "" : userData.attendeeDetail ? userData.attendeeDetail.name : "";

                const updatedReview = await PartnerReview.findByIdAndUpdate(req.params.id,
                    {
                        status: body.status !== undefined && body.status !== null && body.status !== "" ? body.status : reviewDetail.status ?? reviewDetail.status,
                        reasonId: body.reasonId !== undefined && body.reasonId !== null && body.reasonId !== "" ? body.reasonId : reviewDetail.reasonId ?? null,
                        rejectNotes: body.rejectNotes !== undefined && body.rejectNotes !== null && body.rejectNotes !== "" ? body.rejectNotes : reviewDetail.rejectNotes === undefined ? "" : reviewDetail.rejectNotes,
                        statusUpdateDate: new Date()
                    }, { new: true }
                );

                // Update Average Partner Review rating Code
                const avgRatings = await PartnerReview.aggregate([
                    {
                        $match: {
                            partnerId: partner._id,
                            isDelete: false,
                            status: "approved"
                        }
                    },
                    {
                        $group: {
                            _id: 0,
                            rating: { $avg: { $toInt: "$star" } }
                        }
                    },
                ]);

                console.log(avgRatings, 'dfdf')

                await Partner.findByIdAndUpdate(reviewDetail.partnerId._id,
                    { rating: parseFloat((avgRatings.length > 0) ? avgRatings[0].rating : 0).toFixed(1) }, { new: true }
                )
                if (updatedReview !== null) {
                    return res.status(200).json({ status: true, message: "Review updated successfully.", data: updatedReview, });
                } else {
                    return res.status(200).json({ status: false, message: "Something went wrong while adding review!", });
                }
            } else {
                return res.status(404).json({ status: false, message: `Review not found!`, });
            }
        } else {
            return res.status(404).json({ status: false, message: `Review not found!`, });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error. ${error}` });
    }
};

// send email notification for reject or accept partner review
exports.sendApproveOrRejectPartnerReviewEmail = async (req, res) => {
    try {
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "") {
            const reviewId = ObjectId(req.params.id);
            const reviewDetail = await PartnerReview.findOne({ _id: reviewId, isDelete: false });
            if (reviewDetail !== null) {

                const userData = await User.findById(reviewDetail.userId._id).select({ _id: 1, otherdetail: 1, auth0Id: 1, attendeeDetail: 1, ["Preferred Email"]: 1 });
                const partner = await Partner.findById(reviewDetail.partnerId).select({ companyName: 1, _id: 1, rating: 1 });
                const reasonId = reviewDetail.reasonId;
                const reasonData = await partnerReasons.findById(reasonId);

                const userName = userData.auth0Id && userData.auth0Id.length ? userData.otherdetail ? userData.otherdetail[process.env.USER_FN_ID] + " " + userData.otherdetail[process.env.USER_LN_ID] : "" : userData.attendeeDetail ? userData.attendeeDetail.name : "";

                if (reviewDetail.status === "approved") {
                    const approved_mail_data = {
                        email: `${userData["Preferred Email"]}`,
                        subject: `Your Review for Partner ${partner.companyName}: Approved!`,
                        html: `<div style="max-width: 500px; width: 100%; margin: 30px; font-family: arial; line-height: 24px;">
                        <div style="margin-bottom: 25px;">Dear ${userName},</div>
                        <div style="margin-bottom: 25px;">Great news! Your review for Partner "${partner.companyName}" has been approved and is now live. Thank you for your valuable feedback and for being a part of our community.</div>
                        <div style="margin-bottom: 25px;"><b>Review details:</b></div>
                        <div><b>Rating</b>: ${reviewDetail.star}</div>
                        <div style="margin-bottom: 25px;"><b>Feedback</b>: ${reviewDetail.reviewNote}</div>
                        <div style="margin-bottom: 25px;">You can view your review and others here: <a href="${process.env.ADMIN_URL}/partnerlibrary/partnerdetail/?id=${partner._id}">Partner Details</a></div>
                        <div style="margin-bottom: 25px;">We appreciate your contribution and look forward to more interactions!</div>
                        <div>Best regards,</div>
                        <div>MDS Admin</div></div>`,
                    };
                    await sendEmail(approved_mail_data);



                } else if (reviewDetail.status === "rejected") {
                    var rejectedNote = "";
                    if (reviewDetail.rejectNotes !== undefined && reviewDetail.rejectNotes !== "" && reviewDetail.rejectNotes !== "") {
                        rejectedNote = `<div style="margin-bottom: 25px;">Additional Note: ${reviewDetail.rejectNotes}.</div>`
                    }
                    const rejected_mail_data = {
                        email: `${userData["Preferred Email"]}`,
                        subject: `Your Review for Partner "${partner.companyName}": Rejected!`,
                        html: `<div style="max-width: 500px; width: 100%; margin: 30px; font-family: arial; line-height: 24px;">
                        <div style="margin-bottom: 25px;">Dear ${userName},</div>
                        <div style="margin-bottom: 25px;">Thank you for submitting your review for Partner "${partner.companyName}".</div>
                        <div style="margin-bottom: 25px;">After carefully reviewing it, we regret to inform you that it has not been approved for publication due to: <b>"${reasonData.reason}"</b>.</div>
                        ${rejectedNote}
                        <div style="margin-bottom: 25px;">We appreciate your understanding.</div>
                        <div>Best regards,</div>
                        <div>MDS Admin</div></div>`,
                    };
                    await sendEmail(rejected_mail_data);


                }

                return res.status(200).json({ status: true, message: "Email sent successfully.", data: [] });

            } else {
                return res.status(404).json({ status: false, message: `Review not found!`, });
            }
        } else {
            return res.status(404).json({ status: false, message: `Review not found!`, });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error. ${error}` });
    }
};

// review detail api
exports.getNewPartnerReviewCount = async (req, res) => {
    try {
        const newReviewCount = await PartnerReview.countDocuments({ isDelete: false, isNew: true });
        if (newReviewCount > 0)
            return res.status(200).json({ status: true, message: `New reviews found .`, data: newReviewCount });
        else
            return res.status(200).json({ status: false, message: `No new reviews found!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// review detail api
exports.UpdateNewPartnerReviewFlag = async (req, res) => {
    try {
        const newReviewFlagUpdated = await PartnerReview.updateMany({ isDelete: false, isNew: true }, { isNew: false });
        if (newReviewFlagUpdated)
            return res.status(200).json({ status: true, message: `All reviews are read .`, data: newReviewFlagUpdated });
        else
            return res.status(200).json({ status: false, message: `No new reviews updated!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//get report users list for review
exports.getPartnerReviewReportUserList = async (req, res) => {
    try {

        if (req.params.id) {
            const reviewId = ObjectId(req.params.id);

            const partnerReviewReportUserList = await PartnerReview.aggregate([
                {
                    $match: {
                        isDelete: false,
                        _id: reviewId
                    }
                },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        localField: "reportIds",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    email: 1,
                                    otherdetail: 1,
                                    profileImg: 1,
                                    attendeeDetail: {
                                        name: "$attendeeDetail.name",
                                        firstName: "$attendeeDetail.firstName",
                                        lastName: "$attendeeDetail.lastName",
                                    },
                                    auth0Id: 1,
                                }
                            }

                        ],
                        as: "reportUsers",
                    },
                },
                {
                    $project: {
                        _id: 0,
                        reportUsers: 1,

                    }
                },

            ]);


            if (partnerReviewReportUserList.length > 0) {
                const reportUsers = partnerReviewReportUserList[0].reportUsers
                if (reportUsers.length > 0) {
                    return res.status(200).json({ status: true, message: `Review report users list retrive successfully.`, data: reportUsers, });
                } else {
                    return res.status(200).json({ status: false, message: `No report user list found.`, data: [] });
                }

            } else {
                return res.status(200).json({ status: false, message: `No review exists!`, data: [], });
            }
        } else {
            return res.status(200).json({ status: false, message: `Input parameter missing!` });
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

/** Admin APIs Ends **/