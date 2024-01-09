const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const contentArchiveComment = require("../../database/models/contentArchive_comment");
const { manageUserLog } = require("../../middleware/userActivity");
const mongoose = require("mongoose");
const comment = require("../../database/models/comment");
const ObjectId = mongoose.Types.ObjectId;

// create comment
exports.createComment = async (req, res) => {
    try {
        const videodata = await ContentArchiveVideo.findById(req.params.videoId);
        if (!videodata)
            return res.status(200).json({ status: false, message: "Video not found!" });

        const comment = new contentArchiveComment({ ...req.body, user_type: "airtable-syncs" });
        comment.videoId = req.params.videoId;
        comment.userId = req.authUserId;
        const result = await comment.save()

        if (result) {
            const update_video_cmt = await ContentArchiveVideo.findByIdAndUpdate(req.params.videoId, { $push: { comments: result._id } });
            if (update_video_cmt)
                return res.status(200).json({ status: true, message: "Comments on video!!", data: result });
            else
                return res.status(200).json({ status: false, message: "Comment not added!!" });
        } else {
            return res.status(200).json({ status: false, message: "Comment not added!!" });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error });
    }

};

exports.editComment = async (req, res) => {
    try {
        const body = req.body;
        const commentData = await contentArchiveComment.findOne({ _id: ObjectId(body.comment_id), videoId: req.params.videoId });
        // console.log(commentData, "commentData");
        if (commentData === null)
            return res.status(200).json({ status: false, message: "Comment not found!" });

        if (commentData.userId._id.toString() !== req.authUserId.toString()) {
            return res.status(400).json({ status: true, message: "you can't edit this comment, because you don't own this comment." });

        } else {
            const updateComment = await contentArchiveComment.findByIdAndUpdate({ _id: new ObjectId(body.comment_id) }, { content: body.content }, { new: true });

            if (updateComment) {
                manageUserLog(req.authUserId);
                return res.status(200).json({ status: true, message: "Comment updated successfully!", data: updateComment });
            } else {
                return res.status(200).json({ status: fale, message: "somthing went wrong." });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: error });
    }

};

exports.createComment_AS = async (req, res) => {

    const videodata = await ContentArchiveVideo.findById(req.params.videoId);
    if (!videodata)
        return res.status(200).json({ status: false, message: "Video not found!" });

    const comment = new contentArchiveComment({
        ...req.body,
        user_type: "adminuser",
        createAt: new Date()
    });
    comment.videoId = req.params.videoId;
    comment.userId = req.admin_Id;
    const result = await comment.save()

    if (result) {
        const update_video_cmt = await ContentArchiveVideo.findByIdAndUpdate(req.params.videoId, { $push: { comments: result._id } });
        if (update_video_cmt)
            return res.status(200).json({ status: true, message: "Comments on video!!", data: result });
        else
            return res.status(200).json({ status: false, message: "Comment not added!!" });
    } else {
        return res.status(200).json({ status: false, message: "Comment not added!!" });
    }

};

/** get reply comments **/
exports.getComments_Replies = (req, res) => {
    let video;
    const { page, limit } = req.query;
    ContentArchiveVideo.findById(req.params.videoId).sort({ createdAt: -1 }).lean().then((v) => {
        video = v;
        if (!video)
            return res.status(404).json({ status: false, message: "Video not found !!" });

        const id_array = video.comments.map((id) => id.toString());
        if (id_array.length > 0) {
            return contentArchiveComment
                .find({ _id: { $in: id_array } })
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();
        }
    }).then((comment) => {
        const total_count = video.comments.length;
        return res.status(200).json({
            status: true,
            message: "All comments.",
            data: [
                {
                    comment,
                    totalPages: Math.ceil(total_count / limit),
                    currentPage: page,
                    totalComments: total_count,
                },
            ],
        });
    }).catch((err) => {
        return res.status(200).json({ status: false, message: "Something went wrong!!", error: err.message });
    });
};

exports.getComments_Replies_AS = (req, res) => {
    let video;
    const { page, limit } = req.query;
    ContentArchiveVideo.findById(req.params.videoId).sort({ createdAt: -1 }).lean().then((v) => {
        video = v;
        if (!video)
            return res.status(404).json({ status: false, message: "Video not found !!" });

        const id_array =
            video.comments && video.comments.map((id) => id.toString());

        if (id_array.length > 0) {
            return contentArchiveComment.find({ _id: { $in: id_array } }).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit).lean();
        }
    }).then((comment) => {
        const total_count = video.comments && video.comments.length;
        return res.status(200).json({
            status: true,
            message: "All comments.",
            data: [
                {
                    comment,
                    totalPages: Math.ceil(total_count / limit),
                    currentPage: page,
                    totalComments: total_count,
                },
            ],
        });
    }).catch((err) => {
        return res.status(200).json({ status: false, message: "Something went wrong!!", error: err.message });
    });
};

/** create replies for posts **/
exports.createReply = async (req, res) => {
    const { videoId, commentId } = req.params;

    const videodata = await ContentArchiveVideo.findById(videoId);
    if (!videodata)
        return res.status(200).json({ status: false, message: "Video not found!" });

    var getComment = await contentArchiveComment.findById(commentId);
    if (!getComment)
        return res.status(404).json({ status: false, message: "Comment not found !!" });

    const reply = new contentArchiveComment(req.body);
    reply.userId = req.authUserId;
    reply.videoId = videoId;
    const result = await reply.save()

    if (result) {
        const update_video_rply = await contentArchiveComment.findByIdAndUpdate(commentId, { $push: { comments: result._id } });
        if (update_video_rply)
            return res.status(200).json({ status: true, message: "Response on comment!!", data: result });
        else
            return res.status(200).json({ status: false, message: "Comment not added!!" });
    } else {
        return res.status(200).json({ status: false, message: "Comment not added!!" });
    }
};

exports.createReply_AS = async (req, res) => {
    const { videoId, commentId } = req.params;

    const videodata = await ContentArchiveVideo.findById(videoId);
    if (!videodata)
        return res.status(200).json({ status: false, message: "Video not found!" });

    var getComment = await contentArchiveComment.findById(commentId);
    if (!getComment)
        return res.status(404).json({ status: false, message: "Comment not found !!" });

    const reply = new contentArchiveComment(req.body);
    reply.userId = req.admin_Id;
    reply.videoId = videoId;
    const result = await reply.save()

    if (result) {
        const update_video_rply = await contentArchiveComment.findByIdAndUpdate(commentId, { $push: { comments: result._id } });
        if (update_video_rply)
            return res.status(200).json({ status: true, message: "Response on comment!!", data: result });
        else
            return res.status(200).json({ status: false, message: "Comment not added!!" });
    } else {
        return res.status(200).json({ status: false, message: "Comment not added!!" });
    }
};

/** like and unlike comments **/
exports.likeComment = async (req, res) => {
    try {
        const { videoId, commentId } = req.params;
        var getComment = await contentArchiveComment.findOne({
            _id: commentId,
            videoId: videoId,
        });
        if (!getComment)
            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.likes.includes(req.body.userId)) {
            await contentArchiveComment.findOneAndUpdate(
                { _id: commentId, videoId: videoId },
                { $pull: { likes: req.authUserId } },
                { new: true }
            );
        } else {
            await contentArchiveComment.findOneAndUpdate(
                { _id: commentId, videoId: videoId },
                { $push: { likes: req.authUserId } },
                { new: true }
            );
        }
        manageUserLog(req.authUserId);
        return res.status(200).json({ status: true, message: "Comment like/unlike!!" });

    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.likeComment_AS = async (req, res) => {
    try {
        const { videoId, commentId } = req.params;
        var getComment = await contentArchiveComment.findOne({
            _id: commentId,
            videoId: videoId,
        });

        if (!getComment)
            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.likes.includes(req.admin_Id)) {
            await contentArchiveComment.findOneAndUpdate(
                { _id: commentId, videoId: videoId },
                { $pull: { likes: req.admin_Id } },
                { new: true }
            );
        } else {
            await contentArchiveComment.findOneAndUpdate(
                { _id: commentId, videoId: videoId },
                { $push: { likes: req.admin_Id } },
                { new: true }
            );
        }
        // manageUserLog(req.admin_Id)
        return res.status(200).json({ status: true, message: "Comment like/unlike!!" });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

async function getCommentssRecursivelyandDelete(comment, result) {
    result.push(comment);
    var children = await contentArchiveComment.findById(comment);
    if (children !== null) {
        if (Array.isArray(children.comments) && children.comments.length) {
            children.comments.map((comment) => {
                getCommentssRecursivelyandDelete(comment.id, result);
            });
        }
    }
    await contentArchiveComment.deleteMany({ _id: { $in: result } });
}

/** delete comment or replies only by commented user **/
exports.deleteCommentsReplies = async (req, res) => {
    try {
        const { videoId, commentId } = req.params;
        var getComment = await contentArchiveComment.findOne({
            _id: commentId,
            videoId: videoId,
        });

        if (!getComment)
            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.userId._id.toString() !== req.authUserId.toString()) {
            return res.status(400).json({ status: true, message: "you can't delete this comment, because you don't own this comment." });

        } else {
            var getVideo = await ContentArchiveVideo.findById(videoId);
            if (!getVideo)
                return res.status(404).json({ status: false, message: "Video not found !!" });

            if (getVideo.comments.includes(commentId)) {
                await ContentArchiveVideo.findByIdAndUpdate(
                    videoId,
                    { $pull: { comments: commentId } },
                    { new: true }
                );
                var ids = [];
                getCommentssRecursivelyandDelete(commentId, ids);

            } else {
                var ids = [];
                getCommentssRecursivelyandDelete(commentId, ids);

            }
            manageUserLog(req.authUserId);

            return res.status(200).json({ status: true, message: "Comment deleted successfully!" });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: "somthing went wrong !!" });
    }
};

exports.deleteCommentsReplies_AS = async (req, res) => {
    try {
        const { videoId, commentId } = req.params;
        var getComment = await contentArchiveComment.findOne({
            _id: commentId,
            videoId: videoId,
        });
        if (!getComment)

            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.userId._id.toString() !== req.admin_Id.toString()) {

            return res.status(400).json({ status: true, message: "you can't delete this comment, because you don't own this comment." });

        } else {
            var getVideo = await ContentArchiveVideo.findById(videoId);
            if (!getVideo)
                return res.status(404).json({ status: false, message: "Video not found !!" });

            if (getVideo.comments.includes(commentId)) {
                await ContentArchiveVideo.findByIdAndUpdate(
                    videoId,
                    { $pull: { comments: commentId } },
                    { new: true }
                );
                var ids = [];
                getCommentssRecursivelyandDelete(commentId, ids);
            } else {
                var ids = [];
                getCommentssRecursivelyandDelete(commentId, ids);
            }
            // manageUserLog(req.admin_Id)
            return res.status(200).json({ status: true, message: "Comment deleted successfully!" });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: "somthing went wrong !!" });
    }
};
