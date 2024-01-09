const express = require("express");
var cors = require("cors");
const app = express();
const port = process.env.PORT || 8080;
const bodyparser = require("body-parser");
const cookieparser = require("cookie-parser");
const http = require("http");
const httpsAgent = new http.Agent({ keepAlive: true });
const server = http.createServer(app);
const { ObjectId } = require("mongodb");
const moment = require("moment");
const chat = require("./database/models/chat");
const io = require("socket.io")(server, {
  path: "/socket-new",
  cors: {
    httpsAgent,
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    maxHttpBufferSize: 5e8, // 500 MB,
  },
});
var cron = require("node-cron");
const UserData = require("./database/models/user");
const user = require("./routes/userManagement/userRoute");
const customregisterform = require("./routes/userManagement/customregistrationformRoute");
// zp
const postRoute = require("./routes/postRoute");
const commentRoute = require("./routes/contentArchiveManagement/commentRoute");
const contentcommentRoute = require("./routes/contentArchiveManagement/contentCommentRoute");
const followRoute = require("./routes/followrequestRoute");
const groupRoute = require("./routes/groupRoute");
const topicRoute = require("./routes/topicRoute");
const membershipPlanRoute = require("./routes/membershipPlanManagement/membershipPlanRoute");
const paymentRoute = require("./routes/paymentRoute");
const questionnaireRoute = require("./routes/userManagement/questionnaireRoute");
const searchRoute = require("./routes/searchRoute");
const userUtilRoute = require("./routes/userManagement/userUtilRoute");
const contentArchiveRoute = require("./routes/contentArchiveManagement/contentArchiveRoute");
const chatcontroller = require("./controller/chatcontroller");
const chatRoute = require("./routes/chatRoute");
const chatGroupRoute = require("./routes/chatGroupRoute");
const chatGroupController = require("./controller/chatGroupController");
const videoStatisticRoute = require("./routes/contentArchiveManagement/videoStatisticRoute");
const eventRoute = require("./routes/eventManagement/eventRoute");
const userDataSyncRoute = require("./routes/userManagement/userDataSyncRoute");
const eventActivityRoute = require("./routes/eventManagement/eventActivityRoute");
const roomRoute = require("./routes/eventManagement/eventRoomAndSessionRoute");
const adminBannerRoute = require("./routes/newsManagement/adminBannerRoute");
const adminPostRoute = require("./routes/newsManagement/adminPostRoute");
const adminNewsRoute = require("./routes/newsManagement/adminNewsRoute");
const chatChannelRoute = require("./routes/chatChannelRoute");
const eventAttendeeManageRoute = require("./routes/eventManagement/eventAttendeeManageRoute");
const userCensusRoute = require("./routes/userManagement/userCensusRoute");
const partnerRoute = require("./routes/partner/partnerRoute");
const partnerHelpfulLinkRoute = require("./routes/partner/partnerHelpfulLinkRoute");
const partnerReasonRoute = require("./routes/partner/partnerReasonsRoute");
const partnerPostRoute = require("./routes/partner/partnerPostRoute");
const filterPartnerRoute = require("./routes/partner/filterPartnerRoute");
const partnerReviewRoute = require("./routes/partner/partnerReviewRoute");
const partnerBannerRoute = require("./routes/partner/partnerBannerRoute");
const partnerStatisticsRoute = require("./routes/partner/partnerStatisticsRoute");
const partnerBadgeRoute = require("./routes/partner/partnerBadgeRoute");

const partnerCategoryRoute = require("./routes/partner/partnerCategoryRoute");
const eventTypeRoute = require("./routes/eventManagement/eventTypeRoute");
const deepLinkRooute = require("./routes/deepLinkRooute");
const commonImageRoute = require("./routes/commonImage/commonImageRoute");
const chatListRoute = require("./routes/chatListRoute/chatList");
const accessResourceRoute = require("./routes/collaborator/accessResourceRoute");
const collaboratorRoute = require("./routes/collaborator/collaboratorRoute");
const {
  getAllChannelMemberSocket,
  leaveFromChannelSocket,
  getChannelAndMembersFunction,
} = require("./controller/chatChannelController");
const {
  getUsersMDSOnlyCensusExpiryNear,
} = require("./controller/userManagement/userCensusController");
const {
  retriveUserChatListSocket,
  readMessage,
  setOnlineOfflineStatus,
  getLastMessageForReceiver,
  addUpdateRecordInChatListForUserType,
  addUpdateRecordInChatListForGroupChannel,
  deleteMultipleRecordFromChatList,
  deleteRecordFromChatList,
  sumOfUnreadMessageForUser,
  editDeleteMessageTimeChatlistUpdate,
  addUpdateRecordInChatListForUserTypeLatest,
  addUpdateRecordInChatListForGroupChannelLatest,
} = require("./controller/socketChatController/chatListController");
const {
  getChatDetailOneOnOneChat,
  getChatDetailGroupChat,
  getChatDetailChannelChat,
} = require("./controller/socketChatController/chatDetailController");
const {
  newSendMessage,
  getUsersWhoDeletedConversation,
  newSendMessageLatest,
  addReactionOnMessage,
  removeReactionOnMessage,
} = require("./controller/socketChatController/chatTableController");
const mediaListController = require("./controller/socketChatController/mediaListController");
require("dotenv").config();
const domainsFromEnv = process.env.CORS_DOMAINS || "";

const whitelist = domainsFromEnv.split(",").map((item) => item.trim());
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

const mongoose = require("mongoose");
const {
  updateAllUsersRegistrationDetailsOnCron,
} = require("./controller/userManagement/userDataSyncController");
const db = require("./config/config").get(process.env.NODE_ENV);
mongoose.Promise = global.Promise;
mongoose.connect(
  db.DATABASE,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
  },
  function (err) {
    if (err) console.log(err);
    console.log("Database is connected");
  }
);

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(express.json({ limit: "1200mb" }));

var clients = [];
var users = [];
var updateflag = {};

io.on("connection", function (socket) {
  if (socket.handshake.query.userid === "null") socket.emit("authFailed");
  console.log(socket.handshake.query.userid, "socket.handshake.query.");
  const id = socket.handshake.query.userid;
  socket.join(id);
  console.log(typeof socket.handshake.query.userid, "iddd");
  if (socket.handshake.query.userid !== "null" && id) {
    let nonConnectedSocketIds = [];
    chatcontroller.add_chat_user(socket.id, id).then((res) => {
      if (res.socket_id) {
        for (let index = 0; index < res.socket_id.length; index++) {
          if (io.sockets.sockets[res.socket_id[index]] === undefined) {
            console.log("socket not connected", res.socket_id[index]);
            nonConnectedSocketIds.push(res.socket_id[index]);
          }
        }
      }
      chatcontroller.removeDisconnectedSocketIds(nonConnectedSocketIds, id);
    });
  }

  setOnlineOfflineStatus(id, true);
  socket.broadcast.emit("userOnline", id);

  // new user joined event
  socket.on("new-user-joined", (name) => {
    users[socket.id] = name;
    updateflag[name] = socket;
    socket.broadcast.emit("user-joined", name);
  });
  // join room event
  socket.on("joinRoom", async ({ roomId }) => {
    socket.join(roomId);
    console.log("join room", roomId);
    io.to(roomId).emit("user-joined-inroom", roomId);
  });
  // leave room event
  socket.on("leaveRoom", async ({ roomId }) => {
    socket.leave(roomId);
    console.log("***leave room**");
    io.to(roomId).emit("user-leaved-room", roomId);
  });
  // new get chat list for user
  socket.on("newChatList", async ({ id }) => {
    if (id !== "null" && id) {
      retriveUserChatListSocket(id).then((res) => {
        socket.emit("newChatListReceive", { message: res });
      });
    }
  });
  // get last message for receiver
  socket.on("getLastMessage", async ({ roomId, userId }) => {
    getLastMessageForReceiver(roomId, userId).then((res) => {
      console.log(
        "++++++++++++++++++++++++ last messages",
        roomId,
        userId,
        res
      );
      socket.emit("getLastMessageReceive", { message: res });
    });
  });
  // new read message event
  socket.on("readMessage", async ({ recipient, sender, type }) => {
    console.log("read message", recipient, sender, type);
    if (type !== "user") {
      io.to(recipient).emit("new-readed-msg", {
        recipient: recipient,
        type: type,
        sender: sender,
      });
    } else {
      io.to(sender + "-" + recipient).emit("new-readed-msg", {
        recipient: recipient,
        type: "user",
        sender: sender,
      });
    }
    readMessage(recipient, sender, type);
  });
  // total count of unread messages
  socket.on("getTotalUnreadCount", async ({ userId }) => {
    sumOfUnreadMessageForUser(userId).then((res) => {
      socket.emit("getTotalUnreadCountReceive", { message: res[0] });
    });
  });
  // new send message event
  socket.on(
    "new-send",
    async ({
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
      formattedData,
      firstTime,
      frontendUniqueId,
    }) => {
      console.log(message, "*****message****");
      var uniqueObjectId = new ObjectId();
      var alreadyExistId = await chat
        .findById(uniqueObjectId)
        .select("message");
      while (alreadyExistId !== null) {
        alreadyExistId = await chat.findById(uniqueObjectId).select("message");
        uniqueObjectId = new ObjectId();
      }
      var messageValue =
        message_type === "text"
          ? message
          : image_video !== undefined && image_video.length > 0
          ? image_video[0].key
          : other_files !== undefined && other_files.length > 0
          ? other_files[0].key
          : "";
      if (type === "user" || type === "airtable-syncs") {
        addUpdateRecordInChatListForUserType(
          "airtable-syncs",
          sender,
          recipient,
          messageValue,
          message_type,
          time_stamp,
          formattedData.group_member,
          taggedUserId
        );
      } else {
        addUpdateRecordInChatListForGroupChannel(
          type,
          sender,
          recipient,
          messageValue,
          message_type,
          time_stamp,
          formattedData.group_member,
          taggedUserId,
          true
        );
      }

      const createAtValue = moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
      if (firstTime) {
        console.log("first time message", formattedData.group_member);
        formattedData.group_member.map((members) => {
          chatcontroller.get_user_by_socket(members.id).then((resp) => {
            if (resp !== undefined && resp.socket_id !== undefined) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                console.log("socket", resp.socket_id[i], members.id);
                io.to(resp.socket_id[i]).emit("new-receive", {
                  message: [
                    {
                      _id: uniqueObjectId,
                      ...formattedData,
                      createdAt: createAtValue,
                      updatedAt: createAtValue,
                    },
                  ],
                  name: users[socket.id],
                });
              }
            }
          });
        });
      } else {
        if (type !== "user") {
          console.log("new-receive", message);
          io.to(recipient).emit("new-receive", {
            message: [
              {
                _id: uniqueObjectId,
                ...formattedData,
                createdAt: createAtValue,
                updatedAt: createAtValue,
              },
            ],
            name: users[socket.id],
          });
          let usersIds = await getUsersWhoDeletedConversation(
            formattedData.group_member.map((userid) => {
              return userid.id;
            }),
            sender
          );
          usersIds.map((members) => {
            chatcontroller
              .get_user_by_socket(members._id)
              .then(async (resp) => {
                if (resp !== undefined && resp.socket_id !== undefined) {
                  for (var i = 0; i < resp.socket_id.length; i++) {
                    let sockets = await io.in(recipient).fetchSockets();
                    let socketsInRoom = sockets.map((socket) => socket.id);
                    if (
                      socketsInRoom &&
                      !socketsInRoom.includes(resp.socket_id[i])
                    )
                      io.to(resp.socket_id[i]).emit("new-receive", {
                        message: [
                          {
                            _id: uniqueObjectId,
                            ...formattedData,
                            createdAt: createAtValue,
                            updatedAt: createAtValue,
                          },
                        ],
                        name: users[socket.id],
                      });
                  }
                }
              });
          });
        } else {
          console.log("new-receive", message);
          io.to(recipient + "-" + sender)
            .to(sender + "-" + recipient)
            .emit("new-receive", {
              message: [
                {
                  _id: uniqueObjectId,
                  ...formattedData,
                  createdAt: createAtValue,
                  updatedAt: createAtValue,
                },
              ],
              name: users[socket.id],
            });
          let usersIds = await getUsersWhoDeletedConversation(
            [recipient],
            sender
          );
          usersIds.map((members) => {
            chatcontroller
              .get_user_by_socket(members._id)
              .then(async (resp) => {
                if (resp !== undefined && resp.socket_id !== undefined) {
                  for (var i = 0; i < resp.socket_id.length; i++) {
                    let sockets = await io
                      .in(recipient + "-" + sender)
                      .fetchSockets();
                    let socketsInRoom = sockets.map((socket) => socket.id);
                    if (
                      socketsInRoom &&
                      !socketsInRoom.includes(resp.socket_id[i])
                    )
                      io.to(resp.socket_id[i]).emit("new-receive", {
                        message: [
                          {
                            _id: uniqueObjectId,
                            ...formattedData,
                            createdAt: createAtValue,
                            updatedAt: createAtValue,
                          },
                        ],
                        name: users[socket.id],
                      });
                  }
                }
              });
          });
        }
      }

      newSendMessage(
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
        formattedData.group_member,
        message_type,
        video_thumbnail,
        taggedUserId,
        time_stamp,
        uniqueObjectId,
        createAtValue,
        frontendUniqueId
      ).then((res) => {
        if (firstTime) {
          formattedData.group_member.map((members) => {
            chatcontroller.get_user_by_socket(members.id).then((resp) => {
              if (resp !== undefined && resp.socket_id !== undefined) {
                for (var i = 0; i < resp.socket_id.length; i++) {
                  console.log("socket", resp.socket_id[i], members.id);
                  io.to(resp.socket_id[i]).emit("new-receive-database", {
                    message: {
                      sender: sender,
                      recipient: recipient,
                      type: type,
                    },
                  });
                }
              }
            });
          });
        } else {
          if (type !== "user") {
            console.log("new-receive-database");
            io.to(recipient).emit("new-receive-database", {
              message: { sender: sender, recipient: recipient, type: type },
            });
          } else {
            console.log("new-receive-database");
            io.to(recipient + "-" + sender)
              .to(sender + "-" + recipient)
              .emit("new-receive-database", {
                message: { sender: sender, recipient: recipient, type: type },
              });
          }
        }
        chatcontroller.setupNSendNotification(
          message,
          recipient,
          sender,
          type,
          image_video,
          other_files,
          quotemsg,
          message_type,
          taggedUserId
        );
      });
    }
  );

  // edit message event
  socket.on(
    "edit",
    async ({ messageId, message, recipient, sender, type, taggedUserId }) => {
      var grp_mem = [];
      console.log(sender, recipient, type);
      chatcontroller
        .edit_chat(messageId, message, recipient, sender, type, taggedUserId)
        .then((res) => {
          editDeleteMessageTimeChatlistUpdate(sender, recipient, type)
            .then((updateChatListResponse) => {
              console.log(type, recipient, "dfkjhgjdfhgj");
              if (type !== "user")
                io.to(recipient).emit("edit-receive", {
                  message: res,
                  name: users[socket.id],
                });
              else
                io.to(recipient + "-" + sender)
                  .to(sender + "-" + recipient)
                  .emit("edit-receive", {
                    message: res,
                    name: users[socket.id],
                  });
            })
            .catch((e) => {
              console.log(e);
            });
        });
    }
  );

  // block chat event
  socket.on("blockchat", async ({ type, loginUserId, userId }) => {
    chatcontroller.block_chat(type, loginUserId, userId).then((res) => {
      if (res.status) {
        socket.emit("block-receive", { message: res, userid: userId });
        chatcontroller.get_user_by_socket(loginUserId).then((resp) => {
          if (
            resp !== undefined &&
            resp.socket_id !== undefined &&
            users[socket.id] !== undefined
          ) {
            for (var i = 0; i < resp.socket_id.length; i++) {
              socket
                .to(resp.socket_id[i])
                .emit("block-receive", { message: res, userid: userId });
            }
          }
        });
        chatcontroller.get_user_by_socket(userId).then((resp) => {
          if (
            resp !== undefined &&
            resp.socket_id !== undefined &&
            users[socket.id] !== undefined
          ) {
            for (var i = 0; i < resp.socket_id.length; i++) {
              socket.to(resp.socket_id[i]).emit("block-receive", {
                message: res,
                userid: users[socket.id].name ?? loginUserId,
                name: users[socket.id],
              });
            }
          }
        });
      }
    });
  });

  // delete chat event
  // socket.on("deletechat", async ({ chatId, messageId, userId, type }) => {
  //   var grp_mem = [];

  //   chatcontroller.deleteChat(chatId, messageId, userId).then((res) => {
  //     editDeleteMessageTimeChatlistUpdate(userId, chatId, type)
  //       .then((updateChatListResponse) => {
  //         if (type !== "user")
  //           io.to(chatId).emit("delete-receive", {
  //             message: res,
  //             name: { name: chatId },
  //           });
  //         else
  //           io.to(userId + "-" + chatId)
  //             .to(chatId + "-" + userId)
  //             .emit("delete-receive", { message: res, name: { name: userId } });
  //       })
  //       .catch((e) => {
  //         console.log(e);
  //       });
  //   });
  // });

  // new changes for delete chat
  socket.on("deletechat", async ({ chatId, messageId, userId, type }) => {
    const [res] = await Promise.all([
      chatcontroller.deleteChat(chatId, messageId, userId),
      editDeleteMessageTimeChatlistUpdate(userId, chatId, type),
    ]);

    if (type !== "user") {
      io.to(chatId).emit("delete-receive", {
        message: res,
        name: { name: chatId },
      });
    } else {
      io.to(userId + "-" + chatId)
        .to(chatId + "-" + userId)
        .emit("delete-receive", { message: res, name: { name: userId } });
    }
  });

  // typing event
  socket.on("typing", ({ recipient, sender, type, sendername }) => {
    if (type === "user") {
      io.sockets
        .in(recipient)
        .emit("typing", { recipient, sender, type, sendername });
    } else {
      io.to(recipient).emit("typing", { recipient, sender, type, sendername });
    }
  });

  // typingoff event
  socket.on("typingoff", ({ recipient, sender, type, sendername }) => {
    if (type === "user") {
      io.sockets
        .in(recipient)
        .emit("typingoff", { recipient, sender, type, sendername });
    } else {
      io.to(recipient).emit("typingoff", {
        recipient,
        sender,
        type,
        sendername,
      });
    }
  });

  // create group info by owner event
  socket.on(
    "create-group",
    async ({
      sender,
      group_image,
      group_name,
      participents,
      date,
      time,
      time_stamp,
    }) => {
      var grp_mem = [];
      chatGroupController
        .createUserGroup(
          sender,
          group_image,
          group_name,
          participents,
          date,
          time,
          time_stamp
        )
        .then((res) => {
          if (res.messageData[0])
            addUpdateRecordInChatListForGroupChannel(
              "userChatGroup",
              "",
              res.messageData[0].recipient.id,
              "",
              "text",
              res.messageData[0].userTimeStamp,
              res.messageData[0].group_member,
              [],
              false
            );
          console.log("res-create", res);
          socket.emit("create-receive", { message: res });
          socket.emit("new-receive", { message: res.messageData });
          chatcontroller.get_user_by_socket(sender).then((resp) => {
            if (
              resp !== undefined &&
              resp.socket_id !== undefined &&
              users[socket.id] !== undefined
            ) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                socket
                  .to(resp.socket_id[i])
                  .emit("create-receive", { message: res });
                socket
                  .to(resp.socket_id[i])
                  .emit("new-receive", { message: res.messageData });
              }
            }
          });
          grp_mem =
            res && res.messageData[0] && res.messageData[0].group_member
              ? res.messageData[0].group_member
              : [];
          res &&
            res.messageData[0] &&
            res.messageData[0].group_member &&
            res.messageData[0].group_member.map((grp_member) => {
              if (grp_member.id !== sender) {
                chatcontroller
                  .get_user_by_socket(grp_member.id)
                  .then((resp) => {
                    if (
                      resp !== undefined &&
                      resp.socket_id !== undefined &&
                      users[socket.id] !== undefined
                    ) {
                      for (var i = 0; i < resp.socket_id.length; i++) {
                        socket.to(resp.socket_id[i]).emit("create-receive", {
                          message: res,
                          name: users[socket.id],
                        });
                        socket
                          .to(resp.socket_id[i])
                          .emit("new-receive", { message: res.messageData });
                      }
                    }
                  });
              }
            });

          let groupId = res.data._id;
          chatcontroller.setupAddMemberNotification(
            sender,
            groupId,
            participents
          );
        });
    }
  );

  // edit group info by owner event
  socket.on(
    "edit-group",
    async ({
      sender,
      groupid,
      group_image,
      group_name,
      participents,
      date,
      time,
      time_stamp,
    }) => {
      var grp_mem = [];

      chatGroupController
        .editChatGroup(
          sender,
          groupid,
          group_image,
          group_name,
          participents,
          date,
          time,
          time_stamp
        )
        .then((res) => {
          if (res.messageData[0])
            addUpdateRecordInChatListForGroupChannel(
              "userChatGroup",
              "",
              res.messageData[0].recipient.id,
              "",
              "text",
              res.messageData[0].userTimeStamp,
              res.messageData[0].group_member,
              [],
              false
            );
          socket.emit("edit-group-receive", { message: res });
          socket.emit("new-receive", { message: res.messageData });
          chatcontroller.get_user_by_socket(sender).then((resp) => {
            if (
              resp !== undefined &&
              resp.socket_id !== undefined &&
              users[socket.id] !== undefined
            ) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                socket
                  .to(resp.socket_id[i])
                  .emit("edit-group-receive", { message: res });
                socket
                  .to(resp.socket_id[i])
                  .emit("new-receive", { message: res.messageData });
              }
            }
          });
          grp_mem =
            res && res.messageData[0] && res.messageData[0].group_member
              ? res.messageData[0].group_member
              : [];
          res &&
            res.messageData[0] &&
            res.messageData[0].group_member.map((grp_member) => {
              if (grp_member.id !== sender) {
                chatcontroller
                  .get_user_by_socket(grp_member.id)
                  .then((resp) => {
                    if (
                      resp !== undefined &&
                      resp.socket_id !== undefined &&
                      users[socket.id] !== undefined
                    ) {
                      for (var i = 0; i < resp.socket_id.length; i++) {
                        socket
                          .to(resp.socket_id[i])
                          .emit("edit-group-receive", {
                            message: res,
                            name: users[socket.id],
                          });
                        socket
                          .to(resp.socket_id[i])
                          .emit("new-receive", { message: res.messageData });
                      }
                    }
                  });
              }
            });
        });
    }
  );

  // add member by owner in group event
  socket.on(
    "add-member",
    async ({ authUserId, groupId, addmember, date, time, time_stamp }) => {
      chatGroupController
        .addGroupMemberSocket(
          authUserId,
          groupId,
          addmember,
          date,
          time,
          time_stamp
        )
        .then((res) => {
          socket.emit("add-member-receive", { message: res });
          chatcontroller.get_user_by_socket(authUserId).then((resp) => {
            if (
              resp !== undefined &&
              resp.socket_id !== undefined &&
              users[socket.id] !== undefined
            ) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                socket
                  .to(resp.socket_id[i])
                  .emit("add-member-receive", { message: res });
              }
            }
          });
          res &&
            res.allmember.map((grp_member) => {
              if (grp_member.userId._id !== authUserId) {
                chatcontroller
                  .get_user_by_socket(grp_member.userId._id)
                  .then((resp) => {
                    if (
                      resp !== undefined &&
                      resp.socket_id !== undefined &&
                      users[socket.id] !== undefined
                    ) {
                      for (var i = 0; i < resp.socket_id.length; i++) {
                        socket
                          .to(resp.socket_id[i])
                          .emit("add-member-receive", {
                            message: res,
                            name: users[socket.id],
                          });
                      }
                    }
                  });
              }
            });
        });
    }
  );

  // add member activity by owner in group event
  socket.on(
    "add-member-activity",
    async ({ authUserId, groupId, addmember, date, time, time_stamp }) => {
      chatGroupController
        .addGroupMemberSocketActivity(
          authUserId,
          groupId,
          addmember,
          date,
          time,
          time_stamp
        )
        .then((res) => {
          if (res.messageData[0])
            addUpdateRecordInChatListForGroupChannel(
              "userChatGroup",
              "",
              res.messageData[0].recipient.id,
              "",
              "text",
              res.messageData[0].userTimeStamp,
              res.messageData[0].group_member,
              [],
              false
            );
          socket.emit("new-receive", { message: res.messageData });
          chatcontroller.get_user_by_socket(authUserId).then((resp) => {
            if (
              resp !== undefined &&
              resp.socket_id !== undefined &&
              users[socket.id] !== undefined
            ) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                socket
                  .to(resp.socket_id[i])
                  .emit("new-receive", { message: res.messageData });
              }
            }
          });
          res &&
            res.messageData[0].group_member.map((grp_member) => {
              if (grp_member.id !== authUserId) {
                chatcontroller
                  .get_user_by_socket(grp_member.id)
                  .then((resp) => {
                    if (
                      resp !== undefined &&
                      resp.socket_id !== undefined &&
                      users[socket.id] !== undefined
                    ) {
                      for (var i = 0; i < resp.socket_id.length; i++) {
                        socket
                          .to(resp.socket_id[i])
                          .emit("new-receive", { message: res.messageData });
                      }
                    }
                  });
              }
            });
          chatcontroller.setupAddMemberNotification(
            authUserId,
            groupId,
            addmember
          );
        });
    }
  );

  // join member by user in group event
  socket.on(
    "join-member",
    async ({ authUserId, groupId, date, time, time_stamp }) => {
      var grp_mem = [];

      chatGroupController
        .joinGroupSocket(authUserId, groupId, date, time, time_stamp)
        .then((res) => {
          if (res.messageData)
            addUpdateRecordInChatListForGroupChannel(
              "userChatGroup",
              "",
              res.messageData.recipient.id,
              "",
              "text",
              res.messageData.userTimeStamp,
              res.messageData.group_member,
              [],
              false
            );
          socket.emit("join-member-receive", { message: res });
          chatcontroller.get_user_by_socket(authUserId).then((resp) => {
            if (
              resp !== undefined &&
              resp.socket_id !== undefined &&
              users[socket.id] !== undefined
            ) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                socket
                  .to(resp.socket_id[i])
                  .emit("join-member-receive", { message: res });
              }
            }
          });
          grp_mem = res && res.data[0].members ? res.data[0].members : [];
          res &&
            res.data[0].members.map((grp_member) => {
              if (grp_member.userId !== authUserId) {
                chatcontroller
                  .get_user_by_socket(grp_member.userId)
                  .then((resp) => {
                    if (
                      resp !== undefined &&
                      resp.socket_id !== undefined &&
                      users[socket.id] !== undefined
                    ) {
                      for (var i = 0; i < resp.socket_id.length; i++) {
                        socket
                          .to(resp.socket_id[i])
                          .emit("join-member-receive", {
                            message: res,
                            name: users[socket.id],
                          });
                      }
                    }
                  });
              }
            });
        });
    }
  );

  // remove member by owner in group event
  socket.on(
    "remove-member",
    async ({ groupid, authUserId, removemember, date, time, time_stamp }) => {
      var grp_mem = [];

      chatGroupController
        .removeGroupMemberSocket(
          groupid,
          authUserId,
          removemember,
          date,
          time,
          time_stamp
        )
        .then((res) => {
          socket.emit("remove-member-receive", { message: res });
          chatcontroller.get_user_by_socket(authUserId).then((resp) => {
            if (
              resp !== undefined &&
              resp.socket_id !== undefined &&
              users[socket.id] !== undefined
            ) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                socket
                  .to(resp.socket_id[i])
                  .emit("remove-member-receive", { message: res });
              }
            }
          });
          for (var index = 0; index < removemember.length; index++) {
            chatcontroller
              .get_user_by_socket(removemember[index])
              .then((resp) => {
                if (
                  resp !== undefined &&
                  resp.socket_id !== undefined &&
                  users[socket.id] !== undefined
                ) {
                  for (var i = 0; i < resp.socket_id.length; i++) {
                    socket.to(resp.socket_id[i]).emit("remove-member-receive", {
                      message: res,
                      name: users[socket.id],
                    });
                  }
                }
              });
          }
          res &&
            res.allmember.map((grp_member) => {
              if (
                grp_member.userId._id.toString !== authUserId &&
                !removemember.includes(grp_member.userId._id.toString)
              ) {
                chatcontroller
                  .get_user_by_socket(grp_member.userId._id)
                  .then((resp) => {
                    if (
                      resp !== undefined &&
                      resp.socket_id !== undefined &&
                      users[socket.id] !== undefined
                    ) {
                      for (var i = 0; i < resp.socket_id.length; i++) {
                        socket
                          .to(resp.socket_id[i])
                          .emit("remove-member-receive", {
                            message: res,
                            name: users[socket.id],
                          });
                      }
                    }
                  });
              }
            });
        });
    }
  );

  // remove member activity by owner in group event
  socket.on(
    "remove-member-activity",
    async ({ groupid, authUserId, removemember, date, time, time_stamp }) => {
      var grp_mem = [];
      chatGroupController
        .removeGroupMemberSocketActivity(
          groupid,
          authUserId,
          removemember,
          date,
          time,
          time_stamp
        )
        .then((res) => {
          if (res.messageData[0]) {
            addUpdateRecordInChatListForGroupChannel(
              "userChatGroup",
              "",
              res.messageData[0].recipient.id,
              "",
              "text",
              res.messageData[0].userTimeStamp,
              res.messageData[0].group_member,
              [],
              false
            );
            deleteMultipleRecordFromChatList(removemember, groupid);
          }
          socket.emit("new-receive", { message: res.messageData });
          chatcontroller.get_user_by_socket(authUserId).then((resp) => {
            if (
              resp !== undefined &&
              resp.socket_id !== undefined &&
              users[socket.id] !== undefined
            ) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                socket
                  .to(resp.socket_id[i])
                  .emit("new-receive", { message: res.messageData });
              }
            }
          });
          res &&
            res.messageData[0].group_member.map((grp_member) => {
              if (
                grp_member.id !== authUserId &&
                !removemember.includes(grp_member.id)
              ) {
                chatcontroller
                  .get_user_by_socket(grp_member.id)
                  .then((resp) => {
                    if (
                      resp !== undefined &&
                      resp.socket_id !== undefined &&
                      users[socket.id] !== undefined
                    ) {
                      for (var i = 0; i < resp.socket_id.length; i++) {
                        socket
                          .to(resp.socket_id[i])
                          .emit("new-receive", { message: res.messageData });
                      }
                    }
                  });
              }
            });
        });
    }
  );

  // delete group by owner event
  socket.on("delete-group", async ({ groupid, authUserId }) => {
    var grp_mem = [];

    chatGroupController.deleteGroupSocket(groupid, authUserId).then((res) => {
      const allMembersList =
        res && res.messageData
          ? res.messageData.map((member) => {
              return member.userId._id;
            })
          : [];
      deleteMultipleRecordFromChatList(allMembersList, groupid);
      socket.emit("delete-group-receive", { message: res });
      chatcontroller.get_user_by_socket(authUserId).then((resp) => {
        if (
          resp !== undefined &&
          resp.socket_id !== undefined &&
          users[socket.id] !== undefined
        ) {
          for (var i = 0; i < resp.socket_id.length; i++) {
            socket
              .to(resp.socket_id[i])
              .emit("delete-group-receive", { message: res });
          }
        }
      });
      grp_mem = res && res.messageData ? res.messageData : [];
      res &&
        res.messageData.map((grp_member) => {
          if (grp_member.userId._id !== authUserId) {
            chatcontroller
              .get_user_by_socket(grp_member.userId._id)
              .then((resp) => {
                if (
                  resp !== undefined &&
                  resp.socket_id !== undefined &&
                  users[socket.id] !== undefined
                ) {
                  for (var i = 0; i < resp.socket_id.length; i++) {
                    socket.to(resp.socket_id[i]).emit("delete-group-receive", {
                      message: res,
                      name: users[socket.id],
                    });
                  }
                }
              });
          }
        });
    });
  });

  // leave group by member event
  // socket.on("leave-group", async ({ groupid, authUserId, time_stamp }) => {
  //   var grp_mem = [];
  //   chatGroupController
  //     .leaveFromGroupSocket(groupid, authUserId, time_stamp)
  //     .then((res) => {
  //       console.log(res, "res ");
  //       if (res.messageData[0]) {
  //         addUpdateRecordInChatListForGroupChannel(
  //           "userChatGroup",
  //           "",
  //           res.messageData[0].recipient.id,
  //           "",
  //           "text",
  //           res.messageData[0].userTimeStamp,
  //           res.messageData[0].group_member,
  //           [],
  //           false
  //         );
  //         deleteRecordFromChatList(authUserId, groupid);
  //       }

  //       socket.emit("leave-group-receive", { message: res });
  //       socket.emit("new-receive", { message: res.messageData });
  //       chatcontroller.get_user_by_socket(authUserId).then((resp) => {
  //         if (
  //           resp !== undefined &&
  //           resp.socket_id !== undefined &&
  //           users[socket.id] !== undefined
  //         ) {
  //           for (var i = 0; i < resp.socket_id.length; i++) {
  //             socket
  //               .to(resp.socket_id[i])
  //               .emit("leave-group-receive", { message: res });
  //             socket
  //               .to(resp.socket_id[i])
  //               .emit("new-receive", { message: res.messageData });
  //           }
  //         }
  //       });
  //       grp_mem =
  //         res && res.messageData[0].group_member
  //           ? res.messageData[0].group_member
  //           : [];
  //       res &&
  //         res.messageData[0] &&
  //         res.messageData[0].group_member.map((grp_member) => {
  //           if (grp_member.id !== authUserId) {
  //             chatcontroller.get_user_by_socket(grp_member.id).then((resp) => {
  //               if (
  //                 resp !== undefined &&
  //                 resp.socket_id !== undefined &&
  //                 users[socket.id] !== undefined
  //               ) {
  //                 for (var i = 0; i < resp.socket_id.length; i++) {
  //                   socket.to(resp.socket_id[i]).emit("leave-group-receive", {
  //                     message: res,
  //                     name: users[socket.id],
  //                   });
  //                   socket
  //                     .to(resp.socket_id[i])
  //                     .emit("new-receive", { message: res.messageData });
  //                 }
  //               }
  //             });
  //           }
  //         });
  //     });
  // });

  // New Chnages for Leave Group
  socket.on("leave-group", async ({ groupid, authUserId, time_stamp }) => {
    const [res] = await Promise.all([
      chatGroupController.leaveFromGroupSocket(groupid, authUserId, time_stamp),
      chatcontroller.get_user_by_socket(authUserId),
    ]);
    io.to(groupid).emit("leave-group-receive", { message: res });
    io.to(groupid).emit("new-receive", { message: res.messageData });

    if (res.messageData[0]) {
      addUpdateRecordInChatListForGroupChannel(
        "userChatGroup",
        "",
        res.messageData[0].recipient.id,
        "",
        "text",
        res.messageData[0].userTimeStamp,
        res.messageData[0].group_member,
        [],
        false
      );
      deleteRecordFromChatList(authUserId, groupid);
    }
    const groupMembers =
      res.messageData[0] && res.messageData[0].group_member
        ? res.messageData[0].group_member
        : [];

    let usersIds = await getUsersWhoDeletedConversation(
      groupMembers.map((userid) => {
        return userid.id;
      }),
      groupid
    );
    usersIds.map((members) => {
      chatcontroller.get_user_by_socket(members._id).then(async (resp) => {
        if (resp !== undefined && resp.socket_id !== undefined) {
          for (var i = 0; i < resp.socket_id.length; i++) {
            let sockets = await io.in(recipient).fetchSockets();
            let socketsInRoom = sockets.map((socket) => socket.id);
            if (socketsInRoom && !socketsInRoom.includes(resp.socket_id[i])) {
              io.to(resp.socket_id[i]).emit("leave-group-receive", {
                message: res,
              });
              io.to(resp.socket_id[i]).emit("new-receive", {
                message: res.messageData,
              });
            }
          }
        }
      });
    });
  });

  // file list event
  socket.on("file-list", ({ chatid, authUserId, type }) => {
    chatGroupController
      .countOfFileSocket(chatid, authUserId, type)
      .then(async (rescount) => {
        let limit = 50;
        let totalPages = Math.ceil(rescount / limit);
        for (var page = 1; page <= totalPages; page++) {
          await chatGroupController
            .listOfFileSocket(chatid, authUserId, type, page, limit)
            .then((res) => {
              socket.emit("file-list-receive", { message: res });
            });
        }
      });
  });

  // media list event
  socket.on("media-list", ({ chatid, authUserId, type }) => {
    chatGroupController
      .countOfMediaSocket(chatid, authUserId, type)
      .then(async (rescount) => {
        let limit = 50;
        let totalPages = Math.ceil(rescount / limit);
        for (var page = 1; page <= totalPages; page++) {
          await chatGroupController
            .listOfMediaSocket(chatid, authUserId, type, page, limit)
            .then((res) => {
              socket.emit("media-list-receive", { message: res });
            });
        }
      });
  });

  // URL list event
  socket.on("url-list", ({ chatid, authUserId, type }) => {
    chatGroupController
      .countOfUrlSocket(chatid, authUserId, type)
      .then(async (rescount) => {
        let limit = 50;
        let totalPages = Math.ceil(rescount / limit);
        for (var page = 1; page <= totalPages; page++) {
          await chatGroupController
            .listOfUrlSocket(chatid, authUserId, type, page, limit)
            .then((res) => {
              socket.emit("url-list-receive", { message: res });
            });
        }
      });
  });
  socket.on("chat-detail", ({ chatid, authUserId, type, skip }) => {
    chatcontroller
      .getChatDetailSocket(chatid, authUserId, type, skip, 50)
      .then((res) => {
        socket.emit("chat-detail-receive", { message: res });
      });
  });
  // Chat Detail listing event
  socket.on("chat-detail-new", ({ chatid, authUserId, type }) => {
    chatcontroller
      .countChatDetailSocket(chatid, authUserId, type)
      .then(async (rescount) => {
        let limit = 20;
        let totalPages = Math.ceil(rescount / limit);
        for (var page = 1; page <= totalPages; page++) {
          if (type.toLowerCase() === "userchatgroup") {
            getChatDetailGroupChat(chatid, authUserId, type, page, limit).then(
              (res) => {
                socket.emit("chat-detail-receive", { message: res });
              }
            );
          } else if (type.toLowerCase() === "chatchannel") {
            getChatDetailChannelChat(
              chatid,
              authUserId,
              type,
              page,
              limit
            ).then((res) => {
              socket.emit("chat-detail-receive", { message: res });
            });
          } else {
            getChatDetailOneOnOneChat(
              chatid,
              authUserId,
              type,
              page,
              limit
            ).then((res) => {
              socket.emit("chat-detail-receive", { message: res });
            });
          }
        }
      });
  });

  // check if message is read or not sockect event
  socket.on("is-read", ({ authUserId }) => {
    chatcontroller.checkIfMsgReadSocket(authUserId).then(async (rescount) => {
      if (rescount > 0)
        socket.emit("is-read-receive", { message: false, count: rescount });
      else socket.emit("is-read-receive", { message: true, count: 0 });
    });
  });

  // leave group by member event

  // socket.on(
  //   "leave-channel",
  //   async ({ channelId, authUserId, date, time, time_stamp }) => {
  //     var grp_mem = [];

  //     leaveFromChannelSocket(
  //       channelId,
  //       authUserId,
  //       date,
  //       time,
  //       time_stamp
  //     ).then((res) => {
  //       socket.emit("leave-channel-receive", { message: res });
  //       socket.emit("new-receive", { message: res.messageData });
  //       chatcontroller.get_user_by_socket(authUserId).then((resp) => {
  //         if (
  //           resp !== undefined &&
  //           resp.socket_id !== undefined &&
  //           users[socket.id] !== undefined
  //         ) {
  //           for (var i = 0; i < resp.socket_id.length; i++) {
  //             socket
  //               .to(resp.socket_id[i])
  //               .emit("leave-channel-receive", { message: res });
  //             socket
  //               .to(resp.socket_id[i])
  //               .emit("new-receive", { message: res.messageData });
  //           }
  //         }
  //       });
  //       grp_mem =
  //         res && res.messageData[0].group_member
  //           ? res.messageData[0].group_member
  //           : [];
  //       res &&
  //         res.messageData[0] &&
  //         res.messageData[0].group_member.map((grp_member) => {
  //           if (grp_member.id !== authUserId) {
  //             chatcontroller.get_user_by_socket(grp_member.id).then((resp) => {
  //               if (
  //                 resp !== undefined &&
  //                 resp.socket_id !== undefined &&
  //                 users[socket.id] !== undefined
  //               ) {
  //                 for (var i = 0; i < resp.socket_id.length; i++) {
  //                   socket.to(resp.socket_id[i]).emit("leave-channel-receive", {
  //                     message: res,
  //                     name: users[socket.id],
  //                   });
  //                   socket
  //                     .to(resp.socket_id[i])
  //                     .emit("new-receive", { message: res.messageData });
  //                 }
  //               }
  //             });
  //           }
  //         });
  //     });
  //   }
  // );

  // new changes for leave channel
  socket.on("leave-channel", async ({ channelId, authUserId, time_stamp }) => {
    const res = await leaveFromChannelSocket(channelId, authUserId, time_stamp);

    io.to(channelId).emit("leave-channel-receive", { message: res });
    io.to(channelId).emit("new-receive", { message: res.messageData });

    const groupMembers =
      res && res.messageData[0].group_member
        ? res.messageData[0].group_member
        : [];
    const usersIds = await getUsersWhoDeletedConversation(
      groupMembers.map((userid) => userid.id),
      channelId
    );
    usersIds.forEach((members) => {
      chatcontroller.get_user_by_socket(members._id).then(async (resp) => {
        if (resp !== undefined && resp.socket_id !== undefined) {
          for (let i = 0; i < resp.socket_id.length; i++) {
            const sockets = await io.in(channelId).fetchSockets();
            const socketsInRoom = sockets.map((socket) => socket.id);
            if (socketsInRoom && !socketsInRoom.includes(resp.socket_id[i])) {
              io.to(resp.socket_id[i]).emit("leave-channel-receive", {
                message: res,
                name: users[socket.id],
              });
              io.to(resp.socket_id[i]).emit("new-receive", {
                message: res.messageData,
              });
            }
          }
        }
      });
    });
  });

  // new send message event latest
  socket.on(
    "new-send-latest",
    async ({
      message,
      recipient,
      sender,
      type,
      images,
      videos,
      documents,
      voiceNotes,
      sender_name,
      quotemsg,
      group_member,
      message_type,
      taggedUserId,
      time_stamp,
      formattedData,
      firstTime,
      frontendUniqueId,
    }) => {
      console.log("*******************************************************");
      var uniqueObjectId = new ObjectId();
      var alreadyExistId = await chat
        .findById(uniqueObjectId)
        .select("message");

      while (alreadyExistId !== null) {
        alreadyExistId = await chat.findById(uniqueObjectId).select("message");
        uniqueObjectId = new ObjectId();
      }

      if (type === "user" || type === "airtable-syncs") {
        addUpdateRecordInChatListForUserTypeLatest(
          "airtable-syncs",
          sender,
          recipient,
          message,
          message_type,
          time_stamp,
          formattedData.group_member,
          taggedUserId
        );
      } else {
        addUpdateRecordInChatListForGroupChannelLatest(
          type,
          sender,
          recipient,
          message,
          message_type,
          time_stamp,
          formattedData.group_member,
          taggedUserId,
          true
        );
      }

      const createAtValue = moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
      if (firstTime) {
        console.log("first time message", formattedData.group_member);
        formattedData.group_member.map((members) => {
          chatcontroller.get_user_by_socket(members.id).then((resp) => {
            if (resp !== undefined && resp.socket_id !== undefined) {
              for (var i = 0; i < resp.socket_id.length; i++) {
                console.log("socket", resp.socket_id[i], members.id);
                io.to(resp.socket_id[i]).emit("new-receive-latest", {
                  message: [
                    {
                      _id: uniqueObjectId,
                      ...formattedData,
                      createdAt: createAtValue,
                      updatedAt: createAtValue,
                    },
                  ],
                  name: users[socket.id],
                });
              }
            }
          });
        });
      } else {
        if (type !== "user") {
          console.log("new-receive-latest", message);
          io.to(recipient).emit("new-receive-latest", {
            message: [
              {
                _id: uniqueObjectId,
                ...formattedData,
                createdAt: createAtValue,
                updatedAt: createAtValue,
              },
            ],
            name: users[socket.id],
          });
          let usersIds = await getUsersWhoDeletedConversation(
            formattedData.group_member.map((userid) => {
              return userid.id;
            }),
            sender
          );
          usersIds.map((members) => {
            chatcontroller
              .get_user_by_socket(members._id)
              .then(async (resp) => {
                if (resp !== undefined && resp.socket_id !== undefined) {
                  for (var i = 0; i < resp.socket_id.length; i++) {
                    let sockets = await io.in(recipient).fetchSockets();
                    let socketsInRoom = sockets.map((socket) => socket.id);
                    if (
                      socketsInRoom &&
                      !socketsInRoom.includes(resp.socket_id[i])
                    )
                      io.to(resp.socket_id[i]).emit("new-receive-latest", {
                        message: [
                          {
                            _id: uniqueObjectId,
                            ...formattedData,
                            createdAt: createAtValue,
                            updatedAt: createAtValue,
                          },
                        ],
                        name: users[socket.id],
                      });
                  }
                }
              });
          });
        } else {
          console.log("new-receive", message);
          io.to(recipient + "-" + sender)
            .to(sender + "-" + recipient)
            .emit("new-receive-latest", {
              message: [
                {
                  _id: uniqueObjectId,
                  ...formattedData,
                  createdAt: createAtValue,
                  updatedAt: createAtValue,
                },
              ],
              name: users[socket.id],
            });
          let usersIds = await getUsersWhoDeletedConversation(
            [recipient],
            sender
          );
          usersIds.map((members) => {
            chatcontroller
              .get_user_by_socket(members._id)
              .then(async (resp) => {
                if (resp !== undefined && resp.socket_id !== undefined) {
                  for (var i = 0; i < resp.socket_id.length; i++) {
                    let sockets = await io
                      .in(recipient + "-" + sender)
                      .fetchSockets();
                    let socketsInRoom = sockets.map((socket) => socket.id);
                    if (
                      socketsInRoom &&
                      !socketsInRoom.includes(resp.socket_id[i])
                    )
                      io.to(resp.socket_id[i]).emit("new-receive-latest", {
                        message: [
                          {
                            _id: uniqueObjectId,
                            ...formattedData,
                            createdAt: createAtValue,
                            updatedAt: createAtValue,
                          },
                        ],
                        name: users[socket.id],
                      });
                  }
                }
              });
          });
        }
      }

      newSendMessageLatest(
        message,
        recipient,
        sender,
        type,
        images,
        videos,
        documents,
        voiceNotes,
        sender_name,
        quotemsg,
        formattedData.group_member,
        message_type,
        taggedUserId,
        time_stamp,
        uniqueObjectId,
        createAtValue,
        frontendUniqueId
      ).then((res) => {
        if (firstTime) {
          formattedData.group_member.map((members) => {
            chatcontroller.get_user_by_socket(members.id).then((resp) => {
              if (resp !== undefined && resp.socket_id !== undefined) {
                for (var i = 0; i < resp.socket_id.length; i++) {
                  console.log("socket", resp.socket_id[i], members.id);
                  io.to(resp.socket_id[i]).emit("new-receive-database-latest", {
                    message: {
                      sender: sender,
                      recipient: recipient,
                      type: type,
                    },
                  });
                }
              }
            });
          });
        } else {
          if (type !== "user") {
            console.log("new-receive-database-latest");
            io.to(recipient).emit("new-receive-database-latest", {
              message: { sender: sender, recipient: recipient, type: type },
            });
          } else {
            console.log("new-receive-database");
            io.to(recipient + "-" + sender)
              .to(sender + "-" + recipient)
              .emit("new-receive-database-latest", {
                message: { sender: sender, recipient: recipient, type: type },
              });
          }
        }
        chatcontroller.setupNSendNotificationLatest(
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
        );
      });
    }
  );

  // add message Reaction event
  socket.on(
    "add-message-reaction",
    async ({ messageId, senderId, receiverId, emojiId, type }) => {
      console.log(messageId, senderId, receiverId, emojiId, type, "idss");

      if (type !== "user" || type !== "airtable-syncs") {
        console.log("add-message-reaction-receive");
        io.to(receiverId).emit("add-message-reaction-receive", {
          message: { messageId, senderId, receiverId, emojiId, type },
        });
      } else {
        console.log("add-message-reaction-receive");
        io.to(receiverId + "-" + senderId)
          .to(senderId + "-" + receiverId)
          .emit("add-message-reaction-receive", {
            message: { messageId, senderId, receiverId, emojiId, type },
          });
      }
      addReactionOnMessage(messageId, senderId, emojiId, type);
    }
  );

  // remove message Reaction event
  socket.on(
    "remove-message-reaction",
    async ({ messageId, senderId, receiverId, emojiId, type }) => {
      if (type !== "user" || type !== "airtable-syncs") {
        io.to(receiverId).emit("remove-message-reaction-receive", {
          message: { messageId, senderId, receiverId, emojiId, type },
        });
      } else {
        io.to(receiverId + "-" + senderId)
          .to(senderId + "-" + receiverId)
          .emit("remove-message-reaction-receive", {
            message: { messageId, senderId, receiverId, emojiId, type },
          });
      }
      removeReactionOnMessage(messageId, senderId, emojiId);
    }
  );

  // file list event latest
  socket.on("file-list-latest", ({ chatid, authUserId, type }) => {
    mediaListController
      .countOfMediaSocketLatest(chatid, authUserId, type, "document")
      .then(async (rescount) => {
        let limit = 50;
        let totalPages = Math.ceil(rescount / limit);
        if (rescount > 0) {
          for (var page = 1; page <= totalPages; page++) {
            await mediaListController
              .listOfMediaSocketLatest(
                chatid,
                authUserId,
                type,
                page,
                limit,
                "document"
              )
              .then((res) => {
                socket.emit("file-list-receive-latest", { message: res });
              });
          }
        } else {
          socket.emit("file-list-receive-latest", {
            message: {
              status: false,
              message: "list not found!",
              currentPage: 0,
              chatid: chatid,
              data: {
                currentPage: 0,
                chatid: chatid,
                list: [],
                totalPages: 0,
                totalMessages: 0,
              },
            },
          });
        }
      });
  });

  // image list event latest
  socket.on("image-list-latest", ({ chatid, authUserId, type }) => {
    mediaListController
      .countOfMediaSocketLatest(chatid, authUserId, type, "image")
      .then(async (rescount) => {
        let limit = 50;
        let totalPages = Math.ceil(rescount / limit);
        if (rescount) {
          for (var page = 1; page <= totalPages; page++) {
            await mediaListController
              .listOfMediaSocketLatest(
                chatid,
                authUserId,
                type,
                page,
                limit,
                "image"
              )
              .then((res) => {
                console.log(res, "res");
                socket.emit("image-list-receive-latest", { message: res });
              });
          }
        } else {
          socket.emit("image-list-receive-latest", {
            message: {
              status: false,
              message: "list not found!",
              currentPage: 0,
              chatid: chatid,
              data: {
                currentPage: 0,
                chatid: chatid,
                list: [],
                totalPages: 0,
                totalMessages: 0,
              },
            },
          });
        }
      });
  });
  // video list event latest
  socket.on("video-list-latest", ({ chatid, authUserId, type }) => {
    mediaListController
      .countOfMediaSocketLatest(chatid, authUserId, type, "video")
      .then(async (rescount) => {
        let limit = 50;
        console.log(rescount, "resssssssssss");
        let totalPages = Math.ceil(rescount / limit);
        if (rescount) {
          for (var page = 1; page <= totalPages; page++) {
            await mediaListController
              .listOfMediaSocketLatest(
                chatid,
                authUserId,
                type,
                page,
                limit,
                "video"
              )
              .then((res) => {
                socket.emit("video-list-receive-latest", { message: res });
              });
          }
        } else {
          socket.emit("video-list-receive-latest", {
            message: {
              status: false,
              message: "list not found!",
              currentPage: 0,
              chatid: chatid,
              data: {
                currentPage: 0,
                chatid: chatid,
                list: [],
                totalPages: 0,
                totalMessages: 0,
              },
            },
          });
        }
      });
  });
  // URL list event latest
  socket.on("url-list-latest", ({ chatid, authUserId, type }) => {
    mediaListController
      .countOfMediaSocketLatest(chatid, authUserId, type, "url")
      .then(async (rescount) => {
        let limit = 50;
        console.log(rescount, "resssssssssss");
        let totalPages = Math.ceil(rescount / limit);
        if (rescount) {
          for (var page = 1; page <= totalPages; page++) {
            await mediaListController
              .listOfMediaSocketLatest(
                chatid,
                authUserId,
                type,
                page,
                limit,
                "url"
              )
              .then((res) => {
                socket.emit("url-list-receive-latest", { message: res });
              });
          }
        } else {
          socket.emit("url-list-receive-latest", {
            message: {
              status: false,
              message: "list not found!",
              currentPage: 0,
              chatid: chatid,
              data: {
                currentPage: 0,
                chatid: chatid,
                list: [],
                totalPages: 0,
                totalMessages: 0,
              },
            },
          });
        }
      });
  });
  // get channel and members detail
  socket.on("channel-member-detail", async ({ channelId }) => {
    const channelAndMemberDetail = await getChannelAndMembersFunction(
      channelId
    );
    if (
      channelAndMemberDetail &&
      channelAndMemberDetail.getChannel &&
      channelAndMemberDetail.getChannelMembers
    )
      socket.emit("channel-member-detail-receive", {
        status: true,
        message: "Channel and members list",
        channelData: channelAndMemberDetail.getChannel,
        membersList: channelAndMemberDetail.getChannelMembers,
      });
    else
      socket.emit("channel-member-detail-receive", {
        status: false,
        message: "Something went wrong while getting channel and it's members",
      });
  });
  // get user chat group and members detail
  socket.on("group-member-detail", async ({ groupId }) => {
    const groupAndMemberDetail =
      await chatGroupController.getGroupAndMembersDetail(groupId);
    if (groupAndMemberDetail)
      socket.emit("group-member-detail-receive", {
        status: true,
        message: "Group members retrive.",
        data: groupAndMemberDetail,
      });
    else
      socket.emit("group-member-detail-receive", {
        status: false,
        message: "This group don't have any members.",
        data: [],
      });
  });
  //Whenever someone disconnects this piece of code executed
  socket.on("disconnect", function () {
    socket.leave(id);

    chatcontroller.remove_chat_user(socket.id, id).then((response) => {
      if (response) {
        console.log(response.socket_id, "response.socket_id");
        if (response.socket_id && response.socket_id.length === 0) {
          setOnlineOfflineStatus(id, false);
          socket.broadcast.emit("userOffline", id);
        }
        clients = response;
      }
    });
    io.sockets.emit("member-disconnected");
    console.log("A user disconnected");
  });
});

app.use(cookieparser());
app.use("/api/user", user);
app.use("/api", postRoute);
app.use("/api", commentRoute);
app.use("/api", followRoute);
app.use("/api", groupRoute);
app.use("/api", topicRoute);
app.use("/api", membershipPlanRoute);
app.use("/api", paymentRoute);
app.use("/api", questionnaireRoute);
app.use("/api", searchRoute);
app.use("/api", userUtilRoute);
app.use("/api", customregisterform);
app.use("/api", contentArchiveRoute);
app.use("/api", contentcommentRoute);
app.use("/api", chatRoute);
app.use("/api", chatGroupRoute);
app.use("/api", videoStatisticRoute);
app.use("/api", eventRoute);
app.use("/api", userDataSyncRoute);
app.use("/api", eventActivityRoute);
app.use("/api", roomRoute);
app.use("/api", adminBannerRoute);
app.use("/api", adminPostRoute);
app.use("/api", adminNewsRoute);
app.use("/api", chatChannelRoute);
app.use("/api", eventAttendeeManageRoute);
app.use("/api", userCensusRoute);
app.use("/api", partnerRoute);
app.use("/api", partnerCategoryRoute);
app.use("/api", partnerHelpfulLinkRoute);
app.use("/api", partnerPostRoute);
app.use("/api", partnerReasonRoute);
app.use("/api", filterPartnerRoute);
app.use("/api", partnerReviewRoute);
app.use("/api", partnerBannerRoute);
app.use("/api", partnerStatisticsRoute);
app.use("/api", partnerBadgeRoute);
app.use("/api", eventTypeRoute);
app.use("/api", deepLinkRooute);
app.use("/api", commonImageRoute);
app.use("/api", chatListRoute);
app.use("/api", accessResourceRoute);
app.use("/api", collaboratorRoute);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});
app.set("socketio", io);
//scheduled the cron job for every 9 am to update users other details with their respective fields
cron.schedule(
  "00 09 * * *",
  () => {
    updateAllUsersRegistrationDetailsOnCron();
    console.log("Cron running on every day at 9:00 AM IST ");
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);
cron.schedule(
  "00 09 * * *",
  () => {
    getUsersMDSOnlyCensusExpiryNear();
    console.log("mds only access expiry notification called");
  },
  {
    scheduled: true,
    timezone: "America/Chicago",
  }
);
// cron.schedule('00 10 * * *', () => {
//     airTableEventSyncUp();
//     console.log("Cron running on every day at 10:00 AM IST ")
// }, {
//     scheduled: true,
//     timezone: "Asia/Kolkata"
// });
app.get("/api", async (req, res) => {
  res.send(`<h3>Welcome Million Dollar Investment</h3>`);

  /** GooglePlayPurchase **/
  // await userControllers.GooglePlayPurchase();
});

server.listen(port, () => {
  console.log(`Listening to the port ${port}`);
});
