const adminNews = require("../../database/models/adminNews");
const User = require("../../database/models/airTableSync");
const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const ContentEvent = require("../../database/models/contentArchive_event");
const ObjectId = require("mongoose").Types.ObjectId;
const { deleteImage } = require("../../utils/mediaUpload");
const AWS = require("aws-sdk");
var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// create news
exports.createNews = async (req, res) => {
    try {
        if (req.body.makeFeaturedCheckbox.toString() === "true") {
            const changeFeaturedNews = await adminNews.updateMany(
                {},
                {
                    $set: { makeFeaturedCheckbox: false },
                }
            );
        }
        let description = `<div "font-family: 'Muller';">${req.body.description}</div>`;
        const newNewsData = new adminNews({
            title: req.body.title,
            thumbnail: req.newsThumbnail,
            description: description,
            date: req.body.date,
            publishOrHide: req.body.publishOrHide,
            makeFeaturedCheckbox: req.body.makeFeaturedCheckbox,
            newsType: "news",
        });
        const saveNews = await newNewsData.save();
        if (saveNews)
            return res
                .status(200)
                .json({
                    status: true,
                    message: `News created successfully!`,
                    newsData: saveNews,
                });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: `Something went wrong while adding news!`,
                });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// edit news
exports.editNews = async (req, res) => {
    try {
        const newsExist = await adminNews.findById(req.params.id);
        if (!newsExist)
            return res.status(200).json({ status: false, message: `News not found` });
        if (req.body.makeFeaturedCheckbox.toString() === "true") {
            const changeFeaturedNews = await adminNews.updateMany(
                { _id: { $ne: new ObjectId(req.params.id) } },
                {
                    $set: { makeFeaturedCheckbox: false },
                }
            );
        }
        if (req.newsThumbnail) {
            deleteImage(newsExist.thumbnail);
        }
        let description = `<div "font-family: 'Muller';">${req.body.description}</div>`;
        const updatedNews = await adminNews.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title ?? newsExist.title,
                thumbnail: req.newsThumbnail ?? newsExist.thumbnail,
                description: description ?? newsExist.description,
                date: req.body.date ?? newsExist.date,
                publishOrHide: req.body.publishOrHide ?? newsExist.publishOrHide,
                makeFeaturedCheckbox:
                    req.body.makeFeaturedCheckbox !== null &&
                        req.body.makeFeaturedCheckbox !== undefined
                        ? req.body.makeFeaturedCheckbox
                        : newsExist.makeFeaturedCheckbox,
            },
            { new: true }
        );
        if (updatedNews)
            return res
                .status(200)
                .json({
                    status: true,
                    message: `News updated successfully!`,
                    newsData: updatedNews,
                });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: `Something went wrong while updating news!`,
                });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// delete news
exports.deleteNews = async (req, res) => {
    try {
        const newsExist = await adminNews.findById(req.params.id);
        if (!newsExist)
            return res.status(200).json({ status: false, message: `News not found` });
        if (newsExist.thumbnail) deleteImage(newsExist.thumbnail);
        const deleteNews = await adminNews.findByIdAndDelete(req.params.id);
        if (deleteNews)
            return res
                .status(200)
                .json({ status: true, message: `News deleted successfully!` });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: `Something went wrong while deleting news!`,
                });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all news list
exports.getNewsList = async (req, res) => {
    try {

        var match = {
            newsType: "news"
        };

        var search = "";
        if (req.query.search) {
            search = req.query.search;
            match = {
                ...match,
                title: { $regex: ".*" + search + ".*", $options: "i" },
            };
        }

        const newsList = await adminNews.find(match).sort({ createdAt: -1 });
        if (newsList)
            return res.status(200).json({ status: true, message: `News list`, newsList: newsList });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting news list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// news detail api
exports.getNewsDetailById = async (req, res) => {
    try {
        const newsDetail = await adminNews.findById(req.params.id);
        if (newsDetail)
            return res
                .status(200)
                .json({ status: true, message: `News detail`, newsDetail: newsDetail });
        else
            return res
                .status(200)
                .json({ status: false, message: `No data found for this news id!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// content news listing api
exports.getContentNewsList = async (req, res) => {
    try {

        var match = {
            newsType: "video"
        };

        var search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        const contentNewsList = await adminNews.aggregate([
            {
                $match: match,
            },
            {
                $lookup: {
                    from: "contentarchive_videos",
                    let: { video_id: "$videoReferenceId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$video_id"],
                                },
                                $or: [{ title: { $regex: ".*" + search + ".*", $options: "i" }, },]
                            },
                        },
                        { $project: { video: 1, title: 1, description: 1, thumbnail: 1 } },
                    ],
                    as: "videoReferenceId",
                },
            },
            {
                $unwind: "$videoReferenceId",
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    thumbnail: 1,
                    description: 1,
                    date: 1,
                    publishOrHide: 1,
                    makeFeaturedCheckbox: 1,
                    newsType: 1,
                    videoReferenceId: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            { $sort: { date: -1 } },
        ]);

        // const contentNewsList = await adminNews.find(match).sort({ createdAt: -1 });
        if (contentNewsList)
            return res.status(200).json({ status: true, message: `Content news list`, newsList: contentNewsList });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting content news list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// make featured by id
exports.makeNewsFeaturedById = async (req, res) => {
    try {
        const newsExist = await adminNews.findById(req.params.id);
        if (!newsExist)
            return res.status(200).json({ status: false, message: `News not found` });
        if (Boolean(req.body.makeFeaturedCheckbox)) {
            const changeFeaturedNews = await adminNews.updateMany(
                { _id: { $ne: new ObjectId(req.params.id) } },
                {
                    $set: { makeFeaturedCheckbox: false },
                }
            );
        }
        const updatedNews = await adminNews.findByIdAndUpdate(
            req.params.id,
            {
                makeFeaturedCheckbox:
                    req.body.makeFeaturedCheckbox !== null &&
                        req.body.makeFeaturedCheckbox !== undefined
                        ? req.body.makeFeaturedCheckbox
                        : newsExist.makeFeaturedCheckbox,
            },
            { new: true }
        );
        if (updatedNews)
            return res
                .status(200)
                .json({
                    status: true,
                    message: `News updated successfully!`,
                    newsData: updatedNews,
                });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: `Something went wrong while updating news!`,
                });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
// Save images sapratly

exports.saveFiles = async (req, res) => {
    try {
        const { image } = req;

        if (image) {
            return res
                .status(200)
                .json({
                    status: true,
                    media: image,
                    message: "Files saved successfully!",
                });
        } else
            return res
                .status(200)
                .json({ status: false, message: "Something went wrong!" });
    } catch (error) {
        return res
            .status(200)
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all news list for frontend
exports.getNewsAndContentList = async (req, res) => {
    try {
        const authUser = req.authUserId;
        const userData = await User.findById(authUser).lean();

       var userDayData = userData["migrate_user"] && userData["migrate_user"].plan_id === "Staff" ? userData["# of Days Since MDS Only Census"]  : userData["# of Days Since MDS Only Census"] && typeof
        userData["# of Days Since MDS Only Census"] !== "object" ? userData["# of Days Since MDS Only Census"] : 400 ; 
        
        const allEvents = await ContentEvent.find({
            isDelete: false,
            name: { $ne: "others" },
        });
        var eventFor = ["others"];
        allEvents.forEach(async (event, key) => {
            const eventName = event.name.toLowerCase();
            if (userData.userEvents !== undefined) {
                if (userData.userEvents[eventName] === true) {
                    eventFor.push(eventName);
                }
            }
        });
        
        const accessibleVideosList = await ContentArchiveVideo.find({
            isDelete: false,
            group_ids: { $in: userData.accessible_groups },
            uploadstatus: { $ne: "inprocess" },
            eventFor: { $in: eventFor },
        })
            .select("_id")
            .lean();

        var videoIds = accessibleVideosList.map((vid) => {
            return vid._id;
        });

        if(userDayData > 365 ){
            videoIds = [];
        }   
        
        const totalCount = await adminNews.count({
            $or: [{ newsType: "news" }, { videoReferenceId: { $in: videoIds } }],
            publishOrHide: "publish"
        });
        const allNewsLists = await adminNews.aggregate([
            {
                $match: {
                    $or: [{ newsType: "news" }, { videoReferenceId: { $in: videoIds } }],
                    makeFeaturedCheckbox: false,
                    publishOrHide: "publish"
                },
            },
            {
                $lookup: {
                    from: "contentarchive_videos",
                    localField: "videoReferenceId",
                    foreignField: "_id",
                    as: "videoData",
                }
            },
            {
                $unwind: { path: "$videoData", preserveNullAndEmptyArrays: true }
            },
            {
                $addFields: {
                    thumbnailUrl: {
                        $cond: [
                            {
                                $eq: ["$newsType", "video"],
                            },
                            "$videoData.thumbnail", "$thumbnail"
                        ],
                    },
                    descriptionMain: {
                        $cond: [
                            {
                                $eq: ["$newsType", "video"],
                            },
                            "$videoData.description", "$description"
                        ],
                    },
                    titleMain: {
                        $cond: [
                            {
                                $eq: ["$newsType", "video"],
                            },
                            "$videoData.title", "$title"
                        ],
                    },
                },
            },
            {
                $unset: ["title", "description", "thumbnail", "videodata"]
            },
            { $sort: { createdAt: -1 } },
            { $skip: req.query.page ? (parseInt(req.query.page) - 1) * parseInt(req.query.limit) : 0 },
            { $limit: req.query.limit ? parseInt(req.query.limit) : totalCount },
        ])


        var arr = [];
        for (var i = 0; i < allNewsLists.length; i++) {
            if (allNewsLists[i].videoData) {
                var url = s3.getSignedUrl("getObject", {
                    Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
                    Key: allNewsLists[i].videoData.video,
                    Expires: 100000,
                });
                arr.push({ ...allNewsLists[i], videoData: { ...allNewsLists[i].videoData, video: url } });
            } else {
                arr.push(allNewsLists[i]);

            }

        }
        data = arr;

        if (data)
            return res.status(200).json({
                status: true,
                message: `News list`,
                newsList: {
                    list: data,
                    totalPages: Math.ceil(totalCount / parseInt(req.query.limit)),
                    currentPage: parseInt(req.query.page),
                    totalCount: totalCount,
                },
            });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: `Something went wrong while getting news list!`,
                });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get featured news
exports.getFeaturedNews = async (req, res) => {
    try {
        const authUser = req.authUserId;
        const userData = await User.findById(authUser).lean();
        const allEvents = await ContentEvent.find({
            isDelete: false,
            name: { $ne: "others" },
        });
        var eventFor = ["others"];
        allEvents.forEach(async (event, key) => {
            const eventName = event.name.toLowerCase();
            if (userData.userEvents !== undefined) {
                if (userData.userEvents[eventName] === true) {
                    eventFor.push(eventName);
                }
            }
        });
        const accessibleVideosList = await ContentArchiveVideo.find({
            isDelete: false,
            group_ids: { $in: userData.accessible_groups },
            uploadstatus: { $ne: "inprocess" },
            eventFor: { $in: eventFor },
        }).select("_id").lean();

        const videoIds = accessibleVideosList.map((vid) => {
            return vid._id;
        });

        const featuredNews = await adminNews.aggregate([
            {
                $match: {
                    $or: [{ newsType: "news" }, { videoReferenceId: { $in: videoIds } }],
                    makeFeaturedCheckbox: true,
                    publishOrHide: "publish"
                },
            },
            {
                $lookup: {
                    from: "contentarchive_videos",
                    localField: "videoReferenceId",
                    foreignField: "_id",
                    as: "videoData",
                }
            },
            {
                $unwind: { path: "$videoData", preserveNullAndEmptyArrays: true }
            },
            {
                $addFields: {
                    thumbnailUrl: {
                        $cond: [
                            {
                                $eq: ["$newsType", "video"],
                            },
                            "$videoData.thumbnail", "$thumbnail"
                        ],
                    },
                    descriptionMain: {
                        $cond: [
                            {
                                $eq: ["$newsType", "video"],
                            },
                            "$videoData.description", "$description"
                        ],
                    },
                    titleMain: {
                        $cond: [
                            {
                                $eq: ["$newsType", "video"],
                            },
                            "$videoData.title", "$title"
                        ],
                    },
                },
            },
            {
                $unset: ["title", "description", "thumbnail", "videodata"]
            },
            { $sort: { createdAt: -1 } },
        ]);

        var data = featuredNews[0];
        if (featuredNews && featuredNews[0] && featuredNews[0].videoData) {
            var url = s3.getSignedUrl("getObject", {
                Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
                Key: featuredNews[0].videoData.video,
                Expires: 100000,
            });

            data = { ...featuredNews[0], videoData: { ...featuredNews[0].videoData, video: url } };
        }

        if (data)
            return res.status(200).json({ status: true, message: `Featured news`, featuredNews: data, });
        else
            return res.status(200).json({ status: false, message: `Featured news not found!`, });
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
}