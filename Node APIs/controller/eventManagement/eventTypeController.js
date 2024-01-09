const EventType = require("../../database/models/eventType");
const eventSearch = require("../../database/models/event/eventSearch");
const event = require("../../database/models/event");
const User = require("../../database/models/airTableSync");
const { addTime, subtractTime } = require("../../utils/notification");
const ObjectId = require("mongoose").Types.ObjectId;
const moment = require("moment");

// create partner Badge
exports.createEventType = async (req, res) => {
    try {
        const newEventData = new EventType({
            name: req.body.name
        });
        const saveEventType = await newEventData.save();
        if (saveEventType)
            return res.status(200).json({ status: true, message: `Event Type created successfully!`, data: saveEventType, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while adding Event Type!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//edit partner Badge 
exports.editEventType = async (req, res) => {
    try {
        const getEventType = await EventType.findOne({ _id: new ObjectId(req.params.id), isDelete: false });

        let typeData = {
            typeId: req.params.id ?? getEventType._id,
            name: req.body.name ?? getEventType.name,
        }

        const eventDetails = await event.find({ isDelete: false, [`type.typeId`]: getEventType._id }, { _id: 1 });
        eventDetails.forEach(async (eventData, i) => {
            await event.findOneAndUpdate({ _id: eventData._id, isDelete: false, },
                {
                    type: typeData,
                },
                { new: true }
            );
        });

        if (!getEventType)
            return res.status(200).json({ status: false, message: `Event Type not found` });

        const updateEventType = await EventType.findByIdAndUpdate(req.params.id,
            {
                name: req.body.name ?? getEventType.name,
            },
            { new: true }
        );

        if (updateEventType)
            return res.status(200).json({ status: true, message: `Event Type updated successfully!`, data: updateEventType, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while updating Event Type!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// delete partner Badge
exports.deleteEventType = async (req, res) => {
    try {
        const getEventType = await EventType.findById(req.params.id);
        if (!getEventType)
            return res.status(200).json({ status: false, message: `Event Type not found` });

        const deleteEventType = await EventType.findByIdAndUpdate(req.params.id, { isDelete: true }, { new: true });
        if (deleteEventType)
            return res.status(200).json({ status: true, message: `Event Type deleted successfully!`, data: deleteEventType });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while deleting Event Type!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all partner post Badge
exports.getAllEventType = async (req, res) => {
    try {
        // const eventTypeList = await EventType.find({ isDelete: false }).sort({ createdAt: -1 });
        const eventTypeList = await EventType.aggregate([
            {$sort:{createdAt: -1}},
            {$match: {isDelete: false},},
            {
                $lookup: {
                    from: "events",
                    let: { local_id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$local_id', '$type.typeId']
                                },
                                isDelete: false,
                            },
                        }

                    ],
                    as: 'eventData',
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    isDelete: 1,
                    countEventData: { $cond: { if: { $isArray: "$eventData" }, then: { $size: "$eventData" }, else: "NA" } },
                    // "eventData": { _id: 1, title: 1,isDelete:1},
                }
            }
        ]);
        if (eventTypeList)
            return res.status(200).json({ status: true, message: `Event Type list retrive sucessfully.`, data: eventTypeList });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting Event Type list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner Badge detail api
exports.getEventTypeById = async (req, res) => {
    try {
        const eventTypeDetail = await EventType.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (eventTypeDetail)
            return res.status(200).json({ status: true, message: `Event Type detail retrive sucessfully.`, data: eventTypeDetail });
        else
            return res.status(200).json({ status: false, message: `No data found for this Event Type id!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all partner post Badge
exports.getAllEventTypeList = async (req, res) => {
    try {
        var localDate = new Date(req.query.localDate);
        localDate = moment(localDate, "YYYY-MM-DD").toDate();

        const eventTypeList = await EventType.aggregate([
            {
                $match: {
                    isDelete: false,
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "events",
                    localField: "_id",
                    foreignField: "type.typeId",
                    pipeline: [
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
                                isDelete: false,
                                Date: { $gt: localDate },
                            }
                        },
                    ],
                    as: "totalCount",
                },
            },
            {
                $project: {
                    _id: "$_id",
                    name: 1,
                    counts: {
                        $size: "$totalCount",
                    },
                },
            },
            {
                $sort: { createdAt: -1 },
            },
        ]);

        if (eventTypeList.length > 0)
            return res.status(200).json({ status: true, message: `Event Type list retrive sucessfully.`, data: eventTypeList });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting Event Type list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// add search history of Event
exports.addEventSearchHistory = async (req, res) => {
    try {
        const { search } = req.body;
        var result = [];
        const checkname = await eventSearch.find({ name: search });
        if (checkname && checkname.length > 0) {
            result = await eventSearch.findOneAndUpdate(
                { name: search },
                { name: search },
                { new: true }
            );
        } else {
            const newSearchEvent = new eventSearch({ name: search });
            result = await newSearchEvent.save();
        }
        return res.status(200).json({ status: true, message: `Search event history added.`, data: result });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error ${error}!` });
    }
};

// remove search history of Event
exports.removeEventSearchHistory = async (req, res) => {
    try {
        const Data = await eventSearch.findById(new ObjectId(req.params.id));
        if (Data) {
            const result = await eventSearch.findOneAndDelete(
                { _id: new ObjectId(req.params.id) },
                { new: true }
            );
            return res.status(200).json({ status: true, message: `Search event history removed successfully.`, data: result, });
        } else {
            return res.status(404).json({ status: false, message: `Search event history not found!`, data: [], });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error ${error}!` });
    }
};

// get top 10 search history of Event by user
exports.topEventSearchHistory = async (req, res) => {
    try {
        const data = await eventSearch.find({}).sort({ updatedAt: -1 }).limit(10).select("-__v -createdAt");

        if (data.length > 0) {
            return res.status(200).json({ status: true, message: `Search history retrive successfully.`, data: data, });
        } else {
            return res.status(200).json({ status: true, message: `Event list not found!`, data: [], });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error ${error}!` });
    }
};

// get all Event list
exports.allEventList = async (req, res) => {
    try {
        const data = await event.find({ isDelete: false }, { _id: 1, title: 1 });

        if (data.length > 0) {
            return res.status(200).json({ status: true, message: `Event list retrive successfully.`, data: data, });
        } else {
            return res.status(200).json({ status: false, message: `Event list not found!`, data: [], });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: `Internal server error ${error}!` });
    }
};

// get all Event list
exports.allEventSearchList = async (req, res) => {
    try {
        const authUser = req.authUserId;
        const role = req.query.role;
        var localDate = new Date(req.query.localDate);
        const userData = await User.findById(authUser).select("auth0Id email accessible_groups purchased_plan attendeeDetail");
        var eventList = [], myEventList = [], pastEventList = [], upcommingEventList = [], location = {};
        var match = {
            isDelete: false,
        }

        var search = "";
        if (req.query.search) {
            search = req.query.search;
            match = {
                ...match,
                title: { $regex: ".*" + search + ".*", $options: "i" },
            };
        }

        if (userData !== null && userData !== undefined) {
            const eventAttendeesData = await User.findOne({ _id: authUser, isDelete: false }, { attendeeDetail: 1 });
            if (eventAttendeesData !== null) {
                let attendeesDetails = eventAttendeesData?.attendeeDetail?.evntData?.map(async (attendee, i) => {
                    if (attendee.member === false && attendee.speaker === false && attendee.partner === false && attendee.guest === false) {
                        eventList = [];
                    } else {
                        if (attendee.member === true && role === "member") {
                            let eventData = await event.findOne({ _id: attendee.event, isDelete: false, title: { $regex: ".*" + search + ".*", $options: "i" }, }, { _id: 1, title: 1, thumbnail: 1, eventUrl: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, timeZone: 1, location: 1, }).lean();
                            if (eventData !== null) {
                                if (eventData.location !== undefined && eventData.location !== "" && eventData.location !== null) {
                                    eventData = { ...eventData, city: eventData.location.address ? eventData.location.city : null, country: eventData.location.address ? eventData.location.country : null };
                                    delete eventData.location;
                                    eventList.push(eventData);
                                } else {
                                    location = await eventLocation.findOne({ event: attendee.event, locationVisible: true, isDelete: false }).lean();
                                    delete eventData.location;
                                    if (location !== null) {
                                        eventData = { ...eventData, city: location ? location.city : null, country: location ? location.country : null };
                                    } else {
                                        eventData = { ...eventData, city: null, country: null };
                                    }
                                    eventList.push(eventData);
                                }
                            }
                        } else if ((attendee.member === true || attendee.speaker === true || attendee.partner === true || attendee.guest === true) && role === "nonMember") {
                            let eventData = await event.findOne({ _id: attendee.event, isDelete: false, title: { $regex: ".*" + search + ".*", $options: "i" }, }, { _id: 1, title: 1, thumbnail: 1, eventUrl: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, timeZone: 1, location: 1, }).lean();
                            if (eventData !== null) {
                                if (eventData.location !== undefined && eventData.location !== "" && eventData.location !== null) {
                                    eventData = { ...eventData, city: eventData.location.address ? eventData.location.city : null, country: eventData.location.address ? eventData.location.country : null };
                                    delete eventData.location;
                                    eventList.push(eventData);
                                } else {
                                    location = await eventLocation.findOne({ event: attendee.event, locationVisible: true, isDelete: false }).lean();
                                    delete eventData.location;
                                    if (location !== null) {
                                        eventData = { ...eventData, city: location ? location.city : null, country: location ? location.country : null };
                                    } else {
                                        eventData = { ...eventData, city: null, country: null };
                                    }
                                    eventList.push(eventData);
                                }
                            }
                        }
                    }
                });
                await Promise.all([...attendeesDetails]);

                if (eventList.length > 0) {
                    for (let index = 0; index < eventList.length; index++) {
                        // Input date and time
                        const eventDate = eventList[index].endDate;
                        const eventTime = eventList[index].endTime;
                        const timeZone = eventList[index].timeZone;

                        // Create a new Date object using the input date and time
                        const sign = timeZone.substring(4, 5);
                        const utcHour = timeZone.substring(5, 7);
                        const utcMinute = timeZone.substring(8, 10);
                        const hour24Formate = moment(eventTime, 'h:mm a').format('HH:mm');

                        // saprate date and time in hours and mins
                        const year = moment(eventDate, 'MM-DD-YYYY').year();
                        const month = moment(eventDate, 'MM-DD-YYYY').month();
                        const day = moment(eventDate, 'MM-DD-YYYY').get('date');
                        const hours = moment(hour24Formate, 'h:mm a').hours();
                        const minutes = moment(hour24Formate, 'h:mm a').minutes();

                        var endDate = new Date(year, month, day, hours, minutes);
                        if (sign === "+") {
                            endDate = await subtractTime(endDate, parseInt(utcHour), parseInt(utcMinute));
                        } else if (sign === "-") {
                            endDate = await addTime(endDate, parseInt(utcHour), parseInt(utcMinute));
                        }

                        if (endDate >= localDate) {
                            myEventList.push(eventList[index]);
                        }
                    }
                }
            }
        }

        localDate = moment(localDate, "YYYY-MM-DD").toDate();
        const pastAggregatePipeline = [
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
                    ...match,
                    Date: { $lt: localDate },
                    $or: [
                        { eventAccess: "public" },
                        { eventAccess: "admin/staff" },
                        { eventAccess: "restricted" },
                    ],
                },
            },
            { $sort: { Date: -1 } },
        ];

        pastEventList = await event.aggregate([
            ...pastAggregatePipeline,
            {
                $project: {
                    _id: 1, title: 1, thumbnail: 1, eventUrl: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, timeZone: 1, city: "$location.city", country: "$location.country", Date: 1
                },
            },
        ]);

        const upcommingaggregatePipeline = [
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
                    ...match,
                    Date: { $gt: localDate },
                    $or: [
                        { eventAccess: "public" },
                        { eventAccess: "admin/staff" },
                        {
                            $and: [
                                { eventAccess: "restricted" },
                                { "restrictedAccessMemberships.0": { $exists: true } },
                                { restrictedAccessGroups: { $in: userData.accessible_groups }, },
                                { $expr: { $in: [userData.purchased_plan, "$restrictedAccessMemberships"], }, }
                            ]
                        }
                    ],
                },
            },
            { $sort: { Date: -1 } },
        ];

        upcommingEventList = await event.aggregate([
            ...upcommingaggregatePipeline,
            {
                $lookup: {
                    from: "eventpackages",
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
                        { $project: { price: 1, _id: 0 } },
                    ],
                    as: "priceData"
                }
            },
            {
                $project: {
                    _id: 1, title: 1, thumbnail: 1, eventUrl: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, timeZone: 1, city: "$location.city", country: "$location.country", type: ["$type.name"],
                    price: {
                        $ifNull: [
                            {
                                $min: {
                                    $filter: {
                                        input: "$priceData.price",
                                        cond: { $gt: ["$$this", 0] }
                                    }
                                }
                            },
                            0
                        ],
                    },
                    registationFlag: {
                        $let: {
                            vars: {
                                test: {
                                    $filter: {
                                        input: userData.attendeeDetail.evntData,
                                        cond: {
                                            $and: [
                                                { $eq: ["$_id", "$$this.event"] },
                                                {
                                                    $or: [
                                                        { $eq: [true, "$$this.member"] },
                                                        { $eq: [true, "$$this.speaker"] },
                                                        { $eq: [true, "$$this.partner"] },
                                                        { $eq: [true, "$$this.guest"] },
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                }
                            }, in: {
                                $gt: [{ $size: "$$test" }, 0]
                            }
                        }
                    },
                },
            },
        ]);

        if (myEventList.length > 0 || pastEventList.length > 0 || upcommingEventList.length > 0) {
            return res.status(200).json({ status: true, message: "Search event list retrive successfully.", data: { myEventList, pastEventList, upcommingEventList }, });
        } else {
            return res.status(200).json({ status: false, message: "Event list not found!", data: { myEventList, pastEventList, upcommingEventList }, });
        }

    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: `Internal server error ${error}!` });
    }
};
