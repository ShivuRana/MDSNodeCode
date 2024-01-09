const User = require("../../database/models/airTableSync");
const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const ObjectId = require("mongoose").Types.ObjectId;
const Partner = require("../../database/models/partner/partner");
const AWS = require("aws-sdk");
const partnerReason = require("../../database/models/partner/partnerReasons");
const { deleteImage } = require("../../utils/mediaUpload");
const ogs = require('open-graph-scraper');

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// create partner post
exports.createPartnerReason = async (req, res) => {
    try {
        const checkname = await partnerReason.find({ reason: req.body.reason, isDelete: false, });
        if (checkname && checkname.length > 0) {
            return res.status(200).json({ status: false, message: `Reason must be unique.` });
        }

        const newpostData = new partnerReason({
            reason: req.body.reason
        });
        const saveReason = await newpostData.save();
        if (saveReason)
            return res.status(200).json({ status: true, message: `Partner reason created successfully!`, data: saveReason, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while adding partner reason!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//edit partner post 
exports.editPartnerReason = async (req, res) => {
    try {
        const getPartnerReason = await partnerReason.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (!getPartnerReason)
            return res.status(200).json({ status: false, message: `Reason not found` });

        const updatedReason = await partnerReason.findByIdAndUpdate(req.params.id,
            {
                reason: req.body.reason ?? getPartnerReason.reason,
            },
            { new: true }
        );

        if (updatedReason)
            return res.status(200).json({ status: true, message: `Reason updated successfully!`, data: updatedReason, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while updating reason!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// delete partner post
exports.deletePartnerReason = async (req, res) => {
    try {
        const getPartnerReason = await partnerReason.findById(req.params.id);
        if (!getPartnerReason)
            return res.status(200).json({ status: false, message: `Partner reason not found` });

        const deleteReason = await partnerReason.findByIdAndUpdate(req.params.id, { isDelete: true }, { new: true });
        if (deleteReason)
            return res.status(200).json({ status: true, message: `Partner reason deleted successfully!`, data: deleteReason });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while deleting partner reason!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all partner post list
exports.getAllPartnerReason = async (req, res) => {
    try {
        const partnerReasonList = await partnerReason.find({ isDelete: false }).sort({ createdAt: -1 });
        if (partnerReasonList)
            return res.status(200).json({ status: true, message: `Partner reason list retrive sucessfully.`, data: partnerReasonList });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting partner reason list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner post detail api
exports.getPartnerReasonById = async (req, res) => {
    try {
        const partnerReasonDetail = await partnerReason.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (partnerReasonDetail)
            return res.status(200).json({ status: true, message: `Partner reason detail retrive sucessfully.`, data: partnerReasonDetail });
        else
            return res.status(200).json({ status: false, message: `No data found for this reason id!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// add videos in partner
exports.addVidosInPartners = async (req, res) => {
    try {
        const body = req.body;

        if (body.partnersId !== null) {
            const partnersId = ObjectId(body.partnersId);
            let sortingOption = body.sortingOption
            const ObjVideoIds = body.videoIds.map((videoId) => {
                return ObjectId(videoId)
            })
            const partnerData = await Partner.findOne({ _id: partnersId, isDelete: false }).select("_id companyName videoIds relatedVideoSortOption");
            if (partnerData) {
                const exitsVideoData = partnerData.videoIds
                let videosWithOrder = []
                let relatedVideos = []
                sortingOption = body.sortingOption ? body.sortingOption : partnerData.relatedVideoSortOption ? partnerData.relatedVideoSortOption : "latest";

                switch (sortingOption) {
                    case "custom":
                        relatedVideos = body.videoIds
                        break;

                    case "views":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    views: { $sum: [{ $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] }, { $cond: [{ $not: ["views.0"] }, 0, { $size: "$views" }] }] }
                                }
                            },
                            {
                                $sort: { views: -1 }
                            }
                        ])


                        break;

                    case "likes":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    likes: { $cond: [{ $not: ["likes.0"] }, 0, { $size: "$likes" }] }
                                }
                            },
                            {
                                $sort: { likes: -1 }
                            }
                        ])

                        break;

                    case "comments":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    comments: { $cond: [{ $not: ["comments.0"] }, 0, { $size: "$comments" }] }
                                }
                            },
                            {
                                $sort: { comments: -1 }
                            }
                        ])

                        break;

                    case "default":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    createdAt: 1
                                }
                            },
                            {
                                $sort: { createdAt: -1 }
                            }
                        ])
                        break;
                    case "latest":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    createdAt: 1
                                }
                            },
                            {
                                $sort: { createdAt: -1 }
                            }
                        ])
                        break;
                }

                videosWithOrder = relatedVideos.map((videoId, index) => {
                    if (videoId && typeof videoId === "object") {

                        const singleExistsVideo = exitsVideoData.filter((existsVideo) => {

                            if (existsVideo !== null) {
                                return existsVideo.id.toString() === videoId._id.toString()
                            }

                        })
                        if (singleExistsVideo.length > 0) {
                            const obj = { id: videoId, order: index + 1, status: singleExistsVideo[0].status }
                            return obj
                        } else {
                            const obj = { id: videoId, order: index + 1 }
                            return obj
                        }
                    } else {

                        const singleExistsVideo = exitsVideoData.filter((existsVideo) => existsVideo.id.toString() === videoId.toString())

                        if (singleExistsVideo.length > 0) {
                            const obj = { id: videoId, order: index + 1, status: singleExistsVideo[0].status }
                            return obj
                        } else {
                            const obj = { id: videoId, order: index + 1 }
                            return obj
                        }
                    }

                })

                if (partnerData && body.videoIds && body.videoIds.length > 0) {
                    const partnerDetails = await Partner.findByIdAndUpdate(partnersId, {
                        videoIds: videosWithOrder,
                        relatedVideoSortOption: sortingOption
                    }, { new: true });
                    if (partnerDetails) {
                        return res.status(200).json({ status: true, message: "Videos added in partner.", data: partnerDetails });
                    }
                } else {
                    return res.status(200).json({ status: false, message: "Please add partner ids!" });
                }
            } else {
                return res.status(200).json({ status: false, message: "partner data not found!" });
            }
        } else {
            return res.status(200).json({ status: false, message: "partner data not found!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
}

// reorder videos in partner
exports.reorderVideosInPartners = async (req, res) => {
    try {
        const body = req.body;
        let videosWithOrder = []
        let relatedVideos = []

        if (req.params.id !== null) {
            const partnersId = ObjectId(req.params.id);
            const partnerData = await Partner.findOne({ _id: partnersId, isDelete: false }).select("_id companyName videoIds");
            //console.log(partnerData)    
            if (partnerData) {

                const exitsVideoData = partnerData.videoIds
                const sortingOption = body.videoSortingOption
                const videosIds = body.videoIds
                const ObjVideoIds = body.videoIds.map((videoId) => {
                    return ObjectId(videoId)
                })

                switch (sortingOption) {
                    case "custom":
                        relatedVideos = videosIds
                        break;
                    case "views":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    views: { $sum: [{ $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] }, { $cond: [{ $not: ["views.0"] }, 0, { $size: "$views" }] }] }
                                }
                            },
                            {
                                $sort: { views: -1 }
                            }
                        ])
                        break;

                    case "likes":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    likes: { $cond: [{ $not: ["likes.0"] }, 0, { $size: "$likes" }] }
                                }
                            },
                            {
                                $sort: { likes: -1 }
                            }
                        ])
                        break;

                    case "comments":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    comments: { $cond: [{ $not: ["comments.0"] }, 0, { $size: "$comments" }] }
                                }
                            },
                            {
                                $sort: { comments: -1 }
                            }
                        ])
                        break;

                    case "default":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    createdAt: 1
                                }
                            },
                            {
                                $sort: { createdAt: -1 }
                            }
                        ])
                        break;

                    case "latest":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: ObjVideoIds }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    createdAt: 1
                                }
                            },
                            {
                                $sort: { createdAt: -1 }
                            }
                        ])
                        break;
                }


                videosWithOrder = relatedVideos.map((videoId, index) => {

                    if (typeof videoId === "object") {

                        const singleExistsVideo = exitsVideoData.filter((existsVideo) => existsVideo.id.toString() === videoId._id.toString())
                        if (singleExistsVideo.length > 0) {
                            const obj = { id: videoId, order: index + 1, status: singleExistsVideo[0].status }
                            return obj
                        }
                    } else {

                        const singleExistsVideo = exitsVideoData.filter((existsVideo) => existsVideo.id.toString() === videoId.toString())

                        if (singleExistsVideo.length > 0) {
                            const obj = { id: videoId, order: index + 1, status: singleExistsVideo[0].status }
                            return obj
                        }
                    }

                })


                if (body.videoIds && body.videoIds.length > 0) {
                    const partnerDetails = await Partner.findByIdAndUpdate(partnersId, {
                        videoIds: videosWithOrder,
                        relatedVideoSortOption: sortingOption
                    }, { new: true })
                    if (partnerDetails) {
                        return res.status(200).json({ status: true, message: "Reorder videos fetched.", data: { _id: partnerDetails._id, videoIds: partnerDetails.videoIds } });
                    }
                } else {
                    return res.status(200).json({ status: false, message: "Input videoids are missing!" });
                }

            } else {
                return res.status(200).json({ status: false, message: "Partners not found!" });
            }

        } else {
            return res.status(200).json({ status: false, message: "partner data not found!" });
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
}

// remove video from partner
exports.removeVidosFromPartner = async (req, res) => {
    try {
        const partnersId = ObjectId(req.params.id);
        const videoId = ObjectId(req.query.videoId);
        const partnerData = await Partner.findOne({ _id: partnersId, isDelete: false }).select("_id companyName videoIds");

        if (partnerData.videoIds && partnerData.videoIds.filter(video => video.id.toString() == videoId.toString()).length > 0) {
            const partnerDetails = await Partner.findOneAndUpdate({ _id: partnersId, "videoIds.id": videoId }, {
                $pull: { videoIds: { id: videoId } }
            }, { new: true });
            if (partnerDetails) {
                return res.status(200).json({ status: true, message: "Video removed from partner.", data: partnerDetails });
            }
        } else {
            return res.status(200).json({ status: false, message: "Partner details not found!" });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Something went wrong!", error: error });
    }
}

// video list from partner ID
exports.getVideoListByPartner = async (req, res) => {
    try {
        const partnersId = ObjectId(req.params.id);
        // const partnerData = await Partner.findOne({ _id: partnersId, isDelete: false }, { _id: 1, companyName: 1, videoIds: 1, }).populate("videoIds", { title: 1, video: 1, description: 1, categories: 0, subcategory: 0, speaker: 0, tag: 0, group_ids: 0, eventIds: 0, }).sort({ createdAt: -1, updatedAt: -1 });

        const partnerData = await Partner.aggregate([
            {
                $match: { _id: partnersId, isDelete: false }
            },
            {
                $sort: {
                    "videoIds.order": 1
                }
            },
            {
                $lookup: {
                    from: "contentarchive_videos",
                    localField: "videoIds.id",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $match: {
                                isDelete: false,
                            },
                        },
                        {
                            $project: {

                                title: 1, video: 1, starting_view_cnt: 1, tag: 1, createdAt: 1
                                , views: { $sum: [{ $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] }, { $cond: [{ $not: ["views.0"] }, 0, { $size: "$views" }] }] }
                                , likes: { $cond: [{ $not: ["likes.0"] }, 0, { $size: "$likes" }] }
                                , comments: { $cond: [{ $not: ["comments.0"] }, 0, { $size: "$comments" }] }

                            }
                        },


                    ],
                    as: "videos",
                },
            },

            {
                $project: {
                    _id: 0,
                    relatedVideoSortOption: 1,
                    videoIds: {
                        $map: {
                            input: "$videos",
                            as: "video",
                            in: {
                                $mergeObjects: [
                                    "$$video",
                                    {

                                        $let: {

                                            vars: {
                                                test: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: "$videoIds",
                                                                cond: { $eq: ["$$this.id", "$$video._id"] }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            }, in: { order: "$$test.order", status: { $ifNull: ["$$test.status", "published"] } }


                                        }
                                    }

                                ]
                            }
                        }
                    }

                }
            },
        ]);

        let videosWithOrder = []

        if (partnerData.length > 0) {
            let partnerVideoLists = partnerData[0]
            let videoList = []

            switch (partnerData[0].relatedVideoSortOption) {
                case "custom":
                    videoList = partnerData[0].videoIds.sort((a, b) => a.order - b.order)
                    break;
                case "views":
                    videoList = partnerData[0].videoIds.sort((a, b) => b.views - a.views)
                    break;
                case "comments":
                    videoList = partnerData[0].videoIds.sort((a, b) => b.comments - a.comments)
                    break;
                case "likes":
                    videoList = partnerData[0].videoIds.sort((a, b) => b.likes - a.likes)
                    break;
                case "latest":
                    videoList = partnerData[0].videoIds.sort((a, b) => b.createdAt - a.createdAt)
                    break;
                case "default":
                    videoList = partnerData[0].videoIds.sort((a, b) => b.createdAt - a.createdAt)
                    break;

            }

            videosWithOrder = videoList.map((videoId, index) => {
                const obj = { id: videoId._id, order: index + 1, status: videoId.status }
                return obj
            })
            const partnerDetails = await Partner.findByIdAndUpdate(partnersId, {
                videoIds: videosWithOrder
            }, { new: true }).select({ videoIds: 1 })

            let OrderedVideoLists = videoList.map((videoId, index) => {
                const singleDBVideo = partnerDetails.videoIds.filter(video => video.id.toString() === videoId._id.toString())
                videoId.order = singleDBVideo[0].order
                return videoId
            })
            partnerVideoLists.videoIds = OrderedVideoLists

            return res.status(200).json({ status: true, message: `Videos list retrive successfully.`, data: partnerVideoLists });
        } else {
            return res.status(200).json({ status: false, message: `Videos list not found!`, data: [], });
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all video list for partner module
exports.getContentVideolistForPartner = async (req, res) => {
    try {
        const data = await ContentArchiveVideo.find({ isDelete: false }).select({ title: 1, video: 1, description: 1, tag: 1, duration: 1, categories: 0, subcategory: 0, speaker: 0, group_ids: 0, eventIds: 0, }).sort({ createdAt: -1 });

        if (data.length > 0) {
            return res.status(200).json({ status: true, message: `Videos list retrive successfully.`, data: data, });
        } else {
            return res.status(200).json({ status: false, message: `Videos list not found!`, data: [], });
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// update status of partner
exports.updateRelatedVideoStatus = async (req, res) => {
    try {

        {
            if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "" && req.query.videoid !== undefined && req.query.videoid !== null && req.query.videoid !== "" && req.query.status && req.query.status !== undefined) {
                if (!["hidden", "published"].includes(req.query.status)) {
                    return res.status(200).json({ status: false, message: `Input status query parameter should be published or hidden!`, });
                } else {
                    const relatedVideoExist = await Partner.findOne({ _id: ObjectId(req.params.id), "videoIds.id": { $in: [ObjectId(req.query.videoid)] } });
                    if (!relatedVideoExist)
                        return res.status(200).json({ status: false, message: "Related videos not found!" });

                    const updateVideoStatus = await Partner.findOneAndUpdate({ _id: ObjectId(req.params.id), "videoIds.id": { $in: [ObjectId(req.query.videoid)] } }, { "$set": { "videoIds.$.status": req.query.status } }, { new: true }).select("_id videoIds");
                    if (updateVideoStatus)
                        return res.status(200).json({ status: true, message: `Related video status updated successfully.`, data: updateVideoStatus });
                    else
                        return res.status(200).json({ status: false, message: `Something went wrong while updating status of related video!`, });
                }
            } else {
                return res.status(200).json({ status: false, message: `Input parameters are mossing!`, });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//add related Videos by tag in partner
exports.addVideosByTagInPartners = async (req, res) => {
    try {
        if (req.body.tagIds && req.body.partnersId) {
            const partnerId = ObjectId(req.body.partnersId);
            const objTagIds = req.body.tagIds.map((tagId) => {
                return ObjectId(tagId)
            })
            const tagVideos = await ContentArchiveVideo.find({ isDelete: false, tag: { $in: objTagIds } }).select({ _id: 1, categories: 0, subcategory: 0, speaker: 0, tag: 0, group_ids: 0, eventIds: 0 })
            const tagVideoIds = tagVideos.map((tagVideo) => { return tagVideo._id })
            const partnerData = await Partner.findOne({ _id: partnerId, isDelete: false }).select("_id companyName videoIds relatedVideoSortOption");
            if (partnerData) {
                const exitsVideoData = (partnerData.videoIds && partnerData.videoIds.length > 0) ? partnerData.videoIds : []
                const tagVideosArr = [...exitsVideoData.map(video => video.id), ...tagVideoIds]
                let videosWithOrder = []
                let relatedVideos = []
                let sortingOption = req.body.sortingOption ? req.body.sortingOption : partnerData.relatedVideoSortOption ? partnerData.relatedVideoSortOption : "default";
                switch (sortingOption) {
                    case "custom":
                        relatedVideos = tagVideosArr
                        break;
                    case "views":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: tagVideosArr }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    views: { $sum: [{ $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] }, { $cond: [{ $not: ["views.0"] }, 0, { $size: "$views" }] }] }
                                }
                            },
                            {
                                $sort: { views: -1 }
                            }
                        ])
                        break;
                    case "likes":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: tagVideosArr }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    likes: { $cond: [{ $not: ["likes.0"] }, 0, { $size: "$likes" }] }
                                }
                            },
                            {
                                $sort: { likes: -1 }
                            }
                        ])
                        break;

                    case "comments":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: tagVideosArr }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    comments: { $cond: [{ $not: ["comments.0"] }, 0, { $size: "$comments" }] }
                                }
                            },
                            {
                                $sort: { comments: -1 }
                            }
                        ])
                        break;

                    case "default":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: tagVideosArr }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    createdAt: 1
                                }
                            },
                            {
                                $sort: { createdAt: -1 }
                            }
                        ])
                        break;
                    case "latest":
                        relatedVideos = await ContentArchiveVideo.aggregate([
                            {
                                $match: {
                                    _id: { $in: tagVideosArr }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    createdAt: 1
                                }
                            },
                            {
                                $sort: { createdAt: -1 }
                            }
                        ])
                        break;
                }
                videosWithOrder = relatedVideos.map((videoId, index) => {
                    if (videoId && typeof videoId === "object") {
                        const singleExistsVideo = exitsVideoData.filter((existsVideo) => {
                            if (existsVideo !== null) {
                                return existsVideo.id.toString() === videoId._id.toString()
                            }
                        })
                        if (singleExistsVideo.length > 0) {
                            const obj = { id: videoId, order: index + 1, status: singleExistsVideo[0].status }
                            return obj
                        } else {
                            const obj = { id: videoId, order: index + 1 }
                            return obj
                        }
                    } else {
                        const singleExistsVideo = exitsVideoData.filter((existsVideo) => existsVideo.id.toString() === videoId.toString())
                        if (singleExistsVideo.length > 0) {
                            const obj = { id: videoId, order: index + 1, status: singleExistsVideo[0].status }
                            return obj
                        } else {
                            const obj = { id: videoId, order: index + 1 }
                            return obj
                        }
                    }

                })
                const partnerDetails = await Partner.findByIdAndUpdate(partnerId, {
                    videoIds: videosWithOrder,
                    relatedVideoSortOption: sortingOption
                }, { new: true });
                if (partnerDetails) {
                    return res.status(200).json({ status: true, message: "Videos added in partner.", data: partnerDetails });
                }

            } else {
                return res.status(200).json({ status: false, message: "partner data not found!" });
            }
        } else {
            return res.status(200).json({ status: false, message: "Input parameters are missing!", error: error });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
}