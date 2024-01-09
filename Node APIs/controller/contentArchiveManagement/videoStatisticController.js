const {
    StartTranscriptionJobCommand,
    DeleteTranscriptionJobCommand,
    GetTranscriptionJobCommand,
} = require("@aws-sdk/client-transcribe");
const { getVideoDurationInSeconds } = require("get-video-duration");
const { TranscribeClient } = require("@aws-sdk/client-transcribe");
const fs = require("fs");
const { deleteImage } = require("../../utils/mediaUpload");
const AWS = require("aws-sdk");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const ContentCategory = require("../../database/models/contentArchive_category");
const contentSubCategory = require("../../database/models/contentArchive_subcategory");
const ContentSpeaker = require("../../database/models/contentArchive_speaker");
const ContentTag = require("../../database/models/contentArchive_tag");
const ContentEvent = require("../../database/models/contentArchive_event");
const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const ContentSearch = require("../../database/models/contentArchive_search");
// const UserSpeaker = require("../database/models/airTableSync");
const Group = require("../../database/models/group");
const Dummy = require("../../database/models/dummy");
const User = require("../../database/models/airTableSync");
const { AdminUser } = require("../../database/models/adminuser");
const moment = require("moment");
const { parser } = require('html-metadata-parser');
const { forEach, sum, size, stubTrue } = require("lodash");


ffmpeg.setFfmpegPath(ffmpegPath);
var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});
const region = "us-east-2";
const credentials = {
    accessKeyId: "AKIAXHJ6XYUP43LGMXPZ",
    secretAccessKey: "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",
};

let ProcessStates = 0;

/*Video Statistic based on video*/
exports.videoStatisticTotalVideo = async (req, res) => {
    try {
        const videosCount = await ContentArchiveVideo.countDocuments({ isDelete: false, uploadstatus: { $ne: "inprocess" }, "group_ids.0": { "$exists": true } })
        return res.status(200).json({ status: true, message: `Total Videos Count.`, data: videosCount });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.videoStatisticForVideoByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');

        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }

        if (field == "views") {
            var data = []
            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        videocount: { $sum: 1 },
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                        viewdate: { $ne: null },
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        viewdate: 1,
                        viewscount: "$views",
                        videocount: 1,
                        starting_view_cnt: 1
                    },
                },
                {
                    $group: {
                        _id: { viewdate: "$viewdate", id: "$_id", starting_view_cnt: { $sum: "$starting_view_cnt" } },
                        viewscount: { $sum: "$viewscount" }
                    }
                },
                {
                    $group: {
                        _id: { viewdate: "$_id.viewdate" },
                        viewscount: { $sum: "$viewscount" }, starting_view_cnt: { $sum: "$_id.starting_view_cnt" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        viewdate: "$_id.viewdate",
                        viewscount: { $sum: "$viewscount" }
                    }
                },
                {
                    $sort: { viewdate: 1 }
                }

            ]);

            const startingViewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        videocount: { $sum: 1 },
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                        viewdate: { $ne: null },
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        viewdate: 1,
                        viewscount: "$views",
                        videocount: 1,
                        starting_view_cnt: 1
                    },
                },
                {
                    $group: {
                        _id: { id: "$_id", starting_view_cnt: { $sum: "$starting_view_cnt" } },

                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$_id.starting_view_cnt"
                        }
                    }
                },


            ]);

            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic`, data: viewData, startingView: startingViewData.length > 0 ? startingViewData[0].total : 0 });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }
        if (field == "comments") {
            var data = []
            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType === "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        videocount: { $sum: 1 },
                    }
                },
                {
                    $match: {
                        $and: [{ "commentdate": { "$ne": null } }, { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        commentdate: { $ne: null },
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        commentdate: 1,
                        commentscount: "$comments",
                        videocount: 1,

                    },
                },
                {
                    $group: {
                        _id: { commentdate: "$commentdate", id: "$_id" },
                        commentscount: { $sum: "$commentscount" }
                    }
                },
                {
                    $group: {
                        _id: { commentdate: "$_id.commentdate" },
                        commentscount: { $sum: "$commentscount" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        commentdate: "$_id.commentdate",
                        commentscount: { $sum: "$commentscount" }
                    }
                },
                {
                    $sort: { commentdate: 1 }
                }
            ]);
            if (commentsData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }


        }
        if (field == "likes") {
            var data = []
            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        videocount: { $sum: 1 },
                    }
                },
                {
                    $match: {
                        $and: [{ "likedate": { "$ne": null } }, { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        likedate: { $ne: null },
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        likedate: 1,
                        likescount: "$likes",
                        videocount: 1,

                    },
                },
                {
                    $group: {
                        _id: { likedate: "$likedate", id: "$_id" },
                        likescount: { $sum: "$likescount" }
                    }
                },
                {
                    $group: {
                        _id: { likedate: "$_id.likedate" },
                        likescount: { $sum: "$likescount" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        likedate: "$_id.likedate",
                        likescount: { $sum: "$likescount" }
                    }
                },
                {
                    $sort: { likedate: 1 }
                }

            ]);

            if (likesData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.videoStatisticVideoListByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');

        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');

        }
        const allEvents = await ContentEvent.find({ isDelete: false, name: { $ne: "others" } });
        var eventFor = ["others"];
        allEvents.forEach(async (event, key) => {
            const eventName = event.name.toLowerCase();
            eventFor.push(eventName);
        });

        if (field == "views") {
            var data = []
            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,

                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                    },

                },
                {
                    $project: {
                        _id: "$_id",
                        viewdate: 1,
                        title: 1,
                        viewscount: "$views",
                        thumbnail: 1,
                        createdAt: 1,
                        starting_view_cnt: 1,

                    },
                },
                {
                    $group: {
                        _id: { id: "$_id", title: "$title", thumbnail: "$thumbnail", createdAt: "$createdAt", starting_view_cnt: "$starting_view_cnt" },
                        viewscount: { $sum: "$viewscount" },



                    }
                },
                {
                    $project: {
                        id: "$_id.id",
                        title: "$_id.title",
                        thumbnail: "$_id.thumbnail",
                        createdAt: "$_id.createdAt",
                        viewscount: { $sum: ["$viewscount", "$_id.starting_view_cnt"] },


                    }

                }, {
                    $sort: { title: 1 }
                }

            ]);

            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video list`, data: viewData });
            } else {
                return res.status(200).json({ status: false, message: `videos Not found`, data: [] });
            }

        }

        if (field == "comments") {
            var data = []
            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },

                },

                {
                    $project: {
                        _id: "$_id",
                        commentdate: 1,
                        title: 1,
                        commentscount: "$comments",
                        thumbnail: 1,
                        createdAt: 1,

                    },
                },
                {
                    $group: {
                        _id: { id: "$_id", title: "$title", thumbnail: "$thumbnail", createdAt: "$createdAt" },
                        commentscount: { $sum: "$commentscount" },


                    }
                },
                {
                    $project: {
                        id: "$_id.id",
                        commentscount: 1,
                        title: "$_id.title",
                        thumbnail: "$_id.thumbnail",
                        createdAt: "$_id.createdAt",

                    }

                }, {
                    $sort: { title: 1 }
                }
            ]);
            if (commentsData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video list`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `videos Not found`, data: [] });
            }






        }

        if (field == "likes") {

            var data = []
            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },

                },
                {
                    $project: {
                        _id: "$_id",
                        likedate: 1,
                        title: 1,
                        likescount: "$likes",
                        thumbnail: 1,
                        createdAt: 1,


                    },
                },
                {
                    $group: {
                        _id: { id: "$_id", title: "$title", thumbnail: "$thumbnail", createdAt: "$createdAt" },
                        likescount: { $sum: "$likescount" },
                    }
                },
                {
                    $project: {
                        id: "$_id.id",
                        title: "$_id.title",
                        thumbnail: "$_id.thumbnail",
                        createdAt: "$_id.createdAt",
                        likescount: 1,


                    }

                }, {
                    $sort: { title: 1 }
                }
            ]);
            if (likesData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video list`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `videos Not found`, data: [] });
            }

        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.videoStatisticFieldCountByDateAndByForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate
        const filterType = req.query.filtertype
        var data = []
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');
        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }

        let viewData = []
        viewData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    title: "$title",
                    views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                    view_userid: "$views.view_userid",
                    viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                    starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },
            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    // eventFor: { $in: eventFor },
                    $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                },
            },
            {
                $group: {
                    _id: { id: "$_id", starting_view_cnt: "$starting_view_cnt" },
                    viewscount: { $sum: "$views" }
                }
            },
            {
                $project: {
                    _id: "$_id.id",
                    viewscount: { $sum: ["$viewscount", "$_id.starting_view_cnt"] },
                }
            },
            {
                $group: {
                    _id: null,
                    viewscount: { $sum: "$viewscount" },
                }
            },
        ]);

        let commentsData = []
        commentsData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
            {
                $lookup: {
                    from: "contentarchivecomments",
                    let: { comment_id: "$comments" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$comment_id"],
                                },
                            },
                        },
                        { $project: { _id: 1, createdAt: 1 } },
                    ],
                    as: "outcomments",
                },
            },
            { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    title: "$title",
                    comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                    comments_id: "$outcomments._id",
                    commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,

                }
            },
            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    // eventFor: { $in: eventFor },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },

            },
            {
                $group: {
                    _id: { _id: "$_id", comments: "$comments" },
                    commentscount: { $sum: "$comments" }
                }
            },

            {
                $group: {
                    _id: null,
                    commentscount: { $sum: "$commentscount" }
                }
            },
        ]);
        let likesData = []

        likesData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    title: "$title",
                    likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                    like_userid: "$likes.like_userid",
                    likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },
            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    // eventFor: { $in: eventFor },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },

            },
            {
                $group: {
                    _id: { _id: "$_id", likes: "$likes" },
                    likescount: { $sum: "$likes" }
                }
            },
            {
                $group: {
                    _id: null,
                    likescount: { $sum: "$likescount" }
                }
            },


        ]);

        data = [{
            viewscount: viewData.length > 0 ? viewData[0].viewscount : 0,
            commentscount: commentsData.length > 0 ? commentsData[0].commentscount : 0,
            likescount: likesData.length > 0 ? likesData[0].likescount : 0,
        }]
        return res.status(200).json({ status: true, message: `Videos Count.`, data: data });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.videoStatisticSingleVideoViewUsers = async (req, res) => {

    try {

        let viewData = []
        var id = req.query.id
        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');

        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');

        }

        if (field == "views") {
            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false,
                        _id: ObjectId(id),
                        "views.0": { $exists: true }
                    }
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { views: "$views" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$views.view_userid"],
                                    },
                                },
                            },
                            { $project: { _id: 1, otherdetail: 1, email: 1, createdAt: 1 } },
                        ],
                        as: "users",
                    },
                },
                {
                    $match:
                        { "users": { $ne: [] } }
                },
                {
                    $project: {
                        id: { $arrayElemAt: ["$users._id",0]},
                        email: { $arrayElemAt: ["$users.email",0] },
                        otherdetail: { $arrayElemAt: ["$users.otherdetail", 0] },
                        watched: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "watched": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "watched": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                    },
                },
                {
                    $sort: {
                        watched: 1
                    }
                }


            ]);

            const starting_data = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false,
                        _id: ObjectId(id),

                    }
                },
                {
                    $project: {
                        starting_view_cnt: 1
                    }

                }
            ])

            return res.status(200).json({ status: true, message: `View Video Users.`, data: viewData, starting_view: starting_data.length > 0 ? starting_data[0].starting_view_cnt : 0 });


        }

        if (field == "likes") {
            const likeData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false,
                        _id: ObjectId(id),
                        "likes.0": { $exists: true }
                    }
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { likes: "$likes" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$likes.like_userid"],
                                    },
                                },
                            },
                            { $project: { _id: 1, otherdetail: 1, email: 1, createdAt: 1 } },
                        ],
                        as: "users",
                    },
                },
                {
                    $match:
                        { "users": { $ne: [] } }
                },
                {
                    $project: {
                        id: { $arrayElemAt: [ "$users._id",0] },
                        email: { $arrayElemAt: ["$users.email",0]},
                        otherdetail: { $arrayElemAt: ["$users.otherdetail", 0] },
                        liked: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "liked": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "liked": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                    },
                },
                {
                    $sort: {
                        liked: 1
                    }
                }

            ]);

            return res.status(200).json({ status: true, message: `Like Video Users.`, data: likeData });
        }

        if (field == "comments") {
            const commentData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false,
                        _id: ObjectId(id),

                    }
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, userId: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { outcomments: "$outcomments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$outcomments.userId"],
                                    },
                                },
                            },
                            { $project: { _id: 1, otherdetail: 1, email: 1, createdAt: 1 } },
                        ],
                        as: "users",
                    },
                },
                {
                    $match:
                        { "users": { $ne: [] } }
                },
                {
                    $project: {
                        id: { $arrayElemAt: ["$users._id",0]},
                        email: { $arrayElemAt: ["$users.email",0]},
                        otherdetail: { $arrayElemAt: ["$users.otherdetail", 0] },
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                    },
                },
                {
                    $sort: {
                        commentdate: 1
                    }
                }

            ]);

            return res.status(200).json({ status: true, message: `Like Video Users.`, data: commentData });
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
}
/*User Statistic */
exports.statisticWatchedVideoUsers = async (req, res) => {
    try {
        const data = await User.aggregate([
            {
                $match: {
                    isDelete: false,
                    active: true

                }
            }, {
                $lookup: {
                    from: "contentarchive_videos",
                    let: { id: "$_id" },
                    pipeline: [
                        {
                            $match:
                            {
                                "isDelete": false,
                                "views.0": { $exists: true },
                                $expr: {
                                    $in: ["$$id", "$views.view_userid"],
                                },
                            }
                        }, {
                            $project: {
                                _id: 1,
                                views: {
                                    $filter: {
                                        input: "$views",
                                        as: "views",
                                        cond: { $eq: ["$$views.view_userid", "$$id"] }
                                    }
                                }
                            }
                        }
                    ],
                    as: "watchedvideos",
                },
            },
            {
                $lookup: {
                    from: "contentarchive_videos",
                    let: { id: "$_id" },
                    pipeline: [
                        {
                            $match:
                            {
                                "isDelete": false,
                                "watched_realtime.0": { $exists: true },
                                $expr: {
                                    $in: ["$$id", "$watched_realtime.userid"],
                                },

                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                watched_realtime: {
                                    $filter: {
                                        input: "$watched_realtime",
                                        as: "watched_realtime",
                                        cond: { $eq: ["$$watched_realtime.userid", "$$id"] }
                                    }
                                }
                            }
                        }

                    ],

                    as: "watchedvideo_time",
                },
            },

            {
                $project: {
                    id: "$_id",
                    otherdetail: 1,
                    noofvideos: { $size: "$watchedvideos" },
                    watched_time: {
                        $map: {
                            input: "$watchedvideo_time.watched_realtime",
                            as: "watchtime",
                            in: { $arrayElemAt: ["$$watchtime.watch_realduration", 0] }
                        }
                    }

                }
            },

        ])
        return res.status(200).json({ status: true, message: `View Video Users.`, data: data });

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
}
exports.statisticAllWatchedVideosByUserId = async (req, res) => {
    try {
        const userId = req.query.id
        const data = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false,

                    $expr: {
                        $in: [ObjectId(userId), "$views.view_userid"]

                    },


                }
            }, {
                $project:
                {
                    id: "$_id",
                    title: 1,
                    views: 1,
                    watched_realtime: 1,
                }
            },
            {
                $sort: {
                    title: 1
                }
            }


        ])
        return res.status(200).json({ status: true, message: `Watched Video list.`, data: data });

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
}
/*Statistic based on category*/
exports.CategoryStatisticTotalCategories = async (req, res) => {
    try {
        const count_ = await ContentCategory.countDocuments({ isDelete: false })
        return res.status(200).json({ status: true, message: `Total Categories Count.`, data: count_ });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticForCategoryByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate
        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');

        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }
        if (field == "views") {
            var data = []
            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $lookup: {
                        from: "contentarchive_categories",
                        let: { categories: "$categories" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$categories"],
                                    },
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "categories",
                    },
                },
                {
                    $unwind: "$categories"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        category_id: "$categories._id",
                        category_name: "$categories.name",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [{ "viewdate": { "$ne": null } }, { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],

                    },
                },
                {
                    $project: {
                        category_id: "$category_id",
                        category_name: "$category_name",
                        viewdate: 1,
                        viewscount: "$views",
                    },
                },
                {
                    $group: {
                        _id: { viewdate: "$viewdate", videocount: { $sum: 1 } },
                        viewscount: { $sum: "$viewscount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        viewdate: "$_id.viewdate",
                        uploadstatus: 1,
                        viewscount: 1,
                        videocount: "$_id.videocount",
                    }
                },
                {
                    $sort: { viewdate: 1 }
                }
            ]);

            const startingViewData = await ContentArchiveVideo.aggregate([
                {
                    $lookup: {
                        from: "contentarchive_categories",
                        let: { categories: "$categories" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$categories"],
                                    },
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "categories",
                    },
                },
                {
                    $unwind: "$categories"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        category_id: "$categories._id",
                        category_name: "$categories.name",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        starting_view_cnt: 1
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [{ "viewdate": { "$ne": null } }, { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        viewdate: 1,
                        viewscount: "$views",
                        videocount: 1,
                        starting_view_cnt: 1
                    },
                },
                {
                    $group: {
                        _id: { id: "$_id", starting_view_cnt: { $sum: "$starting_view_cnt" } },

                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$_id.starting_view_cnt"
                        }
                    }
                },


            ]);

            if (viewData.length > 0) {

                return res.status(200).json({ status: true, message: `category statistic chart data`, data: viewData, startingView: startingViewData.length > 0 ? startingViewData[0].total : 0 });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }


        }

        if (field == "comments") {

            var data = []

            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $lookup: {
                        from: "contentarchive_categories",
                        let: { categories: "$categories" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$categories"],
                                    },
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "categories",
                    },
                },
                {
                    $unwind: "$categories"
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        category_id: "$categories._id",
                        category_name: "$categories.name",
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },

                {
                    $match: {
                        $and: [{ "commentdate": { "$ne": null } }, { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        category_id: "$category_id",
                        category_name: "$category_name",
                        commentdate: 1,
                        commentscount: {
                            $sum: "$comments",
                        },
                    },
                },
                {
                    $group: {
                        _id: { commentdate: "$commentdate", videocount: { $sum: 1 } },
                        commentscount: { $sum: "$commentscount" },
                    }
                },
                {
                    $project: {
                        commentdate: "$_id.commentdate",
                        commentscount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        commentdate: 1
                    }
                }

            ]);


            if (commentsData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }

        if (field == "likes") {
            var data = []

            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $lookup: {
                        from: "contentarchive_categories",
                        let: { categories: "$categories" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$categories"],
                                    },
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "categories",
                    },
                },
                {
                    $unwind: "$categories"
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        category_id: "$categories._id",
                        category_name: "$categories.name",
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        $and: [{ "likedate": { "$ne": null } }, { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                    },

                },
                {
                    $project: {
                        _id: "$_id",
                        category_id: "$category_id",
                        category_name: "$category_name",
                        likedate: 1,
                        likescount: {
                            $sum: "$likes",
                        },
                    },
                },
                {
                    $group: {
                        _id: { likedate: "$likedate", videocount: { $sum: 1 } },
                        likescount: { $sum: "$likescount" },
                    }
                },
                {
                    $project: {
                        likedate: "$_id.likedate",
                        likescount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: { likedate: 1 }
                }

            ]);


            if (likesData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticCategoryListByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype
        const field = req.query.field

        var addFilterCount = 0

        if (filterType == "first24hrs") {
            addFilterCount = 1

        }
        if (filterType == "past7days") {
            addFilterCount = 6

        }
        if (filterType == "past28days") {
            addFilterCount = 27

        }
        if (filterType == "past90days") {
            addFilterCount = 89

        }
        if (filterType == "past365days") {
            addFilterCount = 364

        }

        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');

        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');

        }


        if (field == "views") {
            var data = []

            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_categories",
                        let: { categories: "$categories" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$categories"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { name: 1, subcategory: 1 } },
                        ],
                        as: "categories",
                    },
                },
                { $unwind: "$categories" },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        category_id: "$categories._id",
                        category_name: "$categories.name",

                        subcategorycount: { $cond: [{ $ifNull: ["$categories.subcategory", false] }, { $size: "$categories.subcategory" }, 0] },
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        category_id: { $ne: null },
                        uploadstatus: { $ne: "inprocess" },
                        // eventFor: { $in: eventFor },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },

                },
                {
                    $project: {
                        _id: "$_id",
                        category_id: "$category_id",
                        category_name: "$category_name",
                        subcategorycount: 1,
                        viewdate: 1,
                        title: 1,
                        views: "$views",
                        thumbnail: 1,
                        createdAt: 1,
                        starting_view_cnt: 1,
                    },
                },


                {
                    $group: {
                        _id: { category_id: "$category_id", category_name: "$category_name", id: "$_id", videocount: { $sum: 1 }, subcategorycount: "$subcategorycount", starting_view_cnt: "$starting_view_cnt" },
                        viewscount: { $sum: "$views" },


                    }
                },
                {
                    $group: {
                        _id: { category_id: "$_id.category_id", category_name: "$_id.category_name", subcategorycount: "$_id.subcategorycount" },
                        viewscount: { $sum: "$viewscount" },
                        videocount: { $sum: "$_id.videocount" },
                        starting_view_cnt: { $sum: "$_id.starting_view_cnt" }
                    }
                },

                {
                    $project: {
                        _id: 0,
                        category_id: "$_id.category_id",
                        category_name: "$_id.category_name",
                        viewscount: { $sum: ["$viewscount", "$starting_view_cnt"] },
                        videocount: "$videocount",
                        subcategorycount: "$_id.subcategorycount"
                    }
                }
                , {
                    $sort: {
                        category_name: 1
                    }
                }

            ]);

            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video list`, data: viewData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }



        }

        if (field == "comments") {

            var data = []


            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_categories",
                        let: { categories: "$categories" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$categories"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "categories",
                    },
                },

                {
                    $unwind: "$categories"
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        category_id: "$categories._id",
                        category_name: "$categories.name",
                        subcategorycount: { $cond: [{ $ifNull: ["$categories.subcategory", false] }, { $size: "$categories.subcategory" }, 0] },
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {


                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },

                },

                {
                    $project: {
                        _id: "$_id",
                        commentdate: 1,
                        title: 1,
                        category_id: "$category_id",
                        category_name: "$category_name",
                        subcategorycount: 1,
                        commentscount: "$comments",
                        thumbnail: 1,
                        createdAt: 1,

                    },
                },
                {
                    $group: {
                        _id: { category_id: "$category_id", category_name: "$category_name", id: "$_id", videocount: { $sum: 1 }, subcategorycount: "$subcategorycount", starting_view_cnt: "$starting_view_cnt" },
                        commentscount: { $sum: "$commentscount" },


                    }
                },
                {
                    $group: {
                        _id: { category_id: "$_id.category_id", category_name: "$_id.category_name", subcategorycount: "$_id.subcategorycount" },
                        commentscount: { $sum: "$commentscount" },
                        videocount: { $sum: "$_id.videocount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category_id: "$_id.category_id",
                        category_name: "$_id.category_name",
                        commentscount: 1,
                        subcategorycount: "$_id.subcategorycount",
                        videocount: "$videocount"
                    }
                }, {
                    $sort: {
                        category_name: 1
                    }
                }

            ]);


            if (commentsData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video lsit`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }




        }

        if (field == "likes") {

            var data = []

            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_categories",
                        let: { categories: "$categories" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$categories"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "categories",
                    },
                },
                {
                    $unwind: "$categories"
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        category_id: "$categories._id",
                        category_name: "$categories.name",
                        subcategorycount: { $cond: [{ $ifNull: ["$categories.subcategory", false] }, { $size: "$categories.subcategory" }, 0] },
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        category_id: { $ne: null },
                        uploadstatus: { $ne: "inprocess" },
                        // eventFor: { $in: eventFor },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },

                },
                {
                    $project: {
                        _id: "$_id",
                        likedate: 1,
                        title: 1,
                        category_id: "$category_id",
                        category_name: "$category_name",
                        subcategorycount: 1,
                        likescount: "$likes",
                        thumbnail: 1,
                        createdAt: 1,
                    },
                },
                {
                    $group: {
                        _id: { category_id: "$category_id", category_name: "$category_name", id: "$_id", videocount: { $sum: 1 }, subcategorycount: "$subcategorycount", starting_view_cnt: "$starting_view_cnt" },
                        likescount: { $sum: "$likescount" },


                    }
                },
                {
                    $group: {
                        _id: { category_id: "$_id.category_id", category_name: "$_id.category_name", subcategorycount: "$_id.subcategorycount" },
                        likescount: { $sum: "$likescount" },
                        videocount: { $sum: "$_id.videocount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category_id: "$_id.category_id",
                        category_name: "$_id.category_name",
                        subcategorycount: "$_id.subcategorycount",
                        likescount: 1,
                        videocount: 1
                    }

                }, {
                    $sort: {
                        category_name: 1
                    }
                }

            ]);

            if (likesData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video lsit`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticCategoryCountByDateAndByForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype

        var data = []
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');
        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }
        const viewData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "contentarchive_categories",
                    let: { categories: "$categories" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$categories"],
                                },
                                isDelete: false
                            },
                        },
                        { $project: { name: 1 } },
                    ],
                    as: "categories",
                },
            },
            { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    categories: 1,
                    views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                    view_userid: "$views.view_userid",
                    viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                    starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },
            {
                $match: {

                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },
            {
                $group: {
                    _id: { _id: "$_id", views: "$views", starting_view_cnt: "$starting_view_cnt" },
                    viewscount: { $sum: "$views" }
                }
            },

            {
                $project: {
                    _id: "$_id.id",
                    viewscount: { $sum: ["$viewscount", "$_id.starting_view_cnt"] },
                }
            },
            {
                $group: {
                    _id: null,
                    viewscount: { $sum: "$viewscount" },
                }
            },
        ]);
        const commentsData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "contentarchive_categories",
                    let: { categories: "$categories" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$categories"],
                                },
                                isDelete: false
                            },
                        },
                        { $project: { name: 1 } },
                    ],
                    as: "categories",
                },
            },
            { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
            {
                $lookup: {
                    from: "contentarchivecomments",
                    let: { comment_id: "$comments" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$comment_id"],
                                },
                                isDelete: false
                            },
                        },
                        { $project: { _id: 1, createdAt: 1 } },
                    ],
                    as: "outcomments",
                },
            },
            { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    id: "$_id",
                    categories: 1,
                    comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                    comments_id: "$outcomments._id",
                    commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },
            {
                $match: {
                    categories: { $ne: [] },
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                },

            },

            {
                $group: {
                    _id: { _id: "$_id", comments: "$comments" },
                    commentscount: { $sum: "$comments" }
                }
            },

            {
                $group: {
                    _id: null,
                    commentscount: { $sum: "$commentscount" }
                }
            },
        ]);
        const likesData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "contentarchive_categories",
                    let: { categories: "$categories" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$categories"],
                                },
                                isDelete: false
                            },
                        },
                        { $project: { name: 1 } },
                    ],
                    as: "categories",
                },
            },
            { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    categories: 1,
                    likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                    like_userid: "$likes.like_userid",
                    likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },

            {
                $match: {
                    categories: { $ne: [] },

                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                },

            },
            {
                $group: {
                    _id: { _id: "$_id", likes: "$likes" },
                    likescount: { $sum: "$likes" }
                }
            },
            {
                $group: {
                    _id: null,
                    likescount: { $sum: "$likescount" }
                }
            },
        ]);


        data = [{
            viewscount: viewData.length > 0 ? viewData[0].viewscount : 0,
            commentscount: commentsData.length > 0 ? commentsData[0].commentscount : 0,
            likescount: likesData.length > 0 ? likesData[0].likescount : 0,


        }]
        return res.status(200).json({ status: true, message: `Videos Count.`, data: data });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
/*Statistic based on Tag*/
exports.TagStatisticTotalTags = async (req, res) => {
    try {
        const count_ = await ContentTag.countDocuments({ isDelete: false })
        return res.status(200).json({ status: true, message: `Total Tags Count.`, data: count_ });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticForTagByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate
        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0

        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }

        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');
        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }

        if (field == "views") {

            var data = []
            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $unwind: { path: "$tag", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "contentarchive_tags",
                        let: { tagId: "$tag" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$tagId"],
                                    },
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "tags",
                    },
                },
                {
                    $unwind: "$tags"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        tag_id: "$tags._id",
                        tag_name: "$tags.name",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },

                    }
                },
                {
                    $match: {
                        $and: [{ "viewdate": { "$ne": null } }, { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],

                    },
                },
                {
                    $project: {
                        tag_id: "$tag_id",
                        tag_name: "$tag_name",
                        viewdate: 1,
                        viewscount: "$views",
                    },
                },
                {
                    $group: {
                        _id: { viewdate: "$viewdate", videocount: { $sum: 1 } },
                        viewscount: { $sum: "$viewscount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        viewdate: "$_id.viewdate",
                        viewscount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: { viewdate: 1 }
                }
            ]);

            const startingViewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $unwind: { path: "$tag", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "contentarchive_tags",
                        let: { tagId: "$tag" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$tagId"],
                                    },
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "tags",
                    },
                },
                {
                    $unwind: "$tags"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        tag_id: "$tags._id",
                        tag_name: "$tags.name",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        starting_view_cnt: 1
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [{ "viewdate": { "$ne": null } }, { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        viewdate: 1,
                        viewscount: "$views",
                        videocount: 1,
                        starting_view_cnt: 1
                    },
                },
                {
                    $group: {
                        _id: { id: "$_id", starting_view_cnt: { $sum: "$starting_view_cnt" } },

                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$_id.starting_view_cnt"
                        }
                    }
                },


            ]);

            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic`, data: viewData, startingView: startingViewData.length > 0 ? startingViewData[0].total : 0 });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }


        }

        if (field == "comments") {

            var data = []

            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $unwind: { path: "$tag", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "contentarchive_tags",
                        let: { tagId: "$tag" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$tagId"],
                                    },
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "tags",
                    },
                },

                {
                    $unwind: { path: "$tags", "preserveNullAndEmptyArrays": true }
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        tag_id: "$tags._id",
                        tag_name: "$tags.name",
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },

                    }
                },

                {
                    $match: {
                        $and: [{ "commentdate": { "$ne": null } }, { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }]

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        tag_id: "$tag_id",
                        tag_name: "$tag_name",
                        commentdate: 1,
                        commentscount: {
                            $sum: "$comments",
                        },
                    },
                },
                {
                    $group: {
                        _id: { commentdate: "$commentdate", videocount: { $sum: 1 } },
                        commentscount: { $sum: "$commentscount" },
                    }
                },
                {
                    $project: {
                        commentdate: "$_id.commentdate",
                        commentscount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        commentdate: 1
                    }
                }

            ]);

            var final = []

            if (commentsData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }

        if (field == "likes") {
            var data = []

            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $unwind: { path: "$tag", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "contentarchive_tags",
                        let: { tagId: "$tag" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$tagId"],
                                    },
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "tags",
                    },
                },

                {
                    $unwind: { path: "$tags", "preserveNullAndEmptyArrays": true }
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        tag_id: "$tags._id",
                        tag_name: "$tags.name",
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                    }
                },
                {
                    $match: {
                        $and: [{ "likedate": { "$ne": null } }, { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        tag_id: "$tag_id",
                        tag_name: "$tag_name",
                        likedate: 1,
                        likescount: {
                            $sum: "$likes",
                        },
                    },
                },
                {
                    $group: {
                        _id: { likedate: "$likedate", videocount: { $sum: 1 } },
                        likescount: { $sum: "$likescount" },
                    }
                },
                {
                    $project: {
                        likedate: "$_id.likedate",
                        likescount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        likedate: 1
                    }
                }

            ]);



            if (likesData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticTagListByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate
        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');
        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }
        if (field == "views") {

            let viewData = []
            var data = []
            viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },

                {
                    $lookup: {
                        from: "contentarchive_tags",
                        localField: "tag",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $match: {
                                    isDelete: false
                                }
                            }
                        ],
                        as: "tags",
                    },
                },

                {
                    $unwind: "$tags"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        tag_id: "$tags._id",
                        tag_name: "$tags.name",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        videocount: { $sum: 1 },
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,

                    }
                },
                {
                    $match: {
                        tag_id: { $ne: null },
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        tag_id: "$tag_id",
                        tag_name: "$tag_name",
                        viewdate: 1,
                        title: 1,
                        views: "$views",
                        thumbnail: 1,
                        createdAt: 1,
                        starting_view_cnt: 1,
                        videocount: 1
                    },
                },
                {
                    $group: {
                        _id: { tag_id: "$tag_id", tag_name: "$tag_name", id: "$_id", videocount: "$videocount", starting_view_cnt: "$starting_view_cnt" },
                        viewscount: { $sum: "$views" },


                    }
                },
                {
                    $group: {
                        _id: { tag_id: "$_id.tag_id", tag_name: "$_id.tag_name" },
                        viewscount: { $sum: "$viewscount" },
                        videocount: { $sum: "$_id.videocount" },
                        starting_view_cnt: { $sum: "$_id.starting_view_cnt" }
                    }
                },

                {
                    $project: {
                        _id: 0,
                        tag_id: "$_id.tag_id",
                        tag_name: "$_id.tag_name",
                        viewscount: { $sum: ["$viewscount", "$starting_view_cnt"] },
                        videocount: "$videocount",

                    }
                }
                , {
                    $sort: {
                        tag_name: 1
                    }
                }



            ]);

            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video list`, data: viewData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }

        }

        if (field == "comments") {

            var data = []
            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_tags",
                        localField: "tag",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $match: {
                                    isDelete: false
                                }
                            }
                        ],
                        as: "tags",
                    },
                },

                {
                    $unwind: "$tags"
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        tag_id: "$tags._id",
                        tag_name: "$tags.name",
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        videocount: { $sum: 1 },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,

                    }
                },

                {
                    $match: {
                        tag_id: { $ne: null },
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        commentdate: 1,
                        title: 1,
                        tag_id: "$tag_id",
                        tag_name: "$tag_name",
                        commentscount: "$comments",
                        thumbnail: 1,
                        createdAt: 1,
                        videocount: { $sum: 1 },
                    },
                },
                {
                    $group: {
                        _id: { tag_id: "$tag_id", tag_name: "$tag_name", id: "$_id", videocount: "$videocount" },
                        commentscount: { $sum: "$commentscount" },


                    }
                },
                {
                    $group: {
                        _id: { tag_id: "$_id.tag_id", tag_name: "$_id.tag_name" },
                        commentscount: { $sum: "$commentscount" },
                        videocount: { $sum: "$_id.videocount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        tag_id: "$_id.tag_id",
                        tag_name: "$_id.tag_name",
                        commentscount: 1,
                        videocount: "$videocount"
                    }
                }, {
                    $sort: {
                        tag_name: 1
                    }
                }


            ]);
            if (commentsData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video lsit`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }


        }

        if (field == "likes") {

            var data = []
            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $unwind: { path: "$tag", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "contentarchive_tags",
                        localField: "tag",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $match: {
                                    isDelete: false
                                }
                            }
                        ],
                        as: "tags",
                    },
                },

                {
                    $unwind: "$tags"
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        tag_id: "$tags._id",
                        tag_name: "$tags.name",
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        videocount: { $sum: 1 },

                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },

                {
                    $match: {
                        tag_id: { $ne: null },
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },
                },

                {
                    $project: {
                        _id: "$_id",
                        likedate: 1,
                        title: 1,
                        tag_id: "$tag_id",
                        tag_name: "$tag_name",
                        likes: "$likes",
                        thumbnail: 1,
                        createdAt: 1,
                        videocount: { $sum: 1 },
                    },
                },
                {
                    $group: {
                        _id: { tag_id: "$tag_id", tag_name: "$tag_name", id: "$_id", videocount: "$videocount" },
                        likescount: { $sum: "$likes" },


                    }
                },
                {
                    $group: {
                        _id: { tag_id: "$_id.tag_id", tag_name: "$_id.tag_name" },
                        likescount: { $sum: "$likescount" },
                        videocount: { $sum: "$_id.videocount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        tag_id: "$_id.tag_id",
                        tag_name: "$_id.tag_name",
                        likescount: 1,
                        videocount: "$videocount"
                    }
                }, {
                    $sort: {
                        tag_name: 1
                    }
                }



            ]);

            if (likesData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video lsit`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticTagCountByDateAndByForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate
        const filterType = req.query.filtertype
        var data = []
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27

        }
        if (filterType == "past90days") {
            addFilterCount = 89

        }
        if (filterType == "past365days") {
            addFilterCount = 364

        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');

        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }
        const viewData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "contentarchive_tags",
                    localField: "tag",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $match: {
                                isDelete: false
                            }
                        }
                    ],
                    as: "tags",
                },
            },
            {
                $match: {
                    tags: { $ne: [] },
                }
            },
            { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    tag: 1,
                    views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                    view_userid: "$views.view_userid",
                    viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                    starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },


            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },

            {
                $group: {
                    _id: { _id: "$_id", views: "$views", starting_view_cnt: "$starting_view_cnt" },
                    viewscount: { $sum: "$views" }
                }
            },

            {
                $project: {
                    _id: "$_id.id",
                    viewscount: { $sum: ["$viewscount", "$_id.starting_view_cnt"] },


                }
            },

            {
                $group: {
                    _id: null,
                    viewscount: { $sum: "$viewscount" },


                }
            },





        ]);
        const commentsData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },

            {
                $lookup: {
                    from: "contentarchive_tags",
                    localField: "tag",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $match: {
                                isDelete: false
                            }
                        }
                    ],
                    as: "tags",
                },
            },
            {
                $match: {
                    tags: { $ne: [] },
                }
            },

            { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
            {
                $lookup: {
                    from: "contentarchivecomments",
                    let: { comment_id: "$comments" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$comment_id"],
                                },
                            },
                        },
                        { $project: { _id: 1, createdAt: 1 } },
                    ],
                    as: "outcomments",
                },
            },
            { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    tag: 1,

                    comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                    comments_id: "$outcomments._id",
                    commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },
            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },



            {
                $group: {
                    _id: { _id: "$_id", comments: "$comments" },
                    commentscount: { $sum: "$comments" }
                }
            },

            {
                $group: {
                    _id: null,
                    commentscount: { $sum: "$commentscount" }
                }
            },




        ]);
        const likesData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "contentarchive_tags",
                    localField: "tag",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $match: {
                                isDelete: false
                            }
                        }
                    ],
                    as: "tags",
                },
            },
            {
                $match: {
                    tags: { $ne: [] },
                }
            },


            { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    tag: 1,
                    likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                    like_userid: "$likes.like_userid",
                    likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },

            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },



            {
                $group: {
                    _id: { _id: "$_id", likes: "$likes" },
                    likescount: { $sum: "$likes" }
                }
            },
            {
                $group: {
                    _id: null,
                    likescount: { $sum: "$likescount" }
                }
            },
        ]);

        data = [{
            viewscount: viewData.length > 0 ? viewData[0].viewscount : 0,
            commentscount: commentsData !== undefined && commentsData.length > 0 ? commentsData[0].commentscount : 0,
            likescount: likesData !== undefined && likesData.length > 0 ? likesData[0].likescount : 0,

        }]
        return res.status(200).json({ status: true, message: `Tag Count Data.`, data: data });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
/*Statistic based on Speaker*/
exports.SpeakerStatisticTotalSpeakers = async (req, res) => {
    try {
        const speakersList = await User.aggregate([

            {
                $match: {
                    isDelete: false,

                }
            }, {
                $lookup: {
                    from: "contentarchive_videos",
                    let: { id: "$_id" },
                    pipeline: [
                        {
                            $match:
                            {
                                uploadstatus: { $ne: "inprocess" },
                                "group_ids.0": { $exists: true },
                                "isDelete": false,
                                "speaker.0": { $exists: true },
                                $expr: {
                                    $in: ["$$id", "$speaker"],
                                },
                            }
                        }, {
                            $project: {
                                _id: 1,

                            }
                        }
                    ],
                    as: "speakers",
                },
            }, {
                $project: {
                    speakers: 1,
                    count: { $sum: 1 }
                }
            }
            , {
                $match: {
                    "speakers.0": { $exists: true }
                }
            }

        ])

        return res.status(200).json({ status: true, message: `Total Speakers Count.`, data: speakersList.length });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

exports.statisticForSpeakerByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate
        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0

        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }

        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');
        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }

        if (field == "views") {

            var data = []
            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false,
                        "speaker.0": { $exists: true }
                    }
                },
                {
                    $unwind: { path: "$speaker", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { speaker: "$speaker" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$speaker"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { otherdetail: 1, attendeeDetail: 1, "Preferred Email": 1 } },
                        ],
                        as: "speakers",
                    },
                },
                {
                    $unwind: "$speakers"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        speaker_id: `$speakers._id`,
                        speaker_name: { $cond: [{ $eq: [`$speakers.otherdetail[${process.env.USER_FN_ID}]`, null] }, "$speakers.attendeeDetail.firstname", `$speakers.otherdetail[${process.env.USER_FN_ID}]`] },
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        $and: [{ "viewdate": { "$ne": null } }, { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                    },
                },
                {
                    $project: {
                        speaker_id: "$speaker_id",
                        speaker_name: "$speaker_name",
                        viewdate: 1,
                        viewscount: "$views",
                    },
                },
                {
                    $group: {
                        _id: { viewdate: "$viewdate", videocount: { $sum: 1 } },
                        viewscount: { $sum: "$viewscount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        viewdate: "$_id.viewdate",
                        viewscount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        viewdate: 1
                    }
                }
            ]);

            const startingViewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false,
                        "speaker.0": { $exists: true }
                    }
                },
                {
                    $unwind: { path: "$speaker", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { speaker: "$speaker" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$speaker"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { otherdetail: 1, "Preferred Email": 1 } },
                        ],
                        as: "speakers",
                    },
                },
                {
                    $unwind: "$speakers"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },

                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        speaker_id: "$speakers._id",
                        speaker_name: `$speakers.otherdetail[${process.env.USER_FN_ID}]`,
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        starting_view_cnt: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [{ "viewdate": { "$ne": null } }, { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        viewdate: 1,
                        viewscount: "$views",
                        videocount: 1,
                        starting_view_cnt: 1
                    },
                },
                {
                    $group: {
                        _id: { id: "$_id", starting_view_cnt: { $sum: "$starting_view_cnt" } },

                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$_id.starting_view_cnt"
                        }
                    }
                },


            ]);

            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic`, data: viewData, startingView: startingViewData.length > 0 ? startingViewData[0].total : 0 });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }



        }

        if (field == "comments") {
            var data = []
            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $unwind: { path: "$speaker", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { speaker: "$speaker" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$speaker"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { otherdetail: 1, "Preferred Email": 1 } },
                        ],
                        as: "speakers",
                    },
                },
                {
                    $unwind: "$speakers"
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        speaker_id: "$speakers._id",
                        speaker_name: `$speakers.otherdetail[${process.env.USER_FN_ID}]`,
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },

                    }
                },

                {
                    $match: {
                        $and: [{ "commentdate": { "$ne": null } }, { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }]

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        speaker_id: "$speaker_id",
                        speaker_name: "$speaker_name",
                        commentdate: 1,
                        commentscount: {
                            $sum: "$comments",
                        },
                    },
                },
                {
                    $group: {
                        _id: { commentdate: "$commentdate", videocount: { $sum: 1 } },
                        commentscount: { $sum: "$commentscount" },
                    }
                },
                {
                    $project: {
                        commentdate: "$_id.commentdate",
                        commentscount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        commentdate: 1
                    }
                }

            ]);

            if (commentsData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }

        if (field == "likes") {
            var data = []
            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $unwind: { path: "$speaker", "preserveNullAndEmptyArrays": true }
                },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { speaker: "$speaker" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$speaker"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { otherdetail: 1, "Preferred Email": 1 } },
                        ],
                        as: "speakers",
                    },
                },
                {
                    $unwind: "$speakers"
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        speaker_id: "$speakers._id",
                        speaker_name: `$speakers.otherdetail[${process.env.USER_FN_ID}]`,
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                    }
                },
                {
                    $match: {
                        $and: [{ "likedate": { "$ne": null } }, { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        speaker_id: "$speaker_id",
                        speaker_name: "$speaker_name",
                        likedate: 1,
                        likescount: {
                            $sum: "$likes",
                        },
                    },
                },
                {
                    $group: {
                        _id: { likedate: "$likedate", videocount: { $sum: 1 } },
                        likescount: { $sum: "$likescount" },
                    }
                },
                {
                    $project: {
                        likedate: "$_id.likedate",
                        likescount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        likedate: 1
                    }
                }

            ]);


            if (likesData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

exports.statisticSpeakerListByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');
        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }
        if (field == "views") {
            var data = []
            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        // speaker : {$ne: []},
                        "speaker.0": { $exists: true },
                        isDelete: false

                    }
                },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { speaker: "$speaker" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$speaker"],
                                    },
                                    isDelete: false
                                },
                            },
                            {
                                $project: {
                                    otherdetail: 1,
                                    speakername: {
                                        $cond: [
                                            {
                                                "$ifNull": ["$otherdetail", false]
                                            },
                                            `$otherdetail[${process.env.USER_FN_ID}] ` + `$otherdetail[${process.env.USER_LN_ID}]`, `$attendeeDetail.name`
                                        ]
                                    },
                                    attendeeDetail: 1, "Preferred Email": 1
                                }
                            },
                        ],
                        as: "speakers",
                    },
                },
                {
                    $unwind: "$speakers"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        speaker_id: "$speakers._id",
                        speaker_name: "$speakers.speakername",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        uploadstatus: 1,
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                        groupid_: { $size: "$group_ids" },

                    }
                },
                {
                    $match: {
                        speaker_id: { $ne: null },
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        speaker_id: "$speaker_id",
                        speaker_name: "$speaker_name",
                        viewdate: 1,
                        title: 1,
                        views: "$views",
                        thumbnail: 1,
                        createdAt: 1,
                        starting_view_cnt: 1,

                    },
                },
                {
                    $group: {
                        _id: { speaker_id: "$speaker_id", speaker_name: "$speaker_name", id: "$_id", videocount: { $sum: 1 }, starting_view_cnt: "$starting_view_cnt" },
                        viewscount: { $sum: "$views" },


                    }
                },
                {
                    $group: {
                        _id: { speaker_id: "$_id.speaker_id", speaker_name: "$_id.speaker_name" },
                        viewscount: { $sum: "$viewscount" },
                        videocount: { $sum: "$_id.videocount" },
                        starting_view_cnt: { $sum: "$_id.starting_view_cnt" }
                    }
                },

                {
                    $project: {
                        _id: 0,
                        speaker_id: "$_id.speaker_id",
                        speaker_name: "$_id.speaker_name",
                        viewscount: { $sum: ["$viewscount", "$starting_view_cnt"] },
                        videocount: "$videocount",

                    }
                }
                , {
                    $sort: {
                        speaker_name: 1
                    }
                },
            ]);
            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video list`, data: viewData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }

        }

        if (field == "comments") {
            var data = []
            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        "speaker.0": { $exists: true },
                        isDelete: false

                    }
                },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { speaker: "$speaker" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$speaker"],
                                    },
                                    isDelete: false
                                },
                            },
                            {
                                $project: {
                                    otherdetail: 1, speakername: {
                                        $cond: [
                                            {
                                                "$ifNull": ["$otherdetail", false]
                                            },
                                            `$otherdetail[${process.env.USER_FN_ID}] ` + `$otherdetail[${process.env.USER_LN_ID}]`, `$attendeeDetail.name`
                                        ]
                                    },
                                    "Preferred Email": 1
                                }
                            },
                        ],
                        as: "speakers",
                    },
                },
                {
                    $unwind: "$speakers"
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        speaker_id: "$speakers._id",
                        speaker_name: `$speakers.speakername`,
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        videocount: { $sum: 1 },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },
                },

                {
                    $project: {
                        _id: "$_id",
                        commentdate: 1,
                        title: 1,
                        speaker_id: "$speaker_id",
                        speaker_name: "$speaker_name",
                        commentscount: "$comments",
                        thumbnail: 1,
                        createdAt: 1,
                        videocount: 1,

                    },
                },
                {
                    $group: {
                        _id: { speaker_id: "$speaker_id", speaker_name: "$speaker_name", id: "$_id", videocount: "$videocount" },
                        commentscount: { $sum: "$commentscount" },


                    }
                },
                {
                    $group: {
                        _id: { speaker_id: "$_id.speaker_id", speaker_name: "$_id.speaker_name" },
                        commentscount: { $sum: "$commentscount" },
                        videocount: { $sum: "$_id.videocount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        speaker_id: "$_id.speaker_id",
                        speaker_name: "$_id.speaker_name",
                        commentscount: 1,
                        videocount: "$videocount"
                    }
                }, {
                    $sort: {
                        speaker_name: 1
                    }
                }

            ]);
            if (commentsData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video lsit`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }

        }

        if (field == "likes") {
            var data = []
            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        "speaker.0": { $exists: true },
                        isDelete: false

                    }
                },
                {
                    $lookup: {
                        from: "airtable-syncs",
                        let: { speaker: "$speaker" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$_id", "$$speaker"],
                                    },
                                    isDelete: false
                                },
                            },
                            {
                                $project: {
                                    otherdetail: 1, speakername: {
                                        $cond: [
                                            {
                                                "$ifNull": ["$otherdetail", false]
                                            },
                                            `$otherdetail[${process.env.USER_FN_ID}] ` + `$otherdetail[${process.env.USER_LN_ID}]`, `$attendeeDetail.name`
                                        ]
                                    }, "Preferred Email": 1
                                }
                            },
                        ],
                        as: "speakers",
                    },
                },
                {
                    $unwind: "$speakers"
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        speaker_id: "$speakers._id",
                        speaker_name: `$speakers.speakername`,
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        videocount: { $sum: 1 },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        likedate: 1,
                        title: 1,
                        speaker_id: "$speaker_id",
                        speaker_name: "$speaker_name",
                        likescount: "$likes",
                        thumbnail: 1,
                        createdAt: 1,
                        videocount: 1
                    },
                },
                {
                    $group: {
                        _id: { speaker_id: "$speaker_id", speaker_name: "$speaker_name", id: "$_id", videocount: "$videocount" },
                        likescount: { $sum: "$likescount" },
                    }
                },
                {
                    $group: {
                        _id: { speaker_id: "$_id.speaker_id", speaker_name: "$_id.speaker_name" },
                        likescount: { $sum: "$likescount" },
                        videocount: { $sum: "$_id.videocount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        speaker_id: "$_id.speaker_id",
                        speaker_name: "$_id.speaker_name",
                        likescount: 1,
                        videocount: 1
                    }

                }, {
                    $sort: {
                        speaker_name: 1
                    }
                }

            ]);



            if (likesData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video lsit`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

exports.statisticSpeakerCountByDateAndByForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype

        var data = []
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');

        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }
        const viewData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    // speaker : {$ne: []},
                    "speaker.0": { $exists: true },
                    isDelete: false

                }
            },
            {
                $lookup: {
                    from: "airtable-syncs",
                    let: { speaker: "$speaker" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$speaker"],
                                },
                                isDelete: false
                            },
                        },
                        { $project: { otherdetail: 1, "Preferred Email": 1 } },
                    ],
                    as: "speakers",
                },
            },

            { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                    view_userid: "$views.view_userid",
                    viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                    starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                    videocount: { $sum: 1 },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },

            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],
                },
            },
            {
                $group: {
                    _id: { _id: "$_id", views: "$views", starting_view_cnt: "$starting_view_cnt" },
                    viewscount: { $sum: "$views" }
                }
            },
            {
                $project: {
                    _id: "$_id.id",
                    viewscount: { $sum: ["$viewscount", "$_id.starting_view_cnt"] },


                }
            },
            {
                $group: {
                    _id: null,
                    viewscount: { $sum: "$viewscount" },


                }
            },

        ]);

        const commentsData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    //speaker : {$ne: []},
                    "speaker.0": { $exists: true },
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "airtable-syncs",
                    let: { speaker: "$speaker" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$speaker"],
                                },
                                isDelete: false
                            },
                        },
                        { $project: { otherdetail: 1, "Preferred Email": 1 } },
                    ],
                    as: "speakers",
                },
            },

            { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
            {
                $lookup: {
                    from: "contentarchivecomments",
                    let: { comment_id: "$comments" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$comment_id"],
                                },
                            },
                        },
                        { $project: { _id: 1, createdAt: 1 } },
                    ],
                    as: "outcomments",
                },
            },
            { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: 1,
                    comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                    comments_id: "$outcomments._id",
                    commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },
            {
                $match: {

                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },

            {
                $group: {
                    _id: { _id: "$_id", comments: "$comments" },
                    commentscount: { $sum: "$comments" }
                }
            },

            {
                $group: {
                    _id: null,
                    commentscount: { $sum: "$commentscount" }
                }
            },




        ]);

        const likesData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    //speaker : {$ne: []},
                    "speaker.0": { $exists: true },
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "airtable-syncs",
                    let: { speaker: "$speaker" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$speaker"],
                                },
                                isDelete: false
                            },
                        },
                        { $project: { otherdetail: 1, "Preferred Email": 1 } },
                    ],
                    as: "speakers",
                },
            },
            { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
            {
                $project: {

                    _id: 1,
                    likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                    like_userid: "$likes.like_userid",
                    likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },
            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },

            {
                $group: {
                    _id: { _id: "$_id", likes: "$likes" },
                    likescount: { $sum: "$likes" }
                }
            },
            {
                $group: {
                    _id: null,
                    likescount: { $sum: "$likescount" }
                }
            },



        ]);

        data = [{
            viewscount: viewData.length > 0 ? viewData[0].viewscount : 0,
            commentscount: commentsData !== undefined && commentsData.length > 0 ? commentsData[0].commentscount : 0,
            likescount: likesData !== undefined && likesData.length > 0 ? likesData[0].likescount : 0,


        }]

        return res.status(200).json({ status: true, message: `Speaker Count Data.`, data: data });


    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

/*Statistic based on Event*/
exports.EventStatisticTotalEvents = async (req, res) => {
    try {
        const count_ = await ContentEvent.countDocuments({ isDelete: false })
        return res.status(200).json({ status: true, message: `Total Tags Count.`, data: count_ });

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticForEventByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype
        const field = req.query.field
        var addFilterCount = 0

        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');

        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }

        if (field == "views") {

            var data = []

            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_events",
                        let: { eventFor: "$eventFor" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$name", "$$eventFor"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "events",
                    },
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        event_id: "$events._id",
                        event_name: "$events.name",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        $and: [{ "viewdate": { "$ne": null } }, { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                    },
                },
                {
                    $project: {
                        event_id: "$event_id",
                        event_name: "$event_name",
                        viewdate: 1,
                        viewscount: "$views",
                    },
                },
                {
                    $group: {
                        _id: { viewdate: "$viewdate", videocount: { $sum: 1 } },
                        viewscount: { $sum: "$viewscount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        viewdate: "$_id.viewdate",
                        viewscount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        viewdate: 1
                    }
                }
            ]);
            const startingViewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_events",
                        let: { eventFor: "$eventFor" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$name", "$$eventFor"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "events",
                    },
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        event_id: "$events._id",
                        event_name: "$events.name",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        starting_view_cnt: 1
                    }
                },
                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [{ "viewdate": { "$ne": null } }, { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        viewdate: 1,
                        viewscount: "$views",
                        videocount: 1,
                        starting_view_cnt: 1
                    },
                },
                {
                    $group: {
                        _id: { id: "$_id", starting_view_cnt: { $sum: "$starting_view_cnt" } },

                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$_id.starting_view_cnt"
                        }
                    }
                },


            ]);

            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic`, data: viewData, startingView: startingViewData.length > 0 ? startingViewData[0].total : 0 });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }



        }

        if (field == "comments") {

            var data = []

            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },

                {
                    $lookup: {
                        from: "contentarchive_events",
                        let: { eventFor: "$eventFor" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$name", "$$eventFor"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "events",
                    },
                },
                {
                    $unwind: "$events"
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        event_id: "$events._id",
                        event_name: "$events.name",
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },

                {
                    $match: {
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [{ "commentdate": { "$ne": null } }, { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }]

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        event_id: "$event_id",
                        event_name: "$event_name",
                        commentdate: 1,
                        commentscount: {
                            $sum: "$comments",
                        },
                    },
                },
                {
                    $group: {
                        _id: { commentdate: "$commentdate", videocount: { $sum: 1 } },
                        commentscount: { $sum: "$commentscount" },
                    }
                },
                {
                    $project: {
                        commentdate: "$_id.commentdate",
                        commentscount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        commentdate: 1
                    }
                }

            ]);


            if (commentsData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }

        if (field == "likes") {
            var data = []

            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },

                {
                    $lookup: {
                        from: "contentarchive_events",
                        let: { eventFor: "$eventFor" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$name", "$$eventFor"],
                                    },
                                    isDelete: false
                                },
                            },
                            { $project: { name: 1 } },
                        ],
                        as: "events",
                    },
                },
                {
                    $unwind: "$events"
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        event_id: "$events._id",
                        event_name: "$events.name",
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {
                        $and: [{ "likedate": { "$ne": null } }, { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { $ne: null } }],
                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        event_id: "$event_id",
                        event_name: "$event_name",
                        likedate: 1,
                        likescount: {
                            $sum: "$likes",
                        },
                    },
                },
                {
                    $group: {
                        _id: { likedate: "$likedate", videocount: { $sum: 1 } },
                        likescount: { $sum: "$likescount" },
                    }
                },
                {
                    $project: {
                        likedate: "$_id.likedate",
                        likescount: 1,
                        videocount: "$_id.videocount",
                    }
                }, {
                    $sort: {
                        likedate: 1
                    }
                }

            ]);


            if (likesData.length > 0) {

                return res.status(200).json({ status: true, message: `video statistic`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic found`, data: [] });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticEventListByDateForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype
        const field = req.query.field

        var addFilterCount = 0

        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');
        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }

        if (field == "views") {
            var data = []
            const viewData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_events",
                        let: { eventFor: "$eventFor" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$name", "$$eventFor"],
                                    },
                                    isDelete: false
                                },
                            },

                        ],
                        as: "events",
                    },
                },
                {
                    $unwind: "$events"
                },
                { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        event_id: "$events._id",
                        event_name: "$events.name",
                        views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                        view_userid: "$views.view_userid",
                        viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        videocount: { $sum: 1 },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                        starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] }


                    }
                },
                {
                    $match: {

                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },
                },
                {
                    $group: {
                        _id: { event_id: "$event_id", event_name: "$event_name", id: "$_id", videocount: "$videocount", starting_view_cnt: "$starting_view_cnt" },
                        viewscount: { $sum: "$views" },


                    }
                },
                {
                    $group: {
                        _id: { event_id: "$_id.event_id", event_name: "$_id.event_name" },
                        viewscount: { $sum: "$viewscount" },
                        videocount: { $sum: "$_id.videocount" },
                        starting_view_cnt: { $sum: "$_id.starting_view_cnt" }
                    }
                },

                {
                    $project: {
                        _id: 0,
                        event_id: "$_id.event_id",
                        event_name: "$_id.event_name",
                        viewscount: { $sum: ["$viewscount", "$starting_view_cnt"] },
                        videocount: "$videocount",

                    }
                }
                , {
                    $sort: {
                        event_name: 1
                    }
                }
            ]);
            if (viewData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video list`, data: viewData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }

        }

        if (field == "comments") {

            var data = []
            const commentsData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_events",
                        let: { eventFor: "$eventFor" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$name", "$$eventFor"],
                                    },
                                    isDelete: false
                                },
                            },

                        ],
                        as: "events",
                    },
                },
                {
                    $unwind: "$events"
                },
                { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
                {
                    $lookup: {
                        from: "contentarchivecomments",
                        let: { comment_id: "$comments" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$comment_id"],
                                    },
                                },
                            },
                            { $project: { _id: 1, createdAt: 1 } },
                        ],
                        as: "outcomments",
                    },
                },
                { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        event_id: "$events._id",
                        event_name: "$events.name",
                        comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                        comments_id: "$outcomments._id",
                        commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        videocount: { $sum: 1 },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {

                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },
                },
                {
                    $project: {
                        _id: "$_id",
                        commentdate: 1,
                        title: 1,
                        event_id: "$event_id",
                        event_name: "$event_name",
                        commentscount: "$comments",
                        thumbnail: 1,
                        createdAt: 1,
                        videocount: 1

                    },
                },
                {
                    $group: {
                        _id: { event_id: "$event_id", event_name: "$event_name", id: "$_id", videocount: "$videocount" },
                        commentscount: { $sum: "$commentscount" },


                    }
                },
                {
                    $group: {
                        _id: { event_id: "$_id.event_id", event_name: "$_id.event_name" },
                        commentscount: { $sum: "$commentscount" },
                        videocount: { $sum: "$_id.videocount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        event_id: "$_id.event_id",
                        event_name: "$_id.event_name",
                        commentscount: 1,
                        videocount: "$videocount"
                    }
                }, {
                    $sort: {
                        event_name: 1
                    }
                }
            ]);
            if (commentsData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video lsit`, data: commentsData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }
        }

        if (field == "likes") {
            var data = []
            const likesData = await ContentArchiveVideo.aggregate([
                {
                    $match: {
                        isDelete: false
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_events",
                        let: { eventFor: "$eventFor" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$name", "$$eventFor"],
                                    },
                                    isDelete: false
                                },
                            },

                        ],
                        as: "events",
                    },
                },
                {
                    $unwind: "$events"
                },
                { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        _id: "$_id",
                        title: "$title",
                        event_id: "$events._id",
                        event_name: "$events.name",
                        likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                        like_userid: "$likes.like_userid",
                        likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                        createdAt: "$createdAt",
                        thumbnail: "$thumbnail",
                        videocount: { $sum: 1 },
                        groupid_: { $size: "$group_ids" },
                        uploadstatus: 1,
                    }
                },
                {
                    $match: {

                        uploadstatus: { $ne: "inprocess" },
                        groupid_: { $gt: 0 },
                        $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                    },
                },
                {
                    $group: {
                        _id: { event_id: "$event_id", event_name: "$event_name", id: "$_id", videocount: "$videocount" },
                        likescount: { $sum: "$likes" },


                    }
                },
                {
                    $group: {
                        _id: { event_id: "$_id.event_id", event_name: "$_id.event_name" },
                        likescount: { $sum: "$likescount" },
                        videocount: { $sum: "$_id.videocount" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        event_id: "$_id.event_id",
                        event_name: "$_id.event_name",
                        likescount: 1,
                        videocount: 1
                    }

                }, {
                    $sort: {
                        event_name: 1
                    }
                }


            ]);

            if (likesData.length > 0) {
                return res.status(200).json({ status: true, message: `video statistic video lsit`, data: likesData });
            } else {
                return res.status(200).json({ status: false, message: `No statistic video list found`, data: [] });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
exports.statisticEventCountByDateAndByForAdmin = async (req, res) => {
    try {

        var fromDate = req.query.fromdate
        var toDate = req.query.todate

        const filterType = req.query.filtertype

        var data = []
        var addFilterCount = 0
        if (filterType == "first24hrs") {
            addFilterCount = 1
        }
        if (filterType == "past7days") {
            addFilterCount = 6
        }
        if (filterType == "past28days") {
            addFilterCount = 27
        }
        if (filterType == "past90days") {
            addFilterCount = 89
        }
        if (filterType == "past365days") {
            addFilterCount = 364
        }
        if (filterType === "custom") {
            toDate = moment(toDate).format('YYYY-MM-DD');
            fromDate = moment(fromDate).format('YYYY-MM-DD');
        } else {
            toDate = moment(new Date()).format('YYYY-MM-DD');
            fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
        }

        const viewData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "contentarchive_events",
                    let: { eventFor: "$eventFor" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$name", "$$eventFor"],
                                },
                                isDelete: false
                            },
                        },

                    ],
                    as: "events",
                },
            },

            { $unwind: { path: "$views", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "$_id",
                    events: 1,
                    views: { $cond: [{ $ifNull: ['$views', false] }, 1, 0] },
                    view_userid: "$views.view_userid",
                    viewdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$views.viewdate" } } },
                    groupid_: { $size: "$group_ids" },
                    starting_view_cnt: { $cond: [{ $ifNull: ['$starting_view_cnt', false] }, "$starting_view_cnt", 0] },
                    uploadstatus: 1,
                }
            },
            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "viewdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "viewdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },
            {
                $group: {
                    _id: { id: "$_id", starting_view_cnt: "$starting_view_cnt" },
                    viewscount: { $sum: "$views" }

                }
            },
            {
                $project: {
                    _id: "$_id.id",
                    viewscount: { $sum: ["$viewscount", "$_id.starting_view_cnt"] },


                }
            },

            {
                $group: {
                    _id: null,
                    viewscount: { $sum: "$viewscount" },


                }
            },

        ]);
        const commentsData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "contentarchive_events",
                    let: { eventFor: "$eventFor" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$name", "$$eventFor"],
                                },
                                isDelete: false
                            },
                        },

                    ],
                    as: "events",
                },
            },

            { $unwind: { path: "$comments", "preserveNullAndEmptyArrays": true } },
            {
                $lookup: {
                    from: "contentarchivecomments",
                    let: { comment_id: "$comments" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$comment_id"],
                                },
                            },
                        },
                        { $project: { _id: 1, createdAt: 1 } },
                    ],
                    as: "outcomments",
                },
            },
            { $unwind: { path: "$outcomments", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: 1,
                    events: 1,
                    comments: { $cond: [{ $ifNull: ['$outcomments', false] }, 1, 0] },
                    comments_id: "$outcomments._id",
                    commentdate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$outcomments.createdAt" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },

            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    $and: [filterType !== "lifetime" ? { "commentdate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "commentdate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },

            {
                $group: {
                    _id: { _id: "$_id", comments: "$comments" },
                    commentscount: { $sum: "$comments" }
                }
            },

            {
                $group: {
                    _id: null,
                    commentscount: { $sum: "$commentscount" }
                }
            },



        ]);
        const likesData = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "contentarchive_events",
                    let: { eventFor: "$eventFor" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$name", "$$eventFor"],
                                },
                                isDelete: false
                            },
                        },

                    ],
                    as: "events",
                },
            },

            { $unwind: { path: "$likes", "preserveNullAndEmptyArrays": true } },
            {
                $project: {
                    _id: "_id",
                    events: 1,
                    likes: { $cond: [{ $ifNull: ['$likes', false] }, 1, 0] },
                    like_userid: "$likes.like_userid",
                    likedate: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$likes.likedate" } } },
                    groupid_: { $size: "$group_ids" },
                    uploadstatus: 1,
                }
            },

            {
                $match: {
                    uploadstatus: { $ne: "inprocess" },
                    groupid_: { $gt: 0 },
                    likedate: { $ne: null },
                    $and: [filterType !== "lifetime" ? { "likedate": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "likedate": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }],

                },
            },
            {
                $group: {
                    _id: { _id: "$_id", likes: "$likes" },
                    likescount: { $sum: "$likes" }
                }
            },
            {
                $group: {
                    _id: null,
                    likescount: { $sum: "$likescount" }
                }
            },

        ]);

        data = [{
            viewscount: viewData.length > 0 ? viewData[0].viewscount : 0,
            commentscount: commentsData !== undefined && commentsData.length > 0 ? commentsData[0].commentscount : 0,
            likescount: likesData !== undefined && likesData.length > 0 ? likesData[0].likescount : 0,


        }]

        return res.status(200).json({ status: true, message: `Speaker Count Data.`, data: data });

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
