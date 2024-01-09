const chat = require("../../database/models/chat");
const User = require("../../database/models/airTableSync");
const userChatGroupMember = require("../../database/models/userChatGroupMember");
const chatChannelMembers = require("../../database/models/chatChannelMembers");
const { ObjectId } = require("mongodb");


// count of files in any chat socket function
exports.countOfMediaSocketLatest = async (chatid, authUserId, type, mediaType) => {
    try {
        console.log(chatid, authUserId, type, mediaType)
      const userid = new ObjectId(authUserId);
      let clearUser = [],
        clearDate = "";
      let chatCount = 0;
  
      const clearUserData = await User.findOne(
        {
          _id: ObjectId(userid),
          clear_chat_data: {
            $elemMatch: { id: new ObjectId(chatid) },
          },
        },
        { "clear_chat_data.$": 1 }
      );
  
      if (clearUserData && !clearUserData.clear_chat_data[0].deleteConversation) {
        clearUser = clearUserData.clear_chat_data[0];
        clearDate = clearUser.date;
      } else if (clearUserData && clearUserData.clear_chat_data[0].deleteConversation) {
        clearUser = clearUserData.clear_chat_data[0];
        clearDate = clearUser.date;
      }
  console.log(clearDate, clearUserData)
      if (type.toLowerCase() === "user") {
        if (clearDate.toString().length > 0) {
          chatCount = await chat.countDocuments({
            $or: [ {$and: [{recipient: new ObjectId(chatid)}, {sender: new ObjectId(authUserId)}]}, {$and: [{sender: new ObjectId(chatid)}, {recipient: new ObjectId(authUserId)}]}],
            message_type: { $regex: ".*" + mediaType + ".*", $options: "i" },
            createdAt: { $gt: clearDate },
          });
        } else {
          chatCount = await chat.countDocuments({
            $or: [ {$and: [{recipient: new ObjectId(chatid)}, {sender: new ObjectId(authUserId)}]}, {$and: [{sender: new ObjectId(chatid)}, {recipient: new ObjectId(authUserId)}]}],
            message_type:  { $regex: ".*" + mediaType + ".*", $options: "i" },
          });
        }
      } else if (type.toLowerCase() === "userchatgroup") {
        console.log(type,  "fdkhghkfdhhhhhhhhhhhhhhh")
        if (clearDate.toString().length > 0) {
          const joined_date = await userChatGroupMember.findOne({
            groupId: ObjectId(chatid),
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
            message_type:  { $regex: ".*"+ mediaType +".*", $options: "i" },
            createdAt: { $gt: clearDate },
          });
        } else {
          const joined_date = await userChatGroupMember.findOne({
            groupId: ObjectId(chatid),
            userId: userid,
            status: 2,
          });
          chatCount = await chat.countDocuments({
            recipient: new ObjectId(chatid),
            message_type: { $regex: ".*"+ mediaType +".*", $options: "i" },
            createdAt: { $gt: joined_date.createdAt },
          });
          console.log( chatCount," chatCount")
        }
      } else if (type.toLowerCase() === "chatchannel") {
        if (clearDate.toString().length > 0) {
          const joined_date = await chatChannelMembers.findOne({
            channelId: ObjectId(chatid),
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
            message_type: { $regex: ".*"+ mediaType +".*", $options: "i" },
            createdAt: { $gt: clearDate },
          });
        } else {
          const joined_date = await chatChannelMembers.findOne({
            channelId: ObjectId(chatid),
            userId: userid,
            status: 2,
            user_type: "airtable-syncs",
          });
          chatCount = await chat.countDocuments({
            recipient: new ObjectId(chatid),
            message_type: { $regex: ".*"+ mediaType +".*", $options: "i" },
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
exports.listOfMediaSocketLatest = async (
    chatid,
    authUserId,
    type,
    pagecnt,
    limitcnt,
    mediaType
  ) => {
    try {
      const userid = new ObjectId(authUserId);
      const page = parseInt(pagecnt);
      const limit = parseInt(limitcnt);
      const skip = (page - 1) * limit;
      const selectOptions = mediaType === "document" ? {_id: 1, documents: 1, createdAt: 1, userTimeStamp: 1, recipient: 0, sender: 0, quote_message_id : 0, taggedUserId: 0} : mediaType === "image" ? {_id: 1, images: 1, createdAt: 1, userTimeStamp: 1, recipient: 0, sender: 0, quote_message_id : 0, taggedUserId: 0} : mediaType === "video" ? {_id: 1, videos: 1, createdAt: 1, userTimeStamp: 1, recipient: 0, sender: 0, quote_message_id : 0, taggedUserId: 0} : {_id: 1, message: 1, createdAt: 1, userTimeStamp: 1, recipient: 0, sender: 0, quote_message_id : 0, taggedUserId: 0};
      console.log(selectOptions);
      let clearUser = [],
        clearDate = "";
      let chatData = [],responseData=[],
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
      
          if (clearUserData && !clearUserData.clear_chat_data[0].deleteConversation) {
            clearUser = clearUserData.clear_chat_data[0];
            clearDate = clearUser.date;
          } else if (clearUserData && clearUserData.clear_chat_data[0].deleteConversation) {
            clearUser = clearUserData.clear_chat_data[0];
            clearDate = clearUser.date;
          }
          
          if (type.toLowerCase() === "user") {
            if (clearDate.toString().length > 0) {
              responseData = await chat.find({
                $or: [ {$and: [{recipient: new ObjectId(chatid)}, {sender: new ObjectId(authUserId)}]}, {$and: [{sender: new ObjectId(chatid)}, {recipient: new ObjectId(authUserId)}]}],
                message_type: { $regex: ".*" + mediaType + ".*", $options: "i" },
                createdAt: { $gt: clearDate },
              }).select(selectOptions).sort({ createdAt: -1 })
              .limit(limit)
              .skip(skip);;
            } else {
              responseData = await chat.find({
                $or: [ {$and: [{recipient: new ObjectId(chatid)}, {sender: new ObjectId(authUserId)}]}, {$and: [{sender: new ObjectId(chatid)}, {recipient: new ObjectId(authUserId)}]}],
                message_type:  { $regex: ".*" + mediaType + ".*", $options: "i" },
              }).select(selectOptions) .sort({ createdAt: -1 })
              .limit(limit)
              .skip(skip);
            }
          } else if (type.toLowerCase() === "userchatgroup") {
            if (clearDate.toString().length > 0) {
              const joined_date = await userChatGroupMember.findOne({
                groupId: ObjectId(chatid),
                userId: userid,
                status: 2,
              });
      
              if (joined_date !== null && joined_date.createdAt > clearDate) {
                clearDate = joined_date.createdAt;
              } else {
                clearDate = clearDate;
              }
              responseData = await chat.find({
                recipient: new ObjectId(chatid),
                message_type:  { $regex: ".*"+ mediaType +".*", $options: "i" },
                createdAt: { $gt: clearDate },
              }).select(selectOptions) .sort({ createdAt: -1 })
              .limit(limit)
              .skip(skip);
            } else {
              const joined_date = await userChatGroupMember.findOne({
                groupId: ObjectId(chatid),
                userId: userid,
                status: 2,
              });
              responseData = await chat.find({
                recipient: new ObjectId(chatid),
                message_type: { $regex: ".*"+ mediaType +".*", $options: "i" },
                createdAt: { $gt: joined_date.createdAt },
              }).select(selectOptions) .sort({ createdAt: -1 })
              .limit(limit)
              .skip(skip);
            }
          } else if (type.toLowerCase() === "chatchannel") {
            if (clearDate.toString().length > 0) {
              const joined_date = await chatChannelMembers.findOne({
                channelId: ObjectId(chatid),
                userId: userid,
                status: 2,
                user_type: "airtable-syncs",
              });
      
              if (joined_date !== null && joined_date.createdAt > clearDate) {
                clearDate = joined_date.createdAt;
              } else {
                clearDate = clearDate;
              }
              responseData = await chat.find({
                recipient: new ObjectId(chatid),
                message_type: { $regex: ".*"+ mediaType +".*", $options: "i" },
                createdAt: { $gt: clearDate },
              }).select(selectOptions) .sort({ createdAt: -1 })
              .limit(limit)
              .skip(skip);
            } else {
              const joined_date = await chatChannelMembers.findOne({
                channelId: ObjectId(chatid),
                userId: userid,
                status: 2,
                user_type: "airtable-syncs",
              });
              responseData = await chat.find({
                recipient: new ObjectId(chatid),
                message_type: { $regex: ".*"+ mediaType +".*", $options: "i" },
                createdAt: { $gt: joined_date.createdAt },
              }).select(selectOptions) .sort({ createdAt: -1 })
              .limit(limit)
              .skip(skip);
            }
          }
          console.log(responseData,"responseData")
      if (responseData) {
        return {
          status: true,
          message: `list retrive successfully.`,
          currentPage: page,
          chatid: chatid,
          data: {
            currentPage: page,
            chatid: chatid,
            list: responseData,
            totalPages: Math.ceil(chatCount / limit),
            totalMessages: chatCount,
          },
        };
      } else {
        return {
          status: false,
          message: "list not found!",
          currentPage: page,
          chatid: chatid,
          data: {
            currentPage: page,
            chatid: chatid,
            list: [],
            totalPages: Math.ceil(chatCount / limit),
            totalMessages: chatCount,
          },
        };
      }
    } catch (error) {
      console.log(error, "Internal server error!");
    }
  };