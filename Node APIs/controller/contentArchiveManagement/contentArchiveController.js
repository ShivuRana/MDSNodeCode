const {
  StartTranscriptionJobCommand,
  DeleteTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  TranscribeClient,
} = require("@aws-sdk/client-transcribe");
const { getVideoDurationInSeconds } = require("get-video-duration");
const fs = require("fs");
const AWS = require("aws-sdk");
const ffmpeg = require("fluent-ffmpeg");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const { deleteImage } = require("../../utils/mediaUpload");
const ContentCategory = require("../../database/models/contentArchive_category");
const contentSubCategory = require("../../database/models/contentArchive_subcategory");
const ContentSpeaker = require("../../database/models/contentArchive_speaker");
const ContentTag = require("../../database/models/contentArchive_tag");
const ContentEvent = require("../../database/models/contentArchive_event");
const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const ContentSearch = require("../../database/models/contentArchive_search");
const Group = require("../../database/models/group");
const Event = require("../../database/models/event");
const eventLocation = require("../../database/models/eventLocation");
const Dummy = require("../../database/models/dummy");
const User = require("../../database/models/airTableSync");
const adminNews = require("../../database/models/adminNews");
const chat = require("../../database/models/chat");
const chatChannel = require("../../database/models/chatChannel");
const chatChannelMembers = require("../../database/models/chatChannelMembers");
const { AdminUser } = require("../../database/models/adminuser");
const moment = require("moment");
const { parser } = require("html-metadata-parser");


ffmpeg.setFfmpegPath(ffmpegPath);
var s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
  Bucket: process.env.AWS_BUCKET,
});
const region = "us-east-2";
const credentials = {
  accessKeyId: "AKIAXHJ6XYUP43LGMXPZ",
  secretAccessKey: "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",
};

let ProcessStates = 0;

exports.createCategoty = async (req, res) => {
  try {

    const subcatArr = (req.body.subcategory !== undefined && req.body.subcategory !== null && req.body.subcategory !== "") ? req.body.subcategory.split(",") : []
    const checkname = await ContentCategory.find({
      name: req.body.name,
      isDelete: false,

    });
    if (checkname && checkname.length > 0) {
      return res
        .status(200)
        .json({ status: false, message: `Category name must be unique.` });
    }

    let subcategory = [];
    var subcategory_data = subcatArr.map(async (item, index) => {
      if (await contentSubCategory.findOne({ name: item, isDelete: false }))
        return res.status(200).json({
          status: false,
          message: `Sub Category name must be unique.`,
        });

      const newSubEntry = new contentSubCategory({ name: item });
      const subResult = await newSubEntry.save();
      subcategory.push(subResult._id);
    });
    await Promise.all([...subcategory_data]);

    const newentry = new ContentCategory({
      name: req.body.name,
      categoryImage: req.categoryImage,
      subcategory: subcategory,
    });

    const result = await newentry.save();
    return res
      .status(200)
      .json({ status: true, message: `Category created.`, data: result });
  } catch (error) {
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res
        .status(200)
        .json({ status: false, message: `Category name must be unique.` });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Something went wrong. ${error}` });
    }
  }
};

exports.getCategoriesList = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);
    const data = await ContentCategory.aggregate([
      {
        $match: {
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "contentarchive_videos",
          localField: "_id",
          foreignField: "categories",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "totalcount",
        },
      },
      {
        $project: {
          _id: "$_id",
          name: 1,
          counts: {
            $size: "$totalcount",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);
    req.on("response", function (data) {
      console.log(data.headers["content-length"]);
    });
    return res
      .status(200)
      .json({ status: true, message: `List of categories.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getCategoriesList_as = async (req, res) => {
  try {
    const data = await ContentCategory.aggregate([
      {
        $match: {
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "contentarchive_videos",
          localField: "_id",
          foreignField: "categories",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "totalcount",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          localField: "subcategory",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "subcategory",
        },
      },
      {
        $project: {
          _id: "$_id",
          name: 1,
          subcategory: "$subcategory",
          counts: {
            $size: "$totalcount",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);
    return res
      .status(200)
      .json({ status: true, message: `List of categories.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

/** code by SJ start **/

exports.getVideoByCategoriesAndFilter = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const authUser = req.authUserId;

    var categorie_id = [];
    if (req.query.categorie_id && req.query.categorie_id !== "null" && req.query.categorie_id !== "undefined") {
      categorie_id = [ObjectId(req.query.categorie_id)];
    }

    var subcategorie_id = [];
    if (req.query.subcategorie_id && req.query.subcategorie_id !== "null" && req.query.subcategorie_id !== "undefined") {
      subcategorie_id = [ObjectId(req.query.subcategorie_id)];
    }

    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    var event = [];
    var getEventAttendeeEmail = {};
    if (req.query.event && req.query.event !== "null" && req.query.event !== "undefined") {
      event = [ObjectId(req.query.event)];
      getEventAttendeeEmail = await User.findOne({ _id: authUser, "attendeeDetail.evntData": { $elemMatch: { event: event } }, }, { "attendeeDetail.evntData.$": 1 });
    }

    var speaker = [];
    if (req.query.speaker && req.query.speaker !== "null" && req.query.speaker !== "undefined") {
      speaker = [ObjectId(req.query.speaker)];
    }

    var tagId = [];
    if (req.query.tagId && req.query.tagId !== "null" && req.query.tagId !== "undefined") {
      tagId = [ObjectId(req.query.tagId)];
    }

    const filter = req.query.filter;
    const userdata = await User.findById(authUser);
    var sort = { createdAt: -1 };

    const allEvents = await ContentEvent.find({
      isDelete: false,
      name: { $ne: "others" },
    });
    var eventFor = ["others"];
    allEvents.forEach(async (event, key) => {
      const eventName = event.name.toLowerCase();
      if (userdata.userEvents !== undefined) {
        if (userdata.userEvents[eventName] === true) {
          eventFor.push(eventName);
        }
      }
    });

    var match = {
      isDelete: false,
      uploadstatus: { $ne: "inprocess" },
      eventFor: { $in: eventFor },
    };

    if (categorie_id.length > 0) {
      match = { ...match, categories: { $in: categorie_id } };
    }

    if (search) {
      match = { ...match, title: { $regex: ".*" + search + ".*", $options: "i" }, };
    }

    if (subcategorie_id.length > 0) {
      match = { ...match, subcategory: { $in: subcategorie_id } };
    }

    if (event.length > 0) {
      match = { ...match, eventIds: { $in: event } };
    }

    if (speaker.length > 0) {
      match = { ...match, speaker: { $in: speaker } };
    }

    if (tagId.length > 0) {
      match = { ...match, tag: { $in: tagId } };
    }

    if (filter === "recent") {
      sort = { createdAt: -1, updatedAt: -1 };
    } else if (filter === "popular") {
      sort = { viewsCount: -1 };
    } else if (filter === "comment") {
      sort = { commentsCount: -1 };
    }

    var data = await ContentArchiveVideo.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { contentarchive_categories_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_categories_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          localField: "subcategory",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
      {
        $addFields: {
          viewsCount: {
            $cond: {
              if: { $isArray: "$views" },
              then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
              else: "$starting_view_cnt",
            },
          },
        },
      },
      {
        $addFields: {
          commentsCount: {
            $cond: {
              if: { $isArray: "$comments" },
              then: { $size: "$comments" },
              else: 0,
            },
          },
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          video: 1,
          description: 1,
          thumbnail: 1,
          createdAt: 1,
          viewsCount: 1,
          commentsCount: 1,
          duration: 1,
          categories: 1,
          views: 1,
          likes: 1,
          group_ids: 1,
          user_video_pause: 1,
          eventFor: 1,
        },
      },
    ]);

    var count;
    count = await ContentArchiveVideo.countDocuments({
      ...match,
    });
    var arr = [];
    for (var i = 0; i < data.length; i++) {
      var url = s3.getSignedUrl("getObject", {
        Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
        Key: data[i].video,
        Expires: 100000,
      });
      arr.push({ ...data[i], video: url });
    }
    data = arr;

    var mobile_desc = data?.map(async (item, index) => {
      let mobile_description = "";
      if (item.description !== undefined) {
        let without_html_description = item.description.replace(/&amp;/g, "&");
        without_html_description = item.description.replace(/(<([^>]+)>)/g, "");
        without_html_description = without_html_description.replace(
          /(\r\n|\n|\r)/gm,
          ""
        );
        mobile_description = without_html_description.substring(0, 600);
      }
      item.mobile_description = mobile_description.trim();
    });
    await Promise.all([...mobile_desc]);

    if (req.query.event && req.query.event !== "null" && req.query.event !== "undefined") {
      if (getEventAttendeeEmail !== null && (getEventAttendeeEmail.attendeeDetail.evntData[0].member === true)) {
        return res.status(200).json({
          status: true,
          message: `List of Content Archive Video.`,
          data: [
            {
              videos: data,
              currentPage: req.query.page,
              totalPages: Math.ceil(count / limit),
              totalVideos: count,
            },
          ],
        });
      } else {
        return res.status(200).json({
          status: true,
          message: `Content Archive Video list not found`,
          data: [
            {
              videos: [],
              currentPage: req.query.page,
              totalPages: 0,
              totalVideos: 0,
            },
          ],
        });
      }
    } else if (!req.query.event) {
      return res.status(200).json({
        status: true,
        message: `List of Content Archive Video.`,
        data: [
          {
            videos: data,
            currentPage: req.query.page,
            totalPages: Math.ceil(count / limit),
            totalVideos: count,
          },
        ],
      });
    } else {
      return res.status(200).json({
        status: true,
        message: `Content Archive Video list not found`,
        data: [
          {
            videos: [],
            currentPage: req.query.page,
            totalPages: 0,
            totalVideos: 0,
          },
        ],
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getVideoByCateFilterSort = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const authUser = req.authUserId;

    const skip = (page - 1) * limit;
    var categorie_id = [];
    if (
      req.query.categorie_id &&
      req.query.categorie_id !== "null" &&
      req.query.categorie_id !== "undefined"
    ) {
      categorie_id = [ObjectId(req.query.categorie_id)];
    }
    var subcategorie_id = [];
    if (
      req.query.subcategorie_id &&
      req.query.subcategorie_id !== "null" &&
      req.query.subcategorie_id !== "undefined"
    ) {
      subcategorie_id = [ObjectId(req.query.subcategorie_id)];
    }
    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    var sorting = "h2l";
    if (req.query.sort) {
      sorting = req.query.sort;
    }

    const filter = req.query.filter;
    const userdata = await User.findById(authUser);
    var sort = { createdAt: -1 };

    const allEvents = await ContentEvent.find({
      isDelete: false,
      name: { $ne: "others" },
    });
    var eventFor = ["others"];
    allEvents.forEach(async (event, key) => {
      const eventName = event.name.toLowerCase();
      if (userdata.userEvents !== undefined) {
        if (userdata.userEvents[eventName] === true) {
          eventFor.push(eventName);
        }
      }
    });
    var match = {
      isDelete: false,
      uploadstatus: { $ne: "inprocess" },
      eventFor: { $in: eventFor },
    };

    // if (userdata.accessible_groups.length > 0) {
    //   match = { ...match, group_ids: { $in: userdata.accessible_groups } };
    // }
    if (categorie_id.length > 0) {
      match = { ...match, categories: { $in: categorie_id } };
    }
    if (search) {
      match = {
        ...match,
        title: { $regex: ".*" + search + ".*", $options: "i" },
      };
    }
    if (subcategorie_id.length > 0) {
      match = { ...match, subcategory: { $in: subcategorie_id } };
    }

    if (filter === "popular" && sorting === "h2l") {
      sort = { viewsCount: -1 };
    } else if (filter === "comment" && sorting === "h2l") {
      sort = { commentsCount: -1 };
    } else if (filter === "popular" && sorting === "l2h") {
      sort = { viewsCount: 1 };
    } else if (filter === "comment" && sorting === "l2h") {
      sort = { commentsCount: 1 };
    }

    var data = await ContentArchiveVideo.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { contentarchive_categories_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_categories_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          localField: "subcategory",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
      {
        $addFields: {
          viewsCount: {
            $cond: {
              if: { $isArray: "$views" },
              then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
              else: "$starting_view_cnt",
            },
          },
        },
      },
      {
        $addFields: {
          commentsCount: {
            $cond: {
              if: { $isArray: "$comments" },
              then: { $size: "$comments" },
              else: 0,
            },
          },
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          video: 1,
          description: 1,
          thumbnail: 1,
          createdAt: 1,
          viewsCount: 1,
          commentsCount: 1,
          duration: 1,
          categories: 1,
          views: 1,
          likes: 1,
          user_video_pause: 1,
          eventFor: 1,
        },
      },
    ]);

    var count;
    count = await ContentArchiveVideo.countDocuments({
      ...match,
    });

    var arr = [];
    for (var i = 0; i < data.length; i++) {
      var url = s3.getSignedUrl("getObject", {
        Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
        Key: data[i].video,
        Expires: 100000,
      });
      arr.push({ ...data[i], video: url });
    }
    data = arr;

    var mobile_desc = data?.map(async (item, index) => {
      let mobile_description = "";
      if (item.description !== undefined) {
        let without_html_description = item.description.replace(/&amp;/g, "&");
        without_html_description = item.description.replace(/(<([^>]+)>)/g, "");
        without_html_description = without_html_description.replace(
          /(\r\n|\n|\r)/gm,
          ""
        );
        mobile_description = without_html_description.substring(0, 600);
      }
      item.mobile_description = mobile_description.trim();
    });
    await Promise.all([...mobile_desc]);

    return res.status(200).json({
      status: true,
      message: `List of Content Archive Video.`,
      data: [
        {
          videos: data,
          currentPage: req.query.page,
          totalPages: Math.ceil(count / limit),
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getVideoBySubCategoriesAndFilter = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const authUser = req.authUserId;

    var sub_category_id = [];
    if (req.query.sub_category_id) {
      sub_category_id = [ObjectId(req.query.sub_category_id)];
    }

    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    const filter = req.query.filter;
    const userdata = await User.findById(authUser);
    var sort = { createdAt: -1 };

    const allEvents = await ContentEvent.find({
      isDelete: false,
      name: { $ne: "others" },
    });
    var eventFor = ["others"];
    allEvents.forEach(async (event, key) => {
      const eventName = event.name.toLowerCase();
      if (userdata.userEvents !== undefined) {
        if (userdata.userEvents[eventName] === true) {
          eventFor.push(eventName);
        }
      }
    });

    var match = {
      isDelete: false,
      uploadstatus: { $ne: "inprocess" },
      eventFor: { $in: eventFor },
    };

    if (sub_category_id.length > 0 && search) {
      match = {
        title: { $regex: ".*" + search + ".*", $options: "i" },
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (sub_category_id.length > 0) {
      match = {
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (search) {
      match = {
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (sub_category_id.length > 0 && search) {
      match = {
        title: { $regex: ".*" + search + ".*", $options: "i" },
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (sub_category_id.length > 0) {
      match = {
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (search) {
      match = {
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    }

    if (filter === "recent") {
      sort = { createdAt: -1, updatedAt: -1 };
    } else if (filter === "popular") {
      sort = { viewsCount: -1 };
    } else if (filter === "comment") {
      sort = { commentsCount: -1 };
    }

    var data = await ContentArchiveVideo.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { contentarchive_categories_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_categories_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          let: { contentarchive_subcategory_id: "$subcategory" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_subcategory_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
      {
        $addFields: {
          viewsCount: {
            $cond: {
              if: { $isArray: "$views" },
              then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
              else: "$starting_view_cnt",
            },
          },
        },
      },
      {
        $addFields: {
          commentsCount: {
            $cond: {
              if: { $isArray: "$comments" },
              then: { $size: "$comments" },
              else: 0,
            },
          },
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          video: 1,
          description: 1,
          thumbnail: 1,
          createdAt: 1,
          viewsCount: 1,
          commentsCount: 1,
          duration: 1,
          categories: 1,
          views: 1,
          likes: 1,
          user_video_pause: 1,
          eventFor: 1,
        },
      },
    ]);

    var count;
    if (sub_category_id.length > 0 && search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (sub_category_id.length > 0) {
      count = await ContentArchiveVideo.countDocuments({
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (sub_category_id.length > 0 && search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (sub_category_id.length > 0) {
      count = await ContentArchiveVideo.countDocuments({
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else {
      count = await ContentArchiveVideo.countDocuments({
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    }

    var arr = [];
    for (var i = 0; i < data.length; i++) {
      var url = s3.getSignedUrl("getObject", {
        Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
        Key: data[i].video,
        Expires: 100000,
      });
      arr.push({ ...data[i], video: url });
    }
    data = arr;

    var mobile_desc = data?.map(async (item, index) => {
      let mobile_description = "";
      if (item.description !== undefined) {
        let without_html_description = item.description.replace(/&amp;/g, "&");
        without_html_description = item.description.replace(/(<([^>]+)>)/g, "");
        without_html_description = without_html_description.replace(
          /(\r\n|\n|\r)/gm,
          ""
        );
        mobile_description = without_html_description.substring(0, 600);
      }
      item.mobile_description = mobile_description.trim();
    });
    await Promise.all([...mobile_desc]);

    return res.status(200).json({
      status: true,
      message: `List of Content Archive Video.`,
      data: [
        {
          videos: data,
          currentPage: req.query.page,
          totalPages: Math.ceil(count / limit),
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getVideoBySubCateFilterSort = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    var sub_category_id = [];
    if (req.query.sub_category_id) {
      sub_category_id = [ObjectId(req.query.sub_category_id)];
    }

    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    var sorting = "h2l";
    if (req.query.sort) {
      sorting = req.query.sort;
    }

    const filter = req.query.filter;
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);
    var sort = { createdAt: -1 };

    const allEvents = await ContentEvent.find({
      isDelete: false,
      name: { $ne: "others" },
    });
    var eventFor = ["others"];
    allEvents.forEach(async (event, key) => {
      const eventName = event.name.toLowerCase();
      if (userdata.userEvents !== undefined) {
        if (userdata.userEvents[eventName] === true) {
          eventFor.push(eventName);
        }
      }
    });

    var match = {
      isDelete: false,
      uploadstatus: { $ne: "inprocess" },
      eventFor: { $in: eventFor },
    };

    if (sub_category_id.length > 0 && search) {
      match = {
        title: { $regex: ".*" + search + ".*", $options: "i" },
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (sub_category_id.length > 0) {
      match = {
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (search) {
      match = {
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (sub_category_id.length > 0) {
      match = {
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    } else if (search) {
      match = {
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    }

    if (filter === "popular" && sorting === "h2l") {
      sort = { viewsCount: -1 };
    } else if (filter === "comment" && sorting === "h2l") {
      sort = { commentsCount: -1 };
    } else if (filter === "popular" && sorting === "l2h") {
      sort = { viewsCount: 1 };
    } else if (filter === "comment" && sorting === "l2h") {
      sort = { commentsCount: 1 };
    }

    var data = await ContentArchiveVideo.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { contentarchive_categories_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_categories_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          let: { contentarchive_subcategory_id: "$subcategory" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_subcategory_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
      {
        $addFields: {
          viewsCount: {
            $cond: {
              if: { $isArray: "$views" },
              then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
              else: "$starting_view_cnt",
            },
          },
        },
      },
      {
        $addFields: {
          commentsCount: {
            $cond: {
              if: { $isArray: "$comments" },
              then: { $size: "$comments" },
              else: 0,
            },
          },
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          video: 1,
          description: 1,
          thumbnail: 1,
          createdAt: 1,
          viewsCount: 1,
          commentsCount: 1,
          duration: 1,
          categories: 1,
          views: 1,
          likes: 1,
          user_video_pause: 1,
          eventFor: 1,
        },
      },
    ]);

    var count;
    if (sub_category_id.length > 0 && search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (sub_category_id.length > 0) {
      count = await ContentArchiveVideo.countDocuments({
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (sub_category_id.length > 0 && search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (sub_category_id.length > 0) {
      count = await ContentArchiveVideo.countDocuments({
        subcategory: { $in: sub_category_id },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else if (search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else {
      count = await ContentArchiveVideo.countDocuments({
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    }

    var arr = [];
    for (var i = 0; i < data.length; i++) {
      var url = s3.getSignedUrl("getObject", {
        Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
        Key: data[i].video,
        Expires: 100000,
      });
      arr.push({ ...data[i], video: url });
    }
    data = arr;

    var mobile_desc = data?.map(async (item, index) => {
      let mobile_description = "";
      if (item.description !== undefined) {
        let without_html_description = item.description.replace(/&amp;/g, "&");
        without_html_description = item.description.replace(/(<([^>]+)>)/g, "");
        without_html_description = without_html_description.replace(
          /(\r\n|\n|\r)/gm,
          ""
        );
        mobile_description = without_html_description.substring(0, 600);
      }
      item.mobile_description = mobile_description.trim();
    });
    await Promise.all([...mobile_desc]);

    return res.status(200).json({
      status: true,
      message: `List of Content Archive Video.`,
      data: [
        {
          videos: data,
          currentPage: req.query.page,
          totalPages: Math.ceil(count / limit),
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getVideoBySearchFilter = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    const filter = req.query.filter;
    const authUser = req.authUserId;

    const userdata = await User.findById(authUser);
    var sort = { createdAt: -1 };

    const allEvents = await ContentEvent.find({
      isDelete: false,
      name: { $ne: "others" },
    });
    var eventFor = ["others"];
    allEvents.forEach(async (event, key) => {
      const eventName = event.name.toLowerCase();
      if (userdata.userEvents !== undefined) {
        if (userdata.userEvents[eventName] === true) {
          eventFor.push(eventName);
        }
      }
    });

    var match = {
      isDelete: false,
      uploadstatus: { $ne: "inprocess" },
      eventFor: { $in: eventFor },
    };
    if (search) {
      match = {
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      };
    }

    if (filter === "recent") {
      sort = { createdAt: -1, updatedAt: -1 };
    } else if (filter === "popular") {
      sort = { viewsCount: -1 };
    } else if (filter === "comment") {
      sort = { commentsCount: -1 };
    }

    var data = await ContentArchiveVideo.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { contentarchive_categories_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_categories_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          localField: "subcategory",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
      {
        $addFields: {
          viewsCount: {
            $cond: {
              if: { $isArray: "$views" },
              then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
              else: "$starting_view_cnt",
            },
          },
        },
      },
      {
        $addFields: {
          commentsCount: {
            $cond: {
              if: { $isArray: "$comments" },
              then: { $size: "$comments" },
              else: 0,
            },
          },
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          video: 1,
          description: 1,
          thumbnail: 1,
          createdAt: 1,
          viewsCount: 1,
          commentsCount: 1,
          duration: 1,
          categories: 1,
          views: 1,
          likes: 1,
          user_video_pause: 1,
          eventFor: 1,
        },
      },
    ]);

    var count;
    if (search) {
      count = await ContentArchiveVideo.countDocuments({
        title: { $regex: ".*" + search + ".*", $options: "i" },
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    } else {
      count = await ContentArchiveVideo.countDocuments({
        isDelete: false,
        uploadstatus: { $ne: "inprocess" },
        eventFor: { $in: eventFor },
      });
    }
    var arr = [];
    for (var i = 0; i < data.length; i++) {
      var url = await s3.getSignedUrl("getObject", {
        Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
        Key: data[i].video,
        Expires: 100000,
      });
      arr.push({ ...data[i], video: url });
    }
    data = arr;

    var mobile_desc = data?.map(async (item, index) => {
      let mobile_description = "";
      if (item.description !== undefined) {
        let without_html_description = item.description.replace(/&amp;/g, "&");
        without_html_description = item.description.replace(/(<([^>]+)>)/g, "");
        without_html_description = without_html_description.replace(
          /(\r\n|\n|\r)/gm,
          ""
        );
        mobile_description = without_html_description.substring(0, 600);
      }
      item.mobile_description = mobile_description.trim();
    });
    await Promise.all([...mobile_desc]);

    return res.status(200).json({
      status: true,
      message: `List of Content Archive Video.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: req.query.page,
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.addAndUpdateVideoHistoryById = async (req, res) => {
  try {
    const userData = await User.findById(req.authUserId);
    const body = req.body;
    const history_date = new Date();

    var video_history = [];

    const videoHistoryData = {
      video_id: new ObjectId(body.videoId),
      history_date: history_date,
    };

    const alreadyAdded = await User.findOne(
      {
        _id: userData._id,
        video_history_data: {
          $elemMatch: { video_id: new ObjectId(body.videoId) },
        },
      },
      { video_history_data: 1 }
    );

    if (alreadyAdded !== null) {
      video_history = await User.findOneAndUpdate(
        {
          _id: userData._id,
          video_history_data: {
            $elemMatch: { video_id: new ObjectId(body.videoId) },
          },
        },
        { $set: { "video_history_data.$.history_date": history_date } },
        { new: true }
      );
    } else {
      video_history = await User.findOneAndUpdate(
        { _id: userData._id },
        { $push: { video_history_data: videoHistoryData } },
        { new: true }
      );
    }

    if (video_history) {
      res.status(200).json({
        status: true,
        message: "User view history updated successfully!",
        data: video_history,
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getVideoHistoryByUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    var count = 0;

    var userData = await User.aggregate([
      {
        $match: {
          _id: req.authUserId,
        },
      },
      { $unwind: "$video_history_data" },
      { $sort: { "video_history_data.history_date": -1 } },
      {
        $lookup: {
          from: "contentarchive_videos",
          let: { contentarchive_id: "$video_history_data.video_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$contentarchive_id"],
                },
              },
            },
            {
              $lookup: {
                from: "contentarchive_categories",
                let: { contentarchive_categories_id: "$categories" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $in: ["$_id", "$$contentarchive_categories_id"],
                      },
                    },
                  },
                  { $project: { name: 1 } },
                ],
                as: "categories",
              },
            },
            {
              $lookup: {
                from: "contentarchive_subcategories",
                localField: "subcategory",
                foreignField: "_id",
                pipeline: [
                  {
                    $match: {
                      isDelete: false,
                    },
                  },
                ],
                as: "subcategory",
              },
            },
            {
              $lookup: {
                from: "groups",
                let: { suggestion_id: "$group_ids" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $in: ["$_id", "$$suggestion_id"],
                      },
                    },
                  },
                  { $project: { groupTitle: 1 } },
                ],
                as: "group_ids",
              },
            },
            {
              $addFields: {
                viewsCount: {
                  $cond: {
                    if: { $isArray: "$views" },
                    then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
                    else: "$starting_view_cnt",
                  },
                },
              },
            },
            {
              $addFields: {
                commentsCount: {
                  $cond: {
                    if: { $isArray: "$comments" },
                    then: { $size: "$comments" },
                    else: 0,
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                video: 1,
                description: 1,
                thumbnail: 1,
                createdAt: 1,
                viewsCount: 1,
                commentsCount: 1,
                duration: 1,
                categories: 1,
                views: 1,
                likes: 1,
                user_video_pause: 1,
                eventFor: 1,
              },
            },
          ],
          as: "archive_video",
        },
      },
      { $unwind: "$archive_video" },
      { $skip: skip },
      { $limit: limit },
      {
        $set: {
          "video_history_data.archive_video": "$archive_video",
        },
      },
      {
        $group: {
          _id: "$_id",
          video_history_data: { $push: "$video_history_data" },
        },
      },
    ]);

    const video_history_data = await User.aggregate([
      {
        $match: {
          _id: req.authUserId,
        },
      },
      { $unwind: "$video_history_data" },
      { $sort: { "video_history_data.history_date": -1 } },
      {
        $lookup: {
          from: "contentarchive_videos",
          let: { contentarchive_id: "$video_history_data.video_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$contentarchive_id"],
                },
              },
            },
          ],
          as: "archive_video",
        },
      },
      {
        $set: {
          "video_history_data.archive_video": "$archive_video",
        },
      },
      { $unwind: "$archive_video" },
      {
        $group: {
          _id: "$_id",
          video_history_data: { $push: "$video_history_data" },
        },
      },
    ]);

    if (userData.length !== 0) {
      count = video_history_data[0].video_history_data.length;
    }

    if (userData.length !== 0) {
      var arr = [];
      for (var i = 0; i < userData[0].video_history_data.length; i++) {
        var url = s3.getSignedUrl("getObject", {
          Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
          Key: userData[0].video_history_data[i].archive_video.video,
          Expires: 100000,
        });
        arr.push({
          ...userData[0].video_history_data[i],
          archive_video: {
            ...userData[0].video_history_data[i].archive_video,
            video: url,
          },
        });
      }
      userData = arr;

      var mobile_desc = userData?.map(async (item, index) => {
        let mobile_description = "";
        if (item.archive_video.description !== undefined) {
          let without_html_description = item.archive_video.description.replace(
            /&amp;/g,
            "&"
          );
          without_html_description = item.archive_video.description.replace(
            /(<([^>]+)>)/g,
            ""
          );
          without_html_description = without_html_description.replace(
            /(\r\n|\n|\r)/gm,
            ""
          );
          mobile_description = without_html_description.substring(0, 600);
        }
        item.archive_video.mobile_description = mobile_description.trim();
      });
      await Promise.all([...mobile_desc]);
    }

    if (userData.length !== 0) {
      return res.status(200).json({
        status: true,
        message: `History List of Content Archive Video retrive.`,
        data: [
          {
            video_history_data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: req.query.page,
            totalVideos: count,
          },
        ],
      });
    } else {
      return res.status(200).json({
        status: true,
        message: `History List of Content Archive Video not found!`,
        data: [
          {
            video_history_data: [],
            totalPages: Math.ceil(count / limit),
            currentPage: req.query.page,
            totalVideos: count,
          },
        ],
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.removeVideoHistoryById = async (req, res) => {
  try {
    const userData = await User.findById(req.authUserId);
    const body = req.body;

    const alreadyAdded = await User.findOne(
      {
        _id: userData._id,
        video_history_data: { $elemMatch: { _id: new ObjectId(body._id) } },
      },
      { video_history_data: 1 }
    );
    if (alreadyAdded !== null) {
      const new_video_history = alreadyAdded?.video_history_data?.filter(
        (item) => {
          return item._id.toString() !== body._id;
        }
      );

      const video_history = await User.findOneAndUpdate(
        { _id: userData._id },
        { video_history_data: new_video_history },
        { new: true }
      );

      if (video_history) {
        return res.status(200).json({
          status: true,
          message: "User view history updated successfully!",
          data: video_history,
        });
      }
    } else {
      return res.status(404).json({
        status: false,
        message: "User view history not found!",
        data: [],
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.removeAllVideoHistory = async (req, res) => {
  try {
    const userData = await User.findById(req.authUserId);
    const new_video_history = [];

    const video_history = await User.findOneAndUpdate(
      { _id: userData._id },
      { video_history_data: new_video_history },
      { new: true }
    );
    res.status(200).json({
      status: true,
      message: "User view history updated successfully!",
      data: video_history,
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

/** code by SJ end **/

exports.getCategorybyId = async (req, res) => {
  try {
    const { id } = req.params;
    if (ObjectId.isValid(id)) {
      const data = await ContentCategory.findOne({
        _id: id,
        isDelete: false,
      }).select("-__v -createdAt -updatedAt");

      return res
        .status(200)
        .json({ status: true, message: `Category data.`, data: data });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Id is invalid`, data: [] });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updated_data = await ContentCategory.findByIdAndUpdate(
      id,
      { isDelete: true },
      { new: true }
    ).select("-__v -createdAt -updatedAt");
    if (updated_data && updated_data.subcategory) {
      contentSubCategory.remove({
        _id: { $in: [...updated_data.subcategory] },
      });
    }
    return res
      .status(200)
      .json({ status: true, message: `Category deleted.`, data: updated_data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.editCategory = async (req, res) => {
  try {

    const { id } = req.params;
    const checkname = await ContentCategory.find({
      _id: { $ne: ObjectId(id) },
      name: req.body.name,
      isDelete: false,
    });


    if (checkname && checkname.length > 0) {
      return res
        .status(200)
        .json({ status: false, message: `Category name must be unique.` });
    }

    const addSubCat = req.body.subcategory !== undefined && req.body.subcategory !== null && req.body.subcategory.length > 0 ? req.body.subcategory.trim().split(",") : []


    var subcategory_data = req.body.subcategory !== undefined
      && req.body.subcategory !== null
      && req.body.subcategory.length > 0 && addSubCat.map(async (item, index) => {
        if (await contentSubCategory.findOne({ name: item, isDelete: false }))
          return res.status(200).json({
            status: false,
            message: `Sub Category name must be unique.`,
          });

        const newSubEntry = new contentSubCategory({ name: item });
        const subResult = await newSubEntry.save();
        await ContentCategory.findByIdAndUpdate(
          id,
          {
            $push: { subcategory: subResult._id },
          },
          { new: true }
        );
      });


    if (subcategory_data)
      await Promise.all([...subcategory_data]);

    const deltSubCat = req.body.deleteSubCategory !== undefined && req.body.deleteSubCategory !== null && req.body.deleteSubCategory.length > 0 ? req.body.deleteSubCategory.trim().split(",") : []

    var deleteSubCategory = req.body.deleteSubCategory !== undefined && req.body.deleteSubCategory !== null && req.body.deleteSubCategory.length > 0
      && deltSubCat.map(
        async (ditem, index) => {
          await ContentCategory.findByIdAndUpdate(
            id,
            {
              $pull: { subcategory: new ObjectId(ditem) },
            },
            { new: true }
          );

          await contentSubCategory.findByIdAndUpdate(
            { _id: new ObjectId(ditem) },
            { isDelete: true },
            { new: true }
          );
        }
      );
    if (deleteSubCategory)
      await Promise.all([...deleteSubCategory]);


    const catExists = await ContentCategory.findById(ObjectId(id))

    if (catExists && catExists.categoryImage !== undefined && catExists.categoryImage !== null)
      deleteImage(catExists.categoryImage)


    const updated_data = await ContentCategory.findByIdAndUpdate(
      id,
      { name: req.body.name, categoryImage: req.categoryImage ? req.categoryImage : catExists.categoryImage },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: `Category updated successfully.`,
      data: updated_data,
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.createVideo = async (req, res) => {
  try {
    const { video_v, thumbnail, files_v, partners_v } = req;
    ProcessStates = 5;
    var url = await s3.getSignedUrl("getObject", {
      Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
      Key: video_v,
      Expires: 100000,
    });
    const total_duration = await getVideoDurationInSeconds(url);
    var dateObj = new Date(total_duration * 1000);
    var hours = dateObj.getUTCHours();
    var minutes = dateObj.getUTCMinutes();
    var seconds = dateObj.getSeconds();

    var duration =
      (hours.toString().padStart(2, "0") !== "00"
        ? hours.toString() + ":"
        : "") +
      (hours.toString().padStart(2, "0") !== "00"
        ? minutes.toString().padStart(2, "0") + ":"
        : minutes.toString() + ":") +
      seconds.toString().padStart(2, "0");
    const new_partners = [];
    var prtn_index = 0;

    req.body.partners?.map((partner, i) => {
      const obj = {};
      obj.name = partner.name;
      if (partner.havelogo === "true") {
        obj.logo = partners_v[prtn_index];
        prtn_index++;
      } else {
        obj.logo = "";
      }
      obj.url = partner.url;
      new_partners.push(obj);
    });

    const new_files = [];
    req.body.c_files?.map((file, i) => {
      const obj = {};
      obj.name = file.name;
      obj.url = files_v[i];
      new_files.push(obj);
    });
    const body = req.body;
    const validGroup = await Group.find({ _id: { $in: body.group_ids } });

    if (validGroup.length < 0)
      return res
        .status(200)
        .json({ status: false, message: "Not a valid group" });

    if (body.categories?.length > 0) {
      const cat_data = await ContentCategory.countDocuments({
        _id: { $in: body.categories },
        isDelete: false,
      });
      if (cat_data !== body.categories.length)
        return res.status(200).json({
          status: false,
          message: `Something wrong, Invalid category.`,
        });
    }
    if (body.subcategories?.length > 0) {
      const cat_data = await contentSubCategory.countDocuments({
        _id: { $in: body.subcategories },
        isDelete: false,
      });
      if (cat_data !== body.subcategories.length)
        return res.status(200).json({
          status: false,
          message: `Something wrong, Invalid sub category.`,
        });
    }
    let description = `<div "font-family: 'Muller';">${body.description}</div>`;
    const newentry = new ContentArchiveVideo({
      video: video_v,
      thumbnail: thumbnail ?? "",
      title: body.title,
      description: description,
      categories: body.categories,
      subcategory: body.subcategories,
      speaker: body.speaker,
      tag: body.tag,
      clif_notes_title: body.clif_notes_title,
      clif_notes: body.clif_notes,
      files: new_files,
      relevant_partners: new_partners,
      group_ids: body.group_ids,
      eventIds: body.eventIds,
      starting_view_cnt: body.starting_view_cnt,
      duration: duration,
      uploadstatus: "inprocess",
      eventFor: body.eventFor,
      createdAt: body.upload_date,
    });

    const data = await newentry.save();
    if (data) {
      if (body.makeFeaturedCheckbox.toString() === "true") {
        const newNewsData = new adminNews({
          date: new Date(),
          publishDate: new Date(),
          publishOrHide: "hide",
          makeFeaturedCheckbox: false,
          newsType: "video",
          videoReferenceId: data._id,
        });
        await newNewsData.save();
      }
    }
    return res.status(200).json({
      status: true,
      message: `Video added in Content archive library.`,
      data,
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.CompressVideo = async (req, res) => {
  try {
    resolutions_480 = await generate_video_resolution_480(req.body.video_v);
    const query = await ContentArchiveVideo.findByIdAndUpdate(
      req.body.id,
      { video: resolutions_480, uploadstatus: "completed" },
      { runValidators: true, new: true, timestamps: false }
    );
    if (query)
      return res.status(200).json({
        status: true,
        message: `Video added in Content archive library.`,
        data: query,
      });
    else {
      if (resolutions_480) deleteImage(resolutions_480);
      return res.status(200).json({
        status: true,
        message: `Video deleted.`,
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.editVideo = async (req, res) => {
  try {
    const {
      video_v,
      thumbnail,
      files_v,
      partners_v,
      upt_partners_v,
      upt_files_v,
    } = req;
    const body = req.body;

    const old_v_info = await ContentArchiveVideo.findOne({
      _id: body.id,
      isDelete: false,
    });

    var resolutions_240,
      resolutions_360,
      resolutions_480,
      vtt_file = "";

    if (!old_v_info)
      return res
        .status(200)
        .json({ status: false, message: "Can not found video with this id." });

    if (body.group_ids?.length > 0) {
      const validGroup = await Group.find({ _id: { $in: body.group_ids } });
      if (validGroup.length <= 0)
        return res
          .status(200)
          .json({ status: false, message: "Not a valid group" });
    }
    if (body.categories?.length > 0) {
      const cat_data = await ContentCategory.countDocuments({
        _id: { $in: body.categories },
        isDelete: false,
      });

      if (cat_data !== body.categories?.length)
        return res.status(200).json({
          status: false,
          message: `Something wrong, Invalid category.`,
        });
    }
    if (body.subcategories?.length > 0) {
      const cat_data = await contentSubCategory.countDocuments({
        _id: { $in: body.subcategories },
        isDelete: false,
      });
      if (cat_data !== body.subcategories.length)
        return res.status(200).json({
          status: false,
          message: `Something wrong, Invalid sub category.`,
        });
    }
    var duration = old_v_info.duration;
    if (video_v) {
      var url = await s3.getSignedUrl("getObject", {
        Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
        Key: video_v,
        Expires: 100000,
      });
      const total_duration = await getVideoDurationInSeconds(url);
      var dateObj = new Date(total_duration * 1000);
      var hours = dateObj.getUTCHours();
      var minutes = dateObj.getUTCMinutes();
      var seconds = dateObj.getSeconds();
      duration =
        (hours.toString().padStart(2, "0") !== "00"
          ? hours.toString() + ":"
          : "") +
        (hours.toString().padStart(2, "0") !== "00"
          ? minutes.toString().padStart(2, "0") + ":"
          : minutes.toString() + ":") +
        seconds.toString().padStart(2, "0");
    }

    if (video_v) {
      await deleteImage(old_v_info.video);
      old_v_info.video_240 !== undefined && old_v_info.video_240.length > 0
        ? await deleteImage(old_v_info.video_240)
        : "";
      old_v_info.video_360 !== undefined && old_v_info.video_360.length > 0
        ? await deleteImage(old_v_info.video_360)
        : "";
      old_v_info.video_480 !== undefined && old_v_info.video_480.length > 0
        ? await deleteImage(old_v_info.video_480)
        : "";
      old_v_info.subtitle_file !== undefined &&
        old_v_info.subtitle_file.length > 0
        ? await deleteImage(old_v_info.subtitle_file)
        : "";
    }

    if (thumbnail && old_v_info.thumbnail)
      await deleteImage(old_v_info.thumbnail);

    var new_partners_arr = old_v_info.relevant_partners;

    if (body.partners?.length > 0) {
      var fI = 0;
      body.partners.map((item3, j) => {
        new_partners_arr.map((partner2, p) => {
          if (item3.id === partner2._id.toString()) {
            new_partners_arr[p]["name"] = item3.name;
            new_partners_arr[p]["url"] = item3.url;
            if (item3.alterlogo === "ok") {
              new_partners_arr[p]["logo"] = upt_partners_v[fI];
              fI++;
            }
          }
        });
      });
    }

    if (body.remove_partner?.length > 0) {
      var arr_ex = [];
      for (var i = 0; i < new_partners_arr.length; i++) {
        if (!body.remove_partner.includes(new_partners_arr[i]._id.toString()))
          arr_ex.push(new_partners_arr[i]);
      }
      new_partners_arr = arr_ex;
    }
    var prtn_index = 0;
    body.partners?.map((partner, i) => {
      const obj = {};
      obj.name = partner.name;
      if (partner.havelogo === "true") {
        obj.logo = partners_v[prtn_index];
        prtn_index++;
      } else {
        obj.logo = "";
      }
      obj.url = partner.url;
      new_partners_arr.push(obj);
    });

    var new_files_arr = old_v_info.files;
    if (body.update_file?.length > 0) {
      var fI = 0;
      body.update_file.map((item, j) => {
        new_files_arr.map((file2, f) => {
          if (item.id === file2._id.toString()) {
            if (item.name) {
              new_files_arr[f]["name"] = item.name;
            }
            if (item.alterurl === "ok") {
              new_files_arr[f]["url"] = upt_files_v[fI];
              fI++;
            }
          }
        });
      });
    }

    if (body.remove_files?.length > 0) {
      var arr_file = [];
      for (var i = 0; i < new_files_arr.length; i++) {
        if (!body.remove_files.includes(new_files_arr[i]._id.toString()))
          arr_file.push(new_files_arr[i]);
      }
      new_files_arr = arr_file;
    }

    body.c_files?.map((file, i) => {
      const obj = {};
      obj.name = file.name;
      obj.url = files_v[i];
      new_files_arr.push(obj);
    });

    let description = `<div "font-family: 'Muller';">${body.description}</div>`;

    const updated = {
      video: video_v ?? old_v_info.video,
      thumbnail:
        thumbnail !== undefined && thumbnail.length > 0
          ? thumbnail
          : old_v_info.thumbnail,
      title: body.title ?? old_v_info.title,
      description: description ?? old_v_info.description,
      categories: body.categories
        ? body.categories
        : body.empty_categories
          ? []
          : old_v_info.categories,
      subcategory: body.subcategories
        ? body.subcategories
        : body.empty_subcategories
          ? []
          : old_v_info.subcategory,
      speaker: body.speaker
        ? body.speaker
        : body.empty_speakers
          ? []
          : old_v_info.speaker,
      tag: body.tag ? body.tag : body.empty_tags ? [] : old_v_info.tag,
      clif_notes_title: body.clif_notes_title ?? old_v_info.clif_notes_title,
      clif_notes: body.clif_notes ?? old_v_info.clif_notes,
      files: new_files_arr,
      relevant_partners: new_partners_arr,
      group_ids: body.group_ids
        ? body.group_ids
        : body.empty_group_ids
          ? []
          : old_v_info.group_ids,
      eventIds: body.eventIds
        ? body.eventIds
        : body.empty_event_ids
          ? []
          : old_v_info.eventIds,
      starting_view_cnt: body.starting_view_cnt,
      duration: duration,
      uploadstatus: video_v ? "inprocess" : "completed",
      eventFor: body.eventFor ?? old_v_info.eventFor,
      createdAt: new Date(body.upload_date),
    };
    const updatedRecord = await ContentArchiveVideo.findByIdAndUpdate(
      body.id,
      updated,
      { runValidators: true, new: true, timestamps: false }
    );
    if (updatedRecord) {
      if (body.makeFeaturedCheckbox.toString() === "true") {
        const videoExistInNews = await adminNews.find({
          videoReferenceId: new ObjectId(body.id),
        });
        if (!(videoExistInNews && videoExistInNews.length > 0)) {
          const addVideoInNews = new adminNews({
            date: new Date(),
            publishDate: new Date(),
            publishOrHide: "hide",
            makeFeaturedCheckbox: false,
            newsType: "video",
            videoReferenceId: body.id,
          });
          const saveNews = await addVideoInNews.save();
        }
      }
    }
    return res.status(200).json({
      status: true,
      message: `Video details updated successfully .`,
      data: updatedRecord,
    });
  } catch (error) {
    console.log(error, "error");
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getContentVideolist = async (req, res) => {
  try {
    // const { page, limit } = req.query;

    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const data = await ContentArchiveVideo.find({ isDelete: false })
      .select("-__v")
      .sort({ createdAt: -1, updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const count = await ContentArchiveVideo.countDocuments({ isDelete: false });

    return res.status(200).json({
      status: true,
      message: `List of videos.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getContentVideo_UserWiselist = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);

    const data = await ContentArchiveVideo.find({
      isDelete: false,
    }).select("-v").sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);

    const count = await ContentArchiveVideo.countDocuments({
      isDelete: false,
    });

    let resOrder = data.map(async (item, i) => {
      const without_html_description = item.description.replace(
        /(<([^>]+)>)/gi,
        ""
      );
      const mobile_description = without_html_description.substring(0, 600);

      item.mobile_description = mobile_description;
      var url = s3.getSignedUrl("getObject", {
        Bucket:
          "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
        Key: item.video,
        Expires: 100000,
      });
      item = { ...item, video_url: url };
    });
    await Promise.all([...resOrder]);

    // console.log(data.group_ids, "data");
    // return false;

    return res.status(200).json({
      status: true,
      message: `List of videos.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getSearchContentVideo = async (req, res) => {
  try {
    const { search } = req.query;
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);

    const data = await ContentArchiveVideo.find({
      isDelete: false,
      title: { $regex: ".*" + search + ".*", $options: "i" },
    }).select("-__v");

    return res
      .status(200)
      .json({ status: true, message: `List of videos.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getContentVideo_byId = async (req, res) => {
  try {
    if (ObjectId.isValid(req.params.id)) {
      var data = await ContentArchiveVideo.findOne({
        _id: req.params.id,
        isDelete: false,
      })
        .select("-__v")
        .lean();
      if (data !== null) {
        let mobile_description = "";
        if (data.description !== undefined) {
          let without_html_description = data.description.replace(
            /&amp;/g,
            "&"
          );
          without_html_description = without_html_description.replace(
            /(<([^>]+)>)/g,
            ""
          );
          without_html_description = without_html_description.replace(
            /(\r\n|\n|\r)/gm,
            ""
          );
          mobile_description = without_html_description.substring(0, 600);
        }

        data.mobile_description = mobile_description;
        var url = s3.getSignedUrl("getObject", {
          Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
          Key: data.video,
          Expires: 100000,
        });
        data = { ...data, video_url: url };
        var new_likes = await getLikes_detail(data.likes);
        const featuredInNews = await adminNews.findOne({
          videoReferenceId: new ObjectId(req.params.id),
        });
        const makeFeaturedCheckbox = featuredInNews ? true : false;
        return res.status(200).json({
          status: true,
          message: `Video by id.`,
          data: {
            ...data,
            likes: new_likes,
            makeFeaturedCheckbox: makeFeaturedCheckbox,
          },
        });
      } else {
        return res
          .status(404)
          .json({ status: false, message: `Video data not found!`, data: [] });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Id is invalid!`, data: [] });
    }
  } catch (error) {
    console.log(error, "error");
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getContentVideo_byId_byUser = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);

    if (ObjectId.isValid(req.params.id)) {

      var data = await ContentArchiveVideo.findOne({
        _id: req.params.id,
        isDelete: false,
      }).select("-__v").lean();

      if (data !== null) {

        const eventAttendeesData = data.eventIds;
        if (data.eventIds !== undefined && userdata !== undefined && userdata !== null && eventAttendeesData !== null) {
          var eventList = [], location = {};
          let attendeesDetails = eventAttendeesData?.map(async (attendee, i) => {
            let eventData = await Event.findOne({ _id: attendee._id, isDelete: false, }, { _id: 1, title: 1, thumbnail: 1, eventUrl: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, timeZone: 1, location: 1, activities: 1 }).lean();

            if (eventData !== null && eventData.location !== undefined && eventData.location !== "" && eventData.location !== null) {
              eventData = { ...eventData, city: eventData.location ? eventData.location.city : null, country: eventData.location ? eventData.location.country : null };
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
          });
          await Promise.all([...attendeesDetails]);
          data = { ...data, eventIds: eventList };
        }

        const without_html_description = data.description.replace(/(<([^>]+)>)/gi, "");
        //const mobile_description = without_html_description.substring(0, 600);
        const mobile_description = without_html_description.replace(/(&nbsp;)*/g, '').substring(0, 600);
        data.mobile_description = mobile_description;

        if (data.speaker && data.speaker.length > 0) {
          data.speaker.filter((speakerData) => {
            speakerData = { ...speakerData, speakerIcon: speakerData.speakerIcon !== undefined && speakerData.speakerIcon !== "" ? speakerData.speakerIcon : speakerData.profileImg };
          });
        }

        var url = s3.getSignedUrl("getObject", {
          Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
          Key: data.video,
          Expires: 100000,
        });
        data = { ...data, video_url: url };

        var new_likes = await getLikes_detail(data.likes);
        return res.status(200).json({ status: true, message: `Video by id.`, data: { ...data, likes: new_likes }, });

      } else {
        return res.status(404).json({ status: false, message: `Video data not found!`, data: [] });
      }
    } else {
      return res.status(200).json({ status: false, message: `Id is invalid!`, data: [] });
    }

  } catch (error) {
    console.log(error, "error");
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.deleteContentVideo_byId = async (req, res) => {
  try {
    const data = await ContentArchiveVideo.findByIdAndUpdate(req.params.id, {
      isDelete: true,
    }).select("-__v");
    if (data) {
      const newsExist = await adminNews.findOne({
        videoReferenceId: new ObjectId(req.params.id),
      });
      if (newsExist && newsExist.thumbnail) deleteImage(newsExist.thumbnail);
      if (newsExist) await adminNews.findByIdAndDelete(newsExist._id);
    }
    return res
      .status(200)
      .json({ status: true, message: `Video deleted.`, data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

async function getLikes_detail(data) {
  var arr_likes = [];
  for (var i = 0; i < data.length; i++) {
    var normal_user = await User.findById(data[i].like_userid);
    if (normal_user) {
      arr_likes.push({
        id: data[i].like_userid,
        name:
          normal_user.otherdetail[process.env.USER_FN_ID] +
          " " +
          normal_user.otherdetail[process.env.USER_LN_ID],
        profile_pic: normal_user.profileImg,
        user: "user",
      });
    } else {
      var admin_user = await AdminUser.findById(data[i].like_userid);
      if (admin_user) {
        arr_likes.push({
          id: data[i].like_userid,
          name: admin_user.first_name + " " + admin_user.last_name,
          user: "adminuser",
        });
      } else {
        arr_likes.push({ id: data[i].like_userid, name: "", user: "" });
      }
    }
  }
  return arr_likes;
}

/** for mobile development **/
exports.uploadMedia_single = async (req, res) => {
  try {
    const { dummy_file } = req;
    const newentry = new Dummy({ test_file: dummy_file });
    const data = await newentry.save();
    return res
      .status(200)
      .json({ status: true, message: `File uploaded.`, data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getDeletedContent_Video = async (req, res) => {
  try {
    const data = await ContentArchiveVideo.find({ isDelete: true }).select(
      "-__v"
    );
    return res
      .status(200)
      .json({ status: true, message: `List of deleted videos.`, data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.restoreContent_Video_Byid = async (req, res) => {
  try {
    const data = await ContentArchiveVideo.findByIdAndUpdate(req.params.id, {
      isDelete: false,
    }).select("-__v");
    return res
      .status(200)
      .json({ status: true, message: `Video restored.`, data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.permenantDelete_ContentVideo_Byid = async (req, res) => {
  try {
    const data = await ContentArchiveVideo.findById(
      new ObjectId(req.params.id)
    );
    if (data !== null) {
      var d_video = "",
        d_video_240 = "",
        d_video_360 = "",
        d_video_480 = "",
        d_files = [],
        d_subtitle = "",
        d_partner = [];

      if (data.video.length > 0) {
        d_video = await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: data.video,
          })
          .promise();
      }

      if (data.video_240 !== undefined && data.video_240.length > 0) {
        d_video_240 = await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: data.video_240,
          })
          .promise();
      }

      if (data.video_360 !== undefined && data.video_360.length > 0) {
        d_video_360 = await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: data.video_360,
          })
          .promise();
      }

      if (data.video_480 !== undefined && data.video_480.length > 0) {
        d_video_480 = await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: data.video_480,
          })
          .promise();
      }

      if (data.files.length > 0) {
        d_files = data.files.map(async (img) => {
          await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET,
              Key: img.url,
            })
            .promise();
        });
      }

      if (data.subtitle_file !== undefined && data.subtitle_file.length > 0) {
        d_subtitle = await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: data.subtitle_file,
          })
          .promise();
      }

      if (data.relevant_partners.length > 0) {
        d_partner = data.relevant_partners.map(async (partner) => {
          await s3
            .deleteObject({
              Bucket: process.env.AWS_BUCKET,
              Key: partner.logo,
            })
            .promise();
        });
      }

      await Promise.all([
        d_video,
        d_video_240,
        d_video_360,
        d_video_480,
        ...d_files,
        d_subtitle,
        ...d_partner,
      ]);
      await data.remove();
      return res
        .status(200)
        .json({ status: true, message: "Video permenantly deleted!" });
    } else {
      return res
        .status(404)
        .json({ status: false, message: "Video not found!" });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.adminaddpausetime = async (req, res) => {
  try {
    const { admin_Id } = req;
    const data = await ContentArchiveVideo.findById(req.params.id).select(
      "user_video_pause"
    );
    if (data.user_video_pause !== undefined) {
      const updated_data = await ContentArchiveVideo.findByIdAndUpdate(
        req.params.id,
        {
          user_video_pause: {
            ...data.user_video_pause,
            [admin_Id]: req.body.pause_time,
          },
        }
      );
      return res
        .status(200)
        .json({ status: true, message: "added pause time" });
    } else {
      const new_data = { [admin_Id]: req.body.pause_time };
      const updated_data = await ContentArchiveVideo.findByIdAndUpdate(
        { _id: req.params.id },
        { $set: { user_video_pause: new_data } }
      );
      return res
        .status(200)
        .json({ status: true, message: "added pause time" });
    }
  } catch (e) {
    return res.status(200).json({ status: false, message: `${e.message}` });
  }
};

exports.useraddpausetime = async (req, res) => {
  try {
    const { authUserId } = req;
    const data = await ContentArchiveVideo.findById(req.params.id).select(
      "user_video_pause"
    );
    if (data.user_video_pause !== undefined) {
      const updated_data = await ContentArchiveVideo.findByIdAndUpdate(
        req.params.id,
        {
          user_video_pause: {
            ...data.user_video_pause,
            [authUserId]: req.body.pause_time,
          },
        }
      );
      return res
        .status(200)
        .json({ status: true, message: "added pause time" });
    } else {
      const new_data = { [authUserId]: req.body.pause_time };
      const updated_data = await ContentArchiveVideo.findByIdAndUpdate(
        { _id: req.params.id },
        { $set: { user_video_pause: new_data } }
      );
      return res
        .status(200)
        .json({ status: true, message: "added pause time" });
    }
  } catch (e) {
    return res.status(200).json({ status: false, message: `${e.message}` });
  }
};

exports.addvideoviewadmin = async (req, res) => {
  try {
    const { admin_Id } = req;
    const data = await ContentArchiveVideo.findById(req.params.id).select(
      "views"
    );

    if (data.views === undefined) {
      const update = await ContentArchiveVideo.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: { views: { view_userid: admin_Id, viewdate: new Date() } },
        }
      );
      return res
        .status(200)
        .json({ status: true, message: "View added successfully!" });
    } else {
      const update = await ContentArchiveVideo.findByIdAndUpdate(
        req.params.id,
        { $push: { views: { view_userid: admin_Id, viewdate: new Date() } } }
      );
      return res
        .status(200)
        .json({ status: true, message: "View added successfully!" });
    }
  } catch (e) {
    return res.status(200).json({ status: false, message: `${e.message}` });
  }
};

exports.addvideoviewuser = async (req, res) => {
  try {
    const { authUserId } = req;
    const data = await ContentArchiveVideo.findById(req.params.id).select(
      "views"
    );

    if (data.views === undefined) {
      const update = await ContentArchiveVideo.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: {
            views: { view_userid: authUserId, viewdate: new Date() },
          },
        }
      );
      return res.status(200).json({
        status: true,
        message: "View added successfully!",
        update: update,
      });
    } else {
      const update = await ContentArchiveVideo.findByIdAndUpdate(
        req.params.id,
        { $push: { views: { view_userid: authUserId, viewdate: new Date() } } }
      );
      return res.status(200).json({
        status: true,
        message: "View added successfully!",
        update: update,
      });
    }
  } catch (e) {
    return res.status(200).json({ status: false, message: `${e.message}` });
  }
};

exports.addvideolikeadmin = async (req, res) => {
  try {
    const { admin_Id } = req;
    const data = await ContentArchiveVideo.findById(req.params.id).select(
      "likes"
    );

    if (
      data.likes.length > 0 &&
      data.likes.filter((item) => {
        item.like_userid.toString() == admin_Id.toString();
        return item;
      }).length > 0
    ) {
      const result = await ContentArchiveVideo.findByIdAndUpdate(
        req.params.id,
        { $pull: { likes: { like_userid: admin_Id } } },
        { new: true }
      );
      return res.status(200).json({ status: true, message: "Likes Updated!" });
    } else {
      const result = await ContentArchiveVideo.updateOne(
        { _id: req.params.id },
        {
          $addToSet: {
            likes: { likes: { like_userid: admin_Id, likedate: new Date() } },
          },
        }
      );
      return res.status(200).json({ status: true, message: "Likes Updated!" });
    }
  } catch (e) {
    return res.status(200).json({ status: false, message: `${e.message}` });
  }
};

exports.addvideolikeuser = async (req, res) => {
  try {
    const { authUserId } = req;
    const data = await ContentArchiveVideo.findById(req.params.id).select(
      "likes"
    );

    if (
      data.likes.length > 0 &&
      data.likes.filter((item) => {
        item.like_userid.toString() == authUserId.toString();
        return item;
      }).length > 0
    ) {
      await ContentArchiveVideo.findByIdAndUpdate(
        req.params.id,
        { $pull: { likes: { like_userid: authUserId } } },
        { new: true }
      );
    } else {
      await ContentArchiveVideo.updateOne(
        { _id: req.params.id },
        {
          $addToSet: {
            likes: { like_userid: authUserId, likedate: new Date() },
          },
        }
      );
    }
    return res.status(200).json({ status: true, message: "Likes Updated!" });
  } catch (e) {
    return res.status(200).json({ status: false, message: `${e.message}` });
  }
};

exports.allVideoList_byadmin = async (req, res) => {
  try {
    const data = await ContentArchiveVideo.aggregate([
      {
        $match: {
          isDelete: false,
        },
      },
      {
        $project: {
          _id: "$_id",
          title: 1,

          viewscount: {
            $size: "$views",
          },
          likescount: {
            $size: "$likes",
          },
          commentscount: {
            $size: "$comments",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .json({ status: true, message: `List of Videos.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.allVideoListByDateForAdmin = async (req, res) => {
  try {
    var fromdate = req.query.fromdate;
    var todate = req.query.todate;
    fromdate = moment(new Date(fromdate)).format("YYYY-MM-DD");
    todate = moment(new Date(todate)).format("YYYY-MM-DD");
    s;

    const data = await ContentArchiveVideo.aggregate([
      { $unwind: { path: "$views", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$likes", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$comments", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "contentarchivecomments",
          let: { comment_id: "$comments" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$comment_id"],
                },
              },
            },
            { $project: { _id: 1, createdAt: 1 } },
          ],
          as: "outcomments",
        },
      },
      { $unwind: { path: "$outcomments", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: "$_id",
          title: "$title",
          view_userid: "$views.view_userid",
          views: { $cond: [{ $ifNull: ["$views", false] }, 0, 1] },
          likes: { $cond: [{ $ifNull: ["$likes", false] }, 0, 1] },
          comments: { $cond: [{ $ifNull: ["$outcomments", false] }, 0, 1] },
          like_userid: "$likes.like_userid",
          comments_id: "$outcomments._id",
          viewdate: {
            $toDate: {
              $dateToString: { format: "%Y-%m-%d", date: "$views.viewdate" },
            },
          },
          likedate: {
            $toDate: {
              $dateToString: { format: "%Y-%m-%d", date: "$likes.likedate" },
            },
          },
          commentdate: {
            $toDate: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$outcomments.createdAt",
              },
            },
          },
        },
      },
      {
        $match: {
          $or: [
            {
              $and: [
                { viewdate: { $ne: null } },
                {
                  viewdate: {
                    $gte: new Date(fromdate),
                    $lte: new Date(todate),
                  },
                },
              ],
            },
            {
              $and: [
                { likedate: { $ne: null } },
                {
                  likedate: {
                    $gte: new Date(fromdate),
                    $lte: new Date(todate),
                  },
                },
              ],
            },
            {
              $and: [
                { commentdate: { $ne: null } },
                {
                  commentdate: {
                    $gte: new Date(fromdate),
                    $lte: new Date(todate),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          _id: "$_id",
          title: 1,
          createdAt: 1,
          viewscount: {
            $sum: "$views",
          },
          likescount: {
            $sum: "$likes",
          },
          commentscount: {
            $sum: "$comments",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .json({ status: true, message: `List of Videos.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getvideobycategory = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);

    const data = await ContentArchiveVideo.find({
      categories: { $in: req.params.cateId },
      isDelete: false,
    })
      .select("-__v")
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const count = await ContentArchiveVideo.countDocuments({
      categories: { $in: req.params.cateId },
      isDelete: false,
    });
    return res.status(200).json({
      status: true,
      message: `List of videos.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getvideobycategory_byadmin = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const data = await ContentArchiveVideo.find({
      categories: { $in: req.params.cateId },
      isDelete: false,
    })
      .select("-__v")
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const count = await ContentArchiveVideo.countDocuments({
      categories: { $in: req.params.cateId },
      isDelete: false,
    });
    return res.status(200).json({
      status: true,
      message: `List of videos.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getmostpopularvideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);

    const allEvents = await ContentEvent.find({
      isDelete: false,
      name: { $ne: "others" },
    });
    var eventFor = ["others"];
    allEvents.forEach(async (event, key) => {
      const eventName = event.name.toLowerCase();
      if (userdata.userEvents !== undefined) {
        if (userdata.userEvents[eventName] === true) {
          eventFor.push(eventName);
        }
      }
    });

    const count = await ContentArchiveVideo.countDocuments({
      isDelete: false,
      uploadstatus: { $ne: "inprocess" },
      eventFor: { $in: eventFor },
    });

    const data = await ContentArchiveVideo.aggregate([
      {
        $match: {
          isDelete: false,
          uploadstatus: { $ne: "inprocess" },
          eventFor: { $in: eventFor },
        },
      },
      {
        $addFields: {
          count: {
            $cond: {
              if: { $isArray: "$views" },
              then: { $size: "$views" },
              else: 0,
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { suggestion_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          localField: "subcategory",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          video: 1,
          description: 1,
          thumbnail: 1,
          createdAt: 1,
          viewsCount: 1,
          commentsCount: 1,
          duration: 1,
          categories: 1,
          views: 1,
          likes: 1,
          user_video_pause: 1,
          eventFor: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: `List of videos.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: req.query.page,
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getrecentlyaddedvideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);
    const data = await ContentArchiveVideo.find({
      isDelete: false,
    })
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const count = await ContentArchiveVideo.countDocuments({
      isDelete: false,
    });

    return res.status(200).json({
      status: true,
      message: `List of videos.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: req.query.page,
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getrelatedvideos = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);
    const videodata = await ContentArchiveVideo.findById(req.params.videoId);

    const allEvents = await ContentEvent.find({
      isDelete: false,
      name: { $ne: "others" },
    });
    var eventFor = ["others"];
    allEvents.forEach(async (event, key) => {
      const eventName = event.name.toLowerCase();
      if (userdata.userEvents !== undefined) {
        if (userdata.userEvents[eventName] === true) {
          eventFor.push(eventName);
        }
      }
    });

    const countData = await ContentArchiveVideo.aggregate([
      {
        $match: {
          _id: { $ne: new ObjectId(req.params.videoId) },
          categories: { $in: videodata.categories },
          isDelete: false,
          uploadstatus: { $ne: "inprocess" },
          eventFor: { $in: eventFor },
        },
      },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { contentarchive_categories_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_categories_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          localField: "subcategory",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
      {
        $addFields: {
          viewsCount: {
            $cond: {
              if: { $isArray: "$views" },
              then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
              else: "$starting_view_cnt",
            },
          },
        },
      },
      {
        $addFields: {
          commentsCount: {
            $cond: {
              if: { $isArray: "$comments" },
              then: { $size: "$comments" },
              else: 0,
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
    var count = 0;

    if (countData.length !== 0) count = countData.length;

    const limit = req.query.limit ? parseInt(req.query.limit) : count;
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const skip = req.query.limit && req.query.page ? (page - 1) * limit : 0;

    const data = await ContentArchiveVideo.aggregate([
      {
        $match: {
          _id: { $ne: new ObjectId(req.params.videoId) },
          categories: { $in: videodata.categories },
          isDelete: false,
          uploadstatus: { $ne: "inprocess" },
          eventFor: { $in: eventFor },
        },
      },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { contentarchive_categories_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$contentarchive_categories_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          localField: "subcategory",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
      {
        $addFields: {
          viewsCount: {
            $cond: {
              if: { $isArray: "$views" },
              then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
              else: "$starting_view_cnt",
            },
          },
        },
      },
      {
        $addFields: {
          commentsCount: {
            $cond: {
              if: { $isArray: "$comments" },
              then: { $size: "$comments" },
              else: 0,
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          video: 1,
          description: 1,
          thumbnail: 1,
          createdAt: 1,
          viewsCount: 1,
          commentsCount: 1,
          duration: 1,
          categories: 1,
          views: 1,
          likes: 1,
          user_video_pause: 1,
          eventFor: 1,
        },
      },
    ]);

    var mobile_desc = data?.map(async (item, index) => {
      let mobile_description = "";
      if (item.description !== undefined) {
        let without_html_description = item.description.replace(/&amp;/g, "&");
        without_html_description = item.description.replace(/(<([^>]+)>)/g, "");
        without_html_description = without_html_description.replace(
          /(\r\n|\n|\r)/gm,
          ""
        );
        mobile_description = without_html_description.substring(0, 600);
      }
      var url = s3.getSignedUrl("getObject", {
        Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
        Key: item.video,
        Expires: 100000,
      });
      item.video = url;
      item.mobile_description = mobile_description.trim();
    });
    await Promise.all([...mobile_desc]);

    return res.status(200).json({
      status: true,
      message: `List of videos.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: page.toString(),
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getnewestcommentsvideo = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);

    const data = await ContentArchiveVideo.aggregate([
      {
        $match: {
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "contentarchivecomments",
          localField: "comments",
          foreignField: "_id",
          as: "outcomments",
        },
      },
      { $sort: { "outcomments.createdAt": -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "contentarchive_categories",
          let: { suggestion_id: "$categories" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "categories",
        },
      },
      {
        $lookup: {
          from: "contentarchive_subcategories",
          localField: "subcategory",
          foreignField: "_id",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "subcategory",
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { suggestion_id: "$group_ids" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$suggestion_id"],
                },
              },
            },
            { $project: { groupTitle: 1 } },
          ],
          as: "group_ids",
        },
      },
    ]);

    const count = await ContentArchiveVideo.countDocuments({
      isDelete: false,
    });

    return res.status(200).json({
      status: true,
      message: `List of videos.`,
      data: [
        {
          videos: data,
          totalPages: Math.ceil(count / limit),
          currentPage: req.query.page,
          totalVideos: count,
        },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

async function generate_video_resolution_240(video_v, total_duration) {
  return new Promise((resolve, reject) => {
    var video_name = video_v.split("/").pop();
    var loc_file_name = Date.now() + "-240p-" + video_name;
    var splittedprog;
    var seconds;
    var url = s3.getSignedUrl("getObject", {
      Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
      Key: video_v,
      Expires: 100000,
    });
    // Perform transcoding, save new video to new file name
    ffmpeg(url)
      .videoCodec("libx264")
      .videoBitrate(350)
      .output(loc_file_name)
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        resolve("");
      })
      .on("progress", function (progress) {
        splittedprog = progress.timemark.split(":");
        seconds = 0;
        if (typeof splittedprog == "undefined") {
          seconds = progress.timemark;
        } else {
          if (typeof splittedprog[3] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 24 * 60 * 60 +
              parseInt(splittedprog[1]) * 60 * 60 +
              parseInt(splittedprog[2]) * 60 +
              parseInt(splittedprog[3]);
          } else if (typeof splittedprog[2] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 60 * 60 +
              parseInt(splittedprog[1]) * 60 +
              parseInt(splittedprog[2]);
          } else if (typeof splittedprog[1] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 60 + parseInt(splittedprog[1]);
          } else if (typeof splittedprog[0] != "undefined") {
            seconds = parseInt(splittedprog[0]);
          }
        }
        console.log(
          ProcessStates,
          ProcessStates + Math.floor((seconds * 25) / total_duration)
        );
        ProcessStates = 25 + Math.floor((seconds * 25) / total_duration);
        console.log("... frames: " + progress.percent);
      })
      .on("end", async function () {
        var upload_s3 = await s3
          .upload({
            Bucket: process.env.AWS_BUCKET,
            Key:
              "uploads/content-archive/videos/" +
              Date.now() +
              "-240p-" +
              video_name,
            Body: fs.createReadStream(loc_file_name),
            ACL: "public-read",
          })
          .promise();

        console.log(upload_s3.Key, " video_file.Key");
        fs.unlinkSync(loc_file_name);
        resolve(upload_s3.Key);
      })
      .run();
  });
}

async function generate_video_resolution_360(video_v, total_duration) {
  return new Promise((resolve, reject) => {
    var video_name = video_v.split("/").pop();
    var loc_file_name = Date.now() + "-360p-" + video_name;
    var splittedprog;
    var seconds;
    var url = s3.getSignedUrl("getObject", {
      Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
      Key: video_v,
      Expires: 100000,
    });
    ffmpeg(url)
      .videoCodec("libx264")
      .videoBitrate(700)
      .output(loc_file_name)
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        resolve("");
      })
      .on("progress", function (progress) {
        splittedprog = progress.timemark.split(":");
        seconds = 0;
        if (typeof splittedprog == "undefined") {
          seconds = progress.timemark;
        } else {
          if (typeof splittedprog[3] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 24 * 60 * 60 +
              parseInt(splittedprog[1]) * 60 * 60 +
              parseInt(splittedprog[2]) * 60 +
              parseInt(splittedprog[3]);
          } else if (typeof splittedprog[2] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 60 * 60 +
              parseInt(splittedprog[1]) * 60 +
              parseInt(splittedprog[2]);
          } else if (typeof splittedprog[1] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 60 + parseInt(splittedprog[1]);
          } else if (typeof splittedprog[0] != "undefined") {
            seconds = parseInt(splittedprog[0]);
          }
        }
        console.log(
          ProcessStates,
          ProcessStates + Math.floor((seconds * 25) / total_duration)
        );
        ProcessStates = 50 + Math.floor((seconds * 25) / total_duration);
        console.log("... frames: " + { ...progress });
      })
      .on("end", async function () {
        var upload_s3 = await s3
          .upload({
            Bucket: process.env.AWS_BUCKET,
            Key:
              "uploads/content-archive/videos/" +
              Date.now() +
              "-360p-" +
              video_name,
            Body: fs.createReadStream(loc_file_name),
            ACL: "public-read",
          })
          .promise();
        console.log(upload_s3.Key, " video_file.Key");
        fs.unlinkSync(loc_file_name);
        resolve(upload_s3.Key);
      })
      .run();
  });
}

async function generate_video_resolution_480(video_v, total_duration) {
  return new Promise((resolve, reject) => {
    var video_name = video_v.split("/").pop();
    var loc_file_name = video_name;
    var splittedprog;
    var seconds;
    var url = s3.getSignedUrl("getObject", {
      Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
      Key: video_v,
      Expires: 100000,
    });
    ffmpeg(url)
      .videoCodec("libx264")
      .videoBitrate(1200)
      .output(loc_file_name)
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        resolve("");
      })
      .on("progress", function (progress) {
        splittedprog = progress.timemark.split(":");
        seconds = 0;
        if (typeof splittedprog == "undefined") {
          seconds = progress.timemark;
        } else {
          if (typeof splittedprog[3] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 24 * 60 * 60 +
              parseInt(splittedprog[1]) * 60 * 60 +
              parseInt(splittedprog[2]) * 60 +
              parseInt(splittedprog[3]);
          } else if (typeof splittedprog[2] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 60 * 60 +
              parseInt(splittedprog[1]) * 60 +
              parseInt(splittedprog[2]);
          } else if (typeof splittedprog[1] != "undefined") {
            seconds =
              parseInt(splittedprog[0]) * 60 + parseInt(splittedprog[1]);
          } else if (typeof splittedprog[0] != "undefined") {
            seconds = parseInt(splittedprog[0]);
          }
        }

        ProcessStates = Math.floor((seconds * 25) / total_duration);
        console.log("... frames: " + progress.frames);
        console.log("..ProcessStates", ProcessStates);
      })
      .on("end", async function () {
        var upload_s3 = await s3
          .upload({
            Bucket: process.env.AWS_BUCKET,
            Key:
              "uploads/content-archive/videos/" +
              Date.now() +
              "-480p-" +
              video_name,
            Body: fs.createReadStream(loc_file_name),
            ACL: "public-read",
          })
          .promise();
        console.log(upload_s3.Key, " video_file.Key");
        fs.unlinkSync(loc_file_name);
        resolve(upload_s3.Key);
      })
      .run();
  });
}

async function getsubtitlefile(video_v) {
  try {
    var video_name = video_v.split("/").pop();
    var subtitle_URL = "";
    ProcessStates = 10;
    const params = {
      TranscriptionJobName: "speechrecognize_CurrentJob" + Math.random(),
      LanguageCode: "en-US",
      Media: {
        MediaFileUri: "s3://mds-community/" + video_v,
      },
      OutputBucketName: process.env.AWS_BUCKET,
      OutputKey: "videos-subtitles/",
      Subtitles: {
        Formats: ["vtt"],
        OutputStartIndex: 1,
      },
      ACL: "public-read",
    };
    const transcribeConfig = {
      region,
      credentials,
    };
    const transcribeClient = new TranscribeClient(transcribeConfig);
    const data_transcibe = await transcribeClient.send(
      new StartTranscriptionJobCommand(params)
    );
    ProcessStates = 15;
    const data_onsucess = await getTranscriptionDetails(params);
    if (data_onsucess.TranscriptionJob.TranscriptionJobStatus === "COMPLETED") {
      var splited_url =
        data_onsucess.TranscriptionJob.Subtitles.SubtitleFileUris[0].split("/");
      subtitle_URL =
        splited_url[splited_url.length - 2] +
        "/" +
        splited_url[splited_url.length - 1];
    } else {
      subtitle_URL = "";
    }
    ProcessStates = 25;
    return subtitle_URL;
  } catch (e) {
    console.log(e);
    return "";
  }
}

const getTranscriptionDetails = async (params) => {
  try {
    ProcessStates = 20;
    while (true) {
      const transcribeConfig = {
        region,
        credentials,
      };
      const transcribeClient = new TranscribeClient(transcribeConfig);
      const data = await transcribeClient.send(
        new GetTranscriptionJobCommand(params)
      );
      const status = data.TranscriptionJob.TranscriptionJobStatus;
      if (status === "COMPLETED") {
        ProcessStates = 25;
        console.log("URL:", data.TranscriptionJob.Subtitles.SubtitleFileUris);
        const data_delete = await transcribeClient.send(
          new DeleteTranscriptionJobCommand(params)
        );
        return data;
      } else if (status === "FAILED") {
        console.log("Failed:", data.TranscriptionJob.FailureReason);
        return data.TranscriptionJob.FailureReason;
      } else {
        console.log("In Progress...", data);
      }
    }
  } catch (err) {
    console.log("Error", err);
  }
};

exports.getProcessStatus = async (req, res) => {
  try {
    return res.status(200).json({ data: ProcessStates });
  } catch (e) {
    console.log(e);
  }
};

exports.get_allvideos_from_s3bucket = async (req, res) => {
  try {
    let params = {
      Bucket: process.env.AWS_BUCKET,
      Prefix: "testing/",
    };
    const allKeys = [];
    var done = function (err, data) {
      if (err)
        return res
          .status(200)
          .json({ status: false, data: err, message: "err" });
      else
        return res
          .status(200)
          .json({ status: false, data: data, message: "successfull" });
    };
    var num = 1;
    const getallgroup = await Group.find({ isDelete: false });
    var allgrps = [];
    for (var i = 0; i < getallgroup.length; i++) {
      allgrps[i] = getallgroup[i]._id;
    }
    listAllKeys();

    function listAllKeys() {
      s3.listObjects(
        { Bucket: process.env.AWS_BUCKET, Prefix: "testing/" },
        function (err, data) {
          if (data.Contents.length) {
            data.Contents.forEach(async (file, index) => {
              var params_copy = {
                Bucket: process.env.AWS_BUCKET,
                CopySource: process.env.AWS_BUCKET + "/" + file.Key,
                Key: file.Key.replace(
                  "testing/",
                  "uploads/content-archive/videos/"
                ),
                ACL: "public-read",
              };
              s3.copyObject(params_copy, async function (copyErr, copyData) {
                if (copyErr) {
                  console.log(copyErr);
                } else {
                  if (params_copy.Key !== "uploads/content-archive/videos/") {
                    const metadata = await s3
                      .headObject({
                        Bucket: process.env.AWS_BUCKET,
                        Key: params_copy.Key,
                      })
                      .promise();
                    const newentry = new ContentArchiveVideo({
                      video: params_copy.Key,
                      title: metadata.Metadata.title,
                      group_ids: allgrps,
                      description: metadata.Metadata.description,
                    });
                    const added_data = await newentry.save();
                    allKeys.push(added_data);
                    await s3
                      .deleteObject({
                        Bucket: process.env.AWS_BUCKET,
                        Key: file.Key,
                      })
                      .promise();
                  }
                  num++;
                  if (data.Contents.length === num) {
                    res.status(200).json({
                      status: false,
                      data: allKeys,
                      message: "successfull",
                    });
                  }
                }
              });
            });
          }
        }
      );
    }
  } catch (e) {
    console.log(e);
  }
};

/** Code By SJ Speaker CURD Start test Specket 1**/
exports.createSpeakerInUser = async (req, res) => {
  try {
    const getEventAttendeeEmail = await User.findOne({
      "Preferred Email": req.body.email.toLowerCase(), $or: [{ isDelete: false }, { isDelete: { $exists: false } }]
    }).lean();

    if (req.speakerIcon && getEventAttendeeEmail && getEventAttendeeEmail.speakerIcon) {
      getEventAttendeeEmail.speakerIcon &&
        (await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET,
          Key: getEventAttendeeEmail.speakerIcon,
        }).promise());
    }

    if (getEventAttendeeEmail) {
      if (!getEventAttendeeEmail.attendeeDetail)
      {
          const updateEventAttendeeDetail =   await User.findOneAndUpdate({
            "Preferred Email": req.body.email.toLowerCase(), $or: [{ isDelete: false }, { isDelete: { $exists: false } }]
          } ,{  attendeeDetail: {
            title: "",
            name: (
              (getEventAttendeeEmail["Full Name"] ? getEventAttendeeEmail["Full Name"]  :  
               (getEventAttendeeEmail["Last Name"] ? getEventAttendeeEmail["Last Name"]  : '') + ' ' +  (getEventAttendeeEmail["First Name"] ? getEventAttendeeEmail["First Name"]  : '')).trim()),
            firstName: getEventAttendeeEmail["First Name"] ? getEventAttendeeEmail["First Name"] : "",
            lastName: getEventAttendeeEmail["Last Name"] ? getEventAttendeeEmail["Last Name"] : "",
            email: getEventAttendeeEmail["Preferred Email"] ? getEventAttendeeEmail["Preferred Email"] : "" ,
            company: '',
            phone: '',
            facebook: "",
            linkedin: "",
            auth0Id: "",
            profession: "",
            description: "",
            offer: "",
            contactPartnerName: "",
            evntData: [],
          }})
       
      }
      return res.status(200).json({ status: false, message: `Speaker email must be unique.` });
    }
    const io = req.app.get("socketio");
    var getEventAttendeeAuth = null;
    if (req.body.auth0Id) {
      getEventAttendeeAuth = await User.findOne({
        "auth0Id": req.body.auth0Id
      }).lean();
    }

    if (!getEventAttendeeEmail && !getEventAttendeeAuth) {
      const newEventAttendee = new User({
        "Preferred Email": req.body.email.toLowerCase(),
        auth0Id: req.body.auth0Id,
        passcode: req.body.passcode,
        speakerIcon: req.speakerIcon !== undefined && req.speakerIcon !== null && req.speakerIcon !== "" ? req.speakerIcon : getEventAttendeeEmail !== undefined && getEventAttendeeEmail !== null && getEventAttendeeEmail !== "" ? getEventAttendeeEmail.speakerIcon : "",
        isDelete: false,
        attendeeDetail: {
          title: "",
          name: req.body.name,
          firstName: req.body.firstName ? req.body.firstName : "",
          lastName: req.body.lastName ? req.body.lastName : "",
          email: req.body.email.toLowerCase(),
          company: req.body.company,
          phone: req.body.phone,
          facebook: req.body.facebook,
          linkedin: req.body.linkedin,
          auth0Id: req.body.auth0Id,
          profession: req.body.profession,
          description: "",
          offer: "",
          contactPartnerName: "",
          evntData: [],
        }
      });

      const eventAttendeeData = await newEventAttendee.save();
      if (eventAttendeeData)
        return res.status(200).json({ status: true, message: "Speaker created successfully.", });
      else
        return res.status(200).json({ status: false, message: "Something went wrong while creating speaker!", });
    }

  } catch (error) {
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res.status(200).json({ status: false, message: `Speaker email must be unique.` });
    } else {
      console.log(error, "error");
      return res.status(200).json({ status: false, message: `Something went wrong. ${error}` });
    }
  }
};

exports.createSpeaker = async (req, res) => {
  try {
    const checkname = await ContentSpeaker.find({
      email: req.body.email.toLowerCase(),
      isDelete: false,
    });
    if (checkname && checkname.length > 0) {
      return res.status(200).json({ status: false, message: `Speaker email must be unique.` });
    }

    const newentry = new ContentSpeaker({
      name: req.body.name,
      photo: req.speaker_pic,
      company: req.body.company,
      title: req.body.title,
      email: req.body.email.toLowerCase(),
      phone: req.body.phone,
      facebook: req.body.facebook,
      linkedin: req.body.linkedin,
      custom: req.body.custom,
      designation: req.body.designation,
    });
    const result = await newentry.save();

    return res.status(200).json({ status: true, message: `Speaker created.`, data: result });
  } catch (error) {
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res.status(200).json({ status: false, message: `Speaker email must be unique.` });
    } else {
      return res.status(200).json({ status: false, message: `Something went wrong. ${error}` });
    }
  }
};

exports.getAllSpeakerList = async (req, res) => {
  try {
    const data = await ContentSpeaker.find({ isDelete: false });
    return res
      .status(200)
      .json({ status: true, message: `List of speakers.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.adminSpeakerList = async (req, res) => {
  try {
    const data = await ContentSpeaker.aggregate([
      {
        $match: {
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "contentarchive_videos",
          localField: "_id",
          foreignField: "speaker",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "totalcount",
        },
      },
      {
        $project: {
          _id: "$_id",
          name: 1,
          counts: {
            $size: "$totalcount",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .json({ status: true, message: `List of speakers.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.speakerById = async (req, res) => {
  try {
    const speakerData = await ContentSpeaker.findById(
      new ObjectId(req.params.id)
    );
    if (speakerData) {
      return res
        .status(200)
        .json({
          status: true,
          message: `Speaker data retrive.`,
          data: speakerData,
        });
    } else {
      return res
        .status(404)
        .json({ status: false, message: `Speaker data not found.`, data: [] });
    }
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.updateSpeaker = async (req, res) => {
  try {
    const checkname = await ContentSpeaker.find({
      $and: [
        { email: req.body.email },
        { _id: { $ne: new ObjectId(req.params.id) } },
      ],
      isDelete: false,
    });
    if (checkname && checkname.length > 0) {
      return res
        .status(200)
        .json({ status: false, message: `Speaker email must be unique.` });
    }

    const speakerData = await ContentSpeaker.findById(
      new ObjectId(req.params.id)
    ).lean();
    if (speakerData) {
      if (req.speaker_pic) {
        deleteImage(speakerData.photo);
      }
      const result = await ContentSpeaker.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        {
          name: req.body.name ?? speakerData.name,
          photo: req.speaker_pic ?? speakerData.photo,
          company: req.body.company ?? speakerData.company,
          title: req.body.title ?? speakerData.title,
          email: req.body.email ?? speakerData.email,
          phone: req.body.phone ?? speakerData.phone,
          facebook: req.body.facebook ?? speakerData.facebook,
          linkedin: req.body.linkedin ?? speakerData.linkedin,
          custom: req.body.custom ?? speakerData.custom,
          designation: req.body.designation ?? speakerData.designation,
        },
        { new: true }
      );
      return res
        .status(200)
        .json({ status: true, message: `Speaker data updated.`, data: result });
    } else {
      return res
        .status(404)
        .json({ status: false, message: `Speaker data not found.`, data: [] });
    }
  } catch (error) {
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res
        .status(200)
        .json({ status: false, message: `Speaker email must be unique.` });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Something went wrong. ${error}` });
    }
  }
};

exports.deleteSpeaker = async (req, res) => {
  try {
    const speakerData = await ContentSpeaker.findById(
      new ObjectId(req.params.id)
    );
    if (speakerData) {
      const result = await ContentSpeaker.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { isDelete: true },
        { new: true }
      );
      return res
        .status(200)
        .json({ status: true, message: `Speaker data deleted.`, data: result });
    } else {
      return res
        .status(404)
        .json({ status: false, message: `Speaker data not found.`, data: [] });
    }
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

// export speaker data
exports.exportSpeakers = async (req, res) => {
  try {
    const data = await ContentSpeaker.find({ isDelete: false })
      .select(
        "title name email company phone facebook linkedin type auth0Id event"
      )
      .sort({ createdAt: -1 });
    if (data)
      return res
        .status(200)
        .json({ status: true, message: "All speakers list!", data: data });
    else
      return res
        .status(200)
        .json({ status: true, message: "No data found!", data: [] });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error!", error: error });
  }
};

// import speaker data
exports.importSpeakers = async (req, res) => {
  try {
    const body = req.body;
    const allSpeaker = body.allSpeakers;
    allSpeaker?.forEach(async (speakerData, i) => {
      const speaker = await ContentSpeaker.find({
        email: speakerData.email,
        isDelete: false,
      });

      if (speakerData.email && speaker && speaker.length) {
        await ContentSpeaker.findOneAndUpdate(
          { email: speakerData.email, event: { $nin: speakerData.eventId } },
          {
            title: speakerData.title,
            name: speakerData.name,
            company: speakerData.company,
            phone: speakerData.phone,
            facebook: speakerData.facebook,
            linkedin: speakerData.linkedin,
            type: speakerData.type,
            auth0Id: speakerData.auth0Id,
            $push: { event: speakerData.eventId },
          },
          { new: true }
        );
        await ContentSpeaker.find({
          email: speakerData.email,
          event: { $in: speakerData.eventId },
        });
      } else {
        const newData = new ContentSpeaker({
          title: speakerData.title,
          name: speakerData.name,
          email: speakerData.email,
          company: speakerData.company,
          phone: speakerData.phone,
          facebook: speakerData.facebook,
          linkedin: speakerData.linkedin,
          type: speakerData.type,
          auth0Id: speakerData.auth0Id,
          $push: { event: speakerData.eventId },
        });
        await newData.save();
      }

      if (i === allSpeaker.length - 1) {
        return res
          .status(200)
          .json({ status: true, message: "Import Done successfully." });
      }
    });
  } catch (e) {
    return res.status(200).json({ status: false, message: "Something wrong!" });
  }
};

/** Code By SJ Speaker CURD Ends **/

/** Code By SJ Tag CURD Start **/
exports.createTag = async (req, res) => {
  try {
    const checkname = await ContentTag.find({
      name: req.body.name,
      isDelete: false,
    });
    if (checkname && checkname.length > 0) {
      return res
        .status(200)
        .json({ status: false, message: `Tag name must be unique.` });
    }

    const newentry = new ContentTag({ name: req.body.name });
    const result = await newentry.save();

    return res
      .status(200)
      .json({ status: true, message: `Tag created.`, data: result });
  } catch (error) {
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res
        .status(200)
        .json({ status: false, message: `Tag name must be unique.` });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Something went wrong. ${error}` });
    }
  }
};

exports.adminTagList = async (req, res) => {
  try {
    const data = await ContentTag.aggregate([
      {
        $match: {
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "contentarchive_videos",
          localField: "_id",
          foreignField: "tag",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "totalcount",
        },
      },
      {
        $project: {
          _id: "$_id",
          name: 1,
          counts: {
            $size: "$totalcount",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .json({ status: true, message: `List of tags.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.tagById = async (req, res) => {
  try {
    const tagData = await ContentTag.findById(new ObjectId(req.params.id));
    if (tagData) {
      return res
        .status(200)
        .json({ status: true, message: `Tag data retrive.`, data: tagData });
    } else {
      return res
        .status(404)
        .json({ status: false, message: `Tag data not found.`, data: [] });
    }
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.updateTag = async (req, res) => {
  try {
    const checkname = await ContentTag.find({
      name: req.body.name,
      isDelete: false,
    });
    if (checkname && checkname.length > 0) {
      return res
        .status(200)
        .json({ status: false, message: `Tag name must be unique.` });
    }

    const tagData = await ContentTag.findById(new ObjectId(req.params.id));
    if (tagData) {
      const result = await ContentTag.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { name: req.body.name },
        { new: true }
      );
      return res
        .status(200)
        .json({ status: true, message: `Tag data updated.`, data: result });
    } else {
      return res
        .status(404)
        .json({ status: false, message: `Tag data not found.`, data: [] });
    }
  } catch (error) {
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res
        .status(200)
        .json({ status: false, message: `Tag name must be unique.` });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Something went wrong. ${error}` });
    }
  }
};

exports.deleteTag = async (req, res) => {
  try {
    const tagData = await ContentTag.findById(new ObjectId(req.params.id));
    if (tagData) {
      const result = await ContentTag.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { isDelete: true },
        { new: true }
      );
      return res
        .status(200)
        .json({ status: true, message: `Tag data deleted.`, data: result });
    } else {
      return res
        .status(404)
        .json({ status: false, message: `Tag data not found.`, data: [] });
    }
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};
/** Code By SJ Tag CURD Ends **/

exports.deleteCommentFromVideo = async (req, res) => {
  try {
    const result = await ContentArchiveVideo.updateMany(
      {},
      { comments: [] },
      { new: true }
    );
    return res.status(200).json({
      status: true,
      message: `Deleted comments from all videos.`,
      data: result,
    });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.allVideoList = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);

    const result = await Promise.all(
      await ContentArchiveVideo.aggregate([
        {
          $match: {
            isDelete: false,
          },
        },
        {
          $project: {
            title: 1,
          },
        },
      ])
    );

    return res.status(200).json({
      status: true,
      message: `Users All videos retrive.`,
      data: result,
    });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.addSearchHistory = async (req, res) => {
  try {
    const { search } = req.body;
    const authUser = req.authUserId;
    const userData = await User.findById(authUser).select("_id").lean();

    var result = [];
    const checkname = await ContentSearch.find({ name: search, userId: userData._id });
    if (checkname && checkname.length > 0) {
      result = await ContentSearch.findOneAndUpdate(
        { name: search, userId: userData._id },
        { name: search, userId: userData._id },
        { new: true }
      );
    } else {
      const newentry = new ContentSearch({ name: search, userId: userData._id });
      result = await newentry.save();
    }

    return res.status(200).json({ status: true, message: `Search history added.`, data: result });
  } catch (error) {
    return res.status(500).json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.removeSearchHistory = async (req, res) => {
  try {
    const Data = await ContentSearch.findById(new ObjectId(req.params.id));
    if (Data) {
      const result = await ContentSearch.findOneAndDelete(
        { _id: new ObjectId(req.params.id) },
        { new: true }
      );
      return res.status(200).json({ status: true, message: `Search history removed.`, data: result, });
    } else {
      return res.status(404).json({ status: false, message: `Search history not found.`, data: [], });
    }
  } catch (error) {
    return res.status(500).json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.topSearchHistory = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const userData = await User.findById(authUser).select("_id").lean();

    const result = await ContentSearch.find({ userId: userData._id }).sort({ updatedAt: -1 }).limit(10).select("-__v -createdAt");

    return res.status(200).json({ status: true, message: `Search history retrive.`, data: result });
  } catch (error) {
    return res.status(500).json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.getMetaData = async (req, res) => {
  try {
    const url = req.query.urlData;

    await (async () => {
      var result = await parser(`${url}`);
      return res
        .status(200)
        .json({ status: true, message: `URL metadata retrive.`, data: result });
    })();
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

/** Code By SJ Event CURD Start **/
exports.createEvent = async (req, res) => {
  try {
    const eventName = req.body.name.toLowerCase();
    const checkname = await ContentEvent.find({
      name: eventName,
      isDelete: false,
    });
    if (checkname && checkname.length > 0) {
      return res
        .status(200)
        .json({ status: false, message: `Event name must be unique.` });
    }

    const newentry = new ContentEvent({ name: eventName });
    const result = await newentry.save();

    const AllUsers = await User.find({ isDelete: false });
    AllUsers.forEach(async (userData, i) => {
      const userEventsAlreadyAdded = await User.findOne(
        { _id: userData._id, "userEvents": { $exists: true } },
      );

      if (userEventsAlreadyAdded !== null) {
        const alreadyAdded = await User.findOne(
          { _id: userData._id, [`userEvents.${eventName}`]: true },
          { [`userEvents.${eventName}`]: 1 }
        );

        if (alreadyAdded !== null) {
          if (alreadyAdded.userEvents !== null) {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $set: { [`userEvents.${eventName}`]: true } }
            );
          }
        } else {
          const notAdded = await User.findOne(
            { _id: userData._id, [`userEvents.${eventName}`]: false },
            { [`userEvents.${eventName}`]: 1 }
          );
          if (notAdded !== null && notAdded.userEvents !== null) {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $set: { [`userEvents.${eventName}`]: false } }
            );
          } else {
            await User.findOneAndUpdate(
              { _id: userData._id },
              { $set: { [`userEvents.${eventName}`]: false } }
            );
          }
        }
      } else {
        await User.findOneAndUpdate(
          { _id: userData._id },
          { $set: { [`userEvents.${eventName}`]: false } }
        );
      }

    });

    return res
      .status(200)
      .json({ status: true, message: `Event created.`, data: result });
  } catch (error) {
    console.log(error, "error");
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res
        .status(200)
        .json({ status: false, message: `Event name must be unique.` });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Something went wrong. ${error}` });
    }
  }
};

exports.adminEventList = async (req, res) => {
  try {
    const data = await ContentEvent.aggregate([
      {
        $match: {
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "contentarchive_videos",
          localField: "name",
          foreignField: "eventFor",
          pipeline: [
            {
              $match: {
                isDelete: false,
              },
            },
          ],
          as: "totalcount",
        },
      },
      {
        $project: {
          _id: "$_id",
          name: 1,
          counts: {
            $size: "$totalcount",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .json({ status: true, message: `List of events.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.eventById = async (req, res) => {
  try {
    const eventData = await ContentEvent.findById(new ObjectId(req.params.id));
    if (eventData) {
      return res.status(200).json({
        status: true,
        message: `Event data retrive.`,
        data: eventData,
      });
    } else {
      return res
        .status(404)
        .json({ status: false, message: `Event data not found.`, data: [] });
    }
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const eventName = req.body.name.toLowerCase();
    const eventData = await ContentEvent.findById(new ObjectId(req.params.id));
    const checkname = await ContentEvent.find({
      _id: { $ne: ObjectId(eventData._id) },
      name: eventName,
      isDelete: false,
    });

    if (checkname && checkname.length > 0) {
      return res
        .status(200)
        .json({ status: false, message: `Event name must be unique.` });
    }

    if (eventData) {
      const result = await ContentEvent.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { name: eventName },
        { new: true }
      );

      const eventVideos = await ContentArchiveVideo.find({
        isDelete: false,
        eventFor: eventData.name,
      });

      var temp = eventVideos?.map(async (video, index) => {
        await ContentArchiveVideo.findOneAndUpdate(
          { _id: ObjectId(video._id) },
          { eventFor: eventName }
        );
      });

      const AllUsers = await User.find({ isDelete: false });
      AllUsers.forEach(async (userData, i) => {
        const alreadyEventsAdded = await User.findOne(
          { _id: userData._id, userEvents: { $exists: true } }

        );


        if (alreadyEventsAdded !== null) {
          const alreadyExistsEvent = await User.findOne(
            { _id: userData._id, [`userEvents.${eventData.name}`]: { $exists: true } },
          );

          console.log(alreadyEventsAdded, 'dsfdsf');

          if (alreadyExistsEvent !== null) {
            if (alreadyExistsEvent.userEvents[`${eventData.name}`] == true) {
              if (eventData.name !== eventName) {
                const removeAndUpdateEvent = await User.findOneAndUpdate({ _id: userData._id }, { $unset: { [`userEvents.${eventData.name}`]: true }, $set: { [`userEvents.${eventName}`]: true } }, { new: true })
              } else {
                const UpdateEventData = await User.findOneAndUpdate({ _id: userData._id }, { $set: { [`userEvents.${eventName}`]: true } }, { new: true })
              }

            } else {
              if (eventData.name !== eventName) {

                const removeAndUpdateEvent = await User.findOneAndUpdate({ _id: userData._id }, { $unset: { [`userEvents.${eventData.name}`]: false }, $set: { [`userEvents.${eventName}`]: false } }, { new: true })
              } else {
                const UpdateEventData = await User.findOneAndUpdate({ _id: userData._id }, { $set: { [`userEvents.${eventName}`]: false } }, { new: true })
              }

            }


          } else {
            const updateEvent = await User.findOneAndUpdate({ _id: userData._id }, { $set: { [`userEvents.${eventData.name}`]: false } }, { new: true })
          }





        } else {

          const updateEvent = await User.findOneAndUpdate({ _id: userData._id }, {
            $set: {
              [`userEvents.${eventName}`]: false

            }
          })
        }
      });
      await Promise.all([...temp]);

      return res
        .status(200)
        .json({ status: true, message: `Event data updated.`, data: result });
    } else {
      return res
        .status(404)
        .json({ status: false, message: `Event data not found.`, data: [] });
    }
  } catch (error) {
    if (error.name === "MongoServerError" && error.code === 11000) {
      return res
        .status(200)
        .json({ status: false, message: `Event name must be unique.` });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Something went wrong. ${error}` });
    }
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const body = req.body;
    const eventData = await ContentEvent.findById(
      new ObjectId(body.deleted_event_id)
    );
    const changeEventData = await ContentEvent.findById(
      new ObjectId(body.reassign_event_id)
    );

    const eventVideos = await ContentArchiveVideo.find({
      isDelete: false,
      eventFor: eventData.name,
    });

    var temp = eventVideos?.map(async (video, index) => {
      await ContentArchiveVideo.findOneAndUpdate(
        { _id: ObjectId(video._id) },
        { eventFor: changeEventData.name }
      );
    });

    const eventName = eventData.name;
    const AllUsers = await User.find({ isDelete: false });
    AllUsers.forEach(async (userData, i) => {

      const alreadyEventsAdded = await User.findOne(
        { _id: userData._id, userEvents: { $exists: true } }

      );

      if (alreadyEventsAdded !== null) {
        const alreadyExistsEvent = await User.findOne(
          { _id: userData._id, [`userEvents.${eventData.name}`]: { $exists: true } },
        );


        if (alreadyExistsEvent !== null) {
          if (alreadyExistsEvent.userEvents[`${eventData.name}`] == true) {
            if (eventData.name !== changeEventData.name) {
              const removeAndUpdateEvent = await User.findOneAndUpdate({ _id: userData._id }, { $unset: { [`userEvents.${eventData.name}`]: true }, $set: { [`userEvents.${changeEventData.name}`]: true } }, { new: true })
            } else {
              const UpdateEventData = await User.findOneAndUpdate({ _id: userData._id }, { $set: { [`userEvents.${changeEventData.name}`]: true } }, { new: true })
            }

          } else {
            if (eventData.name !== changeEventData.name) {

              const removeAndUpdateEvent = await User.findOneAndUpdate({ _id: userData._id }, { $unset: { [`userEvents.${eventData.name}`]: false }, $set: { [`userEvents.${changeEventData.name}`]: false } }, { new: true })
            } else {
              const UpdateEventData = await User.findOneAndUpdate({ _id: userData._id }, { $set: { [`userEvents.${changeEventData.name}`]: false } }, { new: true })
            }

          }


        } else {
          const updateEvent = await User.findOneAndUpdate({ _id: userData._id }, { $set: { [`userEvents.${eventData.name}`]: false } }, { new: true })
        }
      } else {

        const updateEvent = await User.findOneAndUpdate({ _id: userData._id }, {
          $set: {
            [`userEvents.${changeEventData.name}`]: false

          }
        })
      }

    });
    await ContentEvent.findByIdAndUpdate(new ObjectId(body.deleted_event_id), {
      isDelete: true,
    });
    await Promise.all([...temp]);

    return res
      .status(200)
      .json({ status: true, message: "Event list updated!" });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

//for temporary use-delete userevents properties from postman-api
exports.deleteUserEvents = async (req, res) => {
  try {
    console.log(req.body.name)
    const eventName = req.body.name;
    const AllUsers = await User.find({ isDelete: false });
    AllUsers.forEach(async (userData, i) => {

      const alreadyEventsAdded = await User.findOne(
        { _id: userData._id, userEvents: { $exists: true } }

      );


      if (alreadyEventsAdded !== null) {
        const alreadyExistsEvent = await User.findOne(
          { _id: userData._id, [`userEvents.${eventName}`]: { $exists: true } },
        );
        if (alreadyExistsEvent !== null) {
          const removeAndUpdateEvent = await User.findOneAndUpdate({ _id: userData._id }, { $unset: { [`userEvents.${eventName}`]: true } }, { new: true })
        }
      }



    });

    //await Promise.all([...temp]);

    return res
      .status(200)
      .json({ status: true, message: "Event list updated!" });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

exports.restEvents = async (req, res) => {
  const eventid = req.params.id;
  try {
    const data = await ContentEvent.aggregate([
      {
        $match: {
          isDelete: false,
          _id: { $ne: ObjectId(eventid) },
        },
      },
      {
        $project: {
          _id: "$_id",
          name: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .json({ status: true, message: `List of rest events.`, data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};
/** Code By SJ Event CURD Ends **/

/*search video feature in content video library on admin side */
exports.getAllOverContentVideoByAdmin = async (req, res) => {
  try {
    const { search, id } = req.query;
    console.log(req.query);

    if (id !== undefined && id !== null && id !== "") {
      const data = await ContentArchiveVideo.find({
        isDelete: false,
        categories: { $in: [ObjectId(id)] },
        title: { $regex: ".*" + search + ".*", $options: "i" },
        uploadstatus: { $ne: "inprocess" },
        "group_ids.0": { $exists: true },
      })
        .sort({ createdAt: -1, updatedAt: -1 })
        .select("-__v");

      const count = await ContentArchiveVideo.countDocuments({
        isDelete: false,
        categories: { $in: [ObjectId(id)] },
        title: { $regex: ".*" + search + ".*", $options: "i" },
        uploadstatus: { $ne: "inprocess" },
        "group_ids.0": { $exists: true },
      });

      return res.status(200).json({
        status: true,
        message: `List of videos.`,
        data: [
          {
            videos: data,
            totalPages: Math.ceil(count / 20),
            currentPage: 1,
            totalVideos: count,
          },
        ],
      });
    } else {
      if (search !== "") {
        const data = await ContentArchiveVideo.find({
          isDelete: false,
          title:
            search !== ""
              ? { $regex: ".*" + search + ".*", $options: "i" }
              : { $ne: "" },
          uploadstatus: { $ne: "inprocess" },
          "group_ids.0": { $exists: true },
        })
          .sort({ createdAt: -1, updatedAt: -1 })
          .select("-__v");

        const count = await ContentArchiveVideo.countDocuments({
          isDelete: false,
          title:
            search !== ""
              ? { $regex: ".*" + search + ".*", $options: "i" }
              : { $ne: "" },
          uploadstatus: { $ne: "inprocess" },
          "group_ids.0": { $exists: true },
        });

        return res.status(200).json({
          status: true,
          message: `List of videos.`,
          data: [
            {
              videos: data,
              totalPages: Math.ceil(count / 20),
              currentPage: 1,
              totalVideos: count,
            },
          ],
        });
      } else {
        const data = await ContentArchiveVideo.find({
          isDelete: false,
          title:
            search !== ""
              ? { $regex: ".*" + search + ".*", $options: "i" }
              : { $ne: "" },
          uploadstatus: { $ne: "inprocess" },
          "group_ids.0": { $exists: true },
        })
          .sort({ createdAt: -1, updatedAt: -1 })
          .select("-__v")
          .limit(20);

        const count = await ContentArchiveVideo.countDocuments({
          isDelete: false,
          title:
            search !== ""
              ? { $regex: ".*" + search + ".*", $options: "i" }
              : { $ne: "" },
          uploadstatus: { $ne: "inprocess" },
          "group_ids.0": { $exists: true },
        });

        return res.status(200).json({
          status: true,
          message: `List of videos.`,
          data: [
            {
              videos: data,
              totalPages: Math.ceil(count / 20),
              currentPage: 1,
              totalVideos: count,
            },
          ],
        });
      }
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

//Add userwise realwatchtime to all videos
function sumOFHoursWorked(time_1, time_2) {
  var time1 = time_1.split(":");
  var time2 = time_2.split(":");
  let secondSum = Number(time1[2]) + Number(time2[2]);
  let minSum = Number(time1[1]) + Number(time2[1]);
  let hrSum = Number(time1[0]) + Number(time2[0]);

  if (secondSum > 59) {
    secondSum = Math.abs(60 - secondSum);
    minSum += 1;
  }
  if (minSum > 59) {
    minSum = Math.abs(60 - minSum);
    hrSum += 1;
  }
  if (secondSum < 10) {
    secondSum = `0${secondSum}`;
  }
  if (minSum < 10) {
    minSum = `0${minSum}`;
  }
  if (hrSum < 10) {
    hrSum = `0${hrSum}`;
  }

  return `${hrSum}:${minSum}:${secondSum}`;
}

exports.AddRealWatchTime = async (req, res) => {
  const videoid = req.query.videoid;
  const userid = req.authUserId;
  var watchtime = req.query.watchtime;
  try {
    const result_ = await ContentArchiveVideo.findOne({
      _id: videoid,
      watched_realtime: { $exists: true, $elemMatch: { userid: userid } },
    }).select("watched_realtime");
    if (result_ !== null) {
      watchtime = sumOFHoursWorked(
        watchtime,
        result_.watched_realtime[0].watch_realduration
      );
      const result = await ContentArchiveVideo.findOneAndUpdate(
        { _id: videoid, watched_realtime: { $elemMatch: { userid: userid } } },
        { $set: { "watched_realtime.$.watch_realduration": watchtime } }
      );
      if (result) {
        return res
          .status(200)
          .json({ status: true, message: `Watch time added`, data: result });
      } else {
        return res
          .status(200)
          .json({ status: false, message: `Watch time not added`, data: [] });
      }
    } else {
      var time_ = watchtime.split(":");
      watchtime =
        (Number(time_[0]) < 10 ? `0${time_[0]}` : time_[0]) +
        ":" +
        (Number(time_[1]) < 10 ? `0${time_[1]}` : time_[1]) +
        ":" +
        (Number(time_[2]) < 10 ? `0${time_[2]}` : time_[2]);
      const result = await ContentArchiveVideo.findByIdAndUpdate(videoid, {
        $push: {
          watched_realtime: { userid: userid, watch_realduration: watchtime },
        },
      });
      if (result) {
        return res
          .status(200)
          .json({ status: true, message: `Watch time added`, data: result });
      } else {
        return res
          .status(200)
          .json({ status: false, message: `Watch time not added`, data: [] });
      }
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// Get Video Speaker profile details
exports.getVideoSpeakerProfile = async (req, res) => {
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
          "_id": 1,
          "auth0Id": 1,
          "email": "$Preferred Email",
          "type": "Member",
          "title": "$attendeeDetail.title",
          "name": "$attendeeDetail.name",
          "firstName": "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
          "lastName": "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
          "company": "$attendeeDetail.company",
          "profession": "$attendeeDetail.profession",
          "phone": "$attendeeDetail.phone",
          "facebook": "$attendeeDetail.facebook",
          "linkedin": "$attendeeDetail.linkedin",
          "description": "$attendeeDetail.description" ?? "",
          "offer": "$attendeeDetail.offer" ?? "",
          "contactPartnerName": "$attendeeDetail.contactPartnerName" ?? "",
          "event": "",
          "profileImg": "$profileImg",
          "guestIcon": "$guestIcon",
          "partnerIcon": "$partnerIcon",
          "speakerIcon": "$speakerIcon",
        }
      }
    ]);
    if (attendeeProfile.length > 0) {
      return res.status(200).json({ status: true, message: "Video speaker profile details retrive.", data: attendeeProfile[0], });
    }
    else {
      return res.status(200).json({ status: false, message: "Video speaker profile details not found!", });
    }

  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({ status: false, message: "Internal server error!", error: error });
  }
};

/*** */
//event or speaker based video list fetched
exports.getAllContentVideoByEventOrSpeaker = async (req, res) => {

  try {
    const { id, filtertype, sortfilter } = req.query;
    const authUser = req.authUserId;
    const userdata = await User.findById(authUser);
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    var sort = { createdAt: -1 };

    if (sortfilter === "recent") {
      sort = { createdAt: -1, updatedAt: -1 };
    } else if (sortfilter === "popular") {
      sort = { viewsCount: -1 };
    } else if (sortfilter === "comment") {
      sort = { commentsCount: -1 };
    }

    let videoList = []
    if ((req.query.filtertype === undefined || req.query.filtertype === null))
      return res.status(200).json({ status: false, message: `Please apply filter type!`, data: [] });

    if (filtertype === "event") {

      const data = await ContentArchiveVideo.aggregate([
        {
          $match: {
            isDelete: false,
            eventIds: { $in: [ObjectId(id)] }
          }
        },
        {
          $lookup: {
            from: "contentarchive_categories",
            let: { contentarchive_categories_id: "$categories" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$contentarchive_categories_id"],
                  },
                },
              },
              { $project: { name: 1 } },
            ],
            as: "categories",
          },
        },
        {
          $lookup: {
            from: "contentarchive_subcategories",
            localField: "subcategory",
            foreignField: "_id",
            pipeline: [
              {
                $match: {
                  isDelete: false,
                },
              },
              { $project: { name: 1 } },
            ],

            as: "subcategory",
          },
        },
        {
          $lookup: {
            from: "groups",
            let: { suggestion_id: "$group_ids" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$suggestion_id"],
                  },
                },
              },
              { $project: { groupTitle: 1 } },
            ],
            as: "group_ids",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            let: { speaker: "$speaker" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$speaker"],
                  },
                },
              },
              {
                $project:
                {
                  auth0Id: 1, otherdetail: 1, profileImg: 1, speakerIcon: 1, guestIcon: 1, partnerIcon: 1, attendeeDetail: {
                    title: 1,
                    name: 1,
                    profession: 1,
                  }
                }
              },
            ],
            as: "speaker",
          },
        },
        {
          $lookup: {
            from: "contentArchive_tag",
            let: { tag: "$tag" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$tag"],
                  },
                },
              },
              { $project: { name: 1 } },
            ],
            as: "tag",
          },
        },
        {
          $lookup: {
            from: "events",
            let: { event_Ids: "$eventIds" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$event_Ids"],
                  },
                },
              },
              { $project: { title: 1, thumbnail: 1, timeZone: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, activities: 1 } },
            ],
            as: "eventIds",
          },
        },
        {
          $addFields: {
            viewsCount: {
              $cond: {
                if: { $isArray: "$views" },
                then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
                else: "$starting_view_cnt",
              },
            },
          },
        },
        {
          $addFields: {
            commentsCount: {
              $cond: {
                if: { $isArray: "$comments" },
                then: { $size: "$comments" },
                else: 0,
              },
            },
          },
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
      ])
      const count = await ContentArchiveVideo.countDocuments({
        eventIds: { $in: [ObjectId(id)] },
        isDelete: false,
      });

      let resOrder = data.map((item, i) => {

        const without_html_description = item.description.replace(
          /(<([^>]+)>)/gi,
          ""
        );
        const mobile_description = without_html_description.substring(0, 600);

        item.mobile_description = mobile_description;
        var url = s3.getSignedUrl("getObject", {
          Bucket:
            "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
          Key: item.video,
          Expires: 100000,
        });
        return { ...item, video: url };
      });

      return res.status(200).json({
        status: true,
        message: `List of videos.`,
        data: [
          {
            videos: resOrder,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalVideos: count,
          },
        ],
      });

    } else {

      const data = await ContentArchiveVideo.aggregate([
        {
          $match: {
            isDelete: false,
            speaker: { $in: [ObjectId(id)] }
          }
        },
        {
          $lookup: {
            from: "contentarchive_categories",
            let: { contentarchive_categories_id: "$categories" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$contentarchive_categories_id"],
                  },
                },
              },
              { $project: { name: 1 } },
            ],
            as: "categories",
          },
        },
        {
          $lookup: {
            from: "contentarchive_subcategories",
            localField: "subcategory",
            foreignField: "_id",
            pipeline: [
              {
                $match: {
                  isDelete: false,
                },
              },
              { $project: { name: 1 } },
            ],

            as: "subcategory",
          },
        },
        {
          $lookup: {
            from: "groups",
            let: { suggestion_id: "$group_ids" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$suggestion_id"],
                  },
                },
              },
              { $project: { groupTitle: 1 } },
            ],
            as: "group_ids",
          },
        },
        {
          $lookup: {
            from: "airtable-syncs",
            let: { speaker: "$speaker" },
            pipeline: [
              {
                $match: {

                  $expr: {
                    $in: ["$_id", "$$speaker"],
                  },
                },
              },
              {
                $project:
                {
                  auth0Id: 1, otherdetail: 1, profileImg: 1, speakerIcon: 1, guestIcon: 1, partnerIcon: 1, attendeeDetail: {
                    title: 1,
                    name: 1,
                    profession: 1,
                  }
                }
              },
            ],
            as: "speaker",
          },
        },
        {
          $lookup: {
            from: "contentArchive_tag",
            let: { tag: "$tag" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$tag"],
                  },
                },
              },
              { $project: { name: 1 } },
            ],
            as: "tag",
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "eventIds",
            foreignField: "_id",
            pipeline: [
              { $project: { title: 1, thumbnail: 1, timeZone: 1, startDate: 1, startTime: 1, endDate: 1, endTime: 1, activities: 1 } },
            ],
            as: "eventIds",
          },
        },
        {
          $addFields: {
            viewsCount: {
              $cond: {
                if: { $isArray: "$views" },
                then: { $add: [{ $size: "$views" }, "$starting_view_cnt"] },
                else: "$starting_view_cnt",
              },
            },
          },
        },
        {
          $addFields: {
            commentsCount: {
              $cond: {
                if: { $isArray: "$comments" },
                then: { $size: "$comments" },
                else: 0,
              },
            },
          },
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
      ])

      const count = await ContentArchiveVideo.countDocuments({
        speaker: { $in: [ObjectId(id)] },
        isDelete: false,
      });

      let resOrder = data.map((item, i) => {
        const without_html_description = item.description.replace(
          /(<([^>]+)>)/gi,
          ""
        );
        const mobile_description = without_html_description.substring(0, 600);

        item.mobile_description = mobile_description;
        var url = s3.getSignedUrl("getObject", {
          Bucket:
            "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
          Key: item.video,
          Expires: 100000,
        });

        return { ...item, video: url };
      });

      return res.status(200).json({
        status: true,
        message: `List of videos.`,
        data: [
          {
            videos: resOrder,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalVideos: count,
          },
        ],
      });
    }

  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};
