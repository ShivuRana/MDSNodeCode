const User = require("../database/models/airTableSync");
const chat = require("../database/models/chat");
const groupChatSettings = require("../database/models/adminSetting");
const userChatGroup = require("../database/models/userChatGroup");
const userChatGroupMember = require("../database/models/userChatGroupMember");
const { updateChat } = require("../controller/chatcontroller");
const AWS = require("aws-sdk");
const mongoose = require("mongoose");
const ObjectId = require("mongoose").Types.ObjectId;
const moment = require("moment");
const { sendEmail } = require("../config/common");
const chatChannelMembers = require("../database/models/chatChannelMembers");

var s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
  Bucket: process.env.AWS_BUCKET,
});

/** Group Chat User Socket code  **/
// create user chat group socket function
exports.createUserGroup = async (
  sender,
  group_image,
  group_name,
  participents,
  date,
  time,
  time_stamp
) => {
  try {
    let authUserId = new mongoose.Types.ObjectId(sender);

    const adminSetting = await groupChatSettings.findOne({});
    if (participents && participents?.length > adminSetting.groupMember - 1)
      return {
        status: false,
        message: `You can only select ${adminSetting.groupMember} participate at a time`,
      };

    let parti_value = [];

    if (participents !== undefined) {
      parti_value = participents.map((id) => {
        return { id: id };
      });
    }

    parti_value.push({
      id: authUserId,
    });

    const savegroup = {
      groupTitle: group_name ?? "",
      groupImage: group_image ?? "",
      created_by: authUserId,
    };

    if (savegroup) {
      const data = await userChatGroup(savegroup).save();
      const temp = parti_value?.map(async (member) => {
        if (authUserId === member.id) {
          const groupAdmin = new userChatGroupMember({
            userId: authUserId,
            groupId: data._id,
            status: 2,
            user_type: "adminuser",
          });
          await groupAdmin.save();
          await userChatGroup.findByIdAndUpdate(
            data._id,
            { $inc: { totalGrpMember: 1 } },
            { new: true }
          );
        } else {
          const groupMember = new userChatGroupMember({
            userId: member.id,
            groupId: data._id,
            status: 2,
            user_type: "airtable-syncs",
          });
          if (!groupMember)
            return { status: false, message: "Something went wrong !!" };

          const addMember = await groupMember.save();
          if (addMember) {
            await userChatGroup.findByIdAndUpdate(
              data._id,
              { $inc: { totalGrpMember: 1 } },
              { new: true }
            );
          }
        }
      });
      await Promise.all([...temp]);
      var group_member_local = participents.map((ids) => {
        return { id: ids, readmsg: true };
      });

      if (!group_member_local.includes(authUserId)) {
        group_member_local.push({ id: authUserId, readmsg: true });
      }

      const messagedata = new chat({
        message: "",
        recipient_type: "userChatGroup",
        sender_type: "airtable-syncs",
        recipient: data._id,
        sender: authUserId,
        type: "userChatGroup",
        group_member: group_member_local,
        activity_status: true,
        activity: {
          type: "created",
          adminId: authUserId,
          newGroupName: group_name,
        },
        userTimeStamp:
          time_stamp ?? moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
      });
      if (data) {
        const result = await messagedata.save();
        const perResult = result._doc;
        const result_data = {
          ...perResult,
          recipient: {
            id: perResult.recipient._id,
            firstname: data.groupTitle ?? "",
            image: data.groupImage ?? "",
            type: "userChatGroup",
          },
          sender: {
            id: perResult.sender ? perResult.sender._id : "",
            firstname: perResult.sender
              ? perResult.sender.otherdetail
                ? perResult.sender.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  perResult.sender.otherdetail[process.env.USER_LN_ID]
                : ""
              : "",
            image: perResult.sender ? perResult.sender.profileImg : "",
            type: "user",
          },
          activity: {
            type: perResult.activity.type,
            date: perResult.activity.date,
            _id: perResult.activity._id,
            adminId: {
              id: perResult.activity.adminId
                ? perResult.activity.adminId._id
                : "",
              firstname: perResult.activity.adminId
                ? perResult.activity.adminId.otherdetail
                  ? perResult.activity.adminId.otherdetail[
                      process.env.USER_FN_ID
                    ] +
                    " " +
                    perResult.activity.adminId.otherdetail[
                      process.env.USER_LN_ID
                    ]
                  : ""
                : "",
              image: perResult.activity.adminId
                ? perResult.activity.adminId.profileImg
                : "",
              type: "user",
            },
            userId: perResult.activity.userId
              ? perResult.activity.userId.map((user) => {
                  return {
                    id: user ? user._id : "",
                    firstname: user
                      ? user.otherdetail
                        ? user.otherdetail[process.env.USER_FN_ID] +
                          " " +
                          user.otherdetail[process.env.USER_LN_ID]
                        : ""
                      : "",
                    image: user ? user.profileImg : "",
                    type: "user",
                  };
                })
              : [],
          },
        };

        if (result) {
          return {
            status: true,
            message: "Group created!!",
            data: data,
            messageData: [result_data],
          };
        } else {
          return {
            status: false,
            message: "Something went wrong while adding chat history!!",
          };
        }
      } else {
        return {
          status: false,
          message: "Something went wrong while creating group!!",
        };
      }
    } else {
      return { status: false, message: "Something went wrong !!" };
    }
  } catch (e) {
    console.log(e);
    return {
      status: false,
      message: `Internal server error !!, error:${e.message}`,
    };
  }
};

// edit user chat group socket function
exports.editChatGroup = async (
  sender,
  groupid,
  group_image,
  group_name,
  participents,
  date,
  time,
  time_stamp
) => {
  try {
    let authUserId = sender;
    const data = await userChatGroup.findOne({ _id: groupid, isDelete: false });
    const allmembers = await userChatGroupMember.find({
      groupId: groupid,
      status: 2,
      isDelete: false,
    });

    if (data) {
      if (data?.created_by?._id.toString() === authUserId?.toString()) {
        if (group_image && data.group_image) {
          await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET,
              Key: data.group_image,
            })
            .promise();
        }

        const editgroup = await userChatGroup.findByIdAndUpdate(
          groupid,
          {
            groupImage:
              group_image && group_image.length
                ? group_image
                : data?.group_image,
            groupTitle: group_name ?? data?.group_name,
          },
          { new: true }
        );

        if (editgroup) {
          var group_member_local = allmembers.map((ids) => {
            return {
              id: ids.userId._id,
              readmsg: true,
            };
          });

          const messageData = [];
          if (group_image && group_image.length) {
            const newchat = new chat({
              message: "",
              recipient_type: "userChatGroup",
              sender_type: "airtable-syncs",
              recipient: editgroup._id,
              sender: authUserId,
              type: "userChatGroup",
              group_member: group_member_local,
              activity_status: true,
              activity: {
                type: "editedImage",
                adminId: authUserId,
              },
              userTimeStamp:
                time_stamp ??
                moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
            });
            const result = await newchat.save();
            const perResult = result._doc;
            const result_data = {
              ...perResult,
              recipient: {
                id: editgroup._id,
                firstname: editgroup.groupTitle ?? "",
                image: editgroup.groupImage ?? "",
                type: "userChatGroup",
              },
              sender: {
                id: perResult.sender ? perResult.sender._id : "",
                firstname: perResult.sender
                  ? perResult.sender.otherdetail
                    ? perResult.sender.otherdetail[process.env.USER_FN_ID] +
                      " " +
                      perResult.sender.otherdetail[process.env.USER_LN_ID]
                    : ""
                  : "",
                image: perResult.sender ? perResult.sender.profileImg : "",
                type: "user",
              },
              activity: {
                ...perResult.activity._doc,
                adminId: {
                  id: perResult.activity.adminId
                    ? perResult.activity.adminId._id
                    : "",
                  firstname: perResult.activity.adminId
                    ? perResult.activity.adminId.otherdetail
                      ? perResult.activity.adminId.otherdetail[
                          process.env.USER_FN_ID
                        ] +
                        " " +
                        perResult.activity.adminId.otherdetail[
                          process.env.USER_LN_ID
                        ]
                      : ""
                    : "",
                  image: perResult.activity.adminId
                    ? perResult.activity.adminId.profileImg
                    : "",
                  type: "user",
                },
                userId: perResult.activity.userId
                  ? perResult.activity.userId.map((user) => {
                      return {
                        id: user ? user._id : "",
                        firstname: user
                          ? user.otherdetail
                            ? user.otherdetail[process.env.USER_FN_ID] +
                              " " +
                              user.otherdetail[process.env.USER_LN_ID]
                            : ""
                          : "",
                        image: user ? user.profileImg : "",
                        type: "user",
                      };
                    })
                  : [],
              },
            };
            messageData.push(result_data);
          }
          if (group_name && group_name !== data.groupTitle) {
            const newchat = new chat({
              message: "",
              recipient_type: "userChatGroup",
              sender_type: "airtable-syncs",
              recipient: editgroup._id,
              sender: authUserId,
              type: "userChatGroup",
              group_member: group_member_local,
              activity_status: true,
              activity: {
                type: "editedName",
                adminId: authUserId,
                previousGroupName: data.groupTitle,
                newGroupName: group_name,
              },
              userTimeStamp:
                time_stamp ??
                moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
            });
            const result = await newchat.save();
            const perResult = result._doc;
            const result_data = {
              ...perResult,
              recipient: {
                id: editgroup._id,
                firstname: editgroup.groupTitle ?? "",
                image: editgroup.groupImage ?? "",
                type: "userChatGroup",
              },
              sender: {
                id: perResult.sender ? perResult.sender._id : "",
                firstname: perResult.sender
                  ? perResult.sender.otherdetail
                    ? perResult.sender.otherdetail[process.env.USER_FN_ID] +
                      " " +
                      perResult.sender.otherdetail[process.env.USER_LN_ID]
                    : ""
                  : "",
                image: perResult.sender ? perResult.sender.profileImg : "",
                type: "user",
              },
              activity: {
                ...perResult.activity._doc,
                adminId: {
                  id: perResult.activity.adminId
                    ? perResult.activity.adminId._id
                    : "",
                  firstname: perResult.activity.adminId
                    ? perResult.activity.adminId.otherdetail
                      ? perResult.activity.adminId.otherdetail[
                          process.env.USER_FN_ID
                        ] +
                        " " +
                        perResult.activity.adminId.otherdetail[
                          process.env.USER_LN_ID
                        ]
                      : ""
                    : "",
                  image: perResult.activity.adminId
                    ? perResult.activity.adminId.profileImg
                    : "",
                  type: "user",
                },
                userId: perResult.activity.userId
                  ? perResult.activity.userId.map((user) => {
                      return {
                        id: user ? user._id : "",
                        firstname: user
                          ? user.otherdetail
                            ? user.otherdetail[process.env.USER_FN_ID] +
                              " " +
                              user.otherdetail[process.env.USER_LN_ID]
                            : ""
                          : "",
                        image: user ? user.profileImg : "",
                        type: "user",
                      };
                    })
                  : [],
              },
            };
            messageData.push(result_data);
          }
          if (messageData)
            return {
              status: true,
              message: "User group updated!",
              data: editgroup,
              messageData: messageData,
            };
          else
            return {
              status: false,
              message: "Something went wrong while updating history data!",
            };
        } else
          return {
            status: false,
            message: "Something went wrong while updating data!",
          };
      } else {
        return {
          status: false,
          message: "Only admin user can update this group!",
        };
      }
    } else {
      return { status: false, message: "Group not found!" };
    }
  } catch (e) {
    console.log(e);
    return {
      status: false,
      message: "Something went wrong!",
      error: `${e.message}`,
    };
  }
};

// join user chat group socket function
exports.joinGroupSocket = async (
  authUserId,
  groupId,
  date,
  time,
  time_stamp
) => {
  try {
    const findentry = await userChatGroupMember.findOne({
      userId: authUserId,
      groupId: groupId,
      status: 2,
    });
    if (findentry)
      return { status: false, message: "User have already join this group." };

    const savedEntry = await userChatGroupMember.findOneAndUpdate(
      { userId: authUserId, groupId: groupId, status: 1 },
      { status: 2 },
      { new: true }
    );

    if (savedEntry) {
      await userChatGroup.findByIdAndUpdate(
        new ObjectId(groupId),
        { $inc: { totalGrpMember: 1 } },
        { new: true }
      );

      const groupData = await Promise.all(
        await userChatGroup.aggregate([
          {
            $match: {
              _id: new ObjectId(groupId),
              isDelete: false,
            },
          },
          {
            $lookup: {
              from: "userchatgroupmembers",
              localField: "_id",
              foreignField: "groupId",
              pipeline: [
                {
                  $match: {
                    status: 2,
                  },
                },
              ],
              as: "members",
            },
          },
        ])
      );

      if (groupData) {
        var group_member_local = groupData[0].members.map((ids) => {
          return {
            id: ids.userId,
            readmsg: true,
          };
        });
        const data = new chat({
          message: "",
          recipient_type: "userChatGroup",
          sender_type: "airtable-syncs",
          recipient: groupData[0]._id,
          sender: groupData[0].created_by,
          type: "userChatGroup",
          group_member: group_member_local,
          activity_status: true,
          activity: {
            type: "joined",
            adminId: groupData[0].created_by,
            userId: authUserId,
          },
          userTimeStamp:
            time_stamp ?? moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
        });
        const result = await data.save();
        return {
          status: true,
          message: "User has join group.",
          data: savedEntry,
          messageData: result,
        };
      } else {
        return { status: false, message: "Something went wrong!", data: [] };
      }
    }
  } catch (error) {
    return { status: false, message: `${error.message}` };
  }
};

// get group member details from the group id socket function
exports.getAllGroupMemberSocket = async (groupid) => {
  try {
    const groupData = await Promise.all(
      await userChatGroup.aggregate([
        {
          $match: {
            _id: new ObjectId(groupid),
            isDelete: false,
          },
        },
        {
          $lookup: {
            from: "userchatgroupmembers",
            let: { localField: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$$localField", "$groupId"],
                  },
                  status: 2,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "userId",
                  foreignField: "_id",
                  as: "user",
                },
              },
              {
                $lookup: {
                  from: "chat_users",
                  let: { userId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: ["$userid", "$$userId"],
                        },
                      },
                    },
                  ],
                  as: "userChat",
                },
              },
              {
                $addFields: {
                  onlineStatus: {
                    $cond: [
                      { $gt: [{ $size: "$userChat" }, 0] },
                      "$userChat.online",
                      false,
                    ],
                  },
                },
              },
              {
                $project: {
                  userChat: 0,
                },
              },
              { $unwind: "$user" },
            ],
            as: "members",
          },
        },
        {
          $project: {
            _id: 1,
            groupTitle: 1,
            groupImage: 1,
            created_by: 1,
            totalGrpMember: 1,
            isDelete: 1,
            members: 1,
            userList: "$members.user",
          },
        },
      ])
    );
    if (groupData) return groupData;
    else return [];
  } catch (error) {
    console.log(error);
    return [];
  }
};

// add group member socket function
exports.addGroupMemberSocket = async (
  authUserId,
  groupId,
  addmember,
  date,
  time,
  time_stamp
) => {
  try {
    const data = await userChatGroup.findOne({ _id: groupId, isDelete: false });

    if (data) {
      const addmembers = addmember.map((mem) => {
        return { id: mem };
      });

      if (data.created_by._id.toString() === authUserId.toString()) {
        const temp = addmembers?.map(async (member) => {
          if (
            !(await userChatGroupMember.findOne({
              userId: member.id,
              groupId: groupId,
            }))
          ) {
            const groupMember = new userChatGroupMember({
              userId: member.id,
              groupId: groupId,
              status: 2,
              user_type: "airtable-syncs",
            });
            if (!groupMember)
              return {
                status: true,
                message: "Group members are not created !!",
              };

            const addMember = await groupMember.save();
            const user_data = await User.findById(new ObjectId(member.id));
            if (
              user_data.deleted_group_of_user &&
              user_data.deleted_group_of_user.includes(new ObjectId(groupId))
            ) {
              await User.findByIdAndUpdate(member.id, {
                $pull: { deleted_group_of_user: new ObjectId(groupId) },
              });
            }
          } else {
            return {
              status: false,
              message: "Something went wrong!",
              err: "Member is already in group",
            };
          }
        });
        const result = await Promise.all([...temp]);
        if (result) {
          const allmember = await userChatGroupMember.find({
            groupId: groupId,
            status: 2,
          });
          return {
            status: true,
            message: "Members added successfully!",
            data: data,
            allmember: allmember,
          };
        } else {
          return {
            status: false,
            message: "Something went wrong!",
            err: "In all member",
          };
        }
      } else {
        return { status: false, message: "You are not group an admin!" };
      }
    } else {
      return { status: false, message: "Group not found!" };
    }
  } catch (e) {
    console.log(e);
    return { status: false, message: "Something went wrong!", err: e };
  }
};

// add group member activity log socket function
exports.addGroupMemberSocketActivity = async (
  authUserId,
  groupId,
  addmember,
  date,
  time,
  time_stamp
) => {
  try {
    const groupDetail = await userChatGroup.findOne({
      _id: new ObjectId(groupId),
      isDelete: false,
    });
    const allmembers = await userChatGroupMember.find({
      groupId: groupId,
      status: 2,
      isDelete: false,
    });
    if (allmembers && groupDetail) {
      var group_member_local = allmembers.map((ids) => {
        return {
          id: ids.userId._id,
          readmsg: true,
        };
      });
      for (var i = 0; i < addmember.length; i++) {
        if (
          allmembers.filter((ids) => {
            if (ids.userId._id.toString === addmember[i]) return ids;
          }).length === 0
        ) {
          group_member_local.push({
            id: addmember[i],
            readmsg: true,
          });
        }
      }
      const newchat = new chat({
        message: "",
        recipient_type: "userChatGroup",
        sender_type: "airtable-syncs",
        recipient: groupId,
        sender: authUserId,
        type: "userChatGroup",
        group_member: group_member_local,
        activity_status: true,
        activity: {
          type: "added",
          adminId: authUserId,
          userId: [...addmember],
        },
        userTimeStamp:
          time_stamp ?? moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
      });
      const result = await newchat.save();
      const perResult = await chat.findById(result._id).lean();
      const result_data = {
        ...perResult,
        recipient: {
          id: groupDetail._id,
          firstname: groupDetail.groupTitle ?? "",
          image: groupDetail.groupImage ?? "",
          type: "userChatGroup",
        },
        sender: {
          id: perResult.sender ? perResult.sender._id : "",
          firstname: perResult.sender
            ? perResult.sender.otherdetail
              ? perResult.sender.otherdetail[process.env.USER_FN_ID] +
                " " +
                perResult.sender.otherdetail[process.env.USER_LN_ID]
              : ""
            : "",
          image: perResult.sender ? perResult.sender.profileImg : "",
          type: "user",
        },
        activity: {
          ...perResult.activity,
          adminId: {
            id: perResult.activity.adminId
              ? perResult.activity.adminId._id
              : "",
            firstname: perResult.activity.adminId
              ? perResult.activity.adminId.otherdetail
                ? perResult.activity.adminId.otherdetail[
                    process.env.USER_FN_ID
                  ] +
                  " " +
                  perResult.activity.adminId.otherdetail[process.env.USER_LN_ID]
                : ""
              : "",
            image: perResult.activity.adminId
              ? perResult.activity.adminId.profileImg
              : "",
            type: "user",
          },
          userId: perResult.activity.userId
            ? perResult.activity.userId.map((user) => {
                return {
                  id: user ? user._id : "",
                  firstname: user
                    ? user.otherdetail
                      ? user.otherdetail[process.env.USER_FN_ID] +
                        " " +
                        user.otherdetail[process.env.USER_LN_ID]
                      : ""
                    : "",
                  image: user ? user.profileImg : "",
                  type: "user",
                };
              })
            : [],
        },
      };
      console.log(result_data, "result_data");
      if (result_data) {
        return {
          status: true,
          message: "Members added successfully activity added!",
          messageData: [result_data],
        };
      } else {
        return {
          status: false,
          message: "Something went wrong while adding activity in add member!",
          messageData: [],
        };
      }
    } else {
      return {
        status: false,
        message: "Something went wrong while getting group detail!",
        messageData: [],
      };
    }
  } catch (e) {
    console.log(e);
    return { status: true, message: "Something went wrong!", error: e };
  }
};

// remove group member socket function
exports.removeGroupMemberSocket = async (
  groupid,
  authUserId,
  removemember,
  date,
  time,
  time_stamp
) => {
  try {
    const data = await userChatGroup.findOne({
      _id: new ObjectId(groupid),
      isDelete: false,
    });
    if (data) {
      if (data.created_by._id.toString() === authUserId.toString()) {
        const temp = removemember?.map(async (member) => {
          if (
            await userChatGroupMember.findOne({
              userId: new ObjectId(member),
              groupId: new ObjectId(groupid),
            })
          ) {
            const user_data = await User.findById(new ObjectId(member));
            if (
              !(
                user_data.deleted_group_of_user &&
                user_data.deleted_group_of_user.includes(new ObjectId(groupid))
              )
            ) {
              await User.findByIdAndUpdate(member, {
                $push: { deleted_group_of_user: new ObjectId(groupid) },
              });
            }
            await userChatGroupMember.findOneAndDelete(
              { userId: new ObjectId(member), groupId: new ObjectId(groupid) },
              { new: true }
            );
            await updateChat(member.toString(), groupid.toString(), "group");
          }
        });
        const result = await Promise.all([...temp]);
        if (result) {
          const allmember = await userChatGroupMember.find({
            groupId: groupid,
            status: 2,
          });
          return {
            status: true,
            message: "Members removed successfully!",
            data: data,
            allmember: allmember,
          };
        } else {
          return {
            status: false,
            message: "Something went wrong while removing memeber!",
          };
        }
      } else {
        return { status: false, message: "You are not an admin!" };
      }
    } else {
      return { status: false, message: "Group not found!" };
    }
  } catch (e) {
    console.log(e);
    return { status: true, message: "Something went wrong!", error: e };
  }
};

// remove group member activity log socket function
exports.removeGroupMemberSocketActivity = async (
  groupid,
  authUserId,
  removemember,
  date,
  time,
  time_stamp
) => {
  try {
    const groupDetail = await userChatGroup.findOne({
      _id: new ObjectId(groupid),
      isDelete: false,
    });
    const allmembers = await userChatGroupMember.find({
      groupId: groupid,
      status: 2,
      isDelete: false,
    });

    if (allmembers && groupDetail) {
      var group_member_local = allmembers.map((ids) => {
        return {
          id: ids.userId._id,
          readmsg: true,
        };
      });
      if (
        group_member_local.filter((id) => {
          if (removemember.includes(id.id.toString())) return id;
        }).length === 0
      ) {
        for (var index = 0; index < removemember.length; index++) {
          group_member_local.push({
            id: removemember[index],
            readmsg: true,
          });
        }
      }
      const newchat = new chat({
        message: "",
        recipient_type: "userChatGroup",
        sender_type: "airtable-syncs",
        recipient: groupid,
        sender: authUserId,
        type: "userChatGroup",
        group_member: group_member_local,
        activity_status: true,
        activity: {
          type: "removed",
          adminId: authUserId,
          userId: [...removemember],
        },
        userTimeStamp:
          time_stamp ?? moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
      });
      const result = await newchat.save();
      const perResult = await chat.findById(result._id).lean();
      const result_data = {
        ...perResult,
        recipient: {
          id: groupDetail._id,
          firstname: groupDetail.groupTitle ?? "",
          image: groupDetail.groupImage ?? "",
          type: "userChatGroup",
        },
        sender: {
          id: perResult.sender ? perResult.sender._id : "",
          firstname: perResult.sender
            ? perResult.sender.otherdetail
              ? perResult.sender.otherdetail[process.env.USER_FN_ID] +
                " " +
                perResult.sender.otherdetail[process.env.USER_LN_ID]
              : ""
            : "",
          image: perResult.sender ? perResult.sender.profileImg : "",
          type: "user",
        },
        activity: {
          ...perResult.activity,
          adminId: {
            id: perResult.activity.adminId
              ? perResult.activity.adminId._id
              : "",
            firstname: perResult.activity.adminId
              ? perResult.activity.adminId.otherdetail
                ? perResult.activity.adminId.otherdetail[
                    process.env.USER_FN_ID
                  ] +
                  " " +
                  perResult.activity.adminId.otherdetail[process.env.USER_LN_ID]
                : ""
              : "",
            image: perResult.activity.adminId
              ? perResult.activity.adminId.profileImg
              : "",
            type: "user",
          },
          userId: perResult.activity.userId
            ? perResult.activity.userId.map((user) => {
                return {
                  id: user ? user._id : "",
                  firstname: user
                    ? user.otherdetail
                      ? user.otherdetail[process.env.USER_FN_ID] +
                        " " +
                        user.otherdetail[process.env.USER_LN_ID]
                      : ""
                    : "",
                  image: user ? user.profileImg : "",
                  type: "user",
                };
              })
            : [],
        },
      };
      if (result_data)
        return {
          status: true,
          message: "Members removed successfully with activity message!",
          messageData: [result_data],
        };
      else
        return {
          status: false,
          message:
            "Something went wrong while getting group detail in remove member activity!",
          messageData: [],
        };
    } else {
      return {
        status: false,
        message: "Something went wrong while retriving group data!",
        messageData: [],
      };
    }
  } catch (e) {}
};

// delete group by owner socket function
exports.deleteGroupSocket = async (groupid, authUserId) => {
  try {
    const data = await userChatGroup.findOne({ _id: groupid, isDelete: false });
    const allmembers = await userChatGroupMember.find({
      groupId: groupid,
      status: 2,
      isDelete: false,
    });
    if (data) {
      if (data.created_by?._id?.toString() === authUserId.toString()) {
        if (data.group_image) {
          await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET,
              Key: data.group_image,
            })
            .promise();
        }
        const editgroup = await userChatGroup.findByIdAndUpdate(
          groupid,
          { isDelete: true },
          { new: true }
        );
        await userChatGroupMember.deleteMany(
          { groupId: groupid },
          { new: true }
        );
        await chat.deleteMany({ recipient: groupid }, { new: true });

        if (editgroup) {
          return {
            status: true,
            message: "Group deleted successfully!",
            data: editgroup,
            messageData: allmembers,
          };
        } else return { status: false, message: "Something went wrong!" };
      } else {
        return { status: false, message: "You are not an admin!" };
      }
    } else {
      return { status: false, message: "Group not found!" };
    }
  } catch (e) {
    console.log(e);
    return { status: false, message: "Something went wrong!" };
  }
};

// leave group by by user socket function
// exports.leaveFromGroupSocket = async (groupid, authUserId, time_stamp) => {
//   console.log("calling this function for leave group");
//   try {
//     var groupDetail;
//     const data = await userChatGroupMember.findOne({
//       groupId: groupid,
//       userId: authUserId,
//     });
//     const allmembers = await userChatGroupMember.find({
//       groupId: groupid,
//       status: 2,
//       isDelete: false,
//     });

//     const user_data = await User.findById(authUserId);

//     if (data.length !== 0) {
//       if (
//         !(
//           user_data.deleted_group_of_user &&
//           user_data.deleted_group_of_user.includes(new ObjectId(groupid))
//         )
//       ) {
//         await User.findByIdAndUpdate(authUserId, {
//           $push: { deleted_group_of_user: new ObjectId(groupid) },
//         });
//       }
//       const removemember = await userChatGroupMember.findOneAndDelete(
//         { groupId: groupid, userId: authUserId },
//         { new: true }
//       );
//       groupDetail = await userChatGroup.findByIdAndUpdate(
//         groupid,
//         { $inc: { totalGrpMember: -1 } },
//         { new: true }
//       );

//       if (removemember) {
//         var group_member_local = allmembers.map((ids) => {
//           return {
//             id: ids.userId._id,
//             readmsg: true,
//           };
//         });
//         const newchat = new chat({
//           message: "",
//           recipient_type: "userChatGroup",
//           sender_type: "airtable-syncs",
//           recipient: groupid,
//           sender: authUserId,
//           type: "userChatGroup",
//           group_member: group_member_local,
//           activity_status: true,
//           activity: {
//             type: "left",
//             userId: [authUserId],
//           },
//           userTimeStamp:
//             time_stamp ?? moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
//         });
//         const result = await newchat.save();
//         const perResult = result._doc;
//         const result_data = {
//           ...perResult,
//           recipient: {
//             id: groupDetail._id,
//             firstname: groupDetail.groupTitle ?? "",
//             image: groupDetail.groupImage ?? "",
//             type: "userChatGroup",
//           },
//           sender: {
//             id: perResult.sender ? perResult.sender._id : "",
//             firstname: perResult.sender
//               ? perResult.sender.otherdetail
//                 ? perResult.sender.otherdetail[process.env.USER_FN_ID] +
//                   " " +
//                   perResult.sender.otherdetail[process.env.USER_LN_ID]
//                 : ""
//               : "",
//             image: perResult.sender ? perResult.sender.profileImg : "",
//             type: "user",
//           },
//           activity: {
//             ...perResult.activity._doc,
//             adminId: {
//               id: perResult.activity.adminId
//                 ? perResult.activity.adminId._id
//                 : "",
//               firstname: perResult.activity.adminId
//                 ? perResult.activity.adminId.otherdetail
//                   ? perResult.activity.adminId.otherdetail[
//                       process.env.USER_FN_ID
//                     ] +
//                     " " +
//                     perResult.activity.adminId.otherdetail[
//                       process.env.USER_LN_ID
//                     ]
//                   : ""
//                 : "",
//               image: perResult.activity.adminId
//                 ? perResult.activity.adminId.profileImg
//                 : "",
//               type: "user",
//             },
//             userId: perResult.activity.userId
//               ? perResult.activity.userId.map((user) => {
//                   return {
//                     id: user ? user._id : "",
//                     firstname: user
//                       ? user.otherdetail
//                         ? user.otherdetail[process.env.USER_FN_ID] +
//                           " " +
//                           user.otherdetail[process.env.USER_LN_ID]
//                         : ""
//                       : "",
//                     image: user ? user.profileImg : "",
//                     type: "user",
//                   };
//                 })
//               : [],
//           },
//         };
//         if (result_data)
//           return {
//             status: true,
//             message: "You are removed from this group!",
//             data: groupDetail,
//             messageData: [result_data],
//           };
//         else
//           return {
//             status: false,
//             message: "Something went wrong while updating history!",
//           };
//       } else {
//         return {
//           status: false,
//           message: "Something went wrong while removing member!",
//         };
//       }
//     } else {
//       return { status: false, message: "Group not found!" };
//     }
//   } catch (e) {
//     console.log(e);
//     return {
//       status: false,
//       message: "Something went wrong!",
//       error: e.message,
//     };
//   }
// };

// new Changes code
exports.leaveFromGroupSocket = async (groupid, authUserId, time_stamp) => {
  try {
    var groupDetail;
    const data = await userChatGroupMember.findOne({
      groupId: groupid,
      userId: authUserId,
    });
    const allmembers = await userChatGroupMember.find({
      groupId: groupid,
      status: 2,
      isDelete: false,
    });
    const user_data = await User.findById(authUserId);
    console.log(data, "data retunr");
    if (data) {
      if (!user_data.deleted_group_of_user.includes(groupid)) {
        // Bulk update deleted_group_of_user field
        await User.findByIdAndUpdate(authUserId, {
          $push: { deleted_group_of_user: groupid },
        });
      }
      const removemember = await userChatGroupMember.findOneAndDelete({
        groupId: groupid,
        userId: authUserId,
      });
      groupDetail = await userChatGroup.findByIdAndUpdate(
        groupid,
        { $inc: { totalGrpMember: -1 } },
        { new: true }
      );

      if (removemember) {
        var group_member_local = allmembers.map((ids) => {
          return {
            id: ids.userId._id,
            readmsg: true,
          };
        });
        const newchat = new chat({
          message: "",
          recipient_type: "userChatGroup",
          sender_type: "airtable-syncs",
          recipient: groupid,
          sender: authUserId,
          type: "userChatGroup",
          group_member: group_member_local,
          activity_status: true,
          activity: {
            type: "left",
            userId: [authUserId],
          },
          userTimeStamp:
            time_stamp ?? moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
        });
        const result = await newchat.save();
        const perResult = result._doc;
        const result_data = {
          ...perResult,
          recipient: {
            id: groupDetail._id,
            firstname: groupDetail.groupTitle ?? "",
            image: groupDetail.groupImage ?? "",
            type: "userChatGroup",
          },
          sender: {
            id: perResult.sender ? perResult.sender._id : "",
            firstname: perResult.sender
              ? perResult.sender.otherdetail
                ? perResult.sender.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  perResult.sender.otherdetail[process.env.USER_LN_ID]
                : ""
              : "",
            image: perResult.sender ? perResult.sender.profileImg : "",
            type: "user",
          },
          activity: {
            ...perResult.activity._doc,
            adminId: {
              id: perResult.activity.adminId
                ? perResult.activity.adminId._id
                : "",
              firstname: perResult.activity.adminId
                ? perResult.activity.adminId.otherdetail
                  ? perResult.activity.adminId.otherdetail[
                      process.env.USER_FN_ID
                    ] +
                    " " +
                    perResult.activity.adminId.otherdetail[
                      process.env.USER_LN_ID
                    ]
                  : ""
                : "",
              image: perResult.activity.adminId
                ? perResult.activity.adminId.profileImg
                : "",
              type: "user",
            },
            userId: perResult.activity.userId
              ? perResult.activity.userId.map((user) => {
                  return {
                    id: user ? user._id : "",
                    firstname: user
                      ? user.otherdetail
                        ? user.otherdetail[process.env.USER_FN_ID] +
                          " " +
                          user.otherdetail[process.env.USER_LN_ID]
                        : ""
                      : "",
                    image: user ? user.profileImg : "",
                    type: "user",
                  };
                })
              : [],
          },
        };
        if (result_data)
          return {
            status: true,
            message: "You are removed from this group!",
            data: groupDetail,
            messageData: [result_data],
          };
        else
          return {
            status: false,
            message: "Something went wrong while updating history!",
          };
      } else {
        return {
          status: false,
          message: "Something went wrong while removing member!",
        };
      }
    } else {
      return { status: false, message: "Group not found!" };
    }
  } catch (e) {
    console.log(e);
    return { status: false, message: "Something went wrong!" };
  }
};

// count of files in any chat socket function
exports.countOfFileSocket = async (chatid, authUserId, type) => {
  try {
    const userid = new ObjectId(authUserId);
    let clearUser = [],
      clearDate = "";
    let chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    } else if (type.toLowerCase() === "chatchannel") {
      if (clearDate.toString().length > 0) {
        const joined_date = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    return chatCount;
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// files listing socket function
exports.listOfFileSocket = async (
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) => {
  try {
    const userid = new ObjectId(authUserId);
    const page = parseInt(pagecnt);
    const limit = parseInt(limitcnt);
    const skip = (page - 1) * limit;

    let clearUser = [],
      clearDate = "";
    let chatData = [],
      chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "file",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatData = await chat
          .find({ recipient: new ObjectId(chatid), message_type: "file" })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "file",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "file",
            createdAt: { $gt: joined_date.createdAt },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    } else if (type.toLowerCase() === "chatChannel") {
      if (clearDate.toString().length > 0) {
        const joined_date = await chatChannelMembers.findOne({
          chaannelId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "file",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "file",
            createdAt: { $gt: joined_date.createdAt },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "file",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    var response = [];
    for (var i = 0; i < chatData.length; i++) {
      response.push({
        _id: chatData[i]._id,
        file: process.env.AWS_IMG_VID_PATH + chatData[i].otherfiles[0],
        file_size: chatData[i].size,
        createdAt: chatData[i].createdAt,
      });
    }

    if (response.length !== 0 && chatCount !== 0) {
      return {
        status: true,
        message: `File list retrive successfully.`,
        currentPage: page,
        chatid: chatid,
        data: {
          currentPage: page,
          chatid: chatid,
          fileList: response,
          totalPages: Math.ceil(chatCount / limit),
          totalMessages: chatCount,
        },
      };
    } else {
      return {
        status: false,
        message: "File list not found!",
        currentPage: page,
        chatid: chatid,
        data: {
          currentPage: page,
          chatid: chatid,
          fileList: [],
          totalPages: Math.ceil(chatCount / limit),
          totalMessages: chatCount,
        },
      };
    }
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// count of media in any chat socket function
exports.countOfMediaSocket = async (chatid, authUserId, type) => {
  try {
    const userid = new ObjectId(authUserId);
    let clearUser = [],
      clearDate = "";
    let chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });
        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    } else if (type.toLowerCase() === "chatchannel") {
      if (clearDate.toString().length > 0) {
        const joined_date = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });
        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    return chatCount;
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// media listing socket function
exports.listOfMediaSocket = async (
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) => {
  try {
    const userid = new ObjectId(authUserId);
    const page = parseInt(pagecnt);
    const limit = parseInt(limitcnt);
    const skip = (page - 1) * limit;

    let clearUser = [],
      clearDate = "";
    let chatData = [],
      chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "media",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatData = await chat
          .find({ recipient: new ObjectId(chatid), message_type: "media" })
          .select("+_id +media +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "media",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });

        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "media",
            createdAt: { $gt: joined_date.createdAt },
          })
          .select("+_id +media +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "media",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    var response = [];
    for (var i = 0; i < chatData.length; i++) {
      response.push({
        _id: chatData[i]._id,
        file: process.env.AWS_IMG_VID_PATH + chatData[i].media[0],
        file_size: chatData[i].size,
        video_thumbnail: chatData[i].video_thumbnail
          ? process.env.AWS_IMG_VID_PATH + chatData[i].video_thumbnail
          : "",
        createdAt: chatData[i].createdAt,
      });
    }

    if (response.length !== 0 && chatCount !== 0) {
      return {
        status: true,
        message: `Media list retrive successfully.`,
        currentPage: page,
        chatid: chatid,
        data: {
          currentPage: page,
          chatid: chatid,
          mediaList: response,
          totalPages: Math.ceil(chatCount / limit),
          totalMessages: chatCount,
        },
      };
    } else {
      return {
        status: false,
        message: "Media list not found!",
        currentPage: page,
        chatid: chatid,
        data: {
          currentPage: page,
          chatid: chatid,
          mediaList: [],
          totalPages: Math.ceil(chatCount / limit),
          totalMessages: chatCount,
        },
      };
    }
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// count of url links in any chat socket function
exports.countOfUrlSocket = async (chatid, authUserId, type) => {
  try {
    const userid = new ObjectId(authUserId);
    let clearUser = [],
      clearDate = "";
    let chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    } else if (type.toLowerCase() === "chatchannel") {
      if (clearDate.toString().length > 0) {
        const joined_date = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    return chatCount;
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// url link listing socket function
exports.listOfUrlSocket = async (
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) => {
  try {
    const userid = new ObjectId(authUserId);
    const page = parseInt(pagecnt);
    const limit = parseInt(limitcnt);
    const skip = (page - 1) * limit;

    let clearUser = [],
      clearDate = "";
    let chatData = [],
      chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(chatid), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "url",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatData = await chat
          .find({ recipient: new ObjectId(chatid), message_type: "url" })
          .select("+_id +message +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "url",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(chatid),
          userId: userid,
          status: 2,
        });
        chatData = await chat
          .find({
            recipient: new ObjectId(chatid),
            message_type: "url",
            createdAt: { $gt: joined_date.createdAt },
          })
          .select("+_id +message +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(chatid),
          message_type: "url",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    var response = [];
    for (var i = 0; i < chatData.length; i++) {
      response.push({
        _id: chatData[i]._id,
        link: chatData[i].message,
        createdAt: chatData[i].createdAt,
      });
    }

    if (response.length !== 0 && chatCount !== 0) {
      return {
        status: true,
        message: `URL list retrive successfully.`,
        currentPage: page,
        chatid: chatid,
        data: {
          currentPage: page,
          chatid: chatid,
          linkList: response,
          totalPages: Math.ceil(chatCount / limit),
          totalMessages: chatCount,
        },
      };
    } else {
      return {
        status: false,
        message: "URL list not found!",
        currentPage: page,
        chatid: chatid,
        data: {
          currentPage: page,
          chatid: chatid,
          linkList: [],
          totalPages: Math.ceil(chatCount / limit),
          totalMessages: chatCount,
        },
      };
    }
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

/** Group chat user socket code ends **/

/** Group Chat User API Code Start **/
// create user chat group function
exports.createUserChatGroup = async (req, res) => {
  try {
    let { authUserId } = req;
    const { group_image } = req;

    const adminSetting = await groupChatSettings.findOne({});
    if (
      req.body.participents &&
      req.body.participents?.length > adminSetting.groupMember - 1
    )
      return res.status(200).json({
        status: false,
        message: `You can only select ${adminSetting.groupMember} participate at a time`,
      });

    let parti_value = [];

    if (req.body.participents !== undefined) {
      parti_value = req.body.participents.map((id) => {
        return { id: id };
      });
    }

    parti_value.push({
      id: authUserId,
    });

    const savegroup = {
      groupTitle: req.body.group_name,
      groupImage: group_image,
      created_by: authUserId,
    };

    if (savegroup) {
      const data = await userChatGroup(savegroup).save();
      const temp = parti_value?.map(async (member) => {
        if (authUserId === member.id) {
          const groupAdmin = new userChatGroupMember({
            userId: authUserId,
            groupId: data._id,
            status: 2,
            user_type: "adminuser",
          });
          await groupAdmin.save();
          await userChatGroup.findByIdAndUpdate(
            data._id,
            { $inc: { totalGrpMember: 1 } },
            { new: true }
          );
        } else {
          const groupMember = new userChatGroupMember({
            userId: member.id,
            groupId: data._id,
            status: 2,
            user_type: "airtable-syncs",
          });
          if (!groupMember)
            return res
              .status(200)
              .json({ status: false, message: "Something went wrong!" });

          const addMember = await groupMember.save();
          if (addMember) {
            await userChatGroup.findByIdAndUpdate(
              data._id,
              { $inc: { totalGrpMember: 1 } },
              { new: true }
            );
          }
        }
      });
      await Promise.all([...temp]);

      const groupData = await Promise.all(
        await userChatGroup.aggregate([
          {
            $match: {
              _id: new ObjectId(data._id),
              isDelete: false,
            },
          },
          {
            $lookup: {
              from: "userchatgroupmembers",
              let: { localField: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$$localField", "$groupId"],
                    },
                    status: 2,
                  },
                },
                {
                  $lookup: {
                    from: "airtable-syncs",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                  },
                },
                {
                  $lookup: {
                    from: "chat_users",
                    let: { userId: "$_id" },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$userid", "$$userId"],
                          },
                        },
                      },
                    ],
                    as: "userChat",
                  },
                },
                {
                  $addFields: {
                    onlineStatus: {
                      $cond: [
                        { $gt: [{ $size: "$userChat" }, 0] },
                        "$userChat.online",
                        false,
                      ],
                    },
                  },
                },
                {
                  $project: {
                    userChat: 0,
                  },
                },
                { $unwind: "$user" },
              ],
              as: "members",
            },
          },
          {
            $project: {
              _id: 1,
              groupTitle: 1,
              groupImage: 1,
              created_by: 1,
              totalGrpMember: 1,
              isDelete: 1,
              members: 1,
              userList: "$members.user",
            },
          },
        ])
      );

      if (groupData) {
        var group_member_local = parti_value.map((ids) => {
          if (
            new mongoose.Types.ObjectId(ids.id) !==
            new mongoose.Types.ObjectId(authUserId)
          ) {
            return { id: ids.id, readmsg: false };
          } else {
            return { id: ids.id, readmsg: true };
          }
        });
        group_member_local.push({ id: authUserId, readmsg: true });

        const data = new chat({
          message: "",
          recipient_type: "userChatGroup",
          sender_type: "airtable-syncs",
          recipient: groupData[0]._id,
          sender: authUserId,
          type: "userChatGroup",
          group_member: group_member_local,
          activity_status: true,
          activity: {
            type: "created",
            adminId: authUserId,
          },
        });
        const result = await data.save();
        return res.status(200).json({
          status: true,
          message: "Group created!!",
          data: groupData,
          messageData: result,
        });
      } else {
        return res
          .status(200)
          .json({ status: false, message: "Something went wrong!" });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Something went wrong!" });
    }
  } catch (e) {
    0;
    console.log(e);
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// edit user chat group function
exports.editUserChatGroup = async (req, res) => {
  try {
    let { groupid } = req.params;
    let { authUserId } = req;
    const { group_image } = req;

    const data = await userChatGroup.findOne({ _id: groupid, isDelete: false });
    if (data) {
      if (data?.created_by?._id.toString() === authUserId?.toString()) {
        if (group_image && data.group_image) {
          await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET,
              Key: data.group_image,
            })
            .promise();
        }

        await userChatGroup.findByIdAndUpdate(
          groupid,
          {
            groupImage: group_image === "" ? data?.group_image : group_image,
            groupTitle:
              req?.body?.group_name === ""
                ? data?.group_name
                : req?.body?.group_name,
          },
          { new: true }
        );

        const groupData = await Promise.all(
          await userChatGroup.aggregate([
            {
              $match: {
                _id: new ObjectId(groupid),
                isDelete: false,
              },
            },
            {
              $lookup: {
                from: "userchatgroupmembers",
                let: { localField: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$$localField", "$groupId"],
                      },
                      status: 2,
                    },
                  },
                  {
                    $lookup: {
                      from: "airtable-syncs",
                      localField: "userId",
                      foreignField: "_id",
                      as: "user",
                    },
                  },
                  {
                    $lookup: {
                      from: "chat_users",
                      let: { userId: "$_id" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$userid", "$$userId"],
                            },
                          },
                        },
                      ],
                      as: "userChat",
                    },
                  },
                  {
                    $addFields: {
                      onlineStatus: {
                        $cond: [
                          { $gt: [{ $size: "$userChat" }, 0] },
                          "$userChat.online",
                          false,
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      userChat: 0,
                    },
                  },
                  { $unwind: "$user" },
                ],
                as: "members",
              },
            },
            {
              $project: {
                _id: 1,
                groupTitle: 1,
                groupImage: 1,
                created_by: 1,
                totalGrpMember: 1,
                isDelete: 1,
                members: 1,
                userList: "$members.user",
              },
            },
          ])
        );

        if (groupData) {
          var group_member_local = groupData[0].members.map((ids) => {
            if (ids.userId.toString() !== authUserId.toString()) {
              return {
                id: ids.userId,
                readmsg: false,
              };
            } else {
              return {
                id: ids.userId,
                readmsg: true,
              };
            }
          });
          const data = new chat({
            message: "",
            recipient_type: "userChatGroup",
            sender_type: "airtable-syncs",
            recipient: groupData[0]._id,
            sender: authUserId,
            type: "userChatGroup",
            group_member: group_member_local,
            activity_status: true,
            activity: {
              type: "edited",
              adminId: authUserId,
            },
            userTimeStamp:
              req.body.time_stamp ??
              moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
          });
          const result = await data.save();
          return res.status(200).json({
            status: true,
            message: "User group updated!",
            data: groupData,
            messageData: result,
          });
        } else
          return res.status(200).json({
            status: false,
            message: "Something went wrong!",
            data: [],
          });
      } else {
        return res.status(200).json({
          status: false,
          message: "Only admin user can update this group!",
        });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Group not found!" });
    }
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      status: false,
      message: "Something went wrong!",
      data: [],
      error: `${e.message}`,
    });
  }
};

// invite group link to friends list
exports.groupInvitationToUser = async (req, res) => {
  try {
    const { inviteUser } = req.body;
    const validGroup = await User.find({ _id: { $in: inviteUser } });
    if (validGroup.length < 1)
      return res
        .status(200)
        .json({ status: false, message: "User not found." });

    const newEntry = [];
    var temp = inviteUser.map(async (inviteId) => {
      const groupUserEntry = await userChatGroupMember.findOne({
        userId: inviteId,
        groupId: req.params.groupid,
      });

      if (groupUserEntry) {
        if (groupUserEntry.status === 1)
          return res.status(200).json({
            status: false,
            message: "User have already send invitation.",
          });
        else if (groupUserEntry.status === 2)
          return res
            .status(200)
            .json({ status: false, message: "User have already join group." });
        else
          return res
            .status(200)
            .json({ status: false, message: "Something wrong." });
      }
      const data = await new userChatGroupMember({
        userId: inviteId,
        groupId: req.params.groupid,
        status: 1,
      }).save();

      var user = await User.findById(inviteId);
      let mail_data = {
        email: user.email,
        subject: "Join the group",
        html: "Click on the link to join the group",
      };

      await sendEmail(mail_data);
      newEntry.push(data);
    });
    await Promise.all([...temp]);

    return res.status(200).send({
      status: true,
      message: "Group invite sent to user's.",
      data: newEntry,
    });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: error.message, data: [] });
  }
};

// join user chat group function
exports.joinGroup = async (req, res) => {
  try {
    const { authUserId } = req;
    const { groupId } = req.body;

    const findentry = await userChatGroupMember.findOne({
      userId: authUserId,
      groupId: groupId,
      status: 2,
    });
    if (findentry)
      return res
        .status(200)
        .json({ status: false, message: "User have already join this group." });

    const savedEntry = await userChatGroupMember.findOneAndUpdate(
      { userId: authUserId, groupId: groupId, status: 1 },
      { status: 2 },
      { new: true }
    );

    if (savedEntry) {
      await userChatGroup.findByIdAndUpdate(
        new ObjectId(groupId),
        { $inc: { totalGrpMember: 1 } },
        { new: true }
      );

      const groupData = await Promise.all(
        await userChatGroup.aggregate([
          {
            $match: {
              _id: new ObjectId(groupId),
              isDelete: false,
            },
          },
          {
            $lookup: {
              from: "userchatgroupmembers",
              localField: "_id",
              foreignField: "groupId",
              pipeline: [
                {
                  $match: {
                    status: 2,
                  },
                },
              ],
              as: "members",
            },
          },
        ])
      );

      if (groupData) {
        var group_member_local = groupData[0].members.map((ids) => {
          if (ids.userId.toString() !== authUserId.toString()) {
            return {
              id: ids.userId,
              readmsg: false,
            };
          } else {
            return {
              id: ids.userId,
              readmsg: true,
            };
          }
        });
        var userIds = [];
        userIds.push(authUserId);
        const data = new chat({
          message: "",
          recipient_type: "userChatGroup",
          sender_type: "airtable-syncs",
          recipient: groupData[0]._id,
          sender: groupData[0].created_by,
          type: "userChatGroup",
          group_member: group_member_local,
          activity_status: true,
          activity: {
            type: "joined",
            adminId: groupData[0].created_by,
            userId: userIds,
          },
          userTimeStamp:
            req.body.time_stamp ??
            moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
        });
        const result = await data.save();
        return res.status(200).json({
          status: true,
          message: "User has join group.",
          data: savedEntry,
          messageData: result,
        });
      } else {
        return res
          .status(200)
          .json({ status: false, message: "Something went wrong!", data: [] });
      }
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// get user chat group by user function
exports.getAllChatGroup = async (req, res) => {
  try {
    const { authUserId } = req;
    const data = await userChatGroup.find({
      created_by: { $eq: authUserId },
      isDelete: false,
    });

    if (data) return res.status(200).json({ status: true, data: data });
    else
      return res
        .status(200)
        .json({ status: false, message: "No group found!" });
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};
// get all members details by group id function
exports.getGroupAndMembersDetail = async (groupId) => {
  const groupData = await userChatGroup.aggregate([
    {
      $match: {
        _id: new ObjectId(groupId),
        isDelete: false,
      },
    },
    {
      $lookup: {
        from: "userchatgroupmembers",
        let: { localField: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$$localField", "$groupId"],
              },
              status: 2,
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "userId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    auth0Id: 1,
                    email: 1,
                    otherdetail: 1,
                    profileImg: 1,
                    thumb_profileImg: 1,
                    attendeeDetail: 1,
                  },
                },
              ],
              as: "user",
            },
          },
          { $unwind: "$user" },
        ],
        as: "members",
      },
    },
    {
      $project: {
        _id: 1,
        groupTitle: 1,
        groupImage: 1,
        created_by: 1,
        totalGrpMember: 1,
        isDelete: 1,
        members: 1,
        userList: "$members.user",
      },
    },
  ]);
  return groupData;
};
// get all members details by the group id
exports.getAllGroupMember = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.groupid))
      return res.status(200).json({ status: false, message: "Invalid ID!" });
    const groupData = await this.getGroupAndMembersDetail(req.params.groupid);

    if (groupData)
      return res.status(200).send({
        status: true,
        message: "Group members retrive.",
        data: groupData,
      });
    else
      return res.status(200).send({
        status: false,
        message: "This group don't have any members.",
        data: [],
      });
  } catch (error) {
    console.log(error);
    return res
      .status(200)
      .json({ status: false, message: error.message, data: [] });
  }
};

// get user chat group details by group id function
exports.getGroupById = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.groupid))
      return res.status(200).json({ status: false, message: "Invalid ID!" });
    const { groupid } = req.params;
    const data = await userChatGroup.findOne({ _id: groupid, isDelete: false });

    if (data) return res.status(200).json({ status: true, data: data });
    else
      return res
        .status(200)
        .json({ status: false, message: "No group found!" });
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: true, message: "Something went wrong!" });
  }
};

// get user chat group details by group id function
exports.deleteGroup = async (req, res) => {
  try {
    let { groupid } = req.params;
    let { authUserId } = req;
    const data = await userChatGroup.findOne({ _id: groupid, isDelete: false });

    if (data) {
      if (data.created_by?._id?.toString() === authUserId.toString()) {
        if (data.group_image) {
          await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET,
              Key: data.group_image,
            })
            .promise();
        }

        const editgroup = await userChatGroup.findByIdAndUpdate(
          groupid,
          { isDelete: true },
          { new: true }
        );

        await userChatGroupMember.deleteMany(
          { groupId: groupid },
          { new: true }
        );
        await chat.deleteMany({ recipient: groupid }, { new: true });

        if (editgroup)
          return res.status(200).json({
            status: true,
            message: "Group deleted successfully!",
            data: editgroup,
          });
        else
          return res
            .status(200)
            .json({ status: false, message: "Something went wrong!" });
      } else {
        return res
          .status(200)
          .json({ status: false, message: "You are not an admin!" });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Group not found!" });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// add member in user chat group by owner function
exports.addGroupMember = async (req, res) => {
  try {
    let { groupid } = req.params;
    let { authUserId } = req;
    var userIds = [];
    const data = await userChatGroup.findOne({ _id: groupid, isDelete: false });

    if (data) {
      const addmembers = req.body.addmember.map((mem) => {
        return { id: mem };
      });

      if (data.created_by._id.toString() === authUserId.toString()) {
        const temp = addmembers?.map(async (member) => {
          if (
            !(await userChatGroupMember.findOne({
              userId: member.id,
              groupId: groupid,
            }))
          ) {
            userIds.push(member.id);
            const groupMember = new userChatGroupMember({
              userId: member.id,
              groupId: groupid,
              status: 2,
              user_type: "airtable-syncs",
            });
            if (!groupMember)
              return res.status(200).json({
                status: true,
                message: "Group members are not created !!",
              });

            const addMember = await groupMember.save();
            if (addMember) {
              const user_data = await User.findById(new ObjectId(member.id));
              if (
                user_data.deleted_group_of_user &&
                user_data.deleted_group_of_user.includes(new ObjectId(groupid))
              ) {
                await User.findByIdAndUpdate(member.id, {
                  $pull: { deleted_group_of_user: new ObjectId(groupid) },
                });
              }
              await userChatGroup.findByIdAndUpdate(
                groupid,
                { $inc: { totalGrpMember: 1 } },
                { new: true }
              );
            }
          }
        });
        await Promise.all([...temp]);

        const editgroup = await Promise.all(
          await userChatGroup.aggregate([
            {
              $match: {
                _id: new ObjectId(groupid),
                isDelete: false,
              },
            },
            {
              $lookup: {
                from: "userchatgroupmembers",
                let: { localField: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$$localField", "$groupId"],
                      },
                      status: 2,
                    },
                  },
                  {
                    $lookup: {
                      from: "airtable-syncs",
                      localField: "userId",
                      foreignField: "_id",
                      as: "user",
                    },
                  },
                  {
                    $lookup: {
                      from: "chat_users",
                      let: { userId: "$_id" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$userid", "$$userId"],
                            },
                          },
                        },
                      ],
                      as: "userChat",
                    },
                  },
                  {
                    $addFields: {
                      onlineStatus: {
                        $cond: [
                          { $gt: [{ $size: "$userChat" }, 0] },
                          "$userChat.online",
                          false,
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      userChat: 0,
                    },
                  },
                  { $unwind: "$user" },
                ],
                as: "members",
              },
            },
            {
              $project: {
                _id: 1,
                groupTitle: 1,
                groupImage: 1,
                created_by: 1,
                totalGrpMember: 1,
                isDelete: 1,
                members: 1,
                userList: "$members.user",
              },
            },
          ])
        );

        if (editgroup) {
          var group_member_local = editgroup[0].members.map((ids) => {
            if (ids.userId.toString() !== authUserId.toString()) {
              return {
                id: ids.userId,
                readmsg: false,
              };
            } else {
              return {
                id: ids.userId,
                readmsg: true,
              };
            }
          });

          const data = new chat({
            message: "",
            recipient_type: "userChatGroup",
            sender_type: "airtable-syncs",
            recipient: editgroup[0]._id,
            sender: authUserId,
            type: "userChatGroup",
            group_member: group_member_local,
            activity_status: true,
            activity: {
              type: "added",
              adminId: authUserId,
              userId: [...req.body.addmember],
            },
            userTimeStamp:
              req.body.time_stamp ??
              moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
          });
          const result = await data.save();

          return res.status(200).json({
            status: true,
            message: "Members added successfully!",
            data: editgroup,
            messageData: result,
          });
        } else {
          return res
            .status(200)
            .json({ status: false, message: "Something went wrong!" });
        }
      } else {
        return res
          .status(200)
          .json({ status: false, message: "You are not group an admin!" });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Group not found!" });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: true, message: "Something went wrong!" });
  }
};

// remove member in user chat group by owner function
exports.removeGroupMember = async (req, res) => {
  try {
    let { groupid } = req.params;
    let { authUserId } = req;
    const data = await userChatGroup.findOne({
      _id: new ObjectId(groupid),
      isDelete: false,
    });
    if (data) {
      if (data.created_by._id.toString() === authUserId.toString()) {
        const temp = req.body.removemember?.map(async (member) => {
          if (
            await userChatGroupMember.findOne({
              userId: new ObjectId(member),
              groupId: new ObjectId(groupid),
            })
          ) {
            const user_data = await User.findById(new ObjectId(member));
            if (
              !(
                user_data.deleted_group_of_user &&
                user_data.deleted_group_of_user.includes(new ObjectId(groupid))
              )
            ) {
              await User.findByIdAndUpdate(member, {
                $push: { deleted_group_of_user: new ObjectId(groupid) },
              });
            }
            await userChatGroupMember.findOneAndDelete(
              { userId: new ObjectId(member), groupId: new ObjectId(groupid) },
              { new: true }
            );
            await userChatGroup.findByIdAndUpdate(
              groupid,
              { $inc: { totalGrpMember: -1 } },
              { new: true }
            );
          }
        });
        await Promise.all([...temp]);

        const editgroup = await Promise.all(
          await userChatGroup.aggregate([
            {
              $match: {
                _id: new ObjectId(groupid),
                isDelete: false,
              },
            },
            {
              $lookup: {
                from: "userchatgroupmembers",
                let: { localField: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$$localField", "$groupId"],
                      },
                      status: 2,
                    },
                  },
                  {
                    $lookup: {
                      from: "airtable-syncs",
                      localField: "userId",
                      foreignField: "_id",
                      as: "user",
                    },
                  },
                  {
                    $lookup: {
                      from: "chat_users",
                      let: { userId: "$_id" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$userid", "$$userId"],
                            },
                          },
                        },
                      ],
                      as: "userChat",
                    },
                  },
                  {
                    $addFields: {
                      onlineStatus: {
                        $cond: [
                          { $gt: [{ $size: "$userChat" }, 0] },
                          "$userChat.online",
                          false,
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      userChat: 0,
                    },
                  },
                  { $unwind: "$user" },
                ],
                as: "members",
              },
            },
            {
              $project: {
                _id: 1,
                groupTitle: 1,
                groupImage: 1,
                created_by: 1,
                totalGrpMember: 1,
                isDelete: 1,
                members: 1,
                userList: "$members.user",
              },
            },
          ])
        );

        if (editgroup) {
          var group_member_local = editgroup[0].members.map((ids) => {
            if (ids.userId.toString() !== authUserId.toString()) {
              return {
                id: ids.userId,
                readmsg: false,
              };
            } else {
              return {
                id: ids.userId,
                readmsg: true,
              };
            }
          });
          const data = new chat({
            message: "",
            recipient_type: "userChatGroup",
            sender_type: "airtable-syncs",
            recipient: editgroup[0]._id,
            sender: authUserId,
            type: "userChatGroup",
            group_member: group_member_local,
            activity_status: true,
            activity: {
              type: "removed",
              adminId: authUserId,
              userId: [...req.body.removemember],
            },
            userTimeStamp:
              req.body.time_stamp ??
              moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
          });
          const result = await data.save();
          return res.status(200).json({
            status: true,
            message: "Members removed successfully!",
            data: editgroup,
            messageData: result,
          });
        } else {
          return res
            .status(200)
            .json({ status: false, message: "Something went wrong!" });
        }
      } else {
        return res
          .status(200)
          .json({ status: false, message: "You are not an admin!" });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Group not found!" });
    }
  } catch (e) {
    console.log(e);
    res.status(200).json({ status: true, message: "Something went wrong!" });
  }
};

// leave user chat group by user function
exports.leaveFromGroup = async (req, res) => {
  try {
    let { groupid } = req.params;
    let { authUserId } = req;
    const data = await userChatGroupMember.findOne({
      groupId: groupid,
      userId: authUserId,
    });

    const user_data = await User.findById(authUserId);

    if (data.length !== 0) {
      if (
        !(
          user_data.deleted_group_of_user &&
          user_data.deleted_group_of_user.includes(new ObjectId(groupid))
        )
      ) {
        await User.findByIdAndUpdate(authUserId, {
          $push: { deleted_group_of_user: new ObjectId(groupid) },
        });
      }
      const removemember = await userChatGroupMember.findOneAndDelete(
        { groupId: groupid, userId: authUserId },
        { new: true }
      );
      await userChatGroup.findByIdAndUpdate(
        groupid,
        { $inc: { totalGrpMember: -1 } },
        { new: true }
      );

      const editgroup = await Promise.all(
        await userChatGroup.aggregate([
          {
            $match: {
              _id: new ObjectId(groupid),
              isDelete: false,
            },
          },
          {
            $lookup: {
              from: "userchatgroupmembers",
              let: { localField: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$$localField", "$groupId"],
                    },
                    status: 2,
                  },
                },
                {
                  $lookup: {
                    from: "airtable-syncs",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                  },
                },
                {
                  $lookup: {
                    from: "chat_users",
                    let: { userId: "$_id" },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$userid", "$$userId"],
                          },
                        },
                      },
                    ],
                    as: "userChat",
                  },
                },
                {
                  $addFields: {
                    onlineStatus: {
                      $cond: [
                        { $gt: [{ $size: "$userChat" }, 0] },
                        "$userChat.online",
                        false,
                      ],
                    },
                  },
                },
                {
                  $project: {
                    userChat: 0,
                  },
                },
                { $unwind: "$user" },
              ],
              as: "members",
            },
          },
          {
            $project: {
              _id: 1,
              groupTitle: 1,
              groupImage: 1,
              created_by: 1,
              totalGrpMember: 1,
              isDelete: 1,
              members: 1,
              userList: "$members.user",
            },
          },
        ])
      );

      if (editgroup) {
        var group_member_local = editgroup[0].members.map((ids) => {
          if (ids.userId.toString() !== authUserId.toString()) {
            return {
              id: ids.userId,
              readmsg: false,
            };
          } else {
            return {
              id: ids.userId,
              readmsg: true,
            };
          }
        });
        var userIds = [];
        userIds.push(authUserId);
        const data = new chat({
          message: "",
          recipient_type: "userChatGroup",
          sender_type: "airtable-syncs",
          recipient: editgroup[0]._id,
          sender: authUserId,
          type: "userChatGroup",
          group_member: group_member_local,
          activity_status: true,
          activity: {
            type: "left",
            adminId: editgroup[0].created_by,
            userId: userIds,
          },
          userTimeStamp:
            req.body.time_stamp ??
            moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
        });

        const result = await data.save();
        return res.status(200).json({
          status: true,
          message: "You are removed from this group!",
          data: editgroup,
          messageData: result,
        });
      } else {
        return res
          .status(200)
          .json({ status: false, message: "Something went wrong!" });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Group not found!" });
    }
  } catch (e) {
    console.log(e);
    res.status(200).json({ status: true, message: "Something went wrong!" });
  }
};

// listing of file function
exports.listOfFile = async (req, res) => {
  try {
    let { id } = req.params;
    const userid = req.authUserId;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const type = req.query.type;

    let clearUser = [],
      clearDate = "";
    let chatData = [],
      chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(id), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(id), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "file",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "file",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatData = await chat
          .find({ recipient: new ObjectId(id), message_type: "file" })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "file",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "file",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "file",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "file",
            createdAt: { $gt: joined_date.createdAt },
          })
          .select("+_id +otherfiles +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "file",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    var response = [];
    for (var i = 0; i < chatData.length; i++) {
      response.push({
        _id: chatData[i]._id,
        file: process.env.AWS_IMG_VID_PATH + chatData[i].otherfiles[0],
        file_size: chatData[i].size,
        createdAt: chatData[i].createdAt,
      });
    }

    if (response.length !== 0 && chatCount !== 0) {
      return res.status(200).json({
        status: true,
        message: `file list retrive successfully.`,
        data: {
          fileList: response,
          totalPages: Math.ceil(chatCount / limit),
          currentPage: page,
          totalMessages: chatCount,
        },
      });
    } else {
      return res.status(200).json({
        status: false,
        message: `file list not found.`,
        data: {
          fileList: [],
          totalPages: Math.ceil(chatCount / limit),
          currentPage: page,
          totalMessages: chatCount,
        },
      });
    }
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// listing of media function
exports.listOfMedia = async (req, res) => {
  try {
    let { id } = req.params;
    const userid = req.authUserId;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const type = req.query.type;

    let clearUser = [],
      clearDate = "";
    let chatData = [],
      chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(id), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(id), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "media",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +media +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "media",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatData = await chat
          .find({ recipient: new ObjectId(id), message_type: "media" })
          .select("+_id +media +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "media",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "media",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +media +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "media",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "media",
            createdAt: { $gt: joined_date.createdAt },
          })
          .select("+_id +media +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "media",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    var response = [];
    for (var i = 0; i < chatData.length; i++) {
      response.push({
        _id: chatData[i]._id,
        file: process.env.AWS_IMG_VID_PATH + chatData[i].media[0],
        file_size: chatData[i].size,
        video_thumbnail: chatData[i].video_thumbnail
          ? process.env.AWS_IMG_VID_PATH + chatData[i].video_thumbnail
          : "",
        createdAt: chatData[i].createdAt,
      });
    }

    if (response.length !== 0 && chatCount !== 0) {
      return res.status(200).json({
        status: true,
        message: `media list retrive successfully.`,
        data: {
          mediaList: response,
          totalPages: Math.ceil(chatCount / limit),
          currentPage: page,
          totalMessages: chatCount,
        },
      });
    } else {
      return res.status(200).json({
        status: false,
        message: `media list not found.`,
        data: {
          mediaList: [],
          totalPages: Math.ceil(chatCount / limit),
          currentPage: page,
          totalMessages: chatCount,
        },
      });
    }
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// listing of url links function
exports.listOfUrl = async (req, res) => {
  try {
    let { id } = req.params;
    const userid = req.authUserId;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const type = req.query.type;

    let clearUser = [],
      clearDate = "";
    let chatData = [],
      chatCount = 0;

    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(id), deleteConversation: false },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    const clearConversation = await User.findOne(
      {
        _id: userid,
        clear_chat_data: {
          $elemMatch: { id: new ObjectId(id), deleteConversation: true },
        },
      },
      { "clear_chat_data.$": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    } else if (clearConversation !== undefined && clearConversation !== null) {
      clearUser = clearConversation.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "user") {
      if (clearDate.toString().length > 0) {
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "url",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +message +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "url",
          createdAt: { $gt: clearDate },
        });
      } else {
        chatData = await chat
          .find({ recipient: new ObjectId(id), message_type: "url" })
          .select("+_id +message +size +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "url",
        });
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      if (clearDate.toString().length > 0) {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        if (joined_date !== null && joined_date.createdAt > clearDate) {
          clearDate = joined_date.createdAt;
        } else {
          clearDate = clearDate;
        }
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "url",
            createdAt: { $gt: clearDate },
          })
          .select("+_id +message +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "url",
          createdAt: { $gt: clearDate },
        });
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });
        chatData = await chat
          .find({
            recipient: new ObjectId(id),
            message_type: "url",
            createdAt: { $gt: joined_date.createdAt },
          })
          .select("+_id +message +createdAt")
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);
        chatCount = await chat.countDocuments({
          recipient: new ObjectId(id),
          message_type: "url",
          createdAt: { $gt: joined_date.createdAt },
        });
      }
    }

    var response = [];
    for (var i = 0; i < chatData.length; i++) {
      response.push({
        _id: chatData[i]._id,
        link: chatData[i].message,
        createdAt: chatData[i].createdAt,
      });
    }

    if (response.length !== 0 && chatCount !== 0) {
      return res.status(200).json({
        status: true,
        message: `URL list retrive successfully.`,
        data: {
          LinkList: response,
          totalPages: Math.ceil(chatCount / limit),
          currentPage: page,
          totalMessages: chatCount,
        },
      });
    } else {
      return res.status(200).json({
        status: false,
        message: `URL list not found.`,
        data: {
          LinkList: [],
          totalPages: Math.ceil(chatCount / limit),
          currentPage: page,
          totalMessages: chatCount,
        },
      });
    }
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};
/** Group Chat User API Code End **/

/** Group Chat Admin Settings API Code Start **/
// admin settings for the group member and message per day function
exports.addAndUpdateSetting = async (req, res) => {
  try {
    let { authUserId } = req;
    const { group_image } = req;
    if (!req.body)
      return res
        .status(200)
        .json({ status: false, message: "please add some content !!" });

    const saveSetting = {
      groupMember: req.body.groupMember,
      messagesPerDay: req.body.messagesPerDay,
    };
    const alreadyStore = await groupChatSettings.findOne({});

    if (alreadyStore) {
      const data = await groupChatSettings.findOneAndUpdate(
        { _id: alreadyStore._id },
        {
          groupMember: req.body.groupMember,
          messagesPerDay: req.body.messagesPerDay,
        },
        { new: true }
      );

      return res.status(200).json({
        status: true,
        message: "Admin group settings updated!",
        data: data,
      });
    } else {
      const data = await groupChatSettings(saveSetting).save();
      if (data)
        return res.status(200).json({
          status: true,
          message: "Admin group settings added!",
          data: data,
        });
      else
        return res
          .status(200)
          .json({ status: false, message: "Something went wrong!" });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};
/** Group Chat Admin Settings API Code End **/
