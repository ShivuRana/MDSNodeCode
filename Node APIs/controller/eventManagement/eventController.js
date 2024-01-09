const eventPackage = require("../../database/models/eventPackage");
const eventLocation = require("../../database/models/eventLocation");
const eventActivity = require("../../database/models/eventActivity");
const event = require("../../database/models/event");
const eventAttendees = require("../../database/models/eventAttendees");
const eventSession = require("../../database/models/eventSession");
const eventRoom = require("../../database/models/eventRoom");
const User = require("../../database/models/airTableSync");
const chat = require("../../database/models/chat");
const chatChannel = require("../../database/models/chatChannel");
const chatChannelMembers = require("../../database/models/chatChannelMembers");
const { ObjectId } = require("mongodb");
const group = require("../../database/models/group");
const membershipPlan = require("../../database/models/membershipPlanManagement/membership_plan");
const Notification = require("../../database/models/notification");
const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");

const moment = require("moment");
const {
  send_notification,
  notification_template,
  addTime,
  subtractTime,
} = require("../../utils/notification");
const scheduleLib = require("node-schedule");
const ScheduledNotification = require("../../database/models/scheduledNotification");
const {
  schedule,
  reScheduleNotificationForActivitySession,
  rearrangeAttendee,
} = require("./eventAttendeeManageController");
const {
  addUpdateRecordInChatListForGroupChannel,
  deleteMultipleRecordFromChatList,
} = require("../socketChatController/chatListController");
require("moment-timezone");
const { get_user_by_socket } = require("../chatcontroller");
const { keys } = require("lodash");
const eventFaqs = require("../../database/models/eventFaqs");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
  Bucket: process.env.AWS_BUCKET,
});


/** Admin APIs starts **/
/** start Create, edit, delete and get all event packages **/
// create event packege
exports.createEventPackage = async (req, res) => {
  try {
    if (req.body.name && req.body.price) {
      const package = await eventPackage.find({
        name: req.body.name,
        event: ObjectId(req.body.event),
        isDelete: false,
      });

      if (package && package.length > 0) {
        return res
          .status(200)
          .json({ status: false, message: `Package name must be unique.` });
      }

      let description = `<div "font-family: 'Muller';">${req.body.description}</div>`;
      const ids = await eventPackage
        .find({ isDelete: false, event: req.body.event })
        .sort({ order: -1 });
      let packageOrder = ids && ids.length > 0 ? ids[0].order + 1 : 1;

      const newPackage = new eventPackage({
        name: req.body.name,
        description: description,
        price: req.body.price,
        event: req.body.event,
        url: req.body.url,
        eventUrlFlag: req.body.eventUrlFlag,
        order: packageOrder,
      });
      const packageData = await newPackage.save();
      if (packageData)
        return res.status(200).json({
          status: true,
          message: "Package added successfully!",
          data: packageData,
        });
      else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while adding package!",
        });
    } else {
      return res.status(200).json({
        status: false,
        message: "Name and price are required fields!",
      });
    }
  } catch (e) {
    if (e.name === "MongoServerError" && e.code === 11000) {
      return res
        .status(200)
        .json({ status: false, message: `Package name must be unique.` });
    } else {
      return res
        .status(500)
        .json({ status: false, message: `Internal server error. ${e}` });
    }
  }
};

// edit event packege
exports.editEventPackage = async (req, res) => {
  try {
    const getPackage = await eventPackage
      .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
      .lean();
    if (getPackage) {
      if (req.body.name !== getPackage.name) {
        const package = await eventPackage.find({
          name: req.body.name,
          isDelete: false,
        });
      }
      let description = `<div "font-family: 'Muller';">${req.body.description}</div>`;
      const packageData = await eventPackage.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name ?? getPackage.name,
          description: description ?? getPackage.description,
          price: req.body.price ?? getPackage.price,
          event: req.body.event ?? getPackage.event,
          eventUrlFlag: req.body.eventUrlFlag ?? getPackage.eventUrlFlag,
          url: req.body.url ?? getPackage.url,
        },
        { new: true }
      );
      if (packageData)
        return res.status(200).json({
          status: true,
          message: "Package updated successfully!",
          data: packageData,
        });
      else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while updating package!",
        });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Package not found!" });
    }
  } catch (e) {
    if (e.name === "MongoServerError" && e.code === 11000) {
      return res
        .status(200)
        .json({ status: false, message: `Package name must be unique.` });
    } else {
      return res
        .status(500)
        .json({ status: false, message: `Internal server error! ${e}` });
    }
  }
};

// delete event packege
exports.deleteEventPackage = async (req, res) => {
  try {
    const getPackage = await eventPackage
      .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
      .lean();
    if (getPackage) {
      const packageData = await eventPackage.findByIdAndUpdate(
        req.params.id,
        { isDelete: true },
        { new: true }
      );
      if (packageData) {
        const ids = await eventPackage
          .find({ isDelete: false, event: getPackage.event })
          .sort({ order: 1 });
        let resOrder = ids.map(async (item, i) => {
          await eventPackage.findByIdAndUpdate(
            ObjectId(item),
            { order: i + 1 },
            { new: true }
          );
        });
        await Promise.all([...resOrder]);
        return res.status(200).json({
          status: true,
          message: "Package deleted successfully!",
          data: packageData,
        });
      } else {
        return res.status(200).json({
          status: false,
          message: "Something went wrong while deleteing package!",
        });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Package not found!" });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// get all event packege
exports.getAllEventPackages = async (req, res) => {
  try {
    const allPackageData = await eventPackage
      .find({ isDelete: false })
      .sort({ order: 1 });
    if (allPackageData)
      return res
        .status(200)
        .json({ status: true, message: "All packages!", data: allPackageData });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting all package!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// get all event packege by event id
exports.getAllEventPackagesByEventId = async (req, res) => {
  try {
    const allPackageData = await eventPackage
      .find({ isDelete: false, event: req.params.eventId })
      .sort({ order: 1 });
    if (allPackageData)
      return res
        .status(200)
        .json({ status: true, message: "All packages!", data: allPackageData });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting all package!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// get event packege by ID
exports.getPackageDetail = async (req, res) => {
  try {
    const packageData = await eventPackage.findOne({
      _id: new ObjectId(req.params.id),
      isDelete: false,
    });
    if (packageData)
      return res
        .status(200)
        .json({ status: true, message: "Package detail!", data: packageData });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting package!",
      });
  } catch (e) {
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// get event packege reorder API
exports.packageReorder = async (req, res) => {
  try {
    const ids = req.body.ids;
    if (ids.length > 0) {
      let resOrder = ids.map(async (item, i) => {
        await eventPackage.findByIdAndUpdate(
          ObjectId(item),
          { order: i + 1 },
          { new: true }
        );
      });
      await Promise.all([...resOrder]);

      return res
        .status(200)
        .json({ status: true, message: "Package list rearrange succesfully!" });
    } else {
      return res.status(200).json({
        status: false,
        message: "Something went wrong while rearrange package!",
      });
    }
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!", error: error });
  }
};

/** end Create, edit, delete and get all event packages **/

/**  starts Create, edit, delete and get all event locations **/
// create event location
exports.createEventLocation = async (req, res) => {
  try {
    let locationImages = [];
    if (req.body.address && req.body.country && req.body.city) {
      if (req?.locationImages.length > 0) {
        req?.locationImages.sort((a, b) => a.order - b.order);
        let resOrder = req?.locationImages.map(async (item, i) => {
          locationImages.push(item.img);
        });
        await Promise.all([...resOrder]);
        req.locationImages = locationImages;
      }
      const newLocation = new eventLocation({
        name: req.body.name,
        address: req.body.address,
        country: req.body.country,
        city: req.body.city,
        placeId: req.body.placeId,
        event: req.body.event,
        postalCode: req.body.postalCode,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        locationImages: req?.locationImages ?? [],
        locationVisible: req.body.locationVisible,
      });
      const locationData = await newLocation.save();
      if (locationData)
        return res.status(200).json({
          status: true,
          message: "Location added successfully!",
          data: locationData,
        });
      else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while adding location!",
        });
    } else {
      return res.status(200).json({
        status: false,
        message: "Address, country and city are required fields!",
      });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// edit event location
exports.editEventLocation = async (req, res) => {
  try {
    const getLocation = await eventLocation
      .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
      .lean();
    if (getLocation) {
      var locationImg = [],
        orderImages = [],
        oldImages = [];
      if (
        req.body.locationOldData !== undefined &&
        req.body.locationOldData !== null &&
        req.body.locationOldData !== "null"
      ) {
        if (typeof req.body.locationOldData !== "string") {
          if (req?.locationImages.length > 0) {
            req?.locationImages.sort((a, b) => a.order - b.order);
          }
          if (
            req.body.locationOldData.length > 0 &&
            req?.locationImages.length > 0
          ) {
            [
              ...req.body?.locationOldData,
              ...req?.locationImages.map((image) => {
                return image.img;
              }),
            ].forEach((locationData, i) => {
              locationImg.push({ img: locationData, order: i + 1 });
            });
          } else if (req.body.locationOldData.length > 0) {
            req.body?.locationOldData.forEach((locationData, i) => {
              locationImg.push({ img: locationData, order: i + 1 });
            });
          } else if (req?.locationImages.length > 0) {
            req?.locationImages.forEach((locationDetails) => {
              locationImg.push({
                img: locationDetails.img,
                order: locationDetails.order,
              });
            });
          }
        } else {
          oldImages.push(req.body.locationOldData);
          oldImages.forEach((locationData, i) => {
            locationImg.push({ img: locationData, order: i + 1 });
          });
          if (req?.locationImages.length > 0) {
            req?.locationImages.forEach((locationDetails) => {
              locationImg.push({
                img: locationDetails.img,
                order: locationDetails.order,
              });
            });
          }
        }
      } else {
        if (req?.locationImages.length > 0) {
          req?.locationImages.sort((a, b) => a.order - b.order);
          req?.locationImages.forEach((locationDetails) => {
            locationImg.push({
              img: locationDetails.img,
              order: locationDetails.order,
            });
          });
        }
      }

      if (locationImg.length > 0) {
        let resOrder = locationImg.map(async (item, i) => {
          orderImages.push(item.img);
        });
        await Promise.all([...resOrder]);
        locationImg = orderImages;
      }

      const locationData = await eventLocation.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name ?? getLocation.name,
          address: req.body.address ?? getLocation.address,
          country: req.body.country ?? getLocation.country,
          city: req.body.city ?? getLocation.city,
          placeId: req.body.placeId ?? getLocation.placeId,
          event: req.body.event ?? getLocation.event,
          postalCode: req.body.postalCode ?? getLocation.postalCode,
          latitude: req.body.latitude ?? getLocation.latitude,
          longitude: req.body.longitude ?? getLocation.longitude,
          locationImages: locationImg
            ? locationImg
            : getLocation.locationImages.length > 0
              ? []
              : getLocation?.locationImages,
          locationVisible: req.body.locationVisible
            ? req.body.locationVisible
            : getLocation.locationVisible === undefined
              ? false
              : getLocation.locationVisible,
        },
        { new: true }
      );

      if (locationData)
        return res.status(200).json({
          status: true,
          message: "Location updated successfully!",
          data: locationData,
        });
      else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while updating location!",
        });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Location not found!" });
    }
  } catch (e) {
    console.log(e, "e");
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// delete event location
exports.deleteEventLocation = async (req, res) => {
  try {
    const alreadyAssignRoom = await eventRoom
      .find({ location: new ObjectId(req.params.id), isDelete: false })
      .lean();
    const alreadyAssignActivity = await eventActivity
      .find({ location: new ObjectId(req.params.id), isDelete: false })
      .lean();
    if (
      (alreadyAssignRoom && alreadyAssignRoom.length > 0) ||
      (alreadyAssignActivity && alreadyAssignActivity.length > 0)
    ) {
      var roomList = [];
      if (alreadyAssignRoom.length > 0) {
        alreadyAssignRoom.map((itemRoom, i) => {
          roomList.push(itemRoom.name);
        });
      }

      var activityList = [];
      if (alreadyAssignActivity.length > 0) {
        alreadyAssignActivity.map((itemActivity, i) => {
          activityList.push(itemActivity.name);
        });
      }

      return res.status(200).json({
        status: false,
        message:
          "You cannot delete this location because it is assigned to following rooms and activities: ",
        data: { roomList, activityList },
      });
    } else {
      const getLocation = await eventLocation
        .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
        .lean();
      if (getLocation) {
        const locationData = await eventLocation.findByIdAndUpdate(
          req.params.id,
          { isDelete: true },
          { new: true }
        );
        if (locationData)
          return res.status(200).json({
            status: true,
            message: "Location deleted successfully!",
            data: locationData,
          });
        else
          return res.status(200).json({
            status: false,
            message: "Something went wrong while deleteing location!",
          });
      } else {
        return res
          .status(200)
          .json({ status: false, message: "Location not found!" });
      }
    }
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// get all event location
exports.getAllEventLocations = async (req, res) => {
  try {
    const allLocationData = await eventLocation
      .find({ isDelete: false })
      .sort({ createdAt: -1 });
    if (allLocationData)
      return res.status(200).json({
        status: true,
        message: "All locations!",
        data: allLocationData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting all event locations!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// get all event location by event id
exports.getAllEventLocationsByEventId = async (req, res) => {
  try {
    const allLocationData = await eventLocation
      .find({ isDelete: false, event: req.params.eventId })
      .sort({ createdAt: -1 });
    if (allLocationData)
      return res.status(200).json({
        status: true,
        message: "All locations!",
        data: allLocationData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting all event locations!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

// get event location by ID
exports.getLocationDetail = async (req, res) => {
  try {
    const locationData = await eventLocation.findOne({
      _id: new ObjectId(req.params.id),
      isDelete: false,
    });
    if (locationData)
      return res.status(200).json({
        status: true,
        message: "Location detail!",
        data: locationData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting location!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};
/** end Create, edit, delete and get all event locations **/

/** CURD opreation of event start **/

// upload location images for create event
exports.uploadEventLocationPhotos = async (req, res) => {
  try {
    const { locationImages } = req;
    var locationImg = [],
      orderImages = [];
    if (locationImages.length > 0) {
      locationImages.sort((a, b) => a.order - b.order);
      locationImages.forEach((locationDetails) => {
        locationImg.push({
          img: locationDetails.img,
          order: locationDetails.order,
        });
      });
    }

    if (locationImg.length > 0) {
      let resOrder = locationImg.map(async (item, i) => {
        orderImages.push(item.img);
      });
      await Promise.all([...resOrder]);
      locationImg = orderImages;
    }

    if (locationImg.length > 0) {
      return res.status(200).json({
        status: true,
        message: "Files saved successfully!",
        data: locationImg,
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "Location images not found!",
        data: [],
      });
    }
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// upload location images for edit event
exports.uploadNEditEventLocationPhotos = async (req, res) => {
  try {
    const { locationImages } = req;
    var locationImg = [],
      orderImages = [],
      oldImages = [];
    if (
      req.body.locationOldData !== undefined &&
      req.body.locationOldData !== null &&
      req.body.locationOldData !== "null"
    ) {
      if (typeof req.body.locationOldData !== "string") {
        if (locationImages.length > 0) {
          locationImages.sort((a, b) => a.order - b.order);
        }
        if (req.body.locationOldData.length > 0 && locationImages.length > 0) {
          [
            ...req.body?.locationOldData,
            ...locationImages.map((image) => {
              return image.img;
            }),
          ].forEach((locationData, i) => {
            locationImg.push({ img: locationData, order: i + 1 });
          });
        } else if (req.body.locationOldData.length > 0) {
          req.body?.locationOldData.forEach((locationData, i) => {
            locationImg.push({ img: locationData, order: i + 1 });
          });
        } else if (locationImages.length > 0) {
          locationImages.forEach((locationDetails) => {
            locationImg.push({
              img: locationDetails.img,
              order: locationDetails.order,
            });
          });
        }
      } else {
        oldImages.push(req.body.locationOldData);
        oldImages.forEach((locationData, i) => {
          locationImg.push({ img: locationData, order: i + 1 });
        });
        if (locationImages.length > 0) {
          locationImages.forEach((locationDetails) => {
            locationImg.push({
              img: locationDetails.img,
              order: locationDetails.order,
            });
          });
        }
      }
    } else {
      if (locationImages.length > 0) {
        locationImages.sort((a, b) => a.order - b.order);
        locationImages.forEach((locationDetails) => {
          locationImg.push({
            img: locationDetails.img,
            order: locationDetails.order,
          });
        });
      }
    }

    if (locationImg.length > 0) {
      let resOrder = locationImg.map(async (item, i) => {
        orderImages.push(item.img);
      });
      await Promise.all([...resOrder]);
      locationImg = orderImages;
    }

    if (locationImg.length > 0) {
      return res.status(200).json({
        status: true,
        message: "Files saved successfully!",
        data: locationImg,
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "Location images not found!",
        data: [],
      });
    }
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong!" });
  }
};

// create event from admin side
exports.createEvent = async (req, res) => {
  try {
    if (!req.body.title) {
      return res
        .status(200)
        .json({ status: false, message: `Title is required!` });
    }

    // const eventExist = await event.find({
    //   title: req.body.title.trim(),
    //   isDelete: false,
    // });

    if (req.body.airTableEventName && req.body.airTableEventName.trim().length > 0) {
      const eventAirTableExist = await event.aggregate([
        {
          $match: {
            $expr: {
              $eq: [
                {
                  $trim: { input: "$airTableEventName" }
                }, req.body.airTableEventName.trim()
              ]
            }
            ,
            isDelete: false,
          }
        }, {
          $project: {
            _id: 1
          }
        }
      ]);

      if (eventAirTableExist && eventAirTableExist.length > 0) {
        return res.status(200).json({
          status: false,
          message: `Event air table name must be unique.`,
        });
      }
    }

    if (req.body.restrictedAccessGroups) {
      let count = await group.count({
        _id: { $in: req.body.restrictedAccessGroups },
        isDelete: false,
      });
      if (count !== req.body.restrictedAccessGroups.length)
        return res
          .status(200)
          .json({ status: false, message: `Invalid group ids!` });
    }
    if (req.body.restrictedAccessMemberships) {
      let count = await membershipPlan.count({
        _id: { $in: req.body.restrictedAccessMemberships },
        isDelete: false,
      });
      if (count !== req.body.restrictedAccessMemberships.length)
        return res
          .status(200)
          .json({ status: false, message: `Invalid membership ids!` });
    }

    let description = `<div "font-family: 'Muller';">${req.body.longDescription}</div>`;
    let shortDescription = `<div "font-family: 'Muller';">${req.body.shortDescription}</div>`;
    let preDescription = `${req.body.preRegisterDescription}`;

    const year = moment(req.body.startDate, "MM-DD-YYYY").year();

    req.body.location =
      req.body.location !== undefined &&
        req.body?.location !== null &&
        req.body.location !== ""
        ? JSON.parse(req.body.location)
        : null;

    let typeData = {
      typeId: req.body.typeId,
      name: req.body.typeName,
    };

    const newEvent = new event({
      title: req.body.title,
      thumbnail: req.thumbnail,
      shortDescription: shortDescription,
      longDescription: description,
      eventUrl: req.body.eventUrl,
      type: typeData,
      timeZone: req.body.timeZone,
      startDate: req.body.startDate,
      startTime: req.body.startTime,
      endDate: req.body.endDate,
      endTime: req.body.endTime,
      eventAccess: req.body.eventAccess,
      restrictedAccessGroups: req.body.restrictedAccessGroups,
      restrictedAccessMemberships: req.body.restrictedAccessMemberships,
      isPreRegister: req.body.isPreRegister ?? false,
      preRegisterTitle: req.body.preRegisterTitle ?? "",
      preRegisterDescription: preDescription ?? "",
      preRegisterBtnTitle: req.body.preRegisterBtnTitle ?? "",
      preRegisterBtnLink: req.body.preRegisterBtnLink ?? "",
      preRegisterStartDate: req.body.preRegisterStartDate
        ? req.body.preRegisterStartDate.substring(
          0,
          req.body.preRegisterStartDate.indexOf("+")
        ) + ".000Z" ?? null
        : null,
      preRegisterEndDate: req.body.preRegisterEndDate
        ? req.body.preRegisterEndDate.substring(
          0,
          req.body.preRegisterEndDate.indexOf("+")
        ) + ".000Z" ?? null
        : null,
      isLocation:
        req.body.isLocation !== undefined &&
          req.body.isLocation !== null &&
          req.body.isLocation !== ""
          ? req.body.isLocation
          : false,
      location:
        req.body.location !== undefined &&
          req.body.location !== null &&
          req.body.location !== ""
          ? req.body.location
          : null,
      year: year,
      airTableEventName:
        req.body.airTableEventName !== undefined &&
          req.body.airTableEventName !== null
          ? req.body.airTableEventName
          : "",
    });

    const eventData = await newEvent.save();

    if (eventData) {
      return res.status(200).json({
        status: true,
        message: `Event created successfully`,
        data: eventData,
      });
    } else {
      return res.status(200).json({
        status: false,
        message: `Something went wrong while creating event!`,
      });
    }

  } catch (e) {
    console.log(e, "e");
    return res
      .status(500)
      .json({ status: false, message: `Internal server error. ${e}` });
  }
};

// edit event
exports.editEvent = async (req, res) => {
  try {
    const getEvent = await event
      .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
      .lean();

    if (req.body.airTableEventName && req.body.airTableEventName.trim().length > 0) {
      const eventAirTableExist = await event.aggregate([
        {
          $match: {
            _id: { $ne: new ObjectId(req.params.id) },
            $expr: {
              $eq: [
                {
                  $trim: { input: "$airTableEventName" }
                }, req.body.airTableEventName.trim()
              ]
            }
            ,
            isDelete: false,
          }
        }, {
          $project: {
            _id: 1
          }
        }
      ]);


      if (eventAirTableExist && eventAirTableExist.length > 0) {
        return res.status(200).json({
          status: false,
          message: `Event air table name must be unique.`,
        });
      }
    }

    if (getEvent) {
      let description = `<div "font-family: 'Muller';">${req.body.longDescription}</div>`;
      let shortDescription = `<div "font-family: 'Muller';">${req.body.shortDescription}</div>`;
      let preDescription = `${req.body.preRegisterDescription}`;

      req.body.location =
        req.body.location !== undefined &&
          req.body?.location !== null &&
          req.body.location !== ""
          ? JSON.parse(req.body.location)
          : null;

      const year = moment(req.body.startDate, "MM-DD-YYYY").year();

      let typeData = {
        typeId: req.body.typeId ?? getEvent.type.typeId,
        name: req.body.typeName ?? getEvent.type.name,
      };

      const eventData = await event.findByIdAndUpdate(
        req.params.id,
        {
          title: req.body.title ?? getEvent.title,
          thumbnail: req.thumbnail ?? getEvent.thumbnail,
          shortDescription: shortDescription ?? getEvent.shortDescription,
          longDescription: description ?? getEvent.longDescription,
          eventUrl: req.body.eventUrl ?? getEvent.eventUrl,
          type: typeData,
          timeZone: req.body.timeZone ?? getEvent.timeZone,
          startDate: req.body.startDate ?? getEvent.startDate,
          startTime: req.body.startTime ?? getEvent.startTime,
          endDate: req.body.endDate ?? getEvent.endDate,
          endTime: req.body.endTime ?? getEvent.endTime,
          eventAccess: req.body.eventAccess ?? getEvent.eventAccess,
          restrictedAccessGroups:
            req.body.restrictedAccessGroups ??
            getEvent.restrictedAccessGroups,
          restrictedAccessMemberships:
            req.body.restrictedAccessMemberships ??
            getEvent.restrictedAccessMemberships,
          isPreRegister: req.body.isPreRegister ?? getEvent.isPreRegister,
          preRegisterTitle:
            req.body.preRegisterTitle ?? getEvent.preRegisterTitle,
          preRegisterDescription:
            preDescription ?? getEvent.preRegisterDescription,
          preRegisterBtnTitle:
            req.body.preRegisterBtnTitle ?? getEvent.preRegisterBtnTitle,
          preRegisterBtnLink:
            req.body.preRegisterBtnLink ?? getEvent.preRegisterBtnLink,
          preRegisterStartDate: req.body.preRegisterStartDate
            ? req.body.preRegisterStartDate.substring(
              0,
              req.body.preRegisterStartDate.indexOf("+")
            ) + ".000Z" ?? getEvent.preRegisterStartDate
            : getEvent.preRegisterStartDate,
          preRegisterEndDate: req.body.preRegisterEndDate
            ? req.body.preRegisterEndDate.substring(
              0,
              req.body.preRegisterEndDate.indexOf("+")
            ) + ".000Z" ?? getEvent.preRegisterEndDate
            : getEvent.preRegisterEndDate,
          isLocation:
            req.body.isLocation !== undefined &&
              req.body?.isLocation !== null &&
              req.body.isLocation !== ""
              ? req.body.isLocation
              : getEvent.isLocation === undefined
                ? false
                : getEvent.isLocation,
          location:
            req.body.location !== undefined &&
              req.body?.location !== null &&
              req.body.location !== ""
              ? req.body.location
              : getEvent.location === undefined
                ? null
                : getEvent.location,
          year:
            year !== undefined && year !== null && year !== ""
              ? year
              : getEvent.year
                ? ""
                : getEvent.year,
          airTableEventName:
            req.body.airTableEventName !== undefined &&
              req.body.airTableEventName !== null
              ? req.body.airTableEventName
              : getEvent.airTableEventName === ""
                ? ""
                : getEvent.airTableEventName,
        },
        { new: true }
      );

      if (eventData)
        return res.status(200).json({
          status: true,
          message: "Event updated successfully!",
          data: eventData,
        });
      else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while updating event!",
        });

    } else {
      return res
        .status(200)
        .json({ status: false, message: "Event not found!" });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// delete event
exports.deleteEvent = async (req, res) => {
  try {
    const getEvent = await event
      .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
      .lean();
    if (getEvent) {
      const eventData = await event.findByIdAndUpdate(
        req.params.id,
        { isDelete: true },
        { new: true }
      );
      if (eventData)
        return res.status(200).json({
          status: true,
          message: "Event deleted successfully!",
          data: eventData,
        });
      else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while deleteing event!",
        });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Event not found!" });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: e });
  }
};

// add or update contact support details in event
exports.editContactSupportInEvent = async (req, res) => {
  try {
    const body = req.body;
    const getContactData = await event
      .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
      .lean();
    if (getContactData) {
      let contactSupport = {
        email: body.email ?? getContactData.email,
        phone: body.phone ?? getContactData.phone,
        localPhone: body.localPhone ?? getContactData.localPhone,
      };

      const contactData = await event.findByIdAndUpdate(
        req.params.id,
        {
          contactSupport: contactSupport,
        },
        { new: true }
      );

      if (contactData)
        return res.status(200).json({
          status: true,
          message: "Contact support data updated successfully!",
          data: contactData,
        });
      else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while updating contact data!",
        });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Contact not found!" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get all event
exports.getAllEvent = async (req, res) => {
  try {
    var filter = req.query.filter;

    var match = {
      isDelete: false,
    };

    var search = "";
    if (req.query.search) {
      search = req.query.search;
      match = {
        ...match,
        title: { $regex: ".*" + search + ".*", $options: "i" },
      };
    }

    var toDayDate = new Date();
    // Format today's date as "mm-dd-yyyy" string
    const mm = String(toDayDate.getMonth() + 1).padStart(2, "0");
    const dd = String(toDayDate.getDate()).padStart(2, "0");
    const yyyy = toDayDate.getFullYear();
    const formattedToday = `${mm}-${dd}-${yyyy}`;
    if (filter === "Past Event") {
      match = {
        ...match,
        startDate: { $lt: formattedToday },
      };
    }
    if (filter === "Upcoming Event") {
      match = {
        ...match,
        startDate: { $gte: formattedToday },
      };
    }
    const allEventData = await event
      .find(match, {
        _id: 1,
        endDate: 1,
        endTime: 1,
        createdAt: 1,
        eventUrl: 1,
        title: 1,
        startTime: 1,
        startDate: 1,
        eventAccess: 1,
        eventStatus: {
          $cond: {
            if: { $gte: ["$startDate", formattedToday] },
            then: "On sale",
            else: "Event ended",
          },
        },
      })
      .sort({ createdAt: -1 });

    if (allEventData)
      return res.status(200).json({
        status: true,
        message: "All event retrive!",
        data: allEventData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting event!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: e });
  }
};

// get all event with  limited fields
exports.getAllEventsLimitedFiedls = async (req, res) => {
  try {
    const allEventData = await event
      .find({ isDelete: false })
      .sort({ createdAt: -1 })
      .select("title thumbnail shortDescription");
    if (allEventData)
      return res.status(200).json({
        status: true,
        message: "All event retrive!",
        data: allEventData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting event!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: e });
  }
};

// get event by id
exports.getEventDetail = async (req, res) => {
  try {
    const eventData = await event.findOne({
      _id: new ObjectId(req.params.id),
      isDelete: false,
    });
    if (eventData)
      return res.status(200).json({
        status: true,
        message: "Event detail retrive!",
        data: eventData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting event!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: e });
  }
};

// clone event API
exports.cloneEvent = async (req, res) => {
  try {
      const { eventId } = req.body;
      if (eventId !== undefined && eventId !== null && eventId !== "") {

          const objData = await event.findOne({
              _id: ObjectId(eventId),
              isDelete: false,
          }).select("-_id -__v -updatedAt -createdAt");

          if (!objData) {
              return res.status(200).json({ status: false, message: "Event data not Found!" });
          }

          let obj = objData.toObject();
          
          if (objData.thumbnail) {
              const split = objData.thumbnail.replace(/\s/g, "_").split("-");
              const params1 = {
                  Bucket: process.env.AWS_BUCKET,
                  CopySource: objData.thumbnail,
                  Key: "uploads/eventthumbnail/copy-" + Date.now() + "-" + split[split.length - 1],
                  ACL: "public-read",
              };
              console.log(params1,'dfdf')
              await s3.copyObject(params1).promise();
              obj.thumbnail = process.env.AWS_IMG_VID_PATH + params1.Key;
          }
          obj.title = "Copy - " + objData.title
          obj.airTableEventName= objData.airTableEventName !== undefined && objData.airTableEventName !== null && objData.airTableEventName.length> 0 ? "Copy - " + objData.airTableEventName : ""
          
          let destlocationImages = []

          if (obj.isLocation)
          {


            if (objData.location && objData.location.locationImages && objData.location.locationImages.length > 0)
            {

              var multi_files_promise = [];
              const orderedImages = objData.location.locationImages.sort((a, b) => a.order - b.order) 
              multi_files_promise = orderedImages.map(async (locImg, i) => {
                var random_id = uuidv4()
                const split = locImg.replace("event-location","eventlocation").split("-");
                const locParams = {
                  Bucket: process.env.AWS_BUCKET,
                  CopySource: locImg,
                  Key: "uploads/event-location/copy-" + random_id + "_"  + Date.now() + "-" + split[split.length - 1],
                  ACL: "public-read",
                };

                await s3.copyObject(locParams).promise();
                destlocationImages.push(process.env.AWS_IMG_VID_PATH + locParams.Key);
  
              }) 
              await Promise.all([...multi_files_promise]);
              
            }
            obj.location = {
              address : objData.location.address,
              latitude : objData.location.latitude,
              longitude : objData.location.longitude,
              postalCode : objData.location.postalCode,
              city : objData.location.city,
              country : objData.location.country,
              placeId : objData.location.placeId,
              locationImages : destlocationImages,
            }
          }

          if (!obj.isPreRegister)
          {
            obj.preRegisterTitle= ""
            obj.preRegisterDescription= ""
            obj.preRegisterBtnTitle= ""
            obj.preRegisterBtnLink= ""
            obj.preRegisterStartDate= null
            obj.preRegisterEndDate= null
          }

                      
          let destPhotos = []  
          if (objData.photos && objData.photos.length > 0)
          {

            var multi_photoes_promise = [];
            multi_photoes_promise = objData.photos.map(async (singlePhoto, i) => {
              var random_id = uuidv4()
              const split = singlePhoto.replace("event-media","event-media").split("-");
              const evntPhoto = {
                Bucket: process.env.AWS_BUCKET,
                CopySource: singlePhoto,
                Key: "uploads/event-media/copy-" + random_id + "_"  + Date.now() + "-" + split[split.length - 1],
                ACL: "public-read",
              };

              await s3.copyObject(evntPhoto).promise();
              destPhotos.push(process.env.AWS_IMG_VID_PATH + evntPhoto.Key);

            }) 
            await Promise.all([...multi_photoes_promise]);
            
          }
          obj.photos =  destPhotos
            
          const eventClone = new event(obj);
          const newEvent = await eventClone.save();
          if (newEvent)
          {
            const cloneEventId = newEvent._id
            
            //cloning location data 
            const objEventLocations = await eventLocation.find({event: ObjectId(eventId)})
            if (objEventLocations.length > 0)
            {
              const resultEventLocs = objEventLocations.map(async (eventLoc)=>{
                
                  let eventLocObj = eventLoc.toObject()
                  eventLocObj.event = cloneEventId
                  delete eventLocObj._id;
                  const newEventLoc = new eventLocation(eventLocObj)
                  const updatedEventLoc = await newEventLoc.save() 
              })
              await Promise.all([...resultEventLocs]);
            }

            //cloning package data
            const objEventPackages = await eventPackage.find({event: ObjectId(eventId)})
            if (objEventPackages.length > 0)
            {
              const resultEventPackages = objEventPackages.map(async (eventPkg)=>{
                
                  let eventPkgObj = eventPkg.toObject()
                  eventPkgObj.event = cloneEventId
                  delete eventPkgObj._id;
                  const newEventPkg = new eventPackage(eventPkgObj)
                  const updatedEventPkg = await newEventPkg.save() 
              })
              await Promise.all([...resultEventPackages]);
            }

            //cloning room data
            const objEventRooms = await eventRoom.find({event: ObjectId(eventId)})
            if (objEventRooms.length > 0)
            {
              const resultEventRooms = objEventRooms.map(async (evtRoom)=>{
                
                  let eventRoomObj = evtRoom.toObject()
                  eventRoomObj.event = cloneEventId
                  delete eventRoomObj._id;
                  const newEventRoom = new eventRoom(eventRoomObj)
                  const updatedEventRoom = await newEventRoom.save() 
              })
              await Promise.all([...resultEventRooms]);
            }

             //cloning session data
             const objEventSession = await eventSession.find({event: ObjectId(eventId)})
             if (objEventSession.length > 0)
             {
               const resultEventSession = objEventSession.map(async (evtSession)=>{
                 
                   let evtSessionObj = evtSession.toObject()
                   evtSessionObj.event = cloneEventId
                   delete evtSessionObj._id;
                   const newEventSession = new eventSession(evtSessionObj)
                   const updatedEventSession = await newEventSession.save() 
               })
               await Promise.all([...resultEventSession]);
             }

             
             //cloning activity data
             const objEventActivity = await eventActivity.find({event: ObjectId(eventId)})
             if (objEventActivity.length > 0)
             {
               const resultEventActivity = objEventActivity.map(async (evtActivity)=>{
                 
                   let evtActivityObj = evtActivity.toObject()
                   evtActivityObj.event = cloneEventId
                   delete evtActivityObj._id;
                   const newEventActivity = new eventActivity(evtActivityObj)
                   const updatedEventActivity = await newEventActivity.save() 
               })
               await Promise.all([...resultEventActivity]);
             }

              //cloning event faqs
              const objEventFaq = await eventFaqs.find({event: ObjectId(eventId)})
              if (objEventFaq.length > 0)
              {
                const resultEventFaq = objEventFaq.map(async (evtFaq)=>{
                  
                    let evtFaqObj = evtFaq.toObject()
                    evtFaqObj.event = cloneEventId
                    delete evtFaqObj._id;
                    const newEvtFaq = new eventFaqs(evtFaqObj)
                    const updatedEventFaq = await newEvtFaq.save() 
                })
                await Promise.all([...resultEventFaq]);
              }

      
            return res.status(200).json({ status: true, message: "Cloning completed successfully!", data: newEvent, });
          }else
          {
            return res.status(200).json({ status: true, message: "Error in while creating cloning event!", data: newEvent, });
          }
          
      } else {
          return res.status(200).json({ status: false, message: "Partner data not found!", data: [], });
      }

  } catch (error) {
      console.log(error, "error")
      return res.status(200).json({ status: false, message: "Internal server error!", error: error });
  }
};

/** CURD opreation of event end **/

// upload event gallery
exports.saveEventPhotos = async (req, res) => {
  try {
    const { photos } = req;
    let eventId = new ObjectId(req.params.id);
    const getEvent = await event
      .findOne({ _id: eventId, isDelete: false })
      .lean();
    if (getEvent) {
      let multiPhotos = photos?.map(async (photo) => {
        await event.findOneAndUpdate(
          { _id: eventId, isDelete: false },
          {
            $push: { photos: photo },
          },
          { new: true }
        );
      });
      await Promise.all([...multiPhotos]);
      const eventData = await event
        .findOne({ _id: eventId, isDelete: false })
        .lean();
      if (eventData) {
        return res.status(200).json({
          status: true,
          message: "Event Gallery updated successfully.",
          data: eventData,
        });
      } else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while adding more photos!",
        });
    } else
      return res
        .status(200)
        .json({ status: false, message: "Event not found!" });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(200)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get event gallery for admin
exports.getEventGallery = async (req, res) => {
  try {
    const eventData = await event
      .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
      .select("photos title");
    if (eventData)
      return res.status(200).json({
        status: true,
        message: "Event photos retrive!",
        data: eventData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting event photos!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: e });
  }
};

// delete event gallery for user
exports.deleteEventPhotos = async (req, res) => {
  try {
    const { photos, id } = req.body;
    const eventId = new ObjectId(id);
    const getEvent = await event
      .findOne({ _id: eventId, isDelete: false })
      .lean();
    if (getEvent.photos) {
      let multiPhotos = photos?.map(async (photo) => {
        await event.findOneAndUpdate(
          { _id: eventId, isDelete: false },
          {
            $pull: { photos: photo },
          },
          { new: true }
        );
      });
      await Promise.all([...multiPhotos]);

      let delete_gallery = photos?.map(async (photo) => {
        let splitUrl = photo.split("com/");
        await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: splitUrl[1],
          })
          .promise();
      });
      await Promise.all([...delete_gallery]);
      const eventData = await event
        .findOne({ _id: eventId, isDelete: false })
        .select("photos title");
      if (eventData) {
        return res.status(200).json({
          status: true,
          message: "Photo deleted successfully.",
          data: eventData,
        });
      } else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while deleteding photo!",
        });
    } else
      return res
        .status(200)
        .json({ status: false, message: "Event not found!" });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(200)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// export event attendees data
exports.exportAttendees = async (req, res) => {
  try {
    const data = await eventAttendees
      .find({ isDelete: false })
      .select(
        "title name email company phone facebook linkedin type auth0Id profession evntData"
      )
      .sort({ createdAt: -1 });
    if (data)
      return res.status(200).json({
        status: true,
        message: "All Attendees list retrive!",
        data: data,
      });
    else
      return res
        .status(200)
        .json({ status: true, message: "No attendees data found!", data: [] });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// import event attendees data
exports.importAttendees = async (req, res) => {
  try {
    const body = req.body;
    const allAttendees = body.allAttendees;
    const io = req.app.get("socketio");
    let alreadyEmail = [];
    let arrayIndex = 0;
    let dataExists = null,
      dataExists2 = null;
    var partnerCount = await User.countDocuments({
      "attendeeDetail.evntData": {
        $elemMatch: { event: req.body.eventId, partner: true },
      },
    });

    for (let index = 0; index < allAttendees.length; index++) {
      if (
        alreadyEmail.filter((attendee) => {
          if (
            attendee.email.toLowerCase() ===
            allAttendees[index].email.toLowerCase()
          )
            return attendee;
        }).length > 0
      ) {
        let existIndex = alreadyEmail.findIndex((attendee) => {
          if (attendee.email === allAttendees[index].email) return attendee;
        });
        alreadyEmail[existIndex] = {
          ...alreadyEmail[existIndex],
          role: [
            ...alreadyEmail[existIndex].role,
            allAttendees[index].type.toLowerCase(),
          ],
        };
      } else {
        alreadyEmail[arrayIndex] = {
          ...allAttendees[index],
          role: [allAttendees[index].type.toLowerCase()],
        };
        arrayIndex++;
      }
    }

    for (let index = 0; index < alreadyEmail.length; index++) {
      var eventDetails = {
        event: alreadyEmail[index].eventId,
      };

      for (let index2 = 0; index2 < alreadyEmail[index].role.length; index2++) {
        if (alreadyEmail[index].role[index2] === "partner")
          eventDetails = {
            ...eventDetails,
            [alreadyEmail[index].role[index2]]: true,
            partnerOrder: ++partnerCount,
          };
        else
          eventDetails = {
            ...eventDetails,
            [alreadyEmail[index].role[index2]]: true,
          };
      }
      alreadyEmail[index] = {
        ...alreadyEmail[index],
        eventDetails: eventDetails,
      };
    }

    const attendeeFunction = async (attendee, i, eventDetails) => {
      if (attendee.email !== undefined) {
        dataExists = await User.findOne({
          "Preferred Email": attendee.email.toLowerCase(),
        }).lean();
      } else {
        dataExists = null;
      }

      if (attendee.auth0Id !== undefined) {
        dataExists2 = await User.findOne({
          $exists: { auth0Id: true },
          auth0Id: attendee.auth0Id,
        }).lean();
      } else {
        dataExists2 = null;
      }

      if (dataExists === null && dataExists2 === null) {
        const attendeeData = new User({
          "Preferred Email": attendee.email.toLowerCase(),
          email: attendee.email.toLowerCase(),
          passcode: attendee.passcode,
          isDelete: false,
          attendeeDetail: {
            title: attendee.title,
            name: attendee.name,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            email: attendee.email.toLowerCase(),
            company: attendee.company,
            profession: attendee.profession,
            phone: attendee.phone,
            facebook: attendee.facebook,
            linkedin: attendee.linkedin,
            auth0Id: attendee.auth0Id,
            evntData: eventDetails,
          },
        });
        const member = await attendeeData.save();
        const newChatChannelData = await chatChannel.find({
          eventId: ObjectId(attendee.eventId),
          $or: [
            { restrictedAccess: { $in: attendee.role } },
            { accessPermission: "public" },
            { accessPermission: "admin" },
          ],
          isDelete: false,
        });

        if (newChatChannelData.length > 0) {
          const newMembers = newChatChannelData?.map(async (newChannel) => {
            if (
              newChannel.accessPermission !== "admin" ||
              (newChannel.accessPermission === "admin" &&
                member.migrate_user &&
                member.migrate_user.plan_id === "Staff")
            ) {
              const checkChannelMemberExists = await chatChannelMembers.find({
                userId: member._id,
                channelId: newChannel._id,
                status: 2,
              });

              if (checkChannelMemberExists.length === 0) {
                const channelMember = new chatChannelMembers({
                  userId: member._id,
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
                    return { id: ids.userId._id, readmsg: false };
                  })
                  : [];
                channelMembersChat = [
                  ...channelMembersChat.filter((ids) => {
                    if (ids.id.toString() !== member._id.toString()) return ids;
                  }),
                  { id: member._id, readmsg: false },
                ];
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
                    userId: [member._id],
                  },
                  userTimeStamp: moment
                    .utc()
                    .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                });
                const chatData = await saveChatData(channelMessage, newChannel);
                if (chatData) {
                  const userData = await User.findById(member._id);
                  if (
                    userData &&
                    userData.deleted_group_of_user &&
                    userData.deleted_group_of_user.includes(newChannel._id)
                  ) {
                    await User.findByIdAndUpdate(
                      member._id,
                      {
                        $pull: { deleted_group_of_user: newChannel._id },
                      },
                      { new: true }
                    );
                  }
                }
                let allMembersIdsSocket = channelMembersChat?.map((member) => {
                  return member.id;
                });
                await emitSocketChannelActivityEvent(
                  io,
                  allMembersIdsSocket,
                  chatData
                );
              }
            } else {
              return {};
            }
          });
          await Promise.all([...newMembers]);
          return member;
        } else {
          return member;
        }
      } else {
        if (dataExists2 !== null) {
          
          let menberData = await User.findOne({
            auth0Id: attendee.auth0Id,
            "attendeeDetail.evntData": {
              $elemMatch: { event: ObjectId(attendee.eventId) },
            },
          });

          if (menberData === null) {
            let memberEventDetails = dataExists2.attendeeDetail
              ? [...dataExists2.attendeeDetail.evntData, eventDetails]
              : [eventDetails];

            const userUpdatedData = await User.findOneAndUpdate(
              { auth0Id: attendee.auth0Id },
              {
                passcode: attendee.passcode,
                isDelete: false,
                attendeeDetail: {
                  title: attendee.title,
                  email: attendee.email.toLowerCase(),
                  name: attendee.name,
                  firstName: attendee.firstName,
                  lastName: attendee.lastName,
                  company: attendee.company,
                  profession: attendee.profession,
                  phone: attendee.phone,
                  facebook: attendee.facebook,
                  linkedin: attendee.linkedin,
                  auth0Id: attendee.auth0Id,
                  evntData: memberEventDetails,
                },
              },
              { new: true }
            );
            const newChatChannelData = await chatChannel.find({
              eventId: ObjectId(attendee.eventId),
              $or: [
                { restrictedAccess: { $in: attendee.role } },
                { accessPermission: "public" },
                { accessPermission: "admin" },
              ],
              isDelete: false,
            });

            if (newChatChannelData.length > 0) {
              const newMembers = newChatChannelData?.map(async (newChannel) => {
                if (
                  newChannel.accessPermission !== "admin" ||
                  (newChannel.accessPermission === "admin" &&
                    userUpdatedData.migrate_user &&
                    userUpdatedData.migrate_user.plan_id === "Staff")
                ) {
                  const checkChannelMemberExists =
                    await chatChannelMembers.find({
                      userId: userUpdatedData._id,
                      channelId: newChannel._id,
                      status: 2,
                    });
                  if (checkChannelMemberExists.length === 0) {
                    const channelMember = new chatChannelMembers({
                      userId: userUpdatedData._id,
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
                        return { id: ids.userId._id, readmsg: false };
                      })
                      : [];
                    channelMembersChat = [
                      ...channelMembersChat.filter((ids) => {
                        if (
                          ids.id.toString() !== userUpdatedData._id.toString()
                        )
                          return ids;
                      }),
                      { id: userUpdatedData._id, readmsg: false },
                    ];
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
                        userId: [userUpdatedData._id],
                      },
                      userTimeStamp: moment
                        .utc()
                        .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                    });
                    const chatData = await saveChatData(
                      channelMessage,
                      newChannel
                    );
                    if (chatData) {
                      const userData = await User.findById(userUpdatedData._id);
                      if (
                        userData &&
                        userData.deleted_group_of_user &&
                        userData.deleted_group_of_user.includes(newChannel._id)
                      ) {
                        await User.findByIdAndUpdate(
                          userUpdatedData._id,
                          {
                            $pull: { deleted_group_of_user: newChannel._id },
                          },
                          { new: true }
                        );
                      }
                    }
                    let allMembersIdsSocket = channelMembersChat?.map(
                      (member) => {
                        return member.id;
                      }
                    );
                    await emitSocketChannelActivityEvent(
                      io,
                      allMembersIdsSocket,
                      chatData
                    );
                  }
                } else {
                  return {};
                }
              });
              await Promise.all([...newMembers]);
              return userUpdatedData;
            } else {
              return userUpdatedData;
            }
          } else {
            
            if (dataExists2.attendeeDetail) {
            
              let memberEventDetails = null;
              let userUpdatedData = null;
              if (dataExists2.attendeeDetail !== null) {
                const eventDataDetail =
                  dataExists2.attendeeDetail.evntData.filter((evnt) => {
                    if (evnt.event.toString() === attendee.eventId) return evnt;
                  })[0];
                memberEventDetails = [
                  ...dataExists2.attendeeDetail.evntData.filter((evnt) => {
                    if (evnt.event.toString() !== attendee.eventId) return evnt;
                  }),
                  { ...eventDataDetail, ...eventDetails },
                ];

                userUpdatedData = await User.findOneAndUpdate(
                  {
                    _id: dataExists2._id,
                    "attendeeDetail.evntData": {
                      $elemMatch: { event: ObjectId(attendee.eventId) },
                    },
                  },
                  {
                    $set: {
                      "attendeeDetail.evntData": memberEventDetails,
                    },
                  },
                  { new: true }
                );
              } else {
                memberEventDetails = eventDetails;
                userUpdatedData = await User.findOneAndUpdate(
                  { _id: dataExists2._id },
                  {
                    passcode: attendee.passcode,
                    isDelete: false,
                    attendeeDetail: {
                      title: attendee.title,
                      email: attendee.email.toLowerCase(),
                      name: attendee.name,
                      firstName: attendee.firstName,
                      lastName: attendee.lastName,
                      company: attendee.company,
                      profession: attendee.profession,
                      phone: attendee.phone,
                      facebook: attendee.facebook,
                      linkedin: attendee.linkedin,
                      auth0Id: attendee.auth0Id,
                      evntData: memberEventDetails,
                    },
                  },
                  { new: true }
                );
              }

              const newChatChannelData = await chatChannel.find({
                eventId: ObjectId(attendee.eventId),
                $or: [
                  { restrictedAccess: { $in: attendee.role } },
                  { accessPermission: "public" },
                  { accessPermission: "admin" },
                ],
                isDelete: false,
              });

              if (newChatChannelData.length > 0) {
                const newMembers = newChatChannelData?.map(
                  async (newChannel) => {
                    if (
                      newChannel.accessPermission !== "admin" ||
                      (newChannel.accessPermission === "admin" &&
                        userUpdatedData.migrate_user &&
                        userUpdatedData.migrate_user.plan_id === "Staff")
                    ) {
                      const checkChannelMemberExists =
                        await chatChannelMembers.find({
                          userId: userUpdatedData._id,
                          channelId: newChannel._id,
                          status: 2,
                        });
                      if (checkChannelMemberExists.length === 0) {
                        const channelMember = new chatChannelMembers({
                          userId: userUpdatedData._id,
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
                        const getAllChannelMembers =
                          await chatChannelMembers.find({
                            channelId: newChannel._id,
                            status: 2,
                            user_type: "airtable-syncs",
                          });
                        var channelMembersChat = getAllChannelMembers
                          ? getAllChannelMembers.map((ids) => {
                            return { id: ids.userId._id, readmsg: false };
                          })
                          : [];
                        channelMembersChat = [
                          ...channelMembersChat.filter((ids) => {
                            if (
                              ids.id.toString() !==
                              userUpdatedData._id.toString()
                            )
                              return ids;
                          }),
                          { id: userUpdatedData._id, readmsg: false },
                        ];
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
                            userId: [userUpdatedData._id],
                          },
                          userTimeStamp: moment
                            .utc()
                            .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                        });
                        const chatData = await saveChatData(
                          channelMessage,
                          newChannel
                        );
                        if (chatData) {
                          const userData = await User.findById(
                            userUpdatedData._id
                          );
                          if (
                            userData &&
                            userData.deleted_group_of_user &&
                            userData.deleted_group_of_user.includes(
                              newChannel._id
                            )
                          ) {
                            await User.findByIdAndUpdate(
                              userUpdatedData._id,
                              {
                                $pull: {
                                  deleted_group_of_user: newChannel._id,
                                },
                              },
                              { new: true }
                            );
                          }
                        }
                        let allMembersIdsSocket = channelMembersChat?.map(
                          (member) => {
                            return member.id;
                          }
                        );
                        await emitSocketChannelActivityEvent(
                          io,
                          allMembersIdsSocket,
                          chatData
                        );
                      }
                    } else {
                      return {};
                    }
                  }
                );
                await Promise.all([...newMembers]);
                return userUpdatedData;
              } else {
                return userUpdatedData;
              }
            } else {
              return {};
            }
          }
        } else {
          let menberData = await User.findOne({
            "Preferred Email": attendee.email,
            "attendeeDetail.evntData": {
              $elemMatch: { event: ObjectId(attendee.eventId) },
            },
          });
          if (menberData === null) {
            let memberEventDetails =
              dataExists && dataExists.attendeeDetail
                ? [...dataExists.attendeeDetail.evntData, eventDetails]
                : [eventDetails];

            const userUpdatedData = await User.findOneAndUpdate(
              { "Preferred Email": attendee.email },
              {
                passcode: attendee.passcode,
                isDelete: false,
                attendeeDetail: {
                  title: attendee.title,
                  email: attendee.email.toLowerCase(),
                  name: attendee.name,
                  firstName: attendee.firstName,
                  lastName: attendee.lastName,
                  company: attendee.company,
                  profession: attendee.profession,
                  phone: attendee.phone,
                  facebook: attendee.facebook,
                  linkedin: attendee.linkedin,
                  auth0Id: attendee.auth0Id,
                  evntData: memberEventDetails,
                },
              },
              { new: true }
            );
            const newChatChannelData = await chatChannel.find({
              eventId: ObjectId(attendee.eventId),
              $or: [
                { restrictedAccess: { $in: attendee.role } },
                { accessPermission: "public" },
                { accessPermission: "admin" },
              ],
              isDelete: false,
            });

            if (newChatChannelData.length > 0) {
              const newMembers = newChatChannelData?.map(async (newChannel) => {
                if (
                  newChannel.accessPermission !== "admin" ||
                  (newChannel.accessPermission === "admin" &&
                    userUpdatedData.migrate_user &&
                    userUpdatedData.migrate_user.plan_id === "Staff")
                ) {
                  const checkChannelMemberExists =
                    await chatChannelMembers.find({
                      userId: userUpdatedData._id,
                      channelId: newChannel._id,
                      status: 2,
                    });
                  if (checkChannelMemberExists.length === 0) {
                    const channelMember = new chatChannelMembers({
                      userId: userUpdatedData._id,
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
                        return { id: ids.userId._id, readmsg: false };
                      })
                      : [];
                    channelMembersChat = [
                      ...channelMembersChat.filter((ids) => {
                        if (
                          ids.id.toString() !== userUpdatedData._id.toString()
                        )
                          return ids;
                      }),
                      { id: userUpdatedData._id, readmsg: false },
                    ];
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
                        userId: [userUpdatedData._id],
                      },
                      userTimeStamp: moment
                        .utc()
                        .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                    });
                    const chatData = await saveChatData(
                      channelMessage,
                      newChannel
                    );
                    if (chatData) {
                      const userData = await User.findById(userUpdatedData._id);
                      if (
                        userData &&
                        userData.deleted_group_of_user &&
                        userData.deleted_group_of_user.includes(newChannel._id)
                      ) {
                        await User.findByIdAndUpdate(
                          userUpdatedData._id,
                          {
                            $pull: { deleted_group_of_user: newChannel._id },
                          },
                          { new: true }
                        );
                      }
                    }
                    let allMembersIdsSocket = channelMembersChat?.map(
                      (member) => {
                        return member.id;
                      }
                    );
                    await emitSocketChannelActivityEvent(
                      io,
                      allMembersIdsSocket,
                      chatData
                    );
                  }
                }
              });
              await Promise.all([...newMembers]);
              return userUpdatedData;
            } else {
              return userUpdatedData;
            }
          } else {
            if (dataExists.attendeeDetail) {
              
              let memberEventDetails = null;
              let userUpdatedData = null;
              if (dataExists.attendeeDetail !== null) {
                const eventDataDetail =
                  dataExists.attendeeDetail.evntData.filter((evnt) => {
                    if (evnt.event.toString() === attendee.eventId) return evnt;
                  })[0];
                memberEventDetails = [
                  ...dataExists.attendeeDetail.evntData.filter((evnt) => {
                    if (evnt.event.toString() !== attendee.eventId) return evnt;
                  }),
                  { ...eventDataDetail, ...eventDetails },
                ];

                userUpdatedData = await User.findOneAndUpdate(
                  {
                    _id: ObjectId(dataExists._id),
                    "attendeeDetail.evntData": {
                      $elemMatch: { event: ObjectId(attendee.eventId) },
                    },
                  },
                  {
                    $set: {
                      "attendeeDetail.evntData": memberEventDetails,
                    },
                  },
                  { new: true }
                );
              } else {
                memberEventDetails = eventDetails;
                userUpdatedData = await User.findOneAndUpdate(
                  { _id: ObjectId(dataExists._id) },
                  {
                    passcode: attendee.passcode,
                    isDelete: false,
                    attendeeDetail: {
                      title: attendee.title,
                      email: attendee.email.toLowerCase(),
                      name: attendee.name,
                      firstName: attendee.firstName,
                      lastName: attendee.lastName,
                      company: attendee.company,
                      profession: attendee.profession,
                      phone: attendee.phone,
                      facebook: attendee.facebook,
                      linkedin: attendee.linkedin,
                      auth0Id: attendee.auth0Id,
                      evntData: memberEventDetails,
                    },
                  },
                  { new: true }
                );
              }

              const newChatChannelData = await chatChannel.find({
                eventId: ObjectId(attendee.eventId),
                $or: [
                  { restrictedAccess: { $in: attendee.role } },
                  { accessPermission: "public" },
                  { accessPermission: "admin" },
                ],
                isDelete: false,
              });

              if (newChatChannelData.length > 0) {
                const newMembers = newChatChannelData?.map(
                  async (newChannel) => {
                    if (
                      newChannel.accessPermission !== "admin" ||
                      (newChannel.accessPermission === "admin" &&
                        userUpdatedData.migrate_user &&
                        userUpdatedData.migrate_user.plan_id === "Staff")
                    ) {
                      const checkChannelMemberExists =
                        await chatChannelMembers.find({
                          userId: userUpdatedData._id,
                          channelId: newChannel._id,
                          status: 2,
                        });
                      if (checkChannelMemberExists.length === 0) {
                        const channelMember = new chatChannelMembers({
                          userId: userUpdatedData._id,
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
                        const getAllChannelMembers =
                          await chatChannelMembers.find({
                            channelId: newChannel._id,
                            status: 2,
                            user_type: "airtable-syncs",
                          });
                        var channelMembersChat = getAllChannelMembers
                          ? getAllChannelMembers.map((ids) => {
                            return { id: ids.userId._id, readmsg: false };
                          })
                          : [];
                        channelMembersChat = [
                          ...channelMembersChat.filter((ids) => {
                            if (
                              ids.id.toString() !==
                              userUpdatedData._id.toString()
                            )
                              return ids;
                          }),
                          { id: userUpdatedData._id, readmsg: false },
                        ];
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
                            userId: [userUpdatedData._id],
                          },
                          userTimeStamp: moment
                            .utc()
                            .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                        });
                        const chatData = await saveChatData(
                          channelMessage,
                          newChannel
                        );
                        if (chatData) {
                          const userData = await User.findById(
                            userUpdatedData._id
                          );
                          if (
                            userData &&
                            userData.deleted_group_of_user &&
                            userData.deleted_group_of_user.includes(
                              newChannel._id
                            )
                          ) {
                            await User.findByIdAndUpdate(
                              userUpdatedData._id,
                              {
                                $pull: {
                                  deleted_group_of_user: newChannel._id,
                                },
                              },
                              { new: true }
                            );
                          }
                        }
                        let allMembersIdsSocket = channelMembersChat?.map(
                          (member) => {
                            return member.id;
                          }
                        );
                        await emitSocketChannelActivityEvent(
                          io,
                          allMembersIdsSocket,
                          chatData
                        );
                      }
                    } else {
                      return {};
                    }
                  }
                );
                await Promise.all([...newMembers]);
                return userUpdatedData;
              } else {
                return userUpdatedData;
              }
            } else {
              return {};
            }
          }
        }
      }
    };

    const attendeesDataResult = alreadyEmail.map(async function (attendee, i) {
      const filterAttendee = await attendeeFunction(
        alreadyEmail[i],
        i,
        alreadyEmail[i].eventDetails
      );
      return filterAttendee;
    });

    await Promise.all([...attendeesDataResult]);
    if (attendeesDataResult) {
      return res
        .status(200)
        .json({ status: true, message: "Attendees imported successfully." });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// import event attendees data
exports.importAttendeesIMP = async (req, res) => {
  try {
    const body = req.body;
    const allAttendees = body.allAttendees;
    const io = req.app.get("socketio");
    let alreadyEmail = [];
    let arrayIndex = 0;
    var partnerCount = await User.countDocuments({
      "attendeeDetail.evntData": {
        $elemMatch: { event: req.body.eventId, partner: true },
      },
    });

    for (let index = 0; index < allAttendees.length; index++) {
      if (
        alreadyEmail.filter((attendee) => {
          if (
            attendee.email.toLowerCase().trim() ===
            allAttendees[index].email.toLowerCase().trim()
          )
            return attendee;
        }).length > 0
      ) {
        let existIndex = alreadyEmail.findIndex((attendee) => {
          if (attendee.email === allAttendees[index].email) return attendee;
        });
        alreadyEmail[existIndex] = {
          ...alreadyEmail[existIndex],
          role: [
            ...alreadyEmail[existIndex].role,
            allAttendees[index].type.toLowerCase(),
          ],
        };
      } else {
        alreadyEmail[arrayIndex] = {
          ...allAttendees[index],
          role: [allAttendees[index].type.toLowerCase()],
        };
        arrayIndex++;
      }
    }

    for (let index = 0; index < alreadyEmail.length; index++) {
      var eventDetails = {
        event: alreadyEmail[index].eventId,
      };

      for (let index2 = 0; index2 < alreadyEmail[index].role.length; index2++) {
        if (alreadyEmail[index].role[index2] === "partner")
          eventDetails = {
            ...eventDetails,
            [alreadyEmail[index].role[index2]]: true,
            partnerOrder: ++partnerCount,
          };
        else
          eventDetails = {
            ...eventDetails,
            [alreadyEmail[index].role[index2]]: true,
          };
      }
      alreadyEmail[index] = {
        ...alreadyEmail[index],
        eventDetails: eventDetails,
      };
    }
    const resultArray = [];
    
    for (let listIndex = 0; listIndex < alreadyEmail.length; listIndex++) {
      let emailExist = await User.findOne({
        "Preferred Email": alreadyEmail[listIndex].email.trim(),
        $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
      })
        .select("attendeeDetail")
        .lean();
    
      if (emailExist) {
        let updatingData = await updateAttendee(
          emailExist._id,
          emailExist,
          alreadyEmail[listIndex],
          req.admin_Id,
          io
        );
        resultArray.push(updatingData);
      } else {
        const attendeeData = new User({
          "Preferred Email": alreadyEmail[listIndex].email.toLowerCase().trim(),
          email: alreadyEmail[listIndex].email.toLowerCase().trim(),
          passcode: alreadyEmail[listIndex].passcode,
          isDelete: false,
          attendeeDetail: {
            title: alreadyEmail[listIndex].title,
            name: alreadyEmail[listIndex].name,
            firstName: alreadyEmail[listIndex].firstName,
            lastName: alreadyEmail[listIndex].lastName,
            email: alreadyEmail[listIndex].email.toLowerCase(),
            company: alreadyEmail[listIndex].company,
            profession: alreadyEmail[listIndex].profession,
            phone: alreadyEmail[listIndex].phone,
            facebook: alreadyEmail[listIndex].facebook,
            linkedin: alreadyEmail[listIndex].linkedin,
            auth0Id: alreadyEmail[listIndex].auth0Id,
            evntData: alreadyEmail[listIndex].eventDetails,
          },
        });
        const member = await attendeeData.save();
        await addAttendeeInChannelAtImport(
          alreadyEmail[listIndex].eventId,
          alreadyEmail[listIndex].role,
          member,
          req.admin_Id,
          io
        );
        resultArray.push(member);
      }
    }
    res
      .status(200)
      .json({ status: true, message: "Import Successfully done!" });
  } catch (e) {
    console.log(e);
    res.status(200).json({ status: false, message: "Something went wrong!" });
  }
};
// function to update attendee detail
async function updateAttendee(attendeeId, emailExist, data, adminId, io) {
  if (
    emailExist &&
    emailExist.attendeeDetail &&
    emailExist.attendeeDetail.evntData &&
    emailExist.attendeeDetail.evntData.filter((eventData) => {
      if (
        eventData.event &&
        data.eventId &&
        eventData.event.toString() === data.eventId.toString()
      )
        return eventData;
    }).length
  ) {
    let attendeeEventData = {
      passcode:
        data.passcode && data.passcode.length
          ? data.passcode
          : emailExist.attendeeDetail?.passcode,
      isDelete: false,
      attendeeDetail: {
        title:
          data.title && data.title.length
            ? data.title
            : emailExist.attendeeDetail?.title,
        email:
          data.email.toLowerCase().trim() &&
            data.email.toLowerCase().trim().length
            ? data.email.toLowerCase().trim()
            : emailExist.attendeeDetail?.email,
        name:
          data.name && data.name.length
            ? data.name
            : emailExist.attendeeDetail?.name,
        firstName:
          data.firstName && data.firstName.length
            ? data.firstName
            : emailExist.attendeeDetail?.firstName,
        lastName:
          data.lastName && data.lastName.length
            ? data.lastName
            : emailExist.attendeeDetail?.lastName,
        company:
          data.company && data.company.length
            ? data.company
            : emailExist.attendeeDetail?.company,
        profession:
          data.profession && data.profession.length
            ? data.profession
            : emailExist.attendeeDetail?.profession,
        phone:
          data.phone && data.phone.length
            ? data.phone
            : emailExist.attendeeDetail?.phone,
        facebook:
          data.facebook && data.facebook.length
            ? data.facebook
            : emailExist.attendeeDetail?.facebook,
        linkedin:
          data.linkedin && data.linkedin.length
            ? data.linkedin
            : emailExist.attendeeDetail?.linkedin,
        auth0Id:
          data.auth0Id && data.auth0Id.length
            ? data.auth0Id
            : emailExist.attendeeDetail?.auth0Id,
        evntData: emailExist.attendeeDetail.evntData.map((eventInnerData) => {
          if (
            data.eventId &&
            eventInnerData.event &&
            data.eventId.toString() === eventInnerData.event.toString()
          ) {
            let roleWise = {};
            for (let roleIndex = 0; roleIndex < data.role.length; roleIndex++) {
              roleWise = { ...roleWise, [data.role[roleIndex]]: true };
            }
            if (data.role.includes("partner")) {
              return {
                ...eventInnerData,
                ...roleWise,
                partnerOrder: data.partnerOrder,
              };
            } else {
              return {
                ...eventInnerData,
                ...roleWise,
              };
            }
          } else {
            return eventInnerData;
          }
        }),
      },
    };
    const updateAttendeeDetail = await User.findByIdAndUpdate(
      attendeeId,
      attendeeEventData,
      { new: true }
    );
    await addAttendeeInChannelAtImport(
      data.eventId,
      data.role,
      updateAttendeeDetail,
      adminId,
      io
    );
    return updateAttendeeDetail;
  } else if (
    emailExist &&
    emailExist.attendeeDetail &&
    emailExist.attendeeDetail.evntData &&
    emailExist.attendeeDetail.evntData.filter((eventData) => {
      if (
        eventData.event &&
        data.eventId &&
        eventData.event.toString() === data.eventId.toString()
      )
        return eventData;
    }).length === 0
  ) {
    let roleWise = {};
    for (let roleIndex = 0; roleIndex < data.role.length; roleIndex++) {
      roleWise = { ...roleWise, [data.role[roleIndex]]: true };
    }
    let attendeeEventData = {
      passcode:
        data.passcode && data.passcode.length
          ? data.passcode
          : emailExist.attendeeDetail?.passcode,
      isDelete: false,
      attendeeDetail: {
        title:
          data.title && data.title.length
            ? data.title
            : emailExist.attendeeDetail?.title,
        email:
          data.email.toLowerCase().trim() &&
            data.email.toLowerCase().trim().length
            ? data.email.toLowerCase().trim()
            : emailExist.attendeeDetail?.email,
        name:
          data.name && data.name.length
            ? data.name
            : emailExist.attendeeDetail?.name,
        firstName:
          data.firstName && data.firstName.length
            ? data.firstName
            : emailExist.attendeeDetail?.firstName,
        lastName:
          data.lastName && data.lastName.length
            ? data.lastName
            : emailExist.attendeeDetail?.lastName,
        company:
          data.company && data.company.length
            ? data.company
            : emailExist.attendeeDetail?.company,
        profession:
          data.profession && data.profession.length
            ? data.profession
            : emailExist.attendeeDetail?.profession,
        phone:
          data.phone && data.phone.length
            ? data.phone
            : emailExist.attendeeDetail?.phone,
        facebook:
          data.facebook && data.facebook.length
            ? data.facebook
            : emailExist.attendeeDetail?.facebook,
        linkedin:
          data.linkedin && data.linkedin.length
            ? data.linkedin
            : emailExist.attendeeDetail?.linkedin,
        auth0Id:
          data.auth0Id && data.auth0Id.length
            ? data.auth0Id
            : emailExist.attendeeDetail?.auth0Id,
        evntData: [
          ...emailExist.attendeeDetail.evntData,
          {
            event: data.eventDetails.event,
            partnerOrder: data.role.includes("partner") ? data.partnerOrder : 0,
            ...roleWise,
          },
        ],
      },
    };
    const updateAttendeeDetail = await User.findByIdAndUpdate(
      attendeeId,
      attendeeEventData,
      { new: true }
    );
    await addAttendeeInChannelAtImport(
      data.eventId,
      data.role,
      updateAttendeeDetail,
      adminId,
      io
    );
    return updateAttendeeDetail;
  } else if (emailExist && !emailExist.attendeeDetail) {
    let roleWise = {};
    for (let roleIndex = 0; roleIndex < data.role.length; roleIndex++) {
      roleWise = { ...roleWise, [data.role[roleIndex]]: true };
    }
    let attendeeEventData = {
      passcode: data.passcode,
      isDelete: false,
      attendeeDetail: {
        title: data.title,
        email: data.email.toLowerCase(),
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        profession: data.profession,
        phone: data.phone,
        facebook: data.facebook,
        linkedin: data.linkedin,
        auth0Id: data.auth0Id,
        evntData: [
          {
            event: data.eventDetails.event,
            partnerOrder: data.role.includes("partner") ? data.partnerOrder : 0,
            ...roleWise,
          },
        ],
      },
    };
    const updateAttendeeDetail = await User.findByIdAndUpdate(
      attendeeId,
      attendeeEventData,
      { new: true }
    );
    await addAttendeeInChannelAtImport(
      data.eventId,
      data.role,
      updateAttendeeDetail,
      adminId,
      io
    );
    return updateAttendeeDetail;
  }
}

// function to add attendee in channel while importing
async function addAttendeeInChannelAtImport(
  eventId,
  attendeeRole,
  userData,
  adminId,
  io
) {
  const newChatChannelData = await chatChannel.find({
    eventId: ObjectId(eventId),
    $or: [
      { restrictedAccess: { $in: attendeeRole } },
      { accessPermission: "public" },
      { accessPermission: "admin" },
    ],
    isDelete: false,
  });

  if (newChatChannelData.length > 0) {
    const newMembers = newChatChannelData?.map(async (newChannel) => {
      if (
        newChannel.accessPermission !== "admin" ||
        (newChannel.accessPermission === "admin" &&
          userData.migrate_user &&
          userData.migrate_user.plan_id === "Staff")
      ) {
        const checkChannelMemberExists = await chatChannelMembers.find({
          userId: userData._id,
          channelId: newChannel._id,
          status: 2,
        });
        if (checkChannelMemberExists.length === 0) {
          const channelMember = new chatChannelMembers({
            userId: userData._id,
            channelId: newChannel._id,
            status: 2,
            user_type: "airtable-syncs",
          });
          if (!channelMember) {
            return {
              status: false,
              message: "Something went wrong while adding members in channel!!",
            };
          }
          await channelMember.save();
          const getAllChannelMembers = await chatChannelMembers.find({
            channelId: newChannel._id,
            status: 2,
            user_type: "airtable-syncs",
          });
          var channelMembersChat = getAllChannelMembers
            ? getAllChannelMembers.map((ids) => {
              return { id: ids.userId._id, readmsg: false };
            })
            : [];
          channelMembersChat = [
            ...channelMembersChat.filter((ids) => {
              if (ids.id.toString() !== userData._id.toString()) return ids;
            }),
            { id: userData._id, readmsg: false },
          ];
          const channelMessage = new chat({
            message: "",
            recipient_type: "chatChannel",
            sender_type: "adminuser",
            recipient: newChannel._id,
            sender: adminId,
            type: "chatChannel",
            group_member: channelMembersChat,
            activity_status: true,
            activity: {
              type: "addChannelMembers",
              userId: [userData._id],
            },
            userTimeStamp: moment.utc().format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
          });
          const chatData = await saveChatData(channelMessage, newChannel);
          if (chatData) {
            const userDetail = await User.findById(userData._id);
            if (
              userDetail &&
              userDetail.deleted_group_of_user &&
              userDetail.deleted_group_of_user.includes(newChannel._id)
            ) {
              await User.findByIdAndUpdate(
                userDetail._id,
                {
                  $pull: { deleted_group_of_user: newChannel._id },
                },
                { new: true }
              );
            }
          }
          let allMembersIdsSocket = channelMembersChat?.map((member) => {
            return member.id;
          });
          await emitSocketChannelActivityEvent(
            io,
            allMembersIdsSocket,
            chatData
          );
        }
      } else {
        return {};
      }
    });
    await Promise.all([...newMembers]);
    return newMembers;
  } else {
    return {};
  }
}

// get event attendees by event Id
exports.getAttendeesByEventId = async (req, res) => {
  try {
    const eventId = new ObjectId(req.params.id);
    let attendeeList = [];

    const menberData = await User.aggregate([
      {
        $match: {
          "attendeeDetail.evntData": {
            $elemMatch: { event: eventId, member: true },
          },
        },
      },
      {
        $project: {
          _id: 1,
          auth0Id: 1,
          email: "$Preferred Email",
          type: "Member",
          title: "$attendeeDetail.title",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          name: "$attendeeDetail.name",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          event: eventId,
          passcode: "$passcode" ? "$passcode" : "",
          profileImg: "$profileImg" ? "$profileImg" : "",
        },
      },
    ]);
    if (menberData.length > 0) attendeeList = attendeeList.concat(menberData);

    const speakerData = await User.aggregate([
      {
        $match: {
          "attendeeDetail.evntData": {
            $elemMatch: { event: eventId, speaker: true },
          },
        },
      },
      {
        $project: {
          _id: 1,
          auth0Id: 1,
          email: "$Preferred Email",
          type: "Speaker",
          title: "$attendeeDetail.title",
          name: "$attendeeDetail.name",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          event: eventId,
          passcode: "$passcode" ? "$passcode" : "",
          profileImg: "$speakerIcon" ? "$speakerIcon" : "",
        },
      },
    ]);
    if (speakerData.length > 0) attendeeList = attendeeList.concat(speakerData);

    const partnerData = await User.aggregate([
      {
        $match: {
          "attendeeDetail.evntData": {
            $elemMatch: { event: eventId, partner: true },
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
          auth0Id: 1,
          email: "$Preferred Email",
          type: "Partner",
          title: "$attendeeDetail.title",
          name: "$attendeeDetail.name",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          event: eventId,
          passcode: "$passcode" ? "$passcode" : "",
          profileImg: "$partnerIcon" ? "$partnerIcon" : "",
        },
      },
    ]);
    if (partnerData.length > 0) attendeeList = attendeeList.concat(partnerData);

    const guestData = await User.aggregate([
      {
        $match: {
          "attendeeDetail.evntData": {
            $elemMatch: { event: eventId, guest: true },
          },
        },
      },
      {
        $project: {
          _id: 1,
          auth0Id: 1,
          email: "$Preferred Email",
          type: "Guest",
          title: "$attendeeDetail.title",
          name: "$attendeeDetail.name",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          event: eventId,
          passcode: "$passcode" ? "$passcode" : "",
          profileImg: "$guestIcon" ? "$guestIcon" : "",
        },
      },
    ]);
    if (guestData.length > 0) attendeeList = attendeeList.concat(guestData);

    if (attendeeList)
      return res.status(200).json({
        status: true,
        message: "Event list retrive!",
        data: attendeeList,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting event list!",
      });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get event attendee by Id
exports.getAttendeeById = async (req, res) => {
  try {
    const attendeeId = ObjectId(req.params.id);
    const eventId = ObjectId(req.query.eventId);
    const role = req.query.role;
    let attendeeData = [];

    switch (role) {
      case "member":
        attendeeData = await User.aggregate([
          {
            $match: {
              _id: attendeeId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: eventId, [`${role}`]: true },
              },
            },
          },
          {
            $project: {
              _id: 1,
              auth0Id: 1,
              email: "$Preferred Email",
              type: "Member",
              title: "$attendeeDetail.title",
              name: "$attendeeDetail.name",
              firstName: "$attendeeDetail.firstName"
                ? "$attendeeDetail.firstName"
                : "",
              lastName: "$attendeeDetail.lastName"
                ? "$attendeeDetail.lastName"
                : "",
              company: "$attendeeDetail.company",
              profession: "$attendeeDetail.profession",
              phone: "$attendeeDetail.phone",
              facebook: "$attendeeDetail.facebook",
              linkedin: "$attendeeDetail.linkedin",
              description: "$attendeeDetail.description" ?? "",
              offer: "$attendeeDetail.offer" ?? "",
              event: eventId,
              contactPartnerName: "$attendeeDetail.contactPartnerName"
                ? "$attendeeDetail.contactPartnerName"
                : "",
              passcode: "$passcode" ? "$passcode" : "",
              profileImg: "$profileImg" ? "$profileImg" : "",
              speakerIcon: "$speakerIcon" ? "$speakerIcon" : "",
              partnerIcon: "$partnerIcon" ? "$partnerIcon" : "",
              guestIcon: "$guestIcon" ? "$guestIcon" : "",
            },
          },
        ]);
        break;
      case "speaker":
        attendeeData = await User.aggregate([
          {
            $match: {
              _id: attendeeId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: eventId, [`${role}`]: true },
              },
            },
          },
          {
            $project: {
              _id: 1,
              auth0Id: 1,
              email: "$Preferred Email",
              type: "Speaker",
              title: "$attendeeDetail.title",
              name: "$attendeeDetail.name",
              firstName: "$attendeeDetail.firstName"
                ? "$attendeeDetail.firstName"
                : "",
              lastName: "$attendeeDetail.lastName"
                ? "$attendeeDetail.lastName"
                : "",
              company: "$attendeeDetail.company",
              profession: "$attendeeDetail.profession",
              phone: "$attendeeDetail.phone",
              facebook: "$attendeeDetail.facebook",
              linkedin: "$attendeeDetail.linkedin",
              description: "$attendeeDetail.description" ?? "",
              offer: "$attendeeDetail.offer" ?? "",
              event: eventId,
              contactPartnerName: "$attendeeDetail.contactPartnerName"
                ? "$attendeeDetail.contactPartnerName"
                : "",
              passcode: "$passcode" ? "$passcode" : "",
              profileImg: "$profileImg" ? "$profileImg" : "",
              speakerIcon: "$speakerIcon" ? "$speakerIcon" : "",
              partnerIcon: "$partnerIcon" ? "$partnerIcon" : "",
              guestIcon: "$guestIcon" ? "$guestIcon" : "",
            },
          },
        ]);
        break;
      case "partner":
        attendeeData = await User.aggregate([
          {
            $match: {
              _id: attendeeId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: eventId, [`${role}`]: true },
              },
            },
          },
          {
            $project: {
              _id: 1,
              auth0Id: 1,
              email: "$Preferred Email",
              type: "Partner",
              title: "$attendeeDetail.title",
              name: "$attendeeDetail.name",
              firstName: "$attendeeDetail.firstName"
                ? "$attendeeDetail.firstName"
                : "",
              lastName: "$attendeeDetail.lastName"
                ? "$attendeeDetail.lastName"
                : "",
              company: "$attendeeDetail.company",
              profession: "$attendeeDetail.profession",
              phone: "$attendeeDetail.phone",
              facebook: "$attendeeDetail.facebook",
              linkedin: "$attendeeDetail.linkedin",
              description: "$attendeeDetail.description" ?? "",
              offer: "$attendeeDetail.offer" ?? "",
              event: eventId,
              contactPartnerName: "$attendeeDetail.contactPartnerName"
                ? "$attendeeDetail.contactPartnerName"
                : "",
              passcode: "$passcode" ? "$passcode" : "",
              profileImg: "$profileImg" ? "$profileImg" : "",
              speakerIcon: "$speakerIcon" ? "$speakerIcon" : "",
              partnerIcon: "$partnerIcon" ? "$partnerIcon" : "",
              guestIcon: "$guestIcon" ? "$guestIcon" : "",
            },
          },
        ]);
        break;
      case "guest":
        attendeeData = await User.aggregate([
          {
            $match: {
              _id: attendeeId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: eventId, [`${role}`]: true },
              },
            },
          },
          {
            $project: {
              _id: 1,
              auth0Id: 1,
              email: "$Preferred Email",
              type: "Guest",
              title: "$attendeeDetail.title",
              name: "$attendeeDetail.name",
              firstName: "$attendeeDetail.firstName"
                ? "$attendeeDetail.firstName"
                : "",
              lastName: "$attendeeDetail.lastName"
                ? "$attendeeDetail.lastName"
                : "",
              company: "$attendeeDetail.company",
              profession: "$attendeeDetail.profession",
              phone: "$attendeeDetail.phone",
              facebook: "$attendeeDetail.facebook",
              linkedin: "$attendeeDetail.linkedin",
              description: "$attendeeDetail.description" ?? "",
              offer: "$attendeeDetail.offer" ?? "",
              event: eventId,
              contactPartnerName: "$attendeeDetail.contactPartnerName"
                ? "$attendeeDetail.contactPartnerName"
                : "",
              passcode: "$passcode" ? "$passcode" : "",
              profileImg: "$profileImg" ? "$profileImg" : "",
              speakerIcon: "$speakerIcon" ? "$speakerIcon" : "",
              partnerIcon: "$partnerIcon" ? "$partnerIcon" : "",
              guestIcon: "$guestIcon" ? "$guestIcon" : "",
            },
          },
        ]);
        break;
      default:
        break;
    }

    if (attendeeData.length > 0)
      return res.status(200).json({
        status: true,
        message: "Event attendee retrive!",
        data: attendeeData[0],
      });
    else
      return res
        .status(200)
        .json({ status: false, message: "Attendee details not found!" });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

/* create event attendees from admin 
    It will check if attendee data already exists or not [using preferred email] 
    If exist then check if attendee detail exists or not and update records accordingly
    It will also add the partner order if partner type attendee is created
*/
exports.createEventAttendees = async (req, res) => {
  try {
    const getEventAttendeeEmail = await User.findOne({
      "Preferred Email": req.body.email,
      $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
    }).lean();
    const io = req.app.get("socketio");
    var getEventAttendeeAuth = null;
    if (req.body.auth0Id) {
      getEventAttendeeAuth = await User.findOne({
        auth0Id: req.body.auth0Id,
      }).lean();
    }
    let descriptionData = `<div "font-family: 'Muller';">${req.body.description}</div>`;
    let offerData = `<div "font-family: 'Muller';">${req.body.offer}</div>`;
    var partnerCount = 0;
    if (req.body.type.toLowerCase() === "partner") {
      partnerCount = await User.countDocuments({
        "attendeeDetail.evntData": {
          $elemMatch: { event: req.body.eventId, partner: true },
        },
      });
    }
    if (!getEventAttendeeEmail && !getEventAttendeeAuth) {
      const newEventAttendee = new User({
        "Preferred Email": req.body.email.toLowerCase(),
        auth0Id: req.body.auth0Id,
        passcode: req.body.passcode,
        isDelete: false,
        attendeeDetail: {
          title: req.body.title,
          name: req.body.name,
          firstName: req.body.firstName ? req.body.firstName : "",
          lastName: req.body.lastName ? req.body.lastName : "",
          email: req.body.email.toLowerCase(),
          company: req.body.company,
          phone: req.body.phone,
          facebook: req.body.facebook,
          linkedin: req.body.linkedin,
          auth0Id: req.body.auth0Id,
          description: descriptionData,
          profession: req.body.profession,
          offer: offerData,
          contactPartnerName: req.body.contactPartnerName,
          evntData: [
            {
              event: req.body.eventId,
              partnerOrder: partnerCount > 0 ? partnerCount + 1 : 0,
              [req.body.type.toLowerCase()]: true,
            },
          ],
        },
      });
      const eventAttendeeData = await newEventAttendee.save();
      const newChatChannelData = await chatChannel.find({
        eventId: ObjectId(req.body.eventId),
        $or: [
          { restrictedAccess: { $in: req.body.type.toLowerCase() } },
          { accessPermission: "public" },
          { accessPermission: "admin" },
        ],
        isDelete: false,
      });

      if (newChatChannelData.length > 0) {
        const newMembers = newChatChannelData?.map(async (newChannel) => {
          if (
            newChannel.accessPermission !== "admin" ||
            (newChannel.accessPermission === "admin" &&
              eventAttendeeData.migrate_user &&
              eventAttendeeData.migrate_user.plan_id === "Staff")
          ) {
            const checkChannelMemberExists = await chatChannelMembers.find({
              userId: eventAttendeeData._id,
              channelId: newChannel._id,
              status: 2,
            });
            if (checkChannelMemberExists.length === 0) {
              const channelMember = new chatChannelMembers({
                userId: eventAttendeeData._id,
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
                  return { id: ids.userId._id, readmsg: false };
                })
                : [];
              channelMembersChat = [
                ...channelMembersChat.filter((ids) => {
                  if (ids.id.toString() !== eventAttendeeData._id.toString())
                    return ids;
                }),
                { id: eventAttendeeData._id, readmsg: false },
              ];
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
                  userId: [eventAttendeeData._id],
                },
                userTimeStamp: moment
                  .utc()
                  .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
              });
              const chatData = await saveChatData(channelMessage, newChannel);
              if (chatData) {
                const userData = await User.findById(eventAttendeeData._id);
                if (
                  userData &&
                  userData.deleted_group_of_user &&
                  userData.deleted_group_of_user.includes(newChannel._id)
                ) {
                  await User.findByIdAndUpdate(
                    eventAttendeeData._id,
                    {
                      $pull: { deleted_group_of_user: newChannel._id },
                    },
                    { new: true }
                  );
                }
              }
              let allMembersIdsSocket = channelMembersChat?.map((member) => {
                return member.id;
              });
              await emitSocketChannelActivityEvent(
                io,
                allMembersIdsSocket,
                chatData
              );
            }
          } else {
            return {};
          }
        });
        await Promise.all([...newMembers]);
      }
      if (eventAttendeeData)
        return res.status(200).json({
          status: true,
          message: "Event attendees created successfully.",
          data: eventAttendeeData,
        });
      else
        return res.status(200).json({
          status: false,
          message: "Something went wrong while updating event attendees!",
        });
    } else {
      const getEventAttendee = getEventAttendeeAuth
        ? getEventAttendeeAuth
        : getEventAttendeeEmail;
      if (typeof getEventAttendee.attendeeDetail === "object") {
        
        const attendeeEventDataExists =
          getEventAttendee.attendeeDetail.evntData.filter((data) => {
            if (
              data.event &&
              data.event.toString() === req.body.eventId &&
              data[req.body.type.toLowerCase()]
            ) {
              return data;
            }
          });
        if (attendeeEventDataExists.length > 0) {
          return res
            .status(200)
            .json({ status: false, message: "Event attendees already exist!" });
        } else {
          const eventDataDetail =
            getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
              if (evnt.event && evnt.event.toString() === req.body.eventId)
                return evnt;
            });
          var memberEventDetails;
          if (eventDataDetail.length > 0) {
            memberEventDetails = [
              ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                if (evnt.event && evnt.event.toString() !== req.body.eventId)
                  return evnt;
              }),
              {
                ...eventDataDetail[0],
                [req.body.type.toLowerCase()]: true,
                partnerOrder:
                  req.body.type.toLowerCase() === "partner" &&
                    eventDataDetail[0].partner !== true
                    ? partnerCount + 1
                    : eventDataDetail[0].partnerOrder,
              },
            ];
          } else {
            memberEventDetails = [
              ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                if (evnt.event && evnt.event.toString() !== req.body.eventId)
                  return evnt;
              }),
              {
                event: req.body.eventId,
                [req.body.type.toLowerCase()]: true,
                partnerOrder:
                  req.body.type.toLowerCase() === "partner" &&
                    eventDataDetail[0].partner !== true
                    ? partnerCount + 1
                    : 0,
              },
            ];
          }

          const updatedEventAttendeeData = await User.findByIdAndUpdate(
            getEventAttendee._id,
            {
              passcode: req.body.passcode,
              isDelete: false,
              attendeeDetail: {
                title: req.body.title,
                name: req.body.name,
                firstName: req.body.firstName ? req.body.firstName : "",
                lastName: req.body.lastName ? req.body.lastName : "",
                email: req.body.email.toLowerCase(),
                company: req.body.company,
                phone: req.body.phone,
                facebook: req.body.facebook,
                linkedin: req.body.linkedin,
                auth0Id: req.body.auth0Id,
                description: descriptionData,
                profession: req.body.profession,
                offer: offerData,
                contactPartnerName: req.body.contactPartnerName,
                evntData: memberEventDetails,
              },
            },
            { new: true }
          );

          const newChatChannelData = await chatChannel.find({
            eventId: ObjectId(req.body.eventId),
            $or: [
              { restrictedAccess: { $in: req.body.type.toLowerCase() } },
              { accessPermission: "public" },
              { accessPermission: "admin" },
            ],
            isDelete: false,
          });

          if (newChatChannelData.length > 0) {
            const newMembers = newChatChannelData?.map(async (newChannel) => {
              if (
                newChannel.accessPermission !== "admin" ||
                (newChannel.accessPermission === "admin" &&
                  getEventAttendee.migrate_user &&
                  getEventAttendee.migrate_user.plan_id === "Staff")
              ) {
                const checkChannelMemberExists = await chatChannelMembers.find({
                  userId: getEventAttendee._id,
                  channelId: newChannel._id,
                  status: 2,
                });
                if (checkChannelMemberExists.length === 0) {
                  const channelMember = new chatChannelMembers({
                    userId: getEventAttendee._id,
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
                      return { id: ids.userId._id, readmsg: false };
                    })
                    : [];
                  channelMembersChat = [
                    ...channelMembersChat.filter((ids) => {
                      if (ids.id.toString() !== getEventAttendee._id.toString())
                        return ids;
                    }),
                    { id: getEventAttendee._id, readmsg: false },
                  ];
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
                      userId: [getEventAttendee._id],
                    },
                    userTimeStamp: moment
                      .utc()
                      .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                  });
                  const chatData = await saveChatData(
                    channelMessage,
                    newChannel
                  );
                  if (chatData) {
                    const userData = await User.findById(getEventAttendee._id);
                    if (
                      userData &&
                      userData.deleted_group_of_user &&
                      userData.deleted_group_of_user.includes(newChannel._id)
                    ) {
                      await User.findByIdAndUpdate(
                        getEventAttendee._id,
                        {
                          $pull: { deleted_group_of_user: newChannel._id },
                        },
                        { new: true }
                      );
                    }
                  }
                  let allMembersIdsSocket = channelMembersChat?.map(
                    (member) => {
                      return member.id;
                    }
                  );
                  await emitSocketChannelActivityEvent(
                    io,
                    allMembersIdsSocket,
                    chatData
                  );
                }
              } else {
                return {};
              }
            });
            await Promise.all([...newMembers]);
          }

          if (updatedEventAttendeeData)
            return res.status(200).json({
              status: true,
              message: "Event attendees created successfully.",
              data: updatedEventAttendeeData,
            });
          else
            return res.status(200).json({
              status: false,
              message: "Something went wrong while updating event attendees!",
            });
        }
      } else {
        const updatedEventAttendee = await User.findByIdAndUpdate(
          getEventAttendee._id,
          {
            passcode: req.body.passcode,
            isDelete: false,
            attendeeDetail: {
              title: req.body.title,
              name: req.body.name,
              firstName: req.body.firstName ? req.body.firstName : "",
              lastName: req.body.lastName ? req.body.lastName : "",
              email: req.body.email.toLowerCase(),
              company: req.body.company,
              phone: req.body.phone,
              facebook: req.body.facebook,
              linkedin: req.body.linkedin,
              auth0Id: req.body.auth0Id,
              description: descriptionData,
              profession: req.body.profession,
              offer: offerData,
              contactPartnerName: req.body.contactPartnerName,
              evntData: [
                {
                  event: req.body.eventId,
                  [req.body.type.toLowerCase()]: true,
                  partnerOrder:
                    req.body.type.toLowerCase() === "partner"
                      ? partnerCount + 1
                      : 0,
                },
              ],
            },
          },
          { new: true }
        );

        if (updatedEventAttendee)
          return res.status(200).json({
            status: true,
            message: "Event attendees created successfully.",
            data: updatedEventAttendee,
          });
        else
          return res.status(200).json({
            status: false,
            message: "Something went wrong while updating event attendees!",
          });
      }
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// edit event attendees from admin
exports.editEventAttendees = async (req, res) => {
  try {
    const attendeeId = ObjectId(req.params.id);
    const io = req.app.get("socketio");
    let memberEventDetails = [];
    const getEventAttendee = await User.findOne({
      _id: attendeeId,
    }).lean();
    var partnerCount = 0;
    if (
      req.body.newType.toLowerCase() !== req.body.oldType.toLowerCase() &&
      req.body.newType.toLowerCase() === "partner"
    ) {
      partnerCount = await User.countDocuments({
        "attendeeDetail.evntData": {
          $elemMatch: { event: req.body.eventId, partner: true },
        },
      });
    }
    if (getEventAttendee !== null) {
      let descriptionData = `<div "font-family: 'Muller';">${req.body.description ?? ""
        }</div>`;
      let offerData = `<div "font-family: 'Muller';">${req.body.offer ?? ""
        }</div>`;

      const attendeeEventDataExists =
        getEventAttendee.attendeeDetail.evntData.filter((data) => {
          if (
            data.event.toString() === req.body.eventId &&
            data[req.body.newType.toLowerCase()] &&
            data[req.body.oldType.toLowerCase()]
          ) {
            return data;
          }
        });

      if (
        req.body.newType.toLowerCase() !== req.body.oldType.toLowerCase() &&
        req.body.oldType.toLowerCase() === "speaker"
      ) {
        const alreadyAssignSession = await eventSession
          .find({
            speakerId: { $in: [attendeeId] },
            event: ObjectId(req.body.eventId),
            isDelete: false,
          })
          .lean();
        if (alreadyAssignSession && alreadyAssignSession.length > 0) {
          var sessionList = [];
          if (alreadyAssignSession.length > 0) {
            alreadyAssignSession.map((itemSession, i) => {
              sessionList.push(itemSession.title);
            });
          }

          return res.status(200).json({
            status: false,
            message:
              "You can not updates this attendees type because this attendee is assigned as a speaker to particular: ",
            data: { sessionList },
          });
        } else {
          if (attendeeEventDataExists.length > 0) {
            const eventDataDetail =
              getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                if (evnt.event.toString() === req.body.eventId) return evnt;
              });

            if (
              eventDataDetail.length > 0 &&
              req.body.oldType !== req.body.newType
            ) {
              memberEventDetails = [
                ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                  if (evnt.event.toString() !== req.body.eventId) return evnt;
                }),
                {
                  ...eventDataDetail[0],
                  [req.body.oldType.toLowerCase()]: false,
                  [req.body.newType.toLowerCase()]: true,
                  partnerOrder:
                    partnerCount > 0
                      ? partnerCount + 1
                      : req.body.oldType.toLowerCase() === "partner"
                        ? 0
                        : eventDataDetail[0].partnerOrder,
                },
              ];
            }
          } else {
            const existingEvent =
              getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                if (evnt.event.toString() === req.body.eventId) return evnt;
              });

            if (
              existingEvent.length > 0 &&
              req.body.oldType !== req.body.newType
            ) {
              memberEventDetails = [
                ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                  if (evnt.event.toString() !== req.body.eventId) return evnt;
                }),
                {
                  ...existingEvent[0],
                  [req.body.oldType.toLowerCase()]: false,
                  [req.body.newType.toLowerCase()]: true,
                  partnerOrder:
                    partnerCount > 0
                      ? partnerCount + 1
                      : req.body.oldType.toLowerCase() === "partner"
                        ? 0
                        : existingEvent[0].partnerOrder,
                },
              ];
            } else {
              memberEventDetails = [
                ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                  if (evnt.event.toString() !== req.body.eventId) return evnt;
                }),
                {
                  ...existingEvent[0],
                  event: req.body.eventId,
                  [req.body.newType.toLowerCase()]: true,
                  partnerOrder:
                    partnerCount > 0
                      ? partnerCount + 1
                      : req.body.oldType.toLowerCase() === "partner"
                        ? 0
                        : existingEvent[0].partnerOrder,
                },
              ];
            }
          }

          const updateAttendeeData = await User.findOneAndUpdate(
            getEventAttendee._id,
            {
              passcode: req.body.passcode ?? getEventAttendee.passcode,
              attendeeDetail: {
                email: getEventAttendee.attendeeDetail.email.toLowerCase(),
                auth0Id:
                  req.body.auth0Id ?? getEventAttendee.attendeeDetail.auth0Id,
                title: req.body.title ?? getEventAttendee.attendeeDetail.title,
                name: req.body.name ?? getEventAttendee.attendeeDetail.name,
                firstName: req.body.firstName
                  ? req.body.firstName
                  : getEventAttendee.attendeeDetail.firstName === undefined
                    ? ""
                    : getEventAttendee.attendeeDetail.firstName,
                lastName: req.body.lastName
                  ? req.body.lastName
                  : getEventAttendee.attendeeDetail.lastName === undefined
                    ? ""
                    : getEventAttendee.attendeeDetail.lastName,
                company:
                  req.body.company ?? getEventAttendee.attendeeDetail.company,
                profession:
                  req.body.profession ??
                  getEventAttendee.attendeeDetail.profession,
                phone: req.body.phone ?? getEventAttendee.attendeeDetail.phone,
                facebook:
                  req.body.facebook ?? getEventAttendee.attendeeDetail.facebook,
                linkedin:
                  req.body.linkedin ?? getEventAttendee.attendeeDetail.linkedin,
                description: req.body.description
                  ? descriptionData
                  : getEventAttendee.attendeeDetail.description !== "" &&
                    getEventAttendee.attendeeDetail.description !== null
                    ? getEventAttendee.attendeeDetail.description
                    : "",
                offer: req.body.offer
                  ? offerData
                  : getEventAttendee.attendeeDetail.offer !== "" &&
                    getEventAttendee.attendeeDetail.offer !== null
                    ? getEventAttendee.attendeeDetail.offer
                    : "",
                contactPartnerName:
                  req.body.contactPartnerName ??
                  getEventAttendee.contactPartnerName,
                evntData:
                  memberEventDetails.length > 0
                    ? memberEventDetails
                    : getEventAttendee.attendeeDetail.evntData,
              },
            },
            { new: true }
          );

          if (req.body.oldType !== req.body.newType) {
            const newChatChannelData = await chatChannel.find({
              eventId: ObjectId(req.body.eventId),
              $or: [
                { restrictedAccess: { $in: req.body.newType.toLowerCase() } },
                { accessPermission: "public" },
                { accessPermission: "admin" },
              ],
              isDelete: false,
            });
            const oldChatChannelData = await chatChannel.find({
              eventId: ObjectId(req.body.eventId),
              $or: [
                { restrictedAccess: { $in: req.body.oldType.toLowerCase() } },
                { accessPermission: "public" },
                { accessPermission: "admin" },
              ],
              isDelete: false,
            });

            if (oldChatChannelData.length > 0) {
              const oldMembers = oldChatChannelData?.map(async (oldChannel) => {
                const userDataInside = await User.findById(attendeeId).lean();
                const userEventData =
                  userDataInside.attendeeDetail.evntData.filter((eventData) => {
                    if (
                      eventData.event &&
                      eventData.event.toString() ===
                      oldChannel._id.toString() &&
                      (eventData.partner === true ||
                        eventData.speaker === true ||
                        eventData.member === true ||
                        eventData.guest === true)
                    )
                      return eventData;
                  });
                if (
                  !(
                    (oldChannel.accessPermission === "public" &&
                      userEventData &&
                      userEventData.length > 0) ||
                    (oldChannel.accessPermission === "admin" &&
                      userEventData &&
                      userEventData.length > 0 &&
                      userDataInside.migrate_user &&
                      userDataInside.migrate_user.plan_id === "Staff")
                  )
                ) {
                  const checkChannelMemberExists =
                    await chatChannelMembers.find({
                      userId: attendeeId,
                      channelId: oldChannel._id,
                      status: 2,
                    });
                  if (checkChannelMemberExists.length > 0) {
                    const removeMembersAttendee =
                      await chatChannelMembers.deleteOne(
                        {
                          userId: attendeeId,
                          channelId: oldChannel._id,
                          user_type: "airtable-syncs",
                          status: 2,
                        },
                        { new: true }
                      );
                    if (!removeMembersAttendee) {
                      return res.status(200).json({
                        status: false,
                        message:
                          "Something went wrong while adding members in channel!!",
                      });
                    }
                    const getAllChannelMembers = await chatChannelMembers.find({
                      channelId: oldChannel._id,
                      status: 2,
                      user_type: "airtable-syncs",
                    });
                    var channelMembersChat = getAllChannelMembers
                      ? getAllChannelMembers.map((ids) => {
                        return { id: ids.userId._id, readmsg: false };
                      })
                      : [];
                    const channelMessage = new chat({
                      message: "",
                      recipient_type: "chatChannel",
                      sender_type: "adminuser",
                      recipient: oldChannel._id,
                      sender: req.admin_Id,
                      type: "chatChannel",
                      group_member: channelMembersChat,
                      activity_status: true,
                      activity: {
                        type: "removedChannelMembers",
                        userId: [attendeeId],
                      },
                      userTimeStamp: moment
                        .utc()
                        .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                    });
                    const chatData = await saveChatData(
                      channelMessage,
                      oldChannel
                    );
                    deleteMultipleRecordFromChatList(
                      [attendeeId],
                      oldChannel._id
                    );
                    if (chatData) {
                      const userData = await User.findById(attendeeId);
                      if (
                        !(
                          userData &&
                          userData.deleted_group_of_user &&
                          userData.deleted_group_of_user.includes(
                            oldChannel._id
                          )
                        )
                      ) {
                        await User.findByIdAndUpdate(attendeeId, {
                          $push: { deleted_group_of_user: oldChannel._id },
                        });
                      }
                    }
                    let allMembersIdsSocket = channelMembersChat?.map(
                      (member) => {
                        return member.id;
                      }
                    );
                    await emitSocketChannelActivityEvent(
                      io,
                      allMembersIdsSocket,
                      chatData
                    );
                  }
                } else {
                  return {};
                }
              });
              await Promise.all([...oldMembers]);
            }

            if (newChatChannelData.length > 0) {
              const newMembers = newChatChannelData?.map(async (newChannel) => {
                const userDataInnerSide = await User.findById(
                  attendeeId
                ).lean();
                if (
                  newChannel.accessPermission !== "admin" ||
                  (newChannel.accessPermission === "admin" &&
                    userDataInnerSide.migrate_user &&
                    userDataInnerSide.migrate_user.plan_id === "Staff")
                ) {
                  const checkChannelMemberExists =
                    await chatChannelMembers.find({
                      userId: attendeeId,
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
                        return { id: ids.userId._id, readmsg: false };
                      })
                      : [];
                    channelMembersChat = [
                      ...channelMembersChat.filter((ids) => {
                        if (ids.id.toString() !== attendeeId.toString())
                          return ids;
                      }),
                      { id: attendeeId, readmsg: false },
                    ];
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
                      userTimeStamp: moment
                        .utc()
                        .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                    });
                    const chatData = await saveChatData(
                      channelMessage,
                      newChannel
                    );
                    if (chatData) {
                      if (
                        userDataInnerSide &&
                        userDataInnerSide.deleted_group_of_user &&
                        userDataInnerSide.deleted_group_of_user.includes(
                          newChannel._id
                        )
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
                    let allMembersIdsSocket = channelMembersChat?.map(
                      (member) => {
                        return member.id;
                      }
                    );
                    await emitSocketChannelActivityEvent(
                      io,
                      allMembersIdsSocket,
                      chatData
                    );
                  }
                } else {
                  return {};
                }
              });
              await Promise.all([...newMembers]);
            }
          }
          if (
            req.body.newType.toLowerCase() !== req.body.oldType.toLowerCase() &&
            req.body.oldType.toLowerCase() === "partner"
          ) {
            const rearragedData = await rearrangeAttendee(
              req.body.eventId,
              true
            );
          }
          if (updateAttendeeData)
            return res.status(200).json({
              status: true,
              message: "Event attendee updated successfully.",
              data: updateAttendeeData,
            });
          else
            return res.status(200).json({
              status: false,
              message: "Error while updateing event attendee!",
            });
        }
      } else {
        if (attendeeEventDataExists.length > 0) {
          const eventDataDetail =
            getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
              if (evnt.event.toString() === req.body.eventId) return evnt;
            });

          if (
            eventDataDetail.length > 0 &&
            req.body.oldType !== req.body.newType
          ) {
            memberEventDetails = [
              ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                if (evnt.event.toString() !== req.body.eventId) return evnt;
              }),
              {
                ...eventDataDetail[0],
                [req.body.oldType.toLowerCase()]: false,
                [req.body.newType.toLowerCase()]: true,
                partnerOrder:
                  partnerCount > 0
                    ? partnerCount + 1
                    : req.body.oldType.toLowerCase() === "partner"
                      ? 0
                      : eventDataDetail[0].partnerOrder,
              },
            ];
          }
        } else {
          const existingEvent = getEventAttendee.attendeeDetail.evntData.filter(
            (evnt) => {
              if (evnt.event.toString() === req.body.eventId) return evnt;
            }
          );

          if (
            existingEvent.length > 0 &&
            req.body.oldType !== req.body.newType
          ) {
            memberEventDetails = [
              ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                if (evnt.event.toString() !== req.body.eventId) return evnt;
              }),
              {
                ...existingEvent[0],
                [req.body.oldType.toLowerCase()]: false,
                [req.body.newType.toLowerCase()]: true,
                partnerOrder:
                  partnerCount > 0
                    ? partnerCount + 1
                    : req.body.oldType.toLowerCase() === "partner"
                      ? 0
                      : existingEvent[0].partnerOrder,
              },
            ];
          } else {
            memberEventDetails = [
              ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                if (evnt.event.toString() !== req.body.eventId) return evnt;
              }),
              {
                ...existingEvent[0],
                event: req.body.eventId,
                [req.body.newType.toLowerCase()]: true,
                partnerOrder:
                  partnerCount > 0
                    ? partnerCount + 1
                    : req.body.oldType.toLowerCase() === "partner"
                      ? 0
                      : existingEvent[0].partnerOrder,
              },
            ];
          }
        }

        const updateAttendeeData = await User.findOneAndUpdate(
          getEventAttendee._id,
          {
            passcode: req.body.passcode ?? getEventAttendee.passcode,
            attendeeDetail: {
              email: getEventAttendee.attendeeDetail.email,
              auth0Id: getEventAttendee.attendeeDetail.auth0Id,
              title: req.body.title ?? getEventAttendee.attendeeDetail.title,
              name: req.body.name ?? getEventAttendee.attendeeDetail.name,
              firstName: req.body.firstName
                ? req.body.firstName
                : getEventAttendee.attendeeDetail.firstName === undefined
                  ? ""
                  : getEventAttendee.attendeeDetail.firstName,
              lastName: req.body.lastName
                ? req.body.lastName
                : getEventAttendee.attendeeDetail.lastName === undefined
                  ? ""
                  : getEventAttendee.attendeeDetail.lastName,
              company:
                req.body.company ?? getEventAttendee.attendeeDetail.company,
              profession:
                req.body.profession ??
                getEventAttendee.attendeeDetail.profession,
              phone: req.body.phone ?? getEventAttendee.attendeeDetail.phone,
              facebook:
                req.body.facebook ?? getEventAttendee.attendeeDetail.facebook,
              linkedin:
                req.body.linkedin ?? getEventAttendee.attendeeDetail.linkedin,
              description: req.body.description
                ? descriptionData
                : getEventAttendee.attendeeDetail.description !== "" &&
                  getEventAttendee.attendeeDetail.description !== null
                  ? getEventAttendee.attendeeDetail.description
                  : "",
              offer: req.body.offer
                ? offerData
                : getEventAttendee.attendeeDetail.offer !== "" &&
                  getEventAttendee.attendeeDetail.offer !== null
                  ? getEventAttendee.attendeeDetail.offer
                  : "",
              contactPartnerName:
                req.body.contactPartnerName ??
                getEventAttendee.contactPartnerName,
              evntData:
                memberEventDetails.length > 0
                  ? memberEventDetails
                  : getEventAttendee.attendeeDetail.evntData,
            },
          },
          { new: true }
        );

        if (req.body.oldType !== req.body.newType) {
          const newChatChannelData = await chatChannel.find({
            eventId: ObjectId(req.body.eventId),
            $or: [
              { restrictedAccess: { $in: req.body.newType.toLowerCase() } },
              { accessPermission: "public" },
              { accessPermission: "admin" },
            ],
            isDelete: false,
          });
          const oldChatChannelData = await chatChannel.find({
            eventId: ObjectId(req.body.eventId),
            $or: [
              { restrictedAccess: { $in: req.body.oldType.toLowerCase() } },
              { accessPermission: "public" },
              { accessPermission: "admin" },
            ],
            isDelete: false,
          });

          if (oldChatChannelData.length > 0) {
            const oldMembers = oldChatChannelData?.map(async (oldChannel) => {
              const userDataInside = await User.findById(attendeeId).lean();
              const userEventData =
                userDataInside.attendeeDetail.evntData.filter((eventData) => {
                  if (
                    eventData.event &&
                    eventData.event.toString() === oldChannel._id.toString() &&
                    (eventData.partner === true ||
                      eventData.speaker === true ||
                      eventData.member === true ||
                      eventData.guest === true)
                  )
                    return eventData;
                });
              if (
                !(
                  (oldChannel.accessPermission === "public" &&
                    userEventData &&
                    userEventData.length > 0) ||
                  (oldChannel.accessPermission === "admin" &&
                    userEventData &&
                    userEventData.length > 0 &&
                    userDataInside.migrate_user &&
                    userDataInside.migrate_user.plan_id === "Staff")
                )
              ) {
                const checkChannelMemberExists = await chatChannelMembers.find({
                  userId: attendeeId,
                  channelId: oldChannel._id,
                  status: 2,
                });
                if (checkChannelMemberExists.length > 0) {
                  const removeMembersAttendee =
                    await chatChannelMembers.deleteOne(
                      {
                        userId: attendeeId,
                        channelId: oldChannel._id,
                        user_type: "airtable-syncs",
                        status: 2,
                      },
                      { new: true }
                    );
                  if (!removeMembersAttendee) {
                    return res.status(200).json({
                      status: false,
                      message:
                        "Something went wrong while adding members in channel!!",
                    });
                  }
                  const getAllChannelMembers = await chatChannelMembers.find({
                    channelId: oldChannel._id,
                    status: 2,
                    user_type: "airtable-syncs",
                  });
                  var channelMembersChat = getAllChannelMembers
                    ? getAllChannelMembers.map((ids) => {
                      return { id: ids.userId._id, readmsg: false };
                    })
                    : [];
                  const channelMessage = new chat({
                    message: "",
                    recipient_type: "chatChannel",
                    sender_type: "adminuser",
                    recipient: oldChannel._id,
                    sender: req.admin_Id,
                    type: "chatChannel",
                    group_member: channelMembersChat,
                    activity_status: true,
                    activity: {
                      type: "removedChannelMembers",
                      userId: [attendeeId],
                    },
                    userTimeStamp: moment
                      .utc()
                      .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                  });

                  const chatData = await saveChatData(
                    channelMessage,
                    oldChannel
                  );
                  deleteMultipleRecordFromChatList(
                    [attendeeId],
                    oldChannel._id
                  );
                  if (chatData) {
                    const userData = await User.findById(attendeeId);
                    if (
                      !(
                        userData &&
                        userData.deleted_group_of_user &&
                        userData.deleted_group_of_user.includes(oldChannel._id)
                      )
                    ) {
                      await User.findByIdAndUpdate(attendeeId, {
                        $push: { deleted_group_of_user: oldChannel._id },
                      });
                    }
                  }
                  let allMembersIdsSocket = channelMembersChat?.map(
                    (member) => {
                      return member.id;
                    }
                  );
                  await emitSocketChannelActivityEvent(
                    io,
                    allMembersIdsSocket,
                    chatData
                  );
                }
              } else {
                return {};
              }
            });
            await Promise.all([...oldMembers]);
          }

          if (newChatChannelData.length > 0) {
            const newMembers = newChatChannelData?.map(async (newChannel) => {
              const userDataInnerSide = await User.findById(attendeeId).lean();
              if (
                newChannel.accessPermission !== "admin" ||
                (newChannel.accessPermission === "admin" &&
                  userDataInnerSide.migrate_user &&
                  userDataInnerSide.migrate_user.plan_id === "Staff")
              ) {
                const checkChannelMemberExists = await chatChannelMembers.find({
                  userId: attendeeId,
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
                      return { id: ids.userId._id, readmsg: false };
                    })
                    : [];
                  channelMembersChat = [
                    ...channelMembersChat,
                    { id: attendeeId, readmsg: false },
                  ];
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
                    userTimeStamp: moment
                      .utc()
                      .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                  });
                  const chatData = await saveChatData(
                    channelMessage,
                    newChannel
                  );
                  if (chatData) {
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
                  let allMembersIdsSocket = channelMembersChat?.map(
                    (member) => {
                      return member.id;
                    }
                  );
                  await emitSocketChannelActivityEvent(
                    io,
                    allMembersIdsSocket,
                    chatData
                  );
                }
              } else {
                return {};
              }
            });
            await Promise.all([...newMembers]);
          }
        }
        if (
          req.body.newType.toLowerCase() !== req.body.oldType.toLowerCase() &&
          req.body.oldType.toLowerCase() === "partner"
        ) {
          const rearragedData = await rearrangeAttendee(req.body.eventId, true);
        }
        if (updateAttendeeData)
          return res.status(200).json({
            status: true,
            message: "Event attendee updated successfully.",
            data: updateAttendeeData,
          });
        else
          return res.status(200).json({
            status: false,
            message: "Error while updateing event attendee!",
          });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Event attendee not found!" });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// delete event attendees from admin
exports.deleteEventAttendees = async (req, res) => {
  try {
    const deleteDataArray = req.body.deleteData;
    const eventId = ObjectId(req.query.eventId);
    var attendeeIds = (updateAttendeeDataArray = []);
    var speakerIds = [];

    var deleteData = deleteDataArray.map(async (item, i) => {
      if(item.role !== "Speaker")
      attendeeIds.push(ObjectId(item.attendeeId));
    else
      speakerIds.push(ObjectId(item.attendeeId));
    });

    const alreadyAssignSession = await eventSession
      .find({
        speakerId: { $in: speakerIds },
        event: eventId,
        isDelete: false,
      })
      .lean();
    if (alreadyAssignSession && alreadyAssignSession.length > 0) {
      var sessionList = [];
      if (alreadyAssignSession.length > 0) {
        alreadyAssignSession.map((itemSession, i) => {
          sessionList.push(itemSession.title);
        });
      }
      return res.status(200).json({
        status: false,
        message:
          "You cannot delete this attendee because it is assigned to following sessions: ",
        data: { sessionList },
      });
    }
    else{
      attendeeIds=[...attendeeIds,speakerIds]
    }

    var deleteData = deleteDataArray.map(async (item, i) => {
      const attendeeId = ObjectId(item.attendeeId);
      const role = item.role;
      const io = req.app.get("socketio");
      let memberEventDetails = [];

      const getEventAttendee = await User.findOne({
        _id: attendeeId,
        $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
      }).lean();
      if (getEventAttendee !== null) {
        const attendeeEventDataExists =
          getEventAttendee.attendeeDetail.evntData.filter((data) => {
            if (
              data.event &&
              data.event.toString() === eventId.toString() &&
              data[role.toLowerCase()]
            ) {
              return data;
            }
          });
        if (attendeeEventDataExists.length > 0) {
          const eventDataDetail =
            getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
              if (evnt.event && evnt.event.toString() === eventId.toString())
                return evnt;
            });
          if (eventDataDetail.length > 0) {
            memberEventDetails = [
              ...getEventAttendee.attendeeDetail.evntData.filter((evnt) => {
                if (evnt.event && evnt.event.toString() !== eventId.toString())
                  return evnt;
              }),
              {
                ...eventDataDetail[0],
                [role.toLowerCase()]: false,
                partnerOrder:
                  role.toLowerCase() === "partner"
                    ? 0
                    : eventDataDetail[0].partnerOrder,
              },
            ];
          }
        }

        let updateAttendee = await User.findOneAndUpdate(
          { _id: getEventAttendee._id },
          {
            attendeeDetail: {
              title: getEventAttendee.attendeeDetail.title,
              name: getEventAttendee.attendeeDetail.name,
              firstName: getEventAttendee.attendeeDetail.firstName
                ? getEventAttendee.attendeeDetail.firstName
                : "",
              lastName: getEventAttendee.attendeeDetail.lastName
                ? getEventAttendee.attendeeDetail.lastName
                : "",
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
        updateAttendeeDataArray.push(updateAttendee);
        const oldChatChannelData = await chatChannel.find({
          eventId: eventId,
          $or: [
            { restrictedAccess: { $in: role.toLowerCase() } },
            { accessPermission: "public" },
            { accessPermission: "admin" },
          ],
          isDelete: false,
        });

        if (oldChatChannelData.length > 0) {
          const oldMembers = oldChatChannelData?.map(async (oldChannel) => {
            const userDataInside = await User.findById(attendeeId).lean();
            const userEventData = userDataInside.attendeeDetail.evntData.filter(
              (eventData) => {
                if (
                  eventData.event &&
                  eventData.event.toString() === oldChannel._id.toString() &&
                  (eventData.partner === true ||
                    eventData.speaker === true ||
                    eventData.member === true ||
                    eventData.guest === true)
                )
                  return eventData;
              }
            );
            if (
              !(
                (oldChannel.accessPermission === "public" &&
                  userEventData &&
                  userEventData.length > 0) ||
                (oldChannel.accessPermission === "admin" &&
                  userEventData &&
                  userEventData.length > 0 &&
                  userDataInside.migrate_user &&
                  userDataInside.migrate_user.plan_id === "Staff")
              )
            ) {
              const checkChannelMemberExists = await chatChannelMembers.find({
                userId: attendeeId,
                channelId: oldChannel._id,
                status: 2,
                user_type: "airtable-syncs",
              });
              if (checkChannelMemberExists.length > 0) {
                const removeMembersAttendee =
                  await chatChannelMembers.deleteOne(
                    {
                      userId: attendeeId,
                      channelId: oldChannel._id,
                      user_type: "airtable-syncs",
                      status: 2,
                    },
                    { new: true }
                  );
                if (!removeMembersAttendee) {
                  return res.status(200).json({
                    status: false,
                    message:
                      "Something went wrong while deleting members in channel!!",
                  });
                }
                const getAllChannelMembers = await chatChannelMembers.find({
                  channelId: oldChannel._id,
                  status: 2,
                  user_type: "airtable-syncs",
                });
                var channelMembersChat = getAllChannelMembers
                  ? getAllChannelMembers.map((ids) => {
                    return { id: ids.userId._id, readmsg: false };
                  })
                  : [];
                const channelMessage = new chat({
                  message: "",
                  recipient_type: "chatChannel",
                  sender_type: "adminuser",
                  recipient: oldChannel._id,
                  sender: req.admin_Id,
                  type: "chatChannel",
                  group_member: channelMembersChat,
                  activity_status: true,
                  activity: {
                    type: "removedChannelMembers",
                    userId: [attendeeId],
                  },
                  userTimeStamp: moment
                    .utc()
                    .format("YYYY-MM-DDTHH:mm:ss.SSSSSS[Z]"),
                });
                const chatData = await saveChatData(channelMessage, oldChannel);
                deleteMultipleRecordFromChatList([attendeeId], oldChannel._id);
                if (chatData) {
                  const userData = await User.findById(attendeeId);
                  if (
                    !(
                      userData &&
                      userData.deleted_group_of_user &&
                      userData.deleted_group_of_user.includes(oldChannel._id)
                    )
                  ) {
                    await User.findByIdAndUpdate(attendeeId, {
                      $push: { deleted_group_of_user: oldChannel._id },
                    });
                  }
                }
                let allMembersIdsSocket = channelMembersChat?.map((member) => {
                  return member.id;
                });
                await emitSocketChannelActivityEvent(
                  io,
                  allMembersIdsSocket,
                  chatData
                );
              }
            } else {
              return {};
            }
          });
          await Promise.all([...oldMembers]);
        }
        if (role.toLowerCase() === "partner") {
          const rearragedData = await rearrangeAttendee(req.body.eventId, true);
        }
      }
    });
    await Promise.all([...deleteData]);
    if (updateAttendeeDataArray)
      return res.status(200).json({
        status: true,
        message: "Event attendee deleted successfully.",
        data: updateAttendeeDataArray,
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

//reorder partner attendees from admin side
exports.rearrangeAttendees = async (req, res) => {
  try {
    const rearrangedData = await rearrangeAttendee(
      req.body.eventId,
      false,
      req.body.Ids
    );
    res.status(200).json(rearrangedData);
  } catch (e) {
    res.status(200).json({ status: false, message: e });
  }
};

// get past event name list API code
exports.getPastEventNameList = async (req, res) => {
  try {
    const aggregatePipeline = [
      {
        $match: {
          isDelete: false,
          $or: [
            { eventAccess: "public" },
            { eventAccess: "admin/staff" },
            { eventAccess: "restricted" },
          ],
        },
      },
    ];

    const eventListData = await event.aggregate([
      ...aggregatePipeline,
      {
        $project: {
          _id: 1,
          title: 1,
        },
      },
    ]);

    if (eventListData.length > 0) {
      return res.status(200).json({
        status: true,
        message: "Event list retrive!",
        data: eventListData,
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "There is no past events list!",
        data: [],
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};
/** Admin APIs ends **/

/** User APIs starts **/
// get event gallery for user
exports.getGallery = async (req, res) => {
  try {
    const eventData = await event
      .findOne({ _id: new ObjectId(req.params.id), isDelete: false })
      .select("photos title");
    if (eventData)
      return res.status(200).json({
        status: true,
        message: "Event photos retrive!",
        data: eventData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting event photos!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: e });
  }
};

// get event list for user
exports.getEventList = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const role = req.query.role;
    const localDate = new Date(req.query.localDate);
    const userData = await User.findById(authUser).select(
      "auth0Id email accessible_groups purchased_plan attendeeDetail"
    );
    var eventList = [],
      location = {};
    var eventListData = [];
    if (userData !== null && userData !== undefined) {
      const eventAttendeesData = await User.findOne(
        { _id: authUser, isDelete: false },
        { attendeeDetail: 1 }
      );
      if (eventAttendeesData !== null) {
        let attendeesDetails =
          eventAttendeesData?.attendeeDetail?.evntData?.map(
            async (attendee, i) => {
              if (
                attendee.member === false &&
                attendee.speaker === false &&
                attendee.partner === false &&
                attendee.guest === false
              ) {
                eventList = [];
              } else {
                if (attendee.member === true && role === "member") {
                  let eventData = await event
                    .findOne(
                      { _id: attendee.event, isDelete: false },
                      {
                        _id: 1,
                        title: 1,
                        thumbnail: 1,
                        eventUrl: 1,
                        startDate: 1,
                        startTime: 1,
                        endDate: 1,
                        endTime: 1,
                        timeZone: 1,
                        location: 1,
                      }
                    )
                    .lean();
                  if (eventData !== null) {
                    if (
                      eventData.location !== undefined &&
                      eventData.location !== "" &&
                      eventData.location !== null
                    ) {
                      eventData = {
                        ...eventData,
                        city: eventData.location.address
                          ? eventData.location.city
                          : null,
                        country: eventData.location.address
                          ? eventData.location.country
                          : null,
                      };
                      delete eventData.location;
                      eventList.push(eventData);
                    } else {
                      location = await eventLocation
                        .findOne({
                          event: attendee.event,
                          locationVisible: true,
                          isDelete: false,
                        })
                        .lean();
                      delete eventData.location;
                      if (location !== null) {
                        eventData = {
                          ...eventData,
                          city: location ? location.city : null,
                          country: location ? location.country : null,
                        };
                      } else {
                        eventData = { ...eventData, city: null, country: null };
                      }
                      eventList.push(eventData);
                    }
                  }
                } else if (
                  (attendee.member === true ||
                    attendee.speaker === true ||
                    attendee.partner === true ||
                    attendee.guest === true) &&
                  role === "nonMember"
                ) {
                  let eventData = await event
                    .findOne(
                      { _id: attendee.event, isDelete: false },
                      {
                        _id: 1,
                        title: 1,
                        thumbnail: 1,
                        eventUrl: 1,
                        startDate: 1,
                        startTime: 1,
                        endDate: 1,
                        endTime: 1,
                        timeZone: 1,
                        location: 1,
                      }
                    )
                    .lean();
                  if (eventData !== null) {
                    if (
                      eventData.location !== undefined &&
                      eventData.location !== "" &&
                      eventData.location !== null
                    ) {
                      eventData = {
                        ...eventData,
                        city: eventData.location.address
                          ? eventData.location.city
                          : null,
                        country: eventData.location.address
                          ? eventData.location.country
                          : null,
                      };
                      delete eventData.location;
                      eventList.push(eventData);
                    } else {
                      location = await eventLocation
                        .findOne({
                          event: attendee.event,
                          locationVisible: true,
                          isDelete: false,
                        })
                        .lean();
                      delete eventData.location;
                      if (location !== null) {
                        eventData = {
                          ...eventData,
                          city: location ? location.city : null,
                          country: location ? location.country : null,
                        };
                      } else {
                        eventData = { ...eventData, city: null, country: null };
                      }
                      eventList.push(eventData);
                    }
                  }
                }
              }
            }
          );
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
            const hour24Formate = moment(eventTime, "h:mm a").format("HH:mm");

            // saprate date and time in hours and mins
            const year = moment(eventDate, "MM-DD-YYYY").year();
            const month = moment(eventDate, "MM-DD-YYYY").month();
            const day = moment(eventDate, "MM-DD-YYYY").get("date");
            const hours = moment(hour24Formate, "h:mm a").hours();
            const minutes = moment(hour24Formate, "h:mm a").minutes();

            var endDate = new Date(year, month, day, hours, minutes);
            if (sign === "+") {
              endDate = await subtractTime(
                endDate,
                parseInt(utcHour),
                parseInt(utcMinute)
              );
            } else if (sign === "-") {
              endDate = await addTime(
                endDate,
                parseInt(utcHour),
                parseInt(utcMinute)
              );
            }

            if (endDate >= localDate) {
              eventListData.push(eventList[index]);
            }
          }
        }

        if (eventListData.length > 0) {
          return res.status(200).json({
            status: true,
            message: "Event list retrive.",
            data: eventListData,
          });
        } else {
          return res.status(200).json({
            status: false,
            message: "Event list not found for this user!",
            data: [],
          });
        }
      } else {
        return res.status(200).json({
          status: false,
          message: "Event list not found for this user!",
          data: [],
        });
      }
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get event activity list with session count for user
exports.getEventActivityByEventId = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const role = req.query.role;
    const eventId = new ObjectId(req.params.id);
    const userData = await User.findOne(
      {
        _id: authUser,
        "attendeeDetail.evntData": { $elemMatch: { event: eventId } },
      },
      {
        auth0Id: 1,
        email: 1,
        accessible_groups: 1,
        purchased_plan: 1,
        notificationFor: 1,
        "attendeeDetail.evntData.$": 1,
      }
    );

    let activityList = [];
    var match = {
      event: eventId,
      isDelete: false,
    };

    if (userData !== null && userData !== undefined) {
      if (
        userData.attendeeDetail.evntData[0].member === true &&
        role === "member"
      ) {
        match = { ...match, member: true };
        let attendeeData = await User.findOne(
          {
            _id: authUser,
            "attendeeDetail.evntData": {
              $elemMatch: { event: eventId, [`member`]: true },
            },
          },
          { _id: 1, email: 1, auth0Id: 1, "attendeeDetail.evntData.$": 1 }
        ).lean();

        if (attendeeData !== null) {
          activityList = await eventActivity.aggregate([
            {
              $match: match,
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
                reservedLabelForDetail: 1,
                reservedLabelForListing: 1,
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
        }

        if (activityList.length > 0) {
          return res.status(200).json({
            status: true,
            message: "Event activity list retrive.",
            data: activityList,
          });
        } else {
          return res.status(200).json({
            status: false,
            message: "There is no activity for this member in this event!",
            data: [],
          });
        }
      } else if (
        userData.attendeeDetail.evntData[0].member === false &&
        role === "nonMember"
      ) {
        let attendeeData = await User.findOne(
          {
            _id: authUser,
            "attendeeDetail.evntData": { $elemMatch: { event: eventId } },
          },
          { _id: 1, email: 1, auth0Id: 1, "attendeeDetail.evntData.$": 1 }
        ).lean();

        if (attendeeData !== null) {
          if (
            userData.attendeeDetail.evntData[0].speaker === true &&
            userData.attendeeDetail.evntData[0].member === true
          ) {
            match = { ...match, member: true };
            activityList = await eventActivity.aggregate([
              {
                $match: match,
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
                  reservedLabelForDetail: 1,
                  reservedLabelForListing: 1,
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
          } else if (
            userData.attendeeDetail.evntData[0].speaker === true &&
            userData.attendeeDetail.evntData[0].partner === true
          ) {
            match = { ...match, partner: true };
            activityList = await eventActivity.aggregate([
              {
                $match: match,
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
                        partner: true,
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
                  reservedLabelForDetail: 1,
                  reservedLabelForListing: 1,
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
          } else if (
            userData.attendeeDetail.evntData[0].member === true &&
            userData.attendeeDetail.evntData[0].guest === true
          ) {
            match = { ...match, guest: true };
            activityList = await eventActivity.aggregate([
              {
                $match: match,
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
                        guest: true,
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
                  reservedLabelForDetail: 1,
                  reservedLabelForListing: 1,
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
          } else if (userData.attendeeDetail.evntData[0].speaker === true) {
            match = { ...match, speaker: true };
            activityList = await eventActivity.aggregate([
              {
                $match: match,
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
                        speaker: true,
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
                  reservedLabelForDetail: 1,
                  reservedLabelForListing: 1,
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
          } else if (userData.attendeeDetail.evntData[0].partner === true) {
            match = { ...match, partner: true };
            activityList = await eventActivity.aggregate([
              {
                $match: match,
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
                        partner: true,
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
                  reservedLabelForDetail: 1,
                  reservedLabelForListing: 1,
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
          } else if (userData.attendeeDetail.evntData[0].guest === true) {
            match = { ...match, guest: true };
            activityList = await eventActivity.aggregate([
              {
                $match: match,
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
                        guest: true,
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
                  reservedLabelForDetail: 1,
                  reservedLabelForListing: 1,
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
          }
        }

        if (activityList.length > 0) {
          return res.status(200).json({
            status: true,
            message: "Event activity list retrive.",
            data: activityList,
          });
        } else {
          return res.status(200).json({
            status: false,
            message: "There is no activity for this member in this event!",
            data: [],
          });
        }
      }
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get event by id
exports.getEventActivityById = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const role = req.query.role;
    const activityId = new ObjectId(req.params.id);
    const activityData = await eventActivity.findOne(
      { _id: activityId, isDelete: false },
      { _id: 1, name: 1, event: 1 }
    );
    if (activityData !== null) {
      const userData = await User.findOne(
        {
          _id: authUser,
          "attendeeDetail.evntData": {
            $elemMatch: { event: activityData.event._id },
          },
        },
        {
          auth0Id: 1,
          email: 1,
          accessible_groups: 1,
          purchased_plan: 1,
          notificationFor: 1,
          "attendeeDetail.evntData.$": 1,
        }
      );

      let activityList = [];
      var match = {
        _id: activityId,
        isDelete: false,
      };
      if (userData !== null && userData !== undefined) {
        if (
          userData.attendeeDetail.evntData[0].member === true &&
          role === "member"
        ) {
          match = { ...match, member: true };
          let attendeeData = await User.findOne(
            {
              _id: authUser,
              "attendeeDetail.evntData": {
                $elemMatch: { event: activityData.event._id, [`member`]: true },
              },
            },
            { _id: 1, email: 1, auth0Id: 1, "attendeeDetail.evntData.$": 1 }
          ).lean();
          if (attendeeData !== null) {
            activityList = await eventActivity.aggregate([
              {
                $match: match,
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
                          { $project: { name: 1, location: 1 } },
                        ],
                        as: "room",
                      },
                    },
                    {
                      $unwind: "$room",
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
                              profileImg: "$speakerIcon",
                              attendeeDetail: {
                                _id: "$_id",
                                title: "$attendeeDetail.title",
                                name: "$attendeeDetail.name",
                                firstName: "$attendeeDetail.firstName"
                                  ? "$attendeeDetail.firstName"
                                  : "",
                                lastName: "$attendeeDetail.lastName"
                                  ? "$attendeeDetail.lastName"
                                  : "",
                                email: "$Preferred Email",
                                company: "$attendeeDetail.company",
                                phone: "$attendeeDetail.phone",
                                linkedin: "$attendeeDetail.linkedin",
                              },
                            },
                          },
                        ],
                        as: "speakerId",
                      },
                    },
                    {
                      $project: {
                        _id: 1,
                        title: 1,
                        shortDescription: 1,
                        longDescriptioniv: 1,
                        date: 1,
                        startTime: 1,
                        endTime: 1,
                        room: 1,
                        speakerId: 1,
                        event: 1,
                        reserved: 1,
                        reserved_URL: 1,
                        reservedLabelForListing: 1,
                        reservedLabelForDetail: 1,
                        member: 1,
                        speaker: 1,
                        partner: 1,
                        guest: 1,
                        notifyChanges: 1,
                        notifyChangeText: 1,
                        isEndOrNextDate: 1,
                        endDate: 1,
                        isDelete: 1,
                      },
                    },
                  ],
                  as: "session",
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
                $unwind: {
                  path: "$location",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $addFields: {
                  sessionCount: {
                    $cond: {
                      if: { $isArray: "$session" },
                      then: { $size: "$session" },
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
                  reservedLabelForDetail: 1,
                  reservedLabelForListing: 1,
                  location: {
                    $cond: [
                      {
                        $ifNull: ["$location", false],
                      },
                      "$location",
                      null,
                    ],
                  },
                  session: 1,
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
          }

          if (activityList.length > 0) {
            return res.status(200).json({
              status: true,
              message: "Event activity details retrive.",
              data: activityList[0],
            });
          } else {
            return res.status(200).json({
              status: false,
              message: "There is no activity for this member in this event!",
              data: [],
            });
          }
        } else if (
          userData.attendeeDetail.evntData[0].member === false &&
          role === "nonMember"
        ) {
          let attendeeData = await User.findOne(
            {
              _id: authUser,
              "attendeeDetail.evntData": {
                $elemMatch: { event: activityData.event._id },
              },
            },
            { _id: 1, email: 1, auth0Id: 1, "attendeeDetail.evntData.$": 1 }
          ).lean();

          if (attendeeData !== null) {
            if (
              userData.attendeeDetail.evntData[0].speaker === true &&
              userData.attendeeDetail.evntData[0].member === true
            ) {
              match = { ...match, member: true };
              activityList = await eventActivity.aggregate([
                {
                  $match: match,
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
                            { $project: { name: 1, location: 1 } },
                          ],
                          as: "room",
                        },
                      },
                      {
                        $unwind: "$room",
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
                                profileImg: "$speakerIcon",
                                attendeeDetail: {
                                  _id: "$_id",
                                  title: "$attendeeDetail.title",
                                  name: "$attendeeDetail.name",
                                  firstName: "$attendeeDetail.firstName"
                                    ? "$attendeeDetail.firstName"
                                    : "",
                                  lastName: "$attendeeDetail.lastName"
                                    ? "$attendeeDetail.lastName"
                                    : "",
                                  email: "$Preferred Email",
                                  company: "$attendeeDetail.company",
                                  phone: "$attendeeDetail.phone",
                                  linkedin: "$attendeeDetail.linkedin",
                                },
                              },
                            },
                          ],
                          as: "speakerId",
                        },
                      },
                      {
                        $project: {
                          _id: 1,
                          title: 1,
                          shortDescription: 1,
                          longDescriptioniv: 1,
                          date: 1,
                          startTime: 1,
                          endTime: 1,
                          room: 1,
                          speakerId: 1,
                          event: 1,
                          reserved: 1,
                          reserved_URL: 1,
                          reservedLabelForListing: 1,
                          reservedLabelForDetail: 1,
                          member: 1,
                          speaker: 1,
                          partner: 1,
                          guest: 1,
                          notifyChanges: 1,
                          notifyChangeText: 1,
                          isEndOrNextDate: 1,
                          endDate: 1,
                          isDelete: 1,
                        },
                      },
                    ],
                    as: "session",
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
                  $unwind: {
                    path: "$location",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $addFields: {
                    sessionCount: {
                      $cond: {
                        if: { $isArray: "$session" },
                        then: { $size: "$session" },
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
                    reservedLabelForDetail: 1,
                    reservedLabelForListing: 1,
                    location: {
                      $cond: [
                        {
                          $ifNull: ["$location", false],
                        },
                        "$location",
                        null,
                      ],
                    },
                    session: 1,
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
            } else if (
              userData.attendeeDetail.evntData[0].speaker === true &&
              userData.attendeeDetail.evntData[0].partner === true
            ) {
              match = { ...match, partner: true };
              activityList = await eventActivity.aggregate([
                {
                  $match: match,
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
                            { $project: { name: 1, location: 1 } },
                          ],
                          as: "room",
                        },
                      },
                      {
                        $unwind: "$room",
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
                                profileImg: "$speakerIcon",
                                attendeeDetail: {
                                  _id: "$_id",
                                  title: "$attendeeDetail.title",
                                  name: "$attendeeDetail.name",
                                  firstName: "$attendeeDetail.firstName"
                                    ? "$attendeeDetail.firstName"
                                    : "",
                                  lastName: "$attendeeDetail.lastName"
                                    ? "$attendeeDetail.lastName"
                                    : "",
                                  email: "$Preferred Email",
                                  company: "$attendeeDetail.company",
                                  phone: "$attendeeDetail.phone",
                                  linkedin: "$attendeeDetail.linkedin",
                                },
                              },
                            },
                          ],
                          as: "speakerId",
                        },
                      },
                      {
                        $project: {
                          _id: 1,
                          title: 1,
                          shortDescription: 1,
                          longDescriptioniv: 1,
                          date: 1,
                          startTime: 1,
                          endTime: 1,
                          room: 1,
                          speakerId: 1,
                          event: 1,
                          reserved: 1,
                          reserved_URL: 1,
                          reservedLabelForListing: 1,
                          reservedLabelForDetail: 1,
                          member: 1,
                          speaker: 1,
                          partner: 1,
                          guest: 1,
                          notifyChanges: 1,
                          notifyChangeText: 1,
                          isEndOrNextDate: 1,
                          endDate: 1,
                          isDelete: 1,
                        },
                      },
                    ],
                    as: "session",
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
                  $unwind: {
                    path: "$location",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $addFields: {
                    sessionCount: {
                      $cond: {
                        if: { $isArray: "$session" },
                        then: { $size: "$session" },
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
                    reservedLabelForDetail: 1,
                    reservedLabelForListing: 1,
                    location: {
                      $cond: [
                        {
                          $ifNull: ["$location", false],
                        },
                        "$location",
                        null,
                      ],
                    },
                    session: 1,
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
            } else if (
              userData.attendeeDetail.evntData[0].member === true &&
              userData.attendeeDetail.evntData[0].guest === true
            ) {
              match = { ...match, guest: true };
              activityList = await eventActivity.aggregate([
                {
                  $match: match,
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
                            { $project: { name: 1, location: 1 } },
                          ],
                          as: "room",
                        },
                      },
                      {
                        $unwind: "$room",
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
                                profileImg: "$speakerIcon",
                                attendeeDetail: {
                                  _id: "$_id",
                                  title: "$attendeeDetail.title",
                                  name: "$attendeeDetail.name",
                                  firstName: "$attendeeDetail.firstName"
                                    ? "$attendeeDetail.firstName"
                                    : "",
                                  lastName: "$attendeeDetail.lastName"
                                    ? "$attendeeDetail.lastName"
                                    : "",
                                  email: "$Preferred Email",
                                  company: "$attendeeDetail.company",
                                  phone: "$attendeeDetail.phone",
                                  linkedin: "$attendeeDetail.linkedin",
                                },
                              },
                            },
                          ],
                          as: "speakerId",
                        },
                      },
                      {
                        $project: {
                          _id: 1,
                          title: 1,
                          shortDescription: 1,
                          longDescriptioniv: 1,
                          date: 1,
                          startTime: 1,
                          endTime: 1,
                          room: 1,
                          speakerId: 1,
                          event: 1,
                          reserved: 1,
                          reserved_URL: 1,
                          reservedLabelForListing: 1,
                          reservedLabelForDetail: 1,
                          member: 1,
                          speaker: 1,
                          partner: 1,
                          guest: 1,
                          notifyChanges: 1,
                          notifyChangeText: 1,
                          isEndOrNextDate: 1,
                          endDate: 1,
                          isDelete: 1,
                        },
                      },
                    ],
                    as: "session",
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
                  $unwind: {
                    path: "$location",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $addFields: {
                    sessionCount: {
                      $cond: {
                        if: { $isArray: "$session" },
                        then: { $size: "$session" },
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
                    reservedLabelForDetail: 1,
                    reservedLabelForListing: 1,
                    location: {
                      $cond: [
                        {
                          $ifNull: ["$location", false],
                        },
                        "$location",
                        null,
                      ],
                    },
                    session: 1,
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
            } else if (userData.attendeeDetail.evntData[0].speaker === true) {
              match = { ...match, speaker: true };
              activityList = await eventActivity.aggregate([
                {
                  $match: match,
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
                            { $project: { name: 1, location: 1 } },
                          ],
                          as: "room",
                        },
                      },
                      {
                        $unwind: "$room",
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
                                profileImg: "$speakerIcon",
                                attendeeDetail: {
                                  _id: "$_id",
                                  title: "$attendeeDetail.title",
                                  name: "$attendeeDetail.name",
                                  firstName: "$attendeeDetail.firstName"
                                    ? "$attendeeDetail.firstName"
                                    : "",
                                  lastName: "$attendeeDetail.lastName"
                                    ? "$attendeeDetail.lastName"
                                    : "",
                                  email: "$Preferred Email",
                                  company: "$attendeeDetail.company",
                                  phone: "$attendeeDetail.phone",
                                  linkedin: "$attendeeDetail.linkedin",
                                },
                              },
                            },
                          ],
                          as: "speakerId",
                        },
                      },
                      {
                        $project: {
                          _id: 1,
                          title: 1,
                          shortDescription: 1,
                          longDescriptioniv: 1,
                          date: 1,
                          startTime: 1,
                          endTime: 1,
                          room: 1,
                          speakerId: 1,
                          event: 1,
                          reserved: 1,
                          reserved_URL: 1,
                          reservedLabelForListing: 1,
                          reservedLabelForDetail: 1,
                          member: 1,
                          speaker: 1,
                          partner: 1,
                          guest: 1,
                          notifyChanges: 1,
                          notifyChangeText: 1,
                          isEndOrNextDate: 1,
                          endDate: 1,
                          isDelete: 1,
                        },
                      },
                    ],
                    as: "session",
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
                  $unwind: {
                    path: "$location",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $addFields: {
                    sessionCount: {
                      $cond: {
                        if: { $isArray: "$session" },
                        then: { $size: "$session" },
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
                    reservedLabelForDetail: 1,
                    reservedLabelForListing: 1,
                    location: {
                      $cond: [
                        {
                          $ifNull: ["$location", false],
                        },
                        "$location",
                        null,
                      ],
                    },
                    session: 1,
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
            } else if (userData.attendeeDetail.evntData[0].partner === true) {
              match = { ...match, partner: true };
              activityList = await eventActivity.aggregate([
                {
                  $match: match,
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
                            { $project: { name: 1, location: 1 } },
                          ],
                          as: "room",
                        },
                      },
                      {
                        $unwind: "$room",
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
                                profileImg: "$speakerIcon",
                                attendeeDetail: {
                                  _id: "$_id",
                                  title: "$attendeeDetail.title",
                                  name: "$attendeeDetail.name",
                                  firstName: "$attendeeDetail.firstName"
                                    ? "$attendeeDetail.firstName"
                                    : "",
                                  lastName: "$attendeeDetail.lastName"
                                    ? "$attendeeDetail.lastName"
                                    : "",
                                  email: "$Preferred Email",
                                  company: "$attendeeDetail.company",
                                  phone: "$attendeeDetail.phone",
                                  linkedin: "$attendeeDetail.linkedin",
                                },
                              },
                            },
                          ],
                          as: "speakerId",
                        },
                      },
                      {
                        $project: {
                          _id: 1,
                          title: 1,
                          shortDescription: 1,
                          longDescriptioniv: 1,
                          date: 1,
                          startTime: 1,
                          endTime: 1,
                          room: 1,
                          speakerId: 1,
                          event: 1,
                          reserved: 1,
                          reserved_URL: 1,
                          reservedLabelForListing: 1,
                          reservedLabelForDetail: 1,
                          member: 1,
                          speaker: 1,
                          partner: 1,
                          guest: 1,
                          notifyChanges: 1,
                          notifyChangeText: 1,
                          isEndOrNextDate: 1,
                          endDate: 1,
                          isDelete: 1,
                        },
                      },
                    ],
                    as: "session",
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
                  $unwind: {
                    path: "$location",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $addFields: {
                    sessionCount: {
                      $cond: {
                        if: { $isArray: "$session" },
                        then: { $size: "$session" },
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
                    reservedLabelForDetail: 1,
                    reservedLabelForListing: 1,
                    location: {
                      $cond: [
                        {
                          $ifNull: ["$location", false],
                        },
                        "$location",
                        null,
                      ],
                    },
                    session: 1,
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
            } else if (userData.attendeeDetail.evntData[0].guest === true) {
              match = { ...match, guest: true };
              activityList = await eventActivity.aggregate([
                {
                  $match: match,
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
                            { $project: { name: 1, location: 1 } },
                          ],
                          as: "room",
                        },
                      },
                      {
                        $unwind: "$room",
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
                                profileImg: "$speakerIcon",
                                attendeeDetail: {
                                  _id: "$_id",
                                  title: "$attendeeDetail.title",
                                  name: "$attendeeDetail.name",
                                  firstName: "$attendeeDetail.firstName"
                                    ? "$attendeeDetail.firstName"
                                    : "",
                                  lastName: "$attendeeDetail.lastName"
                                    ? "$attendeeDetail.lastName"
                                    : "",
                                  email: "$Preferred Email",
                                  company: "$attendeeDetail.company",
                                  phone: "$attendeeDetail.phone",
                                  linkedin: "$attendeeDetail.linkedin",
                                },
                              },
                            },
                          ],
                          as: "speakerId",
                        },
                      },
                      {
                        $project: {
                          _id: 1,
                          title: 1,
                          shortDescription: 1,
                          longDescriptioniv: 1,
                          date: 1,
                          startTime: 1,
                          endTime: 1,
                          room: 1,
                          speakerId: 1,
                          event: 1,
                          reserved: 1,
                          reserved_URL: 1,
                          reservedLabelForListing: 1,
                          reservedLabelForDetail: 1,
                          member: 1,
                          speaker: 1,
                          partner: 1,
                          guest: 1,
                          notifyChanges: 1,
                          notifyChangeText: 1,
                          isEndOrNextDate: 1,
                          endDate: 1,
                          isDelete: 1,
                        },
                      },
                    ],
                    as: "session",
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
                  $unwind: {
                    path: "$location",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $addFields: {
                    sessionCount: {
                      $cond: {
                        if: { $isArray: "$session" },
                        then: { $size: "$session" },
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
                    reservedLabelForDetail: 1,
                    reservedLabelForListing: 1,
                    location: {
                      $cond: [
                        {
                          $ifNull: ["$location", false],
                        },
                        "$location",
                        null,
                      ],
                    },
                    session: 1,
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
            }
          }

          if (activityList.length > 0) {
            return res.status(200).json({
              status: true,
              message: "Event activity details retrive.",
              data: activityList[0],
            });
          } else {
            return res.status(200).json({
              status: false,
              message: "There is no activity for this member in this event!",
              data: [],
            });
          }
        }
      }
    } else {
      return res
        .status(404)
        .json({ status: false, message: "activity data not found!", data: {} });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get event by for user
exports.getEventById = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const eventId = new ObjectId(req.params.id);
    const getEventAttendeeEmail = await User.findOne(
      {
        _id: authUser,
        "attendeeDetail.evntData": { $elemMatch: { event: ObjectId(eventId) } },
      },
      { "attendeeDetail.evntData.$": 1 }
    );
    if (getEventAttendeeEmail !== null) {
      if (
        getEventAttendeeEmail.attendeeDetail.evntData[0].member ||
        getEventAttendeeEmail.attendeeDetail.evntData[0].speaker ||
        getEventAttendeeEmail.attendeeDetail.evntData[0].partner ||
        getEventAttendeeEmail.attendeeDetail.evntData[0].guest
      ) {
        const eventData = await event.aggregate([
          {
            $match: {
              _id: eventId,
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
              privateProfile: {
                $let: {
                  vars: {
                    test: {
                      $filter: {
                        input: getEventAttendeeEmail.attendeeDetail.evntData,
                        cond: {
                          $and: [
                            { $eq: [eventId, "$$this.event"] },
                            { $eq: [true, "$$this.privateProfile"] },
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

        if (eventData.length > 0) {
          var eventDetails = eventData[0];
          var userRole = [];
          if (
            getEventAttendeeEmail.attendeeDetail &&
            getEventAttendeeEmail.attendeeDetail !== undefined &&
            getEventAttendeeEmail.attendeeDetail.evntData !== undefined &&
            getEventAttendeeEmail.attendeeDetail.evntData[0]
          ) {
            let attendeeRole = getEventAttendeeEmail.attendeeDetail.evntData[0];
            if (attendeeRole.member === true) {
              userRole.push("member");
            }
            if (attendeeRole.speaker === true) {
              userRole.push("speaker");
            }
            if (attendeeRole.partner === true) {
              userRole.push("partner");
            }
            if (attendeeRole.guest === true) {
              userRole.push("guest");
            }
          }
          eventDetails = { ...eventDetails, role: userRole };

          return res.status(200).json({
            status: true,
            message: "Event detail retrive!",
            data: eventDetails,
          });
        } else {
          return res.status(200).json({
            status: false,
            message: "Something went wrong while getting event!",
          });
        }
      } else {
        return res.status(200).json({
          status: false,
          message: "Event details not found for this user!",
          data: {},
        });
      }
    } else {
      return res.status(200).json({
        status: false,
        message: "Event details not found for this user!",
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

// get event attendees
exports.getEventAttendeesByEventId = async (req, res) => {
  try {
    const eventId = new ObjectId(req.params.id);
    const eventData = await eventAttendees.aggregate([
      {
        $match: {
          event: eventId,
          isDelete: false,
        },
      },
    ]);

    if (eventData)
      return res.status(200).json({
        status: true,
        message: "Event detail retrive!",
        data: eventData,
      });
    else
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting event!",
      });
  } catch (e) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: e });
  }
};

// get event attendees list
exports.getEventAttendeeList = async (req, res) => {
  try {
    const eventId = ObjectId(req.params.id);
    const menberDetails = await User.aggregate([
      {
        $match: {
          "attendeeDetail.evntData": {
            $elemMatch: { event: eventId, member: true },
          },
        },
      },
      {
        $project: {
          _id: 1,
          auth0Id: 1,
          email: "$Preferred Email",
          type: "Member",
          title: "$attendeeDetail.title",
          name: "$attendeeDetail.name",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          event: eventId,
          profileImg: "$profileImg",
          privateProfile: {
            $let: {
              vars: {
                test: {
                  $filter: {
                    input: "$attendeeDetail.evntData",
                    cond: {
                      $and: [
                        { $eq: [eventId, "$$this.event"] },
                        { $eq: [true, "$$this.privateProfile"] },
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

    const speakerDetails = await User.aggregate([
      {
        $match: {
          "attendeeDetail.evntData": {
            $elemMatch: { event: eventId, speaker: true },
          },
        },
      },
      {
        $project: {
          _id: 1,
          auth0Id: 1,
          email: "$Preferred Email",
          type: "Speaker",
          title: "$attendeeDetail.title",
          name: "$attendeeDetail.name",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          event: eventId,
          profileImg: "$speakerIcon",
          privateProfile: {
            $let: {
              vars: {
                test: {
                  $filter: {
                    input: "$attendeeDetail.evntData",
                    cond: {
                      $and: [
                        { $eq: [eventId, "$$this.event"] },
                        { $eq: [true, "$$this.privateProfile"] },
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

    var parnerEmailList = [
      "bryana@tacticallogistic.com",
      "gonzalo.martin@thras.io",
      "alexander.swade@thrasio.com",
      "clayton@carbon6.io",
      "tim@carbon6.io",
      "piers@getida.com",
      "alejandro@goyaba.co",
      "vittorio@goyaba.co",
      "peterpaul@intellivy.net",
      "susan@thorn-crest.com",
      "keaton@assureful.com",
      "rohit@assureful.com",
      "alex@assureful.com",
      "nadine@bidx.io",
      "david@goyaba.co",
    ];

    const peartnerDetails = await User.aggregate([
      {
        $match: {
          "Preferred Email": { $nin: parnerEmailList },
          "attendeeDetail.evntData": {
            $elemMatch: { event: eventId, partner: true },
          },
        },
      },
      { $unwind: "$attendeeDetail.evntData" },
      {
        $match: {
          "attendeeDetail.evntData.event": eventId,
        },
      },
      {
        $sort: { "attendeeDetail.evntData.partnerOrder": 1 },
      },
      {
        $project: {
          _id: 1,
          auth0Id: 1,
          email: "$Preferred Email",
          type: "Partner",
          title: "$attendeeDetail.title",
          name: "$attendeeDetail.name",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          event: eventId,
          profileImg: "$partnerIcon",
          privateProfile: "$attendeeDetail.evntData.privateProfile",
        },
      },
    ]);

    const guestDetails = await User.aggregate([
      {
        $match: {
          "attendeeDetail.evntData": {
            $elemMatch: { event: eventId, guest: true },
          },
        },
      },
      {
        $project: {
          _id: 1,
          auth0Id: 1,
          email: "$Preferred Email",
          type: "Guest",
          title: "$attendeeDetail.title",
          name: "$attendeeDetail.name",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          event: eventId,
          profileImg: "$guestIcon",
          privateProfile: {
            $let: {
              vars: {
                test: {
                  $filter: {
                    input: "$attendeeDetail.evntData",
                    cond: {
                      $and: [
                        { $eq: [eventId, "$$this.event"] },
                        { $eq: [true, "$$this.privateProfile"] },
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

    return res.status(200).json({
      status: true,
      speaker: speakerDetails,
      member: menberDetails,
      guest: guestDetails,
      partner: peartnerDetails,
    });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get upcomming event list and past event list
exports.getUpCommingEventList = async (req, res) => {
  try {
    const localDate = new Date(req.query.localDate);
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const authUser = req.authUserId;
    const userData = await User.findById(authUser).select(
      "auth0Id email accessible_groups purchased_plan"
    );
    let upCommingEvents = [],
      location = {};
    let count = 0;

    const eventListData = await event.aggregate([
      {
        $match: {
          isDelete: false,
          $or: [
            { eventAccess: "public" },
            { eventAccess: "admin/staff" },
            {
              $or: [
                { "restrictedAccessMemberships.0": { $exists: true } },
                { eventAccess: "restricted" },
                { restrictedAccessGroups: { $in: userData.accessible_groups } },
                {
                  $expr: {
                    $in: [
                      userData.purchased_plan,
                      "$restrictedAccessMemberships",
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: "eventlocations",
          let: { event_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$event", "$$event_id"],
                },
              },
            },
            { $project: { country: 1, city: 1 } },
          ],
          as: "location",
        },
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          thumbnail: 1,
          eventUrl: 1,
          startDate: 1,
          startTime: 1,
          endDate: 1,
          endTime: 1,
          timeZone: 1,
          location: 1,
        },
      },
    ]);

    if (eventListData.length > 0) {
      for (let index = 0; index < eventListData.length; index++) {
        // Input date and time
        const eventDate = eventListData[index].startDate;
        const eventTime = eventListData[index].startTime;
        const timeZone = eventListData[index].timeZone;

        // Create a new Date object using the input date and time
        const sign = timeZone.substring(4, 5);
        const utcHour = timeZone.substring(5, 7);
        const utcMinute = timeZone.substring(8, 10);
        const hour24Formate = moment(eventTime, "h:mm a").format("HH:mm");

        // saprate date and time in hours and mins
        const year = moment(eventDate, "MM-DD-YYYY").year();
        const month = moment(eventDate, "MM-DD-YYYY").month();
        const day = moment(eventDate, "MM-DD-YYYY").get("date");
        const hours = moment(hour24Formate, "h:mm a").hours();
        const minutes = moment(hour24Formate, "h:mm a").minutes();

        var startDate = new Date(year, month, day, hours, minutes);
        if (sign === "+") {
          startDate = await subtractTime(
            startDate,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        } else if (sign === "-") {
          startDate = await addTime(
            startDate,
            parseInt(utcHour),
            parseInt(utcMinute)
          );
        }

        if (startDate >= localDate) {
          if (eventListData[index] !== null) {
            if (
              eventListData[index].location !== undefined &&
              eventListData[index].location !== "" &&
              eventListData[index].location !== null
            ) {
              location = await eventLocation
                .findOne({
                  _id: eventListData[index].location,
                  isDelete: false,
                })
                .lean();
              delete eventListData[index].location;
            } else {
              location = await eventLocation
                .findOne({
                  event: eventListData[index]._id,
                  locationVisible: true,
                  isDelete: false,
                })
                .lean();
              delete eventListData[index].location;
            }
            if (location !== null) {
              eventListData[index] = {
                ...eventListData[index],
                city: location.city,
                country: location.country,
              };
              upCommingEvents.push(eventListData[index]);
              count++;
            }
          }
        }
      }

      if (upCommingEvents.length > 0) {
        return res.status(200).json({
          status: true,
          message: "Event list retrive!",
          data: {
            upCommingEvents: upCommingEvents,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalMessages: count,
          },
        });
      } else {
        return res.status(200).json({
          status: true,
          message: "There is no upcomming events for this user!",
          data: {
            upCommingEvents: upCommingEvents,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalMessages: count,
          },
        });
      }
    } else {
      return res.status(200).json({
        status: true,
        message: "There is no upcomming events for this user!",
        data: {
          upCommingEvents: upCommingEvents,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalMessages: count,
        },
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get past event yesr listing for user
exports.getPastEventYearList = async (req, res) => {
  try {
    var localDate = new Date(req.query.localDate);
    localDate = moment(localDate, "YYYY-MM-DD").toDate();
    const authUser = req.authUserId;
    const userData = await User.findById(authUser).select(
      "auth0Id accessible_groups purchased_plan"
    );
    var year = [];

    const aggregatePipeline = [
      {
        $addFields: {
          Date: {
            $let: {
              vars: {
                year: { $substr: ["$startDate", 6, 10] },
                month: { $substr: ["$startDate", 0, 2] },
                dayOfMonth: { $substr: ["$startDate", 3, 5] },
              },
              in: {
                $toDate: {
                  $concat: ["$$year", "-", "$$month", "-", "$$dayOfMonth"],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          year: { $substr: ["$startDate", 6, 10] },
        },
      },
      {
        $match: {
          isDelete: false,
          Date: { $lt: localDate },
          $or: [
            { eventAccess: "public" },
            { eventAccess: "admin/staff" },
            {
              $and: [
                { eventAccess: "restricted" },
                { "restrictedAccessMemberships.0": { $exists: true } },
                { restrictedAccessGroups: { $in: userData.accessible_groups } },
                {
                  $expr: {
                    $in: [
                      userData.purchased_plan,
                      "$restrictedAccessMemberships",
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
      { $sort: { Date: -1 } },
    ];

    const eventListData = await event.aggregate([
      ...aggregatePipeline,
      {
        $project: {
          _id: 0,
          year: 1,
        },
      },
    ]);

    eventListData.map((eventData) => {
      year.push(eventData.year);
    });
    function onlyUnique(value, index, array) {
      return array.indexOf(value) === index;
    }
    year = year.filter(onlyUnique);

    if (eventListData.length > 0) {
      return res
        .status(200)
        .json({ status: true, message: "Event list retrive!", data: year });
    } else {
      return res.status(200).json({
        status: false,
        message: "There is no past events for this user!",
        data: [],
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get past event yesr listing for user
exports.getPastEventYearFilterList = async (req, res) => {
  try {
    var localDate = new Date(req.query.localDate);
    localDate = moment(localDate, "YYYY-MM-DD").toDate();
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const authUser = req.authUserId;
    const userData = await User.findById(authUser).select(
      "auth0Id accessible_groups purchased_plan"
    );

    var match = {
      isDelete: false,
    };

    var year = "";
    if (req.query.year) {
      year = req.query.year;
      match = { ...match, year: year };
    }

    const aggregatePipeline = [
      {
        $addFields: {
          Date: {
            $let: {
              vars: {
                year: { $substr: ["$startDate", 6, 10] },
                month: { $substr: ["$startDate", 0, 2] },
                dayOfMonth: { $substr: ["$startDate", 3, 5] },
              },
              in: {
                $toDate: {
                  $concat: ["$$year", "-", "$$month", "-", "$$dayOfMonth"],
                },
              },
            },
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
            {
              $and: [
                { eventAccess: "restricted" },
                { "restrictedAccessMemberships.0": { $exists: true } },
                { restrictedAccessGroups: { $in: userData.accessible_groups } },
                {
                  $expr: {
                    $in: [
                      userData.purchased_plan,
                      "$restrictedAccessMemberships",
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
      { $sort: { Date: -1 } },
    ];

    const eventListData = await event.aggregate([
      ...aggregatePipeline,
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          thumbnail: 1,
          eventUrl: 1,
          startDate: 1,
          startTime: 1,
          endDate: 1,
          endTime: 1,
          timeZone: 1,
          city: "$location.city",
          country: "$location.country",
          Date: 1,
          year: 1,
        },
      },
    ]);

    const count = await event.aggregate([...aggregatePipeline]);

    if (eventListData.length > 0) {
      return res.status(200).json({
        status: true,
        message: "Event list retrive!",
        data: {
          pastEvents: eventListData,
          totalPages: Math.ceil(count.length / limit),
          currentPage: page,
          totalEvents: count.length,
        },
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "There is no past events for this user!",
        data: {
          pastEvents: [],
          totalPages: Math.ceil(count.length / limit),
          currentPage: page,
          totalEvents: count.length,
        },
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get past event list for user
exports.getPastEventList = async (req, res) => {
  try {
    var localDate = new Date(req.query.localDate);
    localDate = moment(localDate, "YYYY-MM-DD").toDate();
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const aggregatePipeline = [
      {
        $addFields: {
          Date: {
            $let: {
              vars: {
                year: { $substr: ["$startDate", 6, 10] },
                month: { $substr: ["$startDate", 0, 2] },
                dayOfMonth: { $substr: ["$startDate", 3, 5] },
              },
              in: {
                $toDate: {
                  $concat: ["$$year", "-", "$$month", "-", "$$dayOfMonth"],
                },
              },
            },
          },
        },
      },
      {
        $match: {
          isDelete: false,
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

    const eventListData = await event.aggregate([
      ...aggregatePipeline,
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          thumbnail: 1,
          eventUrl: 1,
          startDate: 1,
          startTime: 1,
          endDate: 1,
          endTime: 1,
          timeZone: 1,
          city: "$location.city",
          country: "$location.country",
          Date: 1,
        },
      },
    ]);

    const count = await event.aggregate([...aggregatePipeline]);

    if (eventListData.length > 0) {
      return res.status(200).json({
        status: true,
        message: "Event list retrive!",
        data: {
          pastEvents: eventListData,
          totalPages: Math.ceil(count.length / limit),
          currentPage: page,
          totalEvents: count.length,
        },
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "There is no past events for this user!",
        data: {
          pastEvents: [],
          totalPages: Math.ceil(count.length / limit),
          currentPage: page,
          totalEvents: count.length,
        },
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get past event details by Id for user
exports.getPastEventById = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const eventId = new ObjectId(req.params.id);

    const getEventAttendeeEmail = await User.findOne(
      {
        _id: authUser,
        "attendeeDetail.evntData": { $elemMatch: { event: ObjectId(eventId) } },
      },
      { "attendeeDetail.evntData.$": 1 }
    );
    const activityData = await eventActivity.find(
      { event: eventId, isDelete: false },
      { _id: 1, title: 1 }
    );

    const eventData = await event.aggregate([
      {
        $match: {
          _id: eventId,
          isDelete: false,
        },
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
                $ifNull: ["$isLocation", false],
              },
              ["$location"],
              [],
            ],
          },
          contactSupport: 1,
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
      if (
        getEventAttendeeEmail !== null &&
        (getEventAttendeeEmail.attendeeDetail.evntData[0].member ||
          getEventAttendeeEmail.attendeeDetail.evntData[0].speaker ||
          getEventAttendeeEmail.attendeeDetail.evntData[0].partner ||
          getEventAttendeeEmail.attendeeDetail.evntData[0].guest) &&
        activityData.length > 0
      ) {
        eventDetails = { ...eventDetails, showScheduleDetail: true };
      } else {
        eventDetails = { ...eventDetails, showScheduleDetail: false };
      }
      return res.status(200).json({
        status: true,
        message: "Event detail retrive!",
        data: eventDetails,
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "Something went wrong while getting event!",
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get attendees profile details
exports.getEventAttendeeProfile = async (req, res) => {
  try {
    const attendeeId = ObjectId(req.params.id);
    const eventId = ObjectId(req.query.eventId);
    const role = req.query.role;
    let attendeeProfile = [];

    switch (role) {
      case "member":
        attendeeProfile = await User.aggregate([
          {
            $match: {
              _id: attendeeId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: eventId, [`${role}`]: true },
              },
            },
          },
          {
            $project: {
              _id: 1,
              auth0Id: 1,
              email: "$Preferred Email",
              type: "Member",
              title: "$attendeeDetail.title",
              name: "$attendeeDetail.name",
              firstName: "$attendeeDetail.firstName"
                ? "$attendeeDetail.firstName"
                : "",
              lastName: "$attendeeDetail.lastName"
                ? "$attendeeDetail.lastName"
                : "",
              company: "$attendeeDetail.company",
              profession: "$attendeeDetail.profession",
              phone: "$attendeeDetail.phone",
              facebook: "$attendeeDetail.facebook",
              linkedin: "$attendeeDetail.linkedin",
              description: "$attendeeDetail.description" ?? "",
              offer: "$attendeeDetail.offer" ?? "",
              contactPartnerName: "$attendeeDetail.contactPartnerName" ?? "",
              event: eventId,
              profileImg: "$profileImg",
            },
          },
        ]);
        if (attendeeProfile.length > 0) {
          return res.status(200).json({
            status: true,
            message: "Attendees details retrive.",
            data: attendeeProfile[0],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: "Member attendees details not found!",
          });
        }
        break;
      case "speaker":
        attendeeProfile = await User.aggregate([
          {
            $match: {
              _id: attendeeId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: eventId, [`${role}`]: true },
              },
            },
          },
          {
            $project: {
              _id: 1,
              auth0Id: 1,
              email: "$Preferred Email",
              type: "Speaker",
              title: "$attendeeDetail.title",
              name: "$attendeeDetail.name",
              firstName: "$attendeeDetail.firstName"
                ? "$attendeeDetail.firstName"
                : "",
              lastName: "$attendeeDetail.lastName"
                ? "$attendeeDetail.lastName"
                : "",
              company: "$attendeeDetail.company",
              profession: "$attendeeDetail.profession",
              phone: "$attendeeDetail.phone",
              facebook: "$attendeeDetail.facebook",
              linkedin: "$attendeeDetail.linkedin",
              description: "$attendeeDetail.description" ?? "",
              offer: "$attendeeDetail.offer" ?? "",
              contactPartnerName: "$attendeeDetail.contactPartnerName" ?? "",
              event: eventId,
              profileImg: "$speakerIcon",
            },
          },
        ]);

        if (attendeeProfile.length > 0) {
          attendeeProfile = attendeeProfile[0];
          const sessionList = await eventSession.aggregate([
            {
              $match: {
                event: attendeeProfile.event,
                "speakerId.0": { $exists: true },
                $expr: { $in: [attendeeId, "$speakerId"] },
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
                  { $project: { name: 1, location: 1 } },
                ],
                as: "room",
              },
            },
            {
              $unwind: "$room",
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
                  {
                    $lookup: {
                      from: "eventtypes",
                      let: { type_id: "$type" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$_id", "$$type_id"],
                            },
                            isDelete: false,
                          },
                        },
                        { $project: { name: 1, _id: 0 } },
                      ],
                      as: "type",
                    },
                  },
                  { $unwind: "$type" },
                  {
                    $project: {
                      title: 1,
                      thumbnail: 1,
                      shortDescription: 1,
                      longDescription: 1,
                      eventUrl: 1,
                      type: "$type.name",
                      timeZone: 1,
                      startDate: 1,
                      startTime: 1,
                      endDate: 1,
                      endTime: 1,
                      eventAccess: 1,
                      restrictedAccessGroups: 1,
                      restrictedAccessMemberships: 1,
                      photos: 1,
                    },
                  },
                ],
                as: "events",
              },
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
                      profileImg: "$speakerIcon" ? "$speakerIcon" : "",
                      attendeeDetail: {
                        title: "$attendeeDetail.title",
                        name: "$attendeeDetail.name",
                        firstName: "$attendeeDetail.firstName"
                          ? "$attendeeDetail.firstName"
                          : "",
                        lastName: "$attendeeDetail.lastName"
                          ? "$attendeeDetail.lastName"
                          : "",
                        company: "$attendeeDetail.company",
                        profession: "$attendeeDetail.profession",
                        phone: "$attendeeDetail.phone",
                        facebook: "$attendeeDetail.facebook",
                        linkedin: "$attendeeDetail.linkedin",
                        auth0Id: "$attendeeDetail.auth0Id",
                        description: "$attendeeDetail.description" ?? "",
                        offer: "$attendeeDetail.offer" ?? "",
                        contactPartnerName:
                          "$attendeeDetail.contactPartnerName" ?? "",
                      },
                    },
                  },
                ],
                as: "speakerId",
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                date: 1,
                startTime: 1,
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
                isDelete: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ]);
          if (sessionList.length > 0) {
            attendeeProfile = { ...attendeeProfile, sessionList: sessionList };
          }

          return res.status(200).json({
            status: true,
            message: "Attendees details retrive.",
            data: attendeeProfile,
          });
        } else {
          return res.status(200).json({
            status: false,
            message: "Speaker attendees details not found!",
          });
        }
        break;
      case "partner":
        attendeeProfile = await User.aggregate([
          {
            $match: {
              _id: attendeeId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: eventId, [`${role}`]: true },
              },
            },
          },
          {
            $project: {
              _id: 1,
              auth0Id: 1,
              email: "$Preferred Email",
              type: "Partner",
              title: "$attendeeDetail.title",
              name: "$attendeeDetail.name",
              firstName: "$attendeeDetail.firstName"
                ? "$attendeeDetail.firstName"
                : "",
              lastName: "$attendeeDetail.lastName"
                ? "$attendeeDetail.lastName"
                : "",
              company: "$attendeeDetail.company",
              profession: "$attendeeDetail.profession",
              phone: "$attendeeDetail.phone",
              facebook: "$attendeeDetail.facebook",
              linkedin: "$attendeeDetail.linkedin",
              description: "$attendeeDetail.description" ?? "",
              offer: "$attendeeDetail.offer" ?? "",
              contactPartnerName: "$attendeeDetail.contactPartnerName" ?? "",
              event: eventId,
              profileImg: "$partnerIcon",
            },
          },
        ]);
        if (attendeeProfile.length > 0) {
          return res.status(200).json({
            status: true,
            message: "Attendees details retrive.",
            data: attendeeProfile[0],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: "Partner attendees details not found!",
          });
        }
        break;
      case "guest":
        attendeeProfile = await User.aggregate([
          {
            $match: {
              _id: attendeeId,
              "attendeeDetail.evntData": {
                $elemMatch: { event: eventId, [`${role}`]: true },
              },
            },
          },
          {
            $project: {
              _id: 1,
              auth0Id: 1,
              email: "$Preferred Email",
              type: "Guest",
              title: "$attendeeDetail.title",
              name: "$attendeeDetail.name",
              firstName: "$attendeeDetail.firstName"
                ? "$attendeeDetail.firstName"
                : "",
              lastName: "$attendeeDetail.lastName"
                ? "$attendeeDetail.lastName"
                : "",
              company: "$attendeeDetail.company",
              profession: "$attendeeDetail.profession",
              phone: "$attendeeDetail.phone",
              facebook: "$attendeeDetail.facebook",
              linkedin: "$attendeeDetail.linkedin",
              description: "$attendeeDetail.description" ?? "",
              offer: "$attendeeDetail.offer" ?? "",
              event: eventId,
              profileImg: "$guestIcon",
            },
          },
        ]);
        if (attendeeProfile.length > 0) {
          return res.status(200).json({
            status: true,
            message: "Attendees details retrive.",
            data: attendeeProfile[0],
          });
        } else {
          return res.status(200).json({
            status: false,
            message: "Guest attendee details not found!",
          });
        }
        break;
      default:
        break;
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// get attendees profile details for chat
exports.getAttendeeWithoutEventById = async (req, res) => {
  try {
    const attendeeId = ObjectId(req.params.id);

    const attendeeProfile = await User.aggregate([
      {
        $match: {
          _id: attendeeId,
        },
      },
      {
        $project: {
          _id: 1,
          auth0Id: 1,
          email: "$Preferred Email",
          type: "",
          title: "$attendeeDetail.title",
          name: "$attendeeDetail.name",
          firstName: "$attendeeDetail.firstName"
            ? "$attendeeDetail.firstName"
            : "",
          lastName: "$attendeeDetail.lastName"
            ? "$attendeeDetail.lastName"
            : "",
          company: "$attendeeDetail.company",
          profession: "$attendeeDetail.profession",
          phone: "$attendeeDetail.phone",
          facebook: "$attendeeDetail.facebook",
          linkedin: "$attendeeDetail.linkedin",
          description: "$attendeeDetail.description" ?? "",
          offer: "$attendeeDetail.offer" ?? "",
          contactPartnerName: "$attendeeDetail.contactPartnerName" ?? "",
          event: "",
          profileImg: "$profileImg",
        },
      },
    ]);

    if (attendeeProfile.length > 0) {
      return res.status(200).json({
        status: true,
        message: "Attendees details retrive.",
        data: attendeeProfile[0],
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Attendee details not found!" });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// common function
exports.getJobs = function () {
  return scheduleLib.scheduledJobs;
};

// setup and send notification in case of schedule event or session or activity notification
exports.scheduleNotificationForEventActivitySession = async (req, res) => {
  try {
    const authUserId = req.authUserId;
    const body = req.body;
    let chatData = {},
      data = {},
      notificationData = {},
      notification_for = {};
    const scheduleFor = body.scheduleFor;
    const userData = await User.findOne({ _id: ObjectId(authUserId) });
    const userName = userData.otherdetail
      ? userData.otherdetail[process.env.USER_FN_ID] +
      " " +
      userData.otherdetail[process.env.USER_LN_ID]
      : "";
    const eventID = body.eventId ? ObjectId(body.eventId) : null;
    const activityID = body.activityId ? ObjectId(body.activityId) : null;
    const sessionID = body.sessionId ? ObjectId(body.sessionId) : null;
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
          reservedLabelForListing: 1,
          reservedLabelForDetail: 1,
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

    if (eventID !== null && activityID === null && sessionID === null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "event") {
        // Check if user has added notification for event or not
        const NotificationFor = {
          id: eventID,
          type: scheduleFor,
          setBy: "user",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: { $elemMatch: { id: eventID, setBy: "user" } },
          },
          { "notificationFor.$": 1 }
        );

        if (eventData !== undefined) {
          if (alreadyAdded === null) {
            notification_for = await User.findOneAndUpdate(
              { _id: userData._id },
              { $push: { notificationFor: NotificationFor } },
              { new: true }
            );

            const date = eventData.startDate;
            const eventTime = eventData.startTime;
            const timeZone = eventData.timeZone;
            const sign = timeZone.substring(4, 5);
            const utcHour = timeZone.substring(5, 7);
            const utcMinute = timeZone.substring(8, 10);
            const before30MinTime = moment(eventTime, "h:mm a")
              .subtract(15, "minutes")
              .format("HH:mm");
            console.log(before30MinTime, "15MinLog");

            // saprate date and time in hours and mins
            const year = moment(date, "MM-DD-YYYY").year();
            const month = moment(date, "MM-DD-YYYY").month(); // Month is zero-indexed
            const day = moment(date, "MM-DD-YYYY").get("date");
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
              eventImage: eventData.thumbnail,
              eventDate: eventData.startDate,
              eventTime: eventData.startTime,
              chatType: "eventReminder",
            };

            notificationData = {
              receiverName: userName,
              eventName: eventData.title ? eventData.title : "",
              chatType: "eventReminder",
            };

            let notificationTemplate =
              await notification_template.user_event_reminder(notificationData);
            let userDeviceToken = await User.findOne(
              { _id: userData._id },
              { deviceToken: 1 }
            );

            data = {
              receiverName: userName,
              notificationName: eventData.title ? eventData.title : "",
              notificationIdFor: eventData._id,
              notificationDate: eventData.startDate,
              notificationTime: eventData.startTime,
              scheduleTime: scheduleTime,
              notificationTemplate: notificationTemplate,
              userDeviceToken: userDeviceToken,
              chatData: chatData,
              userData: userData,
              scheduleFor: scheduleFor,
              createdBy: "user",
              messageType: "user_event_reminder",
            };
            await new Notification({
              title: notificationTemplate?.template?.title,
              body: notificationTemplate?.template?.body,
              createdBy: process.env.ADMIN_ID,
              createdFor: userData._id,
              read: true,
              role: "eventReminder",
            }).save();

            // scheduleNotification main function
            const scheduleNotification = await schedule(data);

            if (scheduleNotification.status === true) {
              return res.status(200).json({
                status: true,
                message: "Event notification schedule successfully.",
                data: {
                  id: scheduleNotification.data,
                  notificationFlag: true,
                },
              });
            } else {
              return res.status(200).json({
                status: false,
                message: "There is something worng when schedule notification!",
              });
            }
          } else {
            if (alreadyAdded !== null) {
              const scheduleData = await ScheduledNotification.findOne({
                createdFor: authUserId,
                idsFor: eventData._id,
                createdBy: "user",
              });
              if (scheduleData !== null) {
                await User.findOneAndUpdate(
                  { _id: userData._id },
                  { $pull: { notificationFor: NotificationFor } },
                  { new: true }
                );
                if (scheduleData) {
                  const cancelData =
                    await ScheduledNotification.findByIdAndRemove(
                      scheduleData._id,
                      { new: true }
                    );
                  if (cancelData) {
                    return res.status(200).json({
                      status: true,
                      message: "Notification schedule cancel successfully.",
                      data: { id: scheduleData._id, notificationFlag: false },
                    });
                  } else {
                    return res.status(200).json({
                      status: false,
                      message:
                        "There is something worng when cancel schedule notification!",
                    });
                  }
                }
              }
            }
          }
        } else {
          return res
            .status(200)
            .json({ status: false, message: "Event details not found!" });
        }
      }
    } else if (eventID !== null && activityID !== null && sessionID === null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "event") {
        // Check if user has added notification for event or not
        const NotificationFor = {
          id: eventID,
          type: scheduleFor,
          setBy: "user",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: { $elemMatch: { id: eventID, setBy: "user" } },
          },
          { "notificationFor.$": 1 }
        );

        if (eventData !== undefined) {
          if (alreadyAdded === null) {
            notification_for = await User.findOneAndUpdate(
              { _id: userData._id },
              { $push: { notificationFor: NotificationFor } },
              { new: true }
            );

            const date = eventData.startDate;
            const eventTime = eventData.startTime;
            const timeZone = eventData.timeZone;
            const sign = timeZone.substring(4, 5);
            const utcHour = timeZone.substring(5, 7);
            const utcMinute = timeZone.substring(8, 10);
            const before30MinTime = moment(eventTime, "h:mm a")
              .subtract(15, "minutes")
              .format("HH:mm");
            console.log(before30MinTime, "15MinLog");

            // saprate date and time in hours and mins
            const year = moment(date, "MM-DD-YYYY").year();
            const month = moment(date, "MM-DD-YYYY").month(); // Month is zero-indexed
            const day = moment(date, "MM-DD-YYYY").get("date");
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
              eventImage: eventData.thumbnail,
              eventDate: eventData.startDate,
              eventTime: eventData.startTime,
              chatType: "eventReminder",
            };

            notificationData = {
              receiverName: userName,
              eventName: eventData.title ? eventData.title : "",
              chatType: "eventReminder",
            };

            let notificationTemplate =
              await notification_template.user_event_reminder(notificationData);
            let userDeviceToken = await User.findOne(
              { _id: userData._id },
              { deviceToken: 1 }
            );

            data = {
              receiverName: userName,
              notificationName: eventData.title ? eventData.title : "",
              notificationIdFor: eventData._id,
              notificationDate: eventData.startDate,
              notificationTime: eventData.startTime,
              scheduleTime: scheduleTime,
              notificationTemplate: notificationTemplate,
              userDeviceToken: userDeviceToken,
              chatData: chatData,
              userData: userData,
              scheduleFor: scheduleFor,
              createdBy: "user",
              messageType: "user_event_reminder",
            };
            await new Notification({
              title: notificationTemplate?.template?.title,
              body: notificationTemplate?.template?.body,
              createdBy: process.env.ADMIN_ID,
              createdFor: userData._id,
              read: true,
              role: "eventReminder",
            }).save();

            // scheduleNotification main function
            const scheduleNotification = await schedule(data);

            if (scheduleNotification.status === true) {
              return res.status(200).json({
                status: true,
                message: "Event notification schedule successfully.",
                data: {
                  id: scheduleNotification.data,
                  notificationFlag: true,
                },
              });
            } else {
              return res.status(200).json({
                status: false,
                message: "There is something worng when schedule notification!",
              });
            }
          } else {
            if (alreadyAdded !== null) {
              const scheduleData = await ScheduledNotification.findOne({
                createdFor: authUserId,
                idsFor: eventData._id,
                createdBy: "user",
              });
              if (scheduleData !== null) {
                notification_for = await User.findOneAndUpdate(
                  { _id: userData._id },
                  { $pull: { notificationFor: NotificationFor } },
                  { new: true }
                );
                if (scheduleData) {
                  const cancelData =
                    await ScheduledNotification.findByIdAndRemove(
                      scheduleData._id,
                      { new: true }
                    );
                  if (cancelData) {
                    return res.status(200).json({
                      status: true,
                      message: "Notification schedule cancel successfully.",
                      data: { id: scheduleData._id, notificationFlag: false },
                    });
                  } else {
                    return res.status(200).json({
                      status: false,
                      message:
                        "There is something worng when cancel schedule notification!",
                    });
                  }
                }
              }
            }
          }
        } else {
          return res
            .status(200)
            .json({ status: false, message: "Event details not found!" });
        }
      } else if (scheduleFor === "activity") {
        // Check if user has added notification for activity or not
        const NotificationFor = {
          id: activityID,
          type: scheduleFor,
          setBy: "user",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: { $elemMatch: { id: activityID, setBy: "user" } },
          },
          { "notificationFor.$": 1 }
        );

        if (activityData !== undefined) {
          if (alreadyAdded === null) {
            notification_for = await User.findOneAndUpdate(
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
              recipentImage: activityData.icon,
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
              await notification_template.user_activity_reminder(
                notificationData
              );
            let userDeviceToken = await User.findOne(
              { _id: userData._id },
              { deviceToken: 1 }
            );

            data = {
              receiverName: userName,
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

            // scheduleNotification main function
            const scheduleNotification = await schedule(data);
            if (scheduleNotification.status === true) {
              return res.status(200).json({
                status: true,
                message: "Activity notification schedule successfully.",
                data: {
                  id: scheduleNotification.data,
                  notificationFlag: true,
                },
              });
            } else {
              return res.status(200).json({
                status: false,
                message: "There is something worng when schedule notification!",
              });
            }
          } else {
            if (alreadyAdded !== null) {
              const scheduleData = await ScheduledNotification.findOne({
                createdFor: authUserId,
                idsFor: activityID,
                createdBy: "user",
              });

              if (scheduleData !== null) {
                notification_for = await User.findOneAndUpdate(
                  { _id: userData._id },
                  { $pull: { notificationFor: NotificationFor } },
                  { new: true }
                );
                const cancelData =
                  await ScheduledNotification.findByIdAndRemove(
                    scheduleData._id,
                    { new: true }
                  );
                if (cancelData) {
                  return res.status(200).json({
                    status: true,
                    message: "Notification schedule cancel successfully.",
                    data: { id: scheduleData._id, notificationFlag: false },
                  });
                } else {
                  return res.status(200).json({
                    status: false,
                    message:
                      "There is something worng when cancel schedule notification!",
                  });
                }
              }
            }
          }
        } else {
          return res
            .status(200)
            .json({ status: false, message: "Activity details not found!" });
        }
      }
    } else if (eventID !== null && activityID === null && sessionID !== null) {
      // condition that if notification is for event activity or session
      if (scheduleFor === "event") {
        // Check if user has added notification for event or not
        const NotificationFor = {
          id: eventID,
          type: scheduleFor,
          setBy: "user",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: { $elemMatch: { id: eventID, setBy: "user" } },
          },
          { "notificationFor.$": 1 }
        );

        if (eventData !== undefined) {
          if (alreadyAdded === null) {
            notification_for = await User.findOneAndUpdate(
              { _id: userData._id },
              { $push: { notificationFor: NotificationFor } },
              { new: true }
            );

            const date = eventData.startDate;
            const eventTime = eventData.startTime;
            const timeZone = eventData.timeZone;
            const sign = timeZone.substring(4, 5);
            const utcHour = timeZone.substring(5, 7);
            const utcMinute = timeZone.substring(8, 10);
            const before30MinTime = moment(eventTime, "h:mm a")
              .subtract(15, "minutes")
              .format("HH:mm");

            // saprate date and time in hours and mins
            const year = moment(date, "MM-DD-YYYY").year();
            const month = moment(date, "MM-DD-YYYY").month(); // Month is zero-indexed
            const day = moment(date, "MM-DD-YYYY").get("date");
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
              eventImage: eventData.thumbnail,
              eventDate: eventData.startDate,
              eventTime: eventData.startTime,
              chatType: "eventReminder",
            };

            notificationData = {
              receiverName: userName,
              eventName: eventData.title ? eventData.title : "",
              chatType: "eventReminder",
            };

            let notificationTemplate =
              await notification_template.user_event_reminder(notificationData);
            let userDeviceToken = await User.findOne(
              { _id: userData._id },
              { deviceToken: 1 }
            );

            data = {
              receiverName: userName,
              notificationName: eventData.title ? eventData.title : "",
              notificationIdFor: eventData._id,
              notificationDate: eventData.startDate,
              notificationTime: eventData.startTime,
              scheduleTime: scheduleTime,
              notificationTemplate: notificationTemplate,
              userDeviceToken: userDeviceToken,
              chatData: chatData,
              userData: userData,
              scheduleFor: scheduleFor,
              createdBy: "user",
              messageType: "user_event_reminder",
            };
            await new Notification({
              title: notificationTemplate?.template?.title,
              body: notificationTemplate?.template?.body,
              createdBy: process.env.ADMIN_ID,
              createdFor: userData._id,
              read: true,
              role: "eventReminder",
            }).save();

            // scheduleNotification main function
            const scheduleNotification = await schedule(data);

            if (scheduleNotification.status === true) {
              return res.status(200).json({
                status: true,
                message: "Event notification schedule successfully.",
                data: {
                  id: scheduleNotification.data,
                  notificationFlag: true,
                },
              });
            } else {
              return res.status(200).json({
                status: false,
                message: "There is something worng when schedule notification!",
              });
            }
          } else {
            if (alreadyAdded !== null) {
              const scheduleData = await ScheduledNotification.findOne({
                createdFor: authUserId,
                idsFor: eventData._id,
                createdBy: "user",
              });
              if (scheduleData !== null) {
                notification_for = await User.findOneAndUpdate(
                  { _id: userData._id },
                  { $pull: { notificationFor: NotificationFor } },
                  { new: true }
                );
                if (scheduleData) {
                  const cancelData =
                    await ScheduledNotification.findByIdAndRemove(
                      scheduleData._id,
                      { new: true }
                    );
                  if (cancelData) {
                    return res.status(200).json({
                      status: true,
                      message: "Notification schedule cancel successfully.",
                      data: { id: scheduleData._id, notificationFlag: false },
                    });
                  } else {
                    return res.status(200).json({
                      status: false,
                      message:
                        "There is something worng when cancel schedule notification!",
                    });
                  }
                }
              }
            }
          }
        } else {
          return res
            .status(200)
            .json({ status: false, message: "Event details not found!" });
        }
      } else if (scheduleFor === "session") {
        // Check if user has added notification for session or not
        const NotificationFor = {
          id: sessionID,
          type: scheduleFor,
          setBy: "user",
        };

        const alreadyAdded = await User.findOne(
          {
            _id: userData._id,
            notificationFor: { $elemMatch: { id: sessionID, setBy: "user" } },
          },
          { "notificationFor.$": 1 }
        );

        if (sessionData !== undefined) {
          if (alreadyAdded === null) {
            notification_for = await User.findOneAndUpdate(
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
              await notification_template.user_session_reminder(
                notificationData
              );
            let userDeviceToken = await User.findOne(
              { _id: userData._id },
              { deviceToken: 1 }
            );

            data = {
              receiverName: userName,
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
            await new Notification({
              title: notificationTemplate?.template?.title,
              body: notificationTemplate?.template?.body,
              createdBy: process.env.ADMIN_ID,
              createdFor: userData._id,
              read: true,
              role: "sessionReminder",
            }).save();

            // scheduleNotification main function
            const scheduleNotification = await schedule(data);
            if (scheduleNotification.status === true) {
              return res.status(200).json({
                status: true,
                message: "Session notification schedule successfully.",
                data: {
                  id: scheduleNotification.data,
                  notificationFlag: true,
                },
              });
            } else {
              return res.status(200).json({
                status: false,
                message: "There is something worng when schedule notification!",
              });
            }
          } else {
            if (alreadyAdded !== null) {
              const scheduleData = await ScheduledNotification.findOne({
                createdFor: authUserId,
                idsFor: sessionData._id,
                createdBy: "user",
              });
              if (scheduleData !== null) {
                notification_for = await User.findOneAndUpdate(
                  { _id: userData._id },
                  { $pull: { notificationFor: NotificationFor } },
                  { new: true }
                );
                if (scheduleData) {
                  const cancelData =
                    await ScheduledNotification.findByIdAndRemove(
                      scheduleData._id,
                      { new: true }
                    );
                  if (cancelData) {
                    return res.status(200).json({
                      status: true,
                      message: "Notification schedule cancel successfully.",
                      data: { id: scheduleData._id, notificationFlag: false },
                    });
                  } else {
                    return res.status(200).json({
                      status: false,
                      message:
                        "There is something worng when cancel schedule notification!",
                    });
                  }
                }
              }
            }
          }
        } else {
          return res
            .status(200)
            .json({ status: false, message: "Session details not found!" });
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

/** User APIs ends **/

// function to save channel related chat acivity
async function saveChatData(channelMessage, chatChannelUpdated) {
  const channelMessageSave = await channelMessage.save();
  const chatResult = channelMessageSave._doc;
  const chatData = {
    ...chatResult,
    recipient: {
      id: chatResult.recipient._id,
      firstname: chatChannelUpdated.channelName ?? "",
      image: chatChannelUpdated.channelIcon ?? "",
      type: "chatChannel",
    },
    sender: {
      id: chatResult.sender ? chatResult.sender._id : "",
      firstname: chatResult.sender ? chatResult.sender.first_name ?? "" : "",
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
  addUpdateRecordInChatListForGroupChannel(
    "chatChannel",
    "",
    chatData.recipient.id,
    "",
    "text",
    chatData.userTimeStamp,
    chatData.group_member,
    [],
    false
  );

  return chatData;
}

// emit socket events for channel activity
async function emitSocketChannelActivityEvent(io, allMembersIds, chatData) {
  allMembersIds?.map((grp_member) => {
    if (grp_member) {
      get_user_by_socket(grp_member).then((resp) => {
        if (resp !== undefined && resp.socket_id !== undefined) {
          for (var i = 0; i < resp.socket_id.length; i++) {
            io.to(resp.socket_id[i]).emit("receive", { message: chatData });
          }
        }
      });
    }
  });
}

