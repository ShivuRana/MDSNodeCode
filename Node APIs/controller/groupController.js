const Topic = require("../database/models/topic");
const Group = require("../database/models/group");
const GroupMember = require("../database/models/groupMember");
const GroupFile = require("../database/models/groupFile");
const User = require("../database/models/airTableSync");
const Post = require("../database/models/post");
const StarredGroup = require("../database/models/starredGroup");
const MembershiPlan = require("../database/models/membershipPlanManagement/membership_plan");
const { manageUserLog } = require("../middleware/userActivity");
const { sendEmail } = require("../config/common");

const {
    checkGroup_userCanAccessResource,
} = require("../middleware/resourceAccess");

require("dotenv").config();
const AWS = require("aws-sdk");

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

//create a group (only by admin)
exports.createGroup = async (req, res) => {
    try {
        const { admin_Id, group_image, cover_image } = req;
        if (!req.body)
            return res.status(403).json({ status: false, message: "please add some content !!" });

        const newGrp = new Group({
            ...req.body,
            groupImage: group_image,
            groupCoverImage: cover_image,
        });

        if (!newGrp)
            return res.status(200).json({ status: false, message: "smothing went wrong !!" });

        var savedEntry = [];
        savedEntry = await newGrp.save();

        // add topic into collection by group
        if (savedEntry) {

            // add admin into group member as default
            const admin_groupMember = new GroupMember({
                userId: admin_Id,
                groupId: savedEntry._id,
                status: 2,
                user_type: "adminuser",
            });

            if (!admin_groupMember)
                return res.status(200).json({ status: false, message: "smothing went wrong." });

            const addMember = await admin_groupMember.save();
            if (addMember) {
                savedEntry = await Group.findByIdAndUpdate(
                    savedEntry._id,
                    { $inc: { totalGrpMember: 1 } },
                    { new: true }
                );
            }

            const temp = req.body.topics.map(async (topic) => {
                const existValue = await Topic.find({ topic: topic });
                if (existValue.length === 0) {
                    const saveTopics = new Topic({
                        topic,
                        numberOfGroup: [savedEntry._id],
                    });
                    await saveTopics.save();
                } else {
                    await Topic.findByIdAndUpdate(
                        existValue[0]._id,
                        { $push: { numberOfGroup: savedEntry._id } },
                        { new: true }
                    );
                }
            });
            await Promise.all([...temp]);
            // manageUserLog(admin_Id)
            return res.status(200).json({ status: true, message: "Group created successfully!", data: savedEntry, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// clone group API
exports.cloneGroup = async (req, res) => {
    try {
        const { groupId } = req.body;

        const objData = await Group.findOne({
            _id: groupId,
            isDelete: false,
        }).select("-_id -__v -updatedAt -createdAt -totalGrpMember -totalGrpPosts");
        if (!objData)
            return res.status(200).json({ status: false, message: "Group not Found !!" });

        let obj = objData.toObject();
        if (objData.groupImage) {
            const split11 = objData.groupImage.split("cover-");
            const split22 = split11[split11.length - 1].split("-");
            var params1 = {
                Bucket: process.env.AWS_BUCKET,
                CopySource: process.env.AWS_BUCKET + "/" + objData.groupImage,
                Key: "group/images/thumb-copy-" + Date.now() + "-" + split22[split22.length - 1],
                ACL: "public-read",
            };
            const abb = await s3.copyObject(params1).promise();
            obj.groupImage = params1.Key;
        }

        if (objData.groupCoverImage) {
            const split1 = objData.groupCoverImage.split("cover-");
            const split2 = split1[split1.length - 1].split("-");

            var params2 = {
                Bucket: process.env.AWS_BUCKET,
                CopySource: process.env.AWS_BUCKET + "/" + objData.groupCoverImage,
                Key: "group/images/cover-copy-" + Date.now() + "-" + split2[split2.length - 1],
                ACL: "public-read",
            };
            await s3.copyObject(params2).promise();
            obj.groupCoverImage = params2.Key;
        }

        obj.groupTitle = obj.groupTitle + " - " + "Copy";
        const docClone = new Group(obj);
        var newGroup = [];
        newGroup = await docClone.save();

        // add admin into group member as default
        if (newGroup) {
            const admin_groupMember = new GroupMember({
                userId: req.admin_Id,
                groupId: newGroup._id,
                status: 2,
                user_type: "adminuser",
            });
            if (!admin_groupMember)
                return res.status(200).json({ status: false, message: "smothing went wrong." });

            const addMember = await admin_groupMember.save();
            if (addMember) {
                newGroup = await Group.findByIdAndUpdate(
                    newGroup._id,
                    { $inc: { totalGrpMember: 1 } },
                    { new: true }
                );
            }

            const alreadyTopics = await Topic.find({
                numberOfGroup: { $in: groupId },
            });
            temp = alreadyTopics.map(async (topic) => {
                await Topic.findByIdAndUpdate(
                    topic._id,
                    { $push: { numberOfGroup: newGroup._id } },
                    { new: true }
                );
            });
            await Promise.all([...temp]);
        }
        // manageUserLog(req.admin_Id)
        return res.status(200).json({ status: true, message: "Group created successfully!", data: newGroup, });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

//update group profile image
exports.updateGroupProfileImg = async (req, res) => {
    try {
        const { groupId } = req.params;
        const getData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!getData)
            return res.status(200).json({ status: false, message: "Group not Found !!" });
        // if user has uploaded new profile image then delete old from s3 bucket
        if (getData.groupImage) {
            await s3.deleteObject({
                Bucket: process.env.AWS_BUCKET,
                Key: getData.groupImage,
            }).promise();
        }

        const updateData = await Group.findOneAndUpdate(
            { _id: groupId },
            { $set: { groupImage: req.group_image } },
            { new: true }
        );

        if (!updateData)
            return res.status(200).json({ status: false, message: "Profile image not updated!!" });
        else {
            // manageUserLog(req.admin_Id)
            return res.status(200).json({
                status: true, message: "Profile image updated successfully!",
                data: [
                    {
                        group_id: updateData._id,
                        profile_img: updateData.groupImage,
                    },
                ],
            });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

//update group details
exports.updateGroupDetails = async (req, res) => {
    try {
        const { group_image, cover_image } = req;

        const body = req.body;
        const { groupId } = req.params;
        const getData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!getData)
            return res.status(200).json({ status: false, message: "Group not Found !!" });

        // if user has uploaded new profile image or cover image then delete old from s3 bucket
        var temp3 = [];
        if (group_image && getData.groupImage) {
            await s3.deleteObject({
                Bucket: process.env.AWS_BUCKET,
                Key: getData.groupImage,
            }).promise();
        }

        if (cover_image && getData.groupCoverImage) {
            await s3.deleteObject({
                Bucket: process.env.AWS_BUCKET,
                Key: getData.groupCoverImage,
            }).promise();
        }

        const alreadyTopics = await Topic.find({ numberOfGroup: { $in: groupId } });
        temp3 = alreadyTopics.map(async (topic) => {
            await Topic.findByIdAndUpdate(
                topic._id,
                { $pull: { numberOfGroup: groupId } },
                { new: true }
            );
        });

        const temp = body.topics.map(async (topic) => {
            const existValue = await Topic.find({ topic: topic });
            if (existValue.length === 0) {
                const saveTopics = new Topic({ topic, numberOfGroup: [groupId] });
                await saveTopics.save();
            } else {
                await Topic.findByIdAndUpdate(
                    existValue[0]._id,
                    { $push: { numberOfGroup: groupId } },
                    { new: true }
                );
            }
        });
        await Promise.all([...temp3, ...temp]);

        const updateData = await Group.findOneAndUpdate(
            { _id: groupId },
            {
                $set: {
                    groupTitle: body.groupTitle,
                    groupInfo: body.groupInfo,
                    groupImage: group_image ? group_image : getData.groupImage,
                    groupCoverImage: cover_image ? cover_image : getData.groupCoverImage,
                },
            },
            { new: true }
        );

        if (!updateData)
            return res.status(200).json({ status: false, message: "Group not updated!!" });

        // manageUserLog(req.admin_Id)
        return res.status(200).json({ status: true, message: "Group updated successfully!", data: updateData, });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get all groups with their details
exports.getAllGroups = async (req, res) => {
    try {
        const data = await Group.find({ isDelete: false }).sort({ updatedAt: -1 });
        return res.status(200).json({ status: true, message: "Fetched all groups", data: data });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get group details by group id
exports.getGroupByID = async (req, res) => {
    try {
        let { authUserId } = req;
        var user_access_grps = await User.findById(authUserId).select(
            "accessible_groups"
        );
        var user_access_grps_ids = user_access_grps.accessible_groups.map(
            (grpid) => {
                return grpid.toString();
            }
        );
        const { groupId } = req.params;
        var data = await Group.findOne({ _id: groupId, isDelete: false });
        var accessible_group = false;
        if (user_access_grps_ids.includes(data._id.toString())) {
            accessible_group = true;
        }
        var finaldata = {
            _id: data._id,
            groupTitle: data.groupTitle,
            groupInfo: data.groupInfo,
            groupImage: data.groupImage,
            groupCoverImage: data.groupCoverImage,
            groupPostedBy: data.groupPostedBy,
            maximumGrpMember: data.maximumGrpMember,
            createGroupChat: data.createGroupChat,
            messageSendBy: data.messageSendBy,
            groupType: data.groupType,
            groupVisibility: data.groupVisibility,
            totalGrpMember: data.totalGrpMember,
            totalGrpPosts: data.totalGrpPosts,
            isDelete: data.isDelete,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            accessible_group: accessible_group,
        };
        return res.status(200).json({ status: true, message: "Fetched group.", data: finaldata });
    } catch (err) {
        return res.status(200).json({ status: false, message: "smothing went wrong !!" });
    }
};

// get group details by group id
exports.getGroupByID_admin = async (req, res) => {
    try {
        const { groupId } = req.params;
        var data = await Group.findOne({ _id: groupId, isDelete: false });
        console.log(data);
        return res.status(200).json({ status: true, message: "Fetched group.", data: data });
    } catch (err) {
        return res.status(200).json({ status: false, message: "smothing went wrong !!" });
    }
};

// delete a group
exports.deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const groupData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        // remove group id from topic record if any one has this group id
        const findinTopic = await Topic.find({ numberOfGroup: { $all: groupId } });
        var temp = [];
        if (findinTopic.length > 0) {
            temp = findinTopic.map(async (item) => {
                let objectIdArray = item.numberOfGroup.map((s) => s.toString());
                if (objectIdArray.includes(groupId)) {
                    await Topic.findByIdAndUpdate(
                        item._id,
                        { $pull: { numberOfGroup: groupId } },
                        { new: true }
                    );
                }
            });
        }
        await Promise.all([...temp]);

        await Group.findByIdAndUpdate(groupId, { isDelete: true }, { new: true });
        // manageUserLog(req.admin_Id)
        return res.status(200).json({ status: true, message: "Group Deleted successfully" });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

//edit group settings
exports.editGroupSettings = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { groupPostedBy, maximumGrpMember, createGroupChat, messageSendBy, groupType, groupVisibility, } = req.body;

        const groupData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        const updateData = await Group.findOneAndUpdate(
            { _id: groupId },
            {
                $set: {
                    groupPostedBy,
                    maximumGrpMember,
                    createGroupChat,
                    messageSendBy,
                    groupType,
                    groupVisibility,
                },
            },
            { new: true }
        );

        if (!updateData)
            return res.status(200).json({ status: false, message: "Group not updated." });

        manageUserLog(req.admin_Id);
        return res.status(200).json({ status: true, message: "Group updated successfully.", data: updateData, });

    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getJoinAccessGrouplistforAuthuser = async (req, res) => {
    try {
        const { authUserId } = req;
        const user_data = await User.findById(authUserId).select(
            "accessible_groups"
        );
        const grp_list_ids = await GroupMember.find({
            userId: authUserId,
            status: 2,
            groupId: { $in: user_data.accessible_groups },
        }).select("groupId user_type -_id");

        if (grp_list_ids.length > 0) {
            var grp_list = [];
            const temp = grp_list_ids.map(async (item) => {
                const res = await Group.findById(item.groupId);
                grp_list.push(res);
            });
            await Promise.all(temp);
            return res.status(200).json({ status: true, message: "Join group list of this user.", data: grp_list, });
        } else {
            return res.status(200).json({ status: false, message: "This user haven't join any group yet.", data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getJoinGrouplistforAuthuser = async (req, res) => {
    try {
        const { authUserId } = req;
        const grp_list_ids = await GroupMember.find({
            userId: authUserId,
            status: 2,
        }).select("groupId user_type -_id");

        if (grp_list_ids.length > 0) {
            var grp_list = [];
            const temp = grp_list_ids.map(async (item) => {
                const res = await Group.findById(item.groupId);
                grp_list.push(res);
            });
            await Promise.all(temp);
            return res.status(200).json({ status: true, message: "Join group list of this user.", data: grp_list, });
        } else {
            return res.status(200).json({ status: false, message: "This user haven't join any group yet.", data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getListofAllGroupsWITHstarredForUser = async (req, res) => {
    try {
        let { authUserId } = req;
        var user_access_grps = await User.findById(authUserId).select(
            "accessible_groups"
        );
        var user_access_grps_ids = user_access_grps.accessible_groups.map(
            (grpid) => {
                return grpid.toString();
            }
        );

        var plandata = await MembershiPlan.findOne({
            total_member_who_purchased_plan: { $in: authUserId },
            isDelete: false,
        });
        var group_ids = plandata.plan_resource.group_ids.map((item) => {
            return item.toString();
        });

        var final_group_ids = [...new Set([...user_access_grps_ids])];

        var groupdata = [];
        if (plandata.plan_resource.show_all_for_group) {
            const result = await Group.find({ groupType: "Public", isDelete: false });
            const temp = result.map(async (group) => {
                const newS = JSON.stringify(group);
                const obj = JSON.parse(newS);
                if (final_group_ids.includes(group._id.toString())) {
                    obj.assesible_group = true;
                    groupdata.push(obj);
                } else {
                    obj.assesible_group = false;
                    groupdata.push(obj);
                }
            });
            await Promise.all([...temp]);
        } else if (plandata.plan_resource.show_only_with_access_for_group) {
            const result = await Group.find({
                _id: { $in: final_group_ids },
                groupType: "Public",
                isDelete: false,
            });

            const temp2 = result.map((grp) => {
                const newS = JSON.stringify(grp);
                const obj = JSON.parse(newS);
                obj.assesible_group = true;
                groupdata.push(obj);
            });
            await Promise.all([...temp2]);
        }
        return res.status(200).json({ status: true, message: "All groups.", data: groupdata });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.starredGroup = async (req, res) => {
    try {
        const { authUserId } = req;
        const groupData = await Group.findOne({
            _id: req.body.groupId,
            groupType: "Public",
            isDelete: false,
        });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not found or group is private.", });

        const exist_starred_grp = await StarredGroup.findOne({
            groupId: req.body.groupId,
            userId: authUserId,
        });
        if (exist_starred_grp)
            return res.status(200).json({ status: true, message: "Already Starred group.", data: exist_starred_grp, });

        const starred_grp = new StarredGroup({
            groupId: req.body.groupId,
            userId: authUserId,
        });
        const response = await starred_grp.save();
        manageUserLog(authUserId);

        return res.status(200).json({ status: true, message: "Starred group.", data: response });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.removeFromStarredGroup = async (req, res) => {
    try {
        const { authUserId } = req;
        const { groupId } = req.params;
        const data = await StarredGroup.findOneAndRemove({
            groupId: groupId,
            userId: authUserId,
        });
        if (data)
            return res.status(200).json({ status: true, message: "Remove Starred group." });

        manageUserLog(authUserId);
        return res.status(200).json({ status: false, message: "Cann't found this group not remove from starred list.", });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getListofStarredGRoupsforUser = async (req, res) => {
    try {
        const { authUserId } = req;
        var user_access_grps = await User.findById(authUserId).select(
            "accessible_groups"
        );
        var user_access_grps_ids = user_access_grps.accessible_groups.map(
            (grpid) => {
                return grpid.toString();
            }
        );

        const starred_grp_list_ids = await StarredGroup.find({
            userId: authUserId,
        }).select("groupId -_id");

        var ids = starred_grp_list_ids.map((value) => {
            return value.groupId;
        });

        if (starred_grp_list_ids.length > 0) {
            const data = await Group.find({ _id: { $in: ids } }).lean();
            var res_data = [];
            data.forEach((grp, index) => {
                if (user_access_grps_ids.includes(grp._id.toString())) {
                    res_data.push({ ...grp, assesible_group: true });
                } else {
                    res_data.push({ ...grp, assesible_group: false });
                }
            });
            return res.status(200).json({ status: true, message: "Starred groups.", data: res_data });
        }
        return res.status(200).json({ status: false, message: "Starred groups not found." });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// user join group
exports.joinGroup = async (req, res) => {
    try {
        await GroupMember.updateMany(
            { status: 2 },
            { $set: { createdAt: new Date("2022-09-05T11:23:54.065+00:00") } },
            { multi: true }
        );
        const { authUserId } = req;
        const { groupId } = req.body;

        await checkGroup_userCanAccessResource(authUserId, groupId).then(async (val) => {
            const findentry = await GroupMember.findOne({
                userId: req.authUserId,
                groupId: groupId,
            });
            if (findentry)
                return res.status(200).json({ status: false, message: "User have already join this group.", });

            const newEntry = new GroupMember({
                userId: req.authUserId,
                groupId: groupId,
                status: 2,
            });

            const savedEntry = await newEntry.save().then((t) => t.populate("userId", "email otherdetail"));
            if (savedEntry) {
                await Group.findByIdAndUpdate(groupId, { $inc: { totalGrpMember: 1 } }, { new: true });
                manageUserLog(req.authUserId);

                return res.status(200).json({ status: true, message: "User has join group.", data: savedEntry, });
            }
        }).catch((err) => {
            return res.status(200).json({ status: false, message: `${err}` });
        });

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//user leave group
exports.leaveGroup = async (req, res) => {
    try {
        const { authUserId } = req;
        const groupId = req.params.groupId;
        await checkGroup_userCanAccessResource(authUserId, groupId).then(async (val) => {
            const findentry = await GroupMember.findOne({
                userId: authUserId,
                groupId: groupId,
            });

            if (!findentry) {
                return res.status(200).json({ status: false, message: "User haven't join this group." });
            } else {
                await findentry.remove();
                await Group.findByIdAndUpdate(
                    groupId,
                    { $inc: { totalGrpMember: -1 } },
                    { new: true }
                );
                manageUserLog(authUserId);

                return res.status(200).json({ status: true, message: "User has leave group." });
            }
        }).catch((err) => {
            return res.status(200).json({ status: false, message: `${err}` });
        });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//get auth user invitation friends list
exports.getUserFriedsList = async (req, res) => {
    try {
        const { authUserId } = req;
        const friendList = await User.findOne({ _id: authUserId }).select(
            "following followers"
        );

        const followerArr = friendList.following.map((id) => id.toString());
        const followingArr = friendList.followers.map((id) => id.toString());
        let filteredArray = followerArr.filter((o1) =>
            followingArr.some((o2) => o1 === o2)
        );

        const finalresult = await User.find({ _id: { $in: filteredArray } }).select(
            "otherdetail profileImg"
        );

        return res.status(200).send({
            status: true,
            message: "User's friend list.",
            data: finalresult,
        });

    } catch (error) {
        return res.status(200).json({ status: false, message: error.message, data: [] });
    }
};

// invite group link to friends list
exports.groupInvitationToFriends = async (req, res) => {
    try {
        const { inviteUser } = req.body;
        const validGroup = await User.find({ _id: { $in: inviteUser } });
        if (!validGroup)
            return res.status(200).json({ status: false, message: "User not found." });

        const newEntry = [];
        var temp = inviteUser.map(async (inviteId) => {
            const findentry = await GroupMember.findOne({
                userId: inviteId,
                groupId: req.params.groupId,
            });
            if (findentry) {
                if (findentry.status === 1)
                    return res.status(200).json({ status: false, message: "User have already send invitation.", });
                else if (findentry.status === 2)
                    return res.status(200).json({ status: false, message: "User have already join group." });
                else
                    return res.status(200).json({ status: false, message: "Something wrong." });
            }
            const data = await new GroupMember({
                userId: inviteId,
                groupId: req.params.groupId,
                status: 1,
            }).save();

            //spa code
            var user = await User.findById(inviteId);
            let mail_data = {
                email: user.email,
                subject: "Join the group",
                html: "Click on the link to join the group",
            };
            await sendEmail(mail_data);

            //code end
            newEntry.push(data);
        });
        await Promise.all([...temp]);

        manageUserLog(req.authUserId);
        return res.status(200).send({ status: true, message: "Group invite sent to user's.", data: newEntry, });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message, data: [] });
    }
};

exports.deleteGroupMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const groupData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        const findMember = await GroupMember.findOne({
            userId: memberId,
            groupId: groupId,
            status: 2,
        });

        if (!findMember) {
            return res.status(200).json({ status: true, data: findMember, message: "Member not found in this group.", });

        } else {
            await findMember.remove();
            const result = await Group.findByIdAndUpdate(
                groupData._id,
                { $inc: { totalGrpMember: -1 } },
                { new: true }
            );
            manageUserLog(req.admin_Id);

            return res.status(200).json({ status: true, data: result, message: "Member deleted." });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message, data: [] });
    }
};

async function middleware_getallPostfor_group(groupId, authUserId, page, limit) {
    var posts = [];
    var count = 0;
    const user_belong_to_group = await GroupMember.findOne({
        groupId: groupId,
        userId: authUserId,
        status: 2,
    });

    if (!user_belong_to_group) {
        const result = await Post.find({
            groupId: groupId,
            makeAnnouncement: false,
            hideFromFeed: false,
            postStatus: "Public",
            isDelete: false,
        }).populate("groupId", "groupTitle").sort({ updatedAt: -1 }).limit(limit * 1).skip((page - 1) * limit);

        posts = result;
        count = await Post.countDocuments({
            groupId: groupId,
            makeAnnouncement: false,
            hideFromFeed: false,
            postStatus: "Public",
            isDelete: false,
        });
    } else {
        const result = await Post.find({
            groupId: groupId,
            makeAnnouncement: false,
            hideFromFeed: false,
            isDelete: false,
        }).populate("groupId", "groupTitle").sort({ updatedAt: -1 }).limit(limit * 1).skip((page - 1) * limit);

        posts = result;
        count = await Post.countDocuments({
            groupId: groupId,
            makeAnnouncement: false,
            hideFromFeed: false,
            isDelete: false,
        });
    }
    const data = {
        posts,
        count: count,
    };
    return data;
}

async function middleware_getallPostfor_groupIdTopicId(groupId, topicId, authUserId, page, limit) {
    var posts = [];
    var count = 0;

    const user_belong_to_group = await GroupMember.findOne({
        groupId: groupId,
        userId: authUserId,
        status: 2,
    });

    if (!user_belong_to_group) {
        const result = await Post.find({
            groupId: groupId,
            topics: { $in: topicId },
            makeAnnouncement: false,
            hideFromFeed: false,
            postStatus: "Public",
            isDelete: false,
        }).populate("groupId", "groupTitle").sort({ updatedAt: -1 }).limit(limit * 1).skip((page - 1) * limit);

        posts = result;
        count = await Post.countDocuments({
            groupId: groupId,
            topics: { $in: topicId },
            makeAnnouncement: false,
            hideFromFeed: false,
            postStatus: "Public",
            isDelete: false,
        });
    } else {
        const result = await Post.find({
            groupId: groupId,
            topics: { $in: topicId },
            makeAnnouncement: false,
            hideFromFeed: false,
            isDelete: false,
        }).populate("groupId", "groupTitle").sort({ updatedAt: -1 }).limit(limit * 1).skip((page - 1) * limit);

        posts = result;
        count = await Post.countDocuments({
            groupId: groupId,
            topics: { $in: topicId },
            makeAnnouncement: false,
            hideFromFeed: false,
            isDelete: false,
        });
    }
    const data = {
        posts,
        count: count,
    };
    return data;
}

exports.getPostsByGroupId_forUsers = async (req, res) => {
    const { page, limit } = req.query;
    try {
        const { authUserId } = req;
        const { groupId } = req.params;
        const groupData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        var posts = [];
        var count = 0;

        const respons = await middleware_getallPostfor_group(
            groupId,
            authUserId,
            page,
            limit
        );
        posts = respons.posts;
        count = respons.count;

        if (posts.length === 0)
            return res.status(200).json({ status: true, data: [], message: "No posts found." });

        return res.status(200).json({
            status: true,
            data: [
                {
                    posts,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalPosts: count,
                },
            ],
            message: "Posts found.",
        });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message, data: [] });
    }
};

exports.getPostsByGroupIdAndTopicId_forUsers = async (req, res) => {
    const { page, limit } = req.query;
    try {
        const { authUserId } = req;
        const { groupId, topicId } = req.params;
        const groupData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        var posts = [];
        var count = 0;

        const respons = await middleware_getallPostfor_groupIdTopicId(
            groupId,
            topicId,
            authUserId,
            page,
            limit
        );
        posts = respons.posts;
        count = respons.count;

        if (posts.length === 0)
            return res.status(200).json({ status: true, data: [], message: "No posts found." });

        return res.status(200).json({
            status: true,
            data: [
                {
                    posts,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalPosts: count,
                },
            ],
            message: "Posts found.",
        });

    } catch (error) {
        return res.status(200).json({ status: false, message: error.message, data: [] });
    }
};

exports.getPostsByGroupId = async (req, res) => {
    const { page, limit } = req.query;
    try {
        const { groupId } = req.params;
        const groupData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        var posts = [];
        var count = 0;

        const result = await Post.find({ groupId: groupId }).sort({ updatedAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
        posts = result;
        count = await Post.countDocuments({ groupId: groupId });

        if (posts.length === 0)
            return res.status(200).json({ status: true, data: [], message: "No posts found." });

        return res.status(200).json({
            status: true,
            data: [
                {
                    posts,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalPosts: count,
                },
            ],
            message: "Posts found.",
        });

    } catch (error) {
        return res.status(200).json({ status: false, message: error.message, data: [] });
    }
};

exports.getGroupMedia_ofallPosts_ofAllmembers = async (req, res) => {
    try {
        const { type } = req.query;
        const { groupId } = req.params;
        const respons = await middleware_getallPostfor_group(
            groupId,
            req.authUserId,
            (page = 1),
            (limit = 100000000)
        );
        var posts = respons.posts;

        var media_array = [];
        if (posts.length > 0) {
            var temp = posts.map(async (item) => {
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

        return res.status(200).json({ status: true, message: "Posts media.", data: media_array, });
    } catch (error) {
        return res.status(200).json({ status: false, data: [], message: error.message });
    }
};

exports.getAnnouncementPosts_forAdmin_byGroup = async (req, res) => {
    const { page, limit } = req.query;
    try {
        const { groupId } = req.params;
        var getData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!getData)
            return res.status(200).json({ status: false, message: "Group not found." });

        const posts = await Post.find({ groupId: groupId, makeAnnouncement: true });
        const count = await Post.countDocuments({
            groupId: groupId,
            makeAnnouncement: true,
        });
        return res.status(200).json({
            status: true,
            data: [
                {
                    posts,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalPosts: count,
                },
            ],
            message: "All announcement posts.",
        });
    } catch (error) {
        return res.status(200).json({ status: false, data: [], message: error.message });
    }
};

exports.getHidePosts_forAdmin_byGroup = async (req, res) => {
    const { page, limit } = req.query;
    try {
        const { groupId } = req.params;
        var getData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!getData)
            return res.status(200).json({ status: false, message: "Group not found." });

        const posts = await Post.find({ groupId: groupId, hideFromFeed: true });
        const count = await Post.countDocuments({
            groupId: groupId,
            hideFromFeed: true,
        });

        return res.status(200).json({
            status: true,
            data: [
                {
                    posts,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalPosts: count,
                },
            ],
            message: "All hide posts.",
        });

    } catch (error) {
        return res.status(200).json({ status: false, data: [], message: error.message });
    }
};

exports.getAllPosts__ofAllgroupMember_forAuthUser_joinGroups = async (req, res) => {
    try {
        const user_join_grp = await GroupMember.find({
            userId: req.authUserId,
            status: 2,
        }).select("groupId -_id");

        var posts = [];
        const temp = user_join_grp.map(async (item) => {
            const result = await Post.find({ groupId: item.groupId });
            if (result.length > 0) posts.push(result);
        });
        await Promise.all([...temp]);

        return res.status(200).json({ status: true, message: "All posts list of groups that auth user has join.", data: posts, });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.uploadFiles_group = async (req, res) => {
    try {
        const { groupId } = req.params;
        var getdata = await Group.findOne({ _id: groupId, isDelete: false });
        if (!getdata) {
            req.files_g.map(async (file) => {
                await s3.deleteObject({
                    Bucket: process.env.AWS_BUCKET,
                    Key: file,
                }).promise();
            });
            return res.status(200).json({ status: false, message: "Group not found." });
        }

        var isMember = await GroupMember.findOne({
            userId: req.authUserId,
            groupId: groupId,
            status: 2,
        });

        if (!isMember) {
            req.files_g.map(async (file) => {
                await s3.deleteObject({
                    Bucket: process.env.AWS_BUCKET,
                    Key: file,
                }).promise();
            });
            return res.status(200).json({ status: false, message: "User is not a member of this group.", });
        }

        var result = [];
        const temp = req.files_g.map(async (file) => {
            const newData = new GroupFile({
                userId: req.authUserId,
                groupId: groupId,
                file: file,
            });
            const savedata = await newData.save();
            result.push(savedata);
        });
        await Promise.all([...temp]);

        return res.status(200).json({ status: true, message: "File uploaded.", data: result });
    } catch (error) {
        req.files_g.map(async (file) => {
            await s3.deleteObject({
                Bucket: process.env.AWS_BUCKET,
                Key: file,
            }).promise();
        });
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getGroupsAllUploadedFiles = async (req, res) => {
    try {
        const { groupId } = req.params;
        var getData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!getData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        const result = await GroupFile.find({ groupId: groupId });
        return res.status(200).json({ status: true, message: "All uploaded files.", data: result });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.deleteGroupFilebyUser = async (req, res) => {
    try {
        const { groupId, fileId } = req.params;
        var getData = await Group.findOne({ _id: groupId, isDelete: false });
        if (!getData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        var upload_file_data = await GroupFile.findById(fileId);
        if (!upload_file_data)
            return res.status(200).json({ status: false, message: "File not Found." });

        await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: upload_file_data.file,
        }).promise();

        await GroupFile.findOneAndRemove({
            groupId: groupId,
            _id: fileId,
            userId: req.authUserId,
        });
        return res.status(200).json({ status: true, message: "File deleted." });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

exports.getLoginuser_joingrp_latest5Files = async (req, res) => {
    try {
        const group_data = await GroupMember.find({
            userId: req.authUserId,
        }).select("groupId");

        const grp_ids = group_data.map((item) => {
            return item.groupId;
        });

        const files_data = await GroupFile.find({ groupId: { $in: grp_ids } }).select("file updatedAt").sort({ updatedAt: -1 }).limit(5);
        return res.status(200).json({ status: true, message: "Latest files from user joined groups.", data: files_data, });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

//spa code
//get all group members by group id
exports.getallgroupmember = async (req, res) => {
    try {
        const groupData = await Group.findOne({
            _id: req.params.groupId,
            isDelete: false,
        });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        const memberList = await GroupMember.find({
            groupId: req.params.groupId,
            status: 2,
        });
        if (memberList)
            return res.status(200).send({ status: true, message: "Group members.", data: memberList });
        else
            return res.status(200).send({ status: false, message: "This group don't have any members.", data: [], });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message, data: [] });
    }
};

exports.getallgroupmember_AS = async (req, res) => {
    try {
        const groupData = await Group.findOne({
            _id: req.params.groupId,
            isDelete: false,
        });
        if (!groupData)
            return res.status(200).json({ status: false, message: "Group not Found." });

        const memberList = await GroupMember.find({
            groupId: req.params.groupId,
            status: 2,
        });
        if (memberList)
            return res.status(200).send({ status: true, message: "Group members.", data: memberList });
        else
            return res.status(200).send({ status: false, message: "This group don't have any members.", data: [], });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message, data: [] });
    }
};