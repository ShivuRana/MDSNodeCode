const chat = require("../../database/models/chat");
const User = require("../../database/models/airTableSync");
const userChatGroup = require("../../database/models/userChatGroup");
const chat_user = require("../../database/models/chatUser");
const chatChannel = require("../../database/models/chatChannel");
const Notification = require("../../database/models/notification");
const {
  send_notification,
  notification_template,
} = require("../../utils/notification");
const { ObjectId } = require("mongodb");
const moment = require("moment");

// new send message controller
exports.newSendMessage = async (
  message,
  recipient,
  sender,
  type,
  date,
  time,
  image_video,
  other_files,
  sender_name,
  quotemsg,
  group_member,
  message_type,
  video_thumbnail,
  taggedUserId,
  time_stamp,
  uniqueObjectId,
  createAtValue,
  frontendUniqueId
) => {
  try {
    var isLink = false;
    var quotemsg_id = quotemsg && quotemsg.length > 0 ? quotemsg : undefined;
    if (
      RegExp(
        "https?://(?:www.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|www.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|https?://(?:www.|(?!www))[a-zA-Z0-9]+.[^s]{2,}|www.[a-zA-Z0-9]+.[^s]{2,}"
      ).test(message)
    ) {
      isLink = true;
    }

    var data = [];
    if (
      (((image_video !== undefined && image_video.length > 0) ||
        (other_files !== undefined && other_files.length > 0)) &&
        quotemsg_id === undefined) ||
      (quotemsg_id !== undefined && quotemsg_id.length === 0)
    ) {
      for (var i = 0; i < image_video.length; i++) {
        if (message.length > 0 && i === 0) {
          data.push({
            message: message,
            recipient_type: type === "user" ? "airtable-syncs" : type,
            sender_type: "airtable-syncs",
            recipient: recipient,
            sender: sender,
            type: type,
            time: time,
            date: date,
            media: image_video[i].key,
            size: image_video[i].size,
            otherfiles: [],
            sender_name: sender_name,
            messageCount: 0,
            quote_message_id: null,
            group_member: group_member,
            isLink: isLink,
            message_type: message_type,
            video_thumbnail: video_thumbnail,
            taggedUserId: taggedUserId ? taggedUserId : [],
            userTimeStamp: time_stamp,
            frontendUniqueId: frontendUniqueId,
          });
        } else {
          data.push({
            message: "",
            recipient_type: type === "user" ? "airtable-syncs" : type,
            sender_type: "airtable-syncs",
            recipient: recipient,
            sender: sender,
            type: type,
            time: time,
            date: date,
            media: image_video[i].key,
            size: image_video[i].size,
            otherfiles: [],
            sender_name: sender_name,
            messageCount: 0,
            quote_message_id: null,
            group_member: group_member,
            isLink: isLink,
            message_type: message_type,
            video_thumbnail: video_thumbnail,
            taggedUserId: taggedUserId ? taggedUserId : [],
            userTimeStamp: time_stamp,
            frontendUniqueId: frontendUniqueId,
          });
        }
      }

      for (var i = 0; i < other_files.length; i++) {
        if (message.length > 0 && i === 0 && image_video.length === 0) {
          data.push({
            message: message,
            recipient_type: type === "user" ? "airtable-syncs" : type,
            sender_type: "airtable-syncs",
            recipient: recipient,
            sender: sender,
            type: type,
            time: time,
            date: date,
            media: [],
            otherfiles: other_files[i].key,
            size: other_files[i].size,
            sender_name: sender_name,
            messageCount: 0,
            quote_message_id: null,
            group_member: group_member,
            isLink: isLink,
            message_type: message_type,
            video_thumbnail: video_thumbnail,
            taggedUserId: taggedUserId ? taggedUserId : [],
            userTimeStamp: time_stamp,
            frontendUniqueId: frontendUniqueId,
          });
        } else {
          data.push({
            message: "",
            recipient_type: type === "user" ? "airtable-syncs" : type,
            sender_type: "airtable-syncs",
            recipient: recipient,
            sender: sender,
            type: type,
            time: time,
            date: date,
            media: [],
            otherfiles: other_files[i].key,
            size: other_files[i].size,
            sender_name: sender_name,
            messageCount: 0,
            quote_message_id: null,
            group_member: group_member,
            isLink: isLink,
            message_type: message_type,
            video_thumbnail: video_thumbnail,
            taggedUserId: taggedUserId ? taggedUserId : [],
            userTimeStamp: time_stamp,
            frontendUniqueId: frontendUniqueId,
          });
        }
      }
    } else {
      data.push({
        message: message,
        recipient_type: type === "user" ? "airtable-syncs" : type,
        sender_type: "airtable-syncs",
        recipient: recipient,
        sender: sender,
        type: type,
        time: time,
        date: date,
        media: [],
        otherfiles: [],
        sender_name: sender_name,
        messageCount: 0,
        quote_message_id: quotemsg ?? null,
        group_member: group_member,
        isLink: isLink,
        message_type: message_type,
        video_thumbnail: video_thumbnail,
        taggedUserId: taggedUserId ? taggedUserId : [],
        userTimeStamp: time_stamp,
        frontendUniqueId: frontendUniqueId,
      });
    }

    var updateEntry = [];
    for (let index = 0; index < data.length; index++) {
      const newchat = new chat({
        _id: uniqueObjectId,
        ...data[index],
        createdAt: createAtValue,
        updatedAt: createAtValue,
      });
      const result = await newchat.save();
      updateEntry.push(result);
    }
    return updateEntry;
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// changing message timestamp data type string to date
// below function will update the userTimeStamp with messageTimeStamp
exports.updateUserTimeStampWithMessageTimeStamp = async (req, res) => {
  try {
    // 2
    console.log(parseInt(req.params.page) * 20);
    let allRecords = await chat
      .find({})
      .select("_id messageTimeStamp")
      .lean()
      .sort({ createdAt: -1 })
      .skip(parseInt(req.params.page) * 1000)
      .limit(1000);
    console.log("records fetched");
    const temp = allRecords.map(async (message) => {
      console.log(message._id);
      let conver;
      if (message.messageTimeStamp) {
        let convertDate = moment(
          message.messageTimeStamp,
          "YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"
        ).format("YYYY-MM-DDTHH:mm:ss.sss");
        console.log(convertDate);
        conver = moment(convertDate, "YYYY-MM-DDTHH:mm:ss.sss")
          .local()
          .format("YYYY-MM-DDTHH:mm:ss.sss+00:00");
      } else {
        conver = message.createdAt;
      }
      console.log(conver);
      const updateTimeStamp = await chat.updateMany(
        { _id: message._id },
        {
          $set: { userTimeStamp: conver },
        }
      );
      return updateTimeStamp;
    });
    await Promise.all([...temp]);

    res.send("successfully updated!");
  } catch (error) {
    console.log(error);
    res.send("something went wrong!");
  }
};

// function to get deleted conversation of users
exports.getUsersWhoDeletedConversation = async (userIds, id) => {
  let usersDeletedConversation = await User.find({
    _id: {
      $in: userIds.map((uid) => {
        return ObjectId(uid.toString());
      }),
    },
    clear_chat_data: { $elemMatch: { id: id, deleteConversation: true } },
  })
    .select("_id")
    .lean();
  return usersDeletedConversation;
};

// new send message controller
exports.newSendMessageLatest = async (
  message,
  recipient,
  sender,
  type,
  images,
  videos,
  other_files,
  voiceNotes,
  sender_name,
  quotemsg,
  group_member,
  message_type,
  taggedUserId,
  time_stamp,
  uniqueObjectId,
  createAtValue,
  frontendUniqueId
) => {
  try {
    var isLink = false;
    var quotemsg_id = quotemsg && quotemsg.length > 0 ? quotemsg : undefined;
    if (
      RegExp(
        "https?://(?:www.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|www.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|https?://(?:www.|(?!www))[a-zA-Z0-9]+.[^s]{2,}|www.[a-zA-Z0-9]+.[^s]{2,}"
      ).test(message)
    ) {
      isLink = true;
    }

    var data = [];
    data.push({
      message: message,
      recipient_type: type === "user" ? "airtable-syncs" : type,
      sender_type: "airtable-syncs",
      recipient: recipient,
      sender: sender,
      type: type,
      images: images ?? [],
      videos: videos ?? [],
      documents: other_files ?? [],
      voiceNote: voiceNotes ?? [],
      sender_name: sender_name,
      messageCount: 0,
      quote_message_id: quotemsg ?? null,
      group_member: group_member,
      isLink: isLink,
      message_type: message_type,
      taggedUserId: taggedUserId ? taggedUserId : [],
      userTimeStamp: time_stamp,
      frontendUniqueId: frontendUniqueId,
    });

    var updateEntry = [];
    for (let index = 0; index < data.length; index++) {
      const newchat = new chat({
        _id: uniqueObjectId,
        ...data[index],
        createdAt: createAtValue,
        updatedAt: createAtValue,
      });
      const result = await newchat.save();
      updateEntry.push(result);
    }
    return updateEntry;
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// Add Reaction Function for add and update data
exports.addReactionOnMessage = async (messageId, senderId, emojiId, type) => {
  // Find the chat by its messageId
  const messageData = await chat.findById(messageId);
  console.log(messageData, messageId, "messageData");
  // Find the reaction by emojiId in the messageReactions array
  const reaction = messageData.messageReactions.find(
    (r) => r.emojiId === emojiId
  );

  if (reaction) {
    if (!reaction.userIds.includes(senderId)) {
      reaction.userIds.push(senderId);
      await chat.findOneAndUpdate(
        { _id: messageId, "messageReactions.emojiId": emojiId },
        { $set: { "messageReactions.$.userIds": reaction.userIds } }
      );
      console.log("Reaction updated:", messageData);
    }
  } else {
    messageData.messageReactions.push({ emojiId, userIds: [senderId] });
    // Save the chat with the new reaction
    await messageData.save();
    console.log("New reaction added:", messageData);
  }

  if (messageData.sender._id.toString() !== senderId) {
    console.log("New reaction added:", messageData);
    console.log("messageData.sender._id:", messageData.sender._id.toString());

    const [
      senderData,
      recipentData,
      recipentDataGroup,
      recipentDataChatChannel,
      Senderonline,
    ] = await Promise.all([
      User.findOne({ _id: messageData.sender._id }).select(
        "otherdetail deviceToken _id muteNotification"
      ),
      User.findOne({ _id: messageData.recipient._id }).select(
        "otherdetail _id profileImg muteNotification"
      ),
      userChatGroup.findOne({ _id: new ObjectId(messageData.recipient._id) }),
      chatChannel.findOne({ _id: new ObjectId(messageData.recipient._id) }),
      chat_user.findOne({ userid: messageData.sender._id }),
    ]);
    if (
      (senderData.muteNotification !== undefined &&
        senderData.muteNotification !== null &&
        !senderData.muteNotification.includes(messageData.recipient._id)) ||
      senderData.muteNotification === undefined ||
      senderData.muteNotification === null
    ) {
      console.log(senderData, "senderData");

      let MessageTextSend;

      switch (true) {
        case messageData.message_type === "image":
          MessageTextSend = `📷 Photo`;
          break;
        case messageData.message_type === "video":
          MessageTextSend = `🎥 Video`;
          break;
        case messageData.message_type.includes("text") ||
          messageData.message_type === "url":
          MessageTextSend = `${messageData.message}`;
          break;
        case messageData.message_type === "document":
          MessageTextSend = `📄 file`;
          break;
        case messageData.message_type === "voice":
          MessageTextSend = `   Voice`;
          break;
        default:
          MessageTextSend = `📷 media`;
      }

      let chatData;

      if (type === "user") {
        chatData = {
          senderId: senderData._id,
          senderName: senderData.otherdetail
            ? senderData.otherdetail[process.env.USER_FN_ID] +
              " " +
              senderData.otherdetail[process.env.USER_LN_ID]
            : "",
          senderImage: senderData.profileImg,
          recipentId: recipentData._id,
          recipentName: recipentData.otherdetail
            ? recipentData.otherdetail[process.env.USER_FN_ID] +
              "" +
              recipentData.otherdetail[process.env.USER_LN_ID]
            : "",
          recipentImage: recipentData.profileImg,
          chatType: type,
          messageType: messageData.message_type,
          online: Senderonline.online,
        };
      } else if (type === "chatChannel") {
        chatData = {
          senderId: senderData._id,
          senderName: senderData.otherdetail
            ? senderData.otherdetail[process.env.USER_FN_ID] +
              " " +
              senderData.otherdetail[process.env.USER_LN_ID]
            : "",
          senderImage: senderData.profileImg,
          recipentId: recipentDataChatChannel._id,
          recipentName: recipentDataChatChannel.channelName
            ? recipentDataChatChannel.channelName
            : "",
          recipentImage: recipentDataChatChannel.channelIcon
            ? recipentDataChatChannel.channelIcon
            : "",
          chatType: type,
          messageType: messageData.message_type,
        };
      } else if (type === "userChatGroup") {
        chatData = {
          senderId: senderData._id,
          senderName: senderData.otherdetail
            ? senderData.otherdetail[process.env.USER_FN_ID] +
              " " +
              senderData.otherdetail[process.env.USER_LN_ID]
            : "",
          senderImage: senderData.profileImg,
          recipentId: recipentDataGroup._id,
          recipentName: recipentDataGroup.groupTitle
            ? recipentDataGroup.groupTitle
            : "",
          recipentImage: recipentDataGroup.groupImage,
          chatType: type,
          messageType: messageData.message_type,
        };
      }

      data = {
        senderName: senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "",
        emojiId: emojiId,
        message: MessageTextSend,
      };

      let notificationTemplate =
        await notification_template.send_msg_to_reacted_user(data);
      console.log(senderData.muteNotification, "senderData.muteNotification ");
      console.log(messageData.recipient._id, "messageData.recipient._id");
      console.log(
        senderData.deviceToken.length,
        "senderData.deviceToken.length"
      );

      //need to check
      if (senderData.deviceToken.length !== 0) {
        await new Notification({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: messageData.sender._id,
          createdFor: messageData.recipient._id,
          role: type,
        }).save();

        let successdata = {
          notification: notificationTemplate?.template?.title,
          description: notificationTemplate?.template?.body,
          device_token: senderData.deviceToken,
          collapse_key: messageData.recipient._id,
          notification_data: {
            type: "send_msg_to_reacted_user",
            content: chatData,
          },
        };
        console.log(successdata, "successdata");
        send_notification(successdata);
      }
      return messageData;
    }
  }
};

//  Remove Reaction Function for remove reaction
exports.removeReactionOnMessage = async (messageId, senderId, emojiId) => {
  // Find the chat by its messageId
  const MessageData = await chat.findOne({ _id: messageId });
  // Find the reaction by emojiId in the messageReactions array
  const reactionIndex = MessageData.messageReactions.findIndex(
    (r) => r.emojiId === emojiId
  );

  if (reactionIndex !== -1) {
    const reaction = MessageData.messageReactions[reactionIndex];
    const senderIndex = reaction.userIds.indexOf(senderId);

    if (senderIndex !== -1) {
      reaction.userIds.splice(senderIndex, 1);
      if (reaction.userIds.length === 0) {
        MessageData.messageReactions.splice(reactionIndex, 1);
      }
      // Save the chat with the updated reaction data
      await MessageData.save();
      console.log("Reaction removed:", MessageData);
      return MessageData;
    }
  }
  return MessageData;
};

// get mute chat id list for logged in user
exports.getMuteChatListForUser = async (req, res) => {
  try {
    const mutedChatIds = await User.findById(req.authUserId).select({
      muteNotification: 1,
    });
    if (mutedChatIds)
      res
        .status(200)
        .json({ status: true, message: "Mute chat ids!", data: mutedChatIds });
    else
      res.status(200).json({
        status: false,
        message: "Something went wrong while getting mute chat ids!",
        data: mutedChatIds,
      });
  } catch (error) {
    res.status(200).json({
      status: false,
      message: "Something went wrong while getting mute chat ids!",
      error: error,
    });
  }
};

// api to assign media field value to image and video fields with proper format and otherfiles field value assign to documents field
exports.assignImageVideoDocumentFields = async (req, res) => {
  try {
    let allRecords = await chat
      .find({ message_type: { $ne: "text" } })
      .select("_id message message_type media otherfiles size video_thumbnail")
      .lean()
      .sort({ createdAt: -1 });
    let temp = allRecords.map(async (message) => {
      let newImages = [],
        newVideos = [],
        documents = [];
      if (message.media) {
        for (let index = 0; index < message.media.length; index++) {
          if (
            message.media[index] &&
            ["jpeg", "jpg", "png", "gif", "tiff"].indexOf(
              message.media[index].split(".").pop().toLowerCase()
            ) !== -1
          ) {
            newImages.push({
              url: message.media[index],
              aspectRatio: 1, // Add the aspectRatio field
            });
          } else if (
            message.media[index] &&
            ["mp4", "mov", "webm", "mkv", "flv", "vob"].indexOf(
              message.media[index].split(".").pop().toLowerCase()
            ) !== -1
          ) {
            newVideos.push({
              url: message.media[index],
              thumbnail: message.video_thumbnail ?? "",
              aspectRatio: 1, // Add the aspectRatio field
            });
          }
        }
      }
      if (message.otherfiles) {
        for (let index = 0; index < message.otherfiles.length; index++) {
          documents.push({
            url: message.otherfiles[index],
            size: message.size,
          });
        }
      }
      let newMessageType = "";
      if (message.message.length) {
        if (message.message_type === "url") newMessageType = "url";
        else newMessageType = "text";
      }
      if (newImages.length) {
        if (newMessageType.length) {
          newMessageType = newMessageType + ",image";
        } else {
          newMessageType = "image";
        }
      }
      if (newVideos.length) {
        if (newMessageType.length) {
          newMessageType = newMessageType + ",video";
        } else {
          newMessageType = "video";
        }
      }
      if (documents.length) {
        if (newMessageType.length) {
          newMessageType = newMessageType + ",document";
        } else {
          newMessageType = "document";
        }
      }
      const updateImageVideoDocFields = await chat.updateMany(
        { _id: message._id },
        {
          $set: {
            images: newImages,
            videos: newVideos,
            documents: documents,
            message_type: newMessageType,
          },
        }
      );
      return updateImageVideoDocFields;
    });
    await Promise.all([...temp]);

    res.send("successfully updated!");
  } catch (error) {
    res
      .status(200)
      .json({ status: false, message: "Something went wrong!", error: error });
  }
};

exports.assignAspectRatioFields = async (req, res) => {
  try {
    let allRecords = await chat
      .find({ message_type: { $ne: "text" } })
      .select("_id videos images")
      .lean();
    let temp = allRecords.map(async (message) => {
      let newImages = [],
        newVideos = [];
      if (message.images.length > 0) {
        message.images.map((imagesData, index) => {
          newImages.push({
            url: imagesData,
            aspectRatio: 1, // Add the aspectRatio field
          });
        });
        console.log(newImages, "newImages");
      }
      if (message.videos.length > 0) {
        message.videos.map((videosData, index) => {
          newVideos.push({
            url: videosData.url,
            thumbnail: videosData.thumbnail,
            aspectRatio: 1, // Add the aspectRatio field
          });
        });
        console.log(newVideos, "newVideos");
      }
      if (newImages.length > 0 || newVideos.length > 0) {
        const updateImageVideoDocFields = await chat.updateMany(
          { _id: message._id },
          {
            $set: {
              images: newImages,
              videos: newVideos,
            },
          }
        );
        return updateImageVideoDocFields;
      }
    });
    await Promise.all([...temp]);

    res.send("successfully updated!");
  } catch (error) {
    res.status(200).json({
      status: false,
      message: "Something went wrong!",
      error: error.message,
    });
  }
};
// api to change mute notification field
exports.changeMuteNotificationField = async (req, res) => {
  let changeMuteNotification = await User.find({
    muteNotification: { $exists: true },
    $expr: { $gt: [{ $size: "$muteNotification" }, 0] },
  }).select({ muteNotification: 1 });
  for (let index = 0; index < changeMuteNotification.length; index++) {
    let filterMuteNotification = changeMuteNotification[
      index
    ].muteNotification.filter((mute) => {
      if (mute.mute) return mute;
    });
    let changeData = await User.findByIdAndUpdate(
      changeMuteNotification[index]._id,
      {
        muteNotification: filterMuteNotification.map((mute) => {
          return mute.chatId;
        }),
      }
    );
  }
  changeMuteNotification = await User.find({
    muteNotification: { $exists: true },
    $expr: { $gt: [{ $size: "$muteNotification" }, 0] },
  }).select({ muteNotification: 1 });

  res.status(200).json({
    status: true,
    message: "change done!",
    data: changeMuteNotification,
  });
};
