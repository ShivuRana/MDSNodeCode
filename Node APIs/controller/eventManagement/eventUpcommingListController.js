const eventPackage = require("../../database/models/eventPackage");
const eventLocation = require("../../database/models/eventLocation");
const event = require("../../database/models/event");
const User = require("../../database/models/airTableSync");
const { ObjectId } = require("mongodb");
const Notification = require("../../database/models/notification");
const AWS = require("aws-sdk");
const moment = require("moment");
const { send_notification, notification_template, addTime, subtractTime } = require("../../utils/notification");
const scheduleLib = require("node-schedule");
const ScheduledNotification = require("../../database/models/scheduledNotification");
const { schedule, reScheduleNotificationForActivitySession, rearrangeAttendee } = require("./eventAttendeeManageController");
require('moment-timezone');
const { get_user_by_socket } = require("../chatcontroller");
const { keys } = require("lodash");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

/** User APIs starts **/
// get upcomming event list and past event list
exports.getUpCommingEventList = async (req, res) => {
    try {
        var localDate = new Date(req.query.localDate);
        localDate = moment(localDate, "YYYY-MM-DD").toDate();
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skip = (page - 1) * limit;
        const authUser = req.authUserId;
        const userData = await User.findById(authUser).select("auth0Id accessible_groups purchased_plan attendeeDetail.evntData");

        var match = {
            isDelete: false,
        }

        var type = "";
        if (req.query.type) {
            type = req.query.type;
            match = { ...match, [`type.name`]: type, };
        }

        const aggregatePipeline = [
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
                            $or: [
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

        const eventListData = await event.aggregate([
            ...aggregatePipeline,
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
            { $skip: skip },
            { $limit: limit },
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

        const count = await event.aggregate([...aggregatePipeline]);

        if (eventListData.length > 0) {
            return res.status(200).json({
                status: true, message: "Event list retrive!",
                data: {
                    upCommingEvents: eventListData,
                    totalPages: Math.ceil(count.length / limit),
                    currentPage: page,
                    totalEvents: count.length,
                },
            });
        } else {
            return res.status(200).json({
                status: true, message: "There is no upcomming events for this user!",
                data: {
                    upCommingEvents: [],
                    totalPages: Math.ceil(count.length / limit),
                    currentPage: page,
                    totalEvents: count.length,
                },
            });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};

// get event by for user
exports.getUpcomingEventById = async (req, res) => {
    try {
        const authUser = req.authUserId;
        const eventId = new ObjectId(req.params.id);
        const userData = await User.findById(authUser).select("attendeeDetail.evntData");
        const eventData = await event.aggregate([
            {
                $match: {
                    _id: eventId,
                    isDelete: false
                },
            },
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
                        { $sort: { order: 1 } },
                        {
                            $project: {
                                _id: 1, name: 1, description: 1, price: 1, event: 1, isDelete: 1, createdAt: 1, updatedAt: 1,
                                url: {
                                    $cond: [
                                        {
                                            "$ifNull":
                                                ["$url", false]
                                        },
                                        "$url", null
                                    ]
                                },
                            }
                        }
                    ],
                    as: "packages"
                }
            },
            {
                $project: {
                    title: 1,
                    thumbnail: 1,
                    eventUrl: 1,
                    type: ["$type.name"],
                    startDate: 1,
                    startTime: 1,
                    endDate: 1,
                    endTime: 1,
                    shortDescription: 1,
                    longDescription: 1,
                    timeZone: 1,
                    location: {
                        $cond: [
                            {
                                "$ifNull":
                                    ["$isLocation", false]
                            },
                            ["$location"], []
                        ]
                    },
                    contactSupport: 1,
                    packages: 1,
                    isPreRegister: 1,
                    preRegisterBtnLink: 1,
                    preRegisterBtnTitle: 1,
                    preRegisterDescription: 1,
                    preRegisterEndDate: 1,
                    preRegisterStartDate: 1,
                    preRegisterTitle: 1,
                    registationFlag: {
                        $let: {
                            vars: {
                                test: {
                                    $filter: {
                                        input: userData.attendeeDetail.evntData,
                                        cond: {
                                            $and: [
                                                { $eq: [eventId, "$$this.event"] },
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
                }
            },
        ]);

        if (eventData.length > 0) {
            var eventDetails = eventData[0];
            return res.status(200).json({ status: true, message: "Event detail retrive!", data: eventDetails, });
        } else {
            return res.status(200).json({ status: false, message: "Something went wrong while getting event!", });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: "Internal server error!", error: error });
    }
};
