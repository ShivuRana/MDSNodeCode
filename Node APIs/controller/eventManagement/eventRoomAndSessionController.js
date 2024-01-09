const Room = require("../../database/models/eventRoom");
const Session = require("../../database/models/eventSession");
const eventActivity = require("../../database/models/eventActivity");
const { ObjectId } = require("mongodb");
const event = require("../../database/models/event");
const User = require("../../database/models/airTableSync");
const { sendNotificationForNotifyUser } = require("./eventActivityController");
const { schedule, reScheduleNotificationForActivitySession, scheduleNotificationFormAdmin, reScheduleNotificationFormAdmin } = require("./eventAttendeeManageController");
const ScheduledNotification = require("../../database/models/scheduledNotification");
const moment = require("moment");
require('moment-timezone');
const scheduleLib = require("node-schedule");

/** CURD opreation of rooms start **/

// create room
exports.createRoom = async (req, res) => {
    try {
        const body = req.body;
        if (body) {
            const roomExist = await Room.find({ name: req.body.name, location: ObjectId(req.body.location), isDelete: false })
            if (roomExist && roomExist.length > 0) {
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "This room and location already exist!",
                    });
            }
            const newRoom = new Room({ ...body });
            const roomData = await newRoom.save();
            if (roomData)
                return res
                    .status(200)
                    .json({
                        status: true,
                        message: "Room added successfully!",
                        data: roomData,
                    });
            else
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "Something went wrong while adding room!",
                    });
        } else {
            return res
                .status(200)
                .json({ status: false, message: "All fields are required!" });
        }
    } catch (error) {
        return res
            .status(500)
            .json({ status: false, message: "Internal server error!", error: error });
    }
};

// update room
exports.editRoom = async (req, res) => {
    try {
        const body = req.body;
        const getRoom = await Room.findOne({
            _id: new ObjectId(req.params.id),
            isDelete: false,
        }).lean();
        if (getRoom) {
            const roomExist = await Room.find({
                _id: { $ne: ObjectId(req.params.id) },
                name: body.name ?? getRoom.name,
                location: ObjectId(body.location) ?? getRoom.location,
            },)
            if (roomExist && roomExist.length > 0) {
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "This room and location already exist!",
                    });
            }
            const roomData = await Room.findByIdAndUpdate(
                req.params.id,
                {
                    name: body.name ?? getRoom.name,
                    location: body.location ?? getRoom.location,
                    event: body.event ?? getRoom.event,
                    notifyChanges: body?.notifyChanges !== null && body?.notifyChanges !== "null" ? body?.notifyChanges : getRoom.notifyChanges === undefined ? false : getRoom.notifyChanges,
                    notifyChangeText: body?.notifyChangeText !== null && body?.notifyChangeText !== "null" ? body?.notifyChangeText : getRoom.notifyChangeText === undefined ? "" : getRoom.notifyChangeText,
                },
                { new: true }
            );
            if (roomData.notifyChanges === true) {
                await sendNotificationForNotifyUser(roomData.event, roomData.notifyChangeText, "room", roomData._id);
            }
            if (roomData)
                return res
                    .status(200)
                    .json({
                        status: true,
                        message: "Room updated successfully!",
                        data: roomData
                    });
            else
                return res
                    .status(200)
                    .json({
                        status: false,
                        message: "Something went wrong while updating room!",
                    });
        } else {
            return res
                .status(200)
                .json({ status: false, message: "Room not found!" });
        }
    } catch (error) {
        return res
            .status(500)
            .json({ status: false, message: "Internal server error!", error: error });
    }
};

// delete room
exports.deleteRoom = async (req, res) => {
    try {
        const getRoom = await Room.findOne({ _id: new ObjectId(req.params.id), isDelete: false, }).lean();
        if (getRoom) {
            const alreadyAssignSession = await Session.find({ room: new ObjectId(req.params.id), isDelete: false }).lean();
            if (alreadyAssignSession && alreadyAssignSession.length > 0) {
                var sessionList = [];
                if (alreadyAssignSession.length > 0) {
                    alreadyAssignSession.map((itemSession, i) => {
                        sessionList.push(itemSession.title);
                    });
                }

                return res.status(200).json({ status: false, message: "You cannot delete this room because it is assigned to following sessions: ", data: { sessionList }, });
            } else {
                const roomData = await Room.findByIdAndUpdate(
                    req.params.id,
                    { isDelete: true },
                    { new: true }
                );
                if (roomData)
                    return res.status(200).json({ status: true, message: "Room deleted successfully!", data: roomData, });
                else
                    return res.status(200).json({ status: false, message: "Something went wrong while deleteing room!", });
            }
        } else {
            return res.status(200).json({ status: false, message: "Room not found!" });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// listing of room
exports.getAllRooms = async (req, res) => {
    try {
        const allRoomData = await Room.find({ isDelete: false }).sort({ createdAt: -1 });
        if (allRoomData)
            return res
                .status(200)
                .json({
                    status: true,
                    message: "All rooms retrive!",
                    data: allRoomData,
                });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: "Something went wrong while getting all rooms!",
                });
    } catch (error) {
        return res
            .status(500)
            .json({ status: false, message: "Internal server error!", error: error });
    }
};

// listing of room by event id
exports.getAllRoomsByEventId = async (req, res) => {
    try {
        const allRoomData = await Room.find({
            isDelete: false,
            event: req.params.eventId,
        }).sort({ createdAt: -1 });
        if (allRoomData)
            return res
                .status(200)
                .json({
                    status: true,
                    message: "All rooms retrive!",
                    data: allRoomData,
                });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: "Something went wrong while getting all rooms!",
                });
    } catch (error) {
        return res
            .status(500)
            .json({ status: false, message: "internal server error!", error: error });
    }
};

// room details data
exports.getRoomDetails = async (req, res) => {
    try {
        const roomData = await Room.findOne({
            _id: new ObjectId(req.params.id),
            isDelete: false,
        });
        if (roomData)
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Rooms detail retrive!",
                    data: roomData,
                });
        else
            return res
                .status(200)
                .json({ status: false, message: "Rooms detail not found!" });
    } catch (error) {
        return res
            .status(500)
            .json({ status: false, message: "Internal server error!", error: error });
    }
};

/** CURD opreation of rooms end **/

/** =========================== **/

/** CURD opreation of session start **/

// create session
exports.createSession = async (req, res) => {
    try {
        const body = req.body;
        if (body) {
            let description = `<div "font-family: 'Muller';">${body.longDescription}</div>`;
            body.longDescription = description;
            body.isEndOrNextDate = body.isEndOrNextDate !== null && body.isEndOrNextDate !== "" ? body.isEndOrNextDate : false;
            body.endDate = body.endDate !== null && body.endDate !== "" ? body.endDate : body.date;

            const newSession = new Session({ ...body });

            const sessionData = await newSession.save();

            if (sessionData.scheduleNotify === true) {
                const alreadyAssignActivity = await eventActivity.find({ session: { $in: [new ObjectId(sessionData._id)] }, isDelete: false }).lean();
                if (alreadyAssignActivity && alreadyAssignActivity.length > 0) {
                    const scheduleNotifyTime = sessionData.scheduleNotifyTime;
                    var allUsers = [], members = [], speakers = [], partners = [], guests = [];
                    if (sessionData.member === true) {
                        members = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: sessionData.event, [`member`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                        allUsers = allUsers.concat(members);
                    } else if (sessionData.speaker === true) {
                        speakers = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: sessionData.event, [`speaker`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                        allUsers = allUsers.concat(speakers);
                    } else if (sessionData.partner === true) {
                        partners = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: sessionData.event, [`partner`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                        allUsers = allUsers.concat(partners);
                    } else if (sessionData.guest === true) {
                        guests = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: sessionData.event, [`guest`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                        allUsers = allUsers.concat(guests);
                    }

                    const uniqueUsers = allUsers.filter((value, index, self) =>
                        index === self.findIndex((t) => (
                            t._id === value._id
                        ))
                    )

                    if (uniqueUsers.length > 0) {
                        const eventID = sessionData.event ? sessionData.event : null;
                        const sessionID = sessionData._id ? sessionData._id : null;
                        let schedule = uniqueUsers.map(async (user, i) => {
                            await scheduleNotificationFormAdmin(user._id, eventID, "", sessionID, "session", scheduleNotifyTime)
                        });
                        await Promise.all([...schedule]);
                    }
                }
            }

            if (sessionData)
                return res.status(200).json({ status: true, message: "Session added successfully!", data: sessionData, });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while adding session!", });
        } else {
            return res.status(200).json({ status: false, message: "All fields are required!" });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// update session
exports.editSession = async (req, res) => {
    try {
        const body = req.body;
        const getSession = await Session.findOne({
            _id: new ObjectId(req.params.id),
            isDelete: false,
        }).lean();
        if (getSession) {

            let description = `<div "font-family: 'Muller';">${body.longDescription}</div>`;
            let shortDescription = `${body.shortDescription}`;

            const sessionData = await Session.findOneAndUpdate(
                { _id: new ObjectId(req.params.id) },
                {
                    title: body.title ?? getSession.title,
                    shortDescription: shortDescription ?? getSession.shortDescription,
                    longDescription: description ?? getSession.longDescription,
                    date: body.date ?? getSession.date,
                    startTime: body.startTime ?? getSession.startTime,
                    endTime: body.endTime ?? getSession.endTime,
                    room: body.room ?? getSession.room,
                    speakerId: (body.speakerId.length > 0) ? body.speakerId : getSession.speakerId,
                    reserved: body.reserved ?? getSession.reserved,
                    reserved_URL: body.reserved_URL ?? getSession.reserved_URL,
                    reservedLabelForListing: body.reservedLabelForListing ?? getSession.reservedLabelForListing,
                    reservedLabelForDetail: body.reservedLabelForDetail ?? getSession.reservedLabelForDetail,
                    member: body.member ?? getSession.member,
                    speaker: body.speaker ?? getSession.speaker,
                    partner: body.partner ?? getSession.partner,
                    guest: body.guest ?? getSession.guest,
                    event: body.event ?? getSession.event,
                    notifyChanges: body?.notifyChanges !== null ? body?.notifyChanges : getSession.notifyChanges === undefined ? false : getSession.notifyChanges,
                    notifyChangeText: body?.notifyChangeText !== null && body?.notifyChangeText !== "" ? body?.notifyChangeText : getSession.notifyChangeText === undefined ? "" : getSession.notifyChangeText,
                    isEndOrNextDate: req.body?.isEndOrNextDate !== null && req.body?.isEndOrNextDate !== "" ? req.body?.isEndOrNextDate : getSession.isEndOrNextDate === undefined ? false : getSession.isEndOrNextDate,
                    endDate: req.body?.endDate !== null && req.body.endDate !== "" ? req.body.endDate : getSession.endDate === undefined ? null : body.date ?? getSession.date,
                    scheduleNotify: req.body?.scheduleNotify !== null && req.body?.scheduleNotify !== "" ? req.body?.scheduleNotify : getSession.scheduleNotify === undefined ? false : getSession.scheduleNotify,
                    scheduleNotifyTime: req.body?.scheduleNotifyTime !== null && req.body?.scheduleNotifyTime !== "" ? req.body?.scheduleNotifyTime : getSession.scheduleNotifyTime === undefined ? "" : getSession.scheduleNotifyTime,
                },
                { new: true }
            );
            const alreadyAssignActivity = await eventActivity.find({ session: { $in: [getSession._id] }, event: getSession.event, isDelete: false }).lean();
            const alreadyAddedUsers = await User.find({ notificationFor: { $elemMatch: { id: sessionData._id }, }, }, { "notificationFor.$": 1 });

            if (alreadyAssignActivity && alreadyAssignActivity.length > 0) {
                if (body.date !== getSession.date || req.body.startTime !== getSession.startTime) {
                    if (alreadyAddedUsers.length > 0) {
                        const eventID = getSession.event ? getSession.event : null;
                        const sessionID = getSession._id ? getSession._id : null;
                        let resOrder = alreadyAddedUsers.map(async (user, i) => {
                            const userData = await User.findOne({ _id: ObjectId(user._id) });
                            await reScheduleNotificationForActivitySession(userData._id, eventID._id, "", sessionID, "session");
                        });
                        await Promise.all([...resOrder]);
                    }
                }

                if (alreadyAssignActivity.length > 0) {
                    alreadyAssignActivity.map(async (getActivity, i) => {
                        const alreadyAdded = await User.find({ notificationFor: { $elemMatch: { id: new ObjectId(getActivity._id) }, }, }, { _id: 1, "notificationFor.$": 1 });
                        var startTimeArr = [], endTimeArr = [], startDateArr = [], endDateArr = [];
                        if (getActivity.session) {
                            if (getActivity.session.length > 1) {

                                let resOrder = getActivity.session.map(async ids => {
                                    const sessionDetail = await Session.findOne({ _id: new ObjectId(ids._id), isDelete: false, });
                                    startDateArr.push(moment(sessionDetail.date, "MM-DD-YYYY"));
                                    endDateArr.push(moment(sessionDetail.endDate, "MM-DD-YYYY"));
                                    startTimeArr.push(sessionDetail.startTime);
                                    endTimeArr.push(sessionDetail.endTime);
                                });
                                await Promise.all([...resOrder]);

                                // Convert each time string in the array to Date objects
                                const minTimeObjects = startTimeArr.map(startTimeStr => moment(startTimeStr, "h:mm a"));
                                const maxTimeObjects = endTimeArr.map(endTimeStr => moment(endTimeStr, "h:mm a"));

                                // Find the minimum time in the array
                                const minTime = new Date(Math.min(...minTimeObjects));
                                const maxTime = new Date(Math.max(...maxTimeObjects));
                                const minDate = moment.min(startDateArr);
                                const maxDate = moment.max(endDateArr);

                                // Format the minimum time as a string
                                const minTimeString = minTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const maxTimeString = maxTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const minDateString = moment(minDate).format("MM-DD-YYYY");
                                const maxDateString = moment(maxDate).format("MM-DD-YYYY");

                                getActivity.startTime = minTimeString;
                                getActivity.endTime = maxTimeString;
                                getActivity.date = minDateString;
                                getActivity.endDate = maxDateString;

                            } else {
                                const sessionData = await Session.findOne({ _id: new ObjectId(getActivity.session[0]._id), isDelete: false, });
                                getActivity.startTime = sessionData.startTime;
                                getActivity.endTime = sessionData.endTime;
                                getActivity.date = sessionData.date;
                                getActivity.endDate = sessionData.endDate;
                            }
                        }

                        if (body.date !== getActivity.date || req.body.startTime !== getActivity.startTime) {
                            if (alreadyAdded.length > 0) {
                                const eventID = getActivity.event ? getActivity.event : null;
                                const activityID = getActivity._id ? getActivity._id : null;
                                let resOrder = alreadyAdded.map(async (user, i) => {
                                    const userData = await User.findOne({ _id: ObjectId(user._id) });
                                    await reScheduleNotificationForActivitySession(userData._id, eventID._id, activityID, "", "activity");
                                });
                                await Promise.all([...resOrder]);
                            }
                        }

                        await eventActivity.findByIdAndUpdate(getActivity._id,
                            {
                                name: getActivity.name,
                                icon: getActivity.icon,
                                shortDescription: getActivity.shortDescription,
                                longDescription: getActivity.longDescription,
                                date: getActivity.date,
                                startTime: getActivity.startTime,
                                endTime: getActivity.endTime,
                                member: getActivity.member,
                                speaker: getActivity.speaker,
                                partner: getActivity.partner,
                                guest: getActivity.guest,
                                session: getActivity.session ?? [],
                                reserved: getActivity.reserved,
                                reserved_URL: getActivity.reserved_URL,
                                event: getActivity.event,
                                location: getActivity.location,
                                notifyChanges: getActivity.notifyChanges,
                                notifyChangeText: getActivity.notifyChangeText,
                                isEndOrNextDate: getActivity.isEndOrNextDate,
                                endDate: getActivity.endDate,
                            },
                            { new: true }
                        );
                    });
                }
            }

            if (sessionData.scheduleNotify === true) {
                if (alreadyAssignActivity && alreadyAssignActivity.length > 0) {
                    const scheduleNotifyTime = sessionData.scheduleNotifyTime;
                    var allUsers = [], members = [], speakers = [], partners = [], guests = [];
                    if (sessionData.member === true) {
                        members = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: sessionData.event, [`member`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                        allUsers = allUsers.concat(members);
                    } else if (sessionData.speaker === true) {
                        speakers = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: sessionData.event, [`speaker`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                        allUsers = allUsers.concat(speakers);
                    } else if (sessionData.partner === true) {
                        partners = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: sessionData.event, [`partner`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                        allUsers = allUsers.concat(partners);
                    } else if (sessionData.guest === true) {
                        guests = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: sessionData.event, [`guest`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                        allUsers = allUsers.concat(guests);
                    }
                    const uniqueUsers = allUsers.filter((value, index, self) =>
                        index === self.findIndex((t) => (
                            t._id === value._id
                        ))
                    )

                    if (uniqueUsers.length > 0) {
                        const eventID = sessionData.event ? sessionData.event : null;
                        const sessionID = sessionData._id ? sessionData._id : null;
                        let schedule = uniqueUsers.map(async (user, i) => {
                            await reScheduleNotificationFormAdmin(user._id, eventID, "", sessionID, "session", scheduleNotifyTime);
                        });
                        await Promise.all([...schedule]);
                    }
                }
            } else if (sessionData.scheduleNotify === false) {
                if (alreadyAddedUsers.length > 0) {
                    const NotificationFor = {
                        id: sessionData._id,
                        type: "session",
                        setBy: "admin",
                    };
                    let resCancel = alreadyAddedUsers.map(async (user, i) => {
                        const scheduleData = await ScheduledNotification.findOne({ createdFor: user._id, idsFor: sessionData._id, createdBy: "admin" });
                        if (scheduleData !== null) {
                            await User.findOneAndUpdate(
                                { _id: user._id },
                                { $pull: { notificationFor: NotificationFor } },
                                { new: true }
                            );
                            await ScheduledNotification.findByIdAndRemove(scheduleData._id);
                        }
                    });
                    await Promise.all([...resCancel]);
                }
            }

            if (body?.notifyChanges === true) {
                await sendNotificationForNotifyUser(sessionData.event, sessionData.notifyChangeText, "session", sessionData._id);
            }

            if (sessionData)
                return res.status(200).json({ status: true, message: "Session updated successfully!", data: sessionData, });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while updating session!", });
        } else {
            return res.status(200).json({ status: false, message: "Session not found!" });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// delete session
exports.deleteSession = async (req, res) => {
    try {
        const getSession = await Session.findOne({
            _id: new ObjectId(req.params.id),
            isDelete: false,
        }).lean();
        if (getSession) {
            const alreadyAssignActivity = await eventActivity.find({ session: { $in: [new ObjectId(req.params.id)] }, isDelete: false }).lean();
            if (alreadyAssignActivity && alreadyAssignActivity.length > 0) {

                var activityList = [];
                if (alreadyAssignActivity.length > 0) {
                    alreadyAssignActivity.map((itemActivity, i) => {
                        activityList.push(itemActivity.name);
                    });
                }

                return res.status(200).json({ status: false, message: "You cannot delete this session because it is assigned to following activities: ", data: { activityList } });
            } else {
                const alreadyAddedUsers = await User.find({ notificationFor: { $elemMatch: { id: getSession._id }, }, }, { "notificationFor.$": 1 });

                if (alreadyAddedUsers.length > 0) {
                    const NotificationFor = {
                        id: getSession._id,
                        type: "session",
                        setBy: "user",
                    };

                    const NotificationForAdmin = {
                        id: getSession._id,
                        type: "session",
                        setBy: "admin",
                    };
                    let resCancel = alreadyAddedUsers.map(async (user, i) => {
                        const scheduleData = await ScheduledNotification.findOne({ createdFor: user._id, idsFor: getSession._id, createdBy: "user" });
                        if (scheduleData !== null) {
                            await User.findOneAndUpdate(
                                { _id: user._id },
                                { $pull: { notificationFor: NotificationFor } },
                                { new: true }
                            );
                            await ScheduledNotification.findByIdAndRemove(scheduleData._id);
                        }
                        const scheduleDataAdmin = await ScheduledNotification.findOne({ createdFor: user._id, idsFor: getSession._id, createdBy: "admin" });
                        if (scheduleDataAdmin !== null) {
                            await User.findOneAndUpdate(
                                { _id: user._id },
                                { $pull: { notificationFor: NotificationForAdmin } },
                                { new: true }
                            );
                            await ScheduledNotification.findByIdAndRemove(scheduleDataAdmin._id);
                        }
                    });
                    await Promise.all([...resCancel]);
                }

                const sessionData = await Session.findByIdAndUpdate(
                    req.params.id,
                    { isDelete: true },
                    { new: true }
                );
                if (sessionData)
                    return res.status(200).json({ status: true, message: "Session deleted successfully!", data: sessionData, });
                else
                    return res.status(200).json({ status: false, message: "Something went wrong while deleteing session!", });
            }
        } else {
            return res.status(200).json({ status: false, message: "Session not found!" });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// listing of session
exports.getAllSessions = async (req, res) => {
    try {
        const allSessionData = await Session.find({ isDelete: false }).sort({ createdAt: -1 });
        if (allSessionData)
            return res
                .status(200)
                .json({
                    status: true,
                    message: "All sessions retrive!",
                    data: allSessionData,
                });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: "Something went wrong while getting all sessions!",
                });
    } catch (error) {
        return res
            .status(500)
            .json({ status: false, message: "Internal server error!", error: error });
    }
};

// listing of session by event id
exports.getAllSessionsByEventId = async (req, res) => {
    try {
        const allSessionData = await Session.find({
            isDelete: false,
            event: req.params.eventId,
        }).sort({ createdAt: -1 });
        if (allSessionData)
            return res
                .status(200)
                .json({
                    status: true,
                    message: "All sessions retrive!",
                    data: allSessionData,
                });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: "Something went wrong while getting all sessions!",
                });
    } catch (error) {
        return res
            .status(500)
            .json({ status: false, message: "internal server error!", error: error });
    }
};

// session list by date and event Id
exports.getSessionListByDate = async (req, res) => {
    try {
        const date = req.query.date;
        const eventId = ObjectId(req.query.eventId);
        const sessionData = await Session.find({
            date: date,
            event: eventId,
            isDelete: false,
        });

        if (sessionData)
            return res.status(200).json({ status: true, message: "Session detail retrive!", data: sessionData, });
        else
            return res.status(200).json({ status: false, message: "Something went wrong while getting session!", });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// session details data
exports.getSessionDetails = async (req, res) => {
    try {
        const sessionData = await Session.findOne({
            _id: new ObjectId(req.params.id),
            isDelete: false,
        });
        if (sessionData)
            return res
                .status(200)
                .json({
                    status: true,
                    message: "Session detail retrive!",
                    data: sessionData,
                });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: "Something went wrong while getting session!",
                });
    } catch (error) {
        console.log(error, "error");
        return res
            .status(500)
            .json({ status: false, message: "Internal server error!", error: error });
    }
};

/** CURD opreation of session end **/

// session listing based on activity
exports.getSessionListByActivity = async (req, res) => {
    try {
        const authUser = req.authUserId;
        const role = req.query.role;
        var userData;
        const activityId = new ObjectId(req.params.id);
        const activityData = await eventActivity.findOne({ _id: activityId, isDelete: false }, { _id: 1, name: 1, event: 1 });
        if (activityData)
            userData = await User.findOne({ _id: authUser, "attendeeDetail.evntData": { $elemMatch: { event: activityData.event._id } }, }, { auth0Id: 1, email: 1, accessible_groups: 1, purchased_plan: 1, notificationFor: 1, "attendeeDetail.evntData.$": 1 });
        else
            return res.status(200).json({ status: true, message: "Activity not found!", data: [] });
        if (userData !== null && userData !== undefined) {
            const aggregateObj = [
                {
                    $lookup: {
                        from: "airtable-syncs",
                        localField: "speakerId",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    profileImg: {
                                        $cond: [
                                            {
                                                "$ifNull": [
                                                    "$speakerIcon",
                                                    false
                                                ]
                                            },
                                            "$speakerIcon", ""
                                        ]
                                    },
                                    attendeeDetail: 1,
                                },
                            },
                        ],
                        as: "speakerId",
                    },
                },
                {
                    $lookup: {
                        from: "rooms",
                        localField: "room",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $lookup: {
                                    from: "events",
                                    localField: "event",
                                    foreignField: "_id",
                                    pipeline: [
                                        {
                                            $project: {
                                                title: 1,
                                                thumbnail: 1,
                                                shortDescription: 1,
                                                longDescription: 1,
                                                eventUrl: 1,
                                                type: 1,
                                                timeZone: 1,
                                                startDate: 1,
                                                startTime: 1,
                                                endDate: 1,
                                                endTime: 1,
                                                eventAccess: 1,
                                                restrictedAccessGroups: 1,
                                                restrictedAccessMemberships: 1,
                                                photos: 1,
                                                _id: 1,
                                            },
                                        },
                                    ],
                                    as: "event",
                                },
                            },
                            {
                                $lookup: {
                                    from: "eventlocations",
                                    localField: "location",
                                    foreignField: "_id",
                                    pipeline: [
                                        {
                                            $project: {
                                                name: 1,
                                                address: 1,
                                                country: 1,
                                                city: 1,
                                                latitude: 1,
                                                longitude: 1,
                                                locationImages: 1,
                                                locationVisible: 1,
                                                _id: 1,
                                            },
                                        },
                                    ],
                                    as: "location",
                                },
                            },
                            {
                                $unwind: "$location",
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    location: 1,
                                    event: 1,
                                },
                            },
                        ],
                        as: "room",
                    },
                },
                {
                    $unwind: "$room"
                },
                {
                    $project: {
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
                        reservedLabelForDetail: 1,
                        reservedLabelForListing: 1,
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
                    },
                },
            ]
            if (userData.attendeeDetail.evntData[0].member === true && role === "member") {

                let attendeeData = await User.findOne({
                    _id: authUser,
                    "attendeeDetail.evntData": { $elemMatch: { event: activityData.event._id, [`member`]: true } },
                }, { _id: 1, email: 1, auth0Id: 1, "attendeeDetail.evntData.$": 1 }).lean();

                if (attendeeData !== null) {
                    const activitySessions = await eventActivity.aggregate([{ $match: { _id: ObjectId(req.params.id), member: true, isDelete: false, } }]);

                    if (activitySessions.length) {
                        const sessionList = await Session.aggregate([
                            {
                                $match: {
                                    _id: { $in: activitySessions[0].session },
                                    member: true,
                                    isDelete: false,
                                },
                            },
                            ...aggregateObj
                        ]);
                        if (sessionList.length > 0)
                            return res.status(200).json({ status: true, message: "Session list retrived based on activity!", data: sessionList, });
                        else
                            return res.status(200).json({ status: true, message: "Session list not found for this member!", data: [] });
                    } else {
                        return res.status(200).json({ status: false, message: "Something went wrong while getting sessions of activity!", });
                    }
                } else
                    return res.status(200).json({ status: true, message: "Session not found!", data: [] });
            } else if (userData.attendeeDetail.evntData[0].member === false && role === "nonMember") {
                let attendeeData = await User.findOne({
                    _id: authUser,
                    "attendeeDetail.evntData": { $elemMatch: { event: activityData.event._id, } },
                }, { _id: 1, email: 1, auth0Id: 1, "attendeeDetail.evntData.$": 1 }).lean();

                if (attendeeData !== null) {

                    if (userData.attendeeDetail.evntData[0].speaker === true && userData.attendeeDetail.evntData[0].member === true) {
                        const activitySessions = await eventActivity.aggregate([{ $match: { _id: ObjectId(req.params.id), member: true, isDelete: false, } }]);

                        if (activitySessions.length) {
                            const sessionList = await Session.aggregate([
                                {
                                    $match: {
                                        _id: { $in: activitySessions[0].session },
                                        member: true,
                                        isDelete: false,
                                    },
                                },
                                ...aggregateObj
                            ]);
                            if (sessionList.length > 0)
                                return res.status(200).json({ status: true, message: "Session list retrived based on activity!", data: sessionList, });
                            else
                                return res.status(200).json({ status: true, message: "Session list not found for this member!", data: [] });
                        } else {
                            return res.status(200).json({ status: false, message: "Something went wrong while getting sessions of activity!", });
                        }

                    } else if (userData.attendeeDetail.evntData[0].speaker === true && userData.attendeeDetail.evntData[0].partner === true) {
                        const activitySessions = await eventActivity.aggregate([{ $match: { _id: ObjectId(req.params.id), partner: true, isDelete: false } }]);

                        if (activitySessions.length) {
                            const sessionList = await Session.aggregate([
                                {
                                    $match:
                                    {
                                        _id: { $in: activitySessions[0].session },
                                        partner: true,
                                        isDelete: false,
                                    },
                                },
                                ...aggregateObj
                            ]);
                            if (sessionList.length > 0)
                                return res.status(200).json({ status: true, message: "Session list retrived based on activity!", data: sessionList, });
                            else
                                return res.status(200).json({ status: true, message: "Session list not found for this member!", data: [] });
                        } else {
                            return res.status(200).json({ status: false, message: "Something went wrong while getting sessions of activity!", });
                        }

                    } else if (userData.attendeeDetail.evntData[0].member === true && userData.attendeeDetail.evntData[0].guest === true) {
                        const activitySessions = await eventActivity.aggregate([{ $match: { _id: ObjectId(req.params.id), guest: true, isDelete: false } }]);

                        if (activitySessions.length) {
                            const sessionList = await Session.aggregate([
                                {
                                    $match: {
                                        _id: { $in: activitySessions[0].session },
                                        guest: true,
                                        isDelete: false,
                                    }
                                },
                                ...aggregateObj
                            ]);
                            if (sessionList.length > 0)
                                return res.status(200).json({ status: true, message: "Session list retrived based on activity!", data: sessionList, });
                            else
                                return res.status(200).json({ status: true, message: "Session list not found for this member!", data: [] });
                        } else {
                            return res.status(200).json({ status: false, message: "Something went wrong while getting sessions of activity!", });
                        }

                    } else if (userData.attendeeDetail.evntData[0].speaker === true) {
                        const activitySessions = await eventActivity.aggregate([{ $match: { _id: ObjectId(req.params.id), speaker: true, isDelete: false } }]);

                        if (activitySessions.length > 0) {
                            const sessionList = await Session.aggregate([
                                {
                                    $match:
                                    {
                                        _id: { $in: activitySessions[0].session },
                                        speaker: true,
                                        isDelete: false,
                                    },
                                },
                                ...aggregateObj
                            ]);
                            if (sessionList.length > 0)
                                return res.status(200).json({ status: true, message: "Session list retrived based on activity!", data: sessionList, });
                            else
                                return res.status(200).json({ status: true, message: "Session list not found for this member!", data: [] });
                        } else {
                            return res.status(200).json({ status: false, message: "Something went wrong while getting sessions of activity!", });
                        }

                    } else if (userData.attendeeDetail.evntData[0].partner === true) {
                        const activitySessions = await eventActivity.aggregate([{ $match: { _id: ObjectId(req.params.id), partner: true, isDelete: false } }]);

                        if (activitySessions.length) {
                            const sessionList = await Session.aggregate([
                                {
                                    $match:
                                    {
                                        _id: { $in: activitySessions[0].session },
                                        partner: true,
                                        isDelete: false,
                                    },
                                },
                                ...aggregateObj
                            ]);
                            if (sessionList.length > 0)
                                return res.status(200).json({ status: true, message: "Session list retrived based on activity!", data: sessionList, });
                            else
                                return res.status(200).json({ status: true, message: "Session list not found for this member!", data: [] });
                        } else {
                            return res.status(200).json({ status: false, message: "Something went wrong while getting sessions of activity!", });
                        }

                    } else if (userData.attendeeDetail.evntData[0].guest === true) {
                        const activitySessions = await eventActivity.aggregate([{ $match: { _id: ObjectId(req.params.id), guest: true, isDelete: false } }]);

                        if (activitySessions.length) {
                            const sessionList = await Session.aggregate([
                                {
                                    $match: {
                                        _id: { $in: activitySessions[0].session },
                                        guest: true,
                                        isDelete: false,
                                    }
                                },
                                ...aggregateObj
                            ]);
                            if (sessionList.length > 0)
                                return res.status(200).json({ status: true, message: "Session list retrived based on activity!", data: sessionList, });
                            else
                                return res.status(200).json({ status: true, message: "Session list not found for this member!", data: [] });
                        } else {
                            return res.status(200).json({ status: false, message: "Something went wrong while getting sessions of activity!", });
                        }

                    }
                } else
                    return res.status(200).json({ status: true, message: "Session not found!", data: [] });
            }
        } else
            return res.status(200).json({ status: true, message: "Session list not found for this member!", data: [] });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// get session detail by id
exports.getSessionDetailsById = async (req, res) => {
    try {
        const authUserId = req.authUserId;
        const userData = await User.findOne({ _id: ObjectId(authUserId) });
        const notificationFor = userData.notificationFor;
        const sessionDetail = await Session.aggregate([
            {
                $match: {
                    _id: ObjectId(req.params.id),
                    isDelete: false,
                },
            },
            {
                $lookup: {
                    from: "rooms",
                    let: { session_rooms_id: "$room" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$session_rooms_id"],
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
                                    { $project: { name: 1, address: 1, country: 1, city: 1, latitude: 1, longitude: 1, locationVisible: 1, locationImages: 1 } },
                                ],
                                as: "location"
                            },
                        },
                        {
                            $unwind: "$location",
                        },
                        { $project: { name: 1, location: 1, } },
                    ],
                    as: "room"
                }
            },
            {
                $lookup: {
                    from: "events",
                    let: { event_id: "$event" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$event_id"],
                                },
                            },
                        },
                        { $project: { title: 1, thumbnail: 1, description: "$longDescription", eventUrl: 1, type: 1, timeZone: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, eventAccess: 1, restrictedAccessGroups: 1, restrictedAccessMemberships: 1, photos: 1, } },
                    ],
                    as: "events"
                }
            },
            {
                $lookup: {
                    from: "airtable-syncs",
                    let: { speakerId: "$speakerId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$_id", "$$speakerId"],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: "$_id",
                                title: "$attendeeDetail.title",
                                name: "$attendeeDetail.name",
                                company: "$attendeeDetail.company",
                                profession: "$attendeeDetail.profession",
                                phone: "$attendeeDetail.phone",
                                facebook: "$attendeeDetail.facebook",
                                linkedin: "$attendeeDetail.linkedin",
                                auth0Id: "$attendeeDetail.auth0Id",
                                profileImg: "$speakerIcon",
                            }
                        },
                    ],
                    as: "speakerId"
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: "$longDescription",
                    shortDescription: 1,
                    longDescription: 1,
                    date: 1,
                    startTime: 1,
                    endDate: 1,
                    endTime: 1,
                    room: 1,
                    speakerId: 1,
                    event: 1,
                    reserved: 1,
                    reserved_URL: 1,
                    reservedLabelForDetail: 1,
                    reservedLabelForListing: 1,
                    member: 1,
                    speaker: 1,
                    partner: 1,
                    guest: 1,
                    notifyChanges: 1,
                    notifyChangeText: 1,
                    notificationFlag: {
                        $let:
                        {
                            vars: {
                                test: {
                                    $filter: {
                                        input: userData.notificationFor,
                                        cond: {
                                            $and: [
                                                { $eq: ["$_id", "$$this.id"] },
                                                { $eq: ["session", "$$this.type"] },
                                                { $eq: ["user", "$$this.setBy"] },
                                            ]
                                        }
                                    },
                                }
                            }, in: {
                                $gt: [{ $size: "$$test" }, 0]
                            }
                        }
                    },
                    isDelete: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);

        if (sessionDetail)
            return res.status(200).json({ status: true, message: "Session detailed retrived!", data: sessionDetail[0], });
        else
            return res.status(200).json({ status: false, message: "Something went wrong while getting session detail!", });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};