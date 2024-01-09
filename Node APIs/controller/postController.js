const Post = require("../database/models/post");
const FeelingsActivity = require("../database/models/feelingsActivity");
const Topic = require("../database/models/topic");
const Comment = require("../database/models/comment");
const ContentArchiveVideo = require("../database/models/contentArchive_video");
const User = require("../database/models/airTableSync");
const Group = require("../database/models/group");
const GroupMember = require("../database/models/groupMember");

const { manageUserLog } = require("../middleware/userActivity");

require("dotenv").config();
const AWS = require("aws-sdk");
const { group } = require("console");

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// create a feelings/activity
exports.createFeelingsActivity = async (req, res) => {
    try {
        if (!req.body)
            return res
                .status(403)
                .json({ status: false, message: "please add some content !!" });
        const newEntry = new FeelingsActivity({ ...req.body });
        if (!newEntry)
            return res
                .status(200)
                .json({ status: false, message: "smothing went wrong !!" });
        const savedEntry = await newEntry.save();
        if (savedEntry)
            return res
                .status(200)
                .json({ status: true, message: "Feeling created successfully!" });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get all feelings and activity
exports.getAllFeelings = async (req, res) => {
    try {
        const feelingsdata = await FeelingsActivity.find({}).sort({
            updatedAt: -1,
        });
        res
            .status(200)
            .json({ status: true, message: "All feelings!!", data: feelingsdata });
    } catch (err) {
        res.status(200).json({ status: false, message: "smothing went wrong !!" });
    }
};

// create a post
exports.createPost = async (req, res) => {
    try {
        if (!req.body)
            return res
                .status(200)
                .json({ status: false, message: "please add some content !!" });
        const {
            authUserId,
            thumb_images,
            medium_images,
            original_images,
            upload_videos,
            userRole,
        } = req;

        if (req.body.topics.length < 0)
            return res
                .status(200)
                .json({ status: false, message: "Please select at least one topic." });

        var getPost = await Group.findOne({
            _id: req.body.groupId,
            isDelete: false,
        });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Group not found !!" });

        // if post created by admin
        if (req.body.makeAnnouncement) {
            if (userRole === "user") {
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "You don't have access to make announcement for post.",
                    });
            }
        }
        if (req.body.hideFromFeed) {
            if (userRole === "user") {
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "You don't have access to hide post from feed.",
                    });
            }
        }
        var t_result = [];
        const temp1 = req.body.topics.map(async (topicId) => {
            var q_data = await Topic.findOne({
                _id: topicId,
                numberOfGroup: { $in: req.body.groupId },
            });

            if (q_data) t_result.push(q_data);
        });
        await Promise.all([...temp1]);

        if (t_result.length === 0)
            return res
                .status(200)
                .json({
                    status: false,
                    message:
                        "Topic that you choose among that some of is not assign to this group.",
                });

        var newPost = new Post({
            ...req.body,
            postedBy: authUserId,
            thumbnail_images: thumb_images,
            medium_images: medium_images,
            images: original_images,
            videos: upload_videos,
        });

        if (!newPost)
            return res
                .status(200)
                .json({ status: false, message: "smothing went wrong !!" });
        const savedPost = await newPost.save();
        let obj_save = savedPost.toObject();
        delete obj_save.topics;
        if (savedPost) {
            await Group.findByIdAndUpdate(
                req.body.groupId,
                { $inc: { totalGrpPosts: 1 } },
                { new: true }
            );
            var new_t_array = [];
            if (savedPost.topics.length > 0) {
                const temp = savedPost.topics.map(async (item) => {
                    const new_t = await Topic.findByIdAndUpdate(
                        item._id,
                        { $inc: { totalPost: 1 } },
                        { new: true }
                    );
                    new_t_array.push(new_t);
                });
                await Promise.all([...temp]);
                obj_save.topics = new_t_array;
                manageUserLog(req.authUserId);
                return res
                    .status(200)
                    .json({
                        status: true,
                        message: "Post uploaded successfully!!",
                        data: obj_save,
                    });
            } else {
                manageUserLog(req.authUserId);
                return res
                    .status(200)
                    .json({
                        status: true,
                        message: "Post uploaded successfully!",
                        data: savedPost,
                    });
            }
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.createPost_AS = async (req, res) => {
    try {
        if (!req.body)
            return res
                .status(200)
                .json({ status: false, message: "please add some content !!" });
        const {
            admin_Id,
            thumb_images,
            medium_images,
            original_images,
            upload_videos,
        } = req;

        if (req.body.topics.length < 0)
            return res
                .status(200)
                .json({ status: false, message: "Please select at least one topic." });

        var getPost = await Group.findOne({
            _id: req.body.groupId,
            isDelete: false,
        });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Group not found !!" });

        var t_result = [];
        const temp1 = req.body.topics.map(async (topicId) => {
            var q_data = await Topic.findOne({
                _id: topicId,
                numberOfGroup: { $in: req.body.groupId },
            });

            if (q_data) t_result.push(q_data);
        });
        await Promise.all([...temp1]);

        if (t_result.length === 0)
            return res
                .status(200)
                .json({
                    status: false,
                    message:
                        "Topic that you choose among that some of is not assign to this group.",
                });

        var newPost = new Post({
            ...req.body,
            postedBy: admin_Id,
            thumbnail_images: thumb_images,
            medium_images: medium_images,
            images: original_images,
            videos: upload_videos,
        });

        const savedPost = await newPost.save();
        if (!savedPost)
            return res
                .status(200)
                .json({
                    status: false,
                    message: "smothing went wrong, post not created!!",
                });

        let obj_save = savedPost.toObject();
        delete obj_save.topics;
        if (savedPost) {
            await Group.findByIdAndUpdate(
                req.body.groupId,
                { $inc: { totalGrpPosts: 1 } },
                { new: true }
            );
            var new_t_array = [];
            if (savedPost.topics.length > 0) {
                const temp = savedPost.topics.map(async (item) => {
                    const new_t = await Topic.findByIdAndUpdate(
                        item._id,
                        { $inc: { totalPost: 1 } },
                        { new: true }
                    );
                    new_t_array.push(new_t);
                });
                await Promise.all([...temp]);
                obj_save.topics = new_t_array;
                // manageUserLog(req.admin_Id)
                return res
                    .status(200)
                    .json({
                        status: true,
                        message: "Post uploaded successfully!!",
                        data: obj_save,
                    });
            } else {
                // manageUserLog(req.admin_Id)
                return res
                    .status(200)
                    .json({
                        status: true,
                        message: "Post uploaded successfully!",
                        data: savedPost,
                    });
            }
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// poll vote updates
exports.updatePollVote = async (req, res) => {
    try {
        const { postId } = req.params;
        var getPost = await Post.findOne({ _id: postId, isDelete: false });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found !!" });

        var result = [];
        if (!getPost.pollTotalVotes.includes(req.authUserId)) {
            result = await Post.findOneAndUpdate(
                { postId, "pollChoices._id": req.body.pollChoicesID },
                {
                    $push: {
                        "pollChoices.$.votes": [req.authUserId],
                        pollTotalVotes: [req.authUserId],
                    },
                },
                { new: true }
            );
        } else {
            var pollchoice = "";
            var ins_res = [];
            for (var i = 0; i < getPost.pollChoices.length; i++) {
                if (
                    getPost.pollChoices[i].votes.includes(req.authUserId) &&
                    getPost.pollChoices[i]._id !== req.body.pollChoicesID
                ) {
                    ins_res[i] = {
                        _id: getPost.pollChoices[i]._id,
                        votes: getPost.pollChoices[i].votes.filter((v) => {
                            if (v !== req.authUserId) return v;
                        }),
                        value: getPost.pollChoices[i].value,
                    };
                } else if (
                    !getPost.pollChoices[i].votes.includes(req.authUserId) &&
                    getPost.pollChoices[i]._id === req.body.pollChoicesID
                ) {
                    ins_res[i] = {
                        _id: getPost.pollChoices[i]._id,
                        votes:
                            getPost.pollChoices[i].votes.length > 0
                                ? [...getPost.pollChoices[i].votes, req.authUserId]
                                : [req.authUserId],
                        value: getPost.pollChoices[i].value,
                    };
                } else {
                    ins_res[i] = getPost.pollChoices[i];
                }
            }

            result = await Post.findOneAndUpdate(
                { postId, pollChoices: ins_res },
                { new: true }
            );
        }
        manageUserLog(req.authUserId);
        return res
            .status(200)
            .json({ status: true, message: "Vote updated", data: result });
    } catch (error) {
        return res
            .status(200)
            .json({ status: false, message: "error1:" + error.message });
    }
};

exports.updatePollVote_AS = async (req, res) => {
    try {
        const { postId } = req.params;
        var getPost = await Post.findOne({ _id: postId, isDelete: false });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found !!" });

        var result = [];
        if (!getPost.pollTotalVotes.includes(req.admin_Id)) {
            result = await Post.findOneAndUpdate(
                { postId, "pollChoices._id": req.body.pollChoicesID },
                {
                    $push: {
                        "pollChoices.$.votes": [req.admin_Id],
                        pollTotalVotes: [req.admin_Id],
                    },
                },
                { new: true }
            );
        } else {
            var pollchoice = "";
            for (var i = 0; i < getPost.pollChoices.length; i++) {
                if (getPost.pollChoices[i].votes.includes(req.admin_Id))
                    pollchoice = getPost.pollChoices[i];
            }
            if (pollchoice) {
                result = await Post.findOneAndUpdate(
                    { postId, "pollChoices._id": pollchoice._id },
                    { $pull: { "pollChoices.$.votes": req.admin_Id } },
                    { new: true }
                );
            }
            result = await Post.findOneAndUpdate(
                { postId, "pollChoices._id": req.body.pollChoicesID },
                { $push: { "pollChoices.$.votes": req.admin_Id } },
                { new: true }
            );
        }
        // manageUserLog(req.admin_Id)
        return res
            .status(200)
            .json({ status: true, message: "Vote updated", data: result });
    } catch (error) {
        return res
            .status(200)
            .json({ status: false, message: "error1:" + error.message });
    }
};

// like and unlike posts
exports.likePost = async (req, res) => {
    try {
        const { postId } = req.params;
        var getPost = await Post.findOne({ _id: postId, isDelete: false });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found !!" });

        if (getPost.likes.includes(req.authUserId)) {
            await Post.findByIdAndUpdate(
                postId,
                { $pull: { likes: req.authUserId } },
                { new: true }
            );
        } else {
            await Post.updateOne(
                { _id: postId },
                { $addToSet: { likes: req.authUserId } }
            );
        }
        manageUserLog(req.authUserId);
        return res.status(200).json({ status: true, message: "Likes Updated!!" });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.likePost_AS = async (req, res) => {
    try {
        const { postId } = req.params;
        var getPost = await Post.findOne({ _id: postId, isDelete: false });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found !!" });
        if (getPost.likes.includes(req.admin_Id)) {
            await Post.findByIdAndUpdate(
                postId,
                { $pull: { likes: req.admin_Id } },
                { new: true }
            );
        } else {
            await Post.updateOne(
                { _id: postId },
                { $addToSet: { likes: req.admin_Id } }
            );
        }
        return res.status(200).json({ status: true, message: "Likes Updated!!" });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

//get a post by id
exports.getPostById = async (req, res) => {
    try {
        const postData = await Post.findOne({
            _id: req.params.postId,
            isDelete: false,
        }).populate("groupId", "groupTitle");
        if (postData)
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Post fetched by id!!",
                    data: postData,
                });
        else
            return res
                .status(200)
                .json({ status: false, message: "Post not found." });
    } catch (err) {
        return res
            .status(200)
            .json({ status: false, message: "smothing went wrong !!" });
    }
};

exports.getPostById_AS = async (req, res) => {
    try {
        const postData = await Post.findOne({ _id: req.params.postId });
        if (postData)
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Post fetched by id!!",
                    data: postData,
                });
        else
            return res
                .status(200)
                .json({ status: false, message: "Post not found." });
    } catch (err) {
        return res
            .status(200)
            .json({ status: false, message: "smothing went wrong !!" });
    }
};

// get all posts
exports.getPostAll = async (req, res) => {
    const { authUserId } = req;
    const { page, limit } = req.query;
    try {
        const user_data = await User.findById(authUserId).select(
            "accessible_groups"
        );
        const Posts = await Post.find({
            makeAnnouncement: false,
            hideFromFeed: false,
            isDelete: false,
            groupId: { $in: user_data.accessible_groups },
        })
            .populate({ path: "groupId", select: "groupTitle" })
            .sort({ updatedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Post.countDocuments({
            makeAnnouncement: false,
            hideFromFeed: false,
            isDelete: false,
            groupId: { $in: user_data.accessible_groups },
        });

        return res.status(200).json({
            status: true,
            message: "All Post content!!",
            data: [
                {
                    posts: Posts,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalPosts: count,
                },
            ],
        });
    } catch (err) {
        return res
            .status(200)
            .json({ status: false, message: "smothing went wrong !!" });
    }
};

// get user posts and sorted by date
exports.getAllPostByUsers = async (req, res) => {
    try {
        const getPosts = await Post.find({
            postedBy: req.authUserId,
            isDelete: false,
        })
            .sort({ updatedAt: -1 })
            .populate("groupId", "groupTitle")
            .sort({ createdAt: -1 });
        return res
            .status(200)
            .json({ status: true, message: "Post fetch by user!", data: getPosts });
    } catch (error) {
        return res
            .status(200)
            .json({ status: false, message: "smothing went wrong!" });
    }
};

//delete post
exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.body;
        if (!postId)
            return res
                .status(200)
                .json({ status: false, message: "post id not found !!" });
        const fetchedPost = await Post.findOne({ _id: postId, isDelete: false });
        if (!fetchedPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not Found !!" });

        if (fetchedPost.postedBy._id.toString() !== req.authUserId.toString()) {
            return res
                .status(200)
                .json({ status: true, message: "you don`t own this post" });
        } else {
            var d_topics = [];
            if (fetchedPost.topics.length > 0) {
                var topics_array = [...fetchedPost.topics];
                const convert_topics_tostring = topics_array.map((id) =>
                    id._id.toString()
                );
                const unique_topics_ids = convert_topics_tostring.filter(
                    (x, i) => i === convert_topics_tostring.indexOf(x)
                );
                d_topics = unique_topics_ids.map(async (id) => {
                    await Topic.findByIdAndUpdate(
                        id,
                        { $inc: { totalPost: -1 } },
                        { new: true }
                    );
                });
            }
            // return
            await Promise.all([...d_topics]);
            // update post count in this group record
            await Group.findByIdAndUpdate(
                fetchedPost.groupId,
                { $inc: { totalGrpPosts: -1 } },
                { new: true }
            );

            if (fetchedPost.postType === "share_post" && fetchedPost.shared_post) {
                await Post.findByIdAndUpdate(
                    fetchedPost.shared_post._id,
                    { $inc: { share_count: -1 } },
                    { new: true }
                );
            }

            await Post.findByIdAndUpdate(postId, { isDelete: true }, { new: true });

            manageUserLog(req.authUserId);
            return res
                .status(200)
                .json({ status: true, message: "Post Deleted successfully" });
        }
    } catch (error) {
        return res
            .status(200)
            .json({
                status: false,
                message: error.message + "somthing went wrong !!",
            });
    }
};

exports.deletePost_AS = async (req, res) => {
    try {
        const { postId, user_type } = req.body;
        if (!postId)
            return res
                .status(200)
                .json({ status: false, message: "post id not found !!" });
        const fetchedPost = await Post.findOne({ _id: postId, isDelete: false });
        if (!fetchedPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not Found !!" });

        var d_topics = [];
        if (fetchedPost.topics.length > 0) {
            var topics_array = [...fetchedPost.topics];
            const convert_topics_tostring = topics_array.map((id) =>
                id._id.toString()
            );
            const unique_topics_ids = convert_topics_tostring.filter(
                (x, i) => i === convert_topics_tostring.indexOf(x)
            );
            d_topics = unique_topics_ids.map(async (id) => {
                await Topic.findByIdAndUpdate(
                    id,
                    { $inc: { totalPost: -1 } },
                    { new: true }
                );
            });
        }
        // return
        await Promise.all([...d_topics]);
        // update post count in this group record
        await Group.findByIdAndUpdate(
            fetchedPost.groupId,
            { $inc: { totalGrpPosts: -1 } },
            { new: true }
        );

        if (fetchedPost.postType === "share_post") {
            await Post.findByIdAndUpdate(
                fetchedPost.shared_post._id,
                { $inc: { share_count: -1 } },
                { new: true }
            );
        }

        await Post.findByIdAndUpdate(postId, { isDelete: true }, { new: true });

        return res
            .status(200)
            .json({ status: true, message: "Post Deleted successfully" });
    } catch (error) {
        return res
            .status(200)
            .json({ status: false, message: "somthing went wrong !!" });
    }
};

// edit post
exports.editPost = async (req, res) => {
    try {
        const info = req.body;
        var userRole = "user";
        const {
            authUserId,
            thumb_images,
            medium_images,
            original_images,
            upload_videos,
        } = req;

        const getPost = await Post.findOne({ _id: info.postId, isDelete: false });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found with this post Id!" });

        if (
            getPost.postedBy._id.toString() !== authUserId.toString() &&
            userRole === "user"
        ) {
            return res
                .status(200)
                .json({ status: true, message: "you don't own this post" });
        }

        if (getPost.hideFromFeed && userRole === "user")
            return res
                .status(200)
                .json({
                    status: false,
                    message: "This post is hide by admin so you can't edit this post.",
                });
        console.log(getPost.groupId, info.groupId._id);
        if (getPost.groupId.toString() !== info.groupId.toString()) {
            return res
                .status(200)
                .json({
                    status: true,
                    message: "You cann't edit group id for already created post.",
                });
        }

        if (info.topics.length <= 0)
            return res
                .status(200)
                .json({ status: false, message: "Please select at least one topic." });
        var data = {};

        var exist_topics = [...getPost.topics];
        const convert_topics_tostring = exist_topics.map((id) => id._id.toString());
        const unique_topics_ids = convert_topics_tostring.filter(
            (x, i) => i === convert_topics_tostring.indexOf(x)
        );
        unique_topics_ids.map(async (id) => {
            await Topic.findByIdAndUpdate(
                id,
                { $inc: { totalPost: -1 } },
                { new: true }
            );
        });

        var update_topics = [];

        if (info.topics.length > 0) {
            var t_result = [];
            const temp1 = info.topics.map(async (topicId) => {
                var q_data = await Topic.findOne({
                    _id: topicId,
                    numberOfGroup: { $in: info.groupId },
                });
                if (q_data) t_result.push(q_data);
            });
            await Promise.all([...temp1]);

            if (t_result.length === 0)
                return res
                    .status(200)
                    .json({
                        status: false,
                        message:
                            "Topic that you choose among that some of is not assign to this group.",
                    });

            update_topics = [...info.topics];

            const unique_new_topics_ids = info.topics.filter(
                (x, i) => i === info.topics.indexOf(x)
            );
            unique_new_topics_ids.map(async (id) => {
                await Topic.findByIdAndUpdate(
                    id,
                    { $inc: { totalPost: 1 } },
                    { new: true }
                );
            });
        }

        // if post created by admin
        if (info.makeAnnouncement) {
            if (userRole === "user") {
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "You don't have access to make announcement for post.",
                    });
            }
        }
        if (info.hideFromFeed) {
            if (userRole === "user") {
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "You don't have access to hide post from feed.",
                    });
            }
        }
        // *
        // ** checking updated post type : "Post" || "Poll"
        // *
        if (getPost.postType === "Post") {
            var update_thumb_img = [...getPost.thumbnail_images];
            var update_medium_img = [...getPost.medium_images];
            var update_original_img = [...getPost.images];
            var update_video = [...getPost.videos];

            if (typeof info.removeVideo !== "undefined") {
                if (info.removeVideo.length > 0) {
                    var delete_video = info.removeVideo.map(async (video) => {
                        var split_video_filename = video.split("/").pop();
                        var uid = split_video_filename.split("_")[0];

                        var path_array = update_video.map((item) => item.split("/").pop());
                        var v_uid = path_array.map((item) => item.split("_", 1)).flat();
                        const t_deleindex = v_uid.indexOf(uid);
                        var temp1 = update_video.splice(t_deleindex, 1);

                        const aa1 = await s3
                            .deleteObject({
                                Bucket: process.env.AWS_BUCKET,
                                Key: temp1[0],
                            })
                            .promise();
                    });
                    await Promise.all([...delete_video]);
                }
            }

            if (typeof info.removeImg !== "undefined") {
                if (info.removeImg.length > 0) {
                    var delete_media = info.removeImg.map(async (img) => {
                        var split_img_name = img.split("/").pop();
                        var uid = split_img_name.split("_")[0];
                        //remove thum images
                        var thum_arr = update_thumb_img.map((item) =>
                            item.split("/").pop()
                        );
                        var thum_uid = thum_arr.map((item) => item.split("_", 1)).flat();
                        const t_deleindex = thum_uid.indexOf(uid);
                        var temp1 = update_thumb_img.splice(t_deleindex, 1);
                        const aa1 = await s3
                            .deleteObject({
                                Bucket: process.env.AWS_BUCKET,
                                Key: temp1[0],
                            })
                            .promise();
                        //remove medium images
                        var m_arr = update_medium_img.map((item) => item.split("/").pop());
                        var m_uid = m_arr.map((item) => item.split("_", 1)).flat();
                        const m_deleindex = m_uid.indexOf(uid);
                        var temp2 = update_medium_img.splice(m_deleindex, 1);
                        const aa2 = await s3
                            .deleteObject({
                                Bucket: process.env.AWS_BUCKET,
                                Key: temp2[0],
                            })
                            .promise();
                        // remove original images
                        var o_arr = update_original_img.map((item) =>
                            item.split("/").pop()
                        );
                        var o_uid = o_arr.map((item) => item.split("_", 1)).flat();
                        const o_deleindex = o_uid.indexOf(uid);
                        var temp3 = update_original_img.splice(o_deleindex, 1);
                        const aa3 = await s3
                            .deleteObject({
                                Bucket: process.env.AWS_BUCKET,
                                Key: temp3[0],
                            })
                            .promise();
                    });
                    await Promise.all([...delete_media]);
                }
            }

            var combine_o_images = [...original_images, ...update_original_img];
            var combine_t_images = [...thumb_images, ...update_thumb_img];
            var combine_m_images = [...medium_images, ...update_medium_img];
            var combine_video = [...upload_videos, ...update_video];

            data = {
                description:
                    typeof info.description !== "undefined"
                        ? info.description
                        : getPost.description,
                feelingsActivity:
                    typeof info.feelingsActivity !== "undefined"
                        ? info.feelingsActivity
                        : getPost.feelingsActivity
                            ? getPost.feelingsActivity._id
                            : null,
                images: combine_o_images,
                thumbnail_images: combine_t_images,
                medium_images: combine_m_images,
                videos: combine_video,
                topics: update_topics,
                postStatus:
                    typeof info.postStatus === "undefined"
                        ? getPost.postStatus
                        : info.postStatus,
                tagAFriend:
                    typeof info.tagAFriend === "undefined"
                        ? info.removealltagAFriend
                            ? []
                            : getPost.tagAFriend
                        : info.tagAFriend,
                makeAnnouncement:
                    userRole === "admin"
                        ? info.makeAnnouncement
                        : getPost.makeAnnouncement,
                hideFromFeed:
                    userRole === "admin" ? info.hideFromFeed : getPost.hideFromFeed,
            };
        } else if (getPost.postType === "Poll") {
            if (getPost.pollTotalVotes <= 0) {
                var update_pollchoices = [...getPost.pollChoices];
                if (typeof info.pollChoices !== "undefined") {
                    update_pollchoices = [...info.pollChoices];
                }

                data = {
                    pollDuration:
                        typeof info.pollDuration !== "undefined"
                            ? info.pollDuration
                            : getPost.pollDuration,
                    pollChoices: update_pollchoices,
                    description:
                        typeof info.description !== "undefined"
                            ? info.description
                            : getPost.description,
                    feelingsActivity:
                        typeof info.feelingsActivity !== "undefined"
                            ? info.feelingsActivity
                            : getPost.feelingsActivity
                                ? getPost.feelingsActivity._id
                                : null,
                    topics: update_topics,
                    postStatus:
                        typeof info.postStatus !== "undefined"
                            ? info.postStatus
                            : getPost.postStatus,
                    tagAFriend:
                        typeof info.tagAFriend !== "undefined"
                            ? info.tagAFriend
                            : info.removealltagAFriend
                                ? []
                                : getPost.tagAFriend,
                    makeAnnouncement:
                        userRole === "admin"
                            ? info.makeAnnouncement
                            : getPost.makeAnnouncement,
                    hideFromFeed:
                        userRole === "admin" ? info.hideFromFeed : getPost.hideFromFeed,
                };
            } else {
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "Polls can't be edited after they've received votes.",
                    });
            }
        }

        const updatedPost = await Post.findOneAndUpdate(
            { _id: info.postId },
            { $set: data },
            { new: true }
        );
        if (!updatedPost) {
            return res
                .status(200)
                .json({ status: false, message: "Post not updated!!" });
        } else {
            manageUserLog(authUserId);
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Post updated successfully!",
                    data: updatedPost,
                });
        }
    } catch (error) {
        return res
            .status(200)
            .json({ status: false, message: "Provide proper data!" });
    }
};

exports.editPost_AS = async (req, res) => {
    try {
        const info = req.body;
        const { thumb_images, medium_images, original_images, upload_videos } = req;

        const getPost = await Post.findOne({ _id: info.postId, isDelete: false });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found with this post Id!" });

        if (getPost.groupId.toString() !== info.groupId.toString()) {
            return res
                .status(200)
                .json({
                    status: true,
                    message: "You cann't edit group id for already created post.",
                });
        }

        if (info.topics.length <= 0)
            return res
                .status(200)
                .json({ status: false, message: "Please select at least one topic." });
        var data = {};

        var exist_topics = [...getPost.topics];
        const convert_topics_tostring = exist_topics.map((id) => id._id.toString());
        const unique_topics_ids = convert_topics_tostring.filter(
            (x, i) => i === convert_topics_tostring.indexOf(x)
        );
        unique_topics_ids.map(async (id) => {
            await Topic.findByIdAndUpdate(
                id,
                { $inc: { totalPost: -1 } },
                { new: true }
            );
        });

        var update_topics = [];

        if (info.topics.length > 0) {
            var t_result = [];
            const temp1 = info.topics.map(async (topicId) => {
                var q_data = await Topic.findOne({
                    _id: topicId,
                    numberOfGroup: { $in: info.groupId },
                });
                if (q_data) t_result.push(q_data);
            });
            await Promise.all([...temp1]);

            if (t_result.length === 0)
                return res
                    .status(200)
                    .json({
                        status: false,
                        message:
                            "Topic that you choose among that some of is not assign to this group.",
                    });

            update_topics = [...info.topics];

            const unique_new_topics_ids = info.topics.filter(
                (x, i) => i === info.topics.indexOf(x)
            );
            unique_new_topics_ids.map(async (id) => {
                await Topic.findByIdAndUpdate(
                    id,
                    { $inc: { totalPost: 1 } },
                    { new: true }
                );
            });
        }

        // *
        // ** checking updated post type : "Post" || "Poll"
        // *
        if (getPost.postType === "Post") {
            var update_thumb_img = [...getPost.thumbnail_images];
            var update_medium_img = [...getPost.medium_images];
            var update_original_img = [...getPost.images];
            var update_video = [...getPost.videos];

            if (typeof info.removeVideo !== "undefined") {
                if (info.removeVideo.length > 0) {
                    var delete_video = info.removeVideo.map(async (video) => {
                        var split_video_filename = video.split("/").pop();
                        var uid = split_video_filename.split("_")[0];

                        var path_array = update_video.map((item) => item.split("/").pop());
                        var v_uid = path_array.map((item) => item.split("_", 1)).flat();
                        const t_deleindex = v_uid.indexOf(uid);
                        var temp1 = update_video.splice(t_deleindex, 1);

                        const aa1 = await s3
                            .deleteObject({
                                Bucket: process.env.AWS_BUCKET,
                                Key: temp1[0],
                            })
                            .promise();
                    });
                    await Promise.all([...delete_video]);
                }
            }

            if (typeof info.removeImg !== "undefined") {
                if (info.removeImg.length > 0) {
                    var delete_media = info.removeImg.map(async (img) => {
                        var split_img_name = img.split("/").pop();
                        var uid = split_img_name.split("_")[0];
                        //remove thum images
                        var thum_arr = update_thumb_img.map((item) =>
                            item.split("/").pop()
                        );
                        var thum_uid = thum_arr.map((item) => item.split("_", 1)).flat();
                        const t_deleindex = thum_uid.indexOf(uid);
                        var temp1 = update_thumb_img.splice(t_deleindex, 1);
                        const aa1 = await s3
                            .deleteObject({
                                Bucket: process.env.AWS_BUCKET,
                                Key: temp1[0],
                            })
                            .promise();
                        //remove medium images
                        var m_arr = update_medium_img.map((item) => item.split("/").pop());
                        var m_uid = m_arr.map((item) => item.split("_", 1)).flat();
                        const m_deleindex = m_uid.indexOf(uid);
                        var temp2 = update_medium_img.splice(m_deleindex, 1);
                        const aa2 = await s3
                            .deleteObject({
                                Bucket: process.env.AWS_BUCKET,
                                Key: temp2[0],
                            })
                            .promise();
                        // remove original images
                        var o_arr = update_original_img.map((item) =>
                            item.split("/").pop()
                        );
                        var o_uid = o_arr.map((item) => item.split("_", 1)).flat();
                        const o_deleindex = o_uid.indexOf(uid);
                        var temp3 = update_original_img.splice(o_deleindex, 1);
                        const aa3 = await s3
                            .deleteObject({
                                Bucket: process.env.AWS_BUCKET,
                                Key: temp3[0],
                            })
                            .promise();
                    });
                    await Promise.all([...delete_media]);
                }
            }

            var combine_o_images = [...original_images, ...update_original_img];
            var combine_t_images = [...thumb_images, ...update_thumb_img];
            var combine_m_images = [...medium_images, ...update_medium_img];
            var combine_video = [...upload_videos, ...update_video];

            data = {
                description:
                    typeof info.description !== "undefined"
                        ? info.description
                        : getPost.description,
                feelingsActivity:
                    typeof info.feelingsActivity !== "undefined"
                        ? info.feelingsActivity
                        : getPost.feelingsActivity
                            ? getPost.feelingsActivity._id
                            : null,
                images: combine_o_images,
                thumbnail_images: combine_t_images,
                medium_images: combine_m_images,
                videos: combine_video,
                topics: update_topics,
                postStatus:
                    typeof info.postStatus === "undefined"
                        ? getPost.postStatus
                        : info.postStatus,
                tagAFriend:
                    typeof info.tagAFriend === "undefined"
                        ? getPost.tagAFriend
                        : info.tagAFriend,
                makeAnnouncement: info.makeAnnouncement ?? getPost.makeAnnouncement,
                hideFromFeed: info.hideFromFeed ?? getPost.hideFromFeed,
            };
        } else if (getPost.postType === "Poll") {
            if (getPost.pollTotalVotes <= 0) {
                var update_pollchoices = [...getPost.pollChoices];
                if (typeof info.pollChoices !== "undefined") {
                    update_pollchoices = [...info.pollChoices];
                }

                data = {
                    pollDuration:
                        typeof info.pollDuration !== "undefined"
                            ? info.pollDuration
                            : getPost.pollDuration,
                    pollChoices: update_pollchoices,
                    description:
                        typeof info.description !== "undefined"
                            ? info.description
                            : getPost.description,
                    feelingsActivity:
                        typeof info.feelingsActivity !== "undefined"
                            ? info.feelingsActivity
                            : getPost.feelingsActivity
                                ? getPost.feelingsActivity._id
                                : null,
                    topics: update_topics,
                    postStatus:
                        typeof info.postStatus !== "undefined"
                            ? info.postStatus
                            : getPost.postStatus,
                    tagAFriend:
                        typeof info.tagAFriend !== "undefined"
                            ? info.tagAFriend
                            : getPost.tagAFriend,
                    makeAnnouncement: info.makeAnnouncement ?? getPost.makeAnnouncement,
                    hideFromFeed: info.hideFromFeed ?? getPost.hideFromFeed,
                };
            } else {
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "Polls can't be edited after they've received votes.",
                    });
            }
        }

        const updatedPost = await Post.findOneAndUpdate(
            { _id: info.postId },
            { $set: data },
            { new: true }
        );
        if (!updatedPost) {
            return res
                .status(200)
                .json({ status: false, message: "Post not updated!!" });
        } else {
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Post updated successfully!",
                    data: updatedPost,
                });
        }
    } catch (error) {
        return res
            .status(200)
            .json({ status: false, message: "Provide proper data!" });
    }
};

exports.savePostByUser = async (req, res) => {
    try {
        const { postId } = req.params;
        const { authUserId } = req;
        var getPost = await Post.findOne({ _id: postId, isDelete: false });

        if (!getPost)
            return res.status(200).json({ status: false, message: "Post not found !!" });

        var checkPost = await Post.findOne({ _id: postId, postStatus: "Private", postedBy: { $ne: authUserId }, });

        if (checkPost)
            return res.status(200).json({ status: false, message: "You cann't save someone private post.", });

        var userData = await User.findById(authUserId);
        var result = [];
        if (userData.savePosts.includes(postId)) {

            result = await User.findByIdAndUpdate(authUserId, { $pull: { savePosts: postId } }, { new: true }).populate("savePosts");
        } else {

            result = await User.findByIdAndUpdate(authUserId, { $push: { savePosts: postId } }, { new: true }).populate("savePosts");
        }
        manageUserLog(req.authUserId);

        return res.status(200).json({ status: true, message: "Post saved!!", data: result });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.saveVideoByUser = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { authUserId } = req;
        var getVideo = await ContentArchiveVideo.findOne({ _id: videoId, isDelete: false });
        // console.log(getVideo, "getVideo");

        if (!getVideo)
            return res.status(200).json({ status: false, message: "Video not found !!" });

        var userData = await User.findById(authUserId);
        // console.log(userData, "userData");

        var result = [];

        if (userData.saveVideos.includes(videoId)) {
            result = await User.findByIdAndUpdate(authUserId, { $pull: { saveVideos: videoId } }, { new: true }).populate("saveVideos");
        } else {
            result = await User.findByIdAndUpdate(authUserId, { $push: { saveVideos: videoId } }, { new: true }).populate("saveVideos");
        }
        manageUserLog(req.authUserId);

        return res.status(200).json({ status: true, message: "Post saved!!", data: result });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getsavedVideo = async (req, res) => {
    try {
        const { authUserId } = req;
        var userData = await User.findById(authUserId)

        var data = await ContentArchiveVideo.aggregate([
            {
                $match: {
                    _id: { $in: userData.saveVideos },
                    isDelete: false,
                    uploadstatus: { $ne: "inprocess" },
                }
            },
            {
                $lookup: {
                    from: "contentarchive_categories",
                    let: { contentarchive_categories_id: "$categories" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$contentarchive_categories_id"],
                                },
                            },
                        },
                        { $project: { name: 1 } },
                    ],
                    as: "categories",
                },
            },
            {
                $lookup: {
                    from: "contentarchive_subcategories",
                    localField: "subcategory" ,
                    foreignField: "_id",
                    pipeline: [
                        { $project: { name: 1 } },
                    ],
                    as: "subcategory",
                },
            },
            {
                $lookup: {
                    from: "groups",
                    let: { suggestion_id: "$group_ids" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$suggestion_id"],
                                },
                            },
                        },
                        { $project: { groupTitle: 1 } },
                    ],
                    as: "group_ids",
                },
            },
            {
                $addFields: {
                    viewsCount: {
                        $cond: {
                            if: { $isArray: "$views" },
                            then: { "$add": [{ $size: "$views" }, "$starting_view_cnt"] },
                            else: "$starting_view_cnt",
                        },
                    },
                },
            },
            {
                $addFields: {
                    commentsCount: {
                        $cond: {
                            if: { $isArray: "$comments" },
                            then: { $size: "$comments" },
                            else: 0,
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    video: 1,
                    description: 1,
                    thumbnail: 1,
                    createdAt: 1,
                    viewsCount: 1,
                    commentsCount: 1,
                    duration: 1,
                    categories: 1,
                    views: 1,
                    likes: 1,
                    user_video_pause: 1
                }
            }
        ]);

        var arr = []
        for (var i = 0; i < data.length; i++) {
            var url = s3.getSignedUrl("getObject", { Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp", Key: data[i].video, Expires: 100000 });
            arr.push({ ...data[i], video: url });
        }
        data = arr;

        var mobile_desc = data?.map(async (item, index) => {
            let mobile_description = "";
            if (item.description !== undefined) {
                let without_html_description = item.description.replace(/&amp;/g, "&");
                without_html_description = item.description.replace(/(<([^>]+)>)/g, "");
                without_html_description = without_html_description.replace(/(\r\n|\n|\r)/gm, "");
                mobile_description = without_html_description.substring(0, 600);
            }
            item.mobile_description = mobile_description.trim();
        });
        await Promise.all([...mobile_desc]);

        if (!data)
            return res.status(200).json({ status: false, message: "User not found!!" });
        else
            return res.status(200).json({ status: true, message: "Saved Videos!", data: data, });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getsavedpost = async (req, res) => {
    try {
        const { authUserId } = req;
        var userData = await User.findById(authUserId).populate({
            path: "savePosts",
            populate: {
                path: "groupId",
                select: "groupTitle",
            },
        });
        if (!userData)
            return res
                .status(200)
                .json({ status: false, message: "User not found!" });
        else
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Saved posts!",
                    data: userData.savePosts,
                });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.hideFromFeedPost = async (req, res) => {
    try {
        const { postId, groupId } = req.params;
        const findPost = await Post.findOne({ _id: postId, groupId: groupId });
        if (!findPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found!!" });

        const updatedPost = await Post.findOneAndUpdate(
            { _id: findPost._id },
            { $set: { hideFromFeed: !findPost.hideFromFeed } },
            { new: true }
        );
        if (!updatedPost) {
            return res
                .status(200)
                .json({ status: false, message: "Post not updated!!" });
        } else {
            manageUserLog(req.admin_Id);
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Post hide from feed successfully!",
                    data: updatedPost,
                });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getAllAnnouncementPost_forAuthUser_whithinAllGroups = async (req, res) => {
    const { page, limit } = req.query;
    try {
        const { authUserId } = req;
        const getUserAllGroups = await GroupMember.find({
            userId: authUserId,
            status: 2,
        }).select("groupId");
        if (getUserAllGroups) {
            const final_posts = [];
            var temp = getUserAllGroups.map(async (item) => {
                const group_exist = await Group.findById(item.groupId);
                if (group_exist) {
                    const getPosts = await Post.find({
                        groupId: item.groupId,
                        makeAnnouncement: true,
                    });
                    final_posts.push(getPosts);
                }
            });
            await Promise.all([...temp]);
            const count = final_posts.length;
            return res.status(200).json({
                status: true,
                data: [
                    {
                        final_posts,
                        totalPages: Math.ceil(count / limit),
                        currentPage: page,
                        totalPosts: count,
                    },
                ],
                message: "All announcement posts for this user.",
            });
        } else {
            return res
                .status(200)
                .json({ status: false, data: [], message: "User has no group." });
        }
    } catch (error) {
        return res
            .status(200)
            .json({ status: false, data: [], message: error.message });
    }
};

exports.makeAnnouncement = async (req, res) => {
    try {
        const { postId, groupId } = req.params;
        const findPost = await Post.findOne({ _id: postId, groupId: groupId });
        if (!findPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found!!" });

        const updatedPost = await Post.findOneAndUpdate(
            { _id: findPost._id },
            { $set: { makeAnnouncement: !findPost.makeAnnouncement } },
            { new: true }
        );
        if (!updatedPost) {
            return res
                .status(200)
                .json({ status: false, message: "Post not updated!!" });
        } else {
            manageUserLog(req.admin_Id);
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Post is make annoucement updated successfully!",
                    data: updatedPost,
                });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getMediaForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { type } = req.query;
        const data = await Post.find({
            postedBy: userId,
            postType: "Post",
            makeAnnouncement: false,
            hideFromFeed: false,
        })
            .sort({ updatedAt: -1 })
            .select("medium_images images videos -postedBy");

        var media_array = [];
        if (data.length > 0) {
            var temp = data.map(async (item) => {
                if (type === "images") {
                    item.images.length > 0 &&
                        item.images.map((image) => {
                            media_array.push({ image, type: "image" });
                        });
                } else if (type === "videos") {
                    item.videos.length > 0 &&
                        item.videos.map((video) => {
                            media_array.push({ video, type: "video" });
                        });
                } else {
                    item.images.length > 0 &&
                        item.images.map((image) => {
                            media_array.push({ image, type: "image" });
                        });
                    item.videos.length > 0 &&
                        item.videos.map((video) => {
                            media_array.push({ video, type: "video" });
                        });
                }
            });
            await Promise.all([...temp]);
        }

        return res
            .status(200)
            .json({ status: true, message: "Media files", data: media_array });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.sharepost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { authUserId } = req;
        var getPost = await Post.findOne({ _id: postId, isDelete: false });
        if (!getPost)
            return res
                .status(200)
                .json({ status: false, message: "Post not found !!" });

        var checkPost = await Post.findOne({
            _id: postId,
            postStatus: "Private",
            postedBy: { $ne: authUserId },
        });
        if (checkPost)
            return res
                .status(200)
                .json({
                    status: false,
                    message: "You cann't share someone private post.",
                });

        var new_post = new Post({
            groupId: getPost.groupId._id,
            postedBy: authUserId,
            user_type: "airtable-syncs",
            shared_post: postId,
            postType: "share_post",
        });
        var result = await new_post.save();
        var response = await Post.findById(result._id).populate(
            "groupId",
            "groupTitle"
        );

        var update = await Post.findByIdAndUpdate(
            { _id: postId },
            { $inc: { share_count: 1 } }
        );
        manageUserLog(req.authUserId);

        if (!result)
            res
                .status(200)
                .json({
                    status: false,
                    message: "Something went wrong post not shared!",
                });
        else
            res
                .status(200)
                .json({
                    status: true,
                    message: "Post shared suceessfully!",
                    data: response,
                });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};