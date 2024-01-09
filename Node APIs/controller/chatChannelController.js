const { ObjectId } = require("mongodb");
const User = require("../database/models/airTableSync");
const chatChannel = require("../database/models/chatChannel");
const chatChannelMembers = require("../database/models/chatChannelMembers");
const event = require("../database/models/event");
const chat = require("../database/models/chat");
const { deleteImage } = require("../utils/mediaUpload");
const { updateChat } = require("../controller/chatcontroller");
const {
  get_user_by_socket,
  AddMemberChannelNotification,
} = require("../controller/chatcontroller");
const {
  addUpdateRecordInChatListForGroupChannel,
  deleteMultipleRecordFromChatList,
  deleteRecordFromChatList,
} = require("./socketChatController/chatListController");

// create chat channel
exports.createChatChannel = async (req, res) => {
  try {
    const requestParameters = req.body;
    const io = req.app.get("socketio");
    var allMembers,
      participents = [];

    if (requestParameters.participents !== undefined) {
      allMembers = requestParameters.participents.map((id) => {
        return { id: id };
      });
    }
    if (requestParameters.withEvent.toString() === "true") {
      const eventExists = await event.findById(requestParameters.eventId);
      if (!eventExists)
        return res
          .status(200)
          .json({ status: false, message: "Invalid event Id!!" });

      switch (requestParameters.accessPermission) {
        case "public":
          participents = await User.find(
            {
              _id: { $nin: participents },
              "attendeeDetail.evntData": {
                $elemMatch: {
                  event: requestParameters.eventId,
                  $or: [
                    { member: true },
                    { speaker: true },
                    { partner: true },
                    { guest: true },
                  ],
                },
              },
              $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
            },
            {
              _id: 1,
            }
          );

          break;
        case "admin":
          participents = await User.find(
            {
              _id: { $nin: participents },
              "attendeeDetail.evntData": {
                $elemMatch: {
                  event: requestParameters.eventId,
                  $or: [
                    { member: true },
                    { speaker: true },
                    { partner: true },
                    { guest: true },
                  ],
                },
              },
              "migrate_user.plan_id": "Staff",
              $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
            },
            {
              _id: 1,
            }
          );
          break;
        case "restricted":
          const accessArray =
            requestParameters.restrictedAccess &&
            (requestParameters.restrictedAccess.length > 1 ||
              (requestParameters.restrictedAccess.length === 1 &&
                requestParameters.restrictedAccess[0] !== "users"))
              ? requestParameters.restrictedAccess.filter((access) => {
                  if (access !== "users") return access;
                })
              : requestParameters.restrictedAccess;
          if (
            requestParameters.restrictedAccess &&
            (requestParameters.restrictedAccess.length > 1 ||
              (requestParameters.restrictedAccess.length === 1 &&
                requestParameters.restrictedAccess[0] !== "users"))
          ) {
            participents = await User.find(
              {
                _id: { $nin: participents },
                "attendeeDetail.evntData": {
                  $elemMatch: {
                    event: requestParameters.eventId,
                    $or: accessArray.map((access) => {
                      return { [access]: true };
                    }),
                  },
                },
                $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
              },
              {
                _id: 1,
              }
            );
          }
          break;
        default:
          break;
      }
      var specificMembers = participents.map((attendee) => {
        return { id: attendee._id };
      });
      if (allMembers && allMembers.length > 0)
        allMembers = [...allMembers, ...specificMembers];
      else allMembers = [...specificMembers];
    }

    var saveChannel = {};
    if (requestParameters.withEvent.toString() === "true") {
      saveChannel = {
        channelName: requestParameters.channelName ?? "",
        channelIcon: req.channelIcon ?? "",
        eventId: requestParameters.eventId,
        withEvent: requestParameters.withEvent,
        accessPermission: requestParameters.accessPermission,
        restrictedAccess: requestParameters.restrictedAccess
          ? requestParameters.restrictedAccess.filter((access) => {
              if (access !== "user") return access;
            })
          : [],
        isDelete: false,
      };
    } else {
      saveChannel = {
        channelName: requestParameters.channelName ?? "",
        channelIcon: req.channelIcon ?? "",
        withEvent: requestParameters.withEvent,
        isDelete: false,
      };
    }
    if (saveChannel) {
      const chatChannelSave = await chatChannel(saveChannel).save();
      const allMembersUnique = allMembers
        ? allMembers.filter((member, index) => {
            if (
              allMembers.filter((user, indexInner) => {
                if (user.id === member.id && index !== indexInner) return user;
              }).length === 0
            )
              return member;
          })
        : [];
      const addMembers = allMembersUnique?.map(async (member) => {
        const channelMember = new chatChannelMembers({
          userId: member.id,
          channelId: chatChannelSave._id,
          status: 2,
          user_type: "airtable-syncs",
        });
        if (!channelMember)
          return res.status(200).json({
            status: false,
            message: "Something went wrong while adding members in channel!!",
          });

        await channelMember.save();
      });
      await Promise.all([...addMembers]);

      const channelAdminMember = new chatChannelMembers({
        userId: req.admin_Id,
        channelId: chatChannelSave._id,
        status: 2,
        user_type: "adminuser",
      });
      if (!channelAdminMember)
        return res.status(200).json({
          status: false,
          message: "Something went wrong while adding members in channel!!",
        });

      await channelAdminMember.save();
      var channelMembersChat = allMembersUnique.map((ids) => {
        return { id: ids.id, readmsg: false };
      });
      var memberIdsSocket = allMembersUnique?.map((ids) => {
        return ids.id;
      });
      const addCreateChannelMessage = new chat({
        message: "",
        recipient_type: "chatChannel",
        sender_type: "adminuser",
        recipient: chatChannelSave._id,
        sender: req.admin_Id,
        type: "chatChannel",
        group_member: channelMembersChat,
        activity_status: true,
        activity: {
          type: "createdChannel",
          newGroupName: requestParameters.channelName,
        },
        userTimeStamp: requestParameters.time_stamp,
      });
      const chatData = await saveChatData(
        addCreateChannelMessage,
        chatChannelSave
      );

      await emitSocketChannelActivityEvent(
        io,
        memberIdsSocket,
        chatData,
        "create-channel-receive",
        chatChannelSave
      );

      if (chatChannelSave) {
        return res.status(200).json({
          status: true,
          message: "Channel created successfully!!",
          data: chatChannelSave,
          chatData: chatData,
        });
      } else {
        return res.status(200).json({
          status: false,
          message: "Something went wrong while creating group!!",
        });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Something went wrong!!" });
    }
  } catch (e) {
    return res.status(200).json({
      status: false,
      message: `Internal server error !!, error:${e.message}`,
    });
  }
};

// channel listing
exports.getChannelList = async (req, res) => {
  try {
    const allChannel = await chatChannel
      .find({ isDelete: false })
      .select("channelName eventId");
    return res.status(200).json({
      status: true,
      message: `All channel list`,
      data: allChannel,
    });
  } catch (e) {
    return res.status(200).json({
      status: false,
      message: `Internal server error !!, error:${e.message}`,
    });
  }
};

// delete channel
exports.deleteChannel = async (req, res) => {
  try {
    const io = req.app.get("socketio");
    const allChannelMembers = await chatChannelMembers.find({
      channelId: req.params.id,
      status: 2,
      user_type: "airtable-syncs",
    });
    const deleteChannelData = await chatChannel.findByIdAndUpdate(
      req.params.id,
      { isDelete: true },
      { new: true }
    );
    if (deleteChannelData) {
      const deleteChannleMembers = await chatChannelMembers.deleteMany({
        channelId: req.params.id,
      });
      const getAllChatMedias = await chat
        .find({ recipient: req.params.id })
        .select("media otherfiles video_thumbnail");
      if (getAllChatMedias && getAllChatMedias.length > 0) {
        for (let index = 0; index < getAllChatMedias.length; index++) {
          for (
            let indexMedias = 0;
            indexMedias < getAllChatMedias[index].media.length;
            indexMedias++
          ) {
            deleteImage(getAllChatMedias[index].media[indexMedias]);
          }
          for (
            let indexMedias = 0;
            indexMedias < getAllChatMedias[index].otherfiles.length;
            indexMedias++
          ) {
            deleteImage(getAllChatMedias[index].otherfiles[indexMedias]);
          }
          if (
            getAllChatMedias[index].video_thumbnail &&
            getAllChatMedias[index].video_thumbnail.length
          )
            deleteImage(getAllChatMedias[index].video_thumbnail);
        }
      }
      const deleteChats = await chat.deleteMany({ recipient: req.params.id });
      if (deleteChannleMembers && deleteChats) {
        const memberIdsSocket = allChannelMembers
          ? allChannelMembers.map((member) => {
              return member.userId._id;
            })
          : [];
        await emitSocketChannelActivityEvent(
          io,
          memberIdsSocket,
          {},
          "delete-channel-receive",
          req.params.id
        );
        return res.status(200).json({
          status: true,
          message: "Channel deleted successfully",
        });
      } else
        return res.status(200).json({
          status: false,
          message:
            "Something went wrong while removing channels members and chats",
        });
    } else {
      return res.status(200).json({
        status: false,
        message: `Something went wrong while deleting channel`,
      });
    }
  } catch (e) {
    return res.status(200).json({
      status: false,
      message: `Internal server error !!, error:${e.message}`,
    });
  }
};

// edit chat channel
exports.editChatChannel = async (req, res) => {
  try {
    const io = req.app.get("socketio");
    const channelExists = await chatChannel
      .findById(req.params.id, { isDelete: false })
      .lean();
    if (!channelExists)
      return res
        .status(200)
        .json({ status: false, message: "Channel not found" });

    const requestParameters = req.body;
    var allMembers,
      participents,
      allAttendees,
      allMembersUnique = [];
    const changesInAccess =
      (channelExists.withEvent.toString() === "true" ||
        channelExists.withEvent === true) &&
      requestParameters.accessPermission &&
      requestParameters.restrictedAccess
        ? true
        : false;
    if (req.channelIcon) {
      deleteImage(channelExists.channelIcon);
    }
    const updateChannel = {
      channelName: requestParameters.channelName ?? channelExists.channelName,
      channelIcon: req.channelIcon ?? channelExists.channelIcon,
      accessPermission:
        requestParameters.accessPermission ?? channelExists.accessPermission,
      restrictedAccess: requestParameters.restrictedAccess
        ? requestParameters.restrictedAccess.filter((access) => {
            if (access !== "user") return access;
          })
        : requestParameters.accessPermission &&
          (requestParameters.accessPermission === "admin" ||
            requestParameters.accessPermission === "public")
        ? []
        : channelExists.restrictedAccess,
    };
    if (updateChannel) {
      const chatChannelUpdated = await chatChannel.findByIdAndUpdate(
        req.params.id,
        updateChannel,
        { new: true }
      );
      const oldMembers = await chatChannelMembers.find({
        channelId: req.params.id,
        status: 2,
        user_type: "airtable-syncs",
      });
      if (requestParameters.participents) {
        allMembers = requestParameters.participents.map((id) => {
          return { id: id };
        });
      }

      if (changesInAccess) {
        switch (requestParameters.accessPermission) {
          case "public":
            participents = await User.find(
              {
                _id: { $nin: participents },
                "attendeeDetail.evntData": {
                  $elemMatch: {
                    event: channelExists.eventId,
                    $or: [
                      { member: true },
                      { speaker: true },
                      { partner: true },
                      { guest: true },
                    ],
                  },
                },
                $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
              },
              {
                _id: 1,
              }
            );

            break;
          case "admin":
            participents = await User.find(
              {
                _id: { $nin: participents },
                "attendeeDetail.evntData": {
                  $elemMatch: {
                    event: channelExists.eventId,
                    $or: [
                      { member: true },
                      { speaker: true },
                      { partner: true },
                      { guest: true },
                    ],
                  },
                },
                "migrate_user.plan_id": "Staff",
                $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
              },
              {
                _id: 1,
              }
            );

            break;
          case "restricted":
            console.log("dshghjsdgjgfsdf");
            const accessArray =
              requestParameters.restrictedAccess &&
              (requestParameters.restrictedAccess.length > 1 ||
                (requestParameters.restrictedAccess.length === 1 &&
                  requestParameters.restrictedAccess[0] !== "users"))
                ? requestParameters.restrictedAccess.filter((access) => {
                    if (access !== "users") return access;
                  })
                : requestParameters.restrictedAccess;
            if (
              requestParameters.restrictedAccess &&
              (requestParameters.restrictedAccess.length > 1 ||
                (requestParameters.restrictedAccess.length === 1 &&
                  requestParameters.restrictedAccess[0] !== "users"))
            ) {
              participents = await User.find(
                {
                  _id: { $nin: participents },
                  "attendeeDetail.evntData": {
                    $elemMatch: {
                      event: channelExists.eventId,
                      $or: accessArray.map((access) => {
                        return { [access]: true };
                      }),
                    },
                  },
                  $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
                },
                {
                  _id: 1,
                }
              );
            }
            console.log(participents);
            break;
          default:
            break;
        }
        allAttendees = participents.map((member) => {
          return member._id;
        });
        var specificMembers = participents.map((attendee) => {
          return { id: attendee._id };
        });
        if (allMembers && allMembers.length > 0)
          allMembersUnique = [...allMembers, ...specificMembers].filter(
            (member, index) => {
              if (
                [...allMembers, ...specificMembers].filter(
                  (user, indexInner) => {
                    if (user.id === member.id && index !== indexInner)
                      return user;
                  }
                ).length === 0
              )
                return member;
            }
          );
        else
          allMembersUnique = specificMembers.filter((member, index) => {
            if (
              specificMembers.filter((user, indexInner) => {
                if (user.id === member.id && index !== indexInner) return user;
              }).length === 0
            )
              return member;
          });
      } else {
        var members = oldMembers?.filter((member) => {
          let participents =
            requestParameters.participents !== null &&
            requestParameters.participents !== undefined
              ? requestParameters.participents
              : [];
          let removeParticipent =
            requestParameters.removeParticipents !== null &&
            requestParameters.removeParticipents !== undefined
              ? requestParameters.removeParticipents
              : [];
          if (
            !participents.includes(member.userId._id.toString()) &&
            !removeParticipent.includes(member.userId._id.toString())
          ) {
            return member;
          }
        });
        if (members && members.length > 0) {
          allMembersUnique = members.map((member) => {
            return { id: member.userId._id };
          });
        }
        if (
          requestParameters.participents &&
          requestParameters.participents.length
        ) {
          allMembersUnique = [
            ...allMembersUnique,
            ...requestParameters.participents.map((bodyParti) => {
              return { id: bodyParti };
            }),
          ];
        }
      }
      console.log(allAttendees, "allAttendees");
      if (
        (channelExists.withEvent.toString() === "true" ||
          channelExists.withEvent === true) &&
        !changesInAccess &&
        allAttendees &&
        allAttendees.length > 0 &&
        requestParameters.removeParticipents &&
        requestParameters.removeParticipents.length > 0
      ) {
        await chatChannelMembers.deleteMany({
          $or: [
            { userId: { $nin: allAttendees } },
            { userId: { $in: requestParameters.removeParticipents } },
          ],
          channelId: req.params.id,
          user_type: "airtable-syncs",
        });
      } else if (
        (channelExists.withEvent.toString() === "true" ||
          channelExists.withEvent === true) &&
        !changesInAccess &&
        allAttendees &&
        allAttendees.length > 0
      ) {
        await chatChannelMembers.deleteMany({
          userId: { $nin: allAttendees },
          channelId: req.params.id,
          user_type: "airtable-syncs",
        });
      } else if (
        requestParameters.removeParticipents &&
        requestParameters.removeParticipents.length > 0
      ) {
        await chatChannelMembers.deleteMany({
          userId: {
            $in: requestParameters.removeParticipents.map((participents) => {
              return ObjectId(participents);
            }),
          },
          channelId: ObjectId(req.params.id),
          user_type: "airtable-syncs",
        });
      }
      const addMembers = allMembersUnique?.map(async (member) => {
        const checkChannelMemberExists = await chatChannelMembers.find({
          userId: ObjectId(member.id),
          channelId: ObjectId(req.params.id),
          status: 2,
          user_type: "airtable-syncs",
        });
        const checkUser = await User.findById(member.id);
        if (checkChannelMemberExists.length === 0 && checkUser) {
          const channelMember = new chatChannelMembers({
            userId: member.id,
            channelId: req.params.id,
            status: 2,
            user_type: "airtable-syncs",
          });
          if (!channelMember)
            return res.status(200).json({
              status: false,
              message: "Something went wrong while adding members in channel!!",
            });

          await channelMember.save();
        }
      });
      if (addMembers && addMembers.length > 0)
        await Promise.all([...addMembers]);
      if (chatChannelUpdated) {
        const allMembersIds = allMembersUnique?.map((member) => {
          return member.id.toString();
        });
        var oldMembersIds = oldMembers?.map((member) => {
          return member.userId._id.toString();
        });
        var newAddMembers = allMembersIds
          ? allMembersIds.filter((ids) => {
              if (oldMembersIds && !oldMembersIds.includes(ids)) return ids;
            })
          : [];
        var removedMembers = oldMembersIds
          ? oldMembersIds.filter((ids) => {
              if (allMembersIds && !allMembersIds.includes(ids)) return ids;
            })
          : [];
        var channelMembersChat = allMembersIds
          ? allMembersIds.map((ids) => {
              return { id: ids, readmsg: false };
            })
          : [];
        if (newAddMembers && newAddMembers.length > 0) {
          for (let index = 0; index < newAddMembers.length; index++) {
            let checkUser = await User.findById(newAddMembers[index]);
            if (
              checkUser.deleted_group_of_user &&
              checkUser.deleted_group_of_user.includes(
                new ObjectId(req.params.id)
              )
            ) {
              await User.findByIdAndUpdate(
                newAddMembers[index],
                {
                  $pull: { deleted_group_of_user: new ObjectId(req.params.id) },
                },
                { new: true }
              );
            }
          }
          const channelMessage = new chat({
            message: "",
            recipient_type: "chatChannel",
            sender_type: "adminuser",
            recipient: req.params.id,
            sender: req.admin_Id,
            type: "chatChannel",
            group_member: channelMembersChat,
            activity_status: true,
            activity: {
              type: "addChannelMembers",
              userId: [...newAddMembers],
            },
            userTimeStamp: requestParameters.time_stamp,
          });
          const chatData = await saveChatData(
            channelMessage,
            chatChannelUpdated
          );
          await emitSocketChannelActivityEvent(
            io,
            allMembersIds,
            chatData,
            "add-channel-member-receive",
            chatChannelUpdated
          );
        }
        if (removedMembers && removedMembers.length > 0) {
          const channelMessage = new chat({
            message: "",
            recipient_type: "chatChannel",
            sender_type: "adminuser",
            recipient: req.params.id,
            sender: req.admin_Id,
            type: "chatChannel",
            group_member: channelMembersChat,
            activity_status: true,
            activity: {
              type: "removedChannelMembers",
              userId: [...removedMembers],
            },
            userTimeStamp: requestParameters.time_stamp,
          });
          const chatData = await saveChatData(
            channelMessage,
            chatChannelUpdated
          );
          deleteMultipleRecordFromChatList(removedMembers, req.params.id);

          if (chatData) {
            const addChannelIndeletedGroup = removedMembers?.map(
              async (member) => {
                const userData = await User.findById(new ObjectId(member));
                if (
                  !(
                    userData.deleted_group_of_user &&
                    userData.deleted_group_of_user.includes(
                      new ObjectId(req.params.id)
                    )
                  )
                ) {
                  await User.findByIdAndUpdate(member, {
                    $push: {
                      deleted_group_of_user: new ObjectId(req.params.id),
                    },
                  });
                }
                await updateChat(
                  member.toString(),
                  req.params.id.toString(),
                  "channel"
                );
              }
            );
            await Promise.all([...addChannelIndeletedGroup]);
          }
          let allMembersIdsSocket = allMembersIds
            ? [...allMembersIds, ...removedMembers]
            : [...removedMembers];
          await emitSocketChannelActivityEvent(
            io,
            allMembersIdsSocket,
            chatData,
            "remove-channel-member-receive",
            chatChannelUpdated
          );
        }
        if (channelExists.channelName !== requestParameters.channelName) {
          const channelMessage = new chat({
            message: "",
            recipient_type: "chatChannel",
            sender_type: "adminuser",
            recipient: req.params.id,
            sender: req.admin_Id,
            type: "chatChannel",
            group_member: channelMembersChat,
            activity_status: true,
            activity: {
              type: "editedChannelName",
              previousGroupName: channelExists.channelName,
              newGroupName: requestParameters.channelName,
            },
            userTimeStamp: requestParameters.time_stamp,
          });
          const chatData = await saveChatData(
            channelMessage,
            chatChannelUpdated
          );
          await emitSocketChannelActivityEvent(
            io,
            allMembersIds,
            chatData,
            "edit-channel-receive",
            chatChannelUpdated
          );
        }
        if (req.channelIcon) {
          const channelMessage = new chat({
            message: "",
            recipient_type: "chatChannel",
            sender_type: "adminuser",
            recipient: req.params.id,
            sender: req.admin_Id,
            type: "chatChannel",
            group_member: channelMembersChat,
            activity_status: true,
            activity: {
              type: "editedChannelIcon",
            },
            userTimeStamp: requestParameters.time_stamp,
          });
          const chatData = await saveChatData(
            channelMessage,
            chatChannelUpdated
          );
          await emitSocketChannelActivityEvent(
            io,
            allMembersIds,
            chatData,
            "edit-channel-receive",
            chatChannelUpdated
          );
        }
        return res.status(200).json({
          status: true,
          message: "Channel updated successfully!!",
          data: chatChannelUpdated,
        });
      } else {
        return res.status(200).json({
          status: false,
          message: "Something went wrong while updating channel!!",
        });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Something went wrong!!" });
    }
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      status: false,
      message: `Internal server error !!, error:${e.message}`,
    });
  }
};
// get channel and it's members list by channel Id function
exports.getChannelAndMembersFunction = async (channelId) => {
  const getChannel = await chatChannel.findById(channelId, {
    isDelete: false,
  });
  const getChannelMembers = await chatChannelMembers.aggregate([
    {
      $match: {
        channelId: ObjectId(channelId),
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
              email: 1,
              otherdetail: 1,
              auth0Id: 1,
              profileImg: 1,
              attendeeDetail: 1,
              thumb_profileImg: 1,
            },
          },
        ],
        as: "normalUser",
      },
    },
    {
      $unwind: {
        path: "$normalUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "adminusers",
        localField: "userId",
        foreignField: "_id",
        as: "adminUser",
      },
    },
    {
      $unwind: {
        path: "$adminUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $set: {
        user: {
          $cond: [
            {
              $eq: [{ $type: "$normalUser" }, "object"],
            },
            {
              _id: "$normalUser._id",
              auth0Id: "$normalUser.auth0Id",
              user_type: "$user_type",
              email: "$normalUser.email",
              otherdetail: "$normalUser.otherdetail",
              profileImg: "$normalUser.profileImg",
              thumb_profileImg: "$normalUser.thumb_profileImg",
              attendeeDetail: {
                $cond: [
                  "$normalUser.attendeeDetail",
                  {
                    name: "$normalUser.attendeeDetail.name",
                    photo: "$normalUser.profileImg",
                  },
                  {},
                ],
              },
            },
            {
              _id: "$adminUser._id",
              user_type: "$user_type",
              first_name: "$adminUser.first_name",
              email: "$adminUser.email",
              last_name: "$adminUser.last_name",
              username: "$adminUser.username",
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        _id: "$user._id",
        auth0Id: "$user.auth0Id",
        user_type: "$user.user_type",
        email: "$user.email",
        otherdetail: "$user.otherdetail",
        profileImg: "$user.profileImg",
        thumb_profileImg: "$user.thumb_profileImg",
        attendeeDetail: "$user.attendeeDetail",
        first_name: "$user.first_name",
        last_name: "$user.last_name",
        username: "$user.username",
      },
    },
  ]);
  return { getChannel, getChannelMembers };
};
// get channel and it's members list by channel Id
exports.getChannelAndMembers = async (req, res) => {
  try {
    const getChannelDetailAndMembersDetail =
      await this.getChannelAndMembersFunction(req.params.id);
    if (
      getChannelDetailAndMembersDetail &&
      getChannelDetailAndMembersDetail.getChannel &&
      getChannelDetailAndMembersDetail.getChannelMembers
    )
      return res.status(200).json({
        status: true,
        message: "Channel and members list",
        channelData: getChannelDetailAndMembersDetail.getChannel,
        membersList: getChannelDetailAndMembersDetail.getChannelMembers,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting channel and it's members",
      });
  } catch (e) {
    return res.status(200).json({
      status: false,
      message: `Internal server error !!, error:${e.message}`,
    });
  }
};

// get channel and it's members list by channel Id
exports.getChannelAndMembersForAdmin = async (req, res) => {
  try {
    const getChannel = await chatChannel.findById(req.params.id, {
      isDelete: false,
    });
    const getChannelMembers = await chatChannelMembers.find({
      channelId: req.params.id,
      status: 2,
      user_type: "airtable-syncs",
    });

    if (getChannel && getChannelMembers)
      return res.status(200).json({
        status: true,
        message: "Channel and members list",
        channelData: getChannel,
        membersList: getChannelMembers,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting channel and it's members",
      });
  } catch (e) {
    return res.status(200).json({
      status: false,
      message: `Internal server error !!, error:${e.message}`,
    });
  }
};

// get channel member details from the channel id socket function
exports.getAllChannelMemberSocket = async (channelId) => {
  try {
    const channelData = await chatChannelMembers.find({
      channelId: channelId,
      user_type: "airtable-syncs",
      status: 2,
    });
    return channelData;
  } catch (error) {
    console.log(error);
    return [];
  }
};

// function to save channel related chat acivity
async function saveChatData(channelMessage, chatChannelUpdated) {
  const channelMessageSave = await channelMessage.save();
  const chatResult = await chat.findById(channelMessageSave._doc._id).lean();
  const chatData = {
    ...chatResult,
    recipient: {
      id: chatResult.recipient._id,
      firstname: chatChannelUpdated.channelName ?? "",
      image: chatChannelUpdated.channelIcon ?? "",
      type: "chatChannel",
    },
    sender: {
      id: chatResult.sender ? chatResult.sender._id : "",
      firstname: chatResult.sender ? chatResult.sender.first_name ?? "" : "",
      image: "",
      type: "adminuser",
    },
    activity: {
      ...chatResult.activity,
      type: chatResult.activity.type,
      date: chatResult.activity.date,
      _id: chatResult.activity._id,
      userId: chatResult.activity.userId
        ? chatResult.activity.userId.map((user) => {
            return {
              id: user ? user._id : "",
              firstname:
                user && user.auth0Id && user.auth0Id.length
                  ? user.otherdetail
                    ? user.otherdetail[process.env.USER_FN_ID] +
                      " " +
                      user.otherdetail[process.env.USER_LN_ID]
                    : ""
                  : user.attendeeDetail
                  ? user.attendeeDetail.name
                  : "",
              image: user ? user.profileImg : "",
              type: "user",
            };
          })
        : [],
    },
  };
  addUpdateRecordInChatListForGroupChannel(
    "chatChannel",
    "",
    chatData.recipient.id,
    "",
    "text",
    chatData.userTimeStamp,
    chatData.group_member,
    [],
    false
  );

  return chatData;
}

// emit socket events for channel activity
async function emitSocketChannelActivityEvent(
  io,
  allMembersIds,
  chatData,
  eventType,
  channelDetail
) {
  allMembersIds?.map((grp_member) => {
    if (grp_member) {
      get_user_by_socket(grp_member).then((resp) => {
        if (resp !== undefined && resp.socket_id !== undefined) {
          for (var i = 0; i < resp.socket_id.length; i++) {
            io.to(resp.socket_id[i]).emit(eventType, {
              message: channelDetail,
            });
            if (eventType !== "delete-channel-receive")
              io.to(resp.socket_id[i]).emit("receive", { message: [chatData] });

            if (eventType === "add-channel-member-receive") {
              AddMemberChannelNotification(channelDetail._id, allMembersIds);
            }
          }
        }
      });
    }
  });
}

// user leave channel socket function
// exports.leaveFromChannelSocket = async (
//   channelId,
//   authUserId,
//   date,
//   time,
//   time_stamp
// ) => {
//   try {
//     const channelMembers = await chatChannelMembers.findOne({
//       channelId: channelId,
//       userId: authUserId,
//     });
//     const allChannelMembers = await chatChannelMembers.find({
//       channelId: channelId,
//       status: 2,
//       user_type: "airtable-syncs",
//     });
//     const channelDetail = await chatChannel.findById(channelId);
//     const userDetail = await User.findById(authUserId).select(
//       "deleted_group_of_user"
//     );
//     if (allChannelMembers.length !== 0 && channelMembers) {
//       if (
//         !(
//           userDetail.deleted_group_of_user &&
//           userDetail.deleted_group_of_user.includes(new ObjectId(channelId))
//         )
//       ) {
//         await User.findByIdAndUpdate(authUserId, {
//           $push: { deleted_group_of_user: new ObjectId(channelId) },
//         });
//       }
//       const removeMember = await chatChannelMembers.findOneAndDelete(
//         { channelId: channelId, userId: authUserId },
//         { new: true }
//       );

//       if (removeMember) {
//         var channelLocalMembers = allChannelMembers.map((ids) => {
//           return {
//             id: ids.userId._id,
//             readmsg: true,
//           };
//         });
//         const newChatMsg = new chat({
//           message: "",
//           recipient_type: "chatChannel",
//           sender_type: "airtable-syncs",
//           recipient: channelId,
//           sender: authUserId,
//           type: "chatChannel",
//           group_member: channelLocalMembers,
//           activity_status: true,
//           activity: {
//             type: "left",
//             userId: [authUserId],
//           },
//           userTimeStamp: time_stamp,
//         });
//         const saveMessage = await newChatMsg.save();
//         const saveMessageDetail = saveMessage._doc;
//         const finalMessageData = {
//           ...saveMessageDetail,
//           recipient: {
//             id: channelDetail._id,
//             firstname: channelDetail.channelName ?? "",
//             image: channelDetail.channelIcon ?? "",
//             type: "chatChannel",
//           },
//           sender: {
//             id: saveMessageDetail.sender ? saveMessageDetail.sender._id : "",
//             firstname:
//               saveMessageDetail.sender &&
//               saveMessageDetail.sender.auth0Id &&
//               saveMessageDetail.sender.auth0Id.length
//                 ? saveMessageDetail.sender.otherdetail
//                   ? saveMessageDetail.sender.otherdetail[
//                       process.env.USER_FN_ID
//                     ] +
//                     " " +
//                     saveMessageDetail.sender.otherdetail[process.env.USER_LN_ID]
//                   : ""
//                 : saveMessageDetail.sender.attendeeDetail
//                 ? saveMessageDetail.sender.attendeeDetail.name
//                 : "",
//             image: saveMessageDetail.sender
//               ? saveMessageDetail.sender.profileImg
//               : "",
//             type: "user",
//           },
//           activity: {
//             ...saveMessageDetail.activity._doc,
//             userId: saveMessageDetail.activity.userId
//               ? saveMessageDetail.activity.userId.map((user) => {
//                   return {
//                     id: user ? user._id : "",
//                     firstname:
//                       user && user.auth0Id && user.auth0Id.length
//                         ? user.otherdetail
//                           ? user.otherdetail[process.env.USER_FN_ID] +
//                             " " +
//                             user.otherdetail[process.env.USER_LN_ID]
//                           : ""
//                         : user.attendeeDetail
//                         ? user.attendeeDetail.name
//                         : "",
//                     image: user ? user.profileImg : "",
//                     type: "user",
//                   };
//                 })
//               : [],
//           },
//         };
//         addUpdateRecordInChatListForGroupChannel(
//           "chatChannel",
//           "",
//           finalMessageData.recipient.id,
//           "",
//           "text",
//           finalMessageData.userTimeStamp,
//           finalMessageData.group_member.filter((ids) => {
//             if (ids.id.toString() !== authUserId.toString()) return ids;
//           }),
//           [],
//           false
//         );
//         deleteRecordFromChatList(authUserId, channelId);
//         if (finalMessageData)
//           return {
//             status: true,
//             message: "You are removed from this channel!",
//             channelDetail: channelDetail,
//             messageData: [finalMessageData],
//           };
//         else
//           return {
//             status: false,
//             message: "Something went wrong while updating channel history!",
//           };
//       } else {
//         return {
//           status: false,
//           message: "Something went wrong while removing member from channel!",
//         };
//       }
//     } else {
//       return { status: false, message: "Channel not found!" };
//     }
//   } catch (e) {
//     console.log(e);
//     return { status: false, message: "Something went wrong!" };
//   }
// };

// new changes for channel socket function

exports.leaveFromChannelSocket = async (channelId, authUserId, time_stamp) => {
  try {
    const [channelMembers, allChannelMembers, channelDetail, userDetail] =
      await Promise.all([
        chatChannelMembers.findOne({ channelId, userId: authUserId }),
        chatChannelMembers.find({
          channelId,
          status: 2,
          user_type: "airtable-syncs",
        }),
        chatChannel.findById(channelId),
        User.findById(authUserId).select("deleted_group_of_user"),
      ]);

    if (!channelMembers) {
      return { status: false, message: "Channel not found!" };
    }

    if (
      !(
        userDetail.deleted_group_of_user &&
        userDetail.deleted_group_of_user.includes(new ObjectId(channelId))
      )
    ) {
      await User.findByIdAndUpdate(authUserId, {
        $push: { deleted_group_of_user: new ObjectId(channelId) },
      });
    }

    const removeMember = await chatChannelMembers.findOneAndDelete(
      { channelId, userId: authUserId },
      { new: true }
    );

    if (!removeMember) {
      return {
        status: false,
        message: "Something went wrong while removing member from channel!",
      };
    }
    const channelLocalMembers = allChannelMembers.map((ids) => ({
      id: ids.userId._id,
      readmsg: true,
    }));

    const newChatMsg = new chat({
      message: "",
      recipient_type: "chatChannel",
      sender_type: "airtable-syncs",
      recipient: channelId,
      sender: authUserId,
      type: "chatChannel",
      group_member: channelLocalMembers,
      activity_status: true,
      activity: {
        type: "left",
        userId: [authUserId],
      },
      userTimeStamp: time_stamp,
    });

    const saveMessage = await newChatMsg.save();
    const saveMessageDetail = saveMessage._doc;

    const finalMessageData = {
      ...saveMessageDetail,
      recipient: {
        id: channelDetail._id,
        firstname: channelDetail.channelName ?? "",
        image: channelDetail.channelIcon ?? "",
        type: "chatChannel",
      },
      sender: {
        id: saveMessageDetail.sender ? saveMessageDetail.sender._id : "",
        firstname:
          saveMessageDetail.sender &&
          saveMessageDetail.sender.auth0Id &&
          saveMessageDetail.sender.auth0Id.length
            ? saveMessageDetail.sender.otherdetail
              ? saveMessageDetail.sender.otherdetail[process.env.USER_FN_ID] +
                " " +
                saveMessageDetail.sender.otherdetail[process.env.USER_LN_ID]
              : ""
            : saveMessageDetail.sender.attendeeDetail
            ? saveMessageDetail.sender.attendeeDetail.name
            : "",
        image: saveMessageDetail.sender
          ? saveMessageDetail.sender.profileImg
          : "",
        type: "user",
      },
      activity: {
        ...saveMessageDetail.activity._doc,
        userId: saveMessageDetail.activity.userId
          ? saveMessageDetail.activity.userId.map((user) => {
              return {
                id: user ? user._id : "",
                firstname:
                  user && user.auth0Id && user.auth0Id.length
                    ? user.otherdetail
                      ? user.otherdetail[process.env.USER_FN_ID] +
                        " " +
                        user.otherdetail[process.env.USER_LN_ID]
                      : ""
                    : user.attendeeDetail
                    ? user.attendeeDetail.name
                    : "",
                image: user ? user.profileImg : "",
                type: "user",
              };
            })
          : [],
      },
    };
    addUpdateRecordInChatListForGroupChannel(
      "chatChannel",
      "",
      finalMessageData.recipient.id,
      "",
      "text",
      finalMessageData.userTimeStamp,
      finalMessageData.group_member.filter((ids) => {
        if (ids.id.toString() !== authUserId.toString()) return ids;
      }),
      [],
      false
    );
    deleteRecordFromChatList(authUserId, channelId);

    if (finalMessageData) {
      return {
        status: true,
        message: "You are removed from this channel!",
        channelDetail,
        messageData: [finalMessageData],
      };
    } else {
      return {
        status: false,
        message: "Something went wrong while updating channel history!",
      };
    }
  } catch (e) {
    console.log(e);
    return { status: false, message: "Something went wrong!" };
  }
};
