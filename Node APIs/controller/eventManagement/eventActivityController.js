const Room = require("../../database/models/eventRoom");
const Session = require("../../database/models/eventSession");
const eventActivity = require("../../database/models/eventActivity");
const eventFaqs = require("../../database/models/eventFaqs");
const eventContactSupport = require("../../database/models/eventContactSupport");
const { ObjectId } = require("mongodb");
const event = require("../../database/models/event");
const User = require("../../database/models/airTableSync");
const { send_notification, notification_template, addTime, subtractTime } = require("../../utils/notification");
const { checkIfMsgReadSocket } = require("../chatcontroller");
const { schedule, reScheduleNotificationForActivitySession, scheduleNotificationFormAdmin, reScheduleNotificationFormAdmin } = require("./eventAttendeeManageController");
const Notification = require("../../database/models/notification");
const ScheduledNotification = require("../../database/models/scheduledNotification");
const scheduleLib = require("node-schedule");
require("dotenv").config();
const moment = require("moment");
const AWS = require("aws-sdk");
require('moment-timezone');
const bucketName = process.env.AWS_BUCKET;
const folderName = `uploads/event-activity/${process.env.AWS_ACTIVITY_ICON_FOLDER}/`;
const domainName = `https://mds-community.s3.amazonaws.com/uploads/event-activity/${process.env.AWS_ACTIVITY_ICON_FOLDER}/`

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

/** CURD opreation of event activity start **/

// create event activity
exports.createEventActivity = async (req, res) => {
    try {
        const body = req.body;
        var startTimeArr = [], endTimeArr = [], startDateArr = [], endDateArr = [];
        if (body) {
            if (body.session) {
                if (body.session.length > 1) {

                    let resOrder = body.session.map(async ids => {
                        const sessionDetail = await Session.findOne({ _id: new ObjectId(ids), isDelete: false, });
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

                    body.startTime = minTimeString;
                    body.endTime = maxTimeString;
                    body.date = minDateString;
                    body.endDate = maxDateString;

                } else {
                    const sessionData = await Session.findOne({ _id: new ObjectId(req.body.session[0]), isDelete: false, });
                    body.startTime = sessionData.startTime;
                    body.endTime = sessionData.endTime;
                    body.date = sessionData.date;
                    body.endDate = sessionData.endDate;
                }
            }

            let description = `<div "font-family: 'Muller';">${body.longDescription}</div>`;
            let shortDescription = `${body.shortDescription}`;
            if (req.icon === undefined && body.exist_icon !== "" && body.exist_icon !== null && body.exist_icon !== "null")
                req.icon = body.exist_icon;

            const newActivity = new eventActivity({
                name: body.name,
                icon: req.icon,
                shortDescription: shortDescription,
                longDescription: description,
                date: body.date,
                startTime: body.startTime,
                endTime: body.endTime,
                member: body.member,
                speaker: body.speaker,
                partner: body.partner,
                guest: body.guest,
                reserved: body.reserved,
                reserved_URL: body.reserved_URL,
                reservedLabelForListing: body.reservedLabelForListing,
                reservedLabelForDetail: body.reservedLabelForDetail,
                session: body.session,
                event: body.event,
                location: body.location !== null && body.location !== "" ? body.location : null,
                notifyChanges: body.notifyChanges !== null && body.notifyChanges !== "" ? body.notifyChanges : false,
                notifyChangeText: body.notifyChangeText !== null && body.notifyChangeText !== "" ? body.notifyChangeText : "",
                isEndOrNextDate: body.isEndOrNextDate !== null && body.isEndOrNextDate !== "" ? body.isEndOrNextDate : false,
                endDate: body.endDate !== null && body.endDate !== "" ? body.endDate : body.date,
                scheduleNotify: body.scheduleNotify !== null && body.scheduleNotify !== "" ? body.scheduleNotify : false,
                scheduleNotifyTime: body.scheduleNotifyTime !== null && body.scheduleNotifyTime !== "" ? body.scheduleNotifyTime : "",
            });
            const activityData = await newActivity.save();

            if (activityData.scheduleNotify === true) {
                const scheduleNotifyTime = activityData.scheduleNotifyTime;
                var allUsers = [], members = [], speakers = [], partners = [], guests = [];
                if (activityData.member === true) {
                    members = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: activityData.event, [`member`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                    allUsers = allUsers.concat(members);
                } else if (activityData.speaker === true) {
                    speakers = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: activityData.event, [`speaker`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                    allUsers = allUsers.concat(speakers);
                } else if (activityData.partner === true) {
                    partners = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: activityData.event, [`partner`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                    allUsers = allUsers.concat(partners);
                } else if (activityData.guest === true) {
                    guests = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: activityData.event, [`guest`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                    allUsers = allUsers.concat(guests);
                }

                const uniqueUsers = allUsers.filter((value, index, self) =>
                    index === self.findIndex((t) => (
                        t._id === value._id
                    ))
                )

                if (uniqueUsers.length > 0) {
                    const eventID = activityData.event ? activityData.event : null;
                    const activityID = activityData._id ? activityData._id : null;
                    let schedule = uniqueUsers.map(async (user, i) => {
                        await scheduleNotificationFormAdmin(user._id, eventID, activityID, "", "activity", scheduleNotifyTime)
                    });
                    await Promise.all([...schedule]);
                }
            }

            if (activityData)
                return res.status(200).json({ status: true, message: "Event activity added successfully!", data: activityData, });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while adding event activity!", });
        } else {
            return res.status(200).json({ status: false, message: "All fields are required!", });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: "Something went wrong!", error: error });
    }
};

// edit event activity
exports.editEventActivity = async (req, res) => {
    try {
        const getActivity = await eventActivity.findOne({ _id: new ObjectId(req.params.id), isDelete: false }).lean();
        const alreadyAdded = await User.find({ notificationFor: { $elemMatch: { id: new ObjectId(req.params.id) } }, setBy: "user" }, { _id: 1, "notificationFor.$": 1 });

        if (getActivity) {
            var startTimeArr = [], endTimeArr = [], startDateArr = [], endDateArr = [];
            if (req.body.session) {
                if (req.body.session.length > 1) {

                    let resOrder = req.body.session.map(async ids => {
                        const sessionDetail = await Session.findOne({ _id: new ObjectId(ids), isDelete: false, });
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

                    req.body.startTime = minTimeString;
                    req.body.endTime = maxTimeString;
                    req.body.date = minDateString;
                    req.body.endDate = maxDateString;

                } else {
                    const sessionData = await Session.findOne({ _id: new ObjectId(req.body.session[0]), isDelete: false, });
                    req.body.startTime = sessionData.startTime;
                    req.body.endTime = sessionData.endTime;
                    req.body.date = sessionData.date;
                    req.body.endDate = sessionData.endDate;
                }
            }

            let description = `<div "font-family: 'Muller';">${req.body.longDescription}</div>`;
            let shortDescription = `${req.body.shortDescription}`;
            if (req.icon === undefined && req.body.exist_icon !== "" && req.body.exist_icon !== null && req.body.exist_icon !== "null")
                req.icon = req.body.exist_icon;

            if (req.body.date !== getActivity.date || req.body.startTime !== getActivity.startTime) {
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

            const activityData = await eventActivity.findByIdAndUpdate(req.params.id,
                {
                    name: req.body.name ?? getActivity.name,
                    icon: req.icon ?? getActivity.icon,
                    shortDescription: shortDescription ?? getActivity.shortDescription,
                    longDescription: description ?? getActivity.longDescription,
                    date: req.body.date ?? getActivity.date,
                    startTime: req.body.startTime ?? getActivity.startTime,
                    endTime: req.body.endTime ?? getActivity.endTime,
                    member: req.body.member ?? getActivity.member,
                    speaker: req.body.speaker ?? getActivity.speaker,
                    partner: req.body.partner ?? getActivity.partner,
                    guest: req.body.guest ?? getActivity.guest,
                    session: req.body.session ?? [],
                    reserved: req.body.reserved ?? getActivity.reserved,
                    reserved_URL: req.body.reserved_URL ?? getActivity.reserved_URL,
                    reservedLabelForListing: req.body.reservedLabelForListing ?? getActivity.reservedLabelForListing,
                    reservedLabelForDetail: req.body.reservedLabelForDetail ?? getActivity.reservedLabelForDetail,
                    event: req.body.event ?? getActivity.event,
                    location: req.body?.location !== null && req.body.location !== "" ? req.body.location : req.body.location === "" ? null : getActivity.location === undefined ? null : getActivity.location,
                    notifyChanges: req.body?.notifyChanges !== null && req.body?.notifyChanges !== "" ? req.body?.notifyChanges : getActivity.notifyChanges === undefined ? false : getActivity.notifyChanges,
                    notifyChangeText: req.body?.notifyChangeText !== null && req.body?.notifyChangeText !== "" ? req.body?.notifyChangeText : getActivity.notifyChangeText === undefined ? "" : getActivity.notifyChangeText,
                    isEndOrNextDate: req.body?.isEndOrNextDate !== null && req.body?.isEndOrNextDate !== "" ? req.body?.isEndOrNextDate : getActivity.isEndOrNextDate === undefined ? false : getActivity.isEndOrNextDate,
                    endDate: req.body?.endDate !== null && req.body.endDate !== "" ? req.body.endDate : getActivity.endDate === undefined ? null : req.body.date ?? getActivity.date,
                    scheduleNotify: req.body?.scheduleNotify !== null && req.body?.scheduleNotify !== "" ? req.body?.scheduleNotify : getActivity.scheduleNotify === undefined ? false : getActivity.scheduleNotify,
                    scheduleNotifyTime: req.body?.scheduleNotifyTime !== null && req.body?.scheduleNotifyTime !== "" ? req.body?.scheduleNotifyTime : getActivity.scheduleNotifyTime === undefined ? "" : getActivity.scheduleNotifyTime,
                },
                { new: true }
            );

            if (activityData.scheduleNotify === true) {
                const scheduleNotifyTime = activityData.scheduleNotifyTime;
                var allUsers = [], members = [], speakers = [], partners = [], guests = [];
                if (activityData.member === true) {
                    members = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: activityData.event, [`member`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                    allUsers = allUsers.concat(members);
                } else if (activityData.speaker === true) {
                    speakers = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: activityData.event, [`speaker`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                    allUsers = allUsers.concat(speakers);
                } else if (activityData.partner === true) {
                    partners = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: activityData.event, [`partner`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                    allUsers = allUsers.concat(partners);
                } else if (activityData.guest === true) {
                    guests = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: activityData.event, [`guest`]: true } }, }, { "attendeeDetail.evntData.$": 1 });
                    allUsers = allUsers.concat(guests);
                }

                const uniqueUsers = allUsers.filter((value, index, self) =>
                    index === self.findIndex((t) => (
                        t._id === value._id
                    ))
                )

                if (uniqueUsers.length > 0) {
                    const eventID = activityData.event ? activityData.event : null;
                    const activityID = activityData._id ? activityData._id : null;
                    let schedule = uniqueUsers.map(async (user, i) => {
                        await reScheduleNotificationFormAdmin(user._id, eventID, activityID, "", "activity", scheduleNotifyTime);
                    });
                    await Promise.all([...schedule]);
                }
            } else if (activityData.scheduleNotify === false) {
                const alreadyAddedUsers = await User.find({ notificationFor: { $elemMatch: { id: activityData._id }, }, }, { "notificationFor.$": 1 });
                if (alreadyAddedUsers.length > 0) {
                    const NotificationFor = {
                        id: getActivity._id,
                        type: "activity",
                        setBy: "admin",
                    };
                    let resCancel = alreadyAddedUsers.map(async (user, i) => {
                        const scheduleData = await ScheduledNotification.findOne({ createdFor: user._id, idsFor: getActivity._id, createdBy: "admin" });
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

            if (activityData.notifyChanges === true) {
                await this.sendNotificationForNotifyUser(activityData.event, activityData.notifyChangeText, "activity", activityData._id);
            }
            if (activityData)
                return res.status(200).json({ status: true, message: "Event activity updated successfully!", data: activityData, });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while updating event activity!", });
        } else {
            return res.status(200).json({ status: false, message: "Event activity not found!" });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: "Something went wrong!", error: error });
    }
};

// delete event activity
exports.deleteEventActivity = async (req, res) => {
    try {
        const getActivity = await eventActivity.findOne({ _id: new ObjectId(req.params.id), isDelete: false }).lean();
        if (getActivity) {
            const alreadyAddedUsers = await User.find({ notificationFor: { $elemMatch: { id: getActivity._id }, }, }, { "notificationFor.$": 1 });

            if (alreadyAddedUsers.length > 0) {
                const NotificationFor = {
                    id: getActivity._id,
                    type: "activity",
                    setBy: "user",
                };

                const NotificationForAdmin = {
                    id: getActivity._id,
                    type: "activity",
                    setBy: "admin",
                };

                let resCancel = alreadyAddedUsers.map(async (user, i) => {
                    const scheduleData = await ScheduledNotification.findOne({ createdFor: user._id, idsFor: getActivity._id, createdBy: "user" });
                    if (scheduleData !== null) {
                        await User.findOneAndUpdate(
                            { _id: user._id },
                            { $pull: { notificationFor: NotificationFor } },
                            { new: true }
                        );
                        await ScheduledNotification.findByIdAndRemove(scheduleData._id);
                    }
                    const scheduleDataAdmin = await ScheduledNotification.findOne({ createdFor: user._id, idsFor: getActivity._id, createdBy: "admin" });
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

            const activityData = await eventActivity.findByIdAndUpdate(req.params.id, { isDelete: true }, { new: true });
            if (activityData)
                return res.status(200).json({ status: true, message: "Event activity deleted successfully!", data: activityData });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while deleteing event activity!", });
        } else {
            return res.status(200).json({ status: false, message: "Event activity not found!" });
        }
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e });
    }
};

// get all event activity
exports.getAllEventActivity = async (req, res) => {
    try {
        const allActivityData = await eventActivity.find({ isDelete: false }).sort({ createdAt: -1 });
        if (allActivityData)
            return res.status(200).json({ status: true, message: "All event activity retrive!", data: allActivityData, });
        else
            return res.status(200).json({ status: false, message: "Something went wrong while getting event activity!", });
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e });
    }
};

// get all event activity by event id
exports.getAllEventActivityByEventId = async (req, res) => {
    try {
        const allActivityData = await eventActivity.find({ isDelete: false, event: req.params.eventId }).sort({ createdAt: -1 });
        if (allActivityData)
            return res.status(200).json({ status: true, message: "all event activity retrive!", data: allActivityData, });
        else
            return res.status(200).json({ status: false, message: "Something went wrong while getting event activity!", });
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e });
    }
};

// get event activity by id
exports.getActivityDetail = async (req, res) => {
    try {
        const activityData = await eventActivity.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (activityData)
            return res.status(200).json({ status: true, message: "Event activity detail retrive!", data: activityData, });
        else
            return res.status(200).json({ status: false, message: "Something went wrong while getting event activity!", });
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e });
    }
};

// Save images sapratly
exports.saveFiles = async (req, res) => {
    try {
        const { image } = req;

        if (image) {
            return res.status(200).json({ status: true, media: image, message: "Files saved successfully!", });
        } else
            return res.status(200).json({ status: false, message: "Something went wrong!" });
    } catch (error) {
        return res.status(200).json({ status: false, message: "Something went wrong!" });
    }
};
/** CURD opreation of event activity end **/

/** CURD opreation of event FAQs start **/
// create faq
exports.createFaq = async (req, res) => {
    try {
        const body = req.body;
        if (body) {
            const newFaq = new eventFaqs({ ...body });
            const faqData = await newFaq.save();
            if (faqData)
                return res.status(200).json({ status: true, message: "FAQs added successfully!", data: faqData, });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while adding FAQs!", });
        } else {
            return res.status(200).json({ status: false, message: "All fields are required!", });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// update faq
exports.editFaq = async (req, res) => {
    try {
        const body = req.body;
        const getFaq = await eventFaqs.findOne({ _id: new ObjectId(req.params.id), isDelete: false }).lean();
        if (getFaq) {
            const faqData = await eventFaqs.findByIdAndUpdate(req.params.id,
                {
                    question: body.question ?? getFaq.question,
                    answer: body.answer ?? getFaq.answer,
                    event: body.event ?? getFaq.event,
                },
                { new: true }
            );
            if (faqData)
                return res.status(200).json({ status: true, message: "FAQs updated successfully!", data: faqData, });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while updating FAQs!", });
        } else {
            return res.status(200).json({ status: false, message: "FAQs not found!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// delete faq
exports.deleteFaq = async (req, res) => {
    try {
        const getFaq = await eventFaqs.findOne({ _id: new ObjectId(req.params.id), isDelete: false }).lean();
        if (getFaq) {
            const faqData = await eventFaqs.findByIdAndUpdate(req.params.id, { isDelete: true }, { new: true });
            if (faqData)
                return res.status(200).json({ status: true, message: "FAQs deleted successfully!", data: faqData });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while deleteing FAQs!", });
        } else {
            return res.status(200).json({ status: false, message: "FAQs not found!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// listing of faqs
exports.getAllFaqs = async (req, res) => {
    try {
        const allFaqsData = await eventFaqs.find({ isDelete: false }).sort({ createdAt: -1 });
        if (allFaqsData)
            return res.status(200).json({ status: true, message: "All FAQs retrive!", data: allFaqsData, });
        else
            return res.status(200).json({ status: false, message: "FAQs not found!", });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// get all event packege by event id
exports.getAllEventFaqsByEventId = async (req, res) => {
    try {
        const allFaqsData = await eventFaqs.find({ isDelete: false, event: req.params.eventId }).sort({ createdAt: -1 });
        if (allFaqsData)
            return res.status(200).json({ status: true, message: "All FAQs retrive!", data: allFaqsData, });
        else
            return res.status(200).json({ status: false, message: "Something went wrong while getting all FAQs!", });
    } catch (e) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: e });
    }
};

// faq details data
exports.getFaqDetail = async (req, res) => {
    try {
        const faqData = await eventFaqs.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (faqData)
            return res.status(200).json({ status: true, message: "FAQs detail retrive!", data: faqData, });
        else
            return res.status(200).json({ status: false, message: "FAQs detail not found!", });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};
/** CURD opreation of event FAQs end **/

/** CURD opreation of event contact support details start **/
// create contact support details
exports.createContactSupport = async (req, res) => {
    try {
        const body = req.body;
        if (body) {
            const newcontactData = new eventContactSupport({ ...body });
            const contactData = await newcontactData.save();
            if (contactData)
                return res.status(200).json({ status: true, message: "Contact support added successfully!", data: contactData, });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while adding contact support!", });
        } else {
            return res.status(200).json({ status: false, message: "All fields are required!", });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// update contact support details
exports.editContactSupport = async (req, res) => {
    try {
        const body = req.body;
        const getContactData = await eventContactSupport.findOne({ _id: new ObjectId(req.params.id), isDelete: false }).lean();
        if (getContactData) {
            const contactData = await eventContactSupport.findByIdAndUpdate(req.params.id,
                {
                    email: body.email ?? getContactData.email,
                    phone: body.phone ?? getContactData.phone,
                    localPhone: body.localPhone ?? getContactData.localPhone,
                    event: body.event ?? getContactData.event,
                },
                { new: true }
            );
            if (contactData)
                return res.status(200).json({ status: true, message: "Contact support data updated successfully!", data: contactData, });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while updating contact data!", });
        } else {
            return res.status(200).json({ status: false, message: "Contact not found!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// delete contact support details
exports.deleteContactSupport = async (req, res) => {
    try {
        const getContactData = await eventContactSupport.findOne({ _id: new ObjectId(req.params.id), isDelete: false }).lean();
        if (getContactData) {
            const contactData = await eventContactSupport.findByIdAndUpdate(req.params.id, { isDelete: true }, { new: true });
            if (contactData)
                return res.status(200).json({ status: true, message: "Contact data deleted successfully!", data: contactData });
            else
                return res.status(200).json({ status: false, message: "Something went wrong while deleteing contact data!", });
        } else {
            return res.status(200).json({ status: false, message: "Contact not found!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// listing of contact support details
exports.getAllContactSupports = async (req, res) => {
    try {
        const allContactData = await eventContactSupport.find({ isDelete: false }).sort({ createdAt: -1 });
        if (allContactData)
            return res.status(200).json({ status: true, message: "All contacts retrive!", data: allContactData, });
        else
            return res.status(200).json({ status: false, message: "Contacts not found!", });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// listing of contact support list by event id
exports.getAllContactSupportsByEventId = async (req, res) => {
    try {
        const allContactData = await eventContactSupport.find({ event: ObjectId(req.params.id), isDelete: false }).sort({ createdAt: -1 });
        if (allContactData)
            return res.status(200).json({ status: true, message: "All contacts retrive!", data: allContactData, });
        else
            return res.status(200).json({ status: false, message: "Contacts not found!", });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// contact support details details data
exports.getContactSupportDetail = async (req, res) => {
    try {
        const contactData = await eventContactSupport.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (contactData)
            return res.status(200).json({ status: true, message: "Contact detail retrive!", data: contactData, });
        else
            return res.status(200).json({ status: false, message: "Contact detail not found!", });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};
/** CURD opreation of event contact support details end **/

// send notification in case of notify user when edit any session, room or activity for specific event
exports.sendNotificationForNotifyUser = async (eventId, notifyMsg, notifyFor, notifyForId) => {
    try {
        let chatData = {}, data = {}, notifyForData = {}, members = [];
        let eventData = await event.findOne({ _id: new ObjectId(eventId), isDelete: false });
        if (notifyFor === "activity") {
            let activityData = await eventActivity.aggregate([
                {
                    $match: { _id: new ObjectId(notifyForId), isDelete: false },
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
                                                    { $project: { name: 1, address: 1, country: 1, city: 1, latitude: 1, longitude: 1, locationVisible: 1, locationImages: 1 } },
                                                ],
                                                as: "location"
                                            },
                                        },
                                        {
                                            $unwind: "$location",
                                        },
                                        { $project: { location: 1, } },
                                    ],
                                    as: "room"
                                }
                            },
                            {
                                $unwind: "$room",
                            },
                            { $project: { room: 1 } },
                        ],
                        as: "sessions"
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
                            { $project: { name: 1, address: 1, country: 1, city: 1, latitude: 1, longitude: 1, locationVisible: 1, locationImages: 1 } },
                        ],
                        as: "location"
                    }
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
            notifyForData = activityData[0];
        } else if (notifyFor === "session") {
            notifyForData = await Session.findOne({ _id: new ObjectId(notifyForId), isDelete: false });
        } else if (notifyFor === "room") {
            notifyForData = await Room.findOne({ _id: new ObjectId(notifyForId), isDelete: false });
        }

        if (notifyFor === "room") {
            members = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(eventId) } }, isDelete: false }, {
                _id: 1,
                deviceToken: 1,
                email: 1,
                otherdetail: 1,
                profileImg: 1,
                thumb_profileImg: 1,
                auth0Id: 1,
                attendeeDetail: {
                    name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                    firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                    lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                    photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                },
            });
        } else {
            if (notifyForData.member === true) {
                const menberData = await User.aggregate([
                    {
                        $match: {
                            "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(eventId), [`member`]: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            deviceToken: 1,
                            email: 1,
                            otherdetail: 1,
                            profileImg: 1,
                            thumb_profileImg: 1,
                            auth0Id: 1,
                            attendeeDetail: {
                                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                                photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                            },
                        }
                    }
                ]);
                if (menberData.length > 0)
                    members = members.concat(menberData);
            } else if (notifyForData.speaker === true) {
                const speakerData = await User.aggregate([
                    {
                        $match: {
                            "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(eventId), [`speaker`]: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            deviceToken: 1,
                            email: 1,
                            otherdetail: 1,
                            profileImg: 1,
                            thumb_profileImg: 1,
                            auth0Id: 1,
                            attendeeDetail: {
                                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                                photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                            },
                        }
                    }
                ]);
                if (speakerData.length > 0)
                    members = members.concat(speakerData);
            } else if (notifyForData.partner === true) {
                const peartnerData = await User.aggregate([
                    {
                        $match: {
                            "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(eventId), [`partner`]: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            deviceToken: 1,
                            email: 1,
                            otherdetail: 1,
                            profileImg: 1,
                            thumb_profileImg: 1,
                            auth0Id: 1,
                            attendeeDetail: {
                                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                                photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                            },
                        }
                    }
                ]);
                if (peartnerData.length > 0)
                    members = members.concat(peartnerData);
            } else if (notifyForData.guest === true) {
                const guestData = await User.aggregate([
                    {
                        $match: {
                            "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(eventId), [`guest`]: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            deviceToken: 1,
                            email: 1,
                            otherdetail: 1,
                            profileImg: 1,
                            thumb_profileImg: 1,
                            auth0Id: 1,
                            attendeeDetail: {
                                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                                photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                            },
                        }
                    }
                ]);
                if (guestData.length > 0)
                    members = members.concat(guestData);
            }
        }

        chatData = {
            "senderId": process.env.ADMIN_ID,
            "senderName": "Admin",
            "eventId": eventData._id,
            "eventName": eventData.title,
            "chatType": "nofifyUser",
        }

        if (notifyFor === "activity") {
            chatData.activityId = notifyForData._id;
            chatData.activityName = notifyForData.name;
            chatData.sessionCount = notifyForData.sessionCount;
        } else if (notifyFor === "session") {
            chatData.sessionId = notifyForData._id;
            chatData.sessionName = notifyForData.name;
        }

        data = {
            "eventName": eventData.title,
            "chatType": "nofifyUser",
            "notifyMsg": notifyMsg,
        }

        let notificationTemplate = await notification_template.notify_user_for_update(data);
        if (members.length > 0) {
            let sendNotify = members?.map(async member => {
                let userDeviceToken = await User.findOne({ _id: new ObjectId(member._id) }, { deviceToken: 1 });
                let unReadCount = await checkIfMsgReadSocket(member._id);
                if (userDeviceToken.deviceToken.length !== 0) {
                    if (userDeviceToken.deviceToken) {
                        await new Notification({ title: notificationTemplate?.template?.title, body: notificationTemplate?.template?.body, createdBy: process.env.ADMIN_ID, createdFor: member._id, role: "nofifyUser" }).save();

                        let data = {
                            "notification": notificationTemplate?.template?.title,
                            "description": notificationTemplate?.template?.body,
                            "device_token": userDeviceToken.deviceToken,
                            "collapse_key": eventData._id,
                            "badge_count": unReadCount,
                            "sub_title": "",
                            "notification_data": {
                                "type": "notify_user_for_update",
                                "content": chatData
                            }
                        }

                        send_notification(data);
                    }
                }
            });
            await Promise.all([...sendNotify]);
        }

    } catch (error) {
        console.log(error, "error");
        return { status: false, message: "Inernal server error!", error: `${error.message}`, };
    }
};

// send notification in case of notify user when edit any session, room or activity for specific event
exports.sendNotificationForNotifyUserAPI = async (req, res) => {
    try {
        let chatData = {}, data = {}, notifyForData = {}, members = [];
        const body = req.body;
        const notifyFor = body.notifyFor;
        const notifyMsg = body.notifyMsg;
        let eventData = await event.findOne({ _id: new ObjectId(body.eventId), isDelete: false });
        if (notifyFor === "activity") {
            let activityData = await eventActivity.aggregate([
                {
                    $match: { _id: new ObjectId(body.notifyForId), isDelete: false },
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
                                                    { $project: { name: 1, address: 1, country: 1, city: 1, latitude: 1, longitude: 1, locationVisible: 1, locationImages: 1 } },
                                                ],
                                                as: "location"
                                            },
                                        },
                                        {
                                            $unwind: "$location",
                                        },
                                        { $project: { location: 1, } },
                                    ],
                                    as: "room"
                                }
                            },
                            {
                                $unwind: "$room",
                            },
                            { $project: { room: 1 } },
                        ],
                        as: "sessions"
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
                            { $project: { name: 1, address: 1, country: 1, city: 1, latitude: 1, longitude: 1, locationVisible: 1, locationImages: 1 } },
                        ],
                        as: "location"
                    }
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
            notifyForData = activityData[0];
        } else if (notifyFor === "session") {
            notifyForData = await Session.findOne({ _id: new ObjectId(body.notifyForId), isDelete: false });
        } else if (notifyFor === "room") {
            notifyForData = await Room.findOne({ _id: new ObjectId(body.notifyForId), isDelete: false });
        }

        if (notifyFor === "room") {
            members = await User.find({ "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(body.eventId) } }, isDelete: false }, {
                _id: 1,
                deviceToken: 1,
                email: 1,
                otherdetail: 1,
                profileImg: 1,
                thumb_profileImg: 1,
                auth0Id: 1,
                attendeeDetail: {
                    name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                    firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                    lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                    photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                },
            });
        } else {
            if (notifyForData.member === true) {
                const menberData = await User.aggregate([
                    {
                        $match: {
                            "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(body.eventId), [`member`]: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            deviceToken: 1,
                            email: 1,
                            otherdetail: 1,
                            profileImg: 1,
                            thumb_profileImg: 1,
                            auth0Id: 1,
                            attendeeDetail: {
                                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                                photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                            },
                        }
                    }
                ]);
                if (menberData.length > 0)
                    members = members.concat(menberData);
            } else if (notifyForData.speaker === true) {
                const speakerData = await User.aggregate([
                    {
                        $match: {
                            "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(body.eventId), [`speaker`]: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            deviceToken: 1,
                            email: 1,
                            otherdetail: 1,
                            profileImg: 1,
                            thumb_profileImg: 1,
                            auth0Id: 1,
                            attendeeDetail: {
                                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                                photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                            },
                        }
                    }
                ]);
                if (speakerData.length > 0)
                    members = members.concat(speakerData);
            } else if (notifyForData.partner === true) {
                const peartnerData = await User.aggregate([
                    {
                        $match: {
                            "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(body.eventId), [`partner`]: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            deviceToken: 1,
                            email: 1,
                            otherdetail: 1,
                            profileImg: 1,
                            thumb_profileImg: 1,
                            auth0Id: 1,
                            attendeeDetail: {
                                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                                photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                            },
                        }
                    }
                ]);
                if (peartnerData.length > 0)
                    members = members.concat(peartnerData);
            } else if (notifyForData.guest === true) {
                const guestData = await User.aggregate([
                    {
                        $match: {
                            "attendeeDetail.evntData": { $elemMatch: { event: new ObjectId(body.eventId), [`guest`]: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            deviceToken: 1,
                            email: 1,
                            otherdetail: 1,
                            profileImg: 1,
                            thumb_profileImg: 1,
                            auth0Id: 1,
                            attendeeDetail: {
                                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
                                photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
                            },
                        }
                    }
                ]);
                if (guestData.length > 0)
                    members = members.concat(guestData);
            }
        }

        chatData = {
            "senderId": process.env.ADMIN_ID,
            "senderName": "Admin",
            "eventId": eventData._id,
            "eventName": eventData.title,
            "chatType": "nofifyUser",
        }

        if (notifyFor === "activity") {
            chatData.activityId = notifyForData._id;
            chatData.activityName = notifyForData.name;
            chatData.sessionCount = notifyForData.sessionCount;
        } else if (notifyFor === "session") {
            chatData.sessionId = notifyForData._id;
            chatData.sessionName = notifyForData.name;
        }

        data = {
            "eventName": eventData.title,
            "chatType": "nofifyUser",
            "notifyMsg": notifyMsg,
        }

        let notificationTemplate = await notification_template.notify_user_for_update(data);
        if (members.length > 0) {
            let sendNotify = members?.map(async member => {
                let userDeviceToken = await User.findOne({ _id: new ObjectId(member._id) }, { deviceToken: 1 });
                let unReadCount = await checkIfMsgReadSocket(member._id);
                console.log(members.email, "members");
                if (userDeviceToken.deviceToken.length !== 0) {
                    if (userDeviceToken.deviceToken) {
                        await new Notification({ title: notificationTemplate?.template?.title, body: notificationTemplate?.template?.body, createdBy: process.env.ADMIN_ID, createdFor: member._id, role: "nofifyUser" }).save();

                        let data = {
                            "notification": notificationTemplate?.template?.title,
                            "description": notificationTemplate?.template?.body,
                            "device_token": userDeviceToken.deviceToken,
                            "collapse_key": eventData._id,
                            "badge_count": unReadCount,
                            "sub_title": "",
                            "notification_data": {
                                "type": "notify_user_for_update",
                                "content": chatData
                            }
                        }

                        send_notification(data);
                    }
                }
            });
            await Promise.all([...sendNotify]);
            return res.status(200).json({ status: true, message: "notification send...", });
        }

    } catch (error) {
        console.log(error, "error");
        return { status: false, message: "Inernal server error!", error: `${error.message}`, };
    }
};

// get icon images from the S3 bucket
async function getImageUrlsFromS3Folder(bucket, folder) {
    const params = {
        Bucket: bucket,
        Prefix: folder,
    };

    try {
        const response = await s3.listObjectsV2(params).promise();
        const imageUrls = response.Contents.map(
            (item) => `https://${bucket}.s3.amazonaws.com/${item.Key}`
        );
        return imageUrls;
    } catch (err) {
        console.error('Error fetching image URLs from S3:', err);
        return [];
    }
}

// get all activity images uploaded
exports.getAllActivityImages = async (req, res) => {
    try {
        getImageUrlsFromS3Folder(bucketName, folderName)
            .then((imageUrls) => {
                imageUrls.pop(domainName);
                if (imageUrls.length > 0)
                    return res.status(200).json({ status: true, message: "Event activity detail retrive!", data: imageUrls, });
                else
                    return res.status(200).json({ status: false, message: "No existing icons found of any event activity!", });
            })
            .catch((err) => {
                console.error('Error:', err);
                return res.status(200).json({ status: false, message: "Internal server error!", error: err });
            });
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: "Internal server error!", error: error });
    }
};

// get all activity images uploaded
exports.deleteActivityIcon = async (req, res) => {
    try {
        const { icon } = req.body;
        const existIcon = await eventActivity.find({ icon: icon, isDelete: false },).select('-session -event -location -shortDescription -longDescription -notifyChanges -notifyChangeText -isEndOrNextDate -endDate -name -description -date -startTime -endTime -member -speaker -partner -guest -isDelete -createdAt -updatedAt -__v -reserved -reserved_URL');

        if (existIcon.length > 0) {
            return res.status(200).json({ status: false, message: "You can't delete any assigned icon!", });
        } else {
            await s3.deleteObject({
                Bucket: process.env.AWS_BUCKET,
                Key: icon,
            }).promise();

            getImageUrlsFromS3Folder(bucketName, folderName)
                .then((imageUrls) => {
                    imageUrls.pop(domainName);
                    if (imageUrls.length > 0)
                        return res.status(200).json({ status: true, message: "Icon deleted succesfully!", data: imageUrls, });
                    else
                        return res.status(200).json({ status: false, message: "No existing icons found of any event activity!", });
                })
                .catch((err) => {
                    console.error('Error:', err);
                    return res.status(200).json({ status: false, message: "Internal server error!", error: err });
                });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: "Internal server error!", error: error });
    }
};