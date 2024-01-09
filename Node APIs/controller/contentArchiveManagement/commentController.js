const Post = require("../../database/models/post");
const Comment = require("../../database/models/comment");
const GroupMember = require("../../database/models/groupMember");

const { manageUserLog } = require("../../middleware/userActivity");

/** create comment **/
exports.createComment = async (req, res) => {
    const groupId_forthisPost = await Post.findById(req.params.postId).select(
        "groupId"
    );
    if (!groupId_forthisPost)
        return res.status(200).json({ status: false, message: "This post is not belongs to any group." });

    const find_user_isGroupMember = await GroupMember.findOne({
        userId: req.authUserId,
        groupId: groupId_forthisPost.groupId,
        status: 2,
    });

    if (!find_user_isGroupMember)
        return res.status(200).json({ status: false, message: "You are not part of this group. So, you can't comments." });

    const comment = new Comment({ ...req.body, user_type: "airtable-syncs" });
    comment.postId = req.params.postId;
    comment.userId = req.authUserId;
    comment.save().then((comment) =>
        comment.populate("userId", "email otherdetail first_name last_name")
    ).then(() => Promise.all([Post.findById(req.params.postId)])).then(([post]) => {
        post.comments.unshift(comment);
        return Promise.all([post.save()]);
    }).then(() => {
        manageUserLog(req.authUserId);
        return res.status(200).json({ status: true, message: "Comments on Post!!", data: comment });
    }).catch((err) => {
        return res.status(200).json({ status: false, message: err });
    });

};

exports.createComment_AS = async (req, res) => {

    const groupId_forthisPost = await Post.findById(req.params.postId).select("groupId");

    if (!groupId_forthisPost)
        return res.status(200).json({ status: false, message: "This post is not belongs to any group." });

    const find_user_isGroupMember = await GroupMember.findOne({
        userId: req.admin_Id,
        groupId: groupId_forthisPost.groupId,
        status: 2,
    });

    if (!find_user_isGroupMember)
        return res.status(200).json({ status: false, message: "You are not part of this group. So, you can't comments." });

    const comment = new Comment({ ...req.body, user_type: "adminuser" });
    comment.postId = req.params.postId;
    comment.userId = req.admin_Id;

    comment.save().then(() => Promise.all([Post.findById(req.params.postId)])).then(([post]) => {
        post.comments.unshift(comment);
        return Promise.all([post.save()]);
    }).then(async () => {
        // manageUserLog(req.admin_Id)
        const populate_data = await comment.populate(
            "userId",
            "email followers following otherdetail first_name last_name"
        );
        return res.status(200).json({ status: true, message: "Comments on Post!!", data: populate_data });
    }).catch((err) => {
        return res.status(200).json({ status: false, message: err });
    });

};

/** get reply comments **/
exports.getComments_Replies = (req, res) => {

    let post;
    const { page, limit } = req.query;

    Post.findById(req.params.postId).lean().then((p) => {
        post = p;

        if (!post)
            return res.status(404).json({ status: false, message: "Post not found !!" });

        const id_array = post.comments.map((id) => id.toString());
        if (id_array.length > 0) {
            return Comment.find({ _id: { $in: id_array } }).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit).lean();
        }
    }).then((comment) => {
        const total_count = post.comments.length;
        return res.status(200).json({
            status: true,
            message: "All comments.",
            data: [{
                comment,
                totalPages: Math.ceil(total_count / limit),
                currentPage: page,
                totalPosts: total_count,
            }],
        });
    }).catch((err) => {
        return res.status(200).json({ status: false, message: "Something went wrong!!" });
    });

};

exports.getComments_Replies_AS = (req, res) => {
    let post;
    const { page, limit } = req.query;

    Post.findById(req.params.postId).lean().then((p) => {
        post = p;
        if (!post)
            return res.status(404).json({ status: false, message: "Post not found !!" });

        const id_array = post.comments.map((id) => id.toString());
        if (id_array.length > 0) {
            return Comment.find({ _id: { $in: id_array } }).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit).lean();
        }
    }).then((comment) => {
        const total_count = post.comments.length;
        return res.status(200).json({
            status: true,
            message: "All comments.",
            data: [{
                comment,
                totalPages: Math.ceil(total_count / limit),
                currentPage: page,
                totalPosts: total_count,
            }],
        });
    }).catch((err) => {
        return res.status(200).json({ status: false, message: "Something went wrong!!" });
    });

};

/** create replies for posts **/
exports.createReply = async (req, res) => {
    const { postId, commentId } = req.params;

    const groupId_forthisPost = await Post.findById(postId).select("groupId");
    if (!groupId_forthisPost)
        return res.status(200).json({ status: false, message: "This post is not belongs to any group." });
    const find_user_isGroupMember = await GroupMember.findOne({
        userId: req.authUserId,
        groupId: groupId_forthisPost.groupId,
        status: 2,
    });

    if (!find_user_isGroupMember)
        return res.status(200).json({ status: false, message: "You are not part of this group. So, you can't comments." });

    var getComment = await Comment.findById(commentId);
    if (!getComment)
        return res.status(404).json({ status: false, message: "Comment not found !!" });

    const reply = new Comment(req.body);
    reply.userId = req.authUserId;
    reply.postId = postId;

    Post.findById(postId).then((post) => {
        Promise.all([reply.save(), Comment.findById(commentId)])
            .then(([reply, comment]) => {
                comment.comments.unshift(reply._id);
                return Promise.all([comment.save()]);
            }).then((result) => {
                manageUserLog(req.authUserId);
                return res.status(200).json({ status: true, message: "Replie on post!", data: reply });
            }).catch((err) => {
                return res.status(200).json({ status: false, message: "Something went wrong." });
            });
        // return post.save()
    });

};

exports.createReply_AS = async (req, res) => {
    const { postId, commentId } = req.params;

    const groupId_forthisPost = await Post.findById(postId).select("groupId");
    if (!groupId_forthisPost)
        return res.status(200).json({ status: false, message: "This post is not belongs to any group." });

    const find_user_isGroupMember = await GroupMember.findOne({
        userId: req.admin_Id,
        groupId: groupId_forthisPost.groupId,
        status: 2,
    });

    if (!find_user_isGroupMember)
        return res.status(200).json({ status: false, message: "You are not part of this group. So, you can't comments." });

    var getComment = await Comment.findById(commentId);
    if (!getComment)
        return res.status(404).json({ status: false, message: "Comment not found !!" });

    const reply = new Comment(req.body);
    reply.userId = req.admin_Id;
    reply.postId = postId;

    Post.findById(postId).then((post) => {
        Promise.all([reply.save(), Comment.findById(commentId)])
            .then(([reply, comment]) => {
                comment.comments.unshift(reply._id);
                return Promise.all([comment.save()]);
            }).then((result) => {
                // manageUserLog(req.admin_Id)
                return res.status(200).json({ status: true, message: "Replie on post!", data: reply });
            }).catch((err) => {
                return res.status(200).json({ status: false, message: "Something went wrong." });
            });
        // return post.save()
    });
};

/** like and unlike comments **/
exports.likeComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        var getComment = await Comment.findOne({ _id: commentId, postId: postId });

        if (!getComment)
            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.likes.includes(req.body.userId)) {
            await Comment.findOneAndUpdate({ _id: commentId, postId: postId }, { $pull: { likes: req.authUserId } }, { new: true });
        } else {
            await Comment.findOneAndUpdate({ _id: commentId, postId: postId }, { $push: { likes: req.authUserId } }, { new: true });
        }

        manageUserLog(req.authUserId);
        return res.status(200).json({ status: true, message: "Comment like/unlike!!" });

    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.likeComment_AS = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        var getComment = await Comment.findOne({ _id: commentId, postId: postId });
        if (!getComment)
            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.likes.includes(req.body.admin_Id)) {
            await Comment.findOneAndUpdate({ _id: commentId, postId: postId }, { $pull: { likes: req.admin_Id } }, { new: true });
        } else {
            await Comment.findOneAndUpdate({ _id: commentId, postId: postId }, { $push: { likes: req.admin_Id } }, { new: true });
        }
        // manageUserLog(req.admin_Id)
        return res.status(200).json({ status: true, message: "Comment like/unlike!!" });

    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

async function getCommentssRecursivelyandDelete(comment, result) {
    result.push(comment);
    var children = await Comment.findById(comment);

    if (children !== null) {
        if (Array.isArray(children.comments) && children.comments.length) {
            children.comments.map((comment) => {
                getCommentssRecursivelyandDelete(comment.id, result);
            });
        }
    }
    await Comment.deleteMany({ _id: { $in: result } });
}

/** delete comment or replies only by commented user **/
exports.deleteCommentsReplies = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        var getComment = await Comment.findOne({ _id: commentId, postId: postId });
        if (!getComment)
            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.userId._id.toString() !== req.authUserId.toString()) {
            return res.status(400).json({ status: true, message: "you can't delete this comment, because you don't own this comment." });
        } else {
            var getPost = await Post.findById(postId);
            if (!getPost)
                return res.status(404).json({ status: false, message: "Post not found !!" });

            if (getPost.comments.includes(commentId)) {
                await Post.findByIdAndUpdate(postId, { $pull: { comments: commentId } }, { new: true });
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
        const { postId, commentId } = req.params;
        var getComment = await Comment.findOne({ _id: commentId, postId: postId });
        if (!getComment)
            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.userId._id.toString() !== req.admin_Id.toString()) {
            return res.status(400).json({ status: true, message: "you can't delete this comment, because you don't own this comment." });
        } else {
            var getPost = await Post.findById(postId);
            if (!getPost)
                return res.status(404).json({ status: false, message: "Post not found !!" });

            if (getPost.comments.includes(commentId)) {
                await Post.findByIdAndUpdate(postId, { $pull: { comments: commentId } }, { new: true });
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

/** edit comments or replies only by commented users **/
exports.editCommentsReplies = async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        var getComment = await Comment.findOne({ _id: commentId, postId: postId });
        if (!getComment)
            return res.status(404).json({ status: false, message: "Comment not found !!" });

        if (getComment.userId._id.toString() !== req.authUserId.toString()) {
            return res.status(400).json({ status: true, message: "you can't edit this comment, because you don't own this comment." });
        } else {
            const updateComment = await Comment.findByIdAndUpdate(commentId, { $set: { content: req.body.content } }, { new: true });
            if (updateComment) {
                manageUserLog(req.authUserId);
                return res.status(200).json({ status: true, message: "Comment updated successfully!", data: updateComment });
            } else {
                return res.status(200).json({ status: fale, message: "somthing went wrong." });
            }
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: "somthing went wrong !!" });
    }
};
