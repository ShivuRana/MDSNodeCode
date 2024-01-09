const Partner = require("../../database/models/partner/partner");
const ObjectId = require("mongoose").Types.ObjectId;
const { deleteImage } = require("../../utils/mediaUpload");
const AWS = require("aws-sdk");
var s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
  Bucket: process.env.AWS_BUCKET,
});
const moment = require("moment");

// users who have partner data and how many times
exports.whoClickPartnerData = async (req, res) => {
  try {
    const partnerId = ObjectId(req.params.id);
    const whoClickPartner = await Partner.aggregate([
      {
        $match: {
          _id: partnerId,
          isDelete: false,
        },
      },
      { $unwind: "$userViews" },
      {
        $lookup: {
          from: "airtable-syncs",
          let: { user_id: "$userViews.userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$user_id"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                auth0Id: 1,
                email: "$Preferred Email",
                name: "$attendeeDetail.name",
                firstName: "$attendeeDetail.firstName"
                  ? "$attendeeDetail.firstName"
                  : "",
                lastName: "$attendeeDetail.lastName"
                  ? "$attendeeDetail.lastName"
                  : "",
                profileImg: "$profileImg",
              },
            },
          ],
          as: "userData",
        },
      },
      {
        $set: {
          "userViews.userData": "$userData",
        },
      },
      { $unwind: "$userViews" },
      {
        $group: {
          _id: {
            id: "$_id",
            companyName: "$companyName",
            companyLogo: "$companyLogo",
          },
          userViews: { $push: "$userViews" },
        },
      },
      {
        $project: {
          _id: "$_id.id",
          companyName: "$_id.companyName",
          companyLogo: "$_id.companyLogo",
          userViews: "$userViews",
        },
      },
    ]);
    if (whoClickPartner.length > 0) {
      return res.status(200).json({
        status: true,
        message: `Partner detail retrive successfully.`,
        data: whoClickPartner[0],
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `No data found for this partner id!` });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(400)
      .send({ status: false, message: "Internal Server!!" });
  }
};

// users who have click the details and how many times
exports.whoClickPartnerGetDetails = async (req, res) => {
  try {
    const partnerId = ObjectId(req.params.id);
    const whoClickGetDetails = await Partner.aggregate([
      {
        $match: {
          _id: partnerId,
          isDelete: false,
        },
      },
      { $unwind: "$userOfferViews" },
      {
        $lookup: {
          from: "airtable-syncs",
          let: { user_id: "$userOfferViews.userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$user_id"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                auth0Id: 1,
                email: "$Preferred Email",
                name: "$attendeeDetail.name",
                firstName: "$attendeeDetail.firstName"
                  ? "$attendeeDetail.firstName"
                  : "",
                lastName: "$attendeeDetail.lastName"
                  ? "$attendeeDetail.lastName"
                  : "",
                profileImg: "$profileImg",
              },
            },
          ],
          as: "userData",
        },
      },
      {
        $set: {
          "userOfferViews.userData": "$userData",
        },
      },
      { $unwind: "$userOfferViews" },
      {
        $group: {
          _id: {
            id: "$_id",
            companyName: "$companyName",
            companyLogo: "$companyLogo",
          },
          userOfferViews: { $push: "$userOfferViews" },
        },
      },
      {
        $project: {
          _id: "$_id.id",
          companyName: "$_id.companyName",
          companyLogo: "$_id.companyLogo",
          userOfferViews: "$userOfferViews",
        },
      },
    ]);
    if (whoClickGetDetails.length > 0) {
      return res.status(200).json({
        status: true,
        message: `Partner detail retrive successfully.`,
        data: whoClickGetDetails[0],
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `No data found for this partner id!` });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(400)
      .send({ status: false, message: "Internal Server!!" });
  }
};

//Get Details of partner with their user offer view
exports.partnerListWithClaimCount = async (req, res) => {
  try {
    if (
      req.query.page !== undefined &&
      req.query.page !== null &&
      req.query.page !== "" &&
      req.query.limit !== undefined &&
      req.query.limit !== null &&
      req.query.limit !== ""
    ) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit);
      const skip = (page - 1) * limit;

      const aggregatePipeline = [
        { $sort: { createdAt: -1 } },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
          },
        },
        { $unwind: "$userOfferViews" },
        {
          $lookup: {
            from: "airtable-syncs",
            let: { user_id: "$userOfferViews.userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$user_id"],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  auth0Id: 1,
                  email: "$Preferred Email",
                  name: "$attendeeDetail.name",
                  firstName: "$attendeeDetail.firstName"
                    ? "$attendeeDetail.firstName"
                    : "",
                  lastName: "$attendeeDetail.lastName"
                    ? "$attendeeDetail.lastName"
                    : "",
                  profileImg: "$profileImg",
                },
              },
            ],
            as: "userData",
          },
        },
        {
          $set: {
            "userOfferViews.userData": "$userData",
          },
        },
        { $unwind: "$userOfferViews" },
        {
          $group: {
            _id: {
              id: "$_id",
              companyName: "$companyName",
              companyLogo: "$companyLogo",
              isMDSPartner: "$isMDSPartner",
              status: "$status",
              partnerType: "$partnerType",
              pageView: "$pageView",
              claims: "$claims",
            },
            userOfferViews: { $push: "$userOfferViews" },
          },
        },
      ];

      const partnerList = await Partner.aggregate([
        ...aggregatePipeline,
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: "$_id.id",
            companyName: "$_id.companyName",
            companyLogo: "$_id.companyLogo",
            isMDSPartner: "$_id.isMDSPartner",
            status: "$_id.status",
            partnerType: "$_id.partnerType",
            pageView: "$_id.pageView",
            claims: "$_id.claims",
            userOfferViews: "$userOfferViews",
          },
        },
      ]);

      const totalCount = await Partner.aggregate([...aggregatePipeline]);
      var count = totalCount.length;

      if (partnerList.length > 0) {
        return res.status(200).json({
          status: true,
          message: `Partner list retrive successfully.`,
          data: {
            partnerList: partnerList,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalMessages: count,
          },
        });
      } else {
        return res.status(200).json({
          status: true,
          message: `Something went wrong while getting partner list!`,
          data: {
            partnerList: [],
            totalPages: Math.ceil(0 / limit),
            currentPage: page,
            totalMessages: count,
          },
        });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Partner not found!` });
    }
  } catch (error) {
    console.log(error, "error");
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

//Get Details of partner with their user Page view
exports.partnerListWithViewCount = async (req, res) => {
  try {
    if (
      req.query.page !== undefined &&
      req.query.page !== null &&
      req.query.page !== "" &&
      req.query.limit !== undefined &&
      req.query.limit !== null &&
      req.query.limit !== ""
    ) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit);
      const skip = (page - 1) * limit;

      const aggregatePipeline = [
        { $sort: { createdAt: -1 } },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
          },
        },
        { $unwind: "$userViews" },
        {
          $lookup: {
            from: "airtable-syncs",
            let: { user_id: "$userViews.userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$user_id"],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  auth0Id: 1,
                  email: "$Preferred Email",
                  name: "$attendeeDetail.name",
                  firstName: "$attendeeDetail.firstName"
                    ? "$attendeeDetail.firstName"
                    : "",
                  lastName: "$attendeeDetail.lastName"
                    ? "$attendeeDetail.lastName"
                    : "",
                  profileImg: "$profileImg",
                },
              },
            ],
            as: "userData",
          },
        },
        {
          $set: {
            "userViews.userData": "$userData",
          },
        },
        { $unwind: "$userViews" },
        {
          $group: {
            _id: {
              id: "$_id",
              companyName: "$companyName",
              companyLogo: "$companyLogo",
              isMDSPartner: "$isMDSPartner",
              status: "$status",
              partnerType: "$partnerType",
              pageView: "$pageView",
              claims: "$claims",
            },
            userViews: { $push: "$userViews" },
          },
        },
      ];

      const partnerList = await Partner.aggregate([
        ...aggregatePipeline,
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: "$_id.id",
            companyName: "$_id.companyName",
            companyLogo: "$_id.companyLogo",
            isMDSPartner: "$_id.isMDSPartner",
            status: "$_id.status",
            partnerType: "$_id.partnerType",
            pageView: "$_id.pageView",
            claims: "$_id.claims",
            userViews: "$userViews",
          },
        },
      ]);

      const totalCount = await Partner.aggregate([...aggregatePipeline]);
      var count = totalCount.length;

      if (partnerList.length > 0) {
        return res.status(200).json({
          status: true,
          message: `Partner list retrive successfully.`,
          data: {
            partnerList: partnerList,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalMessages: count,
          },
        });
      } else {
        return res.status(200).json({
          status: true,
          message: `Something went wrong while getting partner list!`,
          data: {
            partnerList: [],
            totalPages: Math.ceil(0 / limit),
            currentPage: page,
            totalMessages: count,
          },
        });
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Partner not found!` });
    }
  } catch (error) {
    console.log(error, "error");
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// number of video list base on partner Id
exports.nrOfVideoBasedOnPartner = async (req, res) => {
  try {
    const partnerId = ObjectId(req.params.id);
    const videoGetDetails = await Partner.aggregate([
      {
        $match: {
          _id: partnerId,
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "contentarchive_videos",
          let: { videoId: "$videoIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$videoId"],
                },
                isDelete: false,
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                subtitle_file: 1,
                description: 1,
                thumbnail: 1,
                video: 1,
              },
            },
          ],
          as: "videoIds",
        },
      },
      {
        $addFields: {
          videoCount: {
            $cond: {
              if: { $isArray: "$videoIds" },
              then: { $size: "$videoIds" },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          companyName: 1,
          companyLogo: 1,
          darkCompanyLogo: 1,
          videoCount: 1,
          videoIds: 1,
          claims: 1,
        },
      },
    ]);

    if (videoGetDetails.length > 0) {
      return res.status(200).json({
        status: true,
        message: `Partner detail retrive successfully.`,
        data: videoGetDetails[0],
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `No data found for this partner id!` });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(400)
      .send({ status: false, message: "Internal Server!!" });
  }
};

// number of post list base on partner Id
exports.nrOfPostBasedOnPartner = async (req, res) => {
  try {
    const partnerId = ObjectId(req.params.id);
    const postGetDetails = await Partner.aggregate([
      {
        $match: {
          _id: partnerId,
          isDelete: false,
        },
      },
      {
        $lookup: {
          from: "partnerposts",
          let: { partnerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$partnerId", "$$partnerId"],
                },
                isDelete: false,
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                url: 1,
                member: 1,
                partnerId: 1,
              },
            },
          ],
          as: "partnerposts",
        },
      },
      {
        $addFields: {
          postCount: {
            $cond: {
              if: { $isArray: "$partnerposts" },
              then: { $size: "$partnerposts" },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          companyName: 1,
          companyLogo: 1,
          darkCompanyLogo: 1,
          postCount: 1,
          partnerposts: 1,
          claims: 1,
        },
      },
    ]);

    if (postGetDetails.length > 0) {
      return res.status(200).json({
        status: true,
        message: `Partner detail retrive successfully.`,
        data: postGetDetails[0],
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `No data found for this partner id!` });
    }
  } catch (error) {
    console.log(error, "error");
    return res
      .status(400)
      .send({ status: false, message: "Internal Server!!" });
  }
};

// partner detail update user counts and total count api
exports.updateUserViewCountOfPartner = async (req, res) => {
  try {
    const authUser = req.authUserId;
    if (
      req.params.id !== undefined &&
      req.params.id !== null &&
      req.params.id !== "" &&
      authUser !== null
    ) {
      const userViewData = {
        userId: authUser,
        viewCount: 1,
        lastViewClickDate: new Date(),
        viewData: [{ viewDate: new Date() }],
      };

      var partnerDetail = {};

      let alreadyExist = await Partner.findOne(
        {
          _id: new ObjectId(req.params.id),
          userViews: { $elemMatch: { userId: new ObjectId(authUser) } },
        },
        { _id: 1, "userViews.$": 1 }
      );

      if (alreadyExist !== null) {
        partnerDetail = await Partner.findOneAndUpdate(
          {
            _id: new ObjectId(req.params.id),
            userViews: { $elemMatch: { userId: authUser } },
          },
          {
            $inc: { "userViews.$.viewCount": 1, pageView: 1 },
            "userViews.$.lastViewClickDate": new Date(),
            $push: { "userViews.$.viewData": { viewDate: new Date() } },
          },
          { new: true }
        ).select(
          "-contactInfo -featuredPartner -featuredPartnerOrder -freshDealPartner -freshDealPartnerOrder -urlToAllPosts -pageView -__v -userOfferViews -claims -category -subcategory"
        );
      } else {
        partnerDetail = await Partner.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $push: { userViews: userViewData }, $inc: { pageView: 1 } },
          { new: true }
        ).select(
          "-contactInfo -featuredPartner -featuredPartnerOrder -freshDealPartner -freshDealPartnerOrder -urlToAllPosts -pageView -__v -userOfferViews -claims -category -subcategory"
        );
      }

      if (partnerDetail)
        return res.status(200).json({
          status: true,
          message: `Partner detail retrive successully.`,
          data: partnerDetail,
        });
      else
        return res.status(200).json({
          status: false,
          message: `No data found for this partner id!`,
        });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Partner not found!` });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// partner offer update user counts and total count api
exports.updateUserClaimCountOfPartner = async (req, res) => {
  try {
    const authUser = req.authUserId;
    if (
      req.params.id !== undefined &&
      req.params.id !== null &&
      req.params.id !== "" &&
      authUser !== null
    ) {
      const userOfferData = {
        userId: authUser,
        offerCount: 1,
        lastOfferClickDate: new Date(),
        offerViewData: [{ viewOfferDate: new Date() }],
      };
      var partnerDetail = {};

      let alreadyExist = await Partner.findOne(
        {
          _id: new ObjectId(req.params.id),
          userOfferViews: { $elemMatch: { userId: new ObjectId(authUser) } },
        },
        { _id: 1, "userOfferViews.$": 1 }
      );

      if (alreadyExist !== null) {
        partnerDetail = await Partner.findOneAndUpdate(
          {
            _id: new ObjectId(req.params.id),
            userOfferViews: { $elemMatch: { userId: authUser } },
          },
          {
            $inc: { "userOfferViews.$.offerCount": 1, claims: 1 },
            "userOfferViews.$.lastOfferClickDate": new Date(),
            $push: {
              "userOfferViews.$.offerViewData": { viewOfferDate: new Date() },
            },
          },
          { new: true }
        ).select(
          "-featuredPartner -featuredPartnerOrder -freshDealPartner -freshDealPartnerOrder -urlToAllPosts -pageView -__v -userViews -claims -category -subcategory"
        );
      } else {
        partnerDetail = await Partner.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $push: { userOfferViews: userOfferData }, $inc: { claims: 1 } },
          { new: true }
        ).select(
          "-featuredPartner -featuredPartnerOrder -freshDealPartner -freshDealPartnerOrder -urlToAllPosts -pageView -__v -userViews -claims -category -subcategory"
        );
      }

      if (partnerDetail)
        return res.status(200).json({
          status: true,
          message: `Partner detail retrive successully.`,
          data: partnerDetail,
        });
      else
        return res.status(200).json({
          status: false,
          message: `No data found for this partner id!`,
        });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Partner not found!` });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

// get partner offer details api
exports.getClaimOfferDetails = async (req, res) => {
  try {
    const authUser = req.authUserId;
    if (
      req.params.id !== undefined &&
      req.params.id !== null &&
      req.params.id !== "" &&
      authUser !== null
    ) {
      const partnerDetail = await Partner.findOne({
        _id: new ObjectId(req.params.id),
      }).select(
        "-featuredPartner -featuredPartnerOrder -freshDealPartner -freshDealPartnerOrder -urlToAllPosts -pageView -__v -userViews -claims -category -subcategory"
      );

      if (partnerDetail)
        return res.status(200).json({
          status: true,
          message: `Partner detail retrive successully.`,
          data: partnerDetail,
        });
      else
        return res.status(200).json({
          status: false,
          message: `No details found for this partner id!`,
        });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `Partner not found!` });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

//partner Statistic Field Count By Date wise ForAdmin
exports.partnerStatisticFieldCountByDateWiseForAdmin = async (req, res) => {
  try {
    var reqFromDate = req.query.fromdate;
    var reqToDate = req.query.todate;
    const filterType = req.query.filtertype;
    var addFilterCount = 0;
    var toDate = new Date();
    if (filterType == "first24hrs") {
      addFilterCount = 1;
      fromDate = new Date(
        new Date().setDate(new Date().getDate() - addFilterCount)
      );
    } else if (filterType == "past7days") {
      addFilterCount = 6;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past28days") {
      addFilterCount = 27;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past90days") {
      addFilterCount = 89;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past365days") {
      addFilterCount = 364;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType === "custom") {
      fromDate = new Date(reqFromDate);
      toDate = new Date(reqToDate);
      toDate.setDate(toDate.getDate() + 1);
    }

    // pageView Count
    let pageViewCount = [];
    if (filterType === "lifetime") {
      pageViewCount = await Partner.aggregate([
        {
          $unwind: "$userViews",
        },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
          },
        },
        {
          $project: {
            _id: 1,
            countViewData: {
              $cond: {
                if: { $isArray: "$userViews.viewData" },
                then: { $size: "$userViews.viewData" },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCountViewData: { $sum: "$countViewData" },
          },
        },
      ]);
    } else {
      pageViewCount = await Partner.aggregate([
        {
          $unwind: "$userViews",
        },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
            "userViews.viewData.viewDate": { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $project: {
            _id: 1,
            "userViews.viewData": {
              $filter: {
                input: "$userViews.viewData",
                as: "view",
                cond: {
                  $and: [
                    { $gte: ["$$view.viewDate", fromDate] },
                    { $lt: ["$$view.viewDate", toDate] },
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            countViewData: {
              $cond: {
                if: { $isArray: "$userViews.viewData" },
                then: { $size: "$userViews.viewData" },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCountViewData: { $sum: "$countViewData" },
          },
        },
      ]);
    }

    //claim data and count
    let claimsDataCount = [];
    if (filterType === "lifetime") {
      claimsDataCount = await Partner.aggregate([
        {
          $unwind: "$userOfferViews",
        },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
          },
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            createdAt: 1,
            userOfferViews: 1,
            countOfferViewData: {
              $cond: {
                if: { $isArray: "$userOfferViews.offerViewData" },
                then: { $size: "$userOfferViews.offerViewData" },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCountOfferViewData: { $sum: "$countOfferViewData" },
          },
        },
      ]);
    } else {
      claimsDataCount = await Partner.aggregate([
        {
          $unwind: "$userOfferViews",
        },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
            "userOfferViews.offerViewData.viewOfferDate": {
              $gte: fromDate,
              $lte: toDate,
            },
          },
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            createdAt: 1,
            "userOfferViews.offerViewData": {
              $filter: {
                input: "$userOfferViews.offerViewData",
                as: "view",
                cond: {
                  $and: [
                    { $gte: ["$$view.viewOfferDate", fromDate] },
                    { $lt: ["$$view.viewOfferDate", toDate] },
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            createdAt: 1,
            userOfferViews: "$userOfferViews.offerViewData",
            countOfferViewData: {
              $cond: {
                if: { $isArray: "$userOfferViews.offerViewData" },
                then: { $size: "$userOfferViews.offerViewData" },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCountOfferViewData: { $sum: "$countOfferViewData" },
          },
        },
      ]);
    }

    //rating count
    let ratingData = [];
    if (filterType == "lifetime") {
      ratingData = await Partner.aggregate([
        {
          $match: { isDelete: false, isMDSPartner: true },
        },
        {
          $lookup: {
            from: "partnerreviews",
            localField: "_id",
            foreignField: "partnerId",
            pipeline: [
              {
                $match: {
                  isDelete: false,
                },
              },
            ],
            as: "partnerReviewData",
          },
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            partnerReviewCount: {
              $cond: {
                if: { $isArray: "$partnerReviewData" },
                then: { $size: "$partnerReviewData" },
                else: 0,
              },
            },
          },
        },
      ]);
    } else {
      ratingData = await Partner.aggregate([
        {
          $match: { isDelete: false, isMDSPartner: true },
        },
        {
          $lookup: {
            from: "partnerreviews",
            localField: "_id",
            foreignField: "partnerId",
            pipeline: [
              {
                $match: {
                  isDelete: false,
                  createdAt: { $gte: fromDate, $lte: toDate },
                },
              },
            ],
            as: "partnerReviewData",
          },
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            partnerReviewCount: {
              $cond: {
                if: { $isArray: "$partnerReviewData" },
                then: { $size: "$partnerReviewData" },
                else: 0,
              },
            },
          },
        },
      ]);
    }
    const totalCountOfReview = ratingData.reduce(
      (total, partner) => total + partner.partnerReviewCount,
      0
    );

    return res.status(200).json({
      status: true,
      message: `Partner Counts.`,
      data: {
        pageViewCount:
          pageViewCount.length > 0 ? pageViewCount[0].totalCountViewData : 0,
        claimsDataCount:
          claimsDataCount.length > 0
            ? claimsDataCount[0].totalCountOfferViewData
            : 0,
        totalCountOfReview: totalCountOfReview,
      },
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

//partner Statistic list ForAdmin
exports.partnerStatisticListForAdmin = async (req, res) => {
  try {
    var reqFromDate = req.query.fromdate;
    var reqToDate = req.query.todate;
    var field = req.query.field;
    const filterType = req.query.filtertype;
    var data = [];
    var addFilterCount = 0;
    var toDate = new Date();
    if (filterType == "first24hrs") {
      addFilterCount = 1;
      fromDate = new Date(
        new Date().setDate(new Date().getDate() - addFilterCount)
      );
    } else if (filterType == "past7days") {
      addFilterCount = 6;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past28days") {
      addFilterCount = 27;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past90days") {
      addFilterCount = 89;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past365days") {
      addFilterCount = 364;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType === "custom") {
      fromDate = new Date(reqFromDate);
      toDate = new Date(reqToDate);
      toDate.setDate(toDate.getDate() + 1);
    }

    let partnerList = [];
    if (field === "pageView") {
      if (filterType === "lifetime") {
        partnerList = await Partner.aggregate([
          {
            $unwind: "$userViews",
          },
          {
            $match: {
              isDelete: false,
              isMDSPartner: true,
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              countViewData: {
                $cond: {
                  if: { $isArray: "$userViews.viewData" },
                  then: { $size: "$userViews.viewData" },
                  else: 0,
                },
              },
            },
          },
          {
            $group: {
                _id: { id: "$_id", companyName: "$companyName", companyLogo: "$companyLogo", darkCompanyLogo: "$darkCompanyLogo"
                , createdAt: "$createdAt" },
                countViewData: { $sum: "$countViewData" },
            }
        },
        {
          $project: {
            _id: "$_id.id",
            companyName: "$_id.companyName",
            companyLogo: "$_id.companyLogo", 
            darkCompanyLogo: "$_id.darkCompanyLogo", 
            createdAt: "$_id.createdAt" ,
            countViewData: 1,
            },         
        },
        ]);
      } else {
        partnerList = await Partner.aggregate([
          {
            $unwind: "$userViews",
          },
          {
            $match: {
              isDelete: false,
              isMDSPartner: true,
              "userViews.viewData.viewDate": { $gte: fromDate, $lte: toDate },
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              "userViews.viewData": {
                $filter: {
                  input: "$userViews.viewData",
                  as: "view",
                  cond: {
                    $and: [
                      { $gte: ["$$view.viewDate", fromDate] },
                      { $lt: ["$$view.viewDate", toDate] },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              countViewData: {
                $cond: {
                  if: { $isArray: "$userViews.viewData" },
                  then: { $size: "$userViews.viewData" },
                  else: 0,
                },
              },
            },
          },
          {
            $group: {
                _id: { id: "$_id", companyName: "$companyName", companyLogo: "$companyLogo", darkCompanyLogo: "$darkCompanyLogo"
                , createdAt: "$createdAt" },
                countViewData: { $sum: "$countViewData" },
            }
        },
        {
          $project: {
            _id: "$_id.id",
            companyName: "$_id.companyName",
            companyLogo: "$_id.companyLogo", 
            darkCompanyLogo: "$_id.darkCompanyLogo", 
            createdAt: "$_id.createdAt" ,
            countViewData: 1,
            },
        },
        ]);
      }
    }
    //claim data and count
    else if (field === "claim") {
      if (filterType === "lifetime") {
        partnerList = await Partner.aggregate([
          {
            $unwind: "$userOfferViews",
          },
          {
            $match: {
              isDelete: false,
              isMDSPartner: true,
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              countOfferViewData: {
                $cond: {
                  if: { $isArray: "$userOfferViews.offerViewData" },
                  then: { $size: "$userOfferViews.offerViewData" },
                  else: 0,
                },
              },
            },
          },
          {
            $group: {
                _id: { id: "$_id", companyName: "$companyName", companyLogo: "$companyLogo", darkCompanyLogo: "$darkCompanyLogo"
                , createdAt: "$createdAt" },
                countOfferViewData: { $sum: "$countOfferViewData" },
            }
        },
        {
          $project: {
            _id: "$_id.id",
            companyName: "$_id.companyName",
            companyLogo: "$_id.companyLogo", 
            darkCompanyLogo: "$_id.darkCompanyLogo", 
            createdAt: "$_id.createdAt" ,
            countOfferViewData: 1,
            },
        },
        ]);
      } else {
        partnerList = await Partner.aggregate([
          {
            $unwind: "$userOfferViews",
          },
          {
            $match: {
              isDelete: false,
              isMDSPartner: true,
              "userOfferViews.offerViewData.viewOfferDate": {
                $gte: fromDate,
                $lte: toDate,
              },
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              "userOfferViews.offerViewData": {
                $filter: {
                  input: "$userOfferViews.offerViewData",
                  as: "view",
                  cond: {
                    $and: [
                      { $gte: ["$$view.viewOfferDate", fromDate] },
                      { $lt: ["$$view.viewOfferDate", toDate] },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              countOfferViewData: {
                $cond: {
                  if: { $isArray: "$userOfferViews.offerViewData" },
                  then: { $size: "$userOfferViews.offerViewData" },
                  else: 0,
                },
              },
            },
          },
          {
            $group: {
                _id: { id: "$_id", companyName: "$companyName", companyLogo: "$companyLogo", darkCompanyLogo: "$darkCompanyLogo"
                , createdAt: "$createdAt" },
                countOfferViewData: { $sum: "$countOfferViewData" },
            }
        },
        {
          $project: {
            _id: "$_id.id",
            companyName: "$_id.companyName",
            companyLogo: "$_id.companyLogo", 
            darkCompanyLogo: "$_id.darkCompanyLogo", 
            createdAt: "$_id.createdAt" ,
            countOfferViewData: 1,
            },
        },
        ]);
      }
    } else if (field === "rating") {
      if (filterType == "lifetime") {
        partnerList = await Partner.aggregate([
          {
            $match: { isDelete: false, isMDSPartner: true },
          },
          {
            $lookup: {
              from: "partnerreviews",
              localField: "_id",
              foreignField: "partnerId",
              pipeline: [
                {
                  $match: {
                    isDelete: false,
                  },
                },
              ],
              as: "partnerReviewData",
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              partnerReviewCount: {
                $cond: {
                  if: { $isArray: "$partnerReviewData" },
                  then: { $size: "$partnerReviewData" },
                  else: 0,
                },
              },
            },
          },
        ]);
      } else {
        partnerList = await Partner.aggregate([
          {
            $match: { isDelete: false, isMDSPartner: true },
          },
          {
            $lookup: {
              from: "partnerreviews",
              localField: "_id",
              foreignField: "partnerId",
              pipeline: [
                {
                  $match: {
                    isDelete: false,
                    createdAt: { $gte: fromDate, $lte: toDate },
                  },
                },
              ],
              as: "partnerReviewData",
            },
          },
          {
            $match: {
              "partnerReviewData.0": { $exists: true },
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              partnerReviewCount: {
                $cond: {
                  if: { $isArray: "$partnerReviewData" },
                  then: { $size: "$partnerReviewData" },
                  else: 0,
                },
              },
            },
          },
        ]);
      }
    } else {
      return res.status(200).json({
        status: false,
        message: `select field from pageView or claim or rating .`,
        data: [],
      });
    }

    return res
      .status(200)
      .json({ status: true, message: `partner List .`, data: partnerList });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

//partner Statistic all count ForAdmin
exports.partnerStatisticAllCountForAdmin = async (req, res) => {
  try {
    var field = req.query.field;
    let AllCount = [];
    if (field === "pageView") {
      AllCount = await Partner.aggregate([
        {
          $unwind: "$userViews",
        },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
          },
        },
        {
          $project: {
            _id: 1,
            countViewData: {
              $cond: {
                if: { $isArray: "$userViews.viewData" },
                then: { $size: "$userViews.viewData" },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCountViewData: { $sum: "$countViewData" },
          },
        },
      ]);
      return res.status(200).json({
        status: true,
        message: `All Counts.`,
        DataCount: AllCount[0].totalCountViewData,
      });
    } else if (field === "claim") {
      AllCount = await Partner.aggregate([
        {
          $unwind: "$userOfferViews",
        },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
          },
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            createdAt: 1,
            userOfferViews: 1,
            countOfferViewData: {
              $cond: {
                if: { $isArray: "$userOfferViews.offerViewData" },
                then: { $size: "$userOfferViews.offerViewData" },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCountOfferViewData: { $sum: "$countOfferViewData" },
          },
        },
      ]);
      return res.status(200).json({
        status: true,
        message: `All Counts.`,
        DataCount: AllCount[0].totalCountOfferViewData,
      });
    } else if (field === "rating") {
      let ratingData = [];
      ratingData = await Partner.aggregate([
        {
          $match: { isDelete: false, isMDSPartner: true },
        },
        {
          $lookup: {
            from: "partnerreviews",
            localField: "_id",
            foreignField: "partnerId",
            pipeline: [
              {
                $match: {
                  isDelete: false,
                },
              },
            ],
            as: "partnerReviewData",
          },
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            partnerReviewCount: {
              $cond: {
                if: { $isArray: "$partnerReviewData" },
                then: { $size: "$partnerReviewData" },
                else: 0,
              },
            },
          },
        },
      ]);
      AllCount = ratingData.reduce(
        (total, partner) => total + partner.partnerReviewCount,
        0
      );
      return res.status(200).json({
        status: true,
        message: `All Counts.`,
        DataCount: AllCount,
      });
    } else {
      return res.status(200).json({
        status: false,
        message: `plz select field.`,
        AllCount,
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

//partner Statistic Date Wise Filter Count ForAdmin
exports.partnerStatisticDateWiseFilterCountForAdmin = async (req, res) => {
  try {
    var reqFromDate = req.query.fromdate;
    var reqToDate = req.query.todate;
    var field = req.query.field;
    const filterType = req.query.filtertype;
    var data = [];
    var addFilterCount = 0;
    var toDate = new Date();
    if (filterType == "first24hrs") {
      addFilterCount = 1;
      fromDate = new Date(
        new Date().setDate(new Date().getDate() - addFilterCount)
      );
    } else if (filterType == "past7days") {
      addFilterCount = 6;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past28days") {
      addFilterCount = 27;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past90days") {
      addFilterCount = 89;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType == "past365days") {
      addFilterCount = 364;
      fromDate = new Date(toDate.toJSON().slice(0, 10));
      fromDate.setDate(toDate.getDate() - addFilterCount);
    } else if (filterType === "custom") {
      fromDate = new Date(reqFromDate);
      toDate = new Date(reqToDate);
      toDate.setDate(toDate.getDate() + 1);
    }

    let dateWiseCount = [];
    if (field === "pageView") {
      dateWiseCount = await Partner.aggregate([
        {
          $unwind: "$userViews",
        },
        {
          $match: {
            isDelete: false,
            isMDSPartner: true,
            "userViews.viewData.viewDate": { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            companyLogo: 1,
            darkCompanyLogo: 1,
            createdAt: 1,
            "userViews.viewData": {
              $filter: {
                input: "$userViews.viewData",
                as: "view",
                cond: {
                  $and: [
                    { $gte: ["$$view.viewDate", fromDate] },
                    { $lt: ["$$view.viewDate", toDate] },
                  ],
                },
              },
            },
          },
        },
        {
          $unwind: "$userViews.viewData",
        },
        {
          $project: {
            _id: 1,
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$userViews.viewData.viewDate",
              }
            },
          },
        },
        {
          $group: {
            _id: "$day",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1},
        },
      ]);
    }
    //claim data and count
    else if (field === "claim") {
      dateWiseCount = await Partner.aggregate([
          {
            $unwind: "$userOfferViews",
          },
          {
            $match: {
              isDelete: false,
              isMDSPartner: true,
              "userOfferViews.offerViewData.viewOfferDate": {
                $gte: fromDate,
                $lte: toDate,
              },
            },
          },
          {
            $project: {
              _id: 1,
              companyName: 1,
              companyLogo: 1,
              darkCompanyLogo: 1,
              createdAt: 1,
              "userOfferViews.offerViewData": {
                $filter: {
                  input: "$userOfferViews.offerViewData",
                  as: "view",
                  cond: {
                    $and: [
                      { $gte: ["$$view.viewOfferDate", fromDate] },
                      { $lt: ["$$view.viewOfferDate", toDate] },
                    ],
                  },
                },
              },
            },
          },
          {
            $unwind: "$userOfferViews.offerViewData",
          },
          {
            $project: {
              _id: 1,
              day: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$userOfferViews.offerViewData.viewOfferDate",
                }
              },
            },
          },
          {
            $group: {
              _id: "$day",
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1},
          },
        ]);
    } else if (field === "rating") {
      dateWiseCount = await Partner.aggregate([
          {
            $match: { isDelete: false, isMDSPartner: true },
          },
          {
            $lookup: {
              from: "partnerreviews",
              localField: "_id",
              foreignField: "partnerId",
              pipeline: [
                {
                  $match: {
                    isDelete: false,
                    createdAt: { $gte: fromDate, $lte: toDate },
                  },
                },
              ],
              as: "partnerReviewData",
            },
          },
          {
            $unwind: "$partnerReviewData",
          },
          {
            $project: {
              _id: 1,
              day: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$partnerReviewData.createdAt",
                }
              },
            },
          },
          {
            $group: {
              _id: "$day",
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1},
          },
        ]);
    } else {
      return res.status(200).json({
        status: false,
        message: `select field from pageView or claim or rating.`,
        data: [],
      });
    }

    return res
      .status(200)
      .json({ status: true, message: `date Wise Count List .`, data: dateWiseCount });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};
