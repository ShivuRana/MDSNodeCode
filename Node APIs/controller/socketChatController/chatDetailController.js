const chat = require("../../database/models/chat");
const User = require("../../database/models/airTableSync");
const { ObjectId } = require("mongodb");
const userChatGroupMember = require("../../database/models/userChatGroupMember");
const chatChannelMembers = require("../../database/models/chatChannelMembers");
const chatChannel = require("../../database/models/chatChannel");
const userChatGroup = require("../../database/models/userChatGroup");

// one on one chat detail function
async function oneOnOneChatDetailFunction(
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) {
  try {
    const userid = new ObjectId(authUserId);
    const id = chatid;
    const page = parseInt(pagecnt);
    const limit = parseInt(limitcnt);
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
      if (clearUser.length !== 0 && clearUser.id.toString() === id) {
        const data = await chat
          .find({
            $and: [
              {
                $or: [{ sender: ObjectId(id) }, { recipient: ObjectId(id) }],
              },
              { $or: [{ sender: userid }, { recipient: userid }] },
            ],
            isActive: true,
            createdAt: { $gt: clearDate },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
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
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: data,
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        } else {
          return {
            status: false,
            message: `messages not found.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: [],
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        }
      } else {
        const data = await chat
          .find({
            $and: [
              {
                $or: [{ sender: ObjectId(id) }, { recipient: ObjectId(id) }],
              },
              { $or: [{ sender: userid }, { recipient: userid }] },
            ],
            isActive: true,
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
        // const data = await Promise.all(
        //     await chat.aggregate([
        //         {
        //             $match: {
        //                 $and: [
        //                     {
        //                         $or: [
        //                             { sender: ObjectId(id) },
        //                             { recipient: ObjectId(id) },
        //                         ],
        //                     },
        //                     { $or: [{ sender: userid }, { recipient: userid }] },
        //                 ],
        //                 isActive: true,
        //             },
        //         },
        //         ...aggregatePipeline
        //     ])
        // );

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
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: data,
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        } else {
          return {
            status: false,
            message: `messages not found.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: [],
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        }
      }
    } else {
      return res.status(200).json({ status: false, message: "Invalid Id!" });
    }
  } catch (err) {
    console.log(err, "error in chat details socket");
    return {
      status: false,
      message: "Interval Server Error!",
      error: err.message,
    };
  }
}
// group chat detail function
async function groupChatDetailFunction(
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) {
  try {
    const userid = new ObjectId(authUserId);
    const id = chatid;
    const page = parseInt(pagecnt);
    const limit = parseInt(limitcnt);
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
      const aggregatePipeline = [
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
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
            pipeline: [
              {
                $project: { otherdetail: 1, profileImg: 1, attendeeDetail: 1 },
              },
            ],
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
          $unset: ["activity_userId", "activity_adminId", "quote_sender_user"],
        },
      ];
      if (clearUser.length !== 0 && clearUser.id.toString() === id) {
        let chatClearDate = "";
        const joined_date = await userChatGroupMember.findOne({
          groupId: ObjectId(id),
          userId: userid,
          status: 2,
        });

        if (joined_date.createdAt > clearDate) {
          chatClearDate = joined_date.createdAt;
        } else {
          chatClearDate = clearDate;
        }
        const data = await chat
          .find({
            recipient: ObjectId(id),
            isActive: true,
            isBlock: false,
            createdAt: { $gt: chatClearDate },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
        // const data = await Promise.all(
        //     await chat.aggregate([
        //         {
        //             $match: {
        //                 recipient:  ObjectId(id),
        //                 isActive: true,
        //                 isBlock: false,
        //                 createdAt: { $gt: chatClearDate },
        //             },
        //         },
        //         ...aggregatePipeline
        //     ])
        // );

        const count = await chat.countDocuments({
          recipient: ObjectId(id),
          isActive: true,
          isBlock: false,
          createdAt: { $gt: chatClearDate },
        });

        if (data.length !== 0 && count !== 0) {
          return {
            status: true,
            message: `messages retrive successfully.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: data,
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        } else {
          return {
            status: false,
            message: `messages not found.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: [],
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        }
      } else {
        const joined_date = await userChatGroupMember.findOne({
          groupId: ObjectId(id),
          userId: userid,
          status: 2,
        });
        const data = await chat
          .find({
            recipient: ObjectId(id),
            isActive: true,
            isBlock: false,
            createdAt: { $gt: joined_date.createdAt },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
        // const data = await Promise.all(
        //     await chat.aggregate([
        //         {
        //             $match: {
        //                 recipient:  ObjectId(id),
        //                 isActive: true,
        //                 isBlock: false,
        //                 createdAt: { $gt: joined_date.createdAt }
        //             },
        //         },
        //         ...aggregatePipeline
        //     ])
        // );

        const count = await chat.countDocuments({
          recipient: ObjectId(id),
          isActive: true,
          isBlock: false,
          createdAt: { $gt: joined_date.createdAt },
        });

        if (data.length !== 0 && count !== 0) {
          return {
            status: true,
            message: `messages retrive successfully.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: data,
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        } else {
          return {
            status: false,
            message: `messages not found.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: [],
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        }
      }
    } else {
      return res.status(200).json({ status: false, message: "Invalid Id!" });
    }
  } catch (err) {
    console.log(err, "error in chat details socket");
    return {
      status: false,
      message: "Interval Server Error!",
      error: err.message,
    };
  }
}
// channel chat detail function
async function channelChatDetailFunction(
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) {
  try {
    const userid = new ObjectId(authUserId);
    const id = chatid;
    const page = parseInt(pagecnt);
    const limit = parseInt(limitcnt);
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

      const aggregatePipeline = [
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
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
                              { $type: `$quote_sender_user.attendeeDetail` },
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
          channeId: ObjectId(id),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });

        if (joined_date.createdAt > clearDate) {
          chatClearDate = joined_date.createdAt;
        } else {
          chatClearDate = clearDate;
        }
        const data = await chat
          .find({
            recipient: ObjectId(id),
            isActive: true,
            isBlock: false,
            createdAt: { $gt: chatClearDate },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
        // const data = await Promise.all(
        //     await chat.aggregate([
        //         {
        //             $match: {
        //                 recipient:  ObjectId(id),
        //                 isActive: true,
        //                 isBlock: false,
        //                 createdAt: { $gt: chatClearDate },
        //             },
        //         },
        //         ...aggregatePipeline
        //     ])
        // );

        const count = await chat.countDocuments({
          recipient: ObjectId(id),
          isActive: true,
          isBlock: false,
          createdAt: { $gt: chatClearDate },
        });

        if (data.length !== 0 && count !== 0) {
          return {
            status: true,
            message: `messages retrive successfully.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: data,
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        } else {
          return {
            status: false,
            message: `messages not found.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: [],
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        }
      } else {
        const joined_date = await chatChannelMembers.findOne({
          channeId: ObjectId(id),
          userId: userid,
          status: 2,
          user_type: "airtable-syncs",
        });
        const data = await chat
          .find({
            recipient: ObjectId(id),
            isActive: true,
            isBlock: false,
            createdAt: { $gt: joined_date.createdAt },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
        // const data = await Promise.all(
        //     await chat.aggregate([
        //         {
        //             $match: {
        //                 recipient:  ObjectId(id),
        //                 isActive: true,
        //                 isBlock: false,
        //                 createdAt: { $gt: joined_date.createdAt }
        //             },
        //         },
        //         ...aggregatePipeline
        //     ])
        // );

        const count = await chat.countDocuments({
          recipient: ObjectId(id),
          isActive: true,
          isBlock: false,
          createdAt: { $gt: joined_date.createdAt },
        });

        if (data.length !== 0 && count !== 0) {
          return {
            status: true,
            message: `messages retrive successfully.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: data,
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        } else {
          return {
            status: false,
            message: `messages not found.`,
            currentPage: page,
            chatid: chatid,
            data: {
              Messages: [],
              totalPages: Math.ceil(count / limit),
              currentPage: page,
              totalMessages: count,
            },
          };
        }
      }
    } else {
      return res.status(200).json({ status: false, message: "Invalid Id!" });
    }
  } catch (err) {
    console.log(err, "error in chat details socket");
    return {
      status: false,
      message: "Interval Server Error!",
      error: err.message,
    };
  }
}
// get chat details for one on one chat
exports.getChatDetailOneOnOneChat = async (
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) => {
  const response = await oneOnOneChatDetailFunction(
    chatid,
    authUserId,
    type,
    pagecnt,
    limitcnt
  );
  return response;
};

// get chat detail for groups
exports.getChatDetailGroupChat = async (
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) => {
  const response = await groupChatDetailFunction(
    chatid,
    authUserId,
    type,
    pagecnt,
    limitcnt
  );
  return response;
};

// get chat detail for channel
exports.getChatDetailChannelChat = async (
  chatid,
  authUserId,
  type,
  pagecnt,
  limitcnt
) => {
  const response = await channelChatDetailFunction(
    chatid,
    authUserId,
    type,
    pagecnt,
    limitcnt
  );
  return response;
};

// get chat detail for API
exports.getChatDetailForAPI = async (req, res) => {
  const userid = req.authUserId;
  const { id, type } = req.params;
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  const skip = (page - 1) * limit;
  if (type.toLowerCase() === "userchatgroup") {
    const response = await groupChatDetailFunction(
      id,
      userid,
      type,
      page,
      limit
    );
    res.status(200).json(response);
  } else if (type.toLowerCase() === "chatchannel") {
    const response = await channelChatDetailFunction(
      id,
      userid,
      type,
      page,
      limit
    );
    res.status(200).json(response);
  } else {
    const response = await oneOnOneChatDetailFunction(
      id,
      userid,
      type,
      page,
      limit
    );
    res.status(200).json(response);
  }
};
