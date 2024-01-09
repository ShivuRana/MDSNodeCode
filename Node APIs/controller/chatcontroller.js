const chat = require("../database/models/chat");
const User = require("../database/models/airTableSync");
const chat_user = require("../database/models/chatUser");
const Group = require("../database/models/group");
const GroupMember = require("../database/models/groupMember");
const userChatGroupMember = require("../database/models/userChatGroupMember");
const userChatGroup = require("../database/models/userChatGroup");
const chatChannelMembers = require("../database/models/chatChannelMembers");
const chatChannel = require("../database/models/chatChannel");
const mongoose = require("mongoose");
const AdminUser = require("../database/models/adminuser");
const chat_participent = require("../database/models/chatParticipent");
const Notification = require("../database/models/notification");
const ObjectId = require("mongoose").Types.ObjectId;
const { deleteImage } = require("../utils/mediaUpload");
const moment = require("moment");
const {
  send_notification,
  notification_template,
  addTime,
  subtractTime,
} = require("../utils/notification");
const {
  deleteRecordFromChatList,
  clearMessageFromChatList,
} = require("../controller/socketChatController/chatListController");
require("dotenv").config();
const AWS = require("aws-sdk");
const chatList = require("../database/models/chatList");

var s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
  Bucket: process.env.AWS_BUCKET,
});

// save media file
exports.savefiles = async (req, res) => {
  try {
    const { files_chat, otherfiles_chat } = req;

    if (files_chat || otherfiles_chat) {
      return res.status(200).json({
        status: true,
        media: files_chat,
        otherfiles: otherfiles_chat,
        message: "Files saved successfully!",
      });
    } else
      return res
        .status(200)
        .json({ status: false, message: "Something went wrong!" });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// save media file for user
exports.saveFilesGroup = async (req, res) => {
  try {
    const { files_chat, otherfiles_chat } = req;

    if (files_chat || otherfiles_chat) {
      return res.status(200).json({
        status: true,
        media: files_chat,
        otherfiles: otherfiles_chat,
        message: "Files saved successfully!",
      });
    } else
      return res
        .status(200)
        .json({ status: false, message: "Something went wrong!" });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// get user details socket event
exports.get_user_by_socket = async (userid) => {
  try {
    let response = await chat_user.findOne({ userid: userid });
    if (response) {
      return response;
    } else console.log("No socket for this user!");
  } catch (error) {
    console.log(error);
  }
};

// add message socket event
exports.add_chat = async (
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
  createAtValue
) => {
  try {
    let quotemsg_id = quotemsg && quotemsg.length > 0 ? quotemsg : undefined;
    let readmsg,
      isLink = false,
      match = {},
      recipientArr = [],
      senderArr = [];

    recipientArr.push({
      recipient: new mongoose.Types.ObjectId(recipient),
      sender: new mongoose.Types.ObjectId(sender),
    });
    senderArr.push({
      recipient: new mongoose.Types.ObjectId(sender),
      sender: new mongoose.Types.ObjectId(recipient),
    });

    var group_member_local = [];
    if (group_member && group_member.length === 0) {
      if (type === "user") {
        group_member_local = [
          {
            id: sender,
            readmsg: true,
          },
          {
            id: recipient,
            readmsg: false,
          },
        ];
      } else if (type.toLowerCase() === "userchatgroup") {
        var members = await userChatGroupMember.find({
          groupId: recipient,
          status: 2,
          userChatGroupMember: "airtable-syncs",
        });
        for (var i = 0; i < members.length; i++) {
          if (members[i].userId._id.toString() === sender) {
            group_member_local.push({
              id: members[i].userId._id,
              readmsg: true,
            });
          } else {
            group_member_local.push({
              id: members[i].userId._id,
              readmsg: false,
            });
          }
        }
      } else if (type.toLowerCase() === "chatchannel") {
        var members = await chatChannelMembers.find({
          channelId: recipient,
          status: 2,
          user_type: "airtable-syncs",
        });
        for (var i = 0; i < members.length; i++) {
          if (members[i].userId._id.toString() === sender) {
            group_member_local.push({
              id: members[i].userId._id,
              readmsg: true,
            });
          } else {
            group_member_local.push({
              id: members[i].userId._id,
              readmsg: false,
            });
          }
        }
      } else {
        var members = await GroupMember.find({
          groupId: recipient,
          status: 2,
        });
        for (var i = 0; i < members.length; i++) {
          if (
            members[i].userId &&
            members[i].userId._id.toString() === sender
          ) {
            group_member_local.push({
              id: members[i].userId._id,
              readmsg: true,
            });
          } else if (members[i].userId) {
            group_member_local.push({
              id: members[i].userId._id,
              readmsg: false,
            });
          }
        }
      }
    } else {
      group_member_local = group_member;
    }

    match.$or = [{ $and: recipientArr }, { $and: senderArr }];
    readmsg = false;

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
            group_member: group_member_local,
            isLink: isLink,
            message_type: message_type,
            video_thumbnail: video_thumbnail,
            taggedUserId: taggedUserId ? taggedUserId : [],
            userTimeStamp: time_stamp,
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
            group_member: group_member_local,
            isLink: isLink,
            message_type: message_type,
            video_thumbnail: video_thumbnail,
            taggedUserId: taggedUserId ? taggedUserId : [],
            userTimeStamp: time_stamp,
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
            group_member: group_member_local,
            isLink: isLink,
            message_type: message_type,
            video_thumbnail: video_thumbnail,
            taggedUserId: taggedUserId ? taggedUserId : [],
            userTimeStamp: time_stamp,
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
            group_member: group_member_local,
            isLink: isLink,
            message_type: message_type,
            video_thumbnail: video_thumbnail,
            taggedUserId: taggedUserId ? taggedUserId : [],
            userTimeStamp: time_stamp,
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
        group_member: group_member_local,
        isLink: isLink,
        message_type: message_type,
        video_thumbnail: video_thumbnail,
        taggedUserId: taggedUserId ? taggedUserId : [],
        userTimeStamp: time_stamp,
      });
    }

    const quoted_msg_dtl = quotemsg ? await chat.findById(quotemsg) : quotemsg;
    var updateEntry = [];
    for (let index = 0; index < data.length; index++) {
      const newchat = new chat({
        _id: uniqueObjectId,
        ...data[index],
        createdAt: createAtValue,
        updatedAt: createAtValue,
      });
      const result = await newchat.save();
      const resData = await chat.findById(result._id).lean();
      updateEntry.push(resData);
    }

    if (updateEntry) {
      var recipient_data, quote_sender, quote_recipient;
      const sender_data = {
        id: updateEntry[0].sender._id,
        firstname:
          updateEntry[0].sender.auth0Id !== null &&
          updateEntry[0].sender.auth0Id !== ""
            ? updateEntry[0].sender.otherdetail
              ? updateEntry[0].sender.otherdetail[process.env.USER_FN_ID] +
                " " +
                updateEntry[0].sender.otherdetail[process.env.USER_LN_ID]
              : typeof updateEntry[0].sender.attendeeDetail === "object"
              ? updateEntry[0].sender.attendeeDetail.name
              : ""
            : "",
        image:
          updateEntry[0].sender.auth0Id !== null &&
          updateEntry[0].sender.auth0Id !== ""
            ? updateEntry[0].sender.profileImg
            : typeof updateEntry[0].sender.attendeeDetail === "object"
            ? updateEntry[0].sender.attendeeDetail.photo
            : "",
        type: "user",
      };

      if (
        type.toLowerCase() !== "group" &&
        type.toLowerCase() !== "userchatgroup" &&
        type.toLowerCase() !== "chatchannel"
      ) {
        recipient_data = {
          id: updateEntry[0].recipient._id,
          firstname:
            updateEntry[0].recipient.auth0Id !== null &&
            updateEntry[0].recipient.auth0Id !== ""
              ? updateEntry[0].recipient.otherdetail
                ? updateEntry[0].recipient.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  updateEntry[0].recipient.otherdetail[process.env.USER_LN_ID]
                : typeof updateEntry[0].recipient.attendeeDetail === "object"
                ? updateEntry[0].recipient.attendeeDetail.name
                : ""
              : "",
          image:
            updateEntry[0].recipient.auth0Id !== null &&
            updateEntry[0].recipient.auth0Id !== ""
              ? updateEntry[0].recipient.profileImg
              : typeof updateEntry[0].recipient.attendeeDetail === "object"
              ? updateEntry[0].recipient.attendeeDetail.photo
              : "",
          type: "user",
        };
      } else if (type.toLowerCase() === "userchatgroup") {
        const group_data = await userChatGroup.findById(
          new ObjectId(recipient)
        );
        recipient_data = {
          id: group_data._id,
          firstname: group_data.groupTitle,
          image: group_data.groupImage,
          type: "userChatGroup",
        };
      } else if (type.toLowerCase() === "chatchannel") {
        const channelData = await chatChannel.findById(new ObjectId(recipient));
        recipient_data = {
          id: channelData._id,
          firstname: channelData.channelName,
          image: channelData.channelIcon,
          type: "chatChannel",
        };
      } else {
        const group_data = await Group.findById(updateEntry[0].recipient);
        recipient_data = {
          id: group_data._id,
          firstname: group_data.groupTitle,
          image: group_data.groupImage,
          type: "group",
        };
      }

      if (updateEntry[0].quote_message_id) {
        quote_sender = {
          id: quoted_msg_dtl.sender._id,
          firstname:
            quoted_msg_dtl.sender.auth0Id !== null &&
            quoted_msg_dtl.sender.auth0Id !== ""
              ? quoted_msg_dtl.sender.otherdetail
                ? quoted_msg_dtl.sender.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  quoted_msg_dtl.sender.otherdetail[process.env.USER_LN_ID]
                : typeof quoted_msg_dtl.sender.attendeeDetail === "object"
                ? quoted_msg_dtl.sender.attendeeDetail.name
                : ""
              : "",
          image:
            quoted_msg_dtl.sender.auth0Id !== null &&
            quoted_msg_dtl.sender.auth0Id !== ""
              ? quoted_msg_dtl.sender.profileImg
              : typeof quoted_msg_dtl.sender.attendeeDetail === "object"
              ? quoted_msg_dtl.sender.attendeeDetail.photo
              : "",
          type: "user",
        };

        if (type === "user") {
          quote_recipient = {
            id: quoted_msg_dtl.recipient._id,
            firstname:
              quoted_msg_dtl.recipient.auth0Id !== null &&
              quoted_msg_dtl.recipient.auth0Id !== ""
                ? quoted_msg_dtl.recipient.otherdetail
                  ? quoted_msg_dtl.recipient.otherdetail[
                      process.env.USER_FN_ID
                    ] +
                    " " +
                    quoted_msg_dtl.recipient.otherdetail[process.env.USER_LN_ID]
                  : typeof quoted_msg_dtl.recipient.attendeeDetail === "object"
                  ? quoted_msg_dtl.recipient.attendeeDetail.name
                  : ""
                : "",
            image:
              quoted_msg_dtl.recipient.auth0Id !== null &&
              quoted_msg_dtl.recipient.auth0Id !== ""
                ? quoted_msg_dtl.recipient.profileImg
                : typeof quoted_msg_dtl.recipient.attendeeDetail === "object"
                ? quoted_msg_dtl.recipient.attendeeDetail.photo
                : "",
            type: "user",
          };
        } else if (type.toLowerCase() === "userchatgroup") {
          const group_data = await userChatGroup.findById(
            quoted_msg_dtl.recipient
          );
          quote_recipient = {
            id: group_data._id,
            firstname: group_data.groupTitle,
            image: group_data.groupImage,
            type: "userChatGroup",
          };
        } else if (type.toLowerCase() === "chatchannel") {
          const channelData = await chatChannel.findById(
            quoted_msg_dtl.recipient
          );
          quote_recipient = {
            id: channelData._id,
            firstname: channelData.channelName,
            image: channelData.channelIcon,
            type: "chatChannel",
          };
        } else {
          const group_data = await Group.findById(quoted_msg_dtl.recipient);
          quote_recipient = {
            id: group_data._id,
            firstname: group_data.groupTitle,
            image: group_data.groupImage,
            type: "group",
          };
        }
      }

      var response = [];
      for (var i = 0; i < updateEntry.length; i++) {
        var quote_data = updateEntry[i].quote_message_id
          ? {
              ...quoted_msg_dtl._doc,
              sender: quote_sender,
              recipient: quote_recipient,
            }
          : updateEntry[i].quote_message_id;
        if (quote_data) delete quote_data.quote_message_id;
        response.push({
          ...updateEntry[i],
          sender: sender_data,
          recipient: recipient_data,
          quote_message_id: quote_data,
        });
      }
      return response;
    } else {
      console.log("something went wrong!");
    }
  } catch (error) {
    console.log(error, "Internal server error!");
  }
};

// edit message socket event
exports.edit_chat = async (
  messageId,
  message,
  recipient,
  sender,
  type,
  taggedUserId
) => {
  try {
    let isLink = false,
      match = {},
      recipientArr = [],
      senderArr = [];

    const chatData = await chat.findOne({
      _id: new mongoose.Types.ObjectId(messageId),
      sender: new mongoose.Types.ObjectId(sender),
    });
    if (chatData === null)
      return {
        status: false,
        message: "You can't edit this message! Only sender can edit message!",
      };

    if (type !== "group") {
      const user_data = await User.findById(
        new mongoose.Types.ObjectId(recipient)
      ).select("blocked_chat");
      const sender_user = await User.findById(
        new mongoose.Types.ObjectId(sender)
      ).select("blocked_chat");

      if (
        user_data &&
        user_data.blockchat &&
        user_data.blockchat.includes(new mongoose.Types.ObjectId(sender))
      ) {
        return { status: false, message: "User have blocked you!" };
      }

      if (
        sender_user &&
        sender_user.blockchat &&
        sender_user.blockchat.includes(new mongoose.Types.ObjectId(recipient))
      ) {
        return { status: false, message: "You have blocked recipient!" };
      }
    }

    recipientArr.push({
      recipient: new mongoose.Types.ObjectId(recipient),
      sender: new mongoose.Types.ObjectId(sender),
    });
    senderArr.push({
      recipient: new mongoose.Types.ObjectId(sender),
      sender: new mongoose.Types.ObjectId(recipient),
    });

    match.$or = [{ $and: recipientArr }, { $and: senderArr }];
    readmsg = false;

    if (
      RegExp(
        "https?://(?:www.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|www.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|https?://(?:www.|(?!www))[a-zA-Z0-9]+.[^s]{2,}|www.[a-zA-Z0-9]+.[^s]{2,}"
      ).test(message)
    ) {
      isLink = true;
    }

    const data = {
      message: message,
      isLink: isLink,
      edited: true,
      taggedUserId: taggedUserId ? taggedUserId : [],
    };
    const updateEntry = await chat.findOneAndUpdate(
      { _id: ObjectId(messageId) },
      data,
      {
        new: true,
      }
    );
    return updateEntry;
  } catch (error) {
    console.log(error, "something went wrong!");
  }
};

/** send message **/
exports.sendmessage = async (
  msg,
  recipient,
  sender,
  type,
  media,
  date,
  time
) => {
  try {
    if (
      (msg.length > 0 || media.length > 0) &&
      sender.length > 0 &&
      recipient.length > 0 &&
      type.length > 0 &&
      date &&
      time
    ) {
      var group_member = [];
      if (type === "user") {
        group_member = [
          { id: sender, readmsg: true },
          { id: recipient, readmsg: false },
        ];
      } else {
        var members = await GroupMember.find({
          groupId: recipient,
          status: 2,
        });
        for (var i = 0; i < members.length; i++) {
          if (members[i].userId._id.toString() === sender) {
            group_member.push({
              id: members[i].userId._id,
              readmsg: true,
            });
          } else {
            group_member.push({
              id: members[i].userId._id,
              readmsg: false,
            });
          }
        }
      }

      const savemsg = new chat({
        message: msg,
        recipient,
        sender,
        type,
        media,
        group_member,
      });

      const result = await savemsg.save();
      if (result) {
        return result;
      } else console.log({ status: false, message: "Message not sent!" });
    } else
      console.log({ status: false, message: "please add some content !!" });
  } catch (error) {
    console.log({ status: false, message: error.message });
  }
};

// get messages
exports.getmessage = async (req, res) => {
  try {
    const { userid, type } = req.params;
    var getmsg = [];
    if (type !== "group") {
      getmsg = await chat.find({
        $or: [
          { $and: [{ recipient: req.authUserId }, { sender: userid }] },
          { $and: [{ sender: req.authUserId }, { recipient: userid }] },
        ],
      });
    } else {
      getmsg = await chat.find({ recipient: userid });
    }
    if (!getmsg)
      return res
        .status(200)
        .json({ status: false, message: "message not found !!" });
    else
      return res
        .status(200)
        .json({ status: true, message: "all messages !!", data: getmsg });
  } catch (error) {
    res.status(200).json({ status: false, message: error.message });
  }
};

// get group member from group Id socket event
exports.getallgroupmember = async (groupid) => {
  try {
    const groupData = await Group.findById(groupid);
    if (!groupData) return { status: false, message: "Group not Found." };
    const memberList = await GroupMember.find({ groupId: groupid, status: 2 });
    if (memberList)
      return { status: true, message: "Group members.", data: memberList };
    else
      return {
        status: true,
        message: "This group don't have any members.",
        data: [],
      };
  } catch (error) {
    return { status: false, message: error.message, data: [] };
  }
};

// get chat listing API
exports.get_chat_listingData = async (req, res) => {
  try {
    let id = req.authUserId;
    let blockUser = await User.findOne(
      { _id: new mongoose.Types.ObjectId(req.authUserId) },
      { blocked_chat: 1 }
    );

    let startUser = await User.findOne(
      { _id: new mongoose.Types.ObjectId(req.authUserId) },
      { star_chat: 1 }
    );
    var clearUser = [];
    var clearDate = "";

    const clearUserData = await User.findOne(
      { _id: req.authUserId },
      { "clear_chat_data.id": 1 }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUserData?.clear_chat_data?.forEach((ids) => {
        let userId = ids.id.toString();
        clearUser.push(ids.id);
      });
    }

    const lastmessageData = await chat.aggregate([
      {
        $unwind: "$group_member",
      },
      {
        $match: {
          "group_member.id": new mongoose.Types.ObjectId(id),
          recipient: { $nin: blockUser.blocked_chat },
          sender: { $nin: blockUser.blocked_chat },
        },
      },
      {
        $addFields: {
          newRecipient: {
            $cond: {
              if: { $eq: ["$recipient", new mongoose.Types.ObjectId(id)] },
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
            $sum: { $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0] },
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
        $lookup: {
          from: "groups",
          localField: "_id.recipient",
          foreignField: "_id",
          as: "groupdata",
        },
      },
      {
        $unwind: {
          path: "$groupdata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "messageinfo.newRecipient",
          foreignField: "_id",
          as: "userdata",
        },
      },
      {
        $unwind: {
          path: "$userdata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "adminusers",
          localField: "messageinfo.newRecipient",
          foreignField: "_id",
          as: "admindata",
        },
      },
      {
        $unwind: {
          path: "$admindata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          datainfo: {
            $cond: [
              {
                $eq: [{ $type: "$groupdata" }, "object"],
              },
              {
                id: "$groupdata._id",
                firstname: "$groupdata.groupTitle",
                image: "$groupdata.groupImage",
                type: "group",
              },
              {
                $cond: [
                  {
                    $eq: [{ $type: "$userdata" }, "object"],
                  },
                  {
                    id: "$userdata._id",
                    firstname: {
                      $concat: [
                        `$userdata.otherdetail.${process.env.USER_FN_ID}`,
                        " ",
                        `$userdata.otherdetail.${process.env.USER_LN_ID}`,
                      ],
                    },
                    image: "$userdata.profileImg",
                    type: "user",
                    // star_chat: "$userdata.star_chat",
                  },
                  {
                    $cond: [
                      {
                        $eq: [{ $type: "$admindata" }, "object"],
                      },
                      {
                        id: "$admindata._id",
                        firstname: {
                          $concat: [
                            `$admindata.first_name`,
                            " ",
                            `$admindata.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      "undefined",
                    ],
                  },
                ],
              },
            ],
          },
          userdata: "$$REMOVE",
          creeddata: "$$REMOVE",
        },
      },
      // { $sort: { "messageinfo.createdAt": -1 } },
      {
        $project: {
          _id: 0,
          id: "$messageinfo.newRecipient",
          firstname: "$datainfo.firstname",
          unreadMsg: 1,
          image: "$datainfo.image",
          message: "$messageinfo.message",
          type: "$messageinfo.type",
          time: "$messageinfo.time",
          image_video: "$messageinfo.image_video",
          otherfiles: "$messageinfo.otherfiles",
          // star_chat: "$datainfo",
          group_member: "$messageinfo.group_member",
          createdAt: "$messageinfo.createdAt",
          userTimeStamp: "$messageinfo.userTimeStamp",
        },
      },
    ]);

    return res.status(200).json({ data: lastmessageData });
  } catch (error) {
    console.log("testdev", error);
  }
};

// get chat listing socket event
exports.get_chat_listing = async (sender) => {
  try {
    let id = sender;
    const user_data = await User.findById(new mongoose.Types.ObjectId(sender));
    var favarray = [];
    if (user_data && user_data.star_chat) favarray = user_data.star_chat;

    const lastmessageData = await chat.aggregate([
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
          "group_member.id": new mongoose.Types.ObjectId(id),
        },
      },
      {
        $addFields: {
          newRecipient: {
            $cond: {
              if: { $eq: ["$recipient", new mongoose.Types.ObjectId(id)] },
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
            $sum: { $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0] },
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
        $lookup: {
          from: "userchatgroups",
          localField: "_id.recipient",
          foreignField: "_id",
          as: "userchatgroupdata",
        },
      },
      {
        $unwind: {
          path: "$userchatgroupdata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "chatchannels",
          localField: "_id.recipient",
          foreignField: "_id",
          as: "chatchanneldata",
        },
      },
      {
        $unwind: {
          path: "$chatchanneldata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "_id.recipient",
          foreignField: "_id",
          as: "groupdata",
        },
      },
      {
        $unwind: {
          path: "$groupdata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "messageinfo.newRecipient",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "userdata",
        },
      },
      {
        $unwind: {
          path: "$userdata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "adminusers",
          localField: "messageinfo.newRecipient",
          foreignField: "_id",
          as: "admindata",
        },
      },
      {
        $unwind: {
          path: "$admindata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          datainfo: {
            $cond: [
              {
                $eq: [{ $type: "$groupdata" }, "object"],
              },
              {
                id: "$groupdata._id",
                firstname: "$groupdata.groupTitle",
                image: "$groupdata.groupImage",
                type: "group",
              },
              {
                $cond: [
                  {
                    $eq: [{ $type: "$userchatgroupdata" }, "object"],
                  },
                  {
                    id: "$userchatgroupdata._id",
                    firstname: "$userchatgroupdata.groupTitle",
                    image: "$userchatgroupdata.groupImage",
                    type: "userchatgroup",
                  },
                  {
                    $cond: [
                      {
                        $eq: [{ $type: "$chatchanneldata" }, "object"],
                      },
                      {
                        id: "$chatchanneldata._id",
                        firstname: "$chatchanneldata.channelName",
                        image: "$chatchanneldata.channelIcon",
                        type: "chatChannel",
                      },
                      {
                        $cond: [
                          {
                            $eq: [{ $type: "$userdata" }, "object"],
                          },
                          {
                            id: "$userdata._id",
                            firstname: {
                              $cond: [
                                {
                                  $and: [
                                    { $ne: ["$userdata.auth0Id", ""] },
                                    { $ne: ["$userdata.auth0Id", null] },
                                  ],
                                },
                                {
                                  $concat: [
                                    `$userdata.otherdetail.${process.env.USER_FN_ID}`,
                                    " ",
                                    `$userdata.otherdetail.${process.env.USER_LN_ID}`,
                                  ],
                                },
                                {
                                  $cond: [
                                    {
                                      $eq: [
                                        { $type: `$userdata.attendeeDetail` },
                                        "object",
                                      ],
                                    },
                                    `$userdata.attendeeDetail.name`,
                                    "",
                                  ],
                                },
                              ],
                            },
                            image: "$userdata.profileImg",
                            type: "user",
                          },
                          {
                            $cond: [
                              {
                                $eq: [{ $type: "$admindata" }, "object"],
                              },
                              {
                                id: "$admindata._id",
                                firstname: {
                                  $concat: [
                                    `$admindata.first_name`,
                                    " ",
                                    `$admindata.last_name`,
                                  ],
                                },
                                type: "admin",
                              },
                              "undefined",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          userdata: "$$REMOVE",
          userchatgroupdata: "$$REMOVE",
          groupdata: "$$REMOVE",
          admindata: "$$REMOVE",
        },
      },
      {
        $lookup: {
          from: "chat_users",
          localField: "messageinfo.newRecipient",
          foreignField: "userid",
          pipeline: [{ $match: { online: true } }],
          as: "useronline",
        },
      },
      {
        $lookup: {
          from: "groupmembers",
          localField: "messageinfo.newRecipient",
          foreignField: "groupId",
          pipeline: [{ $match: { status: 2 } }],
          as: "allmembers",
        },
      },
      {
        $lookup: {
          from: "userchatgroupmembers",
          localField: "messageinfo.newRecipient",
          foreignField: "groupId",
          pipeline: [{ $match: { status: 2 } }],
          as: "allusermembers",
        },
      },
      {
        $lookup: {
          from: "chat_users",
          localField: "allmembers.userId",
          foreignField: "userid",
          pipeline: [{ $match: { online: true } }],
          as: "useronline_group",
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "messageinfo.group_member_field.id",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, otherdetail: 1, profileImg: 1 } }],
          as: "messageinfo.group_member_field",
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "messageinfo.taggedUserId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                email: 1,
                otherdetail: 1,
                profileImg: 1,
                thumb_profileImg: 1,
                auth0Id: 1,
                attendeeDetail: {
                  name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                  photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                },
              },
            },
          ],
          as: "messageinfo.taggedUserId",
        },
      },
      {
        $project: {
          _id: 0,
          id: "$messageinfo.newRecipient",
          firstname: "$datainfo.firstname",
          unreadMsg: 1,
          image: "$datainfo.image",
          message: "$messageinfo.message",
          type: "$messageinfo.type",
          time: "$messageinfo.time",
          date: "$messageinfo.date",
          image_video: "$messageinfo.media",
          otherfiles: "$messageinfo.otherfiles",
          createdAt: "$messageinfo.createdAt",
          userTimeStamp: "$messageinfo.userTimeStamp",
          group_member: "$messageinfo.group_member_field",
          taggedUserId: "$messageinfo.taggedUserId",
          isMention: {
            $cond: {
              if: {
                $and: [
                  { $gt: ["$unreadMsg", 0] },
                  {
                    $regexMatch: {
                      input: "$messageinfo.message",
                      regex: id,
                      options: "i",
                    },
                  },
                ],
              },
              then: true,
              else: false,
            },
          },
          useronline: {
            $cond: [{ $gt: [{ $size: "$useronline" }, 0] }, true, false],
          },
          number_of_user_online: { $size: "$useronline_group" },
        },
      },
    ]);

    var arr = [];
    if (user_data) {
      for (let index = 0; index < lastmessageData.length; index++) {
        var info = user_data.clear_chat_data.filter((data) => {
          if (
            data &&
            lastmessageData[index] &&
            data.id &&
            lastmessageData[index].id &&
            data.id.toString() === lastmessageData[index].id.toString()
          )
            return data;
        });
        if (user_data.muteNotification) {
          user_data.muteNotification.map(async (data) => {
            if (
              lastmessageData[index] &&
              data &&
              lastmessageData[index].id !== null &&
              data.chatId !== null
            ) {
              if (
                data.chatId &&
                lastmessageData[index] &&
                data.chatId.toString() ===
                  lastmessageData[index].id.toString() &&
                data.mute === true
              ) {
                lastmessageData[index].muteChat = true;
              }
            }
          });
        }
        if (
          !(
            user_data.deleted_group_of_user &&
            user_data.deleted_group_of_user.includes(lastmessageData[index].id)
          )
        ) {
          if (lastmessageData[index] && lastmessageData[index].firstname) {
            if (info && info.length > 0) {
              if (
                new Date(info[0].date) <
                new Date(lastmessageData[index].createdAt)
              ) {
                arr.push(lastmessageData[index]);
              } else if (info[0].deleteConversation === false) {
                arr.push({
                  ...lastmessageData[index],
                  message: "",
                  time: "",
                  image_video: [],
                  otherfiles: [],
                  date: "",
                  createdAt: "",
                });
              }
            } else {
              arr.push(lastmessageData[index]);
            }
          }
        }
      }
    }

    if (arr) {
      return arr;
    } else {
      return [];
    }
  } catch (error) {
    console.log("testdev", error);
  }
};

// get chat detail messages API
exports.getChatDetail = async (req, res) => {
  try {
    const userid = req.authUserId;
    const { id, type } = req.params;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    var clearUser = [];
    var clearDate = "";
    if (ObjectId.isValid(id)) {
      const clearUserData = await User.findOne(
        {
          _id: userid,
          clear_chat_data: { $elemMatch: { id: new ObjectId(id) } },
        },
        { clear_chat_data: { $elemMatch: { id: new ObjectId(id) } } }
      );

      if (clearUserData !== undefined && clearUserData !== null) {
        clearUser = clearUserData.clear_chat_data[0];
        clearDate = clearUser.date;
      }

      if (type.toLowerCase() === "group") {
        if (clearUser.length !== 0 && clearUser.id.toString() === id) {
          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: clearDate },
                },
              },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_user",
                },
              },
              {
                $unwind: {
                  path: "$sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "groups",
                  localField: "recipient",
                  foreignField: "_id",
                  as: "recipient_data",
                },
              },
              {
                $unwind: {
                  path: "$recipient_data",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  sender: {
                    $cond: [
                      {
                        $eq: [{ $type: "$sender_admin" }, "object"],
                      },
                      {
                        id: "$sender_admin._id",
                        firstname: {
                          $concat: [
                            `$sender_admin.first_name`,
                            " ",
                            `$sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$sender_user" }, "object"] },
                          {
                            id: "$sender_user._id",
                            firstname: {
                              $concat: [
                                `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  recipient: {
                    $cond: [
                      {
                        $eq: [{ $type: "$recipient_data" }, "object"],
                      },
                      {
                        id: "$recipient_data._id",
                        firstname: "$recipient_data.groupTitle",
                        image: "$recipient_data.groupImage",
                        type: "group",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $unset: ["recipient_data", "sender_user", "sender_admin"],
              },
              {
                $lookup: {
                  from: "chats",
                  localField: "quote_message_id",
                  foreignField: "_id",
                  as: "quote_message_id",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_user",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "groups",
                  localField: "quote_message_id.recipient",
                  foreignField: "_id",
                  as: "quote_recipient_data",
                },
              },
              {
                $unwind: {
                  path: "$quote_recipient_data",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  "quote_message_id.sender": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_sender_admin" }, "object"],
                      },
                      {
                        id: "$quote_sender_admin._id",
                        firstname: {
                          $concat: [
                            `$quote_sender_admin.first_name`,
                            " ",
                            `$quote_sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                          {
                            id: "$quote_sender_user._id",
                            firstname: {
                              $concat: [
                                `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$quote_sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.recipient": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_recipient_data" }, "object"],
                      },
                      {
                        id: "$quote_recipient_data._id",
                        firstname: "$quote_recipient_data.groupTitle",
                        image: "$quote_recipient_data.groupImage",
                        type: "group",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $unset: [
                  "quote_recipient_data",
                  "quote_sender_user",
                  "quote_sender_admin",
                  "quote_message_id.quote_message_id",
                ],
              },
              {
                $unwind: {
                  path: "$quote_message_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: {
                    date: "$date",
                  },
                  list: { $push: "$$ROOT" },
                },
              },
              { $sort: { "list.createdAt": 1 } },
            ])
          );

          const count = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: clearDate },
                },
              },
            ])
          );

          if (data.length !== 0 && count.length !== 0) {
            return res.status(200).json({
              status: true,
              message: `messages retrive successfully.`,
              data: [
                {
                  Messages: data,
                  totalPages: Math.ceil(count.length / limit),
                  currentPage: req.query.page,
                  totalMessages: count.length,
                },
              ],
            });
          } else {
            return res.status(200).json({
              status: false,
              message: `messages not found.`,
              data: [
                {
                  Messages: [],
                  totalPages: Math.ceil(0 / limit),
                  currentPage: req.query.page,
                  totalMessages: 0,
                },
              ],
            });
          }
        } else {
          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                },
              },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_user",
                },
              },
              {
                $unwind: {
                  path: "$sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "groups",
                  localField: "recipient",
                  foreignField: "_id",
                  as: "recipient_data",
                },
              },
              {
                $unwind: {
                  path: "$recipient_data",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  sender: {
                    $cond: [
                      {
                        $eq: [{ $type: "$sender_admin" }, "object"],
                      },
                      {
                        id: "$sender_admin._id",
                        firstname: {
                          $concat: [
                            `$sender_admin.first_name`,
                            " ",
                            `$sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$sender_user" }, "object"] },
                          {
                            id: "$sender_user._id",
                            firstname: {
                              $concat: [
                                `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  recipient: {
                    $cond: [
                      {
                        $eq: [{ $type: "$recipient_data" }, "object"],
                      },
                      {
                        id: "$recipient_data._id",
                        firstname: "$recipient_data.groupTitle",
                        image: "$recipient_data.groupImage",
                        type: "group",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $unset: ["recipient_data", "sender_user", "sender_admin"],
              },
              {
                $lookup: {
                  from: "chats",
                  localField: "quote_message_id",
                  foreignField: "_id",
                  as: "quote_message_id",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_user",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "groups",
                  localField: "quote_message_id.recipient",
                  foreignField: "_id",
                  as: "quote_recipient_data",
                },
              },
              {
                $unwind: {
                  path: "$quote_recipient_data",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  "quote_message_id.sender": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_sender_admin" }, "object"],
                      },
                      {
                        id: "$quote_sender_admin._id",
                        firstname: {
                          $concat: [
                            `$quote_sender_admin.first_name`,
                            " ",
                            `$quote_sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                          {
                            id: "$quote_sender_user._id",
                            firstname: {
                              $concat: [
                                `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$quote_sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.recipient": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_recipient_data" }, "object"],
                      },
                      {
                        id: "$quote_recipient_data._id",
                        firstname: "$quote_recipient_data.groupTitle",
                        image: "$quote_recipient_data.groupImage",
                        type: "group",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $unset: [
                  "quote_recipient_data",
                  "quote_sender_user",
                  "quote_sender_admin",
                  "quote_message_id.quote_message_id",
                ],
              },
              {
                $unwind: {
                  path: "$quote_message_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: {
                    date: "$date",
                  },
                  list: { $push: "$$ROOT" },
                },
              },
              { $sort: { "list.createdAt": 1 } },
            ])
          );

          const count = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                },
              },
            ])
          );

          if (data.length !== 0 && count.length !== 0) {
            return res.status(200).json({
              status: true,
              message: `messages retrive successfully.`,
              data: [
                {
                  Messages: data,
                  totalPages: Math.ceil(count.length / limit),
                  currentPage: req.query.page,
                  totalMessages: count.length,
                },
              ],
            });
          } else {
            return res.status(200).json({
              status: false,
              message: `messages not found.`,
              data: [
                {
                  Messages: [],
                  totalPages: Math.ceil(0 / limit),
                  currentPage: req.query.page,
                  totalMessages: 0,
                },
              ],
            });
          }
        }
      } else if (type.toLowerCase() === "userchatgroup") {
        if (clearUser.length !== 0 && clearUser.id.toString() === id) {
          let chatClearDate = "";
          const joined_date = await userChatGroupMember.findOne({
            groupId: new mongoose.Types.ObjectId(id),
            userId: userid,
            status: 2,
          });

          if (joined_date.createdAt > clearDate) {
            chatClearDate = joined_date.createdAt;
          } else {
            chatClearDate = clearDate;
          }

          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: chatClearDate },
                },
              },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "taggedUserId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        email: 1,
                        otherdetail: 1,
                        profileImg: 1,
                        thumb_profileImg: 1,
                        auth0Id: 1,
                        attendeeDetail: {
                          name: "$attendeeDetail.name"
                            ? "$attendeeDetail.name"
                            : "",
                          photo: "$attendeeDetail.photo"
                            ? "$attendeeDetail.photo"
                            : "",
                        },
                      },
                    },
                  ],
                  as: "taggedUserId",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_user",
                },
              },
              {
                $unwind: {
                  path: "$sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "userchatgroups",
                  localField: "recipient",
                  foreignField: "_id",
                  as: "recipient_data",
                },
              },
              {
                $unwind: {
                  path: "$recipient_data",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  sender: {
                    $cond: [
                      {
                        $eq: [{ $type: "$sender_admin" }, "object"],
                      },
                      {
                        id: "$sender_admin._id",
                        firstname: {
                          $concat: [
                            `$sender_admin.first_name`,
                            " ",
                            `$sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$sender_user" }, "object"] },
                          {
                            id: "$sender_user._id",
                            firstname: {
                              $concat: [
                                `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  recipient: {
                    $cond: [
                      {
                        $eq: [{ $type: "$recipient_data" }, "object"],
                      },
                      {
                        id: "$recipient_data._id",
                        firstname: "$recipient_data.groupTitle",
                        image: "$recipient_data.groupImage",
                        type: "group",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $unset: ["recipient_data", "sender_user", "sender_admin"],
              },
              {
                $lookup: {
                  from: "chats",
                  localField: "quote_message_id",
                  foreignField: "_id",
                  as: "quote_message_id",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.taggedUserId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        email: 1,
                        otherdetail: 1,
                        profileImg: 1,
                        thumb_profileImg: 1,
                        auth0Id: 1,
                        attendeeDetail: {
                          name: "$attendeeDetail.name"
                            ? "$attendeeDetail.name"
                            : "",
                          photo: "$attendeeDetail.photo"
                            ? "$attendeeDetail.photo"
                            : "",
                        },
                      },
                    },
                  ],
                  as: "quoteTaggedUserId",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_user",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "groups",
                  localField: "quote_message_id.recipient",
                  foreignField: "_id",
                  as: "quote_recipient_data",
                },
              },
              {
                $unwind: {
                  path: "$quote_recipient_data",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  "quote_message_id.sender": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_sender_admin" }, "object"],
                      },
                      {
                        id: "$quote_sender_admin._id",
                        firstname: {
                          $concat: [
                            `$quote_sender_admin.first_name`,
                            " ",
                            `$quote_sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                          {
                            id: "$quote_sender_user._id",
                            firstname: {
                              $concat: [
                                `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$quote_sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.recipient": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_recipient_data" }, "object"],
                      },
                      {
                        id: "$quote_recipient_data._id",
                        firstname: "$quote_recipient_data.groupTitle",
                        image: "$quote_recipient_data.groupImage",
                        type: "group",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.taggedUserId": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                      },
                      "$quoteTaggedUserId",
                      [],
                    ],
                  },
                },
              },
              {
                $unset: [
                  "quote_recipient_data",
                  "quote_sender_user",
                  "quote_sender_admin",
                  "quoteTaggedUserId",
                  "quote_message_id.quote_message_id",
                ],
              },
              {
                $unwind: {
                  path: "$quote_message_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "activity.adminId",
                  foreignField: "_id",
                  as: "activity_adminId",
                },
              },
              {
                $unwind: {
                  path: "$activity_adminId",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  let: { userIds: "$activity.userId" },
                  pipeline: [
                    {
                      $match: {
                        $and: [
                          {
                            $expr: { $eq: [{ $type: "$$userIds" }, "array"] },
                          },
                          {
                            $expr: {
                              $in: ["$_id", "$$userIds"],
                            },
                          },
                        ],
                      },
                    },
                  ],
                  as: "activity_userId",
                },
              },
              {
                $set: {
                  "activity.adminId": {
                    $cond: [
                      { $eq: [{ $type: "$activity_adminId" }, "object"] },
                      {
                        id: "$activity_adminId._id",
                        firstname: {
                          $concat: [
                            `$activity_adminId.otherdetail.${process.env.USER_FN_ID}`,
                            " ",
                            `$activity_adminId.otherdetail.${process.env.USER_LN_ID}`,
                          ],
                        },
                        image: "$activity_adminId.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $set: {
                  "activity.userId": {
                    $map: {
                      input: "$activity_userId",
                      as: "activityuser",
                      in: {
                        $cond: [
                          { $eq: [{ $type: "$$activityuser" }, "object"] },
                          {
                            id: "$$activityuser._id",
                            firstname: {
                              $concat: [
                                `$$activityuser.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$$activityuser.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$$activityuser.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    },
                  },
                },
              },
              {
                $unset: ["activity_userId", "activity_adminId"],
              },
              {
                $group: {
                  _id: {
                    date: "$date",
                  },
                  list: { $push: "$$ROOT" },
                },
              },
              { $sort: { "list.createdAt": 1 } },
            ])
          );

          const count = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: chatClearDate },
                },
              },
            ])
          );

          if (data.length !== 0 && count.length !== 0) {
            return res.status(200).json({
              status: true,
              message: `messages retrive successfully.`,
              data: [
                {
                  Messages: data,
                  totalPages: Math.ceil(count.length / limit),
                  currentPage: req.query.page,
                  totalMessages: count.length,
                },
              ],
            });
          } else {
            return res.status(200).json({
              status: false,
              message: `messages not found.`,
              data: [
                {
                  Messages: [],
                  totalPages: Math.ceil(0 / limit),
                  currentPage: req.query.page,
                  totalMessages: 0,
                },
              ],
            });
          }
        } else {
          const joined_date = await userChatGroupMember.findOne({
            groupId: new mongoose.Types.ObjectId(id),
            userId: userid,
            status: 2,
          });

          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: joined_date.createdAt },
                },
              },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "taggedUserId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        email: 1,
                        otherdetail: 1,
                        profileImg: 1,
                        thumb_profileImg: 1,
                        auth0Id: 1,
                        attendeeDetail: {
                          name: "$attendeeDetail.name"
                            ? "$attendeeDetail.name"
                            : "",
                          photo: "$attendeeDetail.photo"
                            ? "$attendeeDetail.photo"
                            : "",
                        },
                      },
                    },
                  ],
                  as: "taggedUserId",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_user",
                },
              },
              {
                $unwind: {
                  path: "$sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "userchatgroups",
                  localField: "recipient",
                  foreignField: "_id",
                  as: "recipient_data",
                },
              },
              {
                $unwind: {
                  path: "$recipient_data",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  sender: {
                    $cond: [
                      {
                        $eq: [{ $type: "$sender_admin" }, "object"],
                      },
                      {
                        id: "$sender_admin._id",
                        firstname: {
                          $concat: [
                            `$sender_admin.first_name`,
                            " ",
                            `$sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$sender_user" }, "object"] },
                          {
                            id: "$sender_user._id",
                            firstname: {
                              $concat: [
                                `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  recipient: {
                    $cond: [
                      {
                        $eq: [{ $type: "$recipient_data" }, "object"],
                      },
                      {
                        id: "$recipient_data._id",
                        firstname: "$recipient_data.groupTitle",
                        image: "$recipient_data.groupImage",
                        type: "group",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $unset: ["recipient_data", "sender_user", "sender_admin"],
              },
              {
                $lookup: {
                  from: "chats",
                  localField: "quote_message_id",
                  foreignField: "_id",
                  as: "quote_message_id",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.taggedUserId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        email: 1,
                        otherdetail: 1,
                        profileImg: 1,
                        thumb_profileImg: 1,
                        auth0Id: 1,
                        attendeeDetail: {
                          name: "$attendeeDetail.name"
                            ? "$attendeeDetail.name"
                            : "",
                          photo: "$attendeeDetail.photo"
                            ? "$attendeeDetail.photo"
                            : "",
                        },
                      },
                    },
                  ],
                  as: "quoteTaggedUserId",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_user",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "groups",
                  localField: "quote_message_id.recipient",
                  foreignField: "_id",
                  as: "quote_recipient_data",
                },
              },
              {
                $unwind: {
                  path: "$quote_recipient_data",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  "quote_message_id.sender": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_sender_admin" }, "object"],
                      },
                      {
                        id: "$quote_sender_admin._id",
                        firstname: {
                          $concat: [
                            `$quote_sender_admin.first_name`,
                            " ",
                            `$quote_sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                          {
                            id: "$quote_sender_user._id",
                            firstname: {
                              $concat: [
                                `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$quote_sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.recipient": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_recipient_data" }, "object"],
                      },
                      {
                        id: "$quote_recipient_data._id",
                        firstname: "$quote_recipient_data.groupTitle",
                        image: "$quote_recipient_data.groupImage",
                        type: "group",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.taggedUserId": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                      },
                      "$quoteTaggedUserId",
                      [],
                    ],
                  },
                },
              },
              {
                $unset: [
                  "quote_recipient_data",
                  "quote_sender_user",
                  "quote_sender_admin",
                  "quoteTaggedUserId",
                  "quote_message_id.quote_message_id",
                ],
              },
              {
                $unwind: {
                  path: "$quote_message_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "activity.adminId",
                  foreignField: "_id",
                  as: "activity_adminId",
                },
              },
              {
                $unwind: {
                  path: "$activity_adminId",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  let: { userIds: "$activity.userId" },
                  pipeline: [
                    {
                      $match: {
                        $and: [
                          {
                            $expr: { $eq: [{ $type: "$$userIds" }, "array"] },
                          },
                          {
                            $expr: {
                              $in: ["$_id", "$$userIds"],
                            },
                          },
                        ],
                      },
                    },
                  ],
                  as: "activity_userId",
                },
              },
              {
                $set: {
                  "activity.adminId": {
                    $cond: [
                      { $eq: [{ $type: "$activity_adminId" }, "object"] },
                      {
                        id: "$activity_adminId._id",
                        firstname: {
                          $concat: [
                            `$activity_adminId.otherdetail.${process.env.USER_FN_ID}`,
                            " ",
                            `$activity_adminId.otherdetail.${process.env.USER_LN_ID}`,
                          ],
                        },
                        image: "$activity_adminId.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                },
              },
              {
                $set: {
                  "activity.userId": {
                    $map: {
                      input: "$activity_userId",
                      as: "activityuser",
                      in: {
                        $cond: [
                          { $eq: [{ $type: "$$activityuser" }, "object"] },
                          {
                            id: "$$activityuser._id",
                            firstname: {
                              $concat: [
                                `$$activityuser.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$$activityuser.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$$activityuser.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    },
                  },
                },
              },
              {
                $unset: ["activity_adminId", "activity_userId"],
              },
              {
                $group: {
                  _id: {
                    date: "$date",
                  },
                  list: { $push: "$$ROOT" },
                },
              },
              { $sort: { "list.createdAt": 1 } },
            ])
          );

          const count = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                },
              },
            ])
          );

          if (data.length !== 0 && count.length !== 0) {
            return res.status(200).json({
              status: true,
              message: `messages retrive successfully.`,
              data: [
                {
                  Messages: data,
                  totalPages: Math.ceil(count.length / limit),
                  currentPage: req.query.page,
                  totalMessages: count.length,
                },
              ],
            });
          } else {
            return res.status(200).json({
              status: false,
              message: `messages not found.`,
              data: [
                {
                  Messages: [],
                  totalPages: Math.ceil(0 / limit),
                  currentPage: req.query.page,
                  totalMessages: 0,
                },
              ],
            });
          }
        }
      } else {
        if (clearUser.length !== 0 && clearUser.id.toString() === id) {
          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  $and: [
                    {
                      $or: [
                        { sender: new mongoose.Types.ObjectId(id) },
                        { recipient: new mongoose.Types.ObjectId(id) },
                      ],
                    },
                    { $or: [{ sender: userid }, { recipient: userid }] },
                  ],
                  isActive: true,
                  createdAt: { $gt: clearDate },
                },
              },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "taggedUserId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        email: 1,
                        otherdetail: 1,
                        profileImg: 1,
                        thumb_profileImg: 1,
                        auth0Id: 1,
                        attendeeDetail: {
                          name: "$attendeeDetail.name"
                            ? "$attendeeDetail.name"
                            : "",
                          photo: "$attendeeDetail.photo"
                            ? "$attendeeDetail.photo"
                            : "",
                        },
                      },
                    },
                  ],
                  as: "taggedUserId",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_user",
                },
              },
              {
                $unwind: {
                  path: "$sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "recipient",
                  foreignField: "_id",
                  as: "recipient_user",
                },
              },
              {
                $unwind: {
                  path: "$recipient_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "recipient",
                  foreignField: "_id",
                  as: "recipient_admin",
                },
              },
              {
                $unwind: {
                  path: "$recipient_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  sender: {
                    $cond: [
                      {
                        $eq: [{ $type: "$sender_admin" }, "object"],
                      },
                      {
                        id: "$sender_admin._id",
                        firstname: {
                          $concat: [
                            `$sender_admin.first_name`,
                            " ",
                            `$sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$sender_user" }, "object"] },
                          {
                            id: "$sender_user._id",
                            firstname: {
                              $concat: [
                                `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  recipient: {
                    $cond: [
                      {
                        $eq: [{ $type: "$recipient_admin" }, "object"],
                      },
                      {
                        id: "$recipient_admin._id",
                        firstname: {
                          $concat: [
                            `$recipient_admin.first_name`,
                            " ",
                            `$recipient_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$recipient_user" }, "object"] },
                          {
                            id: "$recipient_user._id",
                            firstname: {
                              $concat: [
                                `$recipient_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$recipient_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$recipient_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $unset: [
                  "recipient_user",
                  "recipient_admin",
                  "sender_user",
                  "sender_admin",
                ],
              },
              {
                $lookup: {
                  from: "chats",
                  localField: "quote_message_id",
                  foreignField: "_id",
                  as: "quote_message_id",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.taggedUserId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        email: 1,
                        otherdetail: 1,
                        profileImg: 1,
                        thumb_profileImg: 1,
                        auth0Id: 1,
                        attendeeDetail: {
                          name: "$attendeeDetail.name"
                            ? "$attendeeDetail.name"
                            : "",
                          photo: "$attendeeDetail.photo"
                            ? "$attendeeDetail.photo"
                            : "",
                        },
                      },
                    },
                  ],
                  as: "quoteTaggedUserId",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_user",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.recipient",
                  foreignField: "_id",
                  as: "quote_recipient_user",
                },
              },
              {
                $unwind: {
                  path: "$quote_recipient_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "quote_message_id.recipient",
                  foreignField: "_id",
                  as: "quoote_recipient_admin",
                },
              },
              {
                $unwind: {
                  path: "$quote_recipient_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  "quote_message_id.sender": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_sender_admin" }, "object"],
                      },
                      {
                        id: "$quote_sender_admin._id",
                        firstname: {
                          $concat: [
                            `$quote_sender_admin.first_name`,
                            " ",
                            `$quote_sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                          {
                            id: "$quote_sender_user._id",
                            firstname: {
                              $concat: [
                                `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$quote_sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.recipient": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_recipient_admin" }, "object"],
                      },
                      {
                        id: "$quote_recipient_admin._id",
                        firstname: {
                          $concat: [
                            `$quote_recipient_admin.first_name`,
                            " ",
                            `$quote_recipient_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          {
                            $eq: [{ $type: "$quote_recipient_user" }, "object"],
                          },
                          {
                            id: "$quote_recipient_user._id",
                            firstname: {
                              $concat: [
                                `$quote_recipient_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_recipient_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$quote_recipient_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.taggedUserId": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                      },
                      "$quoteTaggedUserId",
                      [],
                    ],
                  },
                },
              },
              {
                $unset: [
                  "quote_recipient_user",
                  "quote_recipient_admin",
                  "quote_sender_user",
                  "quote_sender_admin",
                  "quoteTaggedUserId",
                  "quote_message_id.quote_message_id",
                ],
              },
              {
                $unwind: {
                  path: "$quote_message_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: {
                    date: "$date",
                  },
                  list: { $push: "$$ROOT" },
                },
              },
              { $sort: { "list.createdAt": 1 } },
            ])
          );

          const count = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  $and: [
                    {
                      $or: [
                        { sender: new mongoose.Types.ObjectId(id) },
                        { recipient: new mongoose.Types.ObjectId(id) },
                      ],
                    },
                    { $or: [{ sender: userid }, { recipient: userid }] },
                  ],
                  isActive: true,
                  createdAt: { $gt: clearDate },
                },
              },
            ])
          );

          if (data.length !== 0 && count.length !== 0) {
            return res.status(200).json({
              status: true,
              message: `messages retrive successfully.`,
              data: [
                {
                  Messages: data,
                  totalPages: Math.ceil(count.length / limit),
                  currentPage: req.query.page,
                  totalMessages: count.length,
                },
              ],
            });
          } else {
            return res.status(200).json({
              status: false,
              message: `messages not found.`,
              data: [
                {
                  Messages: [],
                  totalPages: Math.ceil(0 / limit),
                  currentPage: req.query.page,
                  totalMessages: 0,
                },
              ],
            });
          }
        } else {
          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  $and: [
                    {
                      $or: [
                        { sender: new mongoose.Types.ObjectId(id) },
                        { recipient: new mongoose.Types.ObjectId(id) },
                      ],
                    },
                    { $or: [{ sender: userid }, { recipient: userid }] },
                  ],
                  isActive: true,
                },
              },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "taggedUserId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        email: 1,
                        otherdetail: 1,
                        profileImg: 1,
                        thumb_profileImg: 1,
                        auth0Id: 1,
                        attendeeDetail: {
                          name: "$attendeeDetail.name"
                            ? "$attendeeDetail.name"
                            : "",
                          photo: "$attendeeDetail.photo"
                            ? "$attendeeDetail.photo"
                            : "",
                        },
                      },
                    },
                  ],
                  as: "taggedUserId",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_user",
                },
              },
              {
                $unwind: {
                  path: "$sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "recipient",
                  foreignField: "_id",
                  as: "recipient_user",
                },
              },
              {
                $unwind: {
                  path: "$recipient_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "recipient",
                  foreignField: "_id",
                  as: "recipient_admin",
                },
              },
              {
                $unwind: {
                  path: "$recipient_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  sender: {
                    $cond: [
                      {
                        $eq: [{ $type: "$sender_admin" }, "object"],
                      },
                      {
                        id: "$sender_admin._id",
                        firstname: {
                          $concat: [
                            `$sender_admin.first_name`,
                            " ",
                            `$sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$sender_user" }, "object"] },
                          {
                            id: "$sender_user._id",
                            firstname: {
                              $concat: [
                                `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  recipient: {
                    $cond: [
                      {
                        $eq: [{ $type: "$recipient_admin" }, "object"],
                      },
                      {
                        id: "$recipient_admin._id",
                        firstname: {
                          $concat: [
                            `$recipient_admin.first_name`,
                            " ",
                            `$recipient_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$recipient_user" }, "object"] },
                          {
                            id: "$recipient_user._id",
                            firstname: {
                              $concat: [
                                `$recipient_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$recipient_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$recipient_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $unset: [
                  "recipient_user",
                  "recipient_admin",
                  "sender_user",
                  "sender_admin",
                ],
              },
              {
                $lookup: {
                  from: "chats",
                  localField: "quote_message_id",
                  foreignField: "_id",
                  as: "quote_message_id",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.taggedUserId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        email: 1,
                        otherdetail: 1,
                        profileImg: 1,
                        thumb_profileImg: 1,
                        auth0Id: 1,
                        attendeeDetail: {
                          name: "$attendeeDetail.name"
                            ? "$attendeeDetail.name"
                            : "",
                          photo: "$attendeeDetail.photo"
                            ? "$attendeeDetail.photo"
                            : "",
                        },
                      },
                    },
                  ],
                  as: "quoteTaggedUserId",
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_user",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "quote_message_id.sender",
                  foreignField: "_id",
                  as: "quote_sender_admin",
                },
              },
              {
                $unwind: {
                  path: "$quote_sender_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "airtable-syncs",
                  localField: "quote_message_id.recipient",
                  foreignField: "_id",
                  as: "quote_recipient_user",
                },
              },
              {
                $unwind: {
                  path: "$quote_recipient_user",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $lookup: {
                  from: "adminusers",
                  localField: "quote_message_id.recipient",
                  foreignField: "_id",
                  as: "quoote_recipient_admin",
                },
              },
              {
                $unwind: {
                  path: "$quote_recipient_admin",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $set: {
                  "quote_message_id.sender": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_sender_admin" }, "object"],
                      },
                      {
                        id: "$quote_sender_admin._id",
                        firstname: {
                          $concat: [
                            `$quote_sender_admin.first_name`,
                            " ",
                            `$quote_sender_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                          {
                            id: "$quote_sender_user._id",
                            firstname: {
                              $concat: [
                                `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$quote_sender_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.recipient": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quote_recipient_admin" }, "object"],
                      },
                      {
                        id: "$quote_recipient_admin._id",
                        firstname: {
                          $concat: [
                            `$quote_recipient_admin.first_name`,
                            " ",
                            `$quote_recipient_admin.last_name`,
                          ],
                        },
                        type: "admin",
                      },
                      {
                        $cond: [
                          {
                            $eq: [{ $type: "$quote_recipient_user" }, "object"],
                          },
                          {
                            id: "$quote_recipient_user._id",
                            firstname: {
                              $concat: [
                                `$quote_recipient_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_recipient_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            image: "$quote_recipient_user.profileImg",
                            type: "user",
                          },
                          undefined,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $set: {
                  "quote_message_id.taggedUserId": {
                    $cond: [
                      {
                        $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                      },
                      "$quoteTaggedUserId",
                      [],
                    ],
                  },
                },
              },
              {
                $unset: [
                  "quote_recipient_user",
                  "quote_recipient_admin",
                  "quote_sender_user",
                  "quote_sender_admin",
                  "quoteTaggedUserId",
                  "quote_message_id.quote_message_id",
                ],
              },
              {
                $unwind: {
                  path: "$quote_message_id",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: {
                    date: "$date",
                  },
                  list: { $push: "$$ROOT" },
                },
              },
              { $sort: { "list.createdAt": 1 } },
            ])
          );
          const count = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  $and: [
                    {
                      $or: [
                        { sender: new mongoose.Types.ObjectId(id) },
                        { recipient: new mongoose.Types.ObjectId(id) },
                      ],
                    },
                    { $or: [{ sender: userid }, { recipient: userid }] },
                  ],
                  isActive: true,
                },
              },
            ])
          );

          if (data.length !== 0 && count.length !== 0) {
            return res.status(200).json({
              status: true,
              message: `messages retrive successfully.`,
              data: [
                {
                  Messages: data,
                  totalPages: Math.ceil(count.length / limit),
                  currentPage: req.query.page,
                  totalMessages: count.length,
                },
              ],
            });
          } else {
            return res.status(200).json({
              status: false,
              message: `messages not found.`,
              data: [
                {
                  Messages: [],
                  totalPages: Math.ceil(0 / limit),
                  currentPage: req.query.page,
                  totalMessages: 0,
                },
              ],
            });
          }
        }
      }
    } else {
      return res.status(200).json({ status: false, message: "Invalid Id!" });
    }
  } catch (err) {
    console.log(err);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// get chat details from web
exports.getChatDetailWeb = async (req, res) => {
  try {
    const userid = req.authUserId;
    const { id, type } = req.params;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    var clearUser = [];
    var clearDate = "";
    const clearUserData = await User.findOne(
      {
        _id: userid,
        clear_chat_data: { $elemMatch: { id: new ObjectId(id) } },
      },
      { clear_chat_data: { $elemMatch: { id: new ObjectId(id) } } }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (type.toLowerCase() === "group") {
      const aggregatePipeline = [
        { $sort: { userTimeStamp: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "sender",
            foreignField: "_id",
            as: "sender_user",
          },
        },
        {
          $unwind: {
            path: "$sender_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "sender",
            foreignField: "_id",
            as: "sender_admin",
          },
        },
        {
          $unwind: {
            path: "$sender_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "groups",
            localField: "recipient",
            foreignField: "_id",
            as: "recipient_data",
          },
        },
        {
          $unwind: {
            path: "$recipient_data",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            sender: {
              $cond: [
                {
                  $eq: [{ $type: "$sender_admin" }, "object"],
                },
                {
                  id: "$sender_admin._id",
                  firstname: {
                    $concat: [
                      `$sender_admin.first_name`,
                      " ",
                      `$sender_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$sender_user" }, "object"] },
                    {
                      id: "$sender_user._id",
                      firstname: {
                        $concat: [
                          `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                          " ",
                          `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                        ],
                      },
                      image: "$sender_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            recipient: {
              $cond: [
                {
                  $eq: [{ $type: "$recipient_data" }, "object"],
                },
                {
                  id: "$recipient_data._id",
                  firstname: "$recipient_data.groupTitle",
                  image: "$recipient_data.groupImage",
                  type: "group",
                },
                undefined,
              ],
            },
          },
        },
        {
          $unset: ["recipient_data", "sender_user", "sender_admin"],
        },
        {
          $lookup: {
            from: "chats",
            localField: "quote_message_id",
            foreignField: "_id",
            as: "quote_message_id",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "quote_message_id.sender",
            foreignField: "_id",
            as: "quote_sender_user",
          },
        },
        {
          $unwind: {
            path: "$quote_sender_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "quote_message_id.sender",
            foreignField: "_id",
            as: "quote_sender_admin",
          },
        },
        {
          $unwind: {
            path: "$quote_sender_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "groups",
            localField: "quote_message_id.recipient",
            foreignField: "_id",
            as: "quote_recipient_data",
          },
        },
        {
          $unwind: {
            path: "$quote_recipient_data",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            "quote_message_id.sender": {
              $cond: [
                {
                  $eq: [{ $type: "$quote_sender_admin" }, "object"],
                },
                {
                  id: "$quote_sender_admin._id",
                  firstname: {
                    $concat: [
                      `$quote_sender_admin.first_name`,
                      " ",
                      `$quote_sender_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                    {
                      id: "$quote_sender_user._id",
                      firstname: {
                        $concat: [
                          `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                          " ",
                          `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                        ],
                      },
                      image: "$quote_sender_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            "quote_message_id.recipient": {
              $cond: [
                {
                  $eq: [{ $type: "$quote_recipient_data" }, "object"],
                },
                {
                  id: "$quote_recipient_data._id",
                  firstname: "$quote_recipient_data.groupTitle",
                  image: "$quote_recipient_data.groupImage",
                  type: "group",
                },
                undefined,
              ],
            },
          },
        },
        {
          $unset: [
            "quote_recipient_data",
            "quote_sender_user",
            "quote_sender_admin",
            "quote_message_id.quote_message_id",
          ],
        },
        {
          $unwind: {
            path: "$quote_message_id",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              date: "$date",
            },
            list: { $push: "$$ROOT" },
          },
        },
        { $sort: { "list.createdAt": 1 } },
      ];
      if (clearUser.length !== 0 && clearUser.id.toString() === id) {
        const data = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
                createdAt: { $gt: clearDate },
              },
            },
            ...aggregatePipeline,
          ])
        );

        const count = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
                createdAt: { $gt: clearDate },
              },
            },
          ])
        );

        if (data.length !== 0 && count.length !== 0) {
          return res.status(200).json({
            status: true,
            message: `messages retrive successfully.`,
            data: [
              {
                Messages: data,
                totalPages: Math.ceil(count.length / limit),
                currentPage: req.query.page,
                totalMessages: count.length,
              },
            ],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: `messages not found.`,
            data: [
              {
                Messages: [],
                totalPages: Math.ceil(0 / limit),
                currentPage: req.query.page,
                totalMessages: 0,
              },
            ],
          });
        }
      } else {
        const data = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
              },
            },
            ...aggregatePipeline,
          ])
        );

        const count = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
              },
            },
          ])
        );

        if (data.length !== 0 && count.length !== 0) {
          return res.status(200).json({
            status: true,
            message: `messages retrive successfully.`,
            data: [
              {
                Messages: data,
                totalPages: Math.ceil(count.length / limit),
                currentPage: req.query.page,
                totalMessages: count.length,
              },
            ],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: `messages not found.`,
            data: [
              {
                Messages: [],
                totalPages: Math.ceil(0 / limit),
                currentPage: req.query.page,
                totalMessages: 0,
              },
            ],
          });
        }
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      const aggregatePipeline = [
        { $sort: { userTimeStamp: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "taggedUserId",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  email: 1,
                  otherdetail: 1,
                  profileImg: 1,
                  thumb_profileImg: 1,
                  auth0Id: 1,
                  attendeeDetail: {
                    name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                    photo: "$attendeeDetail.photo"
                      ? "$attendeeDetail.photo"
                      : "",
                  },
                },
              },
            ],
            as: "taggedUserId",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "sender",
            foreignField: "_id",
            as: "sender_user",
          },
        },
        {
          $unwind: {
            path: "$sender_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "sender",
            foreignField: "_id",
            as: "sender_admin",
          },
        },
        {
          $unwind: {
            path: "$sender_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "userchatgroups",
            localField: "recipient",
            foreignField: "_id",
            as: "recipient_data",
          },
        },
        {
          $unwind: {
            path: "$recipient_data",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            sender: {
              $cond: [
                {
                  $eq: [{ $type: "$sender_admin" }, "object"],
                },
                {
                  id: "$sender_admin._id",
                  firstname: {
                    $concat: [
                      `$sender_admin.first_name`,
                      " ",
                      `$sender_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$sender_user" }, "object"] },
                    {
                      id: "$sender_user._id",
                      firstname: {
                        $concat: [
                          `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                          " ",
                          `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                        ],
                      },
                      image: "$sender_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            recipient: {
              $cond: [
                {
                  $eq: [{ $type: "$recipient_data" }, "object"],
                },
                {
                  id: "$recipient_data._id",
                  firstname: "$recipient_data.groupTitle",
                  image: "$recipient_data.groupImage",
                  type: "group",
                },
                undefined,
              ],
            },
          },
        },
        {
          $unset: ["recipient_data", "sender_user", "sender_admin"],
        },
        {
          $lookup: {
            from: "chats",
            localField: "quote_message_id",
            foreignField: "_id",
            as: "quote_message_id",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "quote_message_id.taggedUserId",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  email: 1,
                  otherdetail: 1,
                  profileImg: 1,
                  thumb_profileImg: 1,
                  auth0Id: 1,
                  attendeeDetail: {
                    name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                    photo: "$attendeeDetail.photo"
                      ? "$attendeeDetail.photo"
                      : "",
                  },
                },
              },
            ],
            as: "quoteTaggedUserId",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "quote_message_id.sender",
            foreignField: "_id",
            as: "quote_sender_user",
          },
        },
        {
          $unwind: {
            path: "$quote_sender_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "quote_message_id.sender",
            foreignField: "_id",
            as: "quote_sender_admin",
          },
        },
        {
          $unwind: {
            path: "$quote_sender_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "groups",
            localField: "quote_message_id.recipient",
            foreignField: "_id",
            as: "quote_recipient_data",
          },
        },
        {
          $unwind: {
            path: "$quote_recipient_data",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            "quote_message_id.sender": {
              $cond: [
                {
                  $eq: [{ $type: "$quote_sender_admin" }, "object"],
                },
                {
                  id: "$quote_sender_admin._id",
                  firstname: {
                    $concat: [
                      `$quote_sender_admin.first_name`,
                      " ",
                      `$quote_sender_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                    {
                      id: "$quote_sender_user._id",
                      firstname: {
                        $concat: [
                          `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                          " ",
                          `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                        ],
                      },
                      image: "$quote_sender_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            "quote_message_id.recipient": {
              $cond: [
                {
                  $eq: [{ $type: "$quote_recipient_data" }, "object"],
                },
                {
                  id: "$quote_recipient_data._id",
                  firstname: "$quote_recipient_data.groupTitle",
                  image: "$quote_recipient_data.groupImage",
                  type: "group",
                },
                undefined,
              ],
            },
          },
        },
        {
          $set: {
            "quote_message_id.taggedUserId": {
              $cond: [
                {
                  $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                },
                "$quoteTaggedUserId",
                [],
              ],
            },
          },
        },
        {
          $unset: [
            "quote_recipient_data",
            "quote_sender_user",
            "quote_sender_admin",
            "quoteTaggedUserId",
            "quote_message_id.quote_message_id",
          ],
        },
        {
          $unwind: {
            path: "$quote_message_id",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "activity.adminId",
            foreignField: "_id",
            as: "activity_adminId",
          },
        },
        {
          $unwind: {
            path: "$activity_adminId",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            let: { userIds: "$activity.userId" },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: { $eq: [{ $type: "$$userIds" }, "array"] },
                    },
                    {
                      $expr: {
                        $in: ["$_id", "$$userIds"],
                      },
                    },
                  ],
                },
              },
            ],
            as: "activity_userId",
          },
        },
        {
          $set: {
            "activity.adminId": {
              $cond: [
                { $eq: [{ $type: "$activity_adminId" }, "object"] },
                {
                  id: "$activity_adminId._id",
                  firstname: {
                    $concat: [
                      `$activity_adminId.otherdetail.${process.env.USER_FN_ID}`,
                      " ",
                      `$activity_adminId.otherdetail.${process.env.USER_LN_ID}`,
                    ],
                  },
                  image: "$activity_adminId.profileImg",
                  type: "user",
                },
                undefined,
              ],
            },
          },
        },
        {
          $set: {
            "activity.userId": {
              $map: {
                input: "$activity_userId",
                as: "activityuser",
                in: {
                  $cond: [
                    { $eq: [{ $type: "$$activityuser" }, "object"] },
                    {
                      id: "$$activityuser._id",
                      firstname: {
                        $concat: [
                          `$$activityuser.otherdetail.${process.env.USER_FN_ID}`,
                          " ",
                          `$$activityuser.otherdetail.${process.env.USER_LN_ID}`,
                        ],
                      },
                      image: "$$activityuser.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              },
            },
          },
        },
        {
          $unset: ["activity_userId", "activity_adminId"],
        },
        { $sort: { "list.createdAt": 1 } },
      ];
      if (clearUser.length !== 0 && clearUser.id.toString() === id) {
        let chatClearDate = "";
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        if (joined_date.createdAt > clearDate) {
          chatClearDate = joined_date.createdAt;
        } else {
          chatClearDate = clearDate;
        }

        const data = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
                createdAt: { $gt: chatClearDate },
              },
            },
            ...aggregatePipeline,
          ])
        );

        const count = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
                createdAt: { $gt: chatClearDate },
              },
            },
          ])
        );

        if (data.length !== 0 && count.length !== 0) {
          return res.status(200).json({
            status: true,
            message: `messages retrive successfully.`,
            data: [
              {
                Messages: data,
                totalPages: Math.ceil(count.length / limit),
                currentPage: req.query.page,
                totalMessages: count.length,
              },
            ],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: `messages not found.`,
            data: [
              {
                Messages: [],
                totalPages: Math.ceil(0 / limit),
                currentPage: req.query.page,
                totalMessages: 0,
              },
            ],
          });
        }
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        const data = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
                createdAt: { $gt: joined_date.createdAt },
              },
            },
            ...aggregatePipeline,
          ])
        );

        const count = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
              },
            },
          ])
        );

        if (data.length !== 0 && count.length !== 0) {
          return res.status(200).json({
            status: true,
            message: `messages retrive successfully.`,
            data: [
              {
                Messages: data,
                totalPages: Math.ceil(count.length / limit),
                currentPage: req.query.page,
                totalMessages: count.length,
              },
            ],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: `messages not found.`,
            data: [
              {
                Messages: [],
                totalPages: Math.ceil(0 / limit),
                currentPage: req.query.page,
                totalMessages: 0,
              },
            ],
          });
        }
      }
    } else if (type.toLowerCase() === "chatchannel") {
      const aggregatePipeline = [
        { $sort: { userTimeStamp: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "taggedUserId",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  email: 1,
                  otherdetail: 1,
                  profileImg: 1,
                  thumb_profileImg: 1,
                  auth0Id: 1,
                  attendeeDetail: {
                    name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                    photo: "$attendeeDetail.photo"
                      ? "$attendeeDetail.photo"
                      : "",
                  },
                },
              },
            ],
            as: "taggedUserId",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "sender",
            foreignField: "_id",
            as: "sender_user",
          },
        },
        {
          $unwind: {
            path: "$sender_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "sender",
            foreignField: "_id",
            as: "sender_admin",
          },
        },
        {
          $unwind: {
            path: "$sender_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "chatchannels",
            localField: "recipient",
            foreignField: "_id",
            as: "recipient_data",
          },
        },
        {
          $unwind: {
            path: "$recipient_data",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            sender: {
              $cond: [
                {
                  $eq: [{ $type: "$sender_admin" }, "object"],
                },
                {
                  id: "$sender_admin._id",
                  firstname: {
                    $concat: [
                      `$sender_admin.first_name`,
                      " ",
                      `$sender_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$sender_user" }, "object"] },
                    {
                      id: "$sender_user._id",
                      firstname: {
                        $cond: [
                          {
                            $and: [
                              { $ne: ["$sender_user.auth0Id", ""] },
                              { $ne: ["$sender_user.auth0Id", null] },
                            ],
                          },
                          {
                            $concat: [
                              `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                              " ",
                              `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                            ],
                          },
                          {
                            $cond: [
                              {
                                $eq: [
                                  { $type: `$sender_user.attendeeDetail` },
                                  "object",
                                ],
                              },
                              `$sender_user.attendeeDetail.name`,
                              "",
                            ],
                          },
                        ],
                      },
                      image: "$sender_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            recipient: {
              $cond: [
                {
                  $eq: [{ $type: "$recipient_data" }, "object"],
                },
                {
                  id: "$recipient_data._id",
                  firstname: "$recipient_data.channelName",
                  image: "$recipient_data.channelIcon",
                  type: "chatChannel",
                },
                undefined,
              ],
            },
          },
        },
        {
          $unset: ["recipient_data", "sender_user", "sender_admin"],
        },
        {
          $lookup: {
            from: "chats",
            localField: "quote_message_id",
            foreignField: "_id",
            as: "quote_message_id",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "quote_message_id.taggedUserId",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  email: 1,
                  otherdetail: 1,
                  profileImg: 1,
                  thumb_profileImg: 1,
                  auth0Id: 1,
                  attendeeDetail: {
                    name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                    photo: "$attendeeDetail.photo"
                      ? "$attendeeDetail.photo"
                      : "",
                  },
                },
              },
            ],
            as: "quoteTaggedUserId",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "quote_message_id.sender",
            foreignField: "_id",
            as: "quote_sender_user",
          },
        },
        {
          $unwind: {
            path: "$quote_sender_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "quote_message_id.sender",
            foreignField: "_id",
            as: "quote_sender_admin",
          },
        },
        {
          $unwind: {
            path: "$quote_sender_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "groups",
            localField: "quote_message_id.recipient",
            foreignField: "_id",
            as: "quote_recipient_data",
          },
        },
        {
          $unwind: {
            path: "$quote_recipient_data",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            "quote_message_id.sender": {
              $cond: [
                {
                  $eq: [{ $type: "$quote_sender_admin" }, "object"],
                },
                {
                  id: "$quote_sender_admin._id",
                  firstname: {
                    $concat: [
                      `$quote_sender_admin.first_name`,
                      " ",
                      `$quote_sender_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                    {
                      id: "$quote_sender_user._id",
                      firstname: {
                        $cond: [
                          {
                            $and: [
                              { $ne: ["$quote_sender_user.auth0Id", ""] },
                              { $ne: ["$quote_sender_user.auth0Id", null] },
                            ],
                          },
                          {
                            $concat: [
                              `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                              " ",
                              `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                            ],
                          },
                          {
                            $cond: [
                              {
                                $eq: [
                                  {
                                    $type: `$quote_sender_user.attendeeDetail`,
                                  },
                                  "object",
                                ],
                              },
                              `$quote_sender_user.attendeeDetail.name`,
                              "",
                            ],
                          },
                        ],
                      },
                      image: "$quote_sender_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            "quote_message_id.recipient": {
              $cond: [
                {
                  $eq: [{ $type: "$quote_recipient_data" }, "object"],
                },
                {
                  id: "$quote_recipient_data._id",
                  firstname: "$quote_recipient_data.channelName",
                  image: "$quote_recipient_data.channelIcon",
                  type: "chatChannel",
                },
                undefined,
              ],
            },
          },
        },
        {
          $set: {
            "quote_message_id.taggedUserId": {
              $cond: [
                {
                  $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                },
                "$quoteTaggedUserId",
                [],
              ],
            },
          },
        },
        {
          $unset: [
            "quote_recipient_data",
            "quote_sender_user",
            "quote_sender_admin",
            "quoteTaggedUserId",
            "quote_message_id.quote_message_id",
          ],
        },
        {
          $unwind: {
            path: "$quote_message_id",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "activity.adminId",
            foreignField: "_id",
            as: "activity_adminId",
          },
        },
        {
          $unwind: {
            path: "$activity_adminId",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            let: { userIds: "$activity.userId" },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: { $eq: [{ $type: "$$userIds" }, "array"] },
                    },
                    {
                      $expr: {
                        $in: ["$_id", "$$userIds"],
                      },
                    },
                  ],
                },
              },
            ],
            as: "activity_userId",
          },
        },
        {
          $set: {
            "activity.adminId": {
              $cond: [
                { $eq: [{ $type: "$activity_adminId" }, "object"] },
                {
                  id: "$activity_adminId._id",
                  firstname: {
                    $concat: [
                      `$activity_adminId.otherdetail.${process.env.USER_FN_ID}`,
                      " ",
                      `$activity_adminId.otherdetail.${process.env.USER_LN_ID}`,
                    ],
                  },
                  image: "$activity_adminId.profileImg",
                  type: "user",
                },
                undefined,
              ],
            },
          },
        },
        {
          $set: {
            "activity.userId": {
              $map: {
                input: "$activity_userId",
                as: "activityuser",
                in: {
                  $cond: [
                    { $eq: [{ $type: "$$activityuser" }, "object"] },
                    {
                      id: "$$activityuser._id",
                      firstname: {
                        $cond: [
                          {
                            $and: [
                              { $ne: ["$$activityuser.auth0Id", ""] },
                              { $ne: ["$$activityuser.auth0Id", null] },
                            ],
                          },
                          {
                            $concat: [
                              `$$activityuser.otherdetail.${process.env.USER_FN_ID}`,
                              " ",
                              `$$activityuser.otherdetail.${process.env.USER_LN_ID}`,
                            ],
                          },
                          {
                            $cond: [
                              {
                                $eq: [
                                  { $type: `$$activityuser.attendeeDetail` },
                                  "object",
                                ],
                              },
                              `$$activityuser.attendeeDetail.name`,
                              "",
                            ],
                          },
                        ],
                      },
                      image: "$$activityuser.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              },
            },
          },
        },
        {
          $unset: ["activity_userId", "activity_adminId"],
        },
        { $sort: { "list.createdAt": 1 } },
      ];
      if (clearUser.length !== 0 && clearUser.id.toString() === id) {
        let chatClearDate = "";
        const joined_date = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });

        if (joined_date.createdAt > clearDate) {
          chatClearDate = joined_date.createdAt;
        } else {
          chatClearDate = clearDate;
        }

        const data = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
                createdAt: { $gt: chatClearDate },
              },
            },
            ...aggregatePipeline,
          ])
        );

        const count = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
                createdAt: { $gt: chatClearDate },
              },
            },
          ])
        );

        if (data.length !== 0 && count.length !== 0) {
          return res.status(200).json({
            status: true,
            message: `messages retrive successfully.`,
            data: [
              {
                Messages: data,
                totalPages: Math.ceil(count.length / limit),
                currentPage: req.query.page,
                totalMessages: count.length,
              },
            ],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: `messages not found.`,
            data: [
              {
                Messages: [],
                totalPages: Math.ceil(0 / limit),
                currentPage: req.query.page,
                totalMessages: 0,
              },
            ],
          });
        }
      } else {
        const joined_date = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });
        console.log(joined_date, id, "sdklgjlskdjg");
        const data = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
                createdAt: { $gt: joined_date.createdAt },
              },
            },
            ...aggregatePipeline,
          ])
        );

        const count = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                recipient: new mongoose.Types.ObjectId(id),
                isActive: true,
                isBlock: false,
              },
            },
          ])
        );

        if (data.length !== 0 && count.length !== 0) {
          return res.status(200).json({
            status: true,
            message: `messages retrive successfully.`,
            data: [
              {
                Messages: data,
                totalPages: Math.ceil(count.length / limit),
                currentPage: req.query.page,
                totalMessages: count.length,
              },
            ],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: `messages not found.`,
            data: [
              {
                Messages: [],
                totalPages: Math.ceil(0 / limit),
                currentPage: req.query.page,
                totalMessages: 0,
              },
            ],
          });
        }
      }
    } else {
      const aggregatePipeline = [
        { $sort: { userTimeStamp: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "taggedUserId",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  email: 1,
                  otherdetail: 1,
                  profileImg: 1,
                  thumb_profileImg: 1,
                  auth0Id: 1,
                  attendeeDetail: {
                    name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                    photo: "$attendeeDetail.photo"
                      ? "$attendeeDetail.photo"
                      : "",
                  },
                },
              },
            ],
            as: "taggedUserId",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "sender",
            foreignField: "_id",
            as: "sender_user",
          },
        },
        {
          $unwind: {
            path: "$sender_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "sender",
            foreignField: "_id",
            as: "sender_admin",
          },
        },
        {
          $unwind: {
            path: "$sender_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "recipient",
            foreignField: "_id",
            as: "recipient_user",
          },
        },
        {
          $unwind: {
            path: "$recipient_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "recipient",
            foreignField: "_id",
            as: "recipient_admin",
          },
        },
        {
          $unwind: {
            path: "$recipient_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            sender: {
              $cond: [
                {
                  $eq: [{ $type: "$sender_admin" }, "object"],
                },
                {
                  id: "$sender_admin._id",
                  firstname: {
                    $concat: [
                      `$sender_admin.first_name`,
                      " ",
                      `$sender_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$sender_user" }, "object"] },
                    {
                      id: "$sender_user._id",
                      firstname: {
                        $cond: [
                          {
                            $and: [
                              { $ne: ["$sender_user.auth0Id", ""] },
                              { $ne: ["$sender_user.auth0Id", null] },
                            ],
                          },
                          {
                            $concat: [
                              `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                              " ",
                              `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                            ],
                          },
                          {
                            $cond: [
                              {
                                $eq: [
                                  { $type: `$sender_user.attendeeDetail` },
                                  "object",
                                ],
                              },
                              `$sender_user.attendeeDetail.name`,
                              "",
                            ],
                          },
                        ],
                      },
                      image: "$sender_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            recipient: {
              $cond: [
                {
                  $eq: [{ $type: "$recipient_admin" }, "object"],
                },
                {
                  id: "$recipient_admin._id",
                  firstname: {
                    $concat: [
                      `$recipient_admin.first_name`,
                      " ",
                      `$recipient_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$recipient_user" }, "object"] },
                    {
                      id: "$recipient_user._id",
                      firstname: {
                        $cond: [
                          {
                            $and: [
                              { $ne: ["$recipient_user.auth0Id", ""] },
                              { $ne: ["$recipient_user.auth0Id", null] },
                            ],
                          },
                          {
                            $concat: [
                              `$recipient_user.otherdetail.${process.env.USER_FN_ID}`,
                              " ",
                              `$recipient_user.otherdetail.${process.env.USER_LN_ID}`,
                            ],
                          },
                          {
                            $cond: [
                              {
                                $eq: [
                                  { $type: `$recipient_user.attendeeDetail` },
                                  "object",
                                ],
                              },
                              `$recipient_user.attendeeDetail.name`,
                              "",
                            ],
                          },
                        ],
                      },
                      image: "$recipient_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $unset: [
            "recipient_user",
            "recipient_admin",
            "sender_user",
            "sender_admin",
          ],
        },
        {
          $lookup: {
            from: "chats",
            localField: "quote_message_id",
            foreignField: "_id",
            as: "quote_message_id",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "quote_message_id.taggedUserId",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  email: 1,
                  otherdetail: 1,
                  profileImg: 1,
                  thumb_profileImg: 1,
                  auth0Id: 1,
                  attendeeDetail: {
                    name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                    photo: "$attendeeDetail.photo"
                      ? "$attendeeDetail.photo"
                      : "",
                  },
                },
              },
            ],
            as: "quoteTaggedUserId",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "quote_message_id.sender",
            foreignField: "_id",
            as: "quote_sender_user",
          },
        },
        {
          $unwind: {
            path: "$quote_sender_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "quote_message_id.sender",
            foreignField: "_id",
            as: "quote_sender_admin",
          },
        },
        {
          $unwind: {
            path: "$quote_sender_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "quote_message_id.recipient",
            foreignField: "_id",
            as: "quote_recipient_user",
          },
        },
        {
          $unwind: {
            path: "$quote_recipient_user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "adminusers",
            localField: "quote_message_id.recipient",
            foreignField: "_id",
            as: "quoote_recipient_admin",
          },
        },
        {
          $unwind: {
            path: "$quote_recipient_admin",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $set: {
            "quote_message_id.sender": {
              $cond: [
                {
                  $eq: [{ $type: "$quote_sender_admin" }, "object"],
                },
                {
                  id: "$quote_sender_admin._id",
                  firstname: {
                    $concat: [
                      `$quote_sender_admin.first_name`,
                      " ",
                      `$quote_sender_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                    {
                      id: "$quote_sender_user._id",
                      firstname: {
                        $cond: [
                          {
                            $and: [
                              { $ne: ["$quote_sender_user.auth0Id", ""] },
                              { $ne: ["$quote_sender_user.auth0Id", null] },
                            ],
                          },
                          {
                            $concat: [
                              `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                              " ",
                              `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                            ],
                          },
                          {
                            $cond: [
                              {
                                $eq: [
                                  {
                                    $type: `$quote_sender_user.attendeeDetail`,
                                  },
                                  "object",
                                ],
                              },
                              `$quote_sender_user.attendeeDetail.name`,
                              "",
                            ],
                          },
                        ],
                      },
                      image: "$quote_sender_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            "quote_message_id.recipient": {
              $cond: [
                {
                  $eq: [{ $type: "$quote_recipient_admin" }, "object"],
                },
                {
                  id: "$quote_recipient_admin._id",
                  firstname: {
                    $concat: [
                      `$quote_recipient_admin.first_name`,
                      " ",
                      `$quote_recipient_admin.last_name`,
                    ],
                  },
                  type: "admin",
                },
                {
                  $cond: [
                    { $eq: [{ $type: "$quote_recipient_user" }, "object"] },
                    {
                      id: "$quote_recipient_user._id",
                      firstname: {
                        $cond: [
                          {
                            $and: [
                              { $ne: ["$quote_recipient_user.auth0Id", ""] },
                              { $ne: ["$quote_recipient_user.auth0Id", null] },
                            ],
                          },
                          {
                            $concat: [
                              `$quote_recipient_user.otherdetail.${process.env.USER_FN_ID}`,
                              " ",
                              `$quote_recipient_user.otherdetail.${process.env.USER_LN_ID}`,
                            ],
                          },
                          {
                            $cond: [
                              {
                                $eq: [
                                  {
                                    $type: `$quote_recipient_user.attendeeDetail`,
                                  },
                                  "object",
                                ],
                              },
                              `$quote_recipient_user.attendeeDetail.name`,
                              "",
                            ],
                          },
                        ],
                      },
                      image: "$quote_recipient_user.profileImg",
                      type: "user",
                    },
                    undefined,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            "quote_message_id.taggedUserId": {
              $cond: [
                {
                  $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                },
                "$quoteTaggedUserId",
                [],
              ],
            },
          },
        },
        {
          $unset: [
            "quote_recipient_user",
            "quote_recipient_admin",
            "quote_sender_user",
            "quoteTaggedUserId",
            "quote_sender_admin",
            "quote_message_id.quote_message_id",
          ],
        },
        {
          $unwind: {
            path: "$quote_message_id",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];
      if (clearUser.length !== 0 && clearUser.id.toString() === id) {
        const data = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                $and: [
                  {
                    $or: [
                      { sender: new mongoose.Types.ObjectId(id) },
                      { recipient: new mongoose.Types.ObjectId(id) },
                    ],
                  },
                  { $or: [{ sender: userid }, { recipient: userid }] },
                ],
                isActive: true,
                createdAt: { $gt: clearDate },
              },
            },
            ...aggregatePipeline,
          ])
        );

        const count = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                $and: [
                  {
                    $or: [
                      { sender: new mongoose.Types.ObjectId(id) },
                      { recipient: new mongoose.Types.ObjectId(id) },
                    ],
                  },
                  { $or: [{ sender: userid }, { recipient: userid }] },
                ],
                isActive: true,
                createdAt: { $gt: clearDate },
              },
            },
          ])
        );

        if (data.length !== 0 && count.length !== 0) {
          return res.status(200).json({
            status: true,
            message: `messages retrive successfully.`,
            data: [
              {
                Messages: data,
                totalPages: Math.ceil(count.length / limit),
                currentPage: req.query.page,
                totalMessages: count.length,
              },
            ],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: `messages not found.`,
            data: [
              {
                Messages: [],
                totalPages: Math.ceil(0 / limit),
                currentPage: req.query.page,
                totalMessages: 0,
              },
            ],
          });
        }
      } else {
        const data = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                $and: [
                  {
                    $or: [
                      { sender: new mongoose.Types.ObjectId(id) },
                      { recipient: new mongoose.Types.ObjectId(id) },
                    ],
                  },
                  { $or: [{ sender: userid }, { recipient: userid }] },
                ],
                isActive: true,
              },
            },
            ...aggregatePipeline,
          ])
        );
        const count = await Promise.all(
          await chat.aggregate([
            {
              $match: {
                $and: [
                  {
                    $or: [
                      { sender: new mongoose.Types.ObjectId(id) },
                      { recipient: new mongoose.Types.ObjectId(id) },
                    ],
                  },
                  { $or: [{ sender: userid }, { recipient: userid }] },
                ],
                isActive: true,
              },
            },
          ])
        );

        if (data.length !== 0 && count.length !== 0) {
          return res.status(200).json({
            status: true,
            message: `messages retrive successfully.`,
            data: [
              {
                Messages: data,
                totalPages: Math.ceil(count.length / limit),
                currentPage: req.query.page,
                totalMessages: count.length,
              },
            ],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: `messages not found.`,
            data: [
              {
                Messages: [],
                totalPages: Math.ceil(0 / limit),
                currentPage: req.query.page,
                totalMessages: 0,
              },
            ],
          });
        }
      }
    }
  } catch (err) {
    console.log(err);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// read and unread messages socket event
exports.update_chat = async (recipient, sender, type) => {
  try {
    var recipientArr = [],
      senderArr = [],
      match = {},
      group_members;
    recipientArr.push({
      recipient: new mongoose.Types.ObjectId(recipient),
      sender: new mongoose.Types.ObjectId(sender),
    });
    senderArr.push({
      recipient: new mongoose.Types.ObjectId(sender),
      sender: new mongoose.Types.ObjectId(recipient),
    });

    match.$or = [{ $and: recipientArr }, { $and: senderArr }];
    if (type.toLowerCase() === "user") {
      const updated_data = await chat.updateMany(
        {
          recipient: new mongoose.Types.ObjectId(recipient),
          sender: new mongoose.Types.ObjectId(sender),
          group_member: {
            $elemMatch: { id: new mongoose.Types.ObjectId(recipient) },
          },
        },
        { $set: { "group_member.$.readmsg": true } },
        { new: true }
      );

      let unReadCount = await this.checkIfMsgReadSocket(recipient);
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
      const updated_data = await chat.updateMany(
        {
          recipient: new ObjectId(recipient),
          group_member: {
            $elemMatch: { id: new mongoose.Types.ObjectId(sender) },
          },
        },
        { $set: { "group_member.$.readmsg": true } },
        { new: true }
      );

      let unReadCount = await this.checkIfMsgReadSocket(sender);
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
      if (type.toLowerCase() === "userchatgroup")
        group_members = await userChatGroupMember.find({
          groupId: recipient,
          status: 2,
        });
      else if (type.toLowerCase() === "chatchannel")
        group_members = await chatChannelMembers.find({
          channelId: recipient,
          status: 2,
          user_type: "airtable-syncs",
        });
    }
    if (group_members) {
      return group_members;
    } else {
      return [];
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// read and unread messages socket event
exports.updateChat = async (recipient, sender, type) => {
  try {
    var recipientArr = [],
      senderArr = [],
      match = {},
      group_members;
    recipientArr.push({
      recipient: new mongoose.Types.ObjectId(recipient),
      sender: new mongoose.Types.ObjectId(sender),
    });
    senderArr.push({
      recipient: new mongoose.Types.ObjectId(sender),
      sender: new mongoose.Types.ObjectId(recipient),
    });

    match.$or = [{ $and: recipientArr }, { $and: senderArr }];
    if (type.toLowerCase() === "user") {
      const updated_data = await chat.updateMany(
        {
          recipient: new mongoose.Types.ObjectId(recipient),
          sender: new mongoose.Types.ObjectId(sender),
          group_member: {
            $elemMatch: { id: new mongoose.Types.ObjectId(recipient) },
          },
        },
        { $set: { "group_member.$.readmsg": true } },
        { new: true }
      );

      let unReadCount = await this.checkIfMsgReadSocket(recipient);
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
      const updated_data = await chat.updateMany(
        {
          recipient: new ObjectId(sender),
          group_member: {
            $elemMatch: { id: new mongoose.Types.ObjectId(recipient) },
          },
        },
        { $set: { "group_member.$.readmsg": true } },
        { new: true }
      );

      let unReadCount = await this.checkIfMsgReadSocket(recipient);
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

      if (type.toLowerCase() === "userchatgroup")
        group_members = await userChatGroupMember.find({
          groupId: recipient,
          status: 2,
        });
      else if (type.toLowerCase() === "chatchannel")
        group_members = await chatChannelMembers.find({
          channelId: recipient,
          status: 2,
          user_type: "airtable-syncs",
        });
    }
    if (group_members) {
      return group_members;
    } else {
      return [];
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// add new user in chat socket event
exports.add_chat_user = async (socket_id, userid) => {
  try {
    let response = [];

    if (await chat_user.findOne({ userid: userid })) {
      response = await chat_user.findOneAndUpdate(
        { userid: userid },
        { $push: { socket_id: socket_id }, online: true }
      );
    } else {
      response = await new chat_user({
        socket_id: [socket_id],
        userid: userid,
        online: true,
      }).save();
    }
    if (response) {
      return response;
    } else {
      console.log("something went wrong!");
      return [];
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

// remove chat user socket event
exports.remove_chat_user = async (socket_id, userid) => {
  try {
    let response;
    var chatuser = await chat_user.findOne({ userid: userid });
    if (chatuser) {
      response = await chat_user.findOneAndUpdate(
        { userid: userid },
        {
          $set: {
            socket_id: [
              ...chatuser.socket_id.filter((id) => {
                if (id !== socket_id) return id;
              }),
            ],
            online:
              chatuser.socket_id.filter((id) => {
                if (id !== socket_id) return id;
              }).length > 0
                ? true
                : false,
          },
        },
        { new: true }
      );
    }
    if (response) {
      return response;
    } else {
      console.log("something went wrong!");
      return [];
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};
// remove chat user sockets
exports.removeDisconnectedSocketIds = async (socket_ids, userid) => {
  try {
    let response;
    var chatuser = await chat_user.findOne({ userid: userid });
    if (chatuser) {
      response = await chat_user.findOneAndUpdate(
        { userid: userid },
        {
          $set: {
            socket_id: [
              ...chatuser.socket_id.filter((id) => {
                if (!socket_ids.includes(id)) return id;
              }),
            ],
            online:
              chatuser.socket_id.filter((id) => {
                if (!socket_ids.includes(id)) return id;
              }).length > 0
                ? true
                : false,
          },
        }
      );
    }
    if (response) {
      return response;
    } else {
      console.log("something went wrong!");
      return [];
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};
// block chat socket event
exports.block_chat = async (type, loginUserId, userId) => {
  try {
    console.log("req...", type, loginUserId, userId);

    if (type === "group") {
      return { status: false, message: "You can't block group!" };
    } else {
      const user_data = await User.findById(
        new mongoose.Types.ObjectId(loginUserId)
      );
      if (
        user_data.blocked_chat &&
        user_data.blocked_chat.includes(new mongoose.Types.ObjectId(userId))
      ) {
        const blocked_chat = await User.findByIdAndUpdate(
          new mongoose.Types.ObjectId(loginUserId),
          {
            $pull: { blocked_chat: new mongoose.Types.ObjectId(userId) },
          }
        );
        const blocked_by_chat = await User.findByIdAndUpdate(
          new mongoose.Types.ObjectId(userId),
          {
            $pull: {
              blocked_by_who_chat: new mongoose.Types.ObjectId(loginUserId),
            },
          }
        );

        if (blocked_chat && blocked_by_chat) {
          return { status: true, message: "Removed user from block list!" };
        }
      } else {
        const blocked_chat = await User.findByIdAndUpdate(
          new mongoose.Types.ObjectId(loginUserId),
          {
            $push: { blocked_chat: new mongoose.Types.ObjectId(userId) },
          }
        );
        const blocked_by_chat = await User.findByIdAndUpdate(
          new mongoose.Types.ObjectId(userId),
          {
            $push: {
              blocked_by_who_chat: new mongoose.Types.ObjectId(loginUserId),
            },
          }
        );

        if (blocked_chat && blocked_by_chat) {
          return { status: true, message: "Added user in block list!" };
        }
      }
    }
  } catch (e) {
    console.log(e);
    return { status: false, message: "Something went wrong!" };
  }
};

// get user details from it's ID
async function get_user(userid) {
  console.log(userid, "userrrid");
  const user_data = await User.findById(userid);

  if (user_data) {
    return {
      id: user_data._id,
      firstname:
        user_data.otherdetail[process.env.USER_FN_ID] +
        " " +
        user_data.otherdetail[process.env.USER_LN_ID],
      image: user_data.profileImg,
      type: "user",
    };
  } else {
    const admin_data = await AdminUser.findById(userid);
    if (admin_data) {
      return {
        id: admin_data._id,
        firstname: admin_data.first_name + " " + admin_data.last_name,
        image: "",
        type: "admin",
      };
    } else {
      return undefined;
    }
  }
}

// delete message
exports.delete_message = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await chat.find({
      _id: mongoose.Types.ObjectId(id),
      sender: req.authUserId,
    });

    if (message) {
      if (message[0].media) {
        var delete_media = message[0].media.map(async (media) => {
          const aa1 = await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET,
              Key: media,
            })
            .promise();
        });
        await Promise.all([...delete_media]);
      }

      if (message[0].otherfiles) {
        var delete_otherfiles = message[0].otherfiles.map(async (media) => {
          const aa1 = await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET,
              Key: media,
            })
            .promise();
        });
        await Promise.all([...delete_otherfiles]);
      }

      const result = await chat.deleteOne({ _id: mongoose.Types.ObjectId(id) });
      if (result) {
        return res.status(200).json({
          status: true,
          message: "Message deleted successfully!",
          type: message[0].type,
        });
      } else {
        return res
          .status(200)
          .json({ status: false, message: "Message not deleted!" });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Message not found!" });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// delete message
exports.clear_chat = async (req, res) => {
  try {
    const { id } = req.params;
    let match = {},
      recipientArr = [],
      senderArr = [];

    recipientArr.push({
      recipient: new mongoose.Types.ObjectId(id),
      sender: req.authUserId,
    });
    senderArr.push({
      recipient: req.authUserId,
      sender: new mongoose.Types.ObjectId(id),
    });

    match.$or = [{ $and: recipientArr }, { $and: senderArr }];
    const message = await chat.find({
      $or: [{ $and: recipientArr }, { $and: senderArr }],
    });

    if (message) {
      message.map(async (msg) => {
        if (msg.media) {
          var delete_media = msg.media.map(async (media) => {
            const aa1 = await s3
              .deleteObject({
                Bucket: process.env.AWS_BUCKET,
                Key: media,
              })
              .promise();
          });
          await Promise.all([...delete_media]);
        }

        if (msg.otherfiles) {
          var delete_otherfiles = msg.otherfiles.map(async (otherfiles) => {
            const aa1 = await s3
              .deleteObject({
                Bucket: process.env.AWS_BUCKET,
                Key: otherfiles,
              })
              .promise();
          });
          await Promise.all([...delete_otherfiles]);
        }
      });

      const result = await chat.deleteMany({
        $or: [{ $and: recipientArr }, { $and: senderArr }],
      });

      if (result) {
        return res
          .status(200)
          .json({ status: true, message: "Chat cleared successfully!" });
      } else {
        return res
          .status(200)
          .json({ status: false, message: "Chat not cleared!" });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Message not found!" });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// get media file of chat
exports.get_media_files = async (req, res) => {
  try {
    const { id } = req.params;
    let media = [],
      files = [],
      links = [],
      match = {},
      recipientArr = [],
      senderArr = [],
      recipientgroupMem = [];

    recipientArr.push({
      recipient: new mongoose.Types.ObjectId(id),
      sender: req.authUserId,
    });
    senderArr.push({
      recipient: req.authUserId,
      sender: new mongoose.Types.ObjectId(id),
    });
    recipientgroupMem.push({
      recipient: new mongoose.Types.ObjectId(id),
      "$group_member.id": { $in: [req.authUserId] },
    });
    match.$or = [
      { $and: recipientArr },
      { $and: senderArr },
      { $and: recipientgroupMem },
    ];
    const message = await chat.find({
      $or: [
        { $and: recipientArr },
        { $and: senderArr },
        { $and: recipientgroupMem },
      ],
    });
    if (message) {
      message.map(async (msg) => {
        if (msg.media)
          media = media.length > 0 ? [...media, ...msg.media] : [...msg.media];
        if (msg.otherfiles)
          files =
            files.length > 0
              ? [...files, ...msg.otherfiles]
              : [...msg.otherfiles];
        if (msg.isLink)
          links = links.length > 0 ? [...links, ...msg.message] : [msg.message];
      });
      return res.status(200).json({ status: true, media, files, links });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Message not found!" });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// get group member from user
exports.getgroupmember = async (req, res) => {
  try {
    const groupData = await Group.findOne({
      _id: req.params.id,
      isDelete: false,
    });
    if (!groupData)
      return res
        .status(200)
        .json({ status: false, message: "Group not Found." });

    const memberList = await GroupMember.aggregate([
      {
        $match: {
          groupId: new mongoose.Types.ObjectId(req.params.id),
          status: 2,
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "userId",
          foreignField: "_id",
          as: "user_data",
        },
      },
      {
        $unwind: {
          path: "$user_data",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "adminusers",
          localField: "userId",
          foreignField: "_id",
          as: "admin_data",
        },
      },
      {
        $unwind: {
          path: "$admin_data",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          userId: {
            $cond: [
              {
                $eq: [{ $type: "$admin_data" }, "object"],
              },
              {
                id: "$admin_data._id",
                firstname: {
                  $concat: [
                    `$admin_data.first_name`,
                    " ",
                    `$admin_data.last_name`,
                  ],
                },
                type: "admin",
              },
              {
                $cond: [
                  { $eq: [{ $type: "$user_data" }, "object"] },
                  {
                    id: "$user_data._id",
                    firstname: {
                      $concat: [
                        `$user_data.otherdetail.${process.env.USER_FN_ID}`,
                        " ",
                        `$user_data.otherdetail.${process.env.USER_LN_ID}`,
                      ],
                    },
                    image: "$user_data.profileImg",
                    type: "user",
                  },
                  undefined,
                ],
              },
            ],
          },
        },
      },
      {
        $unset: ["user_data", "admin_data"],
      },
      {
        $lookup: {
          from: "chat_users",
          localField: "userId.id",
          foreignField: "userid",
          as: "socket",
        },
      },
    ]);

    if (memberList)
      return res
        .status(200)
        .send({ status: true, message: "Group members.", data: memberList });
    else
      return res.status(200).send({
        status: false,
        message: "This group don't have any members.",
        data: [],
      });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: error.message, data: [] });
  }
};

// start and unstart chat from user
exports.starchat = async (req, res) => {
  try {
    const { id } = req.params;
    const user_data = await User.findById(req.authUserId);
    if (
      user_data.star_chat &&
      user_data.star_chat.includes(new mongoose.Types.ObjectId(id))
    ) {
      const star_chat = await User.findByIdAndUpdate(req.authUserId, {
        $pull: { star_chat: new mongoose.Types.ObjectId(id) },
      });
      if (star_chat) {
        return res
          .status(200)
          .json({ status: true, message: "Removed from star list!" });
      }
    } else {
      const star_chat = await User.findByIdAndUpdate(req.authUserId, {
        $push: { star_chat: new mongoose.Types.ObjectId(id) },
      });
      if (star_chat) {
        return res
          .status(200)
          .json({ status: true, message: "Added in star list!" });
      }
    }
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// delete message from user
exports.getUserStarChat = async (req, res) => {
  try {
    const userStarChat = await User.findById(req.authUserId, {
      _id: 1,
      star_chat: 1,
    });

    if (userStarChat.length !== 0) {
      return res.status(200).json({
        status: true,
        message: `User's star chat list retrive.`,
        data: userStarChat,
      });
    } else {
      return res.status(200).json({
        status: true,
        message: `User don't have star chat list.`,
        data: [],
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// block or unblock any user or group from user
exports.blockchat = async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type;

    if (type === "group") {
      res.status(200).json({ status: true, message: "You can't block group!" });
    } else {
      const user_data = await User.findById(req.authUserId);
      if (
        user_data.blocked_chat &&
        user_data.blocked_chat.includes(new mongoose.Types.ObjectId(id))
      ) {
        const blocked_chat = await User.findByIdAndUpdate(req.authUserId, {
          $pull: { blocked_chat: new mongoose.Types.ObjectId(id) },
        });
        const blocked_by_chat = await User.findByIdAndUpdate(
          new mongoose.Types.ObjectId(id),
          {
            $pull: {
              blocked_by_who_chat: new mongoose.Types.ObjectId(req.authUserId),
            },
          }
        );

        if (blocked_chat && blocked_by_chat) {
          return res
            .status(200)
            .json({ status: true, message: "Removed user from block list!" });
        }
      } else {
        const blocked_chat = await User.findByIdAndUpdate(req.authUserId, {
          $push: { blocked_chat: new mongoose.Types.ObjectId(id) },
        });
        const blocked_by_chat = await User.findByIdAndUpdate(
          new mongoose.Types.ObjectId(id),
          {
            $push: {
              blocked_by_who_chat: new mongoose.Types.ObjectId(req.authUserId),
            },
          }
        );

        if (blocked_chat && blocked_by_chat) {
          return res
            .status(200)
            .json({ status: true, message: "Added user in block list!" });
        }
      }
    }
  } catch (e) {
    console.log(e);
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// clear chat or delete conversation from user
exports.clearChat = async (req, res) => {
  try {
    const body = req.body;
    const clearDate = new Date();
    const userData = await User.findById(req.authUserId);
    var clear_user_data = [];

    const clearData = {
      id: body.id,
      type: body.type,
      date: clearDate,
      deleteConversation: body.deleteConversation
        ? body.deleteConversation
        : false,
    };

    const alreadyAdded = await User.findOne(
      {
        _id: userData._id,
        clear_chat_data: { $elemMatch: { id: new ObjectId(body.id) } },
      },
      { clear_chat_data: 1 }
    );

    if (alreadyAdded !== null) {
      clear_user_data = await User.findOneAndUpdate(
        {
          _id: userData._id,
          clear_chat_data: { $elemMatch: { id: new ObjectId(body.id) } },
        },
        {
          $set: {
            "clear_chat_data.$.date": clearDate,
            "clear_chat_data.$.deleteConversation": body.deleteConversation
              ? body.deleteConversation
              : false,
          },
        },
        { new: true }
      );
    } else if (
      clearData.id !== null &&
      clearData.id !== undefined &&
      clearData.type !== undefined &&
      clearData.type !== null &&
      clearData.deleteConversation !== undefined &&
      clearData.deleteConversation !== null &&
      clearData.id.length > 0 &&
      clearData.type.length > 0
    ) {
      clear_user_data = await User.findOneAndUpdate(
        { _id: userData._id },
        { $push: { clear_chat_data: clearData } },
        { new: true }
      );
    }

    if (clear_user_data) {
      if (body.deleteConversation) {
        deleteRecordFromChatList(userData._id, body.id);
        await this.updateChat(
          userData._id.toString(),
          body.id.toString(),
          body.type
        );
      } else {
        clearMessageFromChatList(userData._id, body.id);
        await this.updateChat(
          userData._id.toString(),
          body.id.toString(),
          body.type
        );
      }
      res.status(200).json({
        status: true,
        message: "User chat cleared!",
        data: clear_user_data,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(200).json({ status: false, message: "Something went wrong!" });
  }
};

// test API for socket
exports.testChat = async (req, res) => {
  /** chat listing code **/
  try {
    let { sender } = req.body;
    let id = sender;
    const user_data = await User.findById(new mongoose.Types.ObjectId(id));

    var favarray = [];
    if (user_data && user_data.star_chat) favarray = user_data.star_chat;

    const lastmessageData = await chat.aggregate([
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
          "group_member.id": new mongoose.Types.ObjectId(id),
        },
      },
      {
        $addFields: {
          newRecipient: {
            $cond: {
              if: { $eq: ["$recipient", new mongoose.Types.ObjectId(id)] },
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
            $sum: { $cond: [{ $eq: ["$group_member.readmsg", false] }, 1, 0] },
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
        $lookup: {
          from: "userchatgroups",
          localField: "_id.recipient",
          foreignField: "_id",
          as: "userchatgroupdata",
        },
      },
      {
        $unwind: {
          path: "$userchatgroupdata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "_id.recipient",
          foreignField: "_id",
          as: "groupdata",
        },
      },
      {
        $unwind: {
          path: "$groupdata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "messageinfo.newRecipient",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "userdata",
        },
      },
      {
        $unwind: {
          path: "$userdata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "adminusers",
          localField: "messageinfo.newRecipient",
          foreignField: "_id",
          as: "admindata",
        },
      },
      {
        $unwind: {
          path: "$admindata",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          datainfo: {
            $cond: [
              {
                $eq: [{ $type: "$groupdata" }, "object"],
              },
              {
                id: "$groupdata._id",
                firstname: "$groupdata.groupTitle",
                image: "$groupdata.groupImage",
                type: "group",
              },
              {
                $cond: [
                  {
                    $eq: [{ $type: "$userchatgroupdata" }, "object"],
                  },
                  {
                    id: "$userchatgroupdata._id",
                    firstname: "$userchatgroupdata.groupTitle",
                    image: "$userchatgroupdata.groupImage",
                    type: "userchatgroup",
                  },
                  {
                    $cond: [
                      {
                        $eq: [{ $type: "$userdata" }, "object"],
                      },
                      {
                        id: "$userdata._id",
                        firstname: {
                          $concat: [
                            `$userdata.otherdetail.${process.env.USER_FN_ID}`,
                            " ",
                            `$userdata.otherdetail.${process.env.USER_LN_ID}`,
                          ],
                        },
                        image: "$userdata.profileImg",
                        type: "user",
                      },
                      {
                        $cond: [
                          {
                            $eq: [{ $type: "$admindata" }, "object"],
                          },
                          {
                            id: "$admindata._id",
                            firstname: {
                              $concat: [
                                `$admindata.first_name`,
                                " ",
                                `$admindata.last_name`,
                              ],
                            },
                            type: "admin",
                          },
                          "undefined",
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          userdata: "$$REMOVE",
          userchatgroupdata: "$$REMOVE",
          groupdata: "$$REMOVE",
          admindata: "$$REMOVE",
        },
      },
      {
        $lookup: {
          from: "chat_users",
          localField: "messageinfo.newRecipient",
          foreignField: "userid",
          pipeline: [{ $match: { online: true } }],
          as: "useronline",
        },
      },
      {
        $lookup: {
          from: "groupmembers",
          localField: "messageinfo.newRecipient",
          foreignField: "groupId",
          pipeline: [{ $match: { status: 2 } }],
          as: "allmembers",
        },
      },
      {
        $lookup: {
          from: "userchatgroupmembers",
          localField: "messageinfo.newRecipient",
          foreignField: "groupId",
          pipeline: [{ $match: { status: 2 } }],
          as: "allusermembers",
        },
      },
      {
        $lookup: {
          from: "chat_users",
          localField: "allmembers.userId",
          foreignField: "userid",
          pipeline: [{ $match: { online: true } }],
          as: "useronline_group",
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "messageinfo.group_member_field.id",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, otherdetail: 1, profileImg: 1 } }],
          as: "messageinfo.group_member_field",
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "messageinfo.taggedUserId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                email: 1,
                otherdetail: 1,
                profileImg: 1,
                thumb_profileImg: 1,
                auth0Id: 1,
                attendeeDetail: {
                  name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                  photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                },
              },
            },
          ],
          as: "messageinfo.taggedUserId",
        },
      },
      {
        $project: {
          _id: 0,
          id: "$messageinfo.newRecipient",
          firstname: "$datainfo.firstname",
          unreadMsg: 1,
          image: "$datainfo.image",
          message: "$messageinfo.message",
          type: "$messageinfo.type",
          time: "$messageinfo.time",
          date: "$messageinfo.date",
          image_video: "$messageinfo.media",
          otherfiles: "$messageinfo.otherfiles",
          createdAt: "$messageinfo.createdAt",
          userTimeStamp: "$messageinfo.userTimeStamp",
          group_member: "$messageinfo.group_member_field",
          taggedUserId: "$messageinfo.taggedUserId",
          isMention: {
            $cond: {
              if: {
                $and: [
                  { $gt: ["$unreadMsg", 0] },
                  {
                    $regexMatch: {
                      input: "$messageinfo.message",
                      regex: id,
                      options: "i",
                    },
                  },
                ],
              },
              then: true,
              else: false,
            },
          },
          useronline: {
            $cond: [{ $gt: [{ $size: "$useronline" }, 0] }, true, false],
          },
          number_of_user_online: { $size: "$useronline_group" },
        },
      },
    ]);

    var arr = [];
    if (user_data) {
      for (let index = 0; index < lastmessageData.length; index++) {
        var info = user_data.clear_chat_data.filter((data) => {
          if (data.id.toString() === lastmessageData[index].id.toString())
            return data;
        });

        user_data.muteNotification.map(async (data) => {
          if (
            data.chatId.toString() === lastmessageData[index].id.toString() &&
            data.mute === true
          ) {
            lastmessageData[index].muteChat = true;
          }
        });

        if (
          !(
            user_data.deleted_group_of_user &&
            user_data.deleted_group_of_user.includes(lastmessageData[index].id)
          )
        ) {
          if (lastmessageData[index].firstname) {
            if (info.length > 0) {
              if (
                new Date(info[0].date) <
                new Date(lastmessageData[index].createdAt)
              ) {
                arr.push(lastmessageData[index]);
              } else if (info[0].deleteConversation === false) {
                arr.push({
                  ...lastmessageData[index],
                  message: "",
                  time: "",
                  image_video: [],
                  otherfiles: [],
                  date: "",
                });
              }
            } else {
              arr.push(lastmessageData[index]);
            }
          }
        }
      }
    }

    if (arr) {
      return res
        .status(200)
        .json({ status: true, message: `Messages retrive.`, data: arr });
    } else {
      return [];
    }
  } catch (error) {
    console.log("testdev", error);
  }
};

// search any message from user
exports.searchChat = async (req, res) => {
  try {
    var search = "";
    if (req.body.search) {
      search = req.body.search;
    }
    const id = req.body.userid;
    const userid = req.authUserId;
    let type = "";
    type = req.body.type ? req.body.type : "";
    let sort = { createdAt: -1 };
    let clearUser = [];
    let clearDate = "";

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

    let data;
    console.log(clearUserData, "clearUserData");
    if (type === "userChatGroup") {
      if (clearDate.toString().length > 0) {
        let chatClearDate = "";
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        if (joined_date.createdAt > clearDate) {
          chatClearDate = joined_date.createdAt;
        } else {
          chatClearDate = clearDate;
        }

        data = await chat.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [{ recipient: new mongoose.Types.ObjectId(id) }],
                },
              ],
              message: { $regex: ".*" + search + ".*", $options: "i" },
              isActive: true,
              createdAt: { $gt: chatClearDate },
            },
          },
          { $sort: sort },
          {
            $project: {
              _id: 1,
              message: 1,
            },
          },
        ]);
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        data = await chat.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [{ recipient: new mongoose.Types.ObjectId(id) }],
                },
              ],
              createdAt: { $gt: joined_date.createdAt },
              message: { $regex: ".*" + search + ".*", $options: "i" },
              isActive: true,
            },
          },
          { $sort: sort },
          {
            $project: {
              _id: 1,
              message: 1,
            },
          },
        ]);
      }
    } else if (type === "chatChannel") {
      if (clearDate.toString().length > 0) {
        let chatClearDate = "";
        const joinedDate = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        if (joinedDate.createdAt > clearDate) {
          chatClearDate = joinedDate.createdAt;
        } else {
          chatClearDate = clearDate;
        }

        data = await chat.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [{ recipient: new mongoose.Types.ObjectId(id) }],
                },
              ],
              message: { $regex: ".*" + search + ".*", $options: "i" },
              isActive: true,
              createdAt: { $gt: chatClearDate },
            },
          },
          { $sort: sort },
          {
            $project: {
              _id: 1,
              message: 1,
            },
          },
        ]);
      } else {
        const joinedDate = await chatChannelMembers.findOne({
          channelId: new mongoose.Types.ObjectId(id),
          userId: userid,
          status: 2,
        });

        data = await chat.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [{ recipient: new mongoose.Types.ObjectId(id) }],
                },
              ],
              createdAt: { $gt: joinedDate.createdAt },
              message: { $regex: ".*" + search + ".*", $options: "i" },
              isActive: true,
            },
          },
          { $sort: sort },
          {
            $project: {
              _id: 1,
              message: 1,
            },
          },
        ]);
      }
    } else {
      if (clearDate.toString().length > 0) {
        data = await chat.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [
                    { sender: new mongoose.Types.ObjectId(id) },
                    { recipient: new mongoose.Types.ObjectId(id) },
                  ],
                },
                { $or: [{ sender: userid }, { recipient: userid }] },
              ],
              message: { $regex: ".*" + search + ".*", $options: "i" },
              isActive: true,
              createdAt: { $gt: clearDate },
            },
          },
          { $sort: sort },
          {
            $project: {
              _id: 1,
              message: 1,
            },
          },
        ]);
      } else {
        data = await chat.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [
                    { sender: new mongoose.Types.ObjectId(id) },
                    { recipient: new mongoose.Types.ObjectId(id) },
                  ],
                },
                {
                  $or: [{ sender: userid }, { recipient: userid }],
                },
              ],
              message: { $regex: ".*" + search + ".*", $options: "i" },
              isActive: true,
            },
          },
          { $sort: sort },
          {
            $project: {
              _id: 1,
              message: 1,
            },
          },
        ]);
      }
    }

    const count = data.length;
    return res.status(200).json({
      status: true,
      message: `List of Content Archive Video.`,
      data: { data, count },
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// delete message from user
// exports.deleteChat = async (chatId, messageId, userId) => {
//   try {
//     const id = messageId;
//     let recipient = mongoose.Types.ObjectId(chatId);
//     const message = await chat.findOne({
//       _id: mongoose.Types.ObjectId(id),
//       sender: userId,
//       recipient: recipient,
//     });

//     if (message) {
//       if (message.media) {
//         var delete_media = message.media.map(async (media) => {
//           const aa1 = await s3
//             .deleteObject({
//               Bucket: process.env.AWS_BUCKET,
//               Key: media,
//             })
//             .promise();
//         });
//         await Promise.all([...delete_media]);
//       }

//       if (message.otherfiles) {
//         var delete_otherfiles = message.otherfiles.map(async (media) => {
//           const aa1 = await s3
//             .deleteObject({
//               Bucket: process.env.AWS_BUCKET,
//               Key: media,
//             })
//             .promise();
//         });
//         await Promise.all([...delete_otherfiles]);
//       }

//       const result = await chat.deleteOne({ _id: mongoose.Types.ObjectId(id) });
//       if (result) {
//         return {
//           status: true,
//           message: "Message deleted successfully!",
//           group_member: message.group_member,
//           type: message.type,
//           messageId: messageId,
//           messageType: message.message_type,
//           chatId: chatId,
//         };
//       } else {
//         return { status: false, message: "Message not deleted!" };
//       }
//     } else {
//       return { status: false, message: "Message not found!" };
//     }
//   } catch (e) {
//     console.log(e);
//     return { status: false, message: "Something went wrong!" };
//   }
// };

// new Changes code for delete message
exports.deleteChat = async (chatId, messageId, userId) => {
  try {
    const id = messageId;
    let recipient = mongoose.Types.ObjectId(chatId);

    const [message, result] = await Promise.all([
      chat.findOne({
        _id: mongoose.Types.ObjectId(id),
        sender: userId,
        recipient: recipient,
      }),
      chat.deleteOne({ _id: mongoose.Types.ObjectId(id) }),
    ]);

    if (message) {
      // Collect media and other file deletions in parallel
      const deletions = [];

      if (message.media) {
        deletions.push(...message.media.map((media) => deleteS3Object(media)));
      }

      if (message.otherfiles) {
        deletions.push(
          ...message.otherfiles.map((media) => deleteS3Object(media))
        );
      }

      await Promise.all(deletions);

      if (result.deletedCount > 0) {
        return {
          status: true,
          message: "Message deleted successfully!",
          group_member: message.group_member,
          type: message.type,
          messageId: messageId,
          messageType: message.message_type,
          chatId: chatId,
        };
      } else {
        return { status: false, message: "Message not deleted!" };
      }
    } else {
      return { status: false, message: "Message not found!" };
    }
  } catch (e) {
    console.error(e);
    return { status: false, message: "Something went wrong!" };
  }
};

async function deleteS3Object(key) {
  await s3
    .deleteObject({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
    })
    .promise();
}

// count of total messages
exports.countChatDetailSocket = async (chatid, authUserId, type) => {
  try {
    const userid = new ObjectId(authUserId);
    const id = new ObjectId(chatid);
    let clearUser = [];
    let clearDate = "",
      count = 0;
    const clearUserData = await User.findOne(
      { _id: userid, clear_chat_data: { $elemMatch: { id: id } } },
      { clear_chat_data: { $elemMatch: { id: id } } }
    );

    if (clearUserData !== undefined && clearUserData !== null) {
      clearUser = clearUserData.clear_chat_data[0];
      clearDate = clearUser.date;
    }

    if (
      type.toLowerCase() === "userchatgroup" ||
      type.toLowerCase() === "chatchannel"
    ) {
      if (clearUser.length !== 0 && clearUser.id.toString() === id) {
        count = await chat.countDocuments({
          recipient: id,
          isActive: true,
          isBlock: false,
          createdAt: { $gt: clearDate },
        });

        if (count !== 0) return count;
      } else {
        count = await chat.countDocuments({
          recipient: id,
          isActive: true,
          isBlock: false,
        });

        if (count !== 0) return count;
      }
    } else {
      if (clearUser.length !== 0 && clearUser.id.toString() === id) {
        count = await chat.countDocuments({
          $and: [
            {
              $or: [{ sender: id }, { recipient: id }],
            },
            { $or: [{ sender: userid }, { recipient: userid }] },
          ],
          isActive: true,
          createdAt: { $gt: clearDate },
        });

        if (count !== 0) return count;
      } else {
        count = await chat.countDocuments({
          $and: [
            {
              $or: [{ sender: id }, { recipient: id }],
            },
            { $or: [{ sender: userid }, { recipient: userid }] },
          ],
          isActive: true,
        });

        if (count !== 0) return count;
      }
    }
  } catch (err) {
    console.log(err, "count error in chat details socket");
    return {
      status: false,
      message: "Interval Server Error!",
      error: err.message,
    };
  }
};

// get listing of the messages
exports.getChatDetailSocket = async (
  chatid,
  authUserId,
  type,
  skipcnt,
  limitcnt
) => {
  try {
    const userid = new ObjectId(authUserId);
    const id = chatid;
    const limit = parseInt(limitcnt);
    const skip = parseInt(skipcnt);
    var clearUser = [];
    var clearDate = "";
    if (ObjectId.isValid(id)) {
      const clearUserData = await User.findOne(
        {
          _id: userid,
          clear_chat_data: { $elemMatch: { id: new ObjectId(id) } },
        },
        { clear_chat_data: { $elemMatch: { id: new ObjectId(id) } } }
      );

      if (clearUserData !== undefined && clearUserData !== null) {
        clearUser = clearUserData.clear_chat_data[0];
        clearDate = clearUser.date;
      }

      if (type.toLowerCase() === "userchatgroup") {
        const aggregatePipeline = [
          { $sort: { userTimeStamp: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "taggedUserId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    email: 1,
                    otherdetail: 1,
                    profileImg: 1,
                    thumb_profileImg: 1,
                    auth0Id: 1,
                    attendeeDetail: {
                      name: "$attendeeDetail.name"
                        ? "$attendeeDetail.name"
                        : "",
                      photo: "$attendeeDetail.photo"
                        ? "$attendeeDetail.photo"
                        : "",
                    },
                  },
                },
              ],
              as: "taggedUserId",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "sender",
              foreignField: "_id",
              as: "sender_user",
            },
          },
          {
            $unwind: {
              path: "$sender_user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "adminusers",
              localField: "sender",
              foreignField: "_id",
              as: "sender_admin",
            },
          },
          {
            $unwind: {
              path: "$sender_admin",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "userchatgroups",
              localField: "recipient",
              foreignField: "_id",
              as: "recipient_data",
            },
          },
          {
            $unwind: {
              path: "$recipient_data",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              sender: {
                $cond: [
                  {
                    $eq: [{ $type: "$sender_admin" }, "object"],
                  },
                  {
                    id: "$sender_admin._id",
                    firstname: {
                      $concat: [
                        `$sender_admin.first_name`,
                        " ",
                        `$sender_admin.last_name`,
                      ],
                    },
                    type: "admin",
                  },
                  {
                    $cond: [
                      { $eq: [{ $type: "$sender_user" }, "object"] },
                      {
                        id: "$sender_user._id",
                        firstname: {
                          $concat: [
                            `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                            " ",
                            `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                          ],
                        },
                        image: "$sender_user.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              recipient: {
                $cond: [
                  {
                    $eq: [{ $type: "$recipient_data" }, "object"],
                  },
                  {
                    id: "$recipient_data._id",
                    firstname: "$recipient_data.groupTitle",
                    image: "$recipient_data.groupImage",
                    type: "group",
                  },
                  undefined,
                ],
              },
            },
          },
          {
            $unset: ["recipient_data", "sender_user", "sender_admin"],
          },
          {
            $lookup: {
              from: "chats",
              localField: "quote_message_id",
              foreignField: "_id",
              as: "quote_message_id",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "quote_message_id.taggedUserId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    email: 1,
                    otherdetail: 1,
                    profileImg: 1,
                    thumb_profileImg: 1,
                    auth0Id: 1,
                    attendeeDetail: {
                      name: "$attendeeDetail.name"
                        ? "$attendeeDetail.name"
                        : "",
                      photo: "$attendeeDetail.photo"
                        ? "$attendeeDetail.photo"
                        : "",
                    },
                  },
                },
              ],
              as: "quoteTaggedUserId",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "quote_message_id.sender",
              foreignField: "_id",
              as: "quote_sender_user",
            },
          },
          {
            $unwind: {
              path: "$quote_sender_user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "adminusers",
              localField: "quote_message_id.sender",
              foreignField: "_id",
              as: "quote_sender_admin",
            },
          },
          {
            $unwind: {
              path: "$quote_sender_admin",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "groups",
              localField: "quote_message_id.recipient",
              foreignField: "_id",
              as: "quote_recipient_data",
            },
          },
          {
            $unwind: {
              path: "$quote_recipient_data",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              "quote_message_id.sender": {
                $cond: [
                  {
                    $eq: [{ $type: "$quote_sender_admin" }, "object"],
                  },
                  {
                    id: "$quote_sender_admin._id",
                    firstname: {
                      $concat: [
                        `$quote_sender_admin.first_name`,
                        " ",
                        `$quote_sender_admin.last_name`,
                      ],
                    },
                    type: "admin",
                  },
                  {
                    $cond: [
                      { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                      {
                        id: "$quote_sender_user._id",
                        firstname: {
                          $concat: [
                            `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                            " ",
                            `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                          ],
                        },
                        image: "$quote_sender_user.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              "quote_message_id.recipient": {
                $cond: [
                  {
                    $eq: [{ $type: "$quote_recipient_data" }, "object"],
                  },
                  {
                    id: "$quote_recipient_data._id",
                    firstname: "$quote_recipient_data.groupTitle",
                    image: "$quote_recipient_data.groupImage",
                    type: "group",
                  },
                  undefined,
                ],
              },
            },
          },
          {
            $set: {
              "quote_message_id.taggedUserId": {
                $cond: [
                  {
                    $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                  },
                  "$quoteTaggedUserId",
                  [],
                ],
              },
            },
          },
          {
            $unset: [
              "quote_recipient_data",
              "quote_sender_user",
              "quote_sender_admin",
              "quoteTaggedUserId",
              "quote_message_id.quote_message_id",
            ],
          },
          {
            $unwind: {
              path: "$quote_message_id",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "activity.adminId",
              foreignField: "_id",
              as: "activity_adminId",
            },
          },
          {
            $unwind: {
              path: "$activity_adminId",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              let: { userIds: "$activity.userId" },
              pipeline: [
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $eq: [{ $type: "$$userIds" }, "array"] },
                      },
                      {
                        $expr: {
                          $in: ["$_id", "$$userIds"],
                        },
                      },
                    ],
                  },
                },
              ],
              as: "activity_userId",
            },
          },
          {
            $set: {
              "activity.adminId": {
                $cond: [
                  { $eq: [{ $type: "$activity_adminId" }, "object"] },
                  {
                    id: "$activity_adminId._id",
                    firstname: {
                      $concat: [
                        `$activity_adminId.otherdetail.${process.env.USER_FN_ID}`,
                        " ",
                        `$activity_adminId.otherdetail.${process.env.USER_LN_ID}`,
                      ],
                    },
                    image: "$activity_adminId.profileImg",
                    type: "user",
                  },
                  undefined,
                ],
              },
            },
          },
          {
            $set: {
              "activity.userId": {
                $map: {
                  input: "$activity_userId",
                  as: "activityuser",
                  in: {
                    $cond: [
                      { $eq: [{ $type: "$$activityuser" }, "object"] },
                      {
                        id: "$$activityuser._id",
                        firstname: {
                          $concat: [
                            `$$activityuser.otherdetail.${process.env.USER_FN_ID}`,
                            " ",
                            `$$activityuser.otherdetail.${process.env.USER_LN_ID}`,
                          ],
                        },
                        image: "$$activityuser.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                },
              },
            },
          },
          {
            $unset: ["activity_userId", "activity_adminId"],
          },
        ];
        if (clearUser.length !== 0 && clearUser.id.toString() === id) {
          let chatClearDate = "";
          const joined_date = await userChatGroupMember.findOne({
            groupId: new mongoose.Types.ObjectId(id),
            userId: userid,
            status: 2,
          });

          if (joined_date && joined_date.createdAt > clearDate) {
            chatClearDate = joined_date.createdAt;
          } else {
            chatClearDate = clearDate;
          }

          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: chatClearDate },
                },
              },
              ...aggregatePipeline,
            ])
          );

          const count = await chat.countDocuments({
            recipient: new mongoose.Types.ObjectId(id),
            isActive: true,
            isBlock: false,
            createdAt: { $gt: chatClearDate },
          });

          if (data.length !== 0 && count !== 0) {
            return {
              status: true,
              message: `messages retrive successfully.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: data,
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          } else {
            return {
              status: false,
              message: `messages not found.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: [],
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          }
        } else {
          const joined_date = await userChatGroupMember.findOne({
            groupId: new mongoose.Types.ObjectId(id),
            userId: userid,
            status: 2,
          });

          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: joined_date.createdAt },
                },
              },
              ...aggregatePipeline,
            ])
          );

          const count = await chat.countDocuments({
            recipient: new mongoose.Types.ObjectId(id),
            isActive: true,
            isBlock: false,
            createdAt: { $gt: joined_date.createdAt },
          });

          if (data.length !== 0 && count !== 0) {
            return {
              status: true,
              message: `messages retrive successfully.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: data,
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          } else {
            return {
              status: false,
              message: `messages not found.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: [],
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          }
        }
      } else if (type.toLowerCase() === "chatchannel") {
        const aggregatePipeline = [
          { $sort: { userTimeStamp: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "taggedUserId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    email: 1,
                    otherdetail: 1,
                    profileImg: 1,
                    thumb_profileImg: 1,
                    auth0Id: 1,
                    attendeeDetail: {
                      name: "$attendeeDetail.name"
                        ? "$attendeeDetail.name"
                        : "",
                      photo: "$attendeeDetail.photo"
                        ? "$attendeeDetail.photo"
                        : "",
                    },
                  },
                },
              ],
              as: "taggedUserId",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "sender",
              foreignField: "_id",
              as: "sender_user",
            },
          },
          {
            $unwind: {
              path: "$sender_user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "adminusers",
              localField: "sender",
              foreignField: "_id",
              as: "sender_admin",
            },
          },
          {
            $unwind: {
              path: "$sender_admin",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "chatchannels",
              localField: "recipient",
              foreignField: "_id",
              as: "recipient_data",
            },
          },
          {
            $unwind: {
              path: "$recipient_data",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              sender: {
                $cond: [
                  {
                    $eq: [{ $type: "$sender_admin" }, "object"],
                  },
                  {
                    id: "$sender_admin._id",
                    firstname: {
                      $concat: [
                        `$sender_admin.first_name`,
                        " ",
                        `$sender_admin.last_name`,
                      ],
                    },
                    type: "admin",
                  },
                  {
                    $cond: [
                      { $eq: [{ $type: "$sender_user" }, "object"] },
                      {
                        id: "$sender_user._id",
                        firstname: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$sender_user.auth0Id", ""] },
                                { $ne: ["$sender_user.auth0Id", null] },
                              ],
                            },
                            {
                              $concat: [
                                `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            {
                              $cond: [
                                {
                                  $eq: [
                                    { $type: `$sender_user.attendeeDetail` },
                                    "object",
                                  ],
                                },
                                `$sender_user.attendeeDetail.name`,
                                "",
                              ],
                            },
                          ],
                        },
                        image: "$sender_user.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              recipient: {
                $cond: [
                  {
                    $eq: [{ $type: "$recipient_data" }, "object"],
                  },
                  {
                    id: "$recipient_data._id",
                    firstname: "$recipient_data.channelName",
                    image: "$recipient_data.channelIcon",
                    type: "chatChannel",
                  },
                  undefined,
                ],
              },
            },
          },
          {
            $unset: ["recipient_data", "sender_user", "sender_admin"],
          },
          {
            $lookup: {
              from: "chats",
              localField: "quote_message_id",
              foreignField: "_id",
              as: "quote_message_id",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "quote_message_id.taggedUserId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    email: 1,
                    otherdetail: 1,
                    profileImg: 1,
                    thumb_profileImg: 1,
                    auth0Id: 1,
                    attendeeDetail: {
                      name: "$attendeeDetail.name"
                        ? "$attendeeDetail.name"
                        : "",
                      photo: "$attendeeDetail.photo"
                        ? "$attendeeDetail.photo"
                        : "",
                    },
                  },
                },
              ],
              as: "quoteTaggedUserId",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "quote_message_id.sender",
              foreignField: "_id",
              as: "quote_sender_user",
            },
          },
          {
            $unwind: {
              path: "$quote_sender_user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "adminusers",
              localField: "quote_message_id.sender",
              foreignField: "_id",
              as: "quote_sender_admin",
            },
          },
          {
            $unwind: {
              path: "$quote_sender_admin",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "chatchannels",
              localField: "quote_message_id.recipient",
              foreignField: "_id",
              as: "quote_recipient_data",
            },
          },
          {
            $unwind: {
              path: "$quote_recipient_data",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              "quote_message_id.sender": {
                $cond: [
                  {
                    $eq: [{ $type: "$quote_sender_admin" }, "object"],
                  },
                  {
                    id: "$quote_sender_admin._id",
                    firstname: {
                      $concat: [
                        `$quote_sender_admin.first_name`,
                        " ",
                        `$quote_sender_admin.last_name`,
                      ],
                    },
                    type: "admin",
                  },
                  {
                    $cond: [
                      { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                      {
                        id: "$quote_sender_user._id",
                        firstname: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$quote_sender_user.auth0Id", ""] },
                                { $ne: ["$quote_sender_user.auth0Id", null] },
                              ],
                            },
                            {
                              $concat: [
                                `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            {
                              $cond: [
                                {
                                  $eq: [
                                    {
                                      $type: `$quote_sender_user.attendeeDetail`,
                                    },
                                    "object",
                                  ],
                                },
                                `$quote_sender_user.attendeeDetail.name`,
                                undefined,
                              ],
                            },
                          ],
                        },
                        image: "$quote_sender_user.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              "quote_message_id.recipient": {
                $cond: [
                  {
                    $eq: [{ $type: "$quote_recipient_data" }, "object"],
                  },
                  {
                    id: "$quote_recipient_data._id",
                    firstname: "$quote_recipient_data.channelName",
                    image: "$quote_recipient_data.channelIcon",
                    type: "chatChannel",
                  },
                  undefined,
                ],
              },
            },
          },
          {
            $set: {
              "quote_message_id.taggedUserId": {
                $cond: [
                  {
                    $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                  },
                  "$quoteTaggedUserId",
                  [],
                ],
              },
            },
          },
          {
            $unset: [
              "quote_recipient_data",
              "quote_sender_user",
              "quote_sender_admin",
              "quoteTaggedUserId",
              "quote_message_id.quote_message_id",
            ],
          },
          {
            $unwind: {
              path: "$quote_message_id",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "activity.adminId",
              foreignField: "_id",
              as: "activity_adminId",
            },
          },
          {
            $unwind: {
              path: "$activity_adminId",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              let: { userIds: "$activity.userId" },
              pipeline: [
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $eq: [{ $type: "$$userIds" }, "array"] },
                      },
                      {
                        $expr: {
                          $in: ["$_id", "$$userIds"],
                        },
                      },
                    ],
                  },
                },
              ],
              as: "activity_userId",
            },
          },
          {
            $set: {
              "activity.adminId": {
                $cond: [
                  { $eq: [{ $type: "$activity_adminId" }, "object"] },
                  {
                    id: "$activity_adminId._id",
                    firstname: {
                      $concat: [
                        `$activity_adminId.otherdetail.${process.env.USER_FN_ID}`,
                        " ",
                        `$activity_adminId.otherdetail.${process.env.USER_LN_ID}`,
                      ],
                    },
                    image: "$activity_adminId.profileImg",
                    type: "user",
                  },
                  undefined,
                ],
              },
            },
          },
          {
            $set: {
              "activity.userId": {
                $map: {
                  input: "$activity_userId",
                  as: "activityuser",
                  in: {
                    $cond: [
                      { $eq: [{ $type: "$$activityuser" }, "object"] },
                      {
                        id: "$$activityuser._id",
                        firstname: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$$activityuser.auth0Id", ""] },
                                { $ne: ["$$activityuser.auth0Id", null] },
                              ],
                            },
                            {
                              $concat: [
                                `$$activityuser.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$$activityuser.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            {
                              $cond: [
                                {
                                  $eq: [
                                    { $type: `$$activityuser.attendeeDetail` },
                                    "object",
                                  ],
                                },
                                `$$activityuser.attendeeDetail.name`,
                                undefined,
                              ],
                            },
                          ],
                        },
                        image: "$$activityuser.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                },
              },
            },
          },
          {
            $unset: ["activity_userId", "activity_adminId"],
          },
        ];
        if (clearUser.length !== 0 && clearUser.id.toString() === id) {
          let chatClearDate = "";
          const joined_date = await chatChannelMembers.findOne({
            channeId: new mongoose.Types.ObjectId(id),
            userId: userid,
            status: 2,
            user_type: "airtable-syncs",
          });

          if (joined_date && joined_date.createdAt > clearDate) {
            chatClearDate = joined_date.createdAt;
          } else {
            chatClearDate = clearDate;
          }

          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: chatClearDate },
                },
              },
              ...aggregatePipeline,
            ])
          );

          const count = await chat.countDocuments({
            recipient: new mongoose.Types.ObjectId(id),
            isActive: true,
            isBlock: false,
            createdAt: { $gt: chatClearDate },
          });

          if (data.length !== 0 && count !== 0) {
            return {
              status: true,
              message: `messages retrive successfully.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: data,
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          } else {
            return {
              status: false,
              message: `messages not found.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: [],
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          }
        } else {
          const joined_date = await chatChannelMembers.findOne({
            channeId: new mongoose.Types.ObjectId(id),
            userId: userid,
            status: 2,
            user_type: "airtable-syncs",
          });

          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  recipient: new mongoose.Types.ObjectId(id),
                  isActive: true,
                  isBlock: false,
                  createdAt: { $gt: joined_date.createdAt },
                },
              },
              ...aggregatePipeline,
            ])
          );

          const count = await chat.countDocuments({
            recipient: new mongoose.Types.ObjectId(id),
            isActive: true,
            isBlock: false,
            createdAt: { $gt: joined_date.createdAt },
          });

          if (data.length !== 0 && count !== 0) {
            return {
              status: true,
              message: `messages retrive successfully.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: data,
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          } else {
            return {
              status: false,
              message: `messages not found.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: [],
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          }
        }
      } else {
        const aggregatePipeline = [
          { $sort: { userTimeStamp: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "taggedUserId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    email: 1,
                    otherdetail: 1,
                    profileImg: 1,
                    thumb_profileImg: 1,
                    auth0Id: 1,
                    attendeeDetail: {
                      name: "$attendeeDetail.name"
                        ? "$attendeeDetail.name"
                        : "",
                      photo: "$attendeeDetail.photo"
                        ? "$attendeeDetail.photo"
                        : "",
                    },
                  },
                },
              ],
              as: "taggedUserId",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "sender",
              foreignField: "_id",
              as: "sender_user",
            },
          },
          {
            $unwind: {
              path: "$sender_user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "adminusers",
              localField: "sender",
              foreignField: "_id",
              as: "sender_admin",
            },
          },
          {
            $unwind: {
              path: "$sender_admin",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "recipient",
              foreignField: "_id",
              as: "recipient_user",
            },
          },
          {
            $unwind: {
              path: "$recipient_user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "adminusers",
              localField: "recipient",
              foreignField: "_id",
              as: "recipient_admin",
            },
          },
          {
            $unwind: {
              path: "$recipient_admin",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              sender: {
                $cond: [
                  {
                    $eq: [{ $type: "$sender_admin" }, "object"],
                  },
                  {
                    id: "$sender_admin._id",
                    firstname: {
                      $concat: [
                        `$sender_admin.first_name`,
                        " ",
                        `$sender_admin.last_name`,
                      ],
                    },
                    type: "admin",
                  },
                  {
                    $cond: [
                      { $eq: [{ $type: "$sender_user" }, "object"] },
                      {
                        id: "$sender_user._id",
                        firstname: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$sender_user.auth0Id", ""] },
                                { $ne: ["$sender_user.auth0Id", null] },
                              ],
                            },
                            {
                              $concat: [
                                `$sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            {
                              $cond: [
                                {
                                  $eq: [
                                    { $type: `$sender_user.attendeeDetail` },
                                    "object",
                                  ],
                                },
                                `$sender_user.attendeeDetail.name`,
                                "",
                              ],
                            },
                          ],
                        },
                        image: "$sender_user.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              recipient: {
                $cond: [
                  {
                    $eq: [{ $type: "$recipient_admin" }, "object"],
                  },
                  {
                    id: "$recipient_admin._id",
                    firstname: {
                      $concat: [
                        `$recipient_admin.first_name`,
                        " ",
                        `$recipient_admin.last_name`,
                      ],
                    },
                    type: "admin",
                  },
                  {
                    $cond: [
                      { $eq: [{ $type: "$recipient_user" }, "object"] },
                      {
                        id: "$recipient_user._id",
                        firstname: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$recipient_user.auth0Id", ""] },
                                { $ne: ["$recipient_user.auth0Id", null] },
                              ],
                            },
                            {
                              $concat: [
                                `$recipient_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$recipient_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            {
                              $cond: [
                                {
                                  $eq: [
                                    { $type: `$recipient_user.attendeeDetail` },
                                    "object",
                                  ],
                                },
                                `$recipient_user.attendeeDetail.name`,
                                "",
                              ],
                            },
                          ],
                        },
                        image: "$recipient_user.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                ],
              },
            },
          },
          {
            $unset: [
              "recipient_user",
              "recipient_admin",
              "sender_user",
              "sender_admin",
            ],
          },
          {
            $lookup: {
              from: "chats",
              localField: "quote_message_id",
              foreignField: "_id",
              as: "quote_message_id",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "quote_message_id.taggedUserId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    email: 1,
                    otherdetail: 1,
                    profileImg: 1,
                    thumb_profileImg: 1,
                    auth0Id: 1,
                    attendeeDetail: {
                      name: "$attendeeDetail.name"
                        ? "$attendeeDetail.name"
                        : "",
                      photo: "$attendeeDetail.photo"
                        ? "$attendeeDetail.photo"
                        : "",
                    },
                  },
                },
              ],
              as: "quoteTaggedUserId",
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "quote_message_id.sender",
              foreignField: "_id",
              as: "quote_sender_user",
            },
          },
          {
            $unwind: {
              path: "$quote_sender_user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "adminusers",
              localField: "quote_message_id.sender",
              foreignField: "_id",
              as: "quote_sender_admin",
            },
          },
          {
            $unwind: {
              path: "$quote_sender_admin",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "airtable-syncs",
              localField: "quote_message_id.recipient",
              foreignField: "_id",
              as: "quote_recipient_user",
            },
          },
          {
            $unwind: {
              path: "$quote_recipient_user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "adminusers",
              localField: "quote_message_id.recipient",
              foreignField: "_id",
              as: "quoote_recipient_admin",
            },
          },
          {
            $unwind: {
              path: "$quote_recipient_admin",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              "quote_message_id.sender": {
                $cond: [
                  {
                    $eq: [{ $type: "$quote_sender_admin" }, "object"],
                  },
                  {
                    id: "$quote_sender_admin._id",
                    firstname: {
                      $concat: [
                        `$quote_sender_admin.first_name`,
                        " ",
                        `$quote_sender_admin.last_name`,
                      ],
                    },
                    type: "admin",
                  },
                  {
                    $cond: [
                      { $eq: [{ $type: "$quote_sender_user" }, "object"] },
                      {
                        id: "$quote_sender_user._id",
                        firstname: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$quote_sender_user.auth0Id", ""] },
                                { $ne: ["$quote_sender_user.auth0Id", null] },
                              ],
                            },
                            {
                              $concat: [
                                `$quote_sender_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_sender_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            {
                              $cond: [
                                {
                                  $eq: [
                                    {
                                      $type: `$quote_sender_user.attendeeDetail`,
                                    },
                                    "object",
                                  ],
                                },
                                `$quote_sender_user.attendeeDetail.name`,
                                "",
                              ],
                            },
                          ],
                        },
                        image: "$quote_sender_user.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              "quote_message_id.recipient": {
                $cond: [
                  {
                    $eq: [{ $type: "$quote_recipient_admin" }, "object"],
                  },
                  {
                    id: "$quote_recipient_admin._id",
                    firstname: {
                      $concat: [
                        `$quote_recipient_admin.first_name`,
                        " ",
                        `$quote_recipient_admin.last_name`,
                      ],
                    },
                    type: "admin",
                  },
                  {
                    $cond: [
                      { $eq: [{ $type: "$quote_recipient_user" }, "object"] },
                      {
                        id: "$quote_recipient_user._id",
                        firstname: {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$quote_recipient_user.auth0Id", ""] },
                                {
                                  $ne: ["$quote_recipient_user.auth0Id", null],
                                },
                              ],
                            },
                            {
                              $concat: [
                                `$quote_recipient_user.otherdetail.${process.env.USER_FN_ID}`,
                                " ",
                                `$quote_recipient_user.otherdetail.${process.env.USER_LN_ID}`,
                              ],
                            },
                            {
                              $cond: [
                                {
                                  $eq: [
                                    {
                                      $type: `$quote_recipient_user.attendeeDetail`,
                                    },
                                    "object",
                                  ],
                                },
                                `$quote_recipient_user.attendeeDetail.name`,
                                "",
                              ],
                            },
                          ],
                        },
                        image: "$quote_recipient_user.profileImg",
                        type: "user",
                      },
                      undefined,
                    ],
                  },
                ],
              },
            },
          },
          {
            $set: {
              "quote_message_id.taggedUserId": {
                $cond: [
                  {
                    $eq: [{ $type: "$quoteTaggedUserId" }, "array"],
                  },
                  "$quoteTaggedUserId",
                  [],
                ],
              },
            },
          },
          {
            $unset: [
              "quote_recipient_user",
              "quote_recipient_admin",
              "quote_sender_user",
              "quote_sender_admin",
              "quoteTaggedUserId",
              "quote_message_id.quote_message_id",
            ],
          },
          {
            $unwind: {
              path: "$quote_message_id",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];
        if (clearUser.length !== 0 && clearUser.id.toString() === id) {
          const data = await chat.aggregate([
            {
              $match: {
                $and: [
                  {
                    $or: [
                      { sender: new mongoose.Types.ObjectId(id) },
                      { recipient: new mongoose.Types.ObjectId(id) },
                    ],
                  },
                  { $or: [{ sender: userid }, { recipient: userid }] },
                ],
                isActive: true,
                createdAt: { $gt: clearDate },
              },
            },
            ...aggregatePipeline,
          ]);
          count = await chat.countDocuments({
            $and: [
              {
                $or: [
                  { sender: new ObjectId(id) },
                  { recipient: new ObjectId(id) },
                ],
              },
              { $or: [{ sender: userid }, { recipient: userid }] },
            ],
            isActive: true,
            createdAt: { $gt: clearDate },
          });

          if (data.length !== 0 && count !== 0) {
            return {
              status: true,
              message: `messages retrive successfully.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: data,
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          } else {
            return {
              status: false,
              message: `messages not found.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: [],
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          }
        } else {
          const data = await Promise.all(
            await chat.aggregate([
              {
                $match: {
                  $and: [
                    {
                      $or: [
                        { sender: new mongoose.Types.ObjectId(id) },
                        { recipient: new mongoose.Types.ObjectId(id) },
                      ],
                    },
                    { $or: [{ sender: userid }, { recipient: userid }] },
                  ],
                  isActive: true,
                },
              },
              ...aggregatePipeline,
            ])
          );

          count = await chat.countDocuments({
            $and: [
              {
                $or: [{ sender: id }, { recipient: id }],
              },
              { $or: [{ sender: userid }, { recipient: userid }] },
            ],
            isActive: true,
          });

          if (data.length !== 0 && count !== 0) {
            return {
              status: true,
              message: `messages retrive successfully.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: data,
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          } else {
            return {
              status: false,
              message: `messages not found.`,
              currentPage: skip,
              chatid: chatid,
              data: {
                Messages: [],
                totalPages: Math.ceil(count / limit),
                currentPage: skip,
                totalMessages: count,
              },
            };
          }
        }
      }
    } else {
      return { status: false, message: "Invalid Id!" };
    }
  } catch (err) {
    console.log(err, "error in chat details socket");
    return {
      status: false,
      message: "Interval Server Error!",
      error: err.message,
    };
  }
};

// get listing of the messages
exports.checkIfMsgReadSocket = async (authUserId) => {
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
    console.log(unReadData, "unreadcount");
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

// get message details for user
exports.getMessageDetail = async (req, res) => {
  try {
    const messageDetail = await chat.findById(req.params.id).lean();

    if (messageDetail) {
      return res.status(200).json({
        status: true,
        data: {
          ...messageDetail,
          sender: {
            id: messageDetail.sender._id,
            firstname: messageDetail.sender.otherdetail
              ? messageDetail.sender.otherdetail[process.env.USER_FN_ID] +
                " " +
                messageDetail.sender.otherdetail[process.env.USER_LN_ID]
              : "",
            image: messageDetail.sender.profileImg,
            type: "user",
          },
        },
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "Message not found!",
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// send test notification to the user
exports.testNotification = async (req, res) => {
  try {
    const body = req.body;
    let successdata = {
      notification: "Test Notification by SJ",
      description: "test notification message by SJ...",
      icon: "https://media.sproutsocial.com/uploads/2017/02/10x-featured-social-media-image-size.png",
      device_token: body.deviceToken,
      notification_data: {
        type: "",
        content: [],
      },
      sub_title: "hello",
    };

    let notification = send_notification(successdata);

    if (notification)
      return res
        .status(200)
        .json({ status: true, message: "notification send successfully." });
    else
      return res
        .status(200)
        .json({ status: false, message: "notification error!" });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// setup and send notification in case of send message
exports.setupNSendNotification = async (
  message,
  recipient,
  sender,
  type,
  image_video,
  other_files,
  quotemsg,
  message_type,
  taggedUserId
) => {
  try {
    let recipentData = [],
      members = [];
    let chatData = {},
      data = {};
    let senderData = await User.findOne({ _id: new ObjectId(sender) });
    let messageData = message;
    let Senderonline = await chat_user.findOne({
      userid: new ObjectId(sender),
    });
    if (
      messageData !== "" &&
      messageData !== null &&
      messageData !== undefined
    ) {
      messageData = message ? message : "";
      var messageData2 = [];
      const messageArr = messageData.split(" ");
      const taggedUserDetail = taggedUserId
        ? await User.find({
            _id: {
              $in: taggedUserId.map((ids) => {
                return ObjectId(ids);
              }),
            },
          })
            .select({ otherdetail: 1, attendeeDetail: 1, auth0Id: 1 })
            .lean()
        : [];
      let resOrder = messageArr.map(async (item, i) => {
        if (item.startsWith("@")) {
          item = item.replace("@", "");
          let mentionUserName = "";
          let userId = taggedUserDetail.filter((users) => {
            if (users._id.toString() === item.trim()) return users;
          })[0];
          if (userId !== null) {
            mentionUserName += "@";
            mentionUserName +=
              userId.auth0Id !== null && userId.auth0Id !== ""
                ? userId.otherdetail
                  ? userId.otherdetail[process.env.USER_FN_ID] +
                    " " +
                    userId.otherdetail[process.env.USER_LN_ID]
                  : typeof userId.attendeeDetail === "object"
                  ? userId.attendeeDetail.name
                  : ""
                : "";
          } else {
            mentionUserName = "@" + item;
          }
          messageData2.push(mentionUserName);
        } else {
          messageData2.push(item);
        }
      });
      await Promise.all([...resOrder]);

      let messageDetails = messageData2.join(" ");
      messageData =
        messageDetails.length > 50
          ? messageDetails.substring(0, 50) + " ..."
          : messageDetails;
    }

    if (type === "user") {
      recipentData = await User.findOne({ _id: new ObjectId(recipient) });
      let unReadCount = await this.checkIfMsgReadSocket(recipient);
      console.log("sending notification");
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
            " " +
            recipentData.otherdetail[process.env.USER_LN_ID]
          : "",
        recipentImage: recipentData.profileImg,
        chatType: type,
        messageType: message_type,
        online: Senderonline.online,
      };

      data = {
        senderName: senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "",
        recipentName: recipentData.otherdetail
          ? recipentData.otherdetail[process.env.USER_FN_ID] +
            " " +
            recipentData.otherdetail[process.env.USER_LN_ID]
          : "",
        chatType: type,
        messageType: message_type,
        message: messageData,
      };

      const alreadyMute = await User.findOne(
        {
          _id: recipentData._id,
          muteNotification: { $in: [senderData._id.toString()] },
        },
        { muteNotification: 1 }
      );
      console.log(alreadyMute, "alreadtMute");
      // if user send media or otherfile
      if (
        image_video !== undefined &&
        image_video.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < image_video.length; i++) {
          // if user only send media
          let notificationTemplate =
            await notification_template.send_one_on_one_media(data);
          let userDeviceToken = await User.findOne(
            { _id: recipentData._id },
            { deviceToken: 1 }
          );
          if (alreadyMute === null) {
            if (userDeviceToken.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: recipentData._id,
                role: "user",
              }).save();

              let successdata = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: userDeviceToken.deviceToken,
                collapse_key: senderData._id,
                badge_count: unReadCount,
                notification_data: {
                  type: "send_one_on_one_media",
                  content: chatData,
                },
              };
              send_notification(successdata);
            }
          }
        }
      } else if (
        other_files !== undefined &&
        other_files.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < other_files.length; i++) {
          // if user send other file
          let notificationTemplate =
            await notification_template.send_one_on_one_file(data);
          let userDeviceToken = await User.findOne(
            { _id: recipentData._id },
            { deviceToken: 1 }
          );
          if (alreadyMute === null) {
            if (userDeviceToken.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: recipentData._id,
                role: "user",
              }).save();

              let successdata = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: userDeviceToken.deviceToken,
                collapse_key: senderData._id,
                badge_count: unReadCount,
                notification_data: {
                  type: "send_one_on_one_file",
                  content: chatData,
                },
              };
              send_notification(successdata);
            }
          }
        }
      } else {
        if (quotemsg !== "" && quotemsg !== undefined && quotemsg !== null) {
          let notificationTemplate =
            await notification_template.send_one_on_one_msg_replay(data);
          let userDeviceToken = await User.findOne(
            { _id: recipentData._id },
            { deviceToken: 1 }
          );
          if (alreadyMute === null) {
            if (userDeviceToken.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: recipentData._id,
                role: "user",
              }).save();

              let successdata = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: userDeviceToken.deviceToken,
                collapse_key: senderData._id,
                badge_count: unReadCount,
                notification_data: {
                  type: "send_one_on_one_msg_replay",
                  content: chatData,
                },
              };
              send_notification(successdata);
            }
          }
        } else {
          let notificationTemplate =
            await notification_template.send_one_on_one_msg(data);
          let userDeviceToken = await User.findOne(
            { _id: recipentData._id },
            { deviceToken: 1 }
          );
          if (alreadyMute === null) {
            if (userDeviceToken.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: recipentData._id,
                role: "user",
              }).save();

              let successdata = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: userDeviceToken.deviceToken,
                collapse_key: senderData._id,
                badge_count: unReadCount,
                notification_data: {
                  type: "send_one_on_one_msg",
                  content: chatData,
                },
              };
              // console.log(successdata, "successdata");
              send_notification(successdata);
            }
          }
        }
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      recipentData = await userChatGroup.findOne({
        _id: new ObjectId(recipient),
      });
      members = await userChatGroupMember.find({
        groupId: new ObjectId(recipient),
      });

      chatData = {
        senderId: senderData._id,
        senderName: senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "",
        senderImage: senderData.profileImg,
        recipentId: recipentData._id,
        recipentName: recipentData.groupTitle ? recipentData.groupTitle : "",
        recipentImage: recipentData.groupImage,
        chatType: type,
        messageType: message_type,
      };

      data = {
        senderName: senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "",
        recipentName: recipentData.groupTitle ? recipentData.groupTitle : "",
        chatType: type,
        messageType: message_type,
        message: messageData,
      };
      let allMembersIds = members
        .filter(async (member) => {
          if (member.userId._id.toString() !== senderData._id.toString()) {
            return member;
          }
        })
        .map((allIds) => {
          return ObjectId(allIds.userId._id);
        });
      console.log(allMembersIds, "allMembersIds");
      // const allMembersListDetail = await User.find({_id: {$in: allMembersIds }}).select("muteNotification deviceToken").lean();
      const allMembersListDetail = await chatList.aggregate([
        {
          $match: {
            userId: { $in: allMembersIds },
          },
        },
        {
          $group: {
            _id: { userId: "$userId" },
            count: { $sum: "$count" },
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "_id.userId",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, muteNotification: 1, deviceToken: 1 } },
            ],
            as: "_id.userId",
          },
        },
        {
          $unwind: "$_id.userId",
        },
        {
          $project: {
            userId: "$_id.userId",
            count: 1,
          },
        },
      ]);
      console.log(allMembersListDetail, "allMembersListDetail2");
      // const allMembersListDetail = await chatList.find({ userId: {$in: allMembersIds}}).populate("userId", {muteNotification: 1, deviceToken: 1, }).select("userId count").lean();
      // console.log(allMembersListDetail, "userId");
      if (
        image_video !== undefined &&
        image_video.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < image_video.length; i++) {
          // if user only send media in a group
          let notificationTemplate =
            await notification_template.send_media_into_group(data);
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "send_media_into_group",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            }
          });
          await Notification.insertMany(notificationDatabaseEntry);
        }
      } else if (
        other_files !== undefined &&
        other_files.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < other_files.length; i++) {
          // if user only send media in a group
          let notificationTemplate =
            await notification_template.send_file_into_group(data);
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "send_file_into_group",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      } else {
        if (quotemsg !== "" && quotemsg !== undefined && quotemsg !== null) {
          let notificationTemplate =
            await notification_template.send_msg_into_group_replay(data);
          let mentionNotificationTemplate =
            await notification_template.user_mention_member_group({
              senderName: senderData.otherdetail
                ? senderData.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  senderData.otherdetail[process.env.USER_LN_ID]
                : "",
              recipentName: recipentData.groupTitle
                ? recipentData.groupTitle
                : "",
              chatType: type,
              messageType: message_type,
              message: messageData,
            });
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              !taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "send_msg_into_group_replay",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            } else if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let mentionDeviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: mentionNotificationTemplate?.template?.title,
                body: mentionNotificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let mentionNotificationData = {
                notification: mentionNotificationTemplate?.template?.title,
                description: mentionNotificationTemplate?.template?.body,
                device_token: mentionDeviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "user_mention_member_group",
                  content: chatData,
                },
              };
              send_notification(mentionNotificationData);
            }
          });
          await Notification.insertMany(notificationDatabaseEntry);
        } else {
          let notificationTemplate =
            await notification_template.send_msg_into_group(data);
          let mentionNotificationTemplate =
            await notification_template.user_mention_member_group({
              senderName: senderData.otherdetail
                ? senderData.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  senderData.otherdetail[process.env.USER_LN_ID]
                : "",
              recipentName: recipentData.groupTitle
                ? recipentData.groupTitle
                : "",
              chatType: type,
              messageType: message_type,
              message: messageData,
            });
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              !taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "send_msg_into_group",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            } else if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let mentionDeviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: mentionNotificationTemplate?.template?.title,
                body: mentionNotificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let mentionNotificationData = {
                notification: mentionNotificationTemplate?.template?.title,
                description: mentionNotificationTemplate?.template?.body,
                device_token: mentionDeviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "user_mention_member_group",
                  content: chatData,
                },
              };
              send_notification(mentionNotificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      }
    } else if (type.toLowerCase() === "chatchannel") {
      let senderName = "",
        senderImage = "";

      if (senderData.auth0Id !== "" && senderData.auth0Id !== null) {
        senderName = senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "";
        senderImage = senderData.profileImg ? senderData.profileImg : "";
      } else {
        senderName = senderData?.attendeeDetail?.name
          ? senderData?.attendeeDetail?.name
          : "";
        senderImage = senderData.profileImg ? senderData.profileImg : "";
      }

      recipentData = await chatChannel.findOne({
        _id: new ObjectId(recipient),
      });
      members = await chatChannelMembers.find({
        channelId: new ObjectId(recipient),
      });
      let allMembersIds = members
        .filter(async (member) => {
          if (member.userId._id.toString() !== senderData._id.toString()) {
            return member;
          }
        })
        .map((allIds) => {
          return ObjectId(allIds.userId._id);
        });
      const allMembersListDetail = await chatList.aggregate([
        {
          $match: {
            userId: { $in: allMembersIds },
          },
        },
        {
          $group: {
            _id: { userId: "$userId" },
            count: { $sum: "$count" },
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "_id.userId",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, muteNotification: 1, deviceToken: 1 } },
            ],
            as: "_id.userId",
          },
        },
        {
          $unwind: "$_id.userId",
        },
        {
          $project: {
            userId: "$_id.userId",
            count: 1,
          },
        },
      ]);
      // const allMembersListDetail = await chatList.find({ userId: {$in: allMembersIds}, receiverId: recipentData._id}).populate("userId", {muteNotification: 1, deviceToken: 1}).select("userId count").lean();
      console.log(allMembersListDetail, "allMembersListDetail");
      chatData = {
        senderId: senderData._id,
        senderName: senderName,
        senderImage: senderImage,
        recipentId: recipentData._id,
        recipentName: recipentData.channelName ? recipentData.channelName : "",
        recipentImage: recipentData.channelIcon ? recipentData.channelIcon : "",
        chatType: type,
        messageType: message_type,
      };

      data = {
        senderName: senderName,
        recipentName: recipentData.channelName ? recipentData.channelName : "",
        chatType: type,
        messageType: message_type,
        message: messageData,
      };

      if (
        image_video !== undefined &&
        image_video.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < image_video.length; i++) {
          // if user only send media in a group
          let notificationTemplate =
            await notification_template.send_media_into_channel(data);
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              console.log(member.count, "member");
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "send_media_into_channel",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      } else if (
        other_files !== undefined &&
        other_files.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < other_files.length; i++) {
          // if user only send media in a group
          let notificationTemplate =
            await notification_template.send_file_into_channel(data);
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "send_file_into_channel",
                  content: chatData,
                },
              };
              console.log("sending notification", deviceTokenArray);
              send_notification(notificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      } else {
        if (quotemsg !== "" && quotemsg !== undefined && quotemsg !== null) {
          let notificationTemplate =
            await notification_template.send_msg_into_channel_replay(data);
          let mentionNotificationTemplate =
            await notification_template.user_mention_member_channel({
              senderName: senderData.otherdetail
                ? senderData.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  senderData.otherdetail[process.env.USER_LN_ID]
                : "",
              recipentName: recipentData.channelName
                ? recipentData.channelName
                : "",
              chatType: type,
              messageType: message_type,
              message: messageData,
            });
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.muteNotification
              ? member.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              !taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "send_msg_into_channel_replay",
                  content: chatData,
                },
              };
              console.log(member.count, "notificationData");
              send_notification(notificationData);
            } else if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let mentionDeviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: mentionNotificationTemplate?.template?.title,
                body: mentionNotificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              let mentionNotificationData = {
                notification: mentionNotificationTemplate?.template?.title,
                description: mentionNotificationTemplate?.template?.body,
                device_token: mentionDeviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "user_mention_member_channel",
                  content: chatData,
                },
              };
              send_notification(mentionNotificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        } else {
          let notificationTemplate =
            await notification_template.send_msg_into_channel(data);
          let mentionNotificationTemplate =
            await notification_template.user_mention_member_channel({
              senderName: senderData.otherdetail
                ? senderData.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  senderData.otherdetail[process.env.USER_LN_ID]
                : "",
              recipentName: recipentData.channelName
                ? recipentData.channelName
                : "",
              chatType: type,
              messageType: message_type,
              message: messageData,
            });
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            console.log(member, "member");

            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              !taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "send_msg_into_channel",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            } else if (
              member.deviceToken &&
              member.deviceToken.length &&
              isUnMute &&
              taggedUserId.includes(member._id.toString()) &&
              senderData._id.toString() !== member._id.toString()
            ) {
              let mentionDeviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: mentionNotificationTemplate?.template?.title,
                body: mentionNotificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member._id,
                role: "chatChannel",
              });
              let mentionNotificationData = {
                notification: mentionNotificationTemplate?.template?.title,
                description: mentionNotificationTemplate?.template?.body,
                device_token: mentionDeviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "user_mention_member_channel",
                  content: chatData,
                },
              };
              send_notification(mentionNotificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      }
    }
  } catch (error) {
    console.log(error, "error");
    return {
      status: false,
      message: "Inernal server error!",
      error: `${error.message}`,
    };
  }
};

// setup and send notification in case of add member in user chat group
exports.setupAddMemberNotification = async (authUserId, groupId, addMember) => {
  try {
    let members = addMember;
    let chatData = {},
      data = {};
    let senderData = await User.findOne({ _id: new ObjectId(authUserId) });
    let recipentData = await userChatGroup.findOne({
      _id: new ObjectId(groupId),
    });

    chatData = {
      senderId: senderData._id,
      senderName: senderData.otherdetail
        ? senderData.otherdetail[process.env.USER_FN_ID] +
          " " +
          senderData.otherdetail[process.env.USER_LN_ID]
        : "",
      senderImage: senderData.profileImg,
      recipentId: recipentData._id,
      recipentName: recipentData.groupTitle ? recipentData.groupTitle : "",
      recipentImage: recipentData.groupImage,
      chatType: "userChatGroup",
    };

    data = {
      senderName: senderData.otherdetail
        ? senderData.otherdetail[process.env.USER_FN_ID] +
          " " +
          senderData.otherdetail[process.env.USER_LN_ID]
        : "",
      recipentName: recipentData.groupTitle ? recipentData.groupTitle : "",
      chatType: "userChatGroup",
    };

    let notificationTemplate = await notification_template.add_member_group(
      data
    );
    const allMembersListDetail = await chatList.aggregate([
      {
        $match: {
          userId: {
            $in: members.map((member) => {
              return ObjectId(member);
            }),
          },
        },
      },
      {
        $group: {
          _id: { userId: "$userId" },
          count: { $sum: "$count" },
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "_id.userId",
          foreignField: "_id",
          pipeline: [
            { $project: { _id: 1, muteNotification: 1, deviceToken: 1 } },
          ],
          as: "_id.userId",
        },
      },
      {
        $unwind: "$_id.userId",
      },
      {
        $project: {
          userId: "$_id.userId",
          count: 1,
        },
      },
    ]);
    // const allMembersListDetail = await chatList.find({ userId: {$in: members.map((member)=>{ return ObjectId(member); }) }, receiverId: recipentData._id}).populate("userId", {muteNotification: 1, deviceToken: 1}).select("userId count").lean()
    let notificationDatabaseEntry = [];
    allMembersListDetail.forEach((member) => {
      let isUnMute = member.userId.muteNotification
        ? member.userId.muteNotification.filter((chat) => {
            if (chat && chat.toString() === recipentData._id.toString()) {
              return chat;
            }
          }).length > 0
          ? false
          : true
        : true;
      if (
        member.userId.deviceToken &&
        member.userId.deviceToken.length &&
        isUnMute &&
        senderData._id.toString() !== member.userId._id.toString()
      ) {
        deviceTokenArray = member.userId.deviceToken;
        notificationDatabaseEntry.push({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: senderData._id,
          createdFor: member.userId._id,
          role: "userChatGroup",
        });
        let notificationData = {
          notification: notificationTemplate?.template?.title,
          description: notificationTemplate?.template?.body,
          device_token: deviceTokenArray,
          collapse_key: recipentData._id,
          badge_count: member.count,
          sub_title:
            "To " + recipentData.groupTitle ? recipentData.groupTitle : "",
          notification_data: {
            type: "add_member_group",
            content: chatData,
          },
        };
        send_notification(notificationData);
      }
    });

    await Notification.insertMany(notificationDatabaseEntry);
  } catch (error) {
    console.log(error, "error");
    return {
      status: false,
      message: "Inernal server error!",
      error: `${error.message}`,
    };
  }
};

// setup and send notification in case of add member in chat channel
exports.AddMemberChannelNotification = async (channelId, addMember) => {
  try {
    let members = addMember;
    let chatData = {},
      data = {};
    let recipentData = await chatChannel.findOne({
      _id: new ObjectId(channelId),
    });

    chatData = {
      senderId: process.env.ADMIN_ID,
      senderName: "Admin",
      senderImage: "",
      recipentId: recipentData._id,
      recipentName: recipentData.channelName ? recipentData.channelName : "",
      recipentImage: recipentData.channelIcon ? recipentData.channelIcon : "",
      chatType: "chatChannel",
    };

    data = {
      senderName: "Admin",
      recipentName: recipentData.channelName ? recipentData.channelName : "",
      chatType: "chatChannel",
    };

    let notificationTemplate = await notification_template.add_member_channel(
      data
    );
    const allMembersListDetail = await chatList.aggregate([
      {
        $match: {
          userId: {
            $in: members.map((member) => {
              return ObjectId(member);
            }),
          },
        },
      },
      {
        $group: {
          _id: { userId: "$userId" },
          count: { $sum: "$count" },
        },
      },
      {
        $lookup: {
          from: "airtable-syncs",
          localField: "_id.userId",
          foreignField: "_id",
          pipeline: [
            { $project: { _id: 1, muteNotification: 1, deviceToken: 1 } },
          ],
          as: "_id.userId",
        },
      },
      {
        $unwind: "$_id.userId",
      },
      {
        $project: {
          userId: "$_id.userId",
          count: 1,
        },
      },
    ]);
    // const allMembersListDetail = await chatList.find({ userId: {$in: members.map((member)=>{ return ObjectId(member); }) }, receiverId: recipentData._id}).populate("userId", {muteNotification: 1, deviceToken: 1}).select("userId count").lean()
    let notificationDatabaseEntry = [];
    allMembersListDetail.forEach((member) => {
      let isUnMute = member.userId.muteNotification
        ? member.userId.muteNotification.filter((chat) => {
            if (chat && chat.toString() === recipentData._id.toString()) {
              return chat;
            }
          }).length > 0
          ? false
          : true
        : true;
      if (
        member.userId.deviceToken &&
        member.userId.deviceToken.length &&
        isUnMute
      ) {
        let deviceTokenArray = member.userId.deviceToken;
        notificationDatabaseEntry.push({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: senderData._id,
          createdFor: member.userId._id,
          role: "chatChannel",
        });
        let notificationData = {
          notification: notificationTemplate?.template?.title,
          description: notificationTemplate?.template?.body,
          device_token: deviceTokenArray,
          collapse_key: recipentData._id,
          badge_count: member.count,
          sub_title:
            "To " + recipentData.channelName ? recipentData.channelName : "",
          notification_data: {
            type: "add_member_channel",
            content: chatData,
          },
        };
        send_notification(notificationData);
      }
    });

    await Notification.insertMany(notificationDatabaseEntry);
  } catch (error) {
    console.log(error, "error");
    return {
      status: false,
      message: "Inernal server error!",
      error: `${error.message}`,
    };
  }
};

// mute chat for user API
exports.muteChat = async (req, res) => {
  try {
    const body = req.body;
    const userData = await User.findById(req.authUserId);
    var muteNotification;
    console.log(
      userData.muteNotification.filter((mute) => {
        if (mute.toString() === body.chatId.toString()) return mute;
      }).length,
      "fsdfsdf"
    );
    if (
      userData &&
      userData.muteNotification &&
      userData.muteNotification.length === 1 &&
      userData.muteNotification.filter((mute) => {
        if (mute.toString() === body.chatId.toString()) return mute;
      }).length > 0
    ) {
      muteNotification = await User.findByIdAndUpdate(
        userData._id,
        {
          muteNotification: [],
        },
        { new: true }
      );
    } else if (
      userData &&
      userData.muteNotification &&
      userData.muteNotification.length > 1 &&
      userData.muteNotification.filter((mute) => {
        if (mute.toString() === body.chatId.toString()) return mute;
      }).length > 0
    ) {
      muteNotification = await User.findByIdAndUpdate(
        userData._id,
        {
          $pull: { muteNotification: body.chatId },
        },
        { new: true }
      );
    } else if (
      userData &&
      userData.muteNotification &&
      userData.muteNotification.length &&
      userData.muteNotification.filter((mute) => {
        if (mute.toString() === body.chatId.toString()) return mute;
      }).length === 0
    ) {
      muteNotification = await User.findByIdAndUpdate(
        userData._id,
        {
          $push: { muteNotification: body.chatId },
        },
        { new: true }
      );
    } else if (userData) {
      muteNotification = await User.findByIdAndUpdate(
        userData._id,
        {
          muteNotification: [body.chatId],
        },
        { new: true }
      );
    }
    if (muteNotification) {
      return res.status(200).json({
        status: true,
        message: "user mute chat updated!",
        data: muteNotification,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// setup and send notification in case of send message
exports.setupNSendNotificationLatest = async (
  message,
  recipient,
  sender,
  type,
  images,
  videos,
  documents,
  voiceNotes,
  quotemsg,
  message_type,
  taggedUserId
) => {
  try {
    let recipentData = [],
      members = [];
    let chatData = {},
      data = {};
    let senderData = await User.findOne({ _id: new ObjectId(sender) });
    let messageData = message;
    let Senderonline = await chat_user.findOne({
      userid: new ObjectId(sender),
    });
    if (
      messageData !== "" &&
      messageData !== null &&
      messageData !== undefined
    ) {
      messageData = message ? message : "";
      var messageData2 = [];
      const messageArr = messageData.split(" ");
      const taggedUserDetail = taggedUserId
        ? await User.find({
            _id: {
              $in: taggedUserId.map((ids) => {
                return ObjectId(ids);
              }),
            },
          })
            .select({ otherdetail: 1, attendeeDetail: 1, auth0Id: 1 })
            .lean()
        : [];
      let resOrder = messageArr.map(async (item, i) => {
        if (item.startsWith("@")) {
          item = item.replace("@", "");
          let mentionUserName = "";
          let userId = taggedUserDetail.filter((users) => {
            if (users._id.toString() === item.trim()) return users;
          })[0];
          if (userId !== null) {
            mentionUserName += "@";
            mentionUserName +=
              userId.auth0Id !== null && userId.auth0Id !== ""
                ? userId.otherdetail
                  ? userId.otherdetail[process.env.USER_FN_ID] +
                    " " +
                    userId.otherdetail[process.env.USER_LN_ID]
                  : typeof userId.attendeeDetail === "object"
                  ? userId.attendeeDetail.name
                  : ""
                : "";
          } else {
            mentionUserName = "@" + item;
          }
          messageData2.push(mentionUserName);
        } else {
          messageData2.push(item);
        }
      });
      await Promise.all([...resOrder]);

      let messageDetails = messageData2.join(" ");
      messageData =
        messageDetails.length > 50
          ? messageDetails.substring(0, 50) + " ..."
          : messageDetails;
    }

    if (type === "user") {
      recipentData = await User.findOne({ _id: new ObjectId(recipient) });
      let unReadCount = await this.checkIfMsgReadSocket(recipient);
      console.log("sending notification");
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
            " " +
            recipentData.otherdetail[process.env.USER_LN_ID]
          : "",
        recipentImage: recipentData.profileImg,
        chatType: type,
        messageType: message_type,
        online: Senderonline.online,
      };

      data = {
        senderName: senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "",
        recipentName: recipentData.otherdetail
          ? recipentData.otherdetail[process.env.USER_FN_ID] +
            " " +
            recipentData.otherdetail[process.env.USER_LN_ID]
          : "",
        chatType: type,
        messageType: message_type,
        message: messageData,
      };

      const alreadyMute = await User.findOne(
        {
          _id: recipentData._id,
          muteNotification: { $in: [senderData._id.toString()] },
        },
        { muteNotification: 1 }
      );

      // if user send media or otherfile
      if (
        ((images !== undefined && images.length > 0) ||
          (videos !== undefined && videos.length > 0)) &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        if (images) {
          for (var i = 0; i < images.length; i++) {
            // if user only send media
            let notificationTemplate =
              await notification_template.send_one_on_one_media(data);
            let userDeviceToken = await User.findOne(
              { _id: recipentData._id },
              { deviceToken: 1 }
            );
            if (alreadyMute === nullzsce4rg) {
              if (userDeviceToken.deviceToken.length !== 0) {
                await new Notification({
                  title: notificationTemplate?.template?.title,
                  body: notificationTemplate?.template?.body,
                  createdBy: senderData._id,
                  createdFor: recipentData._id,
                  role: "user",
                }).save();

                let successdata = {
                  notification: notificationTemplate?.template?.title,
                  description: notificationTemplate?.template?.body,
                  device_token: userDeviceToken.deviceToken,
                  collapse_key: senderData._id,
                  badge_count: unReadCount,
                  notification_data: {
                    type: "send_one_on_one_media",
                    content: chatData,
                  },
                };
                send_notification(successdata);
              }
            }
          }
        }
        if (videos) {
          for (var i = 0; i < videos.length; i++) {
            // if user only send media
            let notificationTemplate =
              await notification_template.send_one_on_one_media(data);
            let userDeviceToken = await User.findOne(
              { _id: recipentData._id },
              { deviceToken: 1 }
            );
            if (alreadyMute === null) {
              if (userDeviceToken.deviceToken.length !== 0) {
                await new Notification({
                  title: notificationTemplate?.template?.title,
                  body: notificationTemplate?.template?.body,
                  createdBy: senderData._id,
                  createdFor: recipentData._id,
                  role: "user",
                }).save();

                let successdata = {
                  notification: notificationTemplate?.template?.title,
                  description: notificationTemplate?.template?.body,
                  device_token: userDeviceToken.deviceToken,
                  collapse_key: senderData._id,
                  badge_count: unReadCount,
                  notification_data: {
                    type: "send_one_on_one_media",
                    content: chatData,
                  },
                };
                send_notification(successdata);
              }
            }
          }
        }
      } else if (
        documents !== undefined &&
        documents.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < documents.length; i++) {
          // if user send other file
          let notificationTemplate =
            await notification_template.send_one_on_one_file(data);
          let userDeviceToken = await User.findOne(
            { _id: recipentData._id },
            { deviceToken: 1 }
          );
          if (alreadyMute === null) {
            if (userDeviceToken.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: recipentData._id,
                role: "user",
              }).save();

              let successdata = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: userDeviceToken.deviceToken,
                collapse_key: senderData._id,
                badge_count: unReadCount,
                notification_data: {
                  type: "send_one_on_one_file",
                  content: chatData,
                },
              };
              send_notification(successdata);
            }
          }
        }
      } else {
        if (quotemsg !== "" && quotemsg !== undefined && quotemsg !== null) {
          let notificationTemplate =
            await notification_template.send_one_on_one_msg_replay(data);
          let userDeviceToken = await User.findOne(
            { _id: recipentData._id },
            { deviceToken: 1 }
          );
          if (alreadyMute === null) {
            if (userDeviceToken.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: recipentData._id,
                role: "user",
              }).save();

              let successdata = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: userDeviceToken.deviceToken,
                collapse_key: senderData._id,
                badge_count: unReadCount,
                notification_data: {
                  type: "send_one_on_one_msg_replay",
                  content: chatData,
                },
              };
              send_notification(successdata);
            }
          }
        } else {
          let notificationTemplate =
            await notification_template.send_one_on_one_msg(data);
          let userDeviceToken = await User.findOne(
            { _id: recipentData._id },
            { deviceToken: 1 }
          );
          if (alreadyMute === null) {
            if (userDeviceToken.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: recipentData._id,
                role: "user",
              }).save();

              let successdata = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: userDeviceToken.deviceToken,
                collapse_key: senderData._id,
                badge_count: unReadCount,
                notification_data: {
                  type: "send_one_on_one_msg",
                  content: chatData,
                },
              };
              // console.log(successdata, "successdata");
              send_notification(successdata);
            }
          }
        }
      }
    } else if (type.toLowerCase() === "userchatgroup") {
      recipentData = await userChatGroup.findOne({
        _id: new ObjectId(recipient),
      });
      members = await userChatGroupMember.find({
        groupId: new ObjectId(recipient),
      });

      chatData = {
        senderId: senderData._id,
        senderName: senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "",
        senderImage: senderData.profileImg,
        recipentId: recipentData._id,
        recipentName: recipentData.groupTitle ? recipentData.groupTitle : "",
        recipentImage: recipentData.groupImage,
        chatType: type,
        messageType: message_type,
      };

      data = {
        senderName: senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "",
        recipentName: recipentData.groupTitle ? recipentData.groupTitle : "",
        chatType: type,
        messageType: message_type,
        message: messageData,
      };
      let allMembersIds = members
        .filter(async (member) => {
          if (member.userId._id.toString() !== senderData._id.toString()) {
            return member;
          }
        })
        .map((allIds) => {
          return ObjectId(allIds.userId._id);
        });
      console.log(allMembersIds, "allMembersIds");
      // const allMembersListDetail = await User.find({_id: {$in: allMembersIds }}).select("muteNotification deviceToken").lean();
      const allMembersListDetail = await chatList.aggregate([
        {
          $match: {
            userId: { $in: allMembersIds },
          },
        },
        {
          $group: {
            _id: { userId: "$userId" },
            count: { $sum: "$count" },
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "_id.userId",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, muteNotification: 1, deviceToken: 1 } },
            ],
            as: "_id.userId",
          },
        },
        {
          $unwind: "$_id.userId",
        },
        {
          $project: {
            userId: "$_id.userId",
            count: 1,
          },
        },
      ]);
      console.log(allMembersListDetail, "allMembersListDetail2");
      // const allMembersListDetail = await chatList.find({ userId: {$in: allMembersIds}}).populate("userId", {muteNotification: 1, deviceToken: 1, }).select("userId count").lean();
      // console.log(allMembersListDetail, "userId");
      if (
        ((images !== undefined && images.length > 0) ||
          (videos !== undefined && videos.length > 0)) &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        if (images) {
          for (var i = 0; i < images.length; i++) {
            // if user only send media in a group
            let notificationTemplate =
              await notification_template.send_media_into_group(data);
            let notificationDatabaseEntry = [];
            allMembersListDetail.forEach((member) => {
              let isUnMute = member.userId.muteNotification
                ? member.userId.muteNotification.filter((chat) => {
                    if (
                      chat &&
                      chat.toString() === recipentData._id.toString()
                    ) {
                      return chat;
                    }
                  }).length > 0
                  ? false
                  : true
                : true;
              if (
                member.userId.deviceToken &&
                member.userId.deviceToken.length &&
                isUnMute &&
                senderData._id.toString() !== member.userId._id.toString()
              ) {
                let deviceTokenArray = member.userId.deviceToken;
                notificationDatabaseEntry.push({
                  title: notificationTemplate?.template?.title,
                  body: notificationTemplate?.template?.body,
                  createdBy: senderData._id,
                  createdFor: member.userId._id,
                  role: "userChatGroup",
                });
                let notificationData = {
                  notification: notificationTemplate?.template?.title,
                  description: notificationTemplate?.template?.body,
                  device_token: deviceTokenArray,
                  collapse_key: recipentData._id,
                  badge_count: member.count,
                  sub_title:
                    "To " + recipentData.groupTitle
                      ? recipentData.groupTitle
                      : "",
                  notification_data: {
                    type: "send_media_into_group",
                    content: chatData,
                  },
                };
                send_notification(notificationData);
              }
            });
            await Notification.insertMany(notificationDatabaseEntry);
          }
        }
        if (videos) {
          for (var i = 0; i < videos.length; i++) {
            // if user only send media in a group
            let notificationTemplate =
              await notification_template.send_media_into_group(data);
            let notificationDatabaseEntry = [];
            allMembersListDetail.forEach((member) => {
              let isUnMute = member.userId.muteNotification
                ? member.userId.muteNotification.filter((chat) => {
                    if (
                      chat &&
                      chat.toString() === recipentData._id.toString()
                    ) {
                      return chat;
                    }
                  }).length > 0
                  ? false
                  : true
                : true;
              if (
                member.userId.deviceToken &&
                member.userId.deviceToken.length &&
                isUnMute &&
                senderData._id.toString() !== member.userId._id.toString()
              ) {
                let deviceTokenArray = member.userId.deviceToken;
                notificationDatabaseEntry.push({
                  title: notificationTemplate?.template?.title,
                  body: notificationTemplate?.template?.body,
                  createdBy: senderData._id,
                  createdFor: member.userId._id,
                  role: "userChatGroup",
                });
                let notificationData = {
                  notification: notificationTemplate?.template?.title,
                  description: notificationTemplate?.template?.body,
                  device_token: deviceTokenArray,
                  collapse_key: recipentData._id,
                  badge_count: member.count,
                  sub_title:
                    "To " + recipentData.groupTitle
                      ? recipentData.groupTitle
                      : "",
                  notification_data: {
                    type: "send_media_into_group",
                    content: chatData,
                  },
                };
                send_notification(notificationData);
              }
            });
            await Notification.insertMany(notificationDatabaseEntry);
          }
        }
      } else if (
        documents !== undefined &&
        documents.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < documents.length; i++) {
          // if user only send media in a group
          let notificationTemplate =
            await notification_template.send_file_into_group(data);
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "send_file_into_group",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      } else {
        if (quotemsg !== "" && quotemsg !== undefined && quotemsg !== null) {
          let notificationTemplate =
            await notification_template.send_msg_into_group_replay(data);
          let mentionNotificationTemplate =
            await notification_template.user_mention_member_group({
              senderName: senderData.otherdetail
                ? senderData.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  senderData.otherdetail[process.env.USER_LN_ID]
                : "",
              recipentName: recipentData.groupTitle
                ? recipentData.groupTitle
                : "",
              chatType: type,
              messageType: message_type,
              message: messageData,
            });
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              !taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "send_msg_into_group_replay",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            } else if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let mentionDeviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: mentionNotificationTemplate?.template?.title,
                body: mentionNotificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let mentionNotificationData = {
                notification: mentionNotificationTemplate?.template?.title,
                description: mentionNotificationTemplate?.template?.body,
                device_token: mentionDeviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "user_mention_member_group",
                  content: chatData,
                },
              };
              send_notification(mentionNotificationData);
            }
          });
          await Notification.insertMany(notificationDatabaseEntry);
        } else {
          let notificationTemplate =
            await notification_template.send_msg_into_group(data);
          let mentionNotificationTemplate =
            await notification_template.user_mention_member_group({
              senderName: senderData.otherdetail
                ? senderData.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  senderData.otherdetail[process.env.USER_LN_ID]
                : "",
              recipentName: recipentData.groupTitle
                ? recipentData.groupTitle
                : "",
              chatType: type,
              messageType: message_type,
              message: messageData,
            });
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              !taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "send_msg_into_group",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            } else if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let mentionDeviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: mentionNotificationTemplate?.template?.title,
                body: mentionNotificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "userChatGroup",
              });
              let mentionNotificationData = {
                notification: mentionNotificationTemplate?.template?.title,
                description: mentionNotificationTemplate?.template?.body,
                device_token: mentionDeviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.groupTitle
                    ? recipentData.groupTitle
                    : "",
                notification_data: {
                  type: "user_mention_member_group",
                  content: chatData,
                },
              };
              send_notification(mentionNotificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      }
    } else if (type.toLowerCase() === "chatchannel") {
      let senderName = "",
        senderImage = "";

      if (senderData.auth0Id !== "" && senderData.auth0Id !== null) {
        senderName = senderData.otherdetail
          ? senderData.otherdetail[process.env.USER_FN_ID] +
            " " +
            senderData.otherdetail[process.env.USER_LN_ID]
          : "";
        senderImage = senderData.profileImg ? senderData.profileImg : "";
      } else {
        senderName = senderData?.attendeeDetail?.name
          ? senderData?.attendeeDetail?.name
          : "";
        senderImage = senderData.profileImg ? senderData.profileImg : "";
      }

      recipentData = await chatChannel.findOne({
        _id: new ObjectId(recipient),
      });
      members = await chatChannelMembers.find({
        channelId: new ObjectId(recipient),
      });
      let allMembersIds = members
        .filter(async (member) => {
          if (member.userId._id.toString() !== senderData._id.toString()) {
            return member;
          }
        })
        .map((allIds) => {
          return ObjectId(allIds.userId._id);
        });
      const allMembersListDetail = await chatList.aggregate([
        {
          $match: {
            userId: { $in: allMembersIds },
          },
        },
        {
          $group: {
            _id: { userId: "$userId" },
            count: { $sum: "$count" },
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            localField: "_id.userId",
            foreignField: "_id",
            pipeline: [
              { $project: { _id: 1, muteNotification: 1, deviceToken: 1 } },
            ],
            as: "_id.userId",
          },
        },
        {
          $unwind: "$_id.userId",
        },
        {
          $project: {
            userId: "$_id.userId",
            count: 1,
          },
        },
      ]);
      // const allMembersListDetail = await chatList.find({ userId: {$in: allMembersIds}, receiverId: recipentData._id}).populate("userId", {muteNotification: 1, deviceToken: 1}).select("userId count").lean();
      console.log(allMembersListDetail, "allMembersListDetail");
      chatData = {
        senderId: senderData._id,
        senderName: senderName,
        senderImage: senderImage,
        recipentId: recipentData._id,
        recipentName: recipentData.channelName ? recipentData.channelName : "",
        recipentImage: recipentData.channelIcon ? recipentData.channelIcon : "",
        chatType: type,
        messageType: message_type,
      };

      data = {
        senderName: senderName,
        recipentName: recipentData.channelName ? recipentData.channelName : "",
        chatType: type,
        messageType: message_type,
        message: messageData,
      };

      if (
        ((images !== undefined && images.length > 0) ||
          (videos !== undefined && videos.length > 0)) &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        if (images) {
          for (var i = 0; i < images.length; i++) {
            // if user only send media in a group
            let notificationTemplate =
              await notification_template.send_media_into_channel(data);
            let notificationDatabaseEntry = [];
            allMembersListDetail.forEach((member) => {
              let isUnMute = member.userId.muteNotification
                ? member.userId.muteNotification.filter((chat) => {
                    if (
                      chat &&
                      chat.toString() === recipentData._id.toString()
                    ) {
                      return chat;
                    }
                  }).length > 0
                  ? false
                  : true
                : true;
              if (
                member.userId.deviceToken &&
                member.userId.deviceToken.length &&
                isUnMute &&
                senderData._id.toString() !== member.userId._id.toString()
              ) {
                let deviceTokenArray = member.userId.deviceToken;
                notificationDatabaseEntry.push({
                  title: notificationTemplate?.template?.title,
                  body: notificationTemplate?.template?.body,
                  createdBy: senderData._id,
                  createdFor: member.userId._id,
                  role: "chatChannel",
                });
                console.log(member.count, "member");
                let notificationData = {
                  notification: notificationTemplate?.template?.title,
                  description: notificationTemplate?.template?.body,
                  device_token: deviceTokenArray,
                  collapse_key: recipentData._id,
                  badge_count: member.count,
                  sub_title:
                    "To " + recipentData.channelName
                      ? recipentData.channelName
                      : "",
                  notification_data: {
                    type: "send_media_into_channel",
                    content: chatData,
                  },
                };
                send_notification(notificationData);
              }
            });

            await Notification.insertMany(notificationDatabaseEntry);
          }
        }
        if (videos) {
          for (var i = 0; i < videos.length; i++) {
            // if user only send media in a group
            let notificationTemplate =
              await notification_template.send_media_into_channel(data);
            let notificationDatabaseEntry = [];
            allMembersListDetail.forEach((member) => {
              let isUnMute = member.userId.muteNotification
                ? member.userId.muteNotification.filter((chat) => {
                    if (
                      chat &&
                      chat.toString() === recipentData._id.toString()
                    ) {
                      return chat;
                    }
                  }).length > 0
                  ? false
                  : true
                : true;
              if (
                member.userId.deviceToken &&
                member.userId.deviceToken.length &&
                isUnMute &&
                senderData._id.toString() !== member.userId._id.toString()
              ) {
                let deviceTokenArray = member.userId.deviceToken;
                notificationDatabaseEntry.push({
                  title: notificationTemplate?.template?.title,
                  body: notificationTemplate?.template?.body,
                  createdBy: senderData._id,
                  createdFor: member.userId._id,
                  role: "chatChannel",
                });
                console.log(member.count, "member");
                let notificationData = {
                  notification: notificationTemplate?.template?.title,
                  description: notificationTemplate?.template?.body,
                  device_token: deviceTokenArray,
                  collapse_key: recipentData._id,
                  badge_count: member.count,
                  sub_title:
                    "To " + recipentData.channelName
                      ? recipentData.channelName
                      : "",
                  notification_data: {
                    type: "send_media_into_channel",
                    content: chatData,
                  },
                };
                send_notification(notificationData);
              }
            });

            await Notification.insertMany(notificationDatabaseEntry);
          }
        }
      } else if (
        documents !== undefined &&
        documents.length > 0 &&
        (quotemsg === null || quotemsg === "" || quotemsg === undefined)
      ) {
        for (var i = 0; i < documents.length; i++) {
          // if user only send media in a group
          let notificationTemplate =
            await notification_template.send_file_into_channel(data);
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "send_file_into_channel",
                  content: chatData,
                },
              };
              console.log("sending notification", deviceTokenArray);
              send_notification(notificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      } else {
        if (quotemsg !== "" && quotemsg !== undefined && quotemsg !== null) {
          let notificationTemplate =
            await notification_template.send_msg_into_channel_replay(data);
          let mentionNotificationTemplate =
            await notification_template.user_mention_member_channel({
              senderName: senderData.otherdetail
                ? senderData.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  senderData.otherdetail[process.env.USER_LN_ID]
                : "",
              recipentName: recipentData.channelName
                ? recipentData.channelName
                : "",
              chatType: type,
              messageType: message_type,
              message: messageData,
            });
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            let isUnMute = member.muteNotification
              ? member.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              !taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "send_msg_into_channel_replay",
                  content: chatData,
                },
              };
              console.log(member.count, "notificationData");
              send_notification(notificationData);
            } else if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let mentionDeviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: mentionNotificationTemplate?.template?.title,
                body: mentionNotificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              let mentionNotificationData = {
                notification: mentionNotificationTemplate?.template?.title,
                description: mentionNotificationTemplate?.template?.body,
                device_token: mentionDeviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "user_mention_member_channel",
                  content: chatData,
                },
              };
              send_notification(mentionNotificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        } else {
          let notificationTemplate =
            await notification_template.send_msg_into_channel(data);
          let mentionNotificationTemplate =
            await notification_template.user_mention_member_channel({
              senderName: senderData.otherdetail
                ? senderData.otherdetail[process.env.USER_FN_ID] +
                  " " +
                  senderData.otherdetail[process.env.USER_LN_ID]
                : "",
              recipentName: recipentData.channelName
                ? recipentData.channelName
                : "",
              chatType: type,
              messageType: message_type,
              message: messageData,
            });
          let notificationDatabaseEntry = [];
          allMembersListDetail.forEach((member) => {
            console.log(member, "member");

            let isUnMute = member.userId.muteNotification
              ? member.userId.muteNotification.filter((chat) => {
                  if (chat && chat.toString() === recipentData._id.toString()) {
                    return chat;
                  }
                }).length > 0
                ? false
                : true
              : true;
            if (
              member.userId.deviceToken &&
              member.userId.deviceToken.length &&
              isUnMute &&
              !taggedUserId.includes(member.userId._id.toString()) &&
              senderData._id.toString() !== member.userId._id.toString()
            ) {
              let deviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member.userId._id,
                role: "chatChannel",
              });
              let notificationData = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: deviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "send_msg_into_channel",
                  content: chatData,
                },
              };
              send_notification(notificationData);
            } else if (
              member.deviceToken &&
              member.deviceToken.length &&
              isUnMute &&
              taggedUserId.includes(member._id.toString()) &&
              senderData._id.toString() !== member._id.toString()
            ) {
              let mentionDeviceTokenArray = member.userId.deviceToken;
              notificationDatabaseEntry.push({
                title: mentionNotificationTemplate?.template?.title,
                body: mentionNotificationTemplate?.template?.body,
                createdBy: senderData._id,
                createdFor: member._id,
                role: "chatChannel",
              });
              let mentionNotificationData = {
                notification: mentionNotificationTemplate?.template?.title,
                description: mentionNotificationTemplate?.template?.body,
                device_token: mentionDeviceTokenArray,
                collapse_key: recipentData._id,
                badge_count: member.count,
                sub_title:
                  "To " + recipentData.channelName
                    ? recipentData.channelName
                    : "",
                notification_data: {
                  type: "user_mention_member_channel",
                  content: chatData,
                },
              };
              send_notification(mentionNotificationData);
            }
          });

          await Notification.insertMany(notificationDatabaseEntry);
        }
      }
    }
  } catch (error) {
    console.log(error, "error");
    return {
      status: false,
      message: "Inernal server error!",
      error: `${error.message}`,
    };
  }
};
