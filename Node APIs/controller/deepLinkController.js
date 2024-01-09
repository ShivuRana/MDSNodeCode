const channelMembers = require("../database/models/chatChannelMembers");
const userChatGroupMember = require("../database/models/userChatGroupMember");
const event = require("../database/models/event");
const eventActivity = require("../database/models/eventActivity");
const eventSession = require("../database/models/eventSession");
const User = require("../database/models/airTableSync");
const ContentArchiveVideo = require("../database/models/contentArchive_video");
const ContentEvent = require("../database/models/contentArchive_event");
const { ObjectId } = require("mongodb");
const moment = require("moment");
require('moment-timezone');

/** User APIs Routes **/
// check user have access of chat api
exports.checkChatAccess = async (req, res) => {
    try {
        const body = req.body;
        const authUser = req.authUserId;
        var isMember = {};

        if (body.type.trim() === "chatChannel") {
            isMember = await channelMembers.findOne({ channelId: ObjectId(body.chatId), userId: authUser }, { _id: 1, userId: 1 });
        } else if (body.type.trim() === "userChatGroup") {
            isMember = await userChatGroupMember.findOne({ groupId: ObjectId(body.chatId), userId: authUser }, { _id: 1, userId: 1 });
        }

        if (isMember !== null) {
            return res.status(200).json({ status: true, message: "Chat access retrieved.", access: true, });
        } else {
            return res.status(200).json({ status: true, message: "User don't have access of this chat!", access: false, });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// check user have access of event, activity or session api
exports.checkEventAccess = async (req, res) => {
    try {
        const body = req.body;
        const authUser = req.authUserId;
        var localDate = new Date(req.body.localDate);
        localDate = moment(localDate, "YYYY-MM-DD").toDate();
        const accessFor = body.accessFor;
        const eventId = body.eventId ? ObjectId(body.eventId) : null;
        const activityId = body.activityId ? ObjectId(body.activityId) : null;
        const sessionId = body.sessionId ? ObjectId(body.sessionId) : null;
        const eventData = await event.findOne({ _id: eventId, isDelete: false }, { _id: 1, name: 1 });
        let activityDetail = await eventActivity.aggregate([
            {
                $match: { _id: activityId, isDelete: false },
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
                    ],
                    as: "sessions"
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
                    member: 1,
                    speaker: 1,
                    partner: 1,
                    guest: 1,
                    sessionCount: 1,
                },
            },
        ]);
        const activityData = activityDetail.length > 0 ? activityDetail[0] : null;
        const sessionData = await eventSession.findOne({ _id: sessionId, event: eventId, isDelete: false }, { _id: 1, title: 1, member: 1, speaker: 1, partner: 1, guest: 1, });
        var eventAccess = false;
        var activityAccess = false;
        var sessionAccess = false;

        const userData = await User.findOne({ _id: authUser, isDelete: false, }, { _id: 1, "Preferred Email": 1, otherdetail: 1, accessible_groups: 1, purchased_plan: 1 });

        const userEventData = await User.findOne({ _id: authUser, isDelete: false, "attendeeDetail.evntData": { $elemMatch: { event: eventId } }, }, { _id: 1, "Preferred Email": 1, otherdetail: 1, accessible_groups: 1, purchased_plan: 1, "attendeeDetail.evntData.$": 1 });

        if (userData !== null) {
            const upcomingEventList = await event.aggregate([
                {
                    $addFields: {
                        Date: {
                            $let: {
                                vars: {
                                    year: { $substr: ["$startDate", 6, 10] },
                                    month: { $substr: ["$startDate", 0, 2] },
                                    dayOfMonth: { $substr: ["$startDate", 3, 5] }
                                },
                                in: { $toDate: { $concat: ["$$year", "-", "$$month", "-", "$$dayOfMonth"] } }
                            }
                        },
                    },
                },
                {
                    $match: {
                        _id: eventId,
                        isDelete: false,
                        Date: { $gt: localDate },
                        $or: [
                            { eventAccess: "public" },
                            { eventAccess: "admin/staff" },
                            {
                                $or: [
                                    { "restrictedAccessMemberships.0": { $exists: true } },
                                    { eventAccess: "restricted" },
                                    { restrictedAccessGroups: { $in: userData.accessible_groups }, },
                                    { $expr: { $in: [userData.purchased_plan, "$restrictedAccessMemberships"], }, }
                                ]
                            }
                        ],
                    },
                },
                {
                    $project: {
                        _id: 1, title: 1, thumbnail: 1, eventUrl: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, timeZone: 1, Date: 1
                    },
                },
            ]);

            const pastEventList = await event.aggregate([
                {
                    $addFields: {
                        Date: {
                            $let: {
                                vars: {
                                    year: { $substr: ["$startDate", 6, 10] },
                                    month: { $substr: ["$startDate", 0, 2] },
                                    dayOfMonth: { $substr: ["$startDate", 3, 5] }
                                },
                                in: { $toDate: { $concat: ["$$year", "-", "$$month", "-", "$$dayOfMonth"] } }
                            }
                        },
                    },
                },
                {
                    $match: {
                        _id: eventId,
                        isDelete: false,
                        Date: { $lt: localDate },
                        $or: [
                            { eventAccess: "public" },
                            { eventAccess: "admin/staff" },
                            {
                                $or: [
                                    { "restrictedAccessMemberships.0": { $exists: true } },
                                    { eventAccess: "restricted" },
                                    { restrictedAccessGroups: { $in: userData.accessible_groups }, },
                                    { $expr: { $in: [userData.purchased_plan, "$restrictedAccessMemberships"], }, }
                                ]
                            }
                        ],
                    },
                },
                {
                    $project: {
                        _id: 1, title: 1, thumbnail: 1, eventUrl: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, timeZone: 1, Date: 1
                    },
                },
            ]);
            var upcomingEvent = upcomingEventList.length > 0 ? upcomingEventList[0] : null;
            var pastEvent = pastEventList.length > 0 ? pastEventList[0] : null;

            switch (accessFor) {
                case "event":
                    if ((eventId !== null && activityId === null && sessionId === null) || (eventId !== null && activityId !== null && sessionId === null) || (eventId !== null && activityId === null && sessionId !== null)) {
                        if (eventData !== null && userEventData !== null && body.role === "member" && userEventData.attendeeDetail.evntData[0].member) {
                            eventAccess = true;
                        } else if (eventData !== null && userEventData !== null && body.role === "nonMember" && (userEventData.attendeeDetail.evntData[0].speaker || userEventData.attendeeDetail.evntData[0].partner || userEventData.attendeeDetail.evntData[0].guest)) {
                            eventAccess = true;
                        } else {
                            eventAccess = false;
                        }
                        if (eventAccess === true && pastEvent === null) {
                            return res.status(200).json({ status: true, message: "Event access retrieved.", access: true, eventType: "myEvent" });
                        } else if (upcomingEvent !== null) {
                            return res.status(200).json({ status: true, message: "Event access retrieved.", access: true, eventType: "upcoming" });
                        } else if (pastEvent !== null) {
                            return res.status(200).json({ status: true, message: "Event access retrieved.", access: true, eventType: "past" });
                        } else {
                            return res.status(200).json({ status: true, message: "User don't have access of this event!", access: false, eventType: "" });
                        }
                    }
                    break;
                case "activity":
                    if (eventId !== null && activityId !== null && sessionId === null) {
                        if (activityData !== null && userEventData !== null && body.role === "member" && userEventData.attendeeDetail.evntData[0].member && (activityData.member)) {
                            activityAccess = true;
                        }
                        // else if (activityData !== null && body.role === "nonMember" && (activityData.speaker || activityData.partner || activityData.guest)) {
                        //     activityAccess = true;
                        // }
                        else {
                            activityAccess = false;
                        }
                        if (activityAccess === true) {
                            return res.status(200).json({ status: true, message: "Activity access retrieved.", access: true, eventType: "myEvent", sessionCount: activityData.sessionCount });
                        } else if (activityAccess && upcomingEvent !== null) {
                            return res.status(200).json({ status: true, message: "Activity access retrieved.", access: true, eventType: "upcoming", sessionCount: activityData.sessionCount });
                        } else if (activityAccess && pastEvent !== null) {
                            return res.status(200).json({ status: true, message: "Activity access retrieved.", access: true, eventType: "past", sessionCount: activityData.sessionCount });
                        } else {
                            return res.status(200).json({ status: true, message: "User don't have access of this activity!", access: false, eventType: "", sessionCount: 0 });
                        }
                    }
                    break;
                case "session":
                    if (eventId !== null && activityId === null && sessionId !== null) {
                        if (sessionData !== null && userEventData !== null && body.role === "member" && userEventData.attendeeDetail.evntData[0].member && (sessionData.member)) {
                            sessionAccess = true;
                        }
                        // else if (sessionData !== null && body.role === "nonMember" && (sessionData.speaker || sessionData.partner || sessionData.guest)) {
                        //     sessionAccess = true;
                        // } 
                        else {
                            sessionAccess = false;
                        }
                        if (sessionAccess === true) {
                            return res.status(200).json({ status: true, message: "Session access retrieved.", access: true, eventType: "myEvent" });
                        } else if (sessionAccess && upcomingEvent !== null) {
                            return res.status(200).json({ status: true, message: "Session access retrieved.", access: true, eventType: "upcoming" });
                        } else if (sessionAccess && pastEvent !== null) {
                            return res.status(200).json({ status: true, message: "Session access retrieved.", access: true, eventType: "past" });
                        } else {
                            return res.status(200).json({ status: true, message: "User don't have access of this session!", access: false, eventType: "" });
                        }
                    }
                    break;
                default:
                    break;
            }

        } else {
            return res.status(200).json({ status: true, message: "User don't have access of this event!", access: false, eventType: "" });
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// check user has access of videos api
exports.checkVideoAccess = async (req, res) => {
    try {
        const body = req.body;
        const videoId = ObjectId(body.videoId);
        const authUser = req.authUserId;
        var isAccess = false;

        const userData = await User.findOne({ _id: authUser, isDelete: false, }, { _id: 1, "Preferred Email": 1, accessible_groups: 1, userEvents: 1, "# of Days Since MDS Only Census": 1 });

        const allEvents = await ContentEvent.find({
            isDelete: false,
            name: { $ne: "others" },
        });
        var eventFor = ["others"];
        allEvents.forEach(async (event, key) => {
            const eventName = event.name.toLowerCase();
            if (userData.userEvents !== undefined) {
                if (userData.userEvents[eventName] === true) {
                    eventFor.push(eventName);
                }
            }
        });

        const videoData = await ContentArchiveVideo.findOne({ _id: videoId, eventFor: { $in: eventFor }, isDelete: false, }).select("-__v").lean();

        if (userData["# of Days Since MDS Only Census"] <= 365) {
            if (videoData !== null) {
                isAccess = true;
            } else {
                isAccess = false;
            }

            if (isAccess === true) {
                return res.status(200).json({ status: true, message: "Video access retrieved.", access: true, });
            } else {
                return res.status(200).json({ status: true, message: "User don't have access of this video!", access: false, });
            }

        } else {
            return res.status(200).json({ status: true, message: "User's MDS Census Limit exceed!", access: false, });
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};
