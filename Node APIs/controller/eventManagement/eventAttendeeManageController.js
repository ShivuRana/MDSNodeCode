const User = require("../../database/models/airTableSync");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const scheduleLib = require("node-schedule");
const {
  send_notification,
  notification_template,
  addTime,
  subtractTime,
  pad2,
} = require("../../utils/notification");
const { checkIfMsgReadSocket } = require("../chatcontroller");
const Notification = require("../../database/models/notification");
const ScheduledNotification = require("../../database/models/scheduledNotification");
const eventActivity = require("../../database/models/eventActivity");
const eventSession = require("../../database/models/eventSession");
const event = require("../../database/models/event");
const chat = require("../../database/models/chat");
const chatChannel = require("../../database/models/chatChannel");
const chatChannelMembers = require("../../database/models/chatChannelMembers");
const {
  addUpdateRecordInChatListForGroupChannel,
} = require("../socketChatController/chatListController");
const { get_user_by_socket } = require("../chatcontroller");
const moment = require("moment");
const { ObjectId } = require("mongodb");
require("moment-timezone");

/** User Routes for Attendees Starts **/
// guest login APIss
exports.loginGuest = async (req, res) => {
  try {
    const { email, passCode } = req.body;
    if (passCode) {
      const emailExist = await User.findOne({
        "Preferred Email": email.toLowerCase(),
      });
      if (emailExist === null) {
        return res
          .status(401)
          .send({ status: false, message: "Enter valid email address!" });
      }
      const passCodeExist = await User.findOne({
        "Preferred Email": email.toLowerCase(),
        passcode: passCode,
      });
      if (passCodeExist === null) {
        return res
          .status(401)
          .send({ status: false, message: "Enter valid passcode!" });
      } else {
        const userExist = await User.findOne({
          "Preferred Email": email.toLowerCase(),
          passcode: passCode,
        });
        if (userExist !== null) {
          const token = jwt.sign(
            { userID: userExist._id },
            process.env.JWT_SECRET
          );
          var userData = await User.findOneAndUpdate(
            { _id: userExist._id, isDelete: false },
            {
              $addToSet: {
                ...(req.body.deviceToken != null && {
                  deviceToken: req.body.deviceToken,
                }),
              },
            },
            { new: true }
          ).lean();
          if (!userData.otherdetail) {
            let name = userData.attendeeDetail.name;
            let userName = name.split(" ");
            userData.profileImg =
              userData.profileImg !== null && userData.profileImg !== ""
                ? userData.profileImg
                : userData.profileImg === undefined
                ? ""
                : userData.guestIcon === undefined
                ? ""
                : userData.guestIcon;
            userData = {
              ...userData,
              email: userData["Preferred Email"].toLowerCase()
                ? userData["Preferred Email"].toLowerCase()
                : "",
            };
            userData = {
              ...userData,
              otherdetail: {
                [`${process.env.USER_FN_ID}`]: userName[0] ? userName[0] : "",
                [`${process.env.USER_LN_ID}`]: userName[1] ? userName[1] : "",
              },
            };
          }
          userData.token = token;

          return res.status(201).send({
            status: true,
            message: "User login successfully.",
            data: userData,
          });
        } else {
          return res.status(401).send({
            status: false,
            message: "Invalid email address or passcode!",
          });
        }
      }
    } else {
      return res
        .status(401)
        .send({ status: false, message: "Enter email address or passcode!" });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: `Internal server error. ${error}` });
  }
};

// set attendee profile private or public
exports.setAttendeeProfilePrivateOrNot = async (req, res) => {
  try {
    const { id, eventId, privateProfile } = req.body;
    const attendeeId = ObjectId(id);
    let memberEventDetails = [];

    const getEventAttendee = await User.findOne({
      _id: attendeeId,
      $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
    }).lean();

    const attendeeEventDataExists =
      getEventAttendee.attendeeDetail.evntData.filter((data) => {
        if (data.event.toString() === eventId.toString()) {
          return data;
        }
      });

    if (attendeeEventDataExists.length > 0) {
      const eventDataDetail = getEventAttendee.attendeeDetail.evntData.filter(
        (evnt) => {
          if (evnt.event.toString() === eventId.toString()) return evnt;
        }
      );

      if (eventDataDetail.length > 0) {
        memberEventDetails = [
          ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
            if (evnt.event.toString() !== eventId.toString()) return evnt;
          }),
          { ...eventDataDetail[0], [`privateProfile`]: privateProfile },
        ];
      }
    }

    const updateAttendeeData = await User.findOneAndUpdate(
      { _id: getEventAttendee._id },
      {
        attendeeDetail: {
          title: getEventAttendee.attendeeDetail.title,
          firstName: getEventAttendee.attendeeDetail.firstName
            ? getEventAttendee.attendeeDetail.firstName
            : "",
          lastName: getEventAttendee.attendeeDetail.lastName
            ? getEventAttendee.attendeeDetail.lastName
            : "",
          name: getEventAttendee.attendeeDetail.name,
          company: getEventAttendee.attendeeDetail.company,
          profession: getEventAttendee.attendeeDetail.profession,
          phone: getEventAttendee.attendeeDetail.phone,
          facebook: getEventAttendee.attendeeDetail.facebook,
          linkedin: getEventAttendee.attendeeDetail.linkedin,
          auth0Id: getEventAttendee.auth0Id,
          description:
            getEventAttendee.attendeeDetail.description !== "" &&
            getEventAttendee.attendeeDetail.description !== null
              ? getEventAttendee.attendeeDetail.description
              : "",
          offer:
            getEventAttendee.attendeeDetail.offer !== "" &&
            getEventAttendee.attendeeDetail.offer !== null
              ? getEventAttendee.attendeeDetail.offer
              : "",
          evntData:
            memberEventDetails.length > 0
              ? memberEventDetails
              : getEventAttendee.attendeeDetail.evntData,
        },
      },
      { new: true }
    );

    if (updateAttendeeData)
      return res.status(200).json({
        status: true,
        message: "Event attendee profile updated successfully.",
        data: updateAttendeeData,
      });
    else
      return res
        .status(200)
        .json({ status: false, message: "Event attendee not found!" });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// add existing attendees to event
exports.addExistingAttendeeToEvent = async (req, res) => {
  try {
    const attendeesList = req.body.attendeesList;
    const eventId = ObjectId(req.body.eventId);
    const role = req.body.role.toString().toLowerCase();
    const io = req.app.get("socketio");
    const tmpAttendeesList = [];
    attendeesList.map((item) => {
      tmpAttendeesList.push(new ObjectId(item));
    });

    const attendeesLisExists = await User.countDocuments({
      _id: { $in: tmpAttendeesList },
    });
    var partnerCount = 0;
    if (role === "partner") {
      partnerCount = await User.countDocuments({
        _id: { $nin: tmpAttendeesList },
        "attendeeDetail.evntData": {
          $elemMatch: { event: ObjectId(eventId), partner: true },
        },
      });
    }
    const newChatChannelData = await chatChannel.find({
      eventId: eventId,
      $or: [
        { restrictedAccess: { $in: role } },
        { accessPermission: "public" },
        { accessPermission: "admin" },
      ],
      isDelete: false,
    });

    if (attendeesLisExists > 0) {
      const updatingAttendees = attendeesList.map(async (attendeeId) => {
        const attendee = await User.findOne({
          _id: ObjectId(attendeeId),
          $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
        }).lean();
        if (attendee !== null) {
          if (
            attendee.attendeeDetail !== null &&
            attendee.attendeeDetail !== undefined
          ) {
            const attendeeExists = await User.aggregate([
              {
                $match: {
                  _id: ObjectId(attendeeId),
                  "attendeeDetail.evntData": {
                    $elemMatch: { event: eventId, [`${role}`]: true },
                  },
                },
              },
            ]);
            if (attendeeExists.length <= 0) {
              const attendeeRoleExists = await User.aggregate([
                {
                  $match: {
                    _id: ObjectId(attendeeId),
                    "attendeeDetail.evntData": {
                      $elemMatch: { event: eventId },
                    },
                  },
                },
              ]);

              if (attendeeRoleExists.length > 0) {
                var settingData = {};

                if (role === "partner") {
                  settingData = {
                    [`attendeeDetail.evntData.$.${role}`]: true,
                    [`attendeeDetail.evntData.$.partnerOrder`]: ++partnerCount,
                  };
                } else {
                  settingData = {
                    [`attendeeDetail.evntData.$.${role}`]: true,
                  };
                }
                const attendeeUpdated = await User.findOneAndUpdate(
                  {
                    _id: ObjectId(attendeeId),
                    "attendeeDetail.evntData": {
                      $elemMatch: { event: eventId },
                    },
                  },
                  {
                    $set: settingData,
                  }
                );
              } else {
                const attendeeUpdated = await User.findOneAndUpdate(
                  { _id: ObjectId(attendeeId) },
                  {
                    $push: {
                      "attendeeDetail.evntData": {
                        event: eventId,
                        privateProfile: false,
                        member: role === "member" ? true : false,
                        speaker: role === "speaker" ? true : false,
                        partner: role === "partner" ? true : false,
                        guest: role === "guest" ? true : false,
                        partnerOrder: role === "partner" ? ++partnerCount : 0,
                      },
                    },
                  }
                );
              }
            } else {
            }
          } else {
            const attendeeUpdated = await User.findOneAndUpdate(
              { _id: ObjectId(attendeeId) },
              {
                isDelete: false,
                attendeeDetail: {
                  title: "",
                  email: attendee["Preferred Email"],
                  name: attendee.otherdetail
                    ? attendee.otherdetail[process.env.USER_FN_ID] +
                      " " +
                      attendee.otherdetail[process.env.USER_LN_ID]
                    : "",
                  firstName: attendee.attendeeDetail.firstName
                    ? attendee.attendeeDetail.firstName
                    : "",
                  lastName: attendee.attendeeDetail.lastName
                    ? attendee.attendeeDetail.lastName
                    : "",
                  company: "",
                  profession: "",
                  phone: "",
                  facebook: "",
                  linkedin: "",
                  auth0Id: attendee.auth0Id,
                  evntData: [
                    {
                      event: eventId,
                      privateProfile: false,
                      member: role === "member" ? true : false,
                      speaker: role === "speaker" ? true : false,
                      partner: role === "partner" ? true : false,
                      guest: role === "guest" ? true : false,
                      partnerOrder: role === "partner" ? ++partnerCount : 0,
                    },
                  ],
                },
              }
            );
          }
        } else {
        }
        if (newChatChannelData.length > 0) {
          const newMembers = newChatChannelData?.map(async (newChannel) => {
            if (
              newChannel.accessPermission !== "admin" ||
              (newChannel.accessPermission === "admin" &&
                attendee.migrate_user &&
                attendee.migrate_user.plan_id === "Staff")
            ) {
              const checkChannelMemberExists = await chatChannelMembers.find({
                userId: ObjectId(attendeeId),
                channelId: newChannel._id,
                status: 2,
              });
              if (checkChannelMemberExists.length === 0) {
                const channelMember = new chatChannelMembers({
                  userId: attendeeId,
                  channelId: newChannel._id,
                  status: 2,
                  user_type: "airtable-syncs",
                });
                if (!channelMember) {
                  return res.status(200).json({
                    status: false,
                    message:
                      "Something went wrong while adding members in channel!!",
                  });
                }
                await channelMember.save();
                const getAllChannelMembers = await chatChannelMembers.find({
                  channelId: newChannel._id,
                  status: 2,
                  user_type: "airtable-syncs",
                });
                var channelMembersChat = getAllChannelMembers
                  ? getAllChannelMembers.map((ids) => {
                      return {
                        id: ids.userId
                          ? ids.userId._id
                            ? ids.userId._id
                            : ids.userId
                          : ids.userId,
                        readmsg: false,
                      };
                    })
                  : [];
                channelMembersChat = [
                  ...channelMembersChat.filter((ids) => {
                    if (ids.id.toString() !== attendeeId.toString()) return ids;
                  }),
                  { id: attendeeId, readmsg: false },
                ];
                const time_stamp = moment
                  .utc()
                  .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]");
                const channelMessage = new chat({
                  message: "",
                  recipient_type: "chatChannel",
                  sender_type: "adminuser",
                  recipient: newChannel._id,
                  sender: req.admin_Id,
                  type: "chatChannel",
                  group_member: channelMembersChat,
                  activity_status: true,
                  activity: {
                    type: "addChannelMembers",
                    userId: [attendeeId],
                  },
                  userTimeStamp: time_stamp,
                });

                const channelMessageSave = await channelMessage.save();
                addUpdateRecordInChatListForGroupChannel(
                  "chatChannel",
                  "",
                  newChannel._id,
                  "",
                  "text",
                  time_stamp,
                  channelMembersChat,
                  [],
                  false
                );

                if (channelMessageSave) {
                  const userData = await User.findById(attendeeId);
                  if (
                    userData &&
                    userData.deleted_group_of_user &&
                    userData.deleted_group_of_user.includes(newChannel._id)
                  ) {
                    await User.findByIdAndUpdate(
                      attendeeId,
                      {
                        $pull: { deleted_group_of_user: newChannel._id },
                      },
                      { new: true }
                    );
                  }
                }
                const chatResult = channelMessageSave._doc;
                const chatData = {
                  ...chatResult,
                  recipient: {
                    id: chatResult.recipient._id,
                    firstname: newChannel.channelName ?? "",
                    image: newChannel.channelIcon ?? "",
                    type: "chatChannel",
                  },
                  sender: {
                    id: chatResult.sender ? chatResult.sender._id : "",
                    firstname: chatResult.sender
                      ? chatResult.sender.first_name ?? ""
                      : "",
                    image: "",
                    type: "adminuser",
                  },
                  activity: {
                    type: chatResult.activity.type,
                    date: chatResult.activity.date,
                    _id: chatResult.activity._id,
                    userId: chatResult.activity.userId
                      ? chatResult.activity.userId.map((user) => {
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

                let allMembersIdsSocket = channelMembersChat?.map((member) => {
                  return member.id;
                });
                allMembersIdsSocket?.map((grp_member) => {
                  if (grp_member) {
                    get_user_by_socket(grp_member).then((resp) => {
                      if (resp !== undefined && resp.socket_id !== undefined) {
                        for (var i = 0; i < resp.socket_id.length; i++) {
                          io.to(resp.socket_id[i]).emit("receive", {
                            message: [chatData],
                          });
                        }
                      }
                    });
                  }
                });
              }
            } else {
              return {};
            }
          });
          await Promise.all([...newMembers]);
        }
      });

      return res
        .status(200)
        .json({ status: true, message: "Attendees added to event!", data: [] });
    } else {
      return res
        .status(200)
        .json({ status: true, message: "Attendees not exists!", data: [] });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// common function for reSchedule Notification
exports.reScheduleNotificationForActivitySession = async (
  authUserId,
  eventId,
  activityId,
  sessionId,
  scheduleForData
) => {
  try {
    const authUser = ObjectId(authUserId);
    let chatData = {},
      data = {},
      notificationData = {};
    const scheduleFor = scheduleForData;
    const userData = await User.findOne({ _id: ObjectId(authUser) });
    const userName = userData.otherdetail
      ? userData.otherdetail[process.env.USER_FN_ID] +
        " " +
        userData.otherdetail[process.env.USER_LN_ID]
      : "";
    const eventID = eventId ? ObjectId(eventId) : null;
    const activityID = activityId ? ObjectId(activityId) : null;
    const sessionID = sessionId ? ObjectId(sessionId) : null;
    const eventData = await event.findOne({ _id: eventID });
    let activityDetail = await eventActivity.aggregate([
      {
        $match: { _id: activityID, isDelete: false },
      },
      {
        $lookup: {
          from: "sessions",
          let: { activity_session_id: "$session" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$activity_session_id"],
                },
                member: true,
              },
            },
            {
              $lookup: {
                from: "rooms",
                let: { activity_rooms_id: "$room" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$_id", "$$activity_rooms_id"],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "eventlocations",
                      let: { location_id: "$location" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$_id", "$$location_id"],
                            },
                          },
                        },
                        {
                          $project: {
                            name: 1,
                            address: 1,
                            country: 1,
                            city: 1,
                            latitude: 1,
                            longitude: 1,
                            locationVisible: 1,
                            locationImages: 1,
                          },
                        },
                      ],
                      as: "location",
                    },
                  },
                  {
                    $unwind: "$location",
                  },
                  { $project: { location: 1 } },
                ],
                as: "room",
              },
            },
            {
              $unwind: "$room",
            },
            { $project: { room: 1 } },
          ],
          as: "sessions",
        },
      },
      {
        $lookup: {
          from: "eventlocations",
          let: { activity_location_id: "$location" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$activity_location_id"],
                },
              },
            },
            {
              $project: {
                name: 1,
                address: 1,
                country: 1,
                city: 1,
                latitude: 1,
                longitude: 1,
                locationVisible: 1,
                locationImages: 1,
              },
            },
          ],
          as: "location",
        },
      },
      {
        $addFields: {
          sessionCount: {
            $cond: {
              if: { $isArray: "$sessions" },
              then: { $size: "$sessions" },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          icon: 1,
          description: "$shortDescription",
          shortDescription: 1,
          longDescription: 1,
          date: 1,
          startTime: 1,
          endDate: 1,
          endTime: 1,
          reserved: 1,
          reserved_URL: 1,
          location: 1,
          sessions: 1,
          member: 1,
          speaker: 1,
          partner: 1,
          guest: 1,
          sessionCount: 1,
          notifyChanges: 1,
          notifyChangeText: 1,
        },
      },
    ]);
    const activityData = activityDetail[0];
    const sessionData = await eventSession.findOne({
      _id: sessionID,
      event: eventID,
    });

    if (eventID !== null && activityID !== null && sessionID === null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "activity") {
        const NotificationFor = {
          id: activityID,
          type: scheduleFor,
          setBy: "user",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: {
              $elemMatch: { id: new ObjectId(activityID), setBy: "user" },
            },
          },
          { "notificationFor.$": 1 }
        );

        if (alreadyAdded !== null) {
          const scheduleData = await ScheduledNotification.findOne({
            createdFor: userData._id,
            idsFor: activityData._id,
          });
          if (scheduleData !== null) {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $pull: { notificationFor: NotificationFor } },
              { new: true }
            );
            const cancelData = await ScheduledNotification.findByIdAndRemove(
              scheduleData._id,
              { new: true }
            );
          }
        }

        const activityDate = activityData.date;
        const activityTime = activityData.startTime;
        const timeZone = eventData.timeZone;
        const sign = timeZone.substring(4, 5);
        const utcHour = timeZone.substring(5, 7);
        const utcMinute = timeZone.substring(8, 10);
        const before30MinTime = moment(activityTime, "h:mm a")
          .subtract(15, "minutes")
          .format("HH:mm");

        // saprate date and time in hours and mins
        const year = moment(activityDate, "MM-DD-YYYY").year();
        const month = moment(activityDate, "MM-DD-YYYY").month(); // Month is zero-indexed
        const day = moment(activityDate, "MM-DD-YYYY").get("date");
        const hours = moment(before30MinTime, "h:mm a").hours();
        const minutes = moment(before30MinTime, "h:mm a").minutes();

        var scheduleTime = new Date(year, month, day, hours, minutes);
        if (sign === "+") {
          scheduleTime = await subtractTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        } else if (sign === "-") {
          scheduleTime = await addTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        }

        // Schedule Notification code
        chatData = {
          receiverId: userData._id,
          receiverName: userName,
          receiverImage: userData.profileImg,
          eventId: eventData._id,
          eventName: eventData.title ? eventData.title : "",
          activityId: activityData._id,
          activityName: activityData.name ? activityData.name : "",
          activityImage: activityData.icon,
          sessionCount: activityData.sessionCount,
          chatType: "activityReminder",
        };

        notificationData = {
          receiverName: userName,
          activityName: activityData.name ? activityData.name : "",
          eventName: eventData.title ? eventData.title : "",
          chatType: "activityReminder",
        };

        let notificationTemplate =
          await notification_template.user_activity_reminder(notificationData);
        let userDeviceToken = await User.findOne(
          { _id: userData._id },
          { deviceToken: 1 }
        );

        data = {
          notificationName: activityData.name ? activityData.name : "",
          notificationIdFor: activityData._id,
          notificationDate: activityData.date,
          notificationTime: activityData.startTime,
          scheduleTime: scheduleTime,
          notificationTemplate: notificationTemplate,
          userDeviceToken: userDeviceToken,
          chatData: chatData,
          userData: userData,
          scheduleFor: scheduleFor,
          createdBy: "user",
          messageType: "user_activity_reminder",
        };

        await new Notification({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: process.env.ADMIN_ID,
          createdFor: userData._id,
          read: true,
          role: "activityReminder",
        }).save();
        await this.schedule(data);
      }
    } else if (eventID !== null && activityID === null && sessionID !== null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "session") {
        const NotificationFor = {
          id: sessionID,
          type: scheduleFor,
          setBy: "user",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: {
              $elemMatch: { id: new ObjectId(sessionID), setBy: "user" },
            },
          },
          { "notificationFor.$": 1 }
        );

        if (alreadyAdded !== null) {
          const scheduleData = await ScheduledNotification.findOne({
            createdFor: userData._id,
            idsFor: sessionData._id,
          });
          if (scheduleData !== null) {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $pull: { notificationFor: NotificationFor } },
              { new: true }
            );
            const cancelData = await ScheduledNotification.findByIdAndRemove(
              scheduleData._id,
              { new: true }
            );
          }
        }

        const sessionDate = sessionData.date;
        const sessionTime = sessionData.startTime;
        const timeZone = eventData.timeZone;
        const sign = timeZone.substring(4, 5);
        const utcHour = timeZone.substring(5, 7);
        const utcMinute = timeZone.substring(8, 10);
        const before30MinTime = moment(sessionTime, "h:mm a")
          .subtract(15, "minutes")
          .format("HH:mm");

        // saprate date and time in hours and mins
        const year = moment(sessionDate, "MM-DD-YYYY").year();
        const month = moment(sessionDate, "MM-DD-YYYY").month(); // Month is zero-indexed
        const day = moment(sessionDate, "MM-DD-YYYY").get("date");
        const hours = moment(before30MinTime, "h:mm a").hours();
        const minutes = moment(before30MinTime, "h:mm a").minutes();

        var scheduleTime = new Date(year, month, day, hours, minutes);
        if (sign === "+") {
          scheduleTime = await subtractTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        } else if (sign === "-") {
          scheduleTime = await addTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        }

        // Schedule Notification code
        chatData = {
          receiverId: userData._id,
          receiverName: userName,
          receiverImage: userData.profileImg,
          eventId: eventData._id,
          eventName: eventData.title ? eventData.title : "",
          sessionId: sessionData._id,
          sessionName: sessionData.title ? sessionData.title : "",
          chatType: "sessionReminder",
        };

        notificationData = {
          receiverName: userName,
          sessionName: sessionData.title ? sessionData.title : "",
          eventName: eventData.title ? eventData.title : "",
          chatType: "sessionReminder",
        };

        let notificationTemplate =
          await notification_template.user_session_reminder(notificationData);
        let userDeviceToken = await User.findOne(
          { _id: userData._id },
          { deviceToken: 1 }
        );

        data = {
          notificationName: sessionData.title ? sessionData.title : "",
          notificationIdFor: sessionData._id,
          notificationDate: sessionData.date,
          notificationTime: sessionData.startTime,
          scheduleTime: scheduleTime,
          notificationTemplate: notificationTemplate,
          userDeviceToken: userDeviceToken,
          chatData: chatData,
          userData: userData,
          scheduleFor: scheduleFor,
          createdBy: "user",
          messageType: "user_session_reminder",
        };

        await this.schedule(data);
        await new Notification({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: process.env.ADMIN_ID,
          createdFor: userData._id,
          read: true,
          role: "sessionReminder",
        }).save();
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

// common function for schedule Notification
exports.scheduleNotificationFormAdmin = async (
  authUserId,
  eventId,
  activityId,
  sessionId,
  scheduleForData,
  scheduleNotifyTimeData
) => {
  try {
    const authUser = ObjectId(authUserId);
    let chatData = {},
      data = {},
      notificationData = {};
    const scheduleFor = scheduleForData;
    const scheduleNotifyTime = scheduleNotifyTimeData;
    const userData = await User.findOne({ _id: ObjectId(authUser) });
    const userName = userData.otherdetail
      ? userData.otherdetail[process.env.USER_FN_ID] +
        " " +
        userData.otherdetail[process.env.USER_LN_ID]
      : "";
    const eventID = eventId ? ObjectId(eventId) : null;
    const activityID = activityId ? ObjectId(activityId) : null;
    const sessionID = sessionId ? ObjectId(sessionId) : null;
    const eventData = await event.findOne({ _id: eventID });
    let activityDetail = await eventActivity.aggregate([
      {
        $match: { _id: activityID, isDelete: false },
      },
      {
        $lookup: {
          from: "sessions",
          let: { activity_session_id: "$session" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$activity_session_id"],
                },
                member: true,
              },
            },
            {
              $lookup: {
                from: "rooms",
                let: { activity_rooms_id: "$room" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$_id", "$$activity_rooms_id"],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "eventlocations",
                      let: { location_id: "$location" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$_id", "$$location_id"],
                            },
                          },
                        },
                        {
                          $project: {
                            name: 1,
                            address: 1,
                            country: 1,
                            city: 1,
                            latitude: 1,
                            longitude: 1,
                            locationVisible: 1,
                            locationImages: 1,
                          },
                        },
                      ],
                      as: "location",
                    },
                  },
                  {
                    $unwind: "$location",
                  },
                  { $project: { location: 1 } },
                ],
                as: "room",
              },
            },
            {
              $unwind: "$room",
            },
            { $project: { room: 1 } },
          ],
          as: "sessions",
        },
      },
      {
        $lookup: {
          from: "eventlocations",
          let: { activity_location_id: "$location" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$activity_location_id"],
                },
              },
            },
            {
              $project: {
                name: 1,
                address: 1,
                country: 1,
                city: 1,
                latitude: 1,
                longitude: 1,
                locationVisible: 1,
                locationImages: 1,
              },
            },
          ],
          as: "location",
        },
      },
      {
        $addFields: {
          sessionCount: {
            $cond: {
              if: { $isArray: "$sessions" },
              then: { $size: "$sessions" },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          icon: 1,
          description: "$shortDescription",
          shortDescription: 1,
          longDescription: 1,
          date: 1,
          startTime: 1,
          endDate: 1,
          endTime: 1,
          reserved: 1,
          reserved_URL: 1,
          location: 1,
          sessions: 1,
          member: 1,
          speaker: 1,
          partner: 1,
          guest: 1,
          sessionCount: 1,
          notifyChanges: 1,
          notifyChangeText: 1,
        },
      },
    ]);
    const activityData = activityDetail[0];
    const sessionData = await eventSession.findOne({
      _id: sessionID,
      event: eventID,
    });

    if (eventID !== null && activityID !== null && sessionID === null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "activity") {
        const NotificationFor = {
          id: activityID,
          type: scheduleFor,
          setBy: "admin",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: {
              $elemMatch: { id: new ObjectId(activityID), setBy: "admin" },
            },
          },
          { "notificationFor.$": 1 }
        );

        if (alreadyAdded !== null) {
          const scheduleData = await ScheduledNotification.findOne({
            createdFor: userData._id,
            idsFor: activityData._id,
          });
          if (scheduleData !== null) {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $pull: { notificationFor: NotificationFor } },
              { new: true }
            );
            const cancelData = await ScheduledNotification.findByIdAndRemove(
              scheduleData._id,
              { new: true }
            );
          }
        }

        await User.findOneAndUpdate(
          { _id: userData._id },
          { $push: { notificationFor: NotificationFor } },
          { new: true }
        );
        const activityDate = activityData.date;
        const activityTime = activityData.startTime;
        const timeZone = eventData.timeZone;
        const sign = timeZone.substring(4, 5);
        const utcHour = timeZone.substring(5, 7);
        const utcMinute = timeZone.substring(8, 10);
        const before30MinTime = moment(activityTime, "h:mm a")
          .subtract(scheduleNotifyTime, "minutes")
          .format("HH:mm");

        // saprate date and time in hours and mins
        const year = moment(activityDate, "MM-DD-YYYY").year();
        const month = moment(activityDate, "MM-DD-YYYY").month(); // Month is zero-indexed
        const day = moment(activityDate, "MM-DD-YYYY").get("date");
        const hours = moment(before30MinTime, "h:mm a").hours();
        const minutes = moment(before30MinTime, "h:mm a").minutes();

        var scheduleTime = new Date(year, month, day, hours, minutes);
        if (sign === "+") {
          scheduleTime = await subtractTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        } else if (sign === "-") {
          scheduleTime = await addTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        }

        // Schedule Notification code
        chatData = {
          receiverId: userData._id,
          receiverName: userName,
          receiverImage: userData.profileImg,
          eventId: eventData._id,
          eventName: eventData.title ? eventData.title : "",
          activityId: activityData._id,
          activityName: activityData.name ? activityData.name : "",
          activityImage: activityData.icon,
          sessionCount: activityData.sessionCount,
          chatType: "activityReminder",
        };

        notificationData = {
          receiverName: userName,
          activityName: activityData.name ? activityData.name : "",
          eventName: eventData.title ? eventData.title : "",
          scheduleNotifyTime:
            scheduleNotifyTime === "120"
              ? "2 hours"
              : scheduleNotifyTime === "60"
              ? "1 hours"
              : `${scheduleNotifyTime} minutes.`,
          chatType: "activityReminder",
        };

        let notificationTemplate =
          await notification_template.admin_activity_reminder(notificationData);
        let userDeviceToken = await User.findOne(
          { _id: userData._id },
          { deviceToken: 1 }
        );

        data = {
          notificationName: activityData.name ? activityData.name : "",
          notificationIdFor: activityData._id,
          notificationDate: activityData.date,
          notificationTime: activityData.startTime,
          scheduleTime: scheduleTime,
          notificationTemplate: notificationTemplate,
          userDeviceToken: userDeviceToken,
          chatData: chatData,
          userData: userData,
          scheduleFor: scheduleFor,
          createdBy: "admin",
          messageType: "user_activity_reminder",
        };

        await new Notification({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: process.env.ADMIN_ID,
          createdFor: userData._id,
          read: true,
          role: "activityReminder",
        }).save();
        await this.adminSchedule(data);
      }
    } else if (eventID !== null && activityID === null && sessionID !== null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "session") {
        const NotificationFor = {
          id: sessionID,
          type: scheduleFor,
          setBy: "admin",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: {
              $elemMatch: { id: new ObjectId(sessionID), setBy: "admin" },
            },
          },
          { "notificationFor.$": 1 }
        );

        if (alreadyAdded !== null) {
          const scheduleData = await ScheduledNotification.findOne({
            createdFor: userData._id,
            idsFor: sessionData._id,
          });
          if (scheduleData !== null) {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $pull: { notificationFor: NotificationFor } },
              { new: true }
            );
            const cancelData = await ScheduledNotification.findByIdAndRemove(
              scheduleData._id,
              { new: true }
            );
          }
        }

        await User.findOneAndUpdate(
          { _id: userData._id },
          { $push: { notificationFor: NotificationFor } },
          { new: true }
        );
        const sessionDate = sessionData.date;
        const sessionTime = sessionData.startTime;
        const timeZone = eventData.timeZone;
        const sign = timeZone.substring(4, 5);
        const utcHour = timeZone.substring(5, 7);
        const utcMinute = timeZone.substring(8, 10);
        const before30MinTime = moment(sessionTime, "h:mm a")
          .subtract(scheduleNotifyTime, "minutes")
          .format("HH:mm");

        // saprate date and time in hours and mins
        const year = moment(sessionDate, "MM-DD-YYYY").year();
        const month = moment(sessionDate, "MM-DD-YYYY").month(); // Month is zero-indexed
        const day = moment(sessionDate, "MM-DD-YYYY").get("date");
        const hours = moment(before30MinTime, "h:mm a").hours();
        const minutes = moment(before30MinTime, "h:mm a").minutes();

        var scheduleTime = new Date(year, month, day, hours, minutes);
        if (sign === "+") {
          scheduleTime = await subtractTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        } else if (sign === "-") {
          scheduleTime = await addTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        }

        // Schedule Notification code
        chatData = {
          receiverId: userData._id,
          receiverName: userName,
          receiverImage: userData.profileImg,
          eventId: eventData._id,
          eventName: eventData.title ? eventData.title : "",
          sessionId: sessionData._id,
          sessionName: sessionData.title ? sessionData.title : "",
          chatType: "sessionReminder",
        };

        notificationData = {
          receiverName: userName,
          sessionName: sessionData.title ? sessionData.title : "",
          eventName: eventData.title ? eventData.title : "",
          scheduleNotifyTime:
            scheduleNotifyTime === "120"
              ? "2 hours"
              : scheduleNotifyTime === "60"
              ? "1 hours"
              : `${scheduleNotifyTime} minutes.`,
          chatType: "sessionReminder",
        };

        let notificationTemplate =
          await notification_template.admin_session_reminder(notificationData);
        let userDeviceToken = await User.findOne(
          { _id: userData._id },
          { deviceToken: 1 }
        );

        data = {
          notificationName: sessionData.title ? sessionData.title : "",
          notificationIdFor: sessionData._id,
          notificationDate: sessionData.date,
          notificationTime: sessionData.startTime,
          scheduleTime: scheduleTime,
          notificationTemplate: notificationTemplate,
          userDeviceToken: userDeviceToken,
          chatData: chatData,
          userData: userData,
          scheduleFor: scheduleFor,
          createdBy: "admin",
          messageType: "user_session_reminder",
        };

        await this.adminSchedule(data);
        await new Notification({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: process.env.ADMIN_ID,
          createdFor: userData._id,
          read: true,
          role: "sessionReminder",
        }).save();
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

// common function for reSchedule Notification
exports.reScheduleNotificationFormAdmin = async (
  authUserId,
  eventId,
  activityId,
  sessionId,
  scheduleForData,
  scheduleNotifyTimeData
) => {
  try {
    const authUser = ObjectId(authUserId);
    let chatData = {},
      data = {},
      notificationData = {};
    const scheduleFor = scheduleForData;
    const scheduleNotifyTime = scheduleNotifyTimeData;
    const userData = await User.findOne({ _id: ObjectId(authUser) });
    const userName = userData.otherdetail
      ? userData.otherdetail[process.env.USER_FN_ID] +
        " " +
        userData.otherdetail[process.env.USER_LN_ID]
      : "";
    const eventID = eventId ? ObjectId(eventId) : null;
    const activityID = activityId ? ObjectId(activityId) : null;
    const sessionID = sessionId ? ObjectId(sessionId) : null;
    const eventData = await event.findOne({ _id: eventID });
    let activityDetail = await eventActivity.aggregate([
      {
        $match: { _id: activityID, isDelete: false },
      },
      {
        $lookup: {
          from: "sessions",
          let: { activity_session_id: "$session" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$activity_session_id"],
                },
                member: true,
              },
            },
            {
              $lookup: {
                from: "rooms",
                let: { activity_rooms_id: "$room" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$_id", "$$activity_rooms_id"],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "eventlocations",
                      let: { location_id: "$location" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$_id", "$$location_id"],
                            },
                          },
                        },
                        {
                          $project: {
                            name: 1,
                            address: 1,
                            country: 1,
                            city: 1,
                            latitude: 1,
                            longitude: 1,
                            locationVisible: 1,
                            locationImages: 1,
                          },
                        },
                      ],
                      as: "location",
                    },
                  },
                  {
                    $unwind: "$location",
                  },
                  { $project: { location: 1 } },
                ],
                as: "room",
              },
            },
            {
              $unwind: "$room",
            },
            { $project: { room: 1 } },
          ],
          as: "sessions",
        },
      },
      {
        $lookup: {
          from: "eventlocations",
          let: { activity_location_id: "$location" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$activity_location_id"],
                },
              },
            },
            {
              $project: {
                name: 1,
                address: 1,
                country: 1,
                city: 1,
                latitude: 1,
                longitude: 1,
                locationVisible: 1,
                locationImages: 1,
              },
            },
          ],
          as: "location",
        },
      },
      {
        $addFields: {
          sessionCount: {
            $cond: {
              if: { $isArray: "$sessions" },
              then: { $size: "$sessions" },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          icon: 1,
          description: "$shortDescription",
          shortDescription: 1,
          longDescription: 1,
          date: 1,
          startTime: 1,
          endDate: 1,
          endTime: 1,
          reserved: 1,
          reserved_URL: 1,
          location: 1,
          sessions: 1,
          member: 1,
          speaker: 1,
          partner: 1,
          guest: 1,
          sessionCount: 1,
          notifyChanges: 1,
          notifyChangeText: 1,
        },
      },
    ]);
    const activityData = activityDetail[0];
    const sessionData = await eventSession.findOne({
      _id: sessionID,
      event: eventID,
    });

    if (eventID !== null && activityID !== null && sessionID === null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "activity") {
        const NotificationFor = {
          id: activityID,
          type: scheduleFor,
          setBy: "admin",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: {
              $elemMatch: { id: new ObjectId(activityID), setBy: "admin" },
            },
          },
          { "notificationFor.$": 1 }
        );

        if (alreadyAdded !== null) {
          const scheduleData = await ScheduledNotification.findOne({
            createdFor: userData._id,
            idsFor: activityData._id,
          });
          if (scheduleData !== null) {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $pull: { notificationFor: NotificationFor } },
              { new: true }
            );
            const cancelData = await ScheduledNotification.findByIdAndRemove(
              scheduleData._id,
              { new: true }
            );
          }
        }

        await User.findOneAndUpdate(
          { _id: userData._id },
          { $push: { notificationFor: NotificationFor } },
          { new: true }
        );
        const activityDate = activityData.date;
        const activityTime = activityData.startTime;
        const timeZone = eventData.timeZone;
        const sign = timeZone.substring(4, 5);
        const utcHour = timeZone.substring(5, 7);
        const utcMinute = timeZone.substring(8, 10);
        const before30MinTime = moment(activityTime, "h:mm a")
          .subtract(scheduleNotifyTime, "minutes")
          .format("HH:mm");

        // saprate date and time in hours and mins
        var year = moment(activityDate, "MM-DD-YYYY").year();
        var month = moment(activityDate, "MM-DD-YYYY").month(); // Month is zero-indexed
        var day = moment(activityDate, "MM-DD-YYYY").get("date");
        var hours = moment(before30MinTime, "HH:mm").hours();
        var minutes = moment(before30MinTime, "HH:mm").minutes();
        var scheduleTime = "";
        var scheduleTimeOut = new Date(year, month, day, hours, minutes);
        if (sign === "+") {
          scheduleTime = await subtractTime(
            scheduleTimeOut,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        } else if (sign === "-") {
          scheduleTime = await addTime(
            scheduleTimeOut,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        }

        // Schedule Notification code
        chatData = {
          receiverId: userData._id,
          receiverName: userName,
          receiverImage: userData.profileImg,
          eventId: eventData._id,
          eventName: eventData.title ? eventData.title : "",
          activityId: activityData._id,
          activityName: activityData.name ? activityData.name : "",
          activityImage: activityData.icon,
          sessionCount: activityData.sessionCount,
          chatType: "activityReminder",
        };

        notificationData = {
          receiverName: userName,
          activityName: activityData.name ? activityData.name : "",
          eventName: eventData.title ? eventData.title : "",
          scheduleNotifyTime:
            scheduleNotifyTime === "120"
              ? "2 hours"
              : scheduleNotifyTime === "60"
              ? "1 hours"
              : `${scheduleNotifyTime} minutes.`,
          chatType: "activityReminder",
        };

        let notificationTemplate =
          await notification_template.admin_activity_reminder(notificationData);
        let userDeviceToken = await User.findOne(
          { _id: userData._id },
          { deviceToken: 1 }
        );

        data = {
          notificationName: activityData.title ? activityData.title : "",
          notificationIdFor: activityData._id,
          notificationDate: activityData.date,
          notificationTime: activityData.startTime,
          scheduleTime: scheduleTime,
          notificationTemplate: notificationTemplate,
          userDeviceToken: userDeviceToken,
          chatData: chatData,
          userData: userData,
          scheduleFor: scheduleFor,
          createdBy: "admin",
          messageType: "user_session_reminder",
        };

        await this.adminSchedule(data);
        await new Notification({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: process.env.ADMIN_ID,
          createdFor: userData._id,
          read: true,
          role: "activityReminder",
        }).save();
      }
    } else if (eventID !== null && activityID === null && sessionID !== null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "session") {
        const NotificationFor = {
          id: sessionID,
          type: scheduleFor,
          setBy: "admin",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: {
              $elemMatch: { id: new ObjectId(sessionID), setBy: "admin" },
            },
          },
          { "notificationFor.$": 1 }
        );

        if (alreadyAdded !== null) {
          const scheduleData = await ScheduledNotification.findOne({
            createdFor: userData._id,
            idsFor: sessionData._id,
          });
          if (scheduleData !== null) {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $pull: { notificationFor: NotificationFor } },
              { new: true }
            );
            const cancelData = await ScheduledNotification.findByIdAndRemove(
              scheduleData._id,
              { new: true }
            );
          }
        }

        await User.findOneAndUpdate(
          { _id: userData._id },
          { $push: { notificationFor: NotificationFor } },
          { new: true }
        );
        const sessionDate = sessionData.date;
        const sessionTime = sessionData.startTime;
        const timeZone = eventData.timeZone;
        const sign = timeZone.substring(4, 5);
        const utcHour = timeZone.substring(5, 7);
        const utcMinute = timeZone.substring(8, 10);
        const before30MinTime = moment(sessionTime, "h:mm a")
          .subtract(scheduleNotifyTime, "minutes")
          .format("HH:mm");

        // saprate date and time in hours and mins
        const year = moment(sessionDate, "MM-DD-YYYY").year();
        const month = moment(sessionDate, "MM-DD-YYYY").month(); // Month is zero-indexed
        const day = moment(sessionDate, "MM-DD-YYYY").get("date");
        const hours = moment(before30MinTime, "h:mm a").hours();
        const minutes = moment(before30MinTime, "h:mm a").minutes();

        var scheduleTime = new Date(year, month, day, hours, minutes);
        if (sign === "+") {
          scheduleTime = await subtractTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        } else if (sign === "-") {
          scheduleTime = await addTime(
            scheduleTime,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        }

        // Schedule Notification code
        chatData = {
          receiverId: userData._id,
          receiverName: userName,
          receiverImage: userData.profileImg,
          eventId: eventData._id,
          eventName: eventData.title ? eventData.title : "",
          sessionId: sessionData._id,
          sessionName: sessionData.title ? sessionData.title : "",
          chatType: "sessionReminder",
        };

        notificationData = {
          receiverName: userName,
          sessionName: sessionData.title ? sessionData.title : "",
          eventName: eventData.title ? eventData.title : "",
          scheduleNotifyTime:
            scheduleNotifyTime === "120"
              ? "2 hours"
              : scheduleNotifyTime === "60"
              ? "1 hours"
              : `${scheduleNotifyTime} minutes.`,
          chatType: "sessionReminder",
        };

        let notificationTemplate =
          await notification_template.admin_session_reminder(notificationData);
        let userDeviceToken = await User.findOne(
          { _id: userData._id },
          { deviceToken: 1 }
        );

        data = {
          notificationName: sessionData.title ? sessionData.title : "",
          notificationIdFor: sessionData._id,
          notificationDate: sessionData.date,
          notificationTime: sessionData.startTime,
          scheduleTime: scheduleTime,
          notificationTemplate: notificationTemplate,
          userDeviceToken: userDeviceToken,
          chatData: chatData,
          userData: userData,
          scheduleFor: scheduleFor,
          createdBy: "admin",
          messageType: "user_session_reminder",
        };

        await this.adminSchedule(data);
        await new Notification({
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
          createdBy: process.env.ADMIN_ID,
          createdFor: userData._id,
          read: true,
          role: "sessionReminder",
        }).save();
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

// create schedule for send notification
exports.schedule = async function (data) {
  try {
    const notificationName = data.notificationName;
    const notificationIdFor = data.notificationIdFor;
    const scheduleFor = data.scheduleFor;
    const notificationDate = data.notificationDate;
    const notificationTime = data.notificationTime;
    const createdBy = data.createdBy;
    const scheduleTime = data.scheduleTime;
    const notificationTemplate = data.notificationTemplate;
    const userDeviceToken = data.userDeviceToken;
    const chatData = data.chatData;
    const userData = data.userData;
    const messageType = data.messageType;

    const scheduledNotification = new ScheduledNotification({
      name: notificationName,
      notificationFor: scheduleFor,
      time: notificationTime,
      date: notificationDate,
      idsFor: notificationIdFor,
      createdFor: userData._id,
      createdBy: createdBy,
      notification: {
        title: notificationTemplate?.template?.title,
        body: notificationTemplate?.template?.body,
      },
    });
    await scheduledNotification.save();
    const scheduleId = scheduledNotification._id.toString();
    let unReadCount = await checkIfMsgReadSocket(userData._id);
    if (userDeviceToken.deviceToken.length !== 0) {
      if (userDeviceToken.deviceToken) {
        // Define the function to be executed when the schedule is triggered
        const jobFunction = async (data) => {
          console.log("setuping_job");
          const alreadyAddedUser = await User.findOne(
            {
              _id: userData._id,
              notificationFor: {
                $elemMatch: { id: new ObjectId(notificationIdFor) },
              },
              setupBy: "user",
            },
            { "notificationFor.$": 1 }
          );
          console.log(alreadyAddedUser, "alreadyAddedUser");
          if (alreadyAddedUser !== null) {
            await send_notification(data);
          }
        };
        console.log(scheduleTime, "dateTime");

        // Schedule the job
        scheduleLib.scheduleJob(scheduleId, scheduleTime, async () => {
          let data = {
            notification: notificationTemplate?.template?.title,
            description: notificationTemplate?.template?.body,
            device_token: userDeviceToken.deviceToken,
            collapse_key: userData._id,
            badge_count: unReadCount,
            sub_title: "",
            notification_data: {
              type: messageType,
              content: chatData,
            },
          };
          await jobFunction(data);
        });
        return {
          status: true,
          message: "Notification schedule successfully.",
          data: scheduleId,
        };
      }
    }
  } catch (error) {
    return {
      status: false,
      message: "There is something worng when schedule notification!",
      error: `${error.message}`,
    };
  }
};

exports.adminSchedule = async function (data) {
  try {
    const notificationName = data.notificationName;
    const notificationIdFor = data.notificationIdFor;
    const scheduleFor = data.scheduleFor;
    const notificationDate = data.notificationDate;
    const notificationTime = data.notificationTime;
    const createdBy = data.createdBy;
    const scheduleTime = data.scheduleTime;
    const notificationTemplate = data.notificationTemplate;
    const userDeviceToken = data.userDeviceToken;
    const chatData = data.chatData;
    const userData = data.userData;
    const messageType = data.messageType;

    const scheduledNotification = new ScheduledNotification({
      name: notificationName,
      notificationFor: scheduleFor,
      time: notificationTime,
      date: notificationDate,
      idsFor: notificationIdFor,
      createdFor: userData._id,
      createdBy: createdBy,
      notification: {
        title: notificationTemplate?.template?.title,
        body: notificationTemplate?.template?.body,
      },
    });
    await scheduledNotification.save();
    const scheduleId = scheduledNotification._id.toString();
    let unReadCount = await checkIfMsgReadSocket(userData._id);
    if (userDeviceToken.deviceToken.length !== 0) {
      if (userDeviceToken.deviceToken) {
        // Define the function to be executed when the schedule is triggered
        const jobFunction = async (data) => {
          console.log("setuping_job");
          const alreadyAddedAdmin = await User.findOne(
            {
              _id: userData._id,
              notificationFor: {
                $elemMatch: { id: new ObjectId(notificationIdFor) },
              },
              setupBy: "admin",
            },
            { "notificationFor.$": 1 }
          );
          console.log(alreadyAddedAdmin, "alreadyAddedAdmin");
          if (alreadyAddedAdmin !== null) {
            await send_notification(data);
          }
        };
        console.log(scheduleTime, "dateTime");

        // Schedule the job
        scheduleLib.scheduleJob(scheduleId, scheduleTime, async () => {
          let data = {
            notification: notificationTemplate?.template?.title,
            description: notificationTemplate?.template?.body,
            device_token: userDeviceToken.deviceToken,
            collapse_key: userData._id,
            badge_count: unReadCount,
            sub_title: "",
            notification_data: {
              type: messageType,
              content: chatData,
            },
          };
          await jobFunction(data);
        });
        return {
          status: true,
          message: "Notification schedule successfully.",
          data: scheduleId,
        };
      }
    }
  } catch (error) {
    return {
      status: false,
      message: "There is something worng when schedule notification!",
      error: `${error.message}`,
    };
  }
};

// create reSchedule for send notification
exports.reSchedule = async function (data) {
  try {
    const scheduleId = data.scheduleId;
    const notificationName = data.notificationName;
    const notificationIdFor = data.notificationIdFor;
    const scheduleFor = data.scheduleFor;
    const notificationDate = data.notificationDate;
    const notificationTime = data.notificationTime;
    const createdBy = data.createdBy;
    const scheduleTime = data.scheduleTime;
    const notificationTemplate = data.notificationTemplate;
    const userDeviceToken = data.userDeviceToken;
    const chatData = data.chatData;
    const userData = data.userData;
    const messageType = data.messageType;
    const year = 2023;
    const month = 7;
    const day = 11;
    const hours = 17;
    const minutes = 8;

    var scheduleTimeOutStatic = new Date(year, month, day, hours, minutes);

    await ScheduledNotification.findOneAndUpdate(
      { _id: ObjectId(scheduleId) },
      {
        name: notificationName,
        notificationFor: scheduleFor,
        time: notificationTime,
        date: notificationDate,
        idsFor: notificationIdFor,
        createdFor: userData._id,
        createdBy: createdBy,
        notification: {
          title: notificationTemplate?.template?.title,
          body: notificationTemplate?.template?.body,
        },
      },
      { new: true }
    );

    const scheduleTimeout = scheduleTime;
    let unReadCount = await checkIfMsgReadSocket(userData._id);
    if (userDeviceToken.deviceToken.length !== 0) {
      if (userDeviceToken.deviceToken) {
        // Define the function to be executed when the schedule is triggered
        const jobFunction = async (data) => {
          console.log("setuping job");
          await send_notification(data);
        };
        // console.log(scheduleTimeout, "scheduleDateTime");

        // Schedule the job
        scheduleLib.rescheduleJob(
          scheduleId,
          scheduleTimeOutStatic,
          async () => {
            let data = {
              notification: notificationTemplate?.template?.title,
              description: notificationTemplate?.template?.body,
              device_token: userDeviceToken.deviceToken,
              collapse_key: userData._id,
              badge_count: unReadCount,
              sub_title: "",
              notification_data: {
                type: messageType,
                content: chatData,
              },
            };
            await jobFunction(data);
          }
        );
        return {
          status: true,
          message: "Notification reschedule successfully.",
          data: scheduleId,
        };
      }
    }
  } catch (error) {
    return {
      status: false,
      message: "There is something worng when schedule notification!",
      error: `${error.message}`,
    };
  }
};

// get upcomming Jobs list
exports.getScheduleJobs = async function (req, res) {
  try {
    const authUserId = req.authUserId;
    const userData = await User.findOne({ _id: ObjectId(authUserId) });
    const eventId = new ObjectId(req.query.eventId);
    const scheduledJobs = await ScheduledNotification.find({
      createdFor: authUserId,
      createdBy: "user",
    });
    var scheduledJobsList = [],
      eventList = [],
      activityList = [],
      sessionList = [];
    const notificationFor = userData.notificationFor;
    if (scheduledJobs.length > 0 && notificationFor.length > 0) {
      const unique = scheduledJobs.filter(
        (value, index, self) =>
          index ===
          self.findIndex(
            (t) =>
              t.idsFor.toString() === value.idsFor.toString() &&
              t.createdFor.toString() === value.createdFor.toString()
          )
      );
      const notDuplicatedData = unique.map(function (x) {
        var res = notificationFor.filter(
          (a1) =>
            a1.id.toString() === x.idsFor.toString() &&
            a1.type === x.notificationFor
        );
        if (res.length > 0) {
          x.name = res[0].name;
        }
        return x;
      });

      let resJob = notDuplicatedData.map(async (job, i) => {
        const jobDate = moment(job.date, "MM-DD-YYYY").format("YYYY-MM-DD");
        const Difference = Math.floor(
          moment.duration(moment().diff(moment(jobDate, "YYYY-MM-DD"))).asDays()
        );
        if (Difference <= 0) {
          scheduledJobsList.push(job);
        }
      });
      await Promise.all([...resJob]);

      let resJobData = scheduledJobsList.map(async (jobData, i) => {
        if (jobData.notificationFor === "event") {
          const getEventAttendeeEmail = await User.findOne(
            {
              _id: authUserId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: ObjectId(jobData.idsFor) },
              },
            },
            { "attendeeDetail.evntData.$": 1 }
          );
          const eventData = await event.aggregate([
            {
              $match: {
                _id: jobData.idsFor,
                isDelete: false,
              },
            },
            {
              $lookup: {
                from: "faqs",
                let: { event_id: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$event", "$$event_id"],
                      },
                      isDelete: false,
                    },
                  },
                  { $project: { question: 1, answer: 1 } },
                ],
                as: "faqs",
              },
            },
            {
              $project: {
                title: 1,
                shortDescription: 1,
                longDescription: 1,
                timeZone: 1,
                contactSupport: 1,
                faqs: 1,
                isPreRegister: 1,
                preRegisterBtnLink: 1,
                preRegisterBtnTitle: 1,
                preRegisterDescription: 1,
                preRegisterEndDate: 1,
                preRegisterStartDate: 1,
                preRegisterTitle: 1,
              },
            },
          ]);

          if (eventData.length > 0) {
            var eventDetails = eventData[0];
            if (getEventAttendeeEmail !== null) {
              if (
                getEventAttendeeEmail.attendeeDetail &&
                getEventAttendeeEmail.attendeeDetail.evntData[0]
                  .privateProfile === true
              )
                eventDetails.privateProfile =
                  getEventAttendeeEmail.attendeeDetail.evntData[0].privateProfile;
            } else {
              eventDetails.privateProfile = false;
            }
            eventList.push(eventDetails);
          }
        } else if (jobData.notificationFor === "activity") {
          const activity = await eventActivity.aggregate([
            {
              $match: {
                _id: new ObjectId(jobData.idsFor),
                event: eventId,
                isDelete: false,
              },
            },
            {
              $lookup: {
                from: "sessions",
                let: { activity_session_id: "$session" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $in: ["$_id", "$$activity_session_id"],
                      },
                      member: true,
                    },
                  },
                  {
                    $lookup: {
                      from: "rooms",
                      let: { activity_rooms_id: "$room" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$_id", "$$activity_rooms_id"],
                            },
                          },
                        },
                        {
                          $lookup: {
                            from: "eventlocations",
                            let: { location_id: "$location" },
                            pipeline: [
                              {
                                $match: {
                                  $expr: {
                                    $eq: ["$_id", "$$location_id"],
                                  },
                                },
                              },
                              {
                                $project: {
                                  name: 1,
                                  address: 1,
                                  country: 1,
                                  city: 1,
                                  latitude: 1,
                                  longitude: 1,
                                  locationVisible: 1,
                                  locationImages: 1,
                                },
                              },
                            ],
                            as: "location",
                          },
                        },
                        {
                          $unwind: "$location",
                        },
                        { $project: { location: 1 } },
                      ],
                      as: "room",
                    },
                  },
                  {
                    $unwind: "$room",
                  },
                  { $project: { room: 1 } },
                ],
                as: "sessions",
              },
            },
            {
              $lookup: {
                from: "eventlocations",
                let: { activity_location_id: "$location" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$_id", "$$activity_location_id"],
                      },
                    },
                  },
                  {
                    $project: {
                      name: 1,
                      address: 1,
                      country: 1,
                      city: 1,
                      latitude: 1,
                      longitude: 1,
                      locationVisible: 1,
                      locationImages: 1,
                    },
                  },
                ],
                as: "location",
              },
            },
            {
              $addFields: {
                sessionCount: {
                  $cond: {
                    if: { $isArray: "$sessions" },
                    then: { $size: "$sessions" },
                    else: 0,
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                icon: 1,
                description: "$shortDescription",
                shortDescription: 1,
                longDescription: 1,
                date: 1,
                startTime: 1,
                endDate: 1,
                endTime: 1,
                reserved: 1,
                reserved_URL: 1,
                location: 1,
                sessions: 1,
                sessionCount: 1,
                notifyChanges: 1,
                notifyChangeText: 1,
                notificationFlag: {
                  $let: {
                    vars: {
                      test: {
                        $filter: {
                          input: userData.notificationFor,
                          cond: {
                            $and: [
                              { $eq: ["$_id", "$$this.id"] },
                              { $eq: ["activity", "$$this.type"] },
                              { $eq: ["user", "$$this.setBy"] },
                            ],
                          },
                        },
                      },
                    },
                    in: {
                      $gt: [{ $size: "$$test" }, 0],
                    },
                  },
                },
              },
            },
          ]);
          if (activity.length > 0) {
            activityList.push(activity[0]);
          }
        } else if (jobData.notificationFor === "session") {
          const session = await eventSession.findOne(
            {
              _id: jobData.idsFor,
              event: eventId,
              isDelete: false,
            },
            {
              _id: 1,
              title: 1,
              description: "$shortDescription" ?? "",
              shortDescription: 1,
              longDescription: 1,
              date: 1,
              startTime: 1,
              endDate: 1,
              endTime: 1,
              room: 1,
              speakerId: 1,
              reserved: 1,
              reserved_URL: 1,
              member: 1,
              speaker: 1,
              partner: 1,
              guest: 1,
              createdAt: 1,
              updatedAt: 1,
              notifyChanges: 1,
              notifyChangeText: 1,
              event: 1,
              notificationFlag: {
                $let: {
                  vars: {
                    test: {
                      $filter: {
                        input: userData.notificationFor,
                        cond: {
                          $and: [
                            { $eq: ["$_id", "$$this.id"] },
                            { $eq: ["session", "$$this.type"] },
                            { $eq: ["user", "$$this.setBy"] },
                          ],
                        },
                      },
                    },
                  },
                  in: {
                    $gt: [{ $size: "$$test" }, 0],
                  },
                },
              },
            }
          );
          if (session !== null) {
            sessionList.push(session);
          }
        }
      });
      await Promise.all([...resJobData]);
      return res.status(200).json({
        status: true,
        message: "scheduled details get succesfully!",
        data: { scheduledJobsList, eventList, activityList, sessionList },
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "scheduled details not found for this user!",
        data: {},
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// delete attendee from all attendees list
exports.deleteAttendee = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: ObjectId(req.params.id),
      $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
    });
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "Attendee not found." });

    const updateAttendee = await User.findByIdAndUpdate(
      req.params.id,
      {
        isDelete: true,
        attendeeDetail: {
          title: "",
          photo: "",
          name: "",
          firstName: "",
          lastName: "",
          email: "",
          company: "",
          profession: "",
          phone: "",
          facebook: "",
          linkedin: "",
          auth0Id: "",
          description: "",
          offer: "",
          evntData: [],
        },
      },
      { new: true }
    );
    if (updateAttendee) {
      return res.status(200).json({
        status: true,
        message: "User deleted successfully.",
        data: updateAttendee,
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Something went wrong!" });
    }
  } catch (e) {
    res
      .status(200)
      .json({ status: false, message: `Something went wrong!${e}` });
  }
};

// function to rearrange partner attendee for event when edit partner type from attendee or delete partner attendee
exports.rearrangeAttendee = async (eventId, rearrange, userIds) => {
  try {
    var partnerDetails;
    if (rearrange) {
      partnerDetails = await User.aggregate([
        {
          $match: {
            "attendeeDetail.evntData": {
              $elemMatch: { event: ObjectId(eventId), partner: true },
            },
          },
        },
        { $unwind: "$attendeeDetail.evntData" },
        {
          $match: {
            "attendeeDetail.evntData.event": ObjectId(eventId),
          },
        },
        {
          $sort: { "attendeeDetail.evntData.partnerOrder": 1 },
        },
        {
          $project: {
            _id: 1,
            name: "$attendeeDetail.name",
            evntData: "$attendeeDetail.evntData",
          },
        },
      ]);
    } else {
      partnerDetails = userIds.map((user) => {
        return { _id: ObjectId(user) };
      });
    }
    const rearrangedAttendeeList = partnerDetails.map(
      async (partner, index) => {
        const reorderPartner = await User.findOneAndUpdate(
          {
            _id: partner._id,
            "attendeeDetail.evntData": {
              $elemMatch: { event: ObjectId(eventId), partner: true },
            },
          },
          {
            $set: {
              "attendeeDetail.evntData.$.partnerOrder": index + 1,
            },
          },
          { new: true }
        );
        return reorderPartner;
      }
    );
    if (rearrangedAttendeeList)
      return {
        status: true,
        message: "Rearranged partner successfully!",
        data: rearrangedAttendeeList,
      };
    else return { status: false, message: "Something went wrong!", data: [] };
  } catch (e) {
    return { status: false, message: e };
  }
};
