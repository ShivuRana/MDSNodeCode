const { ObjectId } = require("mongodb");
const chat = require("../../database/models/chat");
const User = require("../../database/models/airTableSync");
const chat_user = require("../../database/models/chatUser");
const chatList = require("../../database/models/chatList");
const { send_notification } = require("../../utils/notification");
const chatChannelMembers = require("../../database/models/chatChannelMembers");
const userChatGroupMember = require("../../database/models/userChatGroupMember");
// creating entry in chatlist table for old chats
exports.syncOldChatsInChatList = async (req, res) => {
  try {
    const userList = await User.find({}).select("email").lean();
    for (let mainIndex = 0; mainIndex < userList.length; mainIndex++) {
      const chatListForUser = await chat.aggregate([
        {
          $addFields: {
            group_member_field: "$group_member",
          },
        },
        {
          $unwind: "$group_member",
        },
        {
          $match: {
            "group_member.id": userList[mainIndex]._id,
          },
        },
        {
          $addFields: {
            newRecipient: {
              $cond: {
                if: { $eq: ["$recipient", userList[mainIndex]._id] },
                then: "$sender",
                else: "$recipient",
              },
            },
          },
        },
        {
          $group: {
            _id: {
              recipient: "$newRecipient",
            },
            unreadMsg: {
              $sum: {
                $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0],
              },
            },
            docs: { $push: "$$ROOT" },
          },
        },
        {
          $addFields: {
            messageinfo: {
              $slice: ["$docs", -1],
            },
          },
        },
        {
          $unwind: "$messageinfo",
        },
        {
          $unset: "docs",
        },
      ]);
      for (
        let chatListIndex = 0;
        chatListIndex < chatListForUser.length;
        chatListIndex++
      ) {
        var clearChatFlag = false;
        var info = userList[mainIndex].clear_chat_data
          ? userList[mainIndex].clear_chat_data.filter((data) => {
              if (
                data &&
                chatListForUser[chatListIndex] &&
                data.id &&
                chatListForUser[chatListIndex]._id.recipient.toString() &&
                data.id.toString() ===
                  chatListForUser[chatListIndex]._id.recipient.toString()
              )
                return data;
            })
          : [];
        if (
          !(
            userList[mainIndex].deleted_group_of_user &&
            userList[mainIndex].deleted_group_of_user.includes(
              chatListForUser[chatListIndex]._id.recipient.toString()
            )
          )
        ) {
          if (chatListForUser[chatListIndex]) {
            if (info && info.length > 0) {
              if (
                new Date(info[0].date) <
                new Date(chatListForUser[chatListIndex].messageinfo.createdAt)
              ) {
                clearChatFlag = false;
              } else if (info[0].deleteConversation === false) {
                clearChatFlag = true;
              }
            } else {
              clearChatFlag = false;
            }
          }
        }

        const chatListExist = await chatList
          .find({
            userId: userList[mainIndex]._id,
            receiverId: chatListForUser[chatListIndex]._id.recipient,
          })
          .select("userId receiverId");
        console.log(
          chatListForUser[chatListIndex].messageinfo,
          "chatListExist"
        );
        if (
          chatListExist &&
          chatListExist.length === 0 &&
          chatListForUser[chatListIndex] &&
          chatListForUser[chatListIndex].messageinfo &&
          !clearChatFlag
        ) {
          const chatListData = new chatList({
            type: chatListForUser[chatListIndex].messageinfo.recipient_type,
            userId: userList[mainIndex]._id,
            receiverId: chatListForUser[chatListIndex]._id.recipient,
            messageType:
              chatListForUser[chatListIndex].messageinfo.message_type,
            name: "",
            lastMessage: chatListForUser[chatListIndex].messageinfo.message,
            userTimeStamp:
              chatListForUser[chatListIndex].messageinfo.userTimeStamp ??
              chatListForUser[chatListIndex].messageinfo.createdAt,
            memberList: chatListForUser[chatListIndex].messageinfo.group_member,
            count: chatListForUser[chatListIndex].unreadMsg,
            profilePic: "",
            taggedUserId:
              chatListForUser[chatListIndex].messageinfo.taggedUserId ?? [],
            senderId:
              chatListForUser[chatListIndex].messageinfo.sender_type ===
              "airtable-syncs"
                ? chatListForUser[chatListIndex].messageinfo.sender
                : null,
          });
          const addChatListData = await chatListData.save();
        } else {
          if (!clearChatFlag) {
            await chatList.findOneAndUpdate(
              {
                userId: userList[mainIndex]._id,
                receiverId: chatListForUser[chatListIndex]._id.recipient,
              },
              {
                type: chatListForUser[chatListIndex].messageinfo.recipient_type,
                messageType:
                  chatListForUser[chatListIndex].messageinfo.message_type,
                name: "",
                lastMessage: chatListForUser[chatListIndex].messageinfo.message,
                userTimeStamp:
                  chatListForUser[chatListIndex].messageinfo.userTimeStamp ??
                  chatListForUser[chatListIndex].messageinfo.createdAt,
                memberList:
                  chatListForUser[chatListIndex].messageinfo.group_member,
                count: chatListForUser[chatListIndex].unreadMsg,
                profilePic: "",
                taggedUserId:
                  chatListForUser[chatListIndex].messageinfo.taggedUserId ?? [],
                senderId:
                  chatListForUser[chatListIndex].messageinfo.sender_type ===
                  "airtable-syncs"
                    ? chatListForUser[chatListIndex].messageinfo.sender
                    : null,
              }
            );
          }
        }
      }
    }
    res.status(200).json({ status: true, message: "Sync successfully done!" });
  } catch (e) {
    console.log(e);
    res.status(200).json({ status: false, error: e });
  }
};
// get chat list for user
exports.retriveUserChatList = async (req, res) => {
  try {
    const userChatList = await chatList
      .find({ userId: ObjectId(req.params.id) })
      .lean()
      .populate("receiverId", {
        otherdetail: 1,
        profileImg: 1,
        "attendeeDetail.name": 1,
        first_name: 1,
        last_name: 1,
        channelName: 1,
        channelIcon: 1,
        groupTitle: 1,
        groupImage: 1,
      });
    res.status(200).json({ status: true, data: userChatList });
  } catch (e) {
    console.log(e);
    res.status(200).json({ status: false, error: e });
  }
};
// get chat list for user socket
exports.retriveUserChatListSocket = async (id) => {
  const userChatList = await chatList
    .find({ userId: ObjectId(id) })
    .lean()
    .populate("receiverId senderId", {
      otherdetail: 1,
      profileImg: 1,
      "attendeeDetail.name": 1,
      first_name: 1,
      last_name: 1,
      channelName: 1,
      channelIcon: 1,
      groupTitle: 1,
      groupImage: 1,
    })
    .populate("taggedUserId", {
      email: 1,
      otherdetail: 1,
      profileImg: 1,
      thumb_profileImg: 1,
      auth0Id: 1,
      attendeeDetail: {
        name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
        photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
      },
    })
    .select({ messageTimeStamp: 0 });
  console.log(userChatList, "userChatList ++++++++++++++++++++++++++");
  return userChatList;
};
// add/update record in chatlist whenever new record added in chat table for one on one chat
// type will be airtable-syncs, chatChannel, userChatGroup
exports.addUpdateRecordInChatListForUserType = async (
  type,
  userId,
  receiverId,
  message,
  messageType,
  userTimeStamp,
  memberList,
  taggedUserId
) => {
  const recordExistsForuserId = await chatList
    .find({ userId: ObjectId(userId), receiverId: ObjectId(receiverId) })
    .lean();
  const recordExistsForReceiver = await chatList
    .find({ userId: ObjectId(receiverId), receiverId: ObjectId(userId) })
    .lean();
  console.log(
    recordExistsForuserId,
    recordExistsForReceiver,
    message,
    "00000000000000000000"
  );
  if (recordExistsForuserId && recordExistsForuserId.length) {
    const updateRecord = await chatList.findOneAndUpdate(
      { userId: ObjectId(userId), receiverId: ObjectId(receiverId) },
      {
        messageType: messageType,
        lastMessage: message,
        userTimeStamp: userTimeStamp,
        memberList: memberList,
        count: 0,
        clearChat: false,
        senderId: userId,
        isMention:
          taggedUserId &&
          taggedUserId.length &&
          taggedUserId.includes(userId.toString())
            ? true
            : false,
      }
    );
  } else {
    let receiverOnlineOffline = await chat_user
      .findOne({ userid: ObjectId(receiverId) })
      .lean();
    const chatListRecord = new chatList({
      userId: userId,
      receiverId: receiverId,
      messageType: messageType,
      lastMessage: message,
      userTimeStamp: userTimeStamp,
      memberList: memberList,
      count: 0,
      type: type,
      clearChat: false,
      offlineOnline:
        receiverOnlineOffline && receiverOnlineOffline.socket_id
          ? receiverOnlineOffline.socket_id.length > 0
            ? true
            : false
          : false,
      senderId: userId,
      isMention:
        taggedUserId &&
        taggedUserId.length &&
        taggedUserId.includes(userId.toString())
          ? true
          : false,
    });
    const addRecord = await chatListRecord.save();
  }
  console.log(recordExistsForReceiver, "recordExistsForReceiver");
  if (recordExistsForReceiver && recordExistsForReceiver.length) {
    const updateRecord = await chatList.findOneAndUpdate(
      { userId: ObjectId(receiverId), receiverId: ObjectId(userId) },
      {
        messageType: messageType,
        lastMessage: message,
        userTimeStamp: userTimeStamp,
        memberList: memberList,
        $inc: { count: 1 },
        taggedUserId: taggedUserId,
        clearChat: false,
        senderId: userId,
        isMention:
          taggedUserId &&
          taggedUserId.length &&
          taggedUserId.includes(receiverId.toString())
            ? true
            : false,
      }
    );
  } else {
    let receiverOnlineOffline = await chat_user
      .findOne({ userid: ObjectId(userId) })
      .lean();
    const chatListRecord = new chatList({
      userId: receiverId,
      receiverId: userId,
      messageType: messageType,
      lastMessage: message,
      userTimeStamp: userTimeStamp,
      memberList: memberList,
      count: 1,
      type: type,
      taggedUserId: taggedUserId,
      clearChat: false,
      offlineOnline:
        receiverOnlineOffline && receiverOnlineOffline.socket_id
          ? receiverOnlineOffline.socket_id.length > 0
            ? true
            : false
          : false,
      senderId: userId,
      isMention:
        taggedUserId &&
        taggedUserId.length &&
        taggedUserId.includes(receiverId.toString())
          ? true
          : false,
    });
    const addRecord = await chatListRecord.save();
  }
};

// add/update record in chatlist whenever new record added in chat table for group / channel chat
// type will be airtable-syncs, chatChannel, userChatGroup
// exports.addUpdateRecordInChatListForGroupChannel = async (
//   type,
//   userId,
//   receiverId,
//   message,
//   messageType,
//   userTimeStamp,
//   memberList,
//   taggedUserId,
//   increaseCount
// ) => {
//   console.log(memberList, userId, "memberList[index]");
//   var memberIds = [];
//   if (type.toLowerCase() === "chatchannel") {
//     memberIds = await chatChannelMembers.aggregate([
//       {
//         $match: {
//           channelId: ObjectId(receiverId),
//           user_type: "airtable-syncs",
//           status: 2,
//         },
//       },
//       { $project: { channelId: 1, id: "$userId" } },
//     ]);
//   } else {
//     memberIds = await userChatGroupMember.aggregate([
//       { $match: { groupId: ObjectId(receiverId), status: 2 } },
//       { $project: { groupId: 1, id: "$userId" } },
//     ]);
//   }

//   for (let index = 0; index < memberIds.length; index++) {
//     if (
//       memberIds[index] &&
//       memberIds[index].id &&
//       userId.toString() === memberIds[index].id.toString()
//     ) {
//       console.log("in update record chatlist", userId);

//       await chatList.findOneAndUpdate(
//         { userId: userId, receiverId: receiverId },
//         {
//           messageType: messageType,
//           lastMessage: message,
//           userTimeStamp: userTimeStamp,
//           memberList: memberList,
//           count: 0,
//           type: type,
//           isMention:
//             taggedUserId &&
//             taggedUserId.length &&
//             taggedUserId.includes(userId.toString())
//               ? true
//               : false,
//           clearChat: false,
//           taggedUserId: taggedUserId,
//           senderId: userId && userId.length ? userId : null,
//         },
//         { upsert: true }
//       );
//     } else {
//       if (memberIds[index] && memberIds[index].id) {
//         console.log("in update record chatlist", userId);
//         await chatList.findOneAndUpdate(
//           { userId: memberIds[index].id, receiverId: receiverId },
//           {
//             messageType: messageType,
//             lastMessage: message,
//             userTimeStamp: userTimeStamp,
//             memberList: memberList,
//             $inc: { count: increaseCount ? 1 : 0 },
//             type: type,
//             isMention:
//               taggedUserId &&
//               taggedUserId.length &&
//               taggedUserId.includes(memberIds[index].id.toString())
//                 ? true
//                 : false,
//             taggedUserId: taggedUserId,
//             clearChat: false,
//             senderId: userId && userId.length ? userId : null,
//           },
//           { upsert: true }
//         );
//       }
//     }
//   }
// };

// new Chnages code
exports.addUpdateRecordInChatListForGroupChannel = async (
  type,
  userId,
  receiverId,
  message,
  messageType,
  userTimeStamp,
  memberList,
  taggedUserId,
  increaseCount
) => {
  try {
    const isChannel = type.toLowerCase() === "chatchannel";
    const memberIds = isChannel
      ? await chatChannelMembers.aggregate([
          {
            $match: {
              channelId: ObjectId(receiverId),
              user_type: "airtable-syncs",
              status: 2,
            },
          },
          { $project: { channelId: 1, id: "$userId" } },
        ])
      : await userChatGroupMember.aggregate([
          { $match: { groupId: ObjectId(receiverId), status: 2 } },
          { $project: { groupId: 1, id: "$userId" } },
        ]);

    const bulkOperations = memberIds.map((member) => {
      const query = {
        userId: member.id,
        receiverId: receiverId,
      };
      const update = {
        messageType,
        lastMessage: message,
        userTimeStamp,
        memberList,
        type,
        clearChat: false,
        taggedUserId: taggedUserId,
        senderId: userId && userId.length ? userId : null,
      };

      if (userId.toString() === member.id.toString()) {
        update.count = 0;
        update.isMention =
          taggedUserId &&
          taggedUserId.length &&
          taggedUserId.includes(userId.toString());
      } else {
        update.$inc = { count: increaseCount ? 1 : 0 };
        update.isMention =
          taggedUserId &&
          taggedUserId.length &&
          taggedUserId.includes(member.id.toString());
      }

      return {
        updateOne: {
          filter: query,
          update,
          upsert: true,
        },
      };
    });

    await chatList.bulkWrite(bulkOperations);
  } catch (error) {
    console.error("Error:", error);
  }
};

// get listing of the messages
exports.checkIfMsgReadSocketCount = async (authUserId) => {
  try {
    const unReadData = await chatList.aggregate([
      {
        $match: {
          userId: ObjectId(authUserId),
        },
      },
      {
        $group: {
          _id: { userId: "$userId" },
          count: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
        },
      },
    ]);
    console.log(unReadData, "unReadData unReadData");
    if (unReadData.length > 0) return unReadData[0].count;
    else return 0;
  } catch (err) {
    console.log(err, "error in if message read or not socket");
    return {
      status: false,
      message: "Interval Server Error!",
      error: err.message,
    };
  }
};
// triggered when user go in detail page
exports.readMessage = async (recipient, sender, type) => {
  if (
    type.toLowerCase() === "airtable-syncs" ||
    type.toLowerCase() === "user"
  ) {
    await chatList.findOneAndUpdate(
      { userId: ObjectId(recipient), receiverId: ObjectId(sender) },
      {
        count: 0,
        isMention: false,
      }
    );
  } else {
    await chatList.findOneAndUpdate(
      { userId: ObjectId(sender), receiverId: ObjectId(recipient) },
      {
        count: 0,
        isMention: false,
      }
    );
  }

  if (
    type.toLowerCase() === "airtable-syncs" ||
    type.toLowerCase() === "user"
  ) {
    await chat.updateMany(
      {
        recipient: ObjectId(recipient),
        sender: ObjectId(sender),
        group_member: {
          $elemMatch: { id: ObjectId(recipient) },
        },
      },
      { $set: { "group_member.$.readmsg": true } }
    );

    let unReadCount = await this.checkIfMsgReadSocketCount(recipient);
    console.log(unReadCount, "123 read time count");
    let userDeviceToken = await User.findOne(
      { _id: new ObjectId(recipient) },
      { deviceToken: 1 }
    );
    if (userDeviceToken !== null) {
      if (userDeviceToken.deviceToken.length !== 0) {
        let successdata = {
          notification: "",
          description: "",
          device_token: userDeviceToken.deviceToken,
          collapse_key: "",
          badge_count: unReadCount,
          notification_data: {
            type: "",
            content: [],
          },
        };
        send_notification(successdata);
      }
    }
  } else {
    await chat.updateMany(
      {
        recipient: ObjectId(recipient),
        group_member: {
          $elemMatch: { id: ObjectId(sender) },
        },
      },
      { $set: { "group_member.$.readmsg": true } },
      { new: true }
    );

    let unReadCount = await this.checkIfMsgReadSocketCount(sender);
    console.log(unReadCount, "123 read time count");
    let userDeviceToken = await User.findOne(
      { _id: new ObjectId(sender) },
      { deviceToken: 1 }
    );
    if (userDeviceToken !== null) {
      if (userDeviceToken.deviceToken.length !== 0) {
        let successdata = {
          notification: "",
          description: "",
          device_token: userDeviceToken.deviceToken,
          collapse_key: "",
          badge_count: unReadCount,
          notification_data: {
            type: "",
            content: [],
          },
        };
        send_notification(successdata);
      }
    }
  }
};
// update online offline user
exports.setOnlineOfflineStatus = async (userId, status) => {
  if (userId && userId !== "null")
    await chatList.updateMany(
      { receiverId: ObjectId(userId) },
      { offlineOnline: status }
    );
};
// get last message for receiver
exports.getLastMessageForReceiver = async (roomId, userId) => {
  const lastMessage = await chatList
    .findOne({ userId: ObjectId(userId), receiverId: ObjectId(roomId) })
    .lean()
    .populate("receiverId senderId", {
      otherdetail: 1,
      profileImg: 1,
      "attendeeDetail.name": 1,
      first_name: 1,
      last_name: 1,
      channelName: 1,
      channelIcon: 1,
      groupTitle: 1,
      groupImage: 1,
    })
    .populate("taggedUserId", {
      email: 1,
      otherdetail: 1,
      profileImg: 1,
      thumb_profileImg: 1,
      auth0Id: 1,
      attendeeDetail: {
        name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
        photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
      },
    });
  return lastMessage;
};
// get last message for receiver for api
exports.getLastMessageForReceiverAPI = async (req, res) => {
  const lastMessage = await chatList
    .findOne({
      userId: ObjectId(req.body.userId),
      receiverId: ObjectId(req.body.roomId),
    })
    .lean()
    .populate("receiverId senderId", {
      otherdetail: 1,
      profileImg: 1,
      "attendeeDetail.name": 1,
      first_name: 1,
      last_name: 1,
      channelName: 1,
      channelIcon: 1,
      groupTitle: 1,
      groupImage: 1,
    });
  return res.status(200).json({ status: true, lastMessage: lastMessage });
};
// delete record from chatlist
exports.deleteRecordFromChatList = async (userId, receiverId) => {
  if (userId && receiverId) {
    await chatList.findOneAndDelete({
      userId: ObjectId(userId.toString()),
      receiverId: ObjectId(receiverId.toString()),
    });
  }
};
// clear message from chatlist
exports.clearMessageFromChatList = async (userId, receiverId) => {
  if (userId && receiverId) {
    const clearMessage = await chatList.findOneAndUpdate(
      {
        userId: ObjectId(userId.toString()),
        receiverId: ObjectId(receiverId.toString()),
      },
      {
        messageType: "text",
        lastMessage: "",
        count: 0,
        taggedUserId: [],
        clearChat: true,
      }
    );
  }
};
// delete records for multiple users
exports.deleteMultipleRecordFromChatList = async (userIds, receiverId) => {
  if (userIds && receiverId) {
    const deleteRecord = await chatList.deleteMany({
      userId: {
        $in: userIds.map((id) => {
          if (typeof id === "String") return ObjectId(id);
          else return ObjectId(id);
        }),
      },
      receiverId: ObjectId(receiverId.toString()),
    });
  }
};
// delete message time chatList update
// exports.editDeleteMessageTimeChatlistUpdate = async (
//   userId,
//   receiverId,
//   type
// ) => {
//   console.log(userId, receiverId, type, "dsfssssssssss");
//   if (type !== "user" && type !== "airtable-syncs") {
//     const lastMessageOfGroupChannel = await chat
//       .find({
//         recipient: ObjectId(receiverId),
//       })
//       .sort({ createdAt: -1 })
//       .limit(1)
//       .lean();

//     if (lastMessageOfGroupChannel && lastMessageOfGroupChannel.length) {
//       console.log(lastMessageOfGroupChannel, "lastMessageOfGroupChannel");
//       for (
//         let index = 0;
//         index < lastMessageOfGroupChannel[0].group_member.length;
//         index++
//       ) {
//         let unreadMessageCountChannelGroup = await chat.aggregate([
//           {
//             $addFields: {
//               group_member_field: "$group_member",
//             },
//           },
//           {
//             $unwind: "$group_member",
//           },
//           {
//             $match: {
//               "group_member.id":
//                 lastMessageOfGroupChannel[0].group_member[index].id,
//               recipient: ObjectId(receiverId),
//             },
//           },
//           {
//             $group: {
//               _id: {
//                 recipient: "$recipient",
//               },
//               unreadMsg: {
//                 $sum: {
//                   $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0],
//                 },
//               },
//               docs: { $push: "$$ROOT" },
//             },
//           },
//           {
//             $addFields: {
//               messageinfo: {
//                 $slice: ["$docs", -1],
//               },
//             },
//           },
//           {
//             $unwind: "$messageinfo",
//           },
//           {
//             $unset: "docs",
//           },
//         ]);
//         console.log(
//           unreadMessageCountChannelGroup,
//           "unreadMessageCountChannelGroup"
//         );
//         await chatList.findOneAndUpdate(
//           {
//             userId: ObjectId(
//               lastMessageOfGroupChannel[0].group_member[index].id.toString()
//             ),
//             receiverId: ObjectId(receiverId),
//           },
//           {
//             type: unreadMessageCountChannelGroup[0].messageinfo.recipient_type,
//             messageType:
//               unreadMessageCountChannelGroup[0].messageinfo.message_type,
//             name: "",
//             lastMessage: unreadMessageCountChannelGroup[0].messageinfo.message,
//             userTimeStamp:
//               unreadMessageCountChannelGroup[0].messageinfo.userTimeStamp,
//             memberList:
//               unreadMessageCountChannelGroup[0].messageinfo.group_member,
//             count: unreadMessageCountChannelGroup[0].unreadMsg,
//             taggedUserId:
//               unreadMessageCountChannelGroup[0].messageinfo.taggedUserId ?? [],
//             senderId:
//               unreadMessageCountChannelGroup[0].messageinfo.sender_type ===
//               "airtable-syncs"
//                 ? unreadMessageCountChannelGroup[0].messageinfo.sender
//                 : null,
//           }
//         );
//         this.sendBadgeCountNotification(
//           lastMessageOfGroupChannel[0].group_member[index].id.toString()
//         );
//       }
//     } else {
//       let membersIds = [];
//       if (type.toLowerCase() === "userchatgroup") {
//         let joinedMembers = await userChatGroupMember
//           .find({
//             groupId: ObjectId(receiverId),
//             status: 2,
//           })
//           .select("userId");
//         membersIds = joinedMembers
//           ? joinedMembers.map((members) => {
//               return members.userId;
//             })
//           : [];
//       } else {
//         let joinedMembers = await chatChannelMembers
//           .find({
//             channelId: ObjectId(receiverId),
//             status: 2,
//             user_type: "airtable-syncs",
//           })
//           .select("userId");
//         membersIds = joinedMembers
//           ? joinedMembers.map((members) => {
//               return members.userId;
//             })
//           : [];
//       }

//       for (let index = 0; index < membersIds.length; index++) {
//         await chatList.findOneAndUpdate(
//           {
//             userId: ObjectId(membersIds[index].toString()),
//             receiverId: ObjectId(receiverId),
//           },
//           {
//             type: type,
//             messageType: "",
//             name: "",
//             lastMessage: "",
//             count: 0,
//             taggedUserId: [],
//             userTimeStamp: null,
//           }
//         );
//         this.sendBadgeCountNotification(membersIds[index].toString());
//       }
//     }
//     return lastMessageOfGroupChannel;
//   } else {
//     const lastMessageOfUser = await chat
//       .find({
//         $or: [
//           {
//             $and: [
//               { recipient: ObjectId(userId) },
//               { sender: ObjectId(receiverId) },
//             ],
//           },
//           {
//             $and: [
//               { recipient: ObjectId(receiverId) },
//               { sender: ObjectId(userId) },
//             ],
//           },
//         ],
//       })
//       .sort({ createdAt: -1 })
//       .limit(1)
//       .lean();
//     if (lastMessageOfUser && lastMessageOfUser.length) {
//       let unreadMessageCountUserId = await chat.aggregate([
//         {
//           $addFields: {
//             group_member_field: "$group_member",
//           },
//         },
//         {
//           $unwind: "$group_member",
//         },
//         {
//           $match: {
//             "group_member.id": ObjectId(userId),
//             recipient: ObjectId(userId),
//             sender: ObjectId(receiverId),
//           },
//         },
//         {
//           $group: {
//             _id: {
//               recipient: "$recipient",
//             },
//             unreadMsg: {
//               $sum: {
//                 $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0],
//               },
//             },
//             docs: { $push: "$$ROOT" },
//           },
//         },
//         {
//           $addFields: {
//             messageinfo: {
//               $slice: ["$docs", -1],
//             },
//           },
//         },
//         {
//           $unwind: "$messageinfo",
//         },
//         {
//           $unset: "docs",
//         },
//       ]);
//       let unreadMessageCountReceiverId = await chat.aggregate([
//         {
//           $addFields: {
//             group_member_field: "$group_member",
//           },
//         },
//         {
//           $unwind: "$group_member",
//         },
//         {
//           $match: {
//             "group_member.id": ObjectId(receiverId),
//             recipient: ObjectId(receiverId),
//             sender: ObjectId(userId),
//           },
//         },
//         {
//           $group: {
//             _id: {
//               recipient: "$recipient",
//             },
//             unreadMsg: {
//               $sum: {
//                 $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0],
//               },
//             },
//             docs: { $push: "$$ROOT" },
//           },
//         },
//         {
//           $addFields: {
//             messageinfo: {
//               $slice: ["$docs", -1],
//             },
//           },
//         },
//         {
//           $unwind: "$messageinfo",
//         },
//         {
//           $unset: "docs",
//         },
//       ]);
//       console.log(unreadMessageCountUserId, "unreadMessageCountUserId");
//       console.log(unreadMessageCountReceiverId, "dmfjkd");
//       await chatList.findOneAndUpdate(
//         { userId: ObjectId(receiverId), receiverId: ObjectId(userId) },
//         {
//           type: lastMessageOfUser[0].recipient_type,
//           messageType: lastMessageOfUser[0].message_type,
//           name: "",
//           lastMessage: lastMessageOfUser[0].message,
//           userTimeStamp: lastMessageOfUser[0].userTimeStamp,
//           memberList: lastMessageOfUser[0].group_member,
//           count:
//             unreadMessageCountReceiverId && unreadMessageCountReceiverId.length
//               ? unreadMessageCountReceiverId[0].unreadMsg
//               : 0,
//           taggedUserId: lastMessageOfUser[0].taggedUserId ?? [],
//           senderId:
//             lastMessageOfUser[0].sender_type === "airtable-syncs"
//               ? lastMessageOfUser[0].sender
//               : null,
//         }
//       );
//       await chatList.findOneAndUpdate(
//         { userId: ObjectId(userId), receiverId: ObjectId(receiverId) },
//         {
//           type: lastMessageOfUser[0].recipient_type,
//           messageType: lastMessageOfUser[0].message_type,
//           name: "",
//           lastMessage: lastMessageOfUser[0].message,
//           userTimeStamp: lastMessageOfUser[0].userTimeStamp,
//           memberList: lastMessageOfUser[0].group_member,
//           count:
//             unreadMessageCountUserId && unreadMessageCountUserId.length
//               ? unreadMessageCountUserId[0].unreadMsg
//               : 0,
//           taggedUserId: lastMessageOfUser[0].taggedUserId ?? [],
//           senderId:
//             lastMessageOfUser[0].sender_type === "airtable-syncs"
//               ? lastMessageOfUser[0].sender
//               : null,
//         }
//       );
//       this.sendBadgeCountNotification(userId);
//       this.sendBadgeCountNotification(receiverId);
//     } else {
//       await chatList.findOneAndUpdate(
//         { userId: ObjectId(receiverId), receiverId: ObjectId(userId) },
//         {
//           type: type,
//           messageType: "",
//           name: "",
//           lastMessage: "",
//           userTimeStamp: null,
//           count: 0,
//           taggedUserId: [],
//         }
//       );
//       await chatList.findOneAndUpdate(
//         { userId: ObjectId(userId), receiverId: ObjectId(receiverId) },
//         {
//           type: type,
//           messageType: "",
//           name: "",
//           lastMessage: "",
//           userTimeStamp: null,
//           count: 0,
//           taggedUserId: [],
//         }
//       );
//       this.sendBadgeCountNotification(userId);
//       this.sendBadgeCountNotification(receiverId);
//     }
//     return lastMessageOfUser;
//   }
// };

// New Code Changes editDeleteMessageTimeChatlistUpdate

exports.editDeleteMessageTimeChatlistUpdate = async (
  userId,
  receiverId,
  type
) => {
  if (type !== "user" && type !== "airtable-syncs") {
    const lastMessageOfGroupChannel = await chat
      .find({ recipient: ObjectId(receiverId) })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    if (lastMessageOfGroupChannel.length) {
      for (
        let index = 0;
        index < lastMessageOfGroupChannel[0].group_member.length;
        index++
      ) {
        let unreadMessageCountChannelGroup = await chat.aggregate([
          {
            $addFields: {
              group_member_field: "$group_member",
            },
          },
          {
            $unwind: "$group_member",
          },
          {
            $match: {
              "group_member.id":
                lastMessageOfGroupChannel[0].group_member[index].id,
              recipient: ObjectId(receiverId),
            },
          },
          {
            $group: {
              _id: {
                recipient: "$recipient",
              },
              unreadMsg: {
                $sum: {
                  $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0],
                },
              },
              docs: { $push: "$$ROOT" },
            },
          },
          {
            $addFields: {
              messageinfo: {
                $slice: ["$docs", -1],
              },
            },
          },
          {
            $unwind: "$messageinfo",
          },
          {
            $unset: "docs",
          },
        ]);

        await chatList.findOneAndUpdate(
          {
            userId: ObjectId(
              lastMessageOfGroupChannel[0].group_member[index].id.toString()
            ),
            receiverId: ObjectId(receiverId),
          },
          {
            type: unreadMessageCountChannelGroup[0].messageinfo.recipient_type,
            messageType:
              unreadMessageCountChannelGroup[0].messageinfo.message_type,
            name: "",
            lastMessage: unreadMessageCountChannelGroup[0].messageinfo.message,
            userTimeStamp:
              unreadMessageCountChannelGroup[0].messageinfo.userTimeStamp,
            memberList:
              unreadMessageCountChannelGroup[0].messageinfo.group_member,
            count: unreadMessageCountChannelGroup[0].unreadMsg,
            taggedUserId:
              unreadMessageCountChannelGroup[0].messageinfo.taggedUserId ?? [],
            senderId:
              unreadMessageCountChannelGroup[0].messageinfo.sender_type ===
              "airtable-syncs"
                ? unreadMessageCountChannelGroup[0].messageinfo.sender
                : null,
          }
        );
        this.sendBadgeCountNotification(
          lastMessageOfGroupChannel[0].group_member[index].id.toString()
        );
      }
    } else {
      let membersIds = [];
      if (type.toLowerCase() === "userchatgroup") {
        let joinedMembers = await userChatGroupMember
          .find({
            groupId: ObjectId(receiverId),
            status: 2,
          })
          .select("userId");
        membersIds = joinedMembers
          ? joinedMembers.map((members) => {
              return members.userId;
            })
          : [];
      } else {
        let joinedMembers = await chatChannelMembers
          .find({
            channelId: ObjectId(receiverId),
            status: 2,
            user_type: "airtable-syncs",
          })
          .select("userId");
        membersIds = joinedMembers
          ? joinedMembers.map((members) => {
              return members.userId;
            })
          : [];
      }
      for (let index = 0; index < membersIds.length; index++) {
        await chatList.findOneAndUpdate(
          {
            userId: ObjectId(membersIds[index].toString()),
            receiverId: ObjectId(receiverId),
          },
          {
            type: type,
            messageType: "",
            name: "",
            lastMessage: "",
            count: 0,
            taggedUserId: [],
            userTimeStamp: null,
          }
        );
        this.sendBadgeCountNotification(membersIds[index].toString());
      }
    }
    return lastMessageOfGroupChannel;
  } else {
    const lastMessageOfUser = await chat
      .find({
        $or: [
          {
            $and: [
              { recipient: ObjectId(userId) },
              { sender: ObjectId(receiverId) },
            ],
          },
          {
            $and: [
              { recipient: ObjectId(receiverId) },
              { sender: ObjectId(userId) },
            ],
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();
    if (lastMessageOfUser && lastMessageOfUser.length) {
      const [unreadMessageCountUserId, unreadMessageCountReceiverId] =
        await Promise.all([
          chat.aggregate([
            {
              $addFields: {
                group_member_field: "$group_member",
              },
            },
            {
              $unwind: "$group_member",
            },
            {
              $match: {
                "group_member.id": ObjectId(userId),
                recipient: ObjectId(userId),
                sender: ObjectId(receiverId),
              },
            },
            {
              $group: {
                _id: {
                  recipient: "$recipient",
                },
                unreadMsg: {
                  $sum: {
                    $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0],
                  },
                },
                docs: { $push: "$$ROOT" },
              },
            },
            {
              $addFields: {
                messageinfo: {
                  $slice: ["$docs", -1],
                },
              },
            },
            {
              $unwind: "$messageinfo",
            },
            {
              $unset: "docs",
            },
          ]),
          chat.aggregate([
            {
              $addFields: {
                group_member_field: "$group_member",
              },
            },
            {
              $unwind: "$group_member",
            },
            {
              $match: {
                "group_member.id": ObjectId(receiverId),
                recipient: ObjectId(receiverId),
                sender: ObjectId(userId),
              },
            },
            {
              $group: {
                _id: {
                  recipient: "$recipient",
                },
                unreadMsg: {
                  $sum: {
                    $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0],
                  },
                },
                docs: { $push: "$$ROOT" },
              },
            },
            {
              $addFields: {
                messageinfo: {
                  $slice: ["$docs", -1],
                },
              },
            },
            {
              $unwind: "$messageinfo",
            },
            {
              $unset: "docs",
            },
          ]),
        ]);
      console.log(unreadMessageCountUserId, "unreadMessageCountUserId");
      console.log(unreadMessageCountReceiverId, "dmfjkd");
      await chatList.findOneAndUpdate(
        { userId: ObjectId(receiverId), receiverId: ObjectId(userId) },
        {
          type: lastMessageOfUser[0].recipient_type,
          messageType: lastMessageOfUser[0].message_type,
          name: "",
          lastMessage: lastMessageOfUser[0].message,
          userTimeStamp: lastMessageOfUser[0].userTimeStamp,
          memberList: lastMessageOfUser[0].group_member,
          count:
            unreadMessageCountReceiverId && unreadMessageCountReceiverId.length
              ? unreadMessageCountReceiverId[0].unreadMsg
              : 0,
          taggedUserId: lastMessageOfUser[0].taggedUserId ?? [],
          senderId:
            lastMessageOfUser[0].sender_type === "airtable-syncs"
              ? lastMessageOfUser[0].sender
              : null,
        }
      );
      await chatList.findOneAndUpdate(
        { userId: ObjectId(userId), receiverId: ObjectId(receiverId) },
        {
          type: lastMessageOfUser[0].recipient_type,
          messageType: lastMessageOfUser[0].message_type,
          name: "",
          lastMessage: lastMessageOfUser[0].message,
          userTimeStamp: lastMessageOfUser[0].userTimeStamp,
          memberList: lastMessageOfUser[0].group_member,
          count:
            unreadMessageCountUserId && unreadMessageCountUserId.length
              ? unreadMessageCountUserId[0].unreadMsg
              : 0,
          taggedUserId: lastMessageOfUser[0].taggedUserId ?? [],
          senderId:
            lastMessageOfUser[0].sender_type === "airtable-syncs"
              ? lastMessageOfUser[0].sender
              : null,
        }
      );
      this.sendBadgeCountNotification(userId);
      this.sendBadgeCountNotification(receiverId);
    } else {
      await chatList.findOneAndUpdate(
        { userId: ObjectId(receiverId), receiverId: ObjectId(userId) },
        {
          type: type,
          messageType: "",
          name: "",
          lastMessage: "",
          userTimeStamp: null,
          count: 0,
          taggedUserId: [],
        }
      );
      await chatList.findOneAndUpdate(
        { userId: ObjectId(userId), receiverId: ObjectId(receiverId) },
        {
          type: type,
          messageType: "",
          name: "",
          lastMessage: "",
          userTimeStamp: null,
          count: 0,
          taggedUserId: [],
        }
      );
      this.sendBadgeCountNotification(userId);
      this.sendBadgeCountNotification(receiverId);
    }
    return lastMessageOfUser;
  }
};

// sum of unread messages for user
exports.sumOfUnreadMessageForUser = async (userId) => {
  const sumOfUnreadMessage = await chatList.aggregate([
    {
      $match: {
        userId: ObjectId(userId),
      },
    },
    {
      $group: {
        _id: { userId: "$userId" },
        count: { $sum: "$count" },
      },
    },
    {
      $project: {
        _id: 0,
        count: 1,
      },
    },
  ]);
  return sumOfUnreadMessage;
};

// sum of unread messages for user
exports.sumOfUnreadMessageForUserForAPI = async (req, res) => {
  const sumOfUnreadMessage = await chatList.aggregate([
    {
      $match: {
        userId: ObjectId(req.params.userId),
      },
    },
    {
      $group: {
        _id: { userId: "$userId" },
        count: { $sum: "$count" },
      },
    },
    {
      $project: {
        _id: 0,
        count: 1,
      },
    },
  ]);
  return res.status(200).json({ status: true, data: sumOfUnreadMessage });
};

exports.clearAllUsersSocketOnlineOfflineStatus = async (req, res) => {
  await chatList.updateMany({}, { offlineOnline: false });
  await chat_user.updateMany({}, { socket_id: [], online: false });
  res.send("done!");
};

// add/update record in chatlist whenever new record added in chat table for one on one chat
// type will be airtable-syncs, chatChannel, userChatGroup
exports.addUpdateRecordInChatListForUserTypeLatest = async (
  type,
  userId,
  receiverId,
  message,
  messageType,
  userTimeStamp,
  memberList,
  taggedUserId
) => {
  const recordExistsForuserId = await chatList
    .find({ userId: ObjectId(userId), receiverId: ObjectId(receiverId) })
    .lean();
  const recordExistsForReceiver = await chatList
    .find({ userId: ObjectId(receiverId), receiverId: ObjectId(userId) })
    .lean();
  console.log(
    recordExistsForuserId,
    recordExistsForReceiver,
    message,
    "00000000000000000000"
  );
  if (recordExistsForuserId && recordExistsForuserId.length) {
    const updateRecord = await chatList.findOneAndUpdate(
      { userId: ObjectId(userId), receiverId: ObjectId(receiverId) },
      {
        messageType: messageType,
        lastMessage: message,
        userTimeStamp: userTimeStamp,
        memberList: memberList,
        count: 0,
        clearChat: false,
        senderId: userId,
        isMention:
          taggedUserId &&
          taggedUserId.length &&
          taggedUserId.includes(userId.toString())
            ? true
            : false,
      }
    );
  } else {
    let receiverOnlineOffline = await chat_user
      .findOne({ userid: ObjectId(receiverId) })
      .lean();
    const chatListRecord = new chatList({
      userId: userId,
      receiverId: receiverId,
      messageType: messageType,
      lastMessage: message,
      userTimeStamp: userTimeStamp,
      memberList: memberList,
      count: 0,
      type: type,
      clearChat: false,
      offlineOnline:
        receiverOnlineOffline && receiverOnlineOffline.socket_id
          ? receiverOnlineOffline.socket_id.length > 0
            ? true
            : false
          : false,
      senderId: userId,
      isMention:
        taggedUserId &&
        taggedUserId.length &&
        taggedUserId.includes(userId.toString())
          ? true
          : false,
    });
    const addRecord = await chatListRecord.save();
  }
  console.log(recordExistsForReceiver, "recordExistsForReceiver");
  if (recordExistsForReceiver && recordExistsForReceiver.length) {
    const updateRecord = await chatList.findOneAndUpdate(
      { userId: ObjectId(receiverId), receiverId: ObjectId(userId) },
      {
        messageType: messageType,
        lastMessage: message,
        userTimeStamp: userTimeStamp,
        memberList: memberList,
        $inc: { count: 1 },
        taggedUserId: taggedUserId,
        clearChat: false,
        senderId: userId,
        isMention:
          taggedUserId &&
          taggedUserId.length &&
          taggedUserId.includes(receiverId.toString())
            ? true
            : false,
      }
    );
  } else {
    let receiverOnlineOffline = await chat_user
      .findOne({ userid: ObjectId(userId) })
      .lean();
    const chatListRecord = new chatList({
      userId: receiverId,
      receiverId: userId,
      messageType: messageType,
      lastMessage: message,
      userTimeStamp: userTimeStamp,
      memberList: memberList,
      count: 1,
      type: type,
      taggedUserId: taggedUserId,
      clearChat: false,
      offlineOnline:
        receiverOnlineOffline && receiverOnlineOffline.socket_id
          ? receiverOnlineOffline.socket_id.length > 0
            ? true
            : false
          : false,
      senderId: userId,
      isMention:
        taggedUserId &&
        taggedUserId.length &&
        taggedUserId.includes(receiverId.toString())
          ? true
          : false,
    });
    const addRecord = await chatListRecord.save();
  }
};

// add/update record in chatlist whenever new record added in chat table for group / channel chat
// type will be airtable-syncs, chatChannel, userChatGroup
exports.addUpdateRecordInChatListForGroupChannelLatest = async (
  type,
  userId,
  receiverId,
  message,
  messageType,
  userTimeStamp,
  memberList,
  taggedUserId,
  increaseCount
) => {
  console.log(memberList, userId, "memberList[index]");
  var memberIds = [];
  if (type.toLowerCase() === "chatchannel") {
    memberIds = await chatChannelMembers.aggregate([
      {
        $match: {
          channelId: ObjectId(receiverId),
          user_type: "airtable-syncs",
          status: 2,
        },
      },
      { $project: { channelId: 1, id: "$userId" } },
    ]);
  } else {
    memberIds = await userChatGroupMember.aggregate([
      { $match: { groupId: ObjectId(receiverId), status: 2 } },
      { $project: { groupId: 1, id: "$userId" } },
    ]);
  }

  for (let index = 0; index < memberIds.length; index++) {
    if (
      memberIds[index] &&
      memberIds[index].id &&
      userId.toString() === memberIds[index].id.toString()
    ) {
      console.log("in update record chatlist", userId);

      await chatList.findOneAndUpdate(
        { userId: userId, receiverId: receiverId },
        {
          messageType: messageType,
          lastMessage: message,
          userTimeStamp: userTimeStamp,
          memberList: memberList,
          count: 0,
          type: type,
          isMention:
            taggedUserId &&
            taggedUserId.length &&
            taggedUserId.includes(userId.toString())
              ? true
              : false,
          clearChat: false,
          taggedUserId: taggedUserId,
          senderId: userId && userId.length ? userId : null,
        },
        { upsert: true }
      );
    } else {
      if (memberIds[index] && memberIds[index].id) {
        console.log("in update record chatlist", userId);
        await chatList.findOneAndUpdate(
          { userId: memberIds[index].id, receiverId: receiverId },
          {
            messageType: messageType,
            lastMessage: message,
            userTimeStamp: userTimeStamp,
            memberList: memberList,
            $inc: { count: increaseCount ? 1 : 0 },
            type: type,
            isMention:
              taggedUserId &&
              taggedUserId.length &&
              taggedUserId.includes(memberIds[index].id.toString())
                ? true
                : false,
            taggedUserId: taggedUserId,
            clearChat: false,
            senderId: userId && userId.length ? userId : null,
          },
          { upsert: true }
        );
      }
    }
  }
};

// function to send badge count notification
exports.sendBadgeCountNotification = async (userId) => {
  let unReadCount = await this.checkIfMsgReadSocketCount(userId);
  let userDeviceToken = await User.findOne(
    { _id: new ObjectId(userId) },
    { deviceToken: 1 }
  );
  if (userDeviceToken !== null) {
    if (userDeviceToken.deviceToken.length !== 0) {
      let successdata = {
        notification: "",
        description: "",
        device_token: userDeviceToken.deviceToken,
        collapse_key: "",
        badge_count: unReadCount,
        notification_data: {
          type: "",
          content: [],
        },
      };
      send_notification(successdata);
    }
  }
};
