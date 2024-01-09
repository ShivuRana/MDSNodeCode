const { ObjectId } = require("mongodb");
const AppleAuth = require("apple-auth");
const jwt = require("jsonwebtoken");
const airtable_sync = require("../../database/models/airTableSync");
const User = require("../../database/models/user");
const chatUser = require("../../database/models/chatUser");
const contactUsUser = require("../../database/models/contactUsUser");
const AuthUserEmail = require("../../database/models/authUserEmail");

//by ZP ********************************
const GoogleJSON = require("../../pc-api-8893606168182108109-208-586050a90383.json");
const MembershipPlan = require("../../database/models/membershipPlanManagement/membership_plan");
const Payment = require("../../database/models/payment");
const PlanResource = require("../../database/models/plan_resource");
const CustomRegistrationForm = require("../../database/models/customregistrationform");
const GroupMember = require("../../database/models/groupMember");
const Group = require("../../database/models/group");
const Post = require("../../database/models/post");
const Questionnaire = require("../../database/models/questionnaire");
const QuestionAnswer_byUser = require("../../database/models/questionanswerbyuser");
const UserRole = require("../../database/models/userRole");
const ContentEvent = require("../../database/models/contentArchive_event");
const { AdminUser } = require("../../database/models/adminuser");
const https = require("https");
const { manageUserLog } = require("../../middleware/userActivity");
const { sendEmail, sendEmailAdmin } = require("../../config/common");
const event = require("../../database/models/event");
const userSocialAccount = require("../../database/models/userSocialAccount");
const userChatGroup = require("../../database/models/userChatGroup");
const productDataMap = require("../../productDataMap");
const excelJS = require("exceljs");
const groupBy = require("lodash");
var request = require("superagent");
var FormData = require("form-data");
var fs = require("fs");
const http = require("http");
const moment = require("moment");
// const iap = require('in-app-purchase');
const appleReceiptVerify = require("node-apple-receipt-verify");
const APP_STORE_INAPP_SECRET = process.env.APP_STORE_INAPP_SECRET;
const crypto = require("crypto");
const forge = require("node-forge");
const { PubSub } = require("@google-cloud/pubsub");
const { send_notification, notification_template, } = require("../../utils/notification");
const { checkIfMsgReadSocket } = require("../chatcontroller");
require("dotenv").config();
const AWS = require("aws-sdk");
const config = require("config");
const stripe_sk = config.get("stripe");
const stripe = require("stripe")(stripe_sk.secret_key);
const appletoken = config.get("appletoken");
require('moment-timezone');
const inviteCollaborator = require("../../database/models/collaborator/inviteCollaborator");
var s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
  Bucket: process.env.AWS_BUCKET,
});

const path = require("path");
const plan_resource = require("../../database/models/plan_resource");
const payment = require("../../database/models/payment");
const membership_plan = require("../../database/models/membershipPlanManagement/membership_plan");
const auth0 = config.get("auth0");
var axios = require("axios").default;
var OAUTH_TOKEN_API = auth0.oauth_token;
var CLIENT_ID = auth0.client_id;
var CLIENT_SECRET = auth0.client_secret;
var AUDIENCE = auth0.audience;
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const playDeveloper = google.androidpublisher("v3");
const GoogleKey = require("../../pc-api-8893606168182108109-208-586050a90383.json");
const GOOGLE_CLIENT_ID = GoogleKey.client_id;
const GOOGLE_CLIENT_SECRET = GoogleKey.private_key;
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

const playDeveloperAPI = google.androidpublisher({
  version: "v3",
  auth: oauth2Client,
});

// var OAUTH_CONNECTION = auth0.connection
const pemCert = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgvOOHNqOGaIdKKTyt
7hML/lkNdWv2MFQeWIpohphp5H2gCgYIKoZIzj0DAQehRANCAART8ugzuu4swCRe
+nuHhZii8S01UjRS0qAuNk1BT1aawRugcLg2moQQG7hy1axmfBJC1bpSF2lJDTrx
539sFXMT
-----END PRIVATE KEY-----`;
let auth = new AppleAuth(appletoken, pemCert, "text");

async function getAuth0Token() {
  return new Promise(async (resolve, reject) => {
    try {
      var options = {
        method: "POST",
        url: OAUTH_TOKEN_API,
        headers: { "content-type": "application/json" },
        data: {
          grant_type: "client_credentials",
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          audience: AUDIENCE,
        },
      };

      axios
        .request(options)
        .then(function (response) {
          var token = "Bearer " + response.data.access_token;
          resolve(token);
        })
        .catch(function (error) {
          reject(`Something wrong. ${error}`);
        });
    } catch (error) {
      reject(`Something wrong. ${error}`);
    }
  });
}

exports.checkUserbyEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user_data = await airtable_sync.findOne({ email: email.toLowerCase() });
    if (!user_data)
      return res
        .status(200)
        .json({ status: false, message: "User doesn't exist, please signup!" });

    return res
      .status(200)
      .json({ status: true, message: "User data.", data: user_data });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.checkUserbySocialId = async (req, res) => {
  try {
    const { facebookLinkedinId } = req.body;
    var user = await airtable_sync.findOne({
      $or: [
        { facebookLinkedinId: facebookLinkedinId },
        { auth0Id: facebookLinkedinId },
      ],
      isDelete: false,
    }).lean();

    if (user) {
      const InviteCollaborator = await inviteCollaborator.findOne({
        email: user["Preferred Email"],
        isDelete: false,
      }, { _id: 1, email: 1, firstName: 1, lastName: 1, name: 1, memberShipPlanDetails: 1, sharedUserDetails: 1, teamMateInvitationStatus: 1, collaboratorPlan: 1, isOTPVerified: 1 }).lean();

      if (InviteCollaborator !== null && InviteCollaborator.collaboratorPlan === false) {
        return res.status(401).json({ status: false, message: "Your collaborator access is revoked.", data: [] });
      } else {
        if (user.isCollaborator !== undefined && user.isCollaborator === true && InviteCollaborator.sharedUserDetails !== undefined && InviteCollaborator.sharedUserDetails !== null) {
          const memberUserData = await airtable_sync.findOne({
            _id: InviteCollaborator.sharedUserDetails.userId,
            isDelete: false,
          }, { _id: 1, "# of Days Since MDS Only Census": 1 });

          const planDetails = await MembershipPlan.findOne({ _id: InviteCollaborator.memberShipPlanDetails.planId }).populate("accessResources");

          user = { ...user, "# of Days Since MDS Only Census": memberUserData["# of Days Since MDS Only Census"] ? memberUserData["# of Days Since MDS Only Census"] : 0 };
          user = { ...user, "accessResources": planDetails.accessResources ? planDetails.accessResources : [] };
        } else {
          user.isCollaborator = false;
          user = { ...user, "accessResources": [] };
        }
        return res.status(200).json({ status: true, message: "User data.", data: user });
      }
    } else {
      return res.status(200).json({ status: false, message: "User doesn't exist, please signup!" });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.userAddAuth0Step = async (req, res) => {
  try {
    const { email, secondary_email, provider, auth0Id, isSocial, webOrApp } =
      req.body;

    const user_data = await airtable_sync.findOne(
      { auth0Id: auth0Id, isDelete: false },
      {
        otherdetail: 1,
        migrate_user: 1,
        email: 1,
        auth0Id: 1,
        profileImg: 1,
        thumb_profileImg: 1,
        profileCover: 1,
        active: 1,
        blocked: 1,
        verified: 1,
        following: 1,
        followers: 1,
        star_chat: 1,
        blocked_chat: 1,
        blocked_by_who_chat: 1,
        savePosts: 1,
        accessible_groups: 1,
        token: 1,
        isSocial: 1,
        last_login: 1,
        last_activity_log: 1,
        isDelete: 1,
        register_status: 1,
        payment_status: 1,
        QA_status: 1,
        personalDetail_status: 1,
        migrate_user_status: 1,
        purchased_plan: 1,
        forgot_ticket: 1,
        payment_id: 1,
        idtoken: 1,
        user_role: 1,
        "Preferred Email": 1,
      }
    );

    if (user_data) {
      return res.status(200).json({
        status: false,
        message: `This user is Inactive, please wait while admin is verifying the details.`,
        data: user_data,
      });
    } else {
      if (webOrApp === "web") {
        const newUser = new airtable_sync({
          "Preferred Email": email,
          email,
          secondary_email,
          auth0Id,
          provider,
          isSocial,
          register_status: true,
          facebookLinkedinId: auth0Id,
        });

        const savedata = await newUser.save();

        if (!savedata)
          return res
            .status(200)
            .json({ status: false, message: `User not created.` });

        return res
          .status(200)
          .json({ status: true, message: `User created.`, data: savedata });
      } else {
        return res.status(200).json({
          status: false,
          message: `User doesn't exist, please signup!`,
        });
      }
    }
  } catch (error) {
    if (error.name === "ValidationError") {
      let errors;
      Object.keys(error.errors).forEach((key) => {
        errors = error.errors[key].message;
      });
      return res.status(200).send({ status: false, message: errors });
    }
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong." });
  }
};

exports.userAddAuth0Step_flutter = async (req, res) => {
  try {
    const { auth0Id } = req.body;
    const user_data = await airtable_sync.findOne({
      auth0Id: auth0Id,
      isDelete: false,
    });

    if (user_data) {
      return res
        .status(200)
        .json({ status: true, message: `User exist.`, data: user_data });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `User doesn't exist, please signup!` });
    }
  } catch (error) {
    if (error.name === "ValidationError") {
      let errors;
      Object.keys(error.errors).forEach((key) => {
        errors = error.errors[key].message;
      });
      return res.status(200).send({ status: false, message: errors });
    }
    return res
      .status(200)
      .json({ status: false, message: "Something went wrong." });
  }
};

exports.savePersonaldetails_userStep = async (req, res) => {
  try {
    const body = req.body;
    const user_data = await airtable_sync.findById(body.userId, {
      isDelete: false,
    });
    if (user_data) {
      if (!user_data.register_status)
        return res
          .status(200)
          .json({ status: false, message: `You have not registered yet.` });

      if (user_data.personalDetail_status)
        return res.status(200).json({
          status: false,
          message: `You have already perform  this step please move further and choose membership plan and do payment.`,
        });

      const updated_data = await airtable_sync.findByIdAndUpdate(
        body.userId,
        {
          otherdetail: body.otherdetail,
          personalDetail_status: true,
          latitude: body.latitude ?? 0,
          longitude: body.longitude ?? 0,
        },
        { runValidators: true, new: true }
      );

      return res.status(200).send({
        status: true,
        message: "User personal details saved!",
        data: updated_data,
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: `User not found.` });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.payment_step = async (req, res) => {
  try {
    const {
      userId,
      purchased_plan,
      name_on_card,
      payment_id,
      country,
      postal_code,
      card_last4,
      card_expiry_date,
      card_brand,
    } = req.body;

    const user_data = await airtable_sync.findById(userId, { isDelete: false });
    if (!user_data)
      return res
        .status(200)
        .json({ status: false, message: `User doesn't exist, please signup!` });

    if (!user_data.register_status)
      return res
        .status(200)
        .json({ status: false, message: "User has not register yet!" });

    if (!user_data.personalDetail_status)
      return res.status(200).json({
        status: false,
        message: "User has not completed personal details step yet!",
      });

    if (user_data.payment_status)
      return res
        .status(200)
        .json({ status: false, message: "User has already purchased plan." });

    if (!purchased_plan)
      return res
        .status(200)
        .json({ status: false, message: "Please choose any plan." });

    const plan_data = await MembershipPlan.findById(purchased_plan).select(
      "plan_name stripe_price_id plan_resource recurring_timeframe"
    );

    if (!plan_data)
      return res
        .status(200)
        .json({ status: false, message: "This plan is not valid." });

    const get_resource = await PlanResource.findById(
      plan_data.plan_resource
    ).select("group_ids");

    var expire_date = new Date();
    if (plan_data.recurring_timeframe === "day") {
      expire_date.setDate(expire_date.getDate() + 1);
    } else if (plan_data.recurring_timeframe === "month") {
      expire_date.setMonth(expire_date.getMonth() + 1);
    } else if (plan_data.recurring_timeframe === "year") {
      expire_date.setYear(expire_date.getYear() + 1);
    }

    const update_membershipPlan_purchase_user =
      await MembershipPlan.findByIdAndUpdate(purchased_plan, {
        $addToSet: { total_member_who_purchased_plan: userId },
      });
    // ***
    // *    for saving live stripe customers payment
    // ***
    const customerInfo = {
      name: name_on_card,
      plan_price_id: plan_data.stripe_price_id,
    };
    const paymentMethodId = payment_id;

    /* Create customer and set default payment method */
    const customer = await stripe.customers.create({
      payment_method: paymentMethodId,
      name: customerInfo.name,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    if (!customer)
      return res.status(200).json({
        status: false,
        message: "Something wrong, customer not created.",
      });

    /* Create subscription and expand the latest invoice's Payment Intent
     * We'll check this Payment Intent's status to determine if this payment needs SCA
     */
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          plan: customerInfo.plan_price_id,
        },
      ],
      trial_from_plan: false /* Use trial period specified in plan */,
      expand: ["latest_invoice.payment_intent"],
    });
    if (!subscription)
      return res.status(200).json({
        status: false,
        message: "Something wrong, subscription not created.",
      });

    const payment_entry = new Payment({
      membership_plan_id: plan_data._id,
      user_id: userId,
      name_on_card: name_on_card,
      country: country,
      postal_code: postal_code,
      subscriptionId: subscription.id,
      paymentMethodId: paymentMethodId,
      customerId: customer.id,
      card_number: "**** **** **** " + card_last4,
      card_expiry_date: card_expiry_date,
      card_brand: card_brand,
      invoice_payment_intent_status:
        subscription.latest_invoice.payment_intent.status,
      expire_date: expire_date,
    });

    if (!payment_entry)
      return res
        .status(200)
        .json({ status: false, message: "Something went wrong !!" });
    const savedEntry = await payment_entry.save();

    const data = {
      purchased_plan,
      payment_id: savedEntry._id,
      accessible_groups: get_resource.group_ids,
      payment_status: true,
    };
    const update_user_data = await airtable_sync
      .findByIdAndUpdate(userId, data, {
        new: true,
      })
      .select("-__v -password");

    return res.status(200).send({
      status: true,
      message: "Payment successful!",
      data: [
        { id: savedEntry._id, subscription, savedEntry, update_user_data },
      ],
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.questionAnswerStep = async (req, res) => {
  try {
    const get_user = await airtable_sync
      .findById(req.body.userId, {
        isDelete: false,
      })
      .select(
        "email register_status personalDetail_status payment_status QA_status"
      );
    if (!get_user)
      return res
        .status(200)
        .json({ status: false, message: `User not found.` });
    if (
      !get_user.register_status ||
      !get_user.personalDetail_status ||
      !get_user.payment_status
    )
      return res.status(200).json({
        status: false,
        message: "Please complete your registeration profile first.",
      });

    const get_QA = await QuestionAnswer_byUser.findOne({
      userId: req.body.userId,
      question: req.body.question,
      status: true,
    });
    if (get_QA)
      return res.status(200).json({
        status: false,
        message: "You have already given answer for this question.",
      });

    const newentry = new QuestionAnswer_byUser({
      userId: req.body.userId,
      question: req.body.question,
      answer_object: req.body.answer_object,
      status: true,
    });

    if (req.questions_file.length > 0) {
      newentry.answer_object = { data: req.questions_file };
    }

    const add_QA = await newentry.save();
    const total_que = await Questionnaire.find({
      isDelete: false,
      order: { $gt: 0 },
    }).select("order isDelete");

    const que_ids = total_que.map((item) => {
      return item._id;
    });

    const total_fill_answer = await QuestionAnswer_byUser.countDocuments({
      userId: req.body.userId,
      question: { $in: que_ids },
      status: true,
    });

    if (total_fill_answer === total_que.length) {
      const user_data = await airtable_sync.findByIdAndUpdate(
        req.body.userId,
        { QA_status: true },
        { new: true }
      );

      return res.status(200).send({
        status: true,
        message: "All question answer completed.",
        data: { next_ques: false, user: user_data },
      });
    } else {
      return res.status(200).send({
        status: true,
        message: "Answer for this question is submitted.",
        data: { next_ques: true, QnA: add_QA, user: get_user },
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.userLoginby_oauth = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await airtable_sync
      .findOne({ email: email.toLowerCase(), isDelete: false })
      .select("-__v -createdAt -updatedAt -password");
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User doesn't exist, please signup!" });
    if (
      !user.register_status ||
      !user.personalDetail_status ||
      !user.payment_status ||
      !user.QA_status
    )
      return res.status(200).json({
        status: false,
        message: "Registration flow is incomplete.",
        data: { user: user },
      });
    var options = {
      method: "POST",
      url: OAUTH_TOKEN_API,
      headers: { "content-type": "application/json" },
      data: {
        grant_type: "password",
        scope: "openid email",
        username: email,
        password: password,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        audience: AUDIENCE,
      },
    };
    axios
      .request(options)
      .then(async function (result) {
        return res.status(200).json({
          status: true,
          message: "User login.",
          data: { user, idtoken: result.data.id_token },
        });
      })
      .catch((error) => {
        console.log(error);
        return res.status(200).json({
          status: false,
          message: `${error.message} Wrong email or password.`,
        });
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getUserQuestionAnswerList = async (req, res) => {
  try {
    const { id } = req.params;
    const total_que = await Questionnaire.find({
      isDelete: false,
      $gte: { order: 1 },
    });
    const que_ids = total_que.map((item) => {
      return item._id;
    });
    const answerList = await QuestionAnswer_byUser.find({
      userId: id,
      $in: { question: que_ids },
    })
      .populate("userId", "-__v")
      .populate("question", "-__v");

    if (answerList.length > 0) {
      return res.status(200).json({
        status: true,
        message: "User given questions answers.",
        data: answerList,
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Data not found.", data: [] });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getUserProfile_forAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    // get question and their answer
    const questionNanswer = await QuestionAnswer_byUser.aggregate([
      {
        $lookup: {
          from: "questionnaires",
          localField: "question",
          foreignField: "_id",
          as: "question",
        },
      },
      { $unwind: "$question" },
      {
        $match: {
          userId: ObjectId(userId),
          status: true,
          "question.isDelete": false,
        },
      },
      {
        $project: {
          userId: 0,
          createdAt: 0,
          updatedAt: 0,
          status: 0,
          "question.createdAt": 0,
          "question.updatedAt": 0,
          "question.isDelete": 0,
          "question.__v": 0,
          __v: 0,
        },
      },
    ]);

    // get user info.
    const profile = await airtable_sync.aggregate([
      {
        $lookup: {
          from: "groups",
          let: { localField: "$accessible_groups" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$localField"] },
                isDelete: false,
              },

            },
            {
              $project: {
                "createdAt": 0,
                "updatedAt": 0,
                "isDelete": 0,
                "__v": 0,
              }
            }
          ],
          as: "accessible_groups",
        },
      },
      {
          $lookup:{
              from : "membership_plans",
              localField: "purchased_plan",
              foreignField: "_id",
              as: "purchased_plan"
          }
      },
      { $unwind: { path: "$purchased_plan", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "userroles",
          localField: "user_role",
          foreignField: "_id",
          as: "role",
        },
      },
      { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          _id: ObjectId(userId),
          isDelete: false,
        },
      },
      {
        $project: {
          // "role.createdAt": 0,
          // "role.updatedAt": 0,
          // "role.isDelete": 0,
          // "role.__v": 0,
          // "accessible_groups.createdAt": 0,
          // "accessible_groups.updatedAt": 0,
          // "accessible_groups.isDelete": 0,
          // "accessible_groups.__v": 0,
          // password: 0,
          isDelete: 0,
          __v: 0,
        },
      },
    ]);
    //console.log(profile, "profile");
    return res.status(200).json({
      status: true,
      message: "Get user profile",
      data: { profile, questionNanswer },
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getAttendeeProfile_forAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await airtable_sync.findById(userId, {
      attendeeDetail: 1,
      "Preferred Email": 1,
      auth0Id: 1,
      profileImg: 1,
      guestIcon: 1,
      partnerIcon: 1,
      speakerIcon: 1,
      passcode: 1,
    });
    return res.status(200).json({
      status: true,
      message: "Get user profile",
      data: profile,
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

/** create new user **/
exports.createUser = async (req, res) => {
  if (
    Object.keys(req.body.otherdetail).length > 0 &&
    Object.keys(req.body.questions).length > 0
  ) {
    const newuser = new airtable_sync(req.body);
    airtable_sync.findOne({ email: newuser.email.toLowerCase() }, function (err, user) {
      if (user)
        return res.status(400).json({ success: false, message: "email exist" });

      newuser.save(async (err, doc) => {
        if (err) {
          console.log(err);
          return res
            .status(400)
            .json({ success: false, message: "Registration failed" + err });
        } else {
          if (doc.payment_id) {
            const payment_data = await Payment.findById(doc.payment_id);
            const plan_data = await MembershipPlan.findByIdAndUpdate(
              payment_data.membership_plan_id,
              { $push: { total_member_who_purchased_plan: doc._id } },
              { new: true }
            );
            const resource_data = await PlanResource.findById(
              plan_data.plan_resource
            );
            await airtable_sync.findByIdAndUpdate(doc._id, {
              accessible_groups: resource_data.group_ids,
            });
          }
          res
            .status(200)
            .json({ succes: true, user: doc, message: "User created." });
        }
      });
    });
  } else {
    res.status(200).json({ succes: false, message: "Provide proper data" });
  }
};

/** user already exist */
exports.userExist = async (req, res) => {
  try {
    const { auth0Id } = req.body;

    var user = await airtable_sync.findOne({
      $or: [{ auth0Id: auth0Id }, { facebookLinkedinId: auth0Id }],
      isDelete: false,
    }).lean();

    if (user) {
      const InviteCollaborator = await inviteCollaborator.findOne({
        email: user["Preferred Email"],
        isDelete: false,
      }, { _id: 1, email: 1, firstName: 1, lastName: 1, name: 1, memberShipPlanDetails: 1, sharedUserDetails: 1, teamMateInvitationStatus: 1, collaboratorPlan: 1, isOTPVerified: 1 }).lean();

      console.log(InviteCollaborator, "InviteCollaborator")

      if (InviteCollaborator !== null && InviteCollaborator.collaboratorPlan === false) {
        return res.status(401).json({ status: false, message: "Your collaborator access is revoked.", data: [] });
      } else {
        if (user.isCollaborator !== undefined && user.isCollaborator === true && InviteCollaborator !== null && InviteCollaborator.sharedUserDetails !== undefined
          && InviteCollaborator.sharedUserDetails !== null) {
          const memberUserData = await airtable_sync.findOne({
            _id: InviteCollaborator.sharedUserDetails.userId,
            isDelete: false,
          }, { _id: 1, "# of Days Since MDS Only Census": 1 });

          const planDetails = await MembershipPlan.findOne({ _id: InviteCollaborator.memberShipPlanDetails.planId }).populate("accessResources");

          user = { ...user, "# of Days Since MDS Only Census": memberUserData["# of Days Since MDS Only Census"] ? memberUserData["# of Days Since MDS Only Census"] : 0 };
          user = { ...user, "accessResources": planDetails.accessResources ? planDetails.accessResources : [] };
        } else {
          user.isCollaborator = false;
          user = { ...user, "accessResources": [] };
        }
        return res.status(200).json({ status: true, message: "User data.", data: user });
      }
    } else {
      return res.status(200).json({ status: false, message: "user not exist." });
    }

  } catch (e) {
    console.log(e, "error");
    return res.status(200).json({ status: false, message: "Something went wrong!" });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const user = await AdminUser.findOne({
      email: req.body.email.toLowerCase(),
      isDelete: false,
    });
    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "Admin not found." });
    else
      return res
        .status(200)
        .json({ status: true, message: "Admin found.", data: user });
  } catch (e) {
    res.status(400).send(e);
  }
};

//  user login
exports.userLogin = async (req, res) => {
  try {
    const user = await airtable_sync.findOne({
      email: req.body.email.toLowerCase(),
      isDelete: false,
    });
    if (user) {
      if (!user.register_status || !user.payment_status || !user.QA_status) {
        return res.json({
          isAuth: false,
          message: "Not completed registartion process!",
          data: user,
        });
      } else if (user.blocked) {
        return res.json({
          isAuth: false,
          message:
            "Your account is inactive. Once the admin reactivates it, you will be able to login.",
        });
      } else if (!user.active) {
        return res.json({
          isAuth: false,
          message:
            "Your account is inactive. Once the admin reactivates it, you will be able to login.",
        });
      } else {
        return res.json({
          isAuth: true,
          userData: user,
          message: "successfull",
        });
      }
    } else {
      return res.json({
        isAuth: false,
        message: " Auth failed ,email not found",
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      data: error,
      message: "Error in user login!",
    });
  }
};

exports.sociallogin = async (req, res) => {
  try {
    const user = await airtable_sync.findOne({
      email: req.body.email.toLowerCase(),
      isSocial: true,
      isDelete: false,
    });
    if (user) {
      if (!user.register_status || !user.payment_status || !user.QA_status) {
        return res.json({
          isAuth: false,
          data: user,
          message: "Not completed registartion process!",
        });
      } else if (user.blocked) {
        return res.json({
          isAuth: false,
          message:
            "Your account is inactive. Once the admin reactivates it, you will be able to login.",
        });
      } else if (!user.active) {
        return res.json({
          isAuth: false,
          message:
            "Your account is inactive. Once the admin reactivates it, you will be able to login.",
        });
      } else {
        return res.json({
          isAuth: true,
          userData: user,
          message: "successfull",
        });
      }
    } else {
      return res.json({
        isAuth: false,
        message: " Auth failed ,email not found",
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      data: "",
      message: "Error in user login!",
    });
  }
};

/** user forgot pwd **/
exports.forgotPwd = async (req, res) => {
  try {
    const user = await airtable_sync.findOne({
      email: req.body.email.toLowerCase(),
      isDelete: false,
    });
    if (!user)
      return res.status(200).send({
        isAuth: false,
        message: "user with given email doesn't exist",
      });
    else return res.status(200).send({ isAuth: true, message: "email exist" });
  } catch (error) {
    console.log(error);
    return res.status(400).send("An error occured");
  }
};

exports.getallusers = async (req, res) => {
  try {

    var match = {
      $or: [{ blocked: false }, { blocked: { $exists: false } }],
      isDelete: false,
      auth0Id: { $nin: ["", null] },
    }

    var search = "";
    if (req.query.search) {
      search = req.query.search;
      match = {
        ...match,
        $or: [
          { [`otherdetail.${process.env.USER_FN_ID}`]: { $regex: ".*" + search + ".*", $options: "i" }, },
          { [`otherdetail.${process.env.USER_FN_ID}`]: { $regex: ".*" + search + ".*", $options: "i" }, },
          { "Preferred Email": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.name": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.firstName": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.lastName": { $regex: ".*" + search + ".*", $options: "i" }, },
        ],
      };
    }

    const data = await airtable_sync.find(
      match,
      {
        "Preferred Email": 1,
        email: 1,
        // secondary_email: 1,
        // facebookLinkedinId: 1,
        otherdetail: 1,
        auth0Id: 1,
        // socialauth0id: 1,
        // profileImg: 1,
        // thumb_profileImg: 1,
        // profileCover: 1,
        // active: 1,
        // blocked: 1,
        // verified: 1,
        // provider: 1,
        // isSocial: 1,
        // accessible_groups: 1,
        last_login: 1,
        last_activity_log: 1,
        isDelete: 1,
        // register_status: 1,
        // personalDetail_status: 1,
        // payment_status: 1,
        // QA_status: 1,
        // user_role: 1,
        // latitude: 1,
        // longitude: 1,
        migrate_user_status: 1,
        migrate_user: 1,
        // userEvents: 1,
        attendeeDetail: 1,
        userName: {
          $cond: [
            {
              $and: [
                { $ne: [`$otherdetail[${process.env.USER_FN_ID}]`, undefined] },
                { $ne: [`$otherdetail[${process.env.USER_FN_ID}]`, null] },
                { $ne: [`$otherdetail[${process.env.USER_FN_ID}]`, ""] },
                { $ne: [`$otherdetail[${process.env.USER_LN_ID}]`, undefined] },
                { $ne: [`$otherdetail[${process.env.USER_LN_ID}]`, null] },
                { $ne: [`$otherdetail[${process.env.USER_LN_ID}]`, ""] },
              ]
            },
            {
              $concat: [
                `$otherdetail.${process.env.USER_FN_ID}`,
                " ",
                `$otherdetail.${process.env.USER_LN_ID}`,
              ],
            },
            {
              $cond: [
                {
                  $and: [
                    { $ne: [`$attendeeDetail.firstName`, undefined] },
                    { $ne: [`$attendeeDetail.firstName`, null] },
                    { $ne: [`$attendeeDetail.firstName`, ""] },
                    { $ne: [`$attendeeDetail.lastName`, undefined] },
                    { $ne: [`$attendeeDetail.lastName`, null] },
                    { $ne: [`$attendeeDetail.lastName`, ""] },
                  ]
                },
                {
                  $concat: [
                    `$attendeeDetail.firstName`,
                    " ",
                    `$attendeeDetail.lastName`,
                  ],
                },
                {
                  $cond: [
                    {
                      $and: [
                        { $ne: [`$attendeeDetail.name`, undefined] },
                        { $ne: [`$attendeeDetail.name`, null] },
                        { $ne: [`$attendeeDetail.name`, ""] },
                      ]
                    },
                    `$attendeeDetail.name`,
                    null,
                  ],
                },
              ],
            },
          ],
        },
      }
    )
      .lean();
    return res.status(200).send(data);
  } catch (e) {
    return res.status(400).json({ status: false, message: e });
  }
};

exports.getallusersLimitedFields = async (req, res) => {
  try {
    const data = await airtable_sync
      .find({
        $or: [{ blocked: false }, { blocked: { $exists: false } }],
        isDelete: false,
        auth0Id: { $nin: ["", null] },
      })
      .select("email secondary_email otherdetail auth0Id  profileImg")
      .lean();
    return res.status(200).send(data);
  } catch (e) {
    return res.status(400).json({ status: false, message: e });
  }
};

exports.getAllAttendeeList = async (req, res) => {
  try {

    var match = {
      attendeeDetail: { $ne: null }, $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
    }

    var search = "";
    if (req.query.search) {
      search = req.query.search;
      match = {
        ...match,
        $or: [
          { [`otherdetail.${process.env.USER_FN_ID}`]: { $regex: ".*" + search + ".*", $options: "i" }, },
          { [`otherdetail.${process.env.USER_FN_ID}`]: { $regex: ".*" + search + ".*", $options: "i" }, },
          { "Preferred Email": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.name": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.firstName": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.lastName": { $regex: ".*" + search + ".*", $options: "i" }, },
        ],
      };
    }

    const data = await airtable_sync.find(
      match,
      {
        "Preferred Email": 1,
        attendeeDetail: 1,
        isDelete: 1,
      }
    ).populate("attendeeDetail.evntData.event", "title").lean();
    return res.status(200).send(data);
  } catch (e) {
    return res.status(400).json({ status: false, message: e });
  }
};

exports.getAllSpeakerList = async (req, res) => {
  try {
    // const getAllSpeakers = await airtable_sync.find( {
    //   $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
    //   $and: [{ "Preferred Email": { $ne: null } }, { "Preferred Email": { $ne: "" } }],
    // }).select({["Preferred Email"]:1, attendeeDetail : 1, _id: 1 ,["Full Name"] : 1,["Last Name"] : 1, ["Full Name"] : 1})


    // if (getAllSpeakers && getAllSpeakers.length > 0)
    // {

    //   const updateSpeakerDetail = getAllSpeakers.map(async (speaker)=>{
    //         if (!speaker.attendeeDetail)
    //         {
    //           const updateEventAttendeeDetail =   await airtable_sync.findOneAndUpdate({_id: speaker._id} 
    //             ,{  attendeeDetail: {
    //             title: "",
    //             name: (
    //               (speaker["Full Name"] ? speaker["Full Name"]  :  
    //                (speaker["Last Name"] ? speaker["Last Name"]  : '') + ' ' +  (speaker["First Name"] ? speaker["First Name"]  : '')).trim()),
    //             firstName: speaker["First Name"] ? speaker["First Name"] : "",
    //             lastName: speaker["Last Name"] ? speaker["Last Name"] : "",
    //             email: speaker["Preferred Email"] ? speaker["Preferred Email"] : "" ,
    //             company: '',
    //             phone: '',
    //             facebook: "",
    //             linkedin: "",
    //             auth0Id: "",
    //             profession: "",
    //             description: "",
    //             offer: "",
    //             contactPartnerName: "",
    //             evntData: [],
    //           }})

    //         } 
    //   })
    //   await Promise.all([...updateSpeakerDetail]);
    // }



    const data = await airtable_sync.find(
      {
        $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
        $and: [{ "Preferred Email": { $ne: null } }, { "Preferred Email": { $ne: "" } }],
      },
      {
        PreferredEmail: "$Preferred Email",
        auth0Id: 1,
        otherdetail: {
          [`${process.env.USER_FN_ID}`]: {
            $cond: [
              {
                "$ifNull":
                  ["$otherdetail", false]
              },
              `$otherdetail[${process.env.USER_FN_ID}]`,
              ""
            ]
          },
          [`${process.env.USER_LN_ID}`]: {
            $cond: [
              {
                "$ifNull":
                  ["$otherdetail", false]
              },
              `$otherdetail[${process.env.USER_LN_ID}]`,
              ""
            ]
          },
          [`${process.env.USER_EMAIL_ID}`]: {
            $cond: [
              {
                "$ifNull":
                  ["$otherdetail", false]
              },
              `$otherdetail[${process.env.USER_EMAIL_ID}]`,
              ""
            ]
          },
          "First Name": {
            $cond: [
              {
                "$ifNull":
                  ["$First Name", false]
              },
              "$First Name",
              ""
            ]
          },
          "Last Name": {
            $cond: [
              {
                "$ifNull":
                  ["$Last Name", false]
              },
              "$Last Name",
              ""
            ]
          },
        },
        attendeeDetail: {
          name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
          firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
          lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
        },
        isDelete: 1,
      }).lean();

    return res.status(200).json({ status: true, message: "Speaker list retrive successfully.", data: data });

  } catch (error) {
    console.log(error, "error");
    return res.status(400).json({ status: false, message: "Internal server error!", data: error });
  }
};

exports.getblockeduser = async (req, res) => {
  try {
    var match = {
      blocked: true,
      isDelete: false,
      auth0Id: { $nin: ["", null] },
    }

    var search = "";
    if (req.query.search) {
      search = req.query.search;
      match = {
        ...match,
        $or: [
          { [`otherdetail.${process.env.USER_FN_ID}`]: { $regex: ".*" + search + ".*", $options: "i" }, },
          { [`otherdetail.${process.env.USER_FN_ID}`]: { $regex: ".*" + search + ".*", $options: "i" }, },
          { "Preferred Email": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.name": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.firstName": { $regex: ".*" + search + ".*", $options: "i" }, },
          { "attendeeDetail.lastName": { $regex: ".*" + search + ".*", $options: "i" }, },
        ],
      };
    }

    const data = await airtable_sync.find(match);
    return res.status(200).send(data);
  } catch (e) {
    return res.status(400).json({ status: false, message: e });
  }
};

exports.updateprofile = async (req, res) => {
  try {
    const user = await airtable_sync.findById(req.body.id, { isDelete: false });
    if (!user) return res.status(400).send("User not found.");

    airtable_sync.findByIdAndUpdate(
      req.body.id,
      {
        otherdetail: req.body.data,
        active: req.body.active,
        verified: req.body.verified,
      },
      { new: true },
      (err, user) => {
        if (err) {
          return res.status(400).send("Something went wrong!");
        } else {
          manageUserLog(user._id);
          return res.status(200).send(user);
        }
      }
    );
  } catch (e) {
    return res.status(400).send("Something went wrong!");
  }
};

exports.deactivateuser = async (req, res) => {
  try {
    const user = await airtable_sync.findById(req.body.id, { isDelete: false });
    if (!user) return res.status(400).send("User not found.");

    airtable_sync.findByIdAndUpdate(
      req.body.id,
      {
        isDelete: true,
        auth0Id: "",
        facebookLinkedinId: "",
        socialauth0id: "",
      },
      { new: true },
      (err, user) => {
        if (err) return res.status(400).send("Something went wrong!");
        else {
          return res.status(200).send("successfully deactivated user");
        }
      }
    );
  } catch (e) {
    res.status(400).send("Something went wrong!");
  }
};

exports.blockuser = async (req, res) => {
  try {
    const user = await airtable_sync.findById(req.body.id, { isDelete: false });
    if (!user) return res.status(400).send("User not found.");

    airtable_sync.findByIdAndUpdate(
      req.body.id,
      { blocked: true },
      { new: true },
      (err, user) => {
        if (err) res.status(400).send("something went wrong!");
        else res.status(200).send("successfully blocked user!");
      }
    );
  } catch (e) {
    res.status(400).send(e);
  }
};

exports.unblockuser = async (req, res) => {
  try {
    const user = await airtable_sync.findById(req.body.id, { isDelete: false });
    if (!user) return res.status(400).send("User not found.");

    airtable_sync.findByIdAndUpdate(
      req.body.id,
      { blocked: false },
      { new: true },
      (err, user) => {
        if (err) res.status(400).send(err);
        else res.status(200).send("Successfully unblocked user!");
      }
    );
  } catch (e) {
    res.status(400).send(e);
  }
};

exports.deleteuser = async (req, res) => {
  try {
    const user = await airtable_sync.findById(req.body.id, { isDelete: false });
    if (!user) return res.status(400).send("User not found.");
    airtable_sync.findByIdAndDelete(req.body.id, (err, user) => {
      if (err) res.status(400).send(err);
      else res.status(200).send("Successfully deleted!");
    });
  } catch (e) {
    res.status(400).send(e);
  }
};

/** --------------------------------
 * API created by ZP
 */

exports.getUserbyId = async (req, res) => {
  try {
    const userObj = await airtable_sync.findById(req.authUserId, {
      isDelete: false,
    });
    let userData = userObj.toObject();
    delete userData.otherdetail;
    delete userData.questions;

    const userChat = await chatUser.findOne({
      userid: new ObjectId(userData._id),
    });

    if (userChat !== null) {
      userData.onlineStatus = userChat.online;
    } else {
      userData.onlineStatus = false;
    }

    var registeration_fields = await CustomRegistrationForm.find({}).select(
      "fields"
    );

    var otherdetails_array = [];
    registeration_fields.map((item) => {
      item.fields.map((field) => {
        let obj = field.toObject();

        Object.keys(userObj.otherdetail).forEach(function (key) {
          if (obj._id.toString() === key) {
            var temp = userObj.otherdetail[key];
            obj.value = temp;
          }
        });
        otherdetails_array.push(obj);
      });
    });
    userData.otherdetail = otherdetails_array;
    return res
      .status(200)
      .json({ status: true, message: "User details.", data: userData });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: "smothing went wrong !!" });
  }
};

exports.editUserOwnProfile = async (req, res) => {
  try {
    const getUser = await airtable_sync.findOne({
      _id: req.authUserId,
      isDelete: false,
    });
    if (req.origi_profile || req.body.remove_profile) {
      getUser.profileImg &&
        (await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: getUser.profileImg,
          })
          .promise());

      getUser.thumb_profileImg &&
        (await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: getUser.thumb_profileImg,
          })
          .promise());
    }
    if (req.cover_img) {
      getUser.profileCover &&
        (await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: getUser.profileCover,
          })
          .promise());
    }

    var updateUserDetails = {};
    if (
      req.body.otherdetail !== undefined &&
      req.body.otherdetail !== null &&
      Object.keys(JSON.parse(req.body.otherdetail)).length > 0
    ) {
      const userOtherDetailJson = JSON.parse(req.body.otherdetail);
      updateUserDetails = {
        otherdetail: userOtherDetailJson,
        "Preferred Email":
          userOtherDetailJson[process.env.USER_EMAIL_ID] ??
          getUser["Preferred Email"],
        "First Name":
          userOtherDetailJson[process.env.USER_FN_ID] ?? getUser["First Name"],
        "Last Name":
          userOtherDetailJson[process.env.USER_LN_ID] ?? getUser["Last Name"],
        "Preferred Phone Number":
          userOtherDetailJson[process.env.USER_PHONE_ID] ??
          getUser["Preferred Phone Number"],
      };
    }
    updateUserDetails = {
      ...updateUserDetails,
      email: req.body.email ? req.body.email.toLowerCase() : getUser.email ? getUser.email.toLowerCase() : getUser.email,
      profileImg: req.origi_profile
        ? req.origi_profile
        : req.body.remove_profile === undefined
          ? ""
          : getUser.profileImg,
      thumb_profileImg: req.thum_profile
        ? req.thum_profile
        : req.body.remove_profile === undefined
          ? ""
          : getUser.thumb_profileImg,
      profileCover: req.cover_img ? req.cover_img : getUser.profileCover,
    };

    const updateProfile = await airtable_sync.findOneAndUpdate(
      { _id: req.authUserId },
      { $set: updateUserDetails },
      { new: true }
    );
    if (!updateProfile) {
      return res
        .status(200)
        .json({ status: false, message: "Profile not updated!!" });
    } else {
      manageUserLog(req.authUserId);
      return res.status(200).json({
        status: true,
        message: "Profile updated successfully!",
        data: updateProfile,
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: "error," + error });
  }
};

exports.editUserProfilebyAdmin = async (req, res) => {
  try {
    if (req.body.email) {
      return res.status(200).json({
        status: false,
        message: `you can not update user's email address.`,
      });
    }
    const getUser = await airtable_sync.findOne({
      _id: req.body.userId,
      isDelete: false,
    });

    var updateUserDetails = {
      blocked: req.body.blocked ?? getUser.blocked,
      active: req.body.active ?? getUser.active,
      verified: req.body.verified ?? getUser.verified,
      migrate_user: req.body.migratedata ?? getUser.migrate_user,
    };

    if (req.body.otherdetail !== undefined && req.body.otherdetail !== null) {
      updateUserDetails = {
        ...updateUserDetails,
        otherdetail: req.body.otherdetail ?? getUser.otherdetail,
        "Preferred Email": req.body.otherdetail[process.env.USER_EMAIL_ID] ?? getUser["Preferred Email"],
        "First Name": req.body.otherdetail[process.env.USER_FN_ID] ?? getUser["First Name"],
        "Last Name": req.body.otherdetail[process.env.USER_LN_ID] ?? getUser["Last Name"],
        "Preferred Phone Number": req.body.otherdetail[process.env.USER_PHONE_ID] ?? getUser["Preferred Phone Number"],
        attendeeDetail: {
          email: getUser.attendeeDetail.email === undefined ? "" : getUser.attendeeDetail.email,
          auth0Id: getUser.attendeeDetail.auth0Id === undefined ? "" : getUser.attendeeDetail.auth0Id,
          title: getUser.attendeeDetail.title === undefined ? "" : getUser.attendeeDetail.title,
          name: getUser.attendeeDetail.name === undefined ? "" : getUser.attendeeDetail.name,
          firstName: getUser.attendeeDetail.firstName === undefined ? "" : getUser.attendeeDetail.firstName,
          lastName: getUser.attendeeDetail.lastName === undefined ? "" : getUser.attendeeDetail.lastName,
          company: getUser.attendeeDetail.company === undefined ? "" : getUser.attendeeDetail.company,
          profession: getUser.attendeeDetail.profession === undefined ? "" : getUser.attendeeDetail.profession,
          phone: getUser.attendeeDetail.phone === undefined ? "" : getUser.attendeeDetail.phone,
          facebook: getUser.attendeeDetail.facebook === undefined ? "" : getUser.attendeeDetail.facebook,
          linkedin: getUser.attendeeDetail.linkedin === undefined ? "" : getUser.attendeeDetail.linkedin,
          description: getUser.attendeeDetail.description !== "" && getUser.attendeeDetail.description !== null ? getUser.attendeeDetail.description : "",
          offer: getUser.attendeeDetail.offer !== "" && getUser.attendeeDetail.offer !== null ? getUser.attendeeDetail.offer : "",
          contactPartnerName: getUser.contactPartnerName === undefined ? "" : getUser.contactPartnerName,
          evntData: req.body.evntData && req.body.evntData.length > 0 ? req.body.evntData : getUser.attendeeDetail.evntData,
        },
      };
    }

    // check if this groups are already save or not
    const n_grp = req.body.accessible_groups;
    var accessibleGroups = [];
    if (n_grp.length > 0) {
      var temp = n_grp.map(async (id) => {
        const grp = await Group.findById(id).select("groupTitle");
        accessibleGroups.push(grp.groupTitle.trim());
        if (!grp)
          return res.status(200).json({ status: false, message: `Group not found.` });
      });
      await Promise.all([...temp]);
      updateUserDetails.accessible_groups = n_grp;
      updateUserDetails["Chapter Affiliation"] = accessibleGroups;
    } else if (n_grp.length === 0) {
      updateUserDetails.accessible_groups = [];
    }

    // var eventsAttended = [];
    // if (req.body.evntData) {
    //   const eventData = req.body.evntData;
    //   if (eventData.length > 0) {
    //     var temp = eventData.map(async (item, index) => {
    //       const eventDetail = await event.findById(item.event).select("airTableEventName");
    //       if (eventDetail !== null)
    //         eventsAttended.push(eventDetail.airTableEventName.trim());
    //     });
    //     await Promise.all([...temp]);
    //   }
    // } else if (getUser.attendeeDetail.evntData && getUser.attendeeDetail.evntData.length > 0) {
    //   eventsAttended = [];
    //   var existEvent = getUser.attendeeDetail.evntData;
    //   var temp = existEvent.map(async (item) => {
    //     const eventDetail = await event.findById(item.event).select("airTableEventName");
    //     if (eventDetail !== null)
    //       eventsAttended.push(eventDetail.airTableEventName.trim());
    //   });
    //   await Promise.all([...temp]);
    // } else {
    //   eventsAttended = [];
    // }
    // updateUserDetails["Events Attended"] = eventsAttended;

    const updateProfile = await airtable_sync.findByIdAndUpdate(
      req.body.userId,
      updateUserDetails,
      {
        new: true,
      }
    );

    if (!updateProfile) {
      return res.status(200).json({ status: false, message: "Profile not updated!!" });
    } else {
      manageUserLog(req.admin_Id);
      return res.status(200).json({ status: true, message: "Profile updated successfully!", data: updateProfile, });
    }

  } catch (error) {
    console.log(error, "error");
    return res.status(200).json({ status: false, message: "error," + error });
  }
};

exports.editUserProfileImagebyAdmin = async (req, res) => {
  try {
    const getUser = await airtable_sync.findOne({
      _id: req.body.userId,
      isDelete: false,
    });

    if (req.origi_profile || req.body.remove_profile) {
      getUser.profileImg &&
        (await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET,
          Key: getUser.profileImg,
        }).promise());

      getUser.thumb_profileImg &&
        (await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET,
          Key: getUser.thumb_profileImg,
        }).promise());
    }
    if (req.cover_img) {
      getUser.profileCover &&
        (await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET,
          Key: getUser.profileCover,
        }).promise());
    }
    if (req.partnerIcon) {
      getUser.partnerIcon &&
        (await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET,
          Key: getUser.partnerIcon,
        }).promise());
    }
    if (req.guestIcon) {
      getUser.guestIcon &&
        (await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET,
          Key: getUser.guestIcon,
        }).promise());
    }
    if (req.speakerIcon) {
      getUser.speakerIcon &&
        (await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET,
          Key: getUser.speakerIcon,
        }).promise());
    }
    var data = {};

    data = {
      profileImg: req.origi_profile ? req.origi_profile : req.body.remove_profile ? "" : getUser.profileImg,
      thumb_profileImg: req.thum_profile ? req.thum_profile : req.body.remove_profile ? "" : getUser.thumb_profileImg,
      profileCover: req.cover_img ? req.cover_img : getUser.profileCover,
      partnerIcon: req.partnerIcon ?? getUser.partnerIcon,
      speakerIcon: req.speakerIcon ?? getUser.speakerIcon,
      guestIcon: req.guestIcon ?? getUser.guestIcon,
    };

    const updateProfile = await airtable_sync.findByIdAndUpdate(req.body.userId, data, { new: true, });
    if (!updateProfile) {
      return res.status(200).json({ status: false, message: "Profile Image not updated!!" });
    } else {
      manageUserLog(req.admin_Id);
      return res.status(200).json({ status: true, message: "Profile Image updated successfully!", data: updateProfile, });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: "error," + error });
  }
};

exports.editAttendeeProfilebyAdmin = async (req, res) => {
  try {
    const getUser = await airtable_sync.findOne({
      _id: req.body.userId,
      $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
    }).lean();

    if (getUser) {
      if (req.origi_profile) {
        getUser.profileImg &&
          (await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: getUser.profileImg,
          }).promise());

        getUser.thumb_profileImg &&
          (await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: getUser.thumb_profileImg,
          }).promise());
      }
      if (req.partnerIcon) {
        getUser.partnerIcon &&
          (await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: getUser.partnerIcon,
          }).promise());
      }
      if (req.guestIcon) {
        getUser.guestIcon &&
          (await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: getUser.guestIcon,
          }).promise());
      }
      if (req.speakerIcon) {
        getUser.speakerIcon &&
          (await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: getUser.speakerIcon,
          }).promise());
      }

      const editProfileObject = {
        attendeeDetail: JSON.parse(req.body.attendeeDetail)
          ? {
            ...getUser.attendeeDetail,
            ...JSON.parse(req.body.attendeeDetail),
          }
          : getUser.attendeeDetail,
        passcode: req.body.passcode ?? getUser.passcode,
        profileImg: req.origi_profile ?? getUser.profileImg,
        speakerIcon: req.speakerIcon ? req.speakerIcon : req.body.speaker ?? getUser.speakerIcon,
        guestIcon: req.guestIcon ? req.guestIcon : req.body.guest ?? getUser.guestIcon,
        partnerIcon: req.partnerIcon ? req.partnerIcon : req.body.partner ?? getUser.partnerIcon,
        thumb_profileImg: req.thum_profile ?? getUser.thumb_profileImg,
      };

      const updateProfile = await airtable_sync.findByIdAndUpdate(req.body.userId,
        editProfileObject,
        { new: true, }
      );
      if (!updateProfile) {
        return res.status(200).json({ status: false, message: "Profile not updated!!" });
      } else {
        return res.status(200).json({ status: true, message: "Profile updated successfully!", data: updateProfile, });
      }
    } else {
      return res.status(200).json({ status: false, message: "Attendee not found!", });
    }
  } catch (error) {
    console.log(error, "error");
    return res.status(200).json({ status: false, message: "error," + error });
  }
};

// save user profile image to AWs S3 bucket
exports.saveSIgnupQuestionsFiles = async (req, res) => {
  return res.status(200).json({
    status: true,
    message: "Questions files save in S3",
    data: req.questions_file,
  });
};

exports.deleteSignUpQuestionFiles = async (req, res) => {
  try {
    const files = req.body.multi_question_files;
    if (files.length > 0) {
      var temp = [];
      temp = files.map(async (file) => {
        await s3
          .deleteObject({
            Bucket: process.env.AWS_BUCKET,
            Key: file,
          })
          .promise();
      });
      await Promise.all([...temp]);
      return res.status(200).json({
        status: true,
        message: "Files deleted from S3 successfully.`",
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Empty files in body." });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

// storing user auth0 token into user collection after login
exports.storeUserToken = async (req, res) => {
  try {
    const { userId, idtoken } = req.body;
    if (!req.body)
      return res
        .status(200)
        .json({ status: false, message: "Provide proper user details." });

    const userData = await airtable_sync.findById(userId, { isDelete: false });
    if (!userData)
      return res
        .status(200)
        .json({ status: false, message: "User not found." });

    const updateData = await airtable_sync.findOneAndUpdate(
      { _id: userId },
      { $set: { token: idtoken } },
      { new: true }
    );
    if (!updateData)
      return res
        .status(200)
        .json({ status: false, message: "User token not save." });

    return res
      .status(200)
      .json({ status: true, message: "Token save.", data: updateData });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

// get inkedin auth user email address
exports.getlinkedinuserdetails = async (req, res) => {
  var reqAuthCode = req.body.code;
  var reqCallbackUrl = req.body.redirect_uri;

  var data = {
    grant_type: "authorization_code",
    code: reqAuthCode,
    redirect_uri: reqCallbackUrl,
    client_id: "77vqx0j4jty35b",
    client_secret: "4CSIdc6Ra3qcJIY8",
  };

  request
    .post("https://www.linkedin.com/oauth/v2/accessToken")
    .send(data)
    .set("Content-Type", "application/x-www-form-urlencoded")
    .accept("application/json")
    .end(function (err, resp) {
      const accessToken = resp.body.access_token;
      if (accessToken) {
        request
          .get(
            "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))"
          )
          .set("Authorization", `Bearer ${accessToken}`)
          .end(function (err, resp) {
            const dataFormat = resp.text;
            console.log("dataFormat", dataFormat);
            const linkedinData = JSON.parse(dataFormat);

            return res.status(200).json({
              status: true,
              message: "Linkedin user email address.",
              data: linkedinData.elements[0]["handle~"].emailAddress,
            });
          });
      } else {
        return res
          .status(200)
          .json({ status: false, message: resp.body.error_description });
      }
    });
};

exports.getOtherMemberProfileForLoginUser = async (req, res) => {
  try {
    const { memberId } = req.params;
    const loginUser = await airtable_sync
      .findById(req.authUserId, {
        isDelete: false,
      })
      .select("following followers");
    const following_users = loginUser.following;
    const followers_users = loginUser.followers;

    const memberProfile_obj = await airtable_sync.findById(memberId, {
      isDelete: false,
    });
    let memberProfile = memberProfile_obj.toObject();
    delete memberProfile.otherdetail;
    delete memberProfile.questions;

    const userChat = await chatUser.findOne({ userid: new ObjectId(memberId) });

    if (userChat !== null) {
      memberProfile.onlineStatus = userChat.online;
    } else {
      memberProfile.onlineStatus = false;
    }

    var registeration_fields = await CustomRegistrationForm.find({}).select(
      "fields"
    );
    var otherdetails_array = [];
    registeration_fields.map((item) => {
      item.fields.map((field) => {
        let obj = field.toObject();
        var new_obj = {};
        Object.keys(memberProfile_obj.otherdetail).forEach(function (key) {
          if (obj._id.toString() === key) {
            var temp = memberProfile_obj.otherdetail[key];
            new_obj.value = temp;
            new_obj.id = obj._id.toString();
            new_obj.label = obj.label;
          }
        });
        otherdetails_array.push(new_obj);
      });
    });
    memberProfile.otherdetail = otherdetails_array;
    return res.status(200).json({
      status: true,
      message: "Member profile details.",
      data: memberProfile,
    });

    // } else {
    //   return res.status(200).json({ status: false, message: "You can't not see this member profile." })
    // }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getCommonGroupListwithMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const groupFollowbyMember_id = await GroupMember.find({
      userId: memberId,
      status: 2,
    }).select("groupId -_id");
    const groupFollowbyloginUser_id = await GroupMember.find({
      userId: req.authUserId,
      status: 2,
    }).select("groupId -_id");

    var commonGroup_ids = groupFollowbyMember_id.filter((id1) =>
      groupFollowbyloginUser_id.some(
        (id2) => id1.groupId.toString() === id2.groupId.toString()
      )
    );

    if (commonGroup_ids.length > 0) {
      var commonGroup_list = [];
      const temp = commonGroup_ids.map(async (item) => {
        const result = await Group.findById(item.groupId).select("-__v");
        const group_member_data = await GroupMember.findOne({
          userId: req.authUserId,
          groupId: item.groupId,
          status: 2,
        }).select("groupId -_id updatedAt");
        result["member_updatedAt"] = group_member_data.updatedAt;
        commonGroup_list.push(result);
      });
      await Promise.all([...temp]);
      return res.status(200).json({
        status: true,
        message: "Common group list.",
        data: commonGroup_list,
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "Cann't found common group.",
        data: [],
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.memberJoinGroupList = async (req, res) => {
  try {
    const { memberId } = req.params;
    const groupFollowbyMember_id = await GroupMember.find({
      userId: memberId,
      status: 2,
    }).select("groupId -_id");
    const groupFollowbyloginUser_id = await GroupMember.find({
      userId: req.authUserId,
      status: 2,
    }).select("groupId -_id");

    const join_group_ids = groupFollowbyMember_id.filter((el) => {
      return !groupFollowbyloginUser_id.find((element) => {
        return element.groupId.toString() === el.groupId.toString();
      });
    });

    if (join_group_ids.length > 0) {
      var group_list = [];
      const temp = join_group_ids.map(async (item) => {
        const result = await Group.findById(item.groupId).select("-__v");
        group_list.push(result);
      });
      await Promise.all([...temp]);
      return res
        .status(200)
        .json({ status: true, message: "Group list.", data: group_list });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "No group found.", data: [] });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getPosts_onlyPostedByGroupMember_forOtherMemberProfile = async (
  req,
  res
) => {
  try {
    const { page, limit } = req.query;
    const { memberId } = req.params;
    const groupFollowbyMember_id = await GroupMember.find({
      userId: memberId,
      status: 2,
    }).select("groupId -_id");

    var posts = [];
    const temp = groupFollowbyMember_id.map(async (item) => {
      const result = await Post.find({
        postedBy: memberId,
        groupId: item.groupId,
        postStatus: "Public",
      })
        .populate("groupId", "groupTitle")
        .sort({ updatedAt: -1 });

      if (result.length > 0) posts.push(result);
    });

    await Promise.all([...temp]);
    return res
      .status(200)
      .json({ status: true, message: "Member all posts list.", data: posts });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.verifyUserIDtoken = async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      message: "To verify idtoken",
      data: { userId: req.authUserId, role: req.userRole },
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

// last user login
exports.manageUserlastLogin = async (req, res) => {
  try {
    const { authUserId } = req;
    const userdata = await airtable_sync.findById(authUserId, {
      isDelete: false,
    });
    if (!userdata)
      return res
        .status(200)
        .json({ status: false, message: "User not found." });

    if (userdata.migrate_user_status) {
      const newmetadata = req.body.newmetadata ?? userdata.migrate_user;
      const result = await airtable_sync.findByIdAndUpdate(
        authUserId,
        {
          $set: { last_login: Date.now(), migrate_user: newmetadata },
        },
        { new: true }
      );
      return res
        .status(200)
        .json({ status: true, message: "Update user login timestamp." });
    } else {
      await airtable_sync.findByIdAndUpdate(authUserId, {
        $set: { last_login: Date.now() },
      });
      return res
        .status(200)
        .json({ status: true, message: "Update user login timestamp." });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

// delete all user from auth0 and from mongo db users collections EXCEPT ADMIN
exports.deleteAllUsersExceptAdmin = async (req, res) => {
  try {
    await User.remove({ _id: { $ne: "6298419baba3e700705075c9" } });
    return res.status(200).json({
      status: true,
      message: "All users deleted successfully except admin.",
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

// delete all media files/folders/images/videos  from S3 buckets
exports.deleteFoldersfromS3bucket = async (req, res) => {
  try {
    await emptyBucket(process.env.AWS_BUCKET);
    return res
      .status(200)
      .json({ status: true, message: "Deleted media all." });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

async function emptyBucket(bucketName) {
  let currentData;
  let params = {
    Bucket: bucketName,
    Prefix: "uploads/",
  };

  return s3
    .listObjects(params)
    .promise()
    .then((data) => {
      if (data.Contents.length === 0) {
        throw new Error("List of media in this bucket is empty.");
      }

      currentData = data;

      params = { Bucket: bucketName };
      params.Delete = { Objects: [] };

      currentData.Contents.forEach((content) => {
        params.Delete.Objects.push({ Key: content.Key });
      });

      return s3.deleteObjects(params).promise();
    })
    .then(() => {
      if (currentData.Contents.length === 1000) {
        emptyBucket(bucketName, callback);
      } else {
        return true;
      }
    });
}

exports.activeUserStatusBYadmin = async (req, res) => {
  try {
    const { userId } = req.body;
    const data = await airtable_sync
      .findById(userId, { isDelete: false })
      .select("active role");
    if (!data)
      return res.status(200).json({
        status: false,
        message: "User not found!",
      });
    // if (data.role !== 'user') return res.status(200).json({ status: true, message: "You cann't active/deactive who's role is not user." })
    const result = await airtable_sync
      .findByIdAndUpdate(userId, { active: !data.active }, { new: true })
      .select("email active");
    manageUserLog(req.admin_Id);
    return res.status(200).json({
      status: true,
      message: "User status has been changed!",
      data: result,
    });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getallusersname_email_user = async (req, res) => {
  try {
    const { authUserId } = req;
    const data = await airtable_sync.findById(authUserId);
    const alluser = await airtable_sync
      .find({
        email: { $ne: data.email.toLowerCase() },
        register_status: true,
        personalDetail_status: true,
        payment_status: true,
        QA_status: true,
        isDelete: false,
        auth0Id: { $nin: ["", null] },
      })
      .select("otherdetail email");
    return res.status(200).json({ status: true, data: alluser });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getallusersname_email_admin = async (req, res) => {
  try {
    const alluser = await airtable_sync
      .find({
        register_status: true,
        personalDetail_status: true,
        payment_status: true,
        QA_status: true,
        isDelete: false,
        auth0Id: { $nin: ["", null] },
      })
      .select("otherdetail email");
    return res.status(200).json({ status: true, data: alluser });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.migrateuser = async (req, res) => {
  try {
    const filepath = path.join(__dirname, "../uploads/usermigrationdata.json");

    var form = new FormData();
    form.append("connection_id", "con_uwapYCkZ6v8Zgz8M");
    form.append("users", fs.createReadStream(filepath));
    const auth0token = await getAuth0Token();
    var options = {
      method: "POST",
      url: "https://dev-yc4k4-ud.us.auth0.com/api/v2/jobs/users-imports",
      headers: {
        authorization: auth0token,
        "content-type":
          "multipart/form-data; boundary=---011000010111000001101001",
      },
      data: form,
    };

    axios
      .request(options)
      .then(function (response) {
        console.log(response.data);
        res.send(response.data);
      })
      .catch(function (error) {
        console.error(error);
      });
  } catch (e) {
    console.log(e);
    res.send(e);
  }
};

exports.getconnectionid = async (req, res) => {
  try {
    const auth0token = await getAuth0Token();
    console.log("authtoken", auth0token);
    var options = {
      method: "GET",
      url: "https://dev-yc4k4-ud.us.auth0.com/api/v2/connections/con_dMoje8kFjEECk1zm",
      headers: {
        authorization: auth0token,
      },
    };
    axios
      .request(options)
      .then(function (response) {
        console.log(response.data);
        res.send(response.data);
      })
      .catch(function (error) {
        console.error(error);
      });
  } catch (e) { }
};

exports.checkjobstatus = async (req, res) => {
  try {
    const auth0token = await getAuth0Token();
    var options = {
      method: "GET",
      url: "https://dev-yc4k4-ud.us.auth0.com/api/v2/jobs/job_xYtwVXLZyZDzk7Fv",
      headers: {
        "content-type": "application/json",
        authorization: auth0token,
      },
    };

    axios
      .request(options)
      .then(function (response) {
        console.log(response, "response from check job");
        res.send(response);
      })
      .catch(function (error) {
        console.error(error);
      });
  } catch (e) {
    res.send(e);
  }
};

exports.deletemigrateduser = async (req, res) => {
  try {
    const user_data = await airtable_sync.findOneAndDelete({
      email: req.params.email.toLowerCase(),
    });
    console.log(user_data);
    if (user_data)
      return res
        .status(200)
        .json({ status: true, Message: "User deleted successfully!" });
    else
      return res
        .status(200)
        .json({ status: false, Message: "User not deleted!", user_data });
  } catch (e) {
    console.log(e);
    res.status(200).json({ status: false, message: "Something went wrong!" });
  }
};

exports.deleteauthuser = async (req, res) => {
  try {
    await getAuth0Token()
      .then(async (token) => {
        var options = {
          method: "DELETE",
          url: AUDIENCE + "users/" + req.params.userid,
          headers: {
            "content-type": "application/json",
            authorization: token,
            "cache-control": "no-cache",
          },
        };
        axios
          .request(options)
          .then(async function (response) {
            res.status(200).json({ data: response });
          })
          .catch(function (error) {
            return res.status(200).json({
              status: false,
              message: `Something wrong while deleting user. ${error.message}`,
            });
          });
      })
      .catch(function (error) {
        console.log(error);
        return res.status(200).json({
          status: false,
          message: `Something wrong in user token. ${error.message}`,
        });
      });
  } catch (e) {
    console.log(e);
    res.status(200).json({ status: false, message: "Something went wrong!" });
  }
};

exports.updatemigrateduserinfo = async (req, res) => {
  try {
    var fields_array = {};
    var plan_data = await MembershipPlan.findOne({
      isDelete: false,
      auth0_plan_id: req.body.migrate_user.plan_id,
    });

    if (!plan_data) {
      return res.status(200).json({ status: false, message: "Plan not found!" });
    }
    var resources = await plan_resource.findById(plan_data.plan_resource);
    var registeration_fields = await CustomRegistrationForm.find({}).select(
      "fields"
    );

    registeration_fields.map((item) => {
      item.fields.map((field) => {
        if (field._id.toString() === process.env.USER_FN_ID)
          fields_array[field._id] = req.body.first_name;
        else if (field._id.toString() === process.env.USER_LN_ID)
          fields_array[field._id] = req.body.last_name;
        else if (field._id.toString() === process.env.USER_EMAIL_ID)
          fields_array[field._id] = req.body.email;
        else fields_array[field._id] = "";
      });
    });

    await getAuth0Token().then(async (token) => {
      axios.post(AUDIENCE + "users/" + req.body.AuthUserId + "/identities",
        {
          provider: req.body.provider,
          user_id: req.body.AuthUserId2,
        },
        {
          headers: {
            authorization: token,
          },
        }
      ).then(async function (response) {
        console.log(response);

        const mail_data = {
          email: req.body.email,
          subject: `Welcome! You've Successfully Created an Account`,
          html: `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
                        
                        <head>
                            <title></title>
                            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                * {
                                    box-sizing: border-box;
                                }
                        
                                body {
                                    margin: 0;
                                    padding: 0;
                                }
                        
                                a[x-apple-data-detectors] {
                                    color: inherit !important;
                                    text-decoration: inherit !important;
                                }
                        
                                #MessageViewBody a {
                                    color: inherit;
                                    text-decoration: none;
                                }
                        
                                p {
                                    line-height: inherit
                                }
                        
                                .desktop_hide,
                                .desktop_hide table {
                                    mso-hide: all;
                                    display: none;
                                    max-height: 0px;
                                    overflow: hidden;
                                }
                        
                                .image_block img+div {
                                    display: none;
                                }
                        
                                @media (max-width:620px) {
                        
                                    .fullMobileWidth,
                                    .image_block img.big,
                                    .row-content {
                                        width: 100% !important;
                                    }
                        
                                    .mobile_hide {
                                        display: none;
                                    }
                        
                                    .stack .column {
                                        width: 100%;
                                        display: block;
                                    }
                        
                                    .mobile_hide {
                                        min-height: 0;
                                        max-height: 0;
                                        max-width: 0;
                                        overflow: hidden;
                                        font-size: 0px;
                                    }
                        
                                    .desktop_hide,
                                    .desktop_hide table {
                                        display: table !important;
                                        max-height: none !important;
                                    }
                                }
                            </style>
                        </head>
                        
                        <body style="background-color: #ffffff; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
                            <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
                                <tbody>
                                    <tr>
                                        <td>
                                            <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1 mobile_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-top:10px;width:100%;padding-right:0px;">
                                                                                        <div class="alignment" align="left" style="line-height:10px"><img class="fullMobileWidth" src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/Mds%20Grey%20wide.png" style="display: block; height: auto; border: 0; width: 330px; max-width: 100%;" width="330"></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="image_block block-2 desktop_hide" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-top:10px;width:100%;padding-right:0px;">
                                                                                        <div class="alignment" align="left" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/Mds%20Grey%20wide.png" style="display: block; height: auto; border: 0; width: 240px; max-width: 100%;" width="240"></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="heading_block block-1" width="100%" border="0" cellpadding="20" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad">
                                                                                        <h3 style="margin: 0; color: #000000; direction: ltr; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 30px; font-weight: 400; letter-spacing: -1px; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;">Congratulations on successfully creating an account with Million Dollar Sellers</h3>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="image_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><img class="big" src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/mds-app-announcement-rev2_v5_1.png" style="display: block; height: auto; border: 0; width: 600px; max-width: 100%;" width="600"></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="paragraph_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:25px;padding-left:20px;padding-right:20px;">
                                                                                        <div style="color:#232c3d;direction:ltr;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:24px;">
                                                                                            <p style="margin: 0;">We would like to suggest that you try our mobile app for an even better experience with our platform</p>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-4 mobile_hide" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; background-color: #f7f9fb; padding-bottom: 5px; padding-top: 5px; vertical-align: middle; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/app-logo-mockArtboard-1.png" style="display: block; height: auto; border: 0; width: 180px; max-width: 100%;" width="180"></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                        <td class="column column-2" width="66.66666666666667%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; background-color: #f7f9fb; padding-bottom: 5px; padding-top: 5px; vertical-align: middle; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="heading_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-left:20px;padding-right:20px;text-align:center;width:100%;">
                                                                                        <h2 style="margin: 0; color: #232c3d; direction: ltr; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Download the App</span></h2>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
                                                                                        <div style="color:#232c3d;direction:ltr;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:24px;">
                                                                                            <p style="margin: 0;">Download the MDS app for&nbsp;<a href="https://apps.apple.com/app/id1636838955" rel="noopener" target="_blank" style="text-decoration: underline; color: #296bb7;"><strong>iOS</strong></a>&nbsp;or&nbsp;<a href="https://play.google.com/store/apps/details?id=com.app.mdscommunity" rel="noopener" target="_blank" style="text-decoration: underline; color: #296bb7;"><strong>Android</strong></a>, or access the content on the website.</p>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-5 desktop_hide" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden; background-color: #f7f9fb; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/app-logo-mockArtboard-1.png" style="display: block; height: auto; border: 0; width: 180px; max-width: 100%;" width="180"></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="heading_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-left:20px;padding-right:20px;text-align:center;width:100%;">
                                                                                        <h2 style="margin: 0; color: #232c3d; direction: ltr; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Download the App</span></h2>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
                                                                                        <div style="color:#232c3d;direction:ltr;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:24px;">
                                                                                            <p style="margin: 0;">Download the MDS app for&nbsp;<a href="https://apps.apple.com/app/id1636838955" rel="noopener" target="_blank" style="text-decoration: underline; color: #296bb7;"><strong>iOS</strong></a>&nbsp;or&nbsp;<a href="https://play.google.com/store/apps/details?id=com.app.mdscommunity" rel="noopener" target="_blank" style="text-decoration: underline; color: #296bb7;"><strong>Android</strong></a>, or access the content on the website.</p>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-6" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <div class="spacer_block block-1" style="height:15px;line-height:15px;font-size:1px;">&#8202;</div>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-7 mobile_hide" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="33.333333333333336%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; background-color: #f7f9fb; padding-bottom: 5px; padding-top: 5px; vertical-align: middle; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/Group%201000001962_1.png" style="display: block; height: auto; border: 0; width: 180px; max-width: 100%;" width="180"></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                        <td class="column column-2" width="66.66666666666667%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; background-color: #f7f9fb; padding-bottom: 5px; padding-top: 5px; vertical-align: middle; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="heading_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-left:20px;padding-right:20px;text-align:center;width:100%;">
                                                                                        <h2 style="margin: 0; color: #232c3d; direction: ltr; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Need help?</span></h2>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="paragraph_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
                                                                                        <div style="color:#232c3d;direction:ltr;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:24px;">
                                                                                            <p style="margin: 0;">Having issues? Drop them in the beta access <a href="https://m.me/j/AbZsGogZIqQohmgO/" target="_blank" rel="noopener" style="text-decoration: underline; color: #296bb7;"><strong>Facebook Chat ➔</strong></a></p>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-8 desktop_hide" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden; background-color: #f7f9fb; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/Group%201000001962_1.png" style="display: block; height: auto; border: 0; width: 180px; max-width: 100%;" width="180"></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="heading_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-left:20px;padding-right:20px;text-align:center;width:100%;">
                                                                                        <h2 style="margin: 0; color: #232c3d; direction: ltr; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Need help?</span></h2>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;">
                                                                                        <div style="color:#232c3d;direction:ltr;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:24px;">
                                                                                            <p style="margin: 0;">Having issues? Drop them in the beta access <a href="https://m.me/j/AbZsGogZIqQohmgO/" target="_blank" rel="noopener" style="text-decoration: underline; color: #296bb7;"><strong>Facebook Chat ➔</strong></a></p>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-9" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-top: 15px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;">&#8202;</div>
                                                                            <table class="heading_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:5px;padding-left:20px;padding-right:20px;padding-top:10px;text-align:center;width:100%;">
                                                                                        <h1 style="margin: 0; color: #232c3d; direction: ltr; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0;"><span class="tinyMce-placeholder">Join the beta testing</span></h1>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:10px;padding-left:20px;padding-right:20px;">
                                                                                        <div style="color:#232c3d;direction:ltr;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:24px;">
                                                                                            <p style="margin: 0;">Explore exclusive content, and help shape the future of MDS!</p>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <table class="divider_block block-4" width="100%" border="0" cellpadding="20" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad">
                                                                                        <div class="alignment" align="center">
                                                                                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                                <tr>
                                                                                                    <td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #dddddd;"><span>&#8202;</span></td>
                                                                                                </tr>
                                                                                            </table>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-10 desktop_hide" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1" width="100%" border="0" cellpadding="5" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><a href="https://apps.apple.com/app/id1636838955" target="_blank" style="outline:none" tabindex="-1"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/apple.png" style="display: block; height: auto; border: 0; width: 135px; max-width: 100%;" width="135"></a></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                        <td class="column column-2" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1" width="100%" border="0" cellpadding="5" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-hide: all; display: none; max-height: 0; overflow: hidden;">
                                                                                <tr>
                                                                                    <td class="pad">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><a href="https://play.google.com/store/apps/details?id=com.app.mdscommunity" target="_blank" style="outline:none" tabindex="-1"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/play.png" style="display: block; height: auto; border: 0; width: 135px; max-width: 100%;" width="135"></a></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-11 mobile_hide" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-left: 60px; padding-right: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:5px;padding-left:60px;padding-right:5px;padding-top:5px;width:100%;">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><a href="https://apps.apple.com/app/id1636838955" target="_blank" style="outline:none" tabindex="-1"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/apple.png" style="display: block; height: auto; border: 0; width: 170px; max-width: 100%;" width="170"></a></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                        <td class="column column-2" width="50%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-left: 10px; padding-right: 60px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="image_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:5px;padding-left:5px;padding-right:60px;padding-top:5px;width:100%;">
                                                                                        <div class="alignment" align="center" style="line-height:10px"><a href="https://play.google.com/store/apps/details?id=com.app.mdscommunity" target="_blank" style="outline:none" tabindex="-1"><img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/BeeProAgency/974514_959141/play.png" style="display: block; height: auto; border: 0; width: 165px; max-width: 100%;" width="165"></a></div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-12" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <div class="spacer_block block-1" style="height:15px;line-height:15px;font-size:1px;">&#8202;</div>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <table class="row row-13" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 600px;" width="600">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                            <table class="paragraph_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                                <tr>
                                                                                    <td class="pad" style="padding-bottom:10px;padding-left:10px;padding-right:10px;">
                                                                                        <div style="color:#232c3d;direction:ltr;font-family:Arial, Helvetica, sans-serif;font-size:11px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:center;mso-line-height-alt:13.2px;">
                                                                                            <p style="margin: 0;">Copyright © 2023 Million Dollar Sellers, Inc<br>All Rights Reserved</p>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </body>
                        
                        </html>`,
        };
        const userExist = await airtable_sync.find({
          "Preferred Email": req.body.email,
        });
        if (userExist && userExist.length) {
          const updated_data = await airtable_sync.findOneAndUpdate(
            { "Preferred Email": req.body.email },
            {
              "First Name": req.body.first_name,
              "Last Name": req.body.last_name,
              email: req.body.email.toLowerCase(),
              auth0Id: req.body.auth0Id,
              provider: req.body.provider,
              isSocial: true,
              active: true,
              otherdetail: fields_array,
              purchased_plan: plan_data._id,
              register_status: true,
              personalDetail_status: true,
              payment_status: true,
              QA_status: true,
              accessible_groups: resources.group_ids,
              migrate_user_status: true,
              migrate_user: req.body.migrate_user ?? {},
              socialauth0id: req.body.socialauth0id,
              facebookLinkedinId: req.body.facebookLinkedinId,
              profileImg: req.body.migrate_user
                ? req.body.migrate_user.picture_url ?? ""
                : "",
              isDelete: false,
              blocked: false,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            { new: true }
          );
          if (updated_data) {
            const plan = await MembershipPlan.findByIdAndUpdate(
              plan_data._id,
              {
                $push: { total_member_who_purchased_plan: userExist[0]._id },
              },
              { new: true }
            );
            return res.status(200).json({ status: true, message: "updated successfully!", data: updated_data, });
          } else {
            return res.status(200).json({ status: false, message: "Something went wrong!" });
          }
        } else {
          var migrationObj = (userEvent = req.body.migrate_user);
          const allEvents = await ContentEvent.find({
            isDelete: false,
            name: { $ne: "others" },
          });

          allEvents.forEach(async (event, key) => {
            const eventName = event.name.toLowerCase();
            if (!migrationObj[eventName]) {
              userEvent[eventName] = false;
            }
          });
          delete userEvent["plan_id"];
          userEvent["others"] = true;

          const updated_data = new airtable_sync({
            "Preferred Email": req.body.email,
            "First Name": req.body.first_name,
            "Last Name": req.body.last_name,
            email: req.body.email.toLowerCase(),
            auth0Id: req.body.auth0Id,
            provider: req.body.provider,
            isSocial: true,
            active: true,
            otherdetail: fields_array,
            purchased_plan: plan_data._id,
            register_status: true,
            personalDetail_status: true,
            payment_status: true,
            QA_status: true,
            accessible_groups: resources.group_ids,
            migrate_user_status: true,
            migrate_user: req.body.migrate_user ?? {},
            socialauth0id: req.body.socialauth0id,
            facebookLinkedinId: req.body.facebookLinkedinId,
            userEvents: userEvent,
            profileImg: req.body.migrate_user
              ? req.body.migrate_user.picture_url ?? ""
              : "",
            isDelete: false,
            blocked: false,
          });

          updated_data.save(async (err, doc) => {
            if (err)
              return res.status(200).json({ status: false, message: "Something went wrong!", error: err, });
            else {
              const plan = await MembershipPlan.findByIdAndUpdate(
                plan_data._id,
                { $push: { total_member_who_purchased_plan: doc._id } },
                { new: true }
              );
              await sendEmail(mail_data);
              return res.status(200).json({ status: true, message: "updated successfully!", data: doc, });
            }
          });
        }
      }).catch(function (error) {
        console.log(error);
        return res.status(200).json({ status: false, message: `Something wrong while linking user. ${error}`, });
      });
    });
  } catch (e) {
    return res.status(200).json({ status: false, message: "Something went wrong!", error: e });
  }
};

exports.getaccesstoken = async (req, res) => {
  try {
    const token = await getAuth0Token();
    res.status(200).json({ token: token });
  } catch (e) {
    res.status(200).json({ status: false, message: "Something went wrong!" });
  }
};

exports.getuserfromauth0 = async (req, res) => {
  try {
    const { authid } = req.params;
    const auth0token = await getAuth0Token();
    var options = {
      method: "GET",
      url: "https://dev-yc4k4-ud.us.auth0.com/api/v2/users/" + authid,
      headers: {
        "content-type": "application/json",
        authorization: auth0token,
      },
    };

    axios
      .request(options)
      .then(async function (response) {
        // console.log(response.data.email);
        const random = Math.floor(100000 + Math.random() * 900000);
        const mail_data = {
          email: response.data.email,
          subject: `MDS verification code`,
          html: `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

                    <head>
                        <title></title>
                        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
                        <style>
                            * {
                                box-sizing: border-box;
                            }
                    
                            body {
                                margin: 0;
                                padding: 0;
                            }
                    
                            a[x-apple-data-detectors] {
                                color: inherit !important;
                                text-decoration: inherit !important;
                            }
                    
                            #MessageViewBody a {
                                color: inherit;
                                text-decoration: none;
                            }
                    
                            p {
                                line-height: inherit
                            }
                    
                            .desktop_hide,
                            .desktop_hide table {
                                mso-hide: all;
                                display: none;
                                max-height: 0px;
                                overflow: hidden;
                            }
                    
                            .image_block img+div {
                                display: none;
                            }
                    
                            @media (max-width:700px) {
                                .desktop_hide table.icons-inner {
                                    display: inline-block !important;
                                }
                    
                                .icons-inner {
                                    text-align: center;
                                }
                    
                                .icons-inner td {
                                    margin: 0 auto;
                                }
                    
                                .row-content {
                                    width: 100% !important;
                                }
                    
                                .mobile_hide {
                                    display: none;
                                }
                    
                                .stack .column {
                                    width: 100%;
                                    display: block;
                                }
                    
                                .mobile_hide {
                                    min-height: 0;
                                    max-height: 0;
                                    max-width: 0;
                                    overflow: hidden;
                                    font-size: 0px;
                                }
                    
                                .desktop_hide,
                                .desktop_hide table {
                                    display: table !important;
                                    max-height: none !important;
                                }
                    
                                .row-2 .column-1 .block-2.text_block td.pad {
                                    padding: 15px 10px !important;
                                }
                    
                                .row-2 .column-1 .block-1.heading_block h1 {
                                    text-align: center !important;
                                    font-size: 20px !important;
                                }
                    
                                .row-2 .column-1 .block-1.heading_block td.pad {
                                    padding: 40px 10px 5px !important;
                                }
                    
                                .row-1 .column-1 .block-2.image_block td.pad {
                                    padding: 0 0 0 20px !important;
                                }
                    
                                .row-2 .column-1 {
                                    padding: 0 !important;
                                }
                            }
                        </style>
                    </head>
                    
                    <body style="margin: 0; background-color: #fbfbfb; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
                        <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                            <tbody>
                                <tr>
                                    <td>
                                        <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                            role="presentation"
                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                            cellspacing="0" role="presentation"
                                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; color: #000000; width: 680px;"
                                                            width="680">
                                                            <tbody>
                                                                <tr>
                                                                    <td class="column column-1" width="100%"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                        <div class="spacer_block block-1"
                                                                            style="height:30px;line-height:30px;font-size:1px;">&#8202;
                                                                        </div>
                                                                        <table class="image_block block-2" width="100%" border="0"
                                                                            cellpadding="0" cellspacing="0" role="presentation"
                                                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                            <tr>
                                                                                <td class="pad"
                                                                                    style="width:100%;padding-right:0px;padding-left:0px;">
                                                                                    <div class="alignment" align="left"
                                                                                        style="line-height:10px"><img
                                                                                            src="https://mds-community.s3.us-east-2.amazonaws.com/weblogo.png"
                                                                                            style="display: block; height: auto; border: 0; width: 136px; max-width: 100%;"
                                                                                            width="136" alt="Web Logo" title="Logo">
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                        <div class="spacer_block block-3"
                                                                            style="height:15px;line-height:15px;font-size:1px;">&#8202;
                                                                        </div>
                                                                        <div class="spacer_block block-4"
                                                                            style="height:15px;line-height:15px;font-size:1px;">&#8202;
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                            role="presentation"
                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; background-position: center top;">
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                            cellspacing="0" role="presentation"
                                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-bottom: 1px solid #CCD6DD; border-left: 1px solid #CCD6DD; border-radius: 4px; border-right: 1px solid #CCD6DD; border-top: 1px solid #CCD6DD; color: #000000; width: 680px;"
                                                            width="680">
                                                            <tbody>
                                                                <tr>
                                                                    <td class="column column-1" width="100%"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                        <table class="heading_block block-1" width="100%" border="0"
                                                                            cellpadding="0" cellspacing="0" role="presentation"
                                                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                            <tr>
                                                                                <td class="pad"
                                                                                    style="padding-bottom:5px;padding-left:20px;padding-right:15px;padding-top:40px;text-align:center;width:100%;">
                                                                                    <h1
                                                                                        style="margin: 0; color: #171719; direction: ltr; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 30px; font-weight: 400; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;">
                                                                                        Just checking to be sure you're you.</h1>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                        <table class="text_block block-2" width="100%" border="0"
                                                                            cellpadding="0" cellspacing="0" role="presentation"
                                                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                            <tr>
                                                                                <td class="pad"
                                                                                    style="padding-bottom:15px;padding-left:20px;padding-right:35px;padding-top:15px;">
                                                                                    <div style="font-family: Arial, sans-serif">
                                                                                        <div class
                                                                                            style="font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; mso-line-height-alt: 21px; color: #171719; line-height: 1.5;">
                                                                                            <p
                                                                                                style="margin: 0; text-align: center; mso-line-height-alt: 24px;">
                                                                                                <span style="font-size:16px;">Please copy
                                                                                                    and paste the following code into the
                                                                                                    Verification Code field.</span>
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                        <table class="button_block block-3" width="100%" border="0"
                                                                            cellpadding="0" cellspacing="0" role="presentation"
                                                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                            <tr>
                                                                                <td class="pad"
                                                                                    style="padding-bottom:40px;padding-left:25px;padding-right:25px;padding-top:25px;text-align:center;">
                                                                                    <div class="alignment" align="center">
                                                                                        <span
                                                                                            style="text-decoration:none;display:inline-block;color:#171719;background-color:transparent;border-radius:10px;width:auto;border-top:1px solid #AFAFAF;font-weight:400;border-right:1px solid #AFAFAF;border-bottom:1px solid #AFAFAF;border-left:1px solid #AFAFAF;padding-top:5px;padding-bottom:5px;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:21px;text-align:center;mso-border-alt:none;word-break:keep-all;"><span
                                                                                                style="padding-left:60px;padding-right:60px;font-size:21px; display:inline-block;letter-spacing:1px;"><span
                                                                                                    dir="ltr"
                                                                                                    style="word-break: break-word; line-height: 42px;"><strong>${random}</strong></span></span></span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                                            role="presentation"
                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <table class="row-content stack" align="center" border="0" cellpadding="0"
                                                            cellspacing="0" role="presentation"
                                                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; color: #000000; width: 680px;"
                                                            width="680">
                                                            <tbody>
                                                                <tr>
                                                                    <td class="column column-1" width="100%"
                                                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                        <div class="spacer_block block-1"
                                                                            style="height:55px;line-height:55px;font-size:1px;">&#8202;
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </body>
                    
                    </html>`,
        };

        await sendEmail(mail_data);
        if (response.data) {
          const updatedata = await AuthUserEmail.findOneAndUpdate(
            { email: response?.data?.email.toLowerCase() },
            {
              otp: random,
              otpExpireTime: new Date(
                new Date().setMinutes(new Date().getMinutes() + 5)
              ),
              is_otp_verified: false,
            },
            { new: true }
          );
          const data = response.data;

          if (!updatedata) {
            const savedata = await new AuthUserEmail({
              email: response?.data?.email.toLowerCase(),
              otp: random,
              otpExpireTime: new Date(
                new Date().setMinutes(new Date().getMinutes() + 5)
              ),
            }).save();
            if (savedata)
              res.status(200).json({
                status: true,
                data: data,
                message: "OTP sent sucessfully!",
              });
            else
              res
                .status(200)
                .json({ status: false, message: "OTP sent sucessfully!" });
          } else {
            res.status(200).json({
              status: true,
              data: data,
              message: "OTP sent sucessfully!",
            });
          }
        } else {
          res.status(200).json({ status: false, message: "User not found!" });
        }
      })
      .catch((e) => {
        console.log(e);
        res
          .status(200)
          .json({ status: false, error: e, message: "User not found!" });
      });
  } catch (e) {
    console.log(e);
    res
      .status(200)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

exports.reSendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const random = Math.floor(100000 + Math.random() * 900000);
    const mail_data = {
      email: email,
      subject: `MDS verification code`,
      html: `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

            <head>
                <title></title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * {
                        box-sizing: border-box;
                    }
            
                    body {
                        margin: 0;
                        padding: 0;
                    }
            
                    a[x-apple-data-detectors] {
                        color: inherit !important;
                        text-decoration: inherit !important;
                    }
            
                    #MessageViewBody a {
                        color: inherit;
                        text-decoration: none;
                    }
            
                    p {
                        line-height: inherit
                    }
            
                    .desktop_hide,
                    .desktop_hide table {
                        mso-hide: all;
                        display: none;
                        max-height: 0px;
                        overflow: hidden;
                    }
            
                    .image_block img+div {
                        display: none;
                    }
            
                    @media (max-width:700px) {
                        .desktop_hide table.icons-inner {
                            display: inline-block !important;
                        }
            
                        .icons-inner {
                            text-align: center;
                        }
            
                        .icons-inner td {
                            margin: 0 auto;
                        }
            
                        .row-content {
                            width: 100% !important;
                        }
            
                        .mobile_hide {
                            display: none;
                        }
            
                        .stack .column {
                            width: 100%;
                            display: block;
                        }
            
                        .mobile_hide {
                            min-height: 0;
                            max-height: 0;
                            max-width: 0;
                            overflow: hidden;
                            font-size: 0px;
                        }
            
                        .desktop_hide,
                        .desktop_hide table {
                            display: table !important;
                            max-height: none !important;
                        }
            
                        .row-2 .column-1 .block-2.text_block td.pad {
                            padding: 15px 10px !important;
                        }
            
                        .row-2 .column-1 .block-1.heading_block h1 {
                            text-align: center !important;
                            font-size: 20px !important;
                        }
            
                        .row-2 .column-1 .block-1.heading_block td.pad {
                            padding: 40px 10px 5px !important;
                        }
            
                        .row-1 .column-1 .block-2.image_block td.pad {
                            padding: 0 0 0 20px !important;
                        }
            
                        .row-2 .column-1 {
                            padding: 0 !important;
                        }
                    }
                </style>
            </head>
            
            <body style="margin: 0; background-color: #fbfbfb; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
                <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                    <tbody>
                        <tr>
                            <td>
                                <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                                    <tbody>
                                        <tr>
                                            <td>
                                                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; color: #000000; width: 680px;" width="680">
                                                    <tbody>
                                                        <tr>
                                                            <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                <div class="spacer_block block-1" style="height:30px;line-height:30px;font-size:1px;">&#8202;</div>
                                                                <table class="image_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                    <tr>
                                                                        <td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
                                                                            <div class="alignment" align="left" style="line-height:10px"><img src="https://mds-community.s3.us-east-2.amazonaws.com/weblogo.png" style="display: block; height: auto; border: 0; width: 136px; max-width: 100%;" width="136" alt="Web Logo" title="Logo">
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                <div class="spacer_block block-3" style="height:15px;line-height:15px;font-size:1px;">&#8202;</div>
                                                                <div class="spacer_block block-4" style="height:15px;line-height:15px;font-size:1px;">&#8202;</div>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; background-position: center top;">
                                    <tbody>
                                        <tr>
                                            <td>
                                                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-bottom: 1px solid #CCD6DD; border-left: 1px solid #CCD6DD; border-radius: 4px; border-right: 1px solid #CCD6DD; border-top: 1px solid #CCD6DD; color: #000000; width: 680px;" width="680">
                                                    <tbody>
                                                        <tr>
                                                            <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                <table class="heading_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                    <tr>
                                                                        <td class="pad" style="padding-bottom:5px;padding-left:20px;padding-right:15px;padding-top:40px;text-align:center;width:100%;">
                                                                            <h1 style="margin: 0; color: #171719; direction: ltr; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 30px; font-weight: 400; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0;">Just checking to be sure you're you.</h1>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                <table class="text_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                                                    <tr>
                                                                        <td class="pad" style="padding-bottom:15px;padding-left:20px;padding-right:35px;padding-top:15px;">
                                                                            <div style="font-family: Arial, sans-serif">
                                                                                <div class style="font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; mso-line-height-alt: 21px; color: #171719; line-height: 1.5;">
                                                                                    <p style="margin: 0; text-align: center; mso-line-height-alt: 24px;"><span style="font-size:16px;">Please copy and paste the following code into the Verification Code field.</span></p>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                <table class="button_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                                                    <tr>
                                                                        <td class="pad" style="padding-bottom:40px;padding-left:25px;padding-right:25px;padding-top:25px;text-align:center;">
                                                                            <div class="alignment" align="center">
                                                                                <span style="text-decoration:none;display:inline-block;color:#171719;background-color:transparent;border-radius:10px;width:auto;border-top:1px solid #AFAFAF;font-weight:400;border-right:1px solid #AFAFAF;border-bottom:1px solid #AFAFAF;border-left:1px solid #AFAFAF;padding-top:5px;padding-bottom:5px;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:21px;text-align:center;mso-border-alt:none;word-break:keep-all;"><span style="padding-left:60px;padding-right:60px;font-size:21px; display:inline-block;letter-spacing:1px;"><span dir="ltr" style="word-break: break-word; line-height: 42px;"><strong>${random}</strong></span></span></span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb;">
                                    <tbody>
                                        <tr>
                                            <td>
                                                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fbfbfb; color: #000000; width: 680px;" width="680">
                                                    <tbody>
                                                        <tr>
                                                            <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                                                <div class="spacer_block block-1" style="height:55px;line-height:55px;font-size:1px;">&#8202;</div>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </body>
            
            </html>`,
    };

    await sendEmail(mail_data);

    const updatedata = await AuthUserEmail.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        otp: random,
        otpExpireTime: new Date(
          new Date().setMinutes(new Date().getMinutes() + 5)
        ),
        is_otp_verified: false,
      },
      { new: true }
    );

    if (updatedata)
      res.status(200).json({ status: true, message: "OTP sent sucessfully!" });
    else res.status(200).json({ status: false, message: "OTP not sent!" });
  } catch (e) {
    console.log(e);
    res
      .status(200)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const userData = await AuthUserEmail.findOne({ email: email.toLowerCase() });

    if (new Date(userData.otpExpireTime).getTime() < new Date().getTime())
      return res
        .status(200)
        .json({ status: false, response: {}, message: "OTP expier!" });

    if (userData.otp === otp) {
      const updateData = await AuthUserEmail.findOneAndUpdate(
        { email: email.toLowerCase() },
        { otp: null, otpExpireTime: null, is_otp_verified: true },
        { new: true }
      );
      res
        .status(200)
        .json({ status: true, response: updateData, message: "OTP verified!" });
    } else {
      res.status(200).json({
        status: false,
        response: {},
        message: "You have entered wrong code. Please enter again!",
      });
    }
  } catch (e) {
    console.log(e);
    res
      .status(200)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

exports.appleTokenConvertData = async (req, res) => {
  try {
    const response = await auth.accessToken(req.body.authorization.code);
    const idToken = jwt.decode(response.id_token);
    const user = {};
    console.log(idToken);
    user.id = idToken.sub;
    //extract email from idToken
    if (idToken.email) user.email = idToken.email;

    res.json(user); // Respond with the user
  } catch (e) {
    console.log(e);
    res
      .status(200)
      .json({ status: false, message: "Something went wrong!", error: e });
  }
};

/** code by SJ start **/
exports.sendDeactivateRequest = async (req, res) => {
  try {
    const { authUserId } = req;
    const userData = await airtable_sync.findByIdAndUpdate(
      authUserId,
      { deactivate_account_request: true },
      { new: true }
    );

    if (userData)
      return res.status(200).json({
        status: true,
        message: `User account deactivated reuested successfully!`,
        data: userData,
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getDeactivateRequestedUsers = async (req, res) => {
  try {
    const userData = await airtable_sync.find({
      deactivate_account_request: true,
      isDelete: false,
      auth0Id: { $nin: ["", null] },
    });

    if (userData)
      return res.status(200).json({
        status: true,
        message: `Deactivated account reuested user list retrive successfully!`,
        data: userData,
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getAllValidUser = async (req, res) => {
  try {
    const userId = req.authUserId;
    let match = {
      _id: { $ne: userId },
      email: { $ne: "admin@gmail.com" },
      register_status: true,
      personalDetail_status: true,
      payment_status: true,
      isDelete: false,
      blocked: false,
      active: true,
      QA_status: true,
    };

    const userData = await airtable_sync.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: "chat_users",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$userid", "$$userId"],
                },
              },
            },
          ],
          as: "userChat",
        },
      },
      {
        $addFields: {
          onlineStatus: {
            $cond: [
              { $gt: [{ $size: "$userChat" }, 0] },
              "$userChat.online",
              false,
            ],
          },
        },
      },
      {
        $project: {
          email: 1,
          otherdetail: 1,
          profileImg: 1,
          thumb_profileImg: 1,
          onlineStatus: 1,
        },
      },
    ]);

    userData?.map((user) => {
      if (Array.isArray(user.onlineStatus)) {
        user.onlineStatus = user.onlineStatus[0];
      } else {
        user.onlineStatus = user.onlineStatus;
      }
    });

    const sortedUsers = userData.sort((a, b) => {
      if (a.otherdetail[process.env.USER_FN_ID])
        return a.otherdetail[process.env.USER_FN_ID].localeCompare(
          b.otherdetail[process.env.USER_FN_ID]
        );
      else return a;
    });

    if (sortedUsers)
      return res.status(200).json({
        status: true,
        message: `All Valid User list retrive successfully!`,
        data: sortedUsers,
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.verifyInAppPurchase = async (req, res) => {
  try {
    const body = req.body;
    const receipt = req.body;
    const { authUserId } = req;
    const userData = await airtable_sync.findById(authUserId);

    var prchaseDate = new Date(Number(body.startDate));

    if (body.paymentMethod === "ios") {
      const plan_id = await membership_plan.findOne(
        { apple_plan_id: body.planId },
        { _id: 1 }
      );

      appleReceiptVerify.config({
        applePassword: APP_STORE_INAPP_SECRET,
      });

      var receiptData = receipt.token;
      const encodedReceiptData = Buffer.from(receiptData, "base64").toString(
        "base64"
      );

      const receiptUrl = "https://sandbox.itunes.apple.com/verifyReceipt";
      receiptData = encodedReceiptData;

      const requestData = JSON.stringify({
        "receipt-data": receiptData,
      });

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": requestData.length,
        },
      };

      const reqData = https.request(receiptUrl, options, (respo) => {
        let responseData = "";

        respo.on("data", async (chunk) => {
          responseData += chunk;
        });

        respo.on("end", async () => {
          const response = JSON.parse(responseData);
          // console.log(response, "response");

          const payment_entry = new Payment({
            name_on_card: "",
            country: "",
            postal_code: "",
            subscriptionId: "",
            paymentMethodId: "",
            customerId: "",
            card_number: "",
            card_expiry_date: "",
            card_brand: "",
            membership_plan_id: null,
            expire_date: "",
            invoice_payment_intent_status: "succeeded",
            originalTransactionId: body.transactionId,
            inAppProductId: body.planId,
            originalStartDate: prchaseDate,
            startDate: prchaseDate,
            user_id: userData._id,
            inAppToken: body.token,
          });

          // console.log(payment_entry, "payment_entry");

          if (!payment_entry)
            return res.status(200).json({ status: false, message: "Something went wrong !!" });

          const savedEntry = await payment_entry.save();

          if (!savedEntry)
            return res.status(201).json({
              status: false,
              message: "Something wrong while updating payment data.",
            });

          await airtable_sync.findByIdAndUpdate(
            authUserId,
            {
              payment_status: true,
              payment_id: savedEntry._id,
              purchased_plan: plan_id,
            },
            { new: true }
          );
          return res.status(200).json({
            status: true,
            message: "Subscription created successfully.",
            data: savedEntry,
          });
        });
      });

      reqData.on("error", async (error) => {
        console.error(error, "error");
        console.error(error.message);
      });

      reqData.write(requestData);
      reqData.end();
    } else if (paymentMethod === "android") {
      /** Google Setup Code **/

      const plan_id = await membership_plan.findOne({
        play_store_plan_id: body.planId,
      });
      const productId = body.planId; // Replace with the ID of the product you want to verify
      const purchaseToken = body.token; // Replace with the purchase token of the purchase you want to verify

      const jwtClient = new google.auth.JWT(
        GoogleKey.client_email,
        null,
        GoogleKey.private_key,
        "[https://www.googleapis.com/auth/androidpublisher]",
        null
      );

      jwtClient.authorize((err, tokens) => {
        if (err) {
          console.error(err, "jwtClientErr");
          return;
        }

        playDeveloper.purchases.products.get(
          {
            auth: jwtClient,
            // packageName: packageName,
            productId: productId,
            token: purchaseToken,
          },
          async (err, response) => {
            if (err) {
              console.error(err, "err");
              return;
            }
          }
        );
      });
    }
  } catch (error) {
    console.log(error, "error catch");
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.GooglePlayPurchase = async (req, res) => {
  let projectId = "pc-api-8893606168182108109-208";
  let topicNameOrId =
    "projects/pc-api-8893606168182108109-208/topics/play_billing";
  let subscriptionName = "my-sub";

  console.log(req.body, "req.body");

  const { message } = req.body;
  console.log(message, "message");

  const { subscriptionNotification } = message;
  console.log(subscriptionNotification, "subscriptionNotification");

  /** 
            INITIAL_PURCHASE
            NON_RENEWING_PURCHASE
            RENEWAL
            PRODUCT_CHANGE
            CANCELLATION
            UNCANCELLATION
            BILLING_ISSUE
            SUBSCRIBER_ALIAS
            SUBSCRIPTION_PAUSED
            TRANSFER
            EXPIRATION
        
            BILLING_ERROR
            DEVELOPER_INITIATED
            PRICE_INCREASE
        **/

  if (subscriptionNotification) {
    const { version } = subscriptionNotification;
    console.log(version, "version");

    const { notificationType } = subscriptionNotification;
    console.log(notificationType, "notificationType");
  }

  res.sendStatus(200);
};

exports.AppStorePurchase = async (req, res) => {
  const eventData = req.body;
  const signedPayload = eventData.signedPayload;
  const decoded = jwt.decode(signedPayload);
  const transactionData = decoded.data.signedTransactionInfo;
  const signedTransaction = jwt.decode(transactionData);
  const renewalData = decoded.data.signedRenewalInfo;
  const signedRenewal = jwt.decode(renewalData);

  const notificationType = decoded.notificationType;

  const cancel_subscription = true;
  const inAppProductId = signedTransaction.productId;
  const originalTransactionId = signedTransaction.originalTransactionId;
  const startDate = new Date(Number(signedTransaction.purchaseDate));
  const expire_date = new Date(Number(signedTransaction.expiresDate));
  const user_id = "";
  const membership_plan_id = await membership_plan.findOne(
    { apple_plan_id: signedTransaction.productId },
    { _id: 1 }
  );
  const autoRenewProductId = signedRenewal.autoRenewProductId;
  var result;

  switch (notificationType) {
    case "CONSUMPTION_REQUEST":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "DID_CHANGE_RENEWAL_PREF":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "DID_CHANGE_RENEWAL_STATUS":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "DID_FAIL_TO_RENEW":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "DID_RENEW":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "EXPIRED":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
            cancel_subscription: cancel_subscription,
          },
          { new: true }
        );
      break;

    case "GRACE_PERIOD_EXPIRED":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
            cancel_subscription: cancel_subscription,
          },
          { new: true }
        );
      break;

    case "OFFER_REDEEMED":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "PRICE_INCREASE":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "REFUND":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "REFUND_DECLINED":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "RENEWAL_EXTENDED":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "RENEWAL_EXTENSION":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "REVOKE":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "SUBSCRIBED":
      if (
        await payment.findOne({ originalTransactionId: originalTransactionId })
      )
        result = await payment.findOneAndUpdate(
          { originalTransactionId: originalTransactionId },
          {
            inAppProductId: inAppProductId,
            autoRenewProductId: autoRenewProductId,
            startDate: startDate,
            expire_date: expire_date,
            membership_plan_id: membership_plan_id,
          },
          { new: true }
        );
      break;

    case "TEST":
      console.log("it's the TEST method we don't need to do anything here.");
      break;

    default:
      text = "No data found";
  }

  if (!result) {
    console.log("Unauthorized request");
    res.sendStatus(401);
    return;
  }

  // Send a 200 OK response to Apple
  console.log("Received webhook data:", result);
  res.sendStatus(200);
};

exports.getUserPayment = async (req, res) => {
  try {
    const { authUserId } = req;
    const userData = await airtable_sync.findById(authUserId);

    const savedEntry = await payment.findOne(
      { user_id: userData._id },
      { inAppToken: 0, __v: 0 }
    );

    if (!savedEntry)
      return res.status(201).json({
        status: false,
        message: "User payment data not found!",
        data: [],
      });

    return res.status(200).json({
      status: true,
      message: "User payment data retrive successfully.",
      data: savedEntry,
    });
  } catch (error) {
    console.log(error, "error catch");
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.addContactUserData = async (req, res) => {
  try {
    const body = req.body;

    var contactUser = {};

    const alreadyAdded = await contactUsUser.findOne({ email: body.email.toLowerCase() });
    const adminEmail = process.env.AdminEmail;

    if (alreadyAdded !== null) {
      contactUser = await contactUsUser.findOneAndUpdate(
        { email: body.email.toLowerCase() },
        body,
        { new: true }
      );
    } else {
      contactUser = await contactUsUser.create(body);
    }
    const mail_data = {
      email: `${body.email}`,
      subject: `${body.subject}`,
      html: `<h4> Hello Admin,</h4>
              </br>
              <div>Here is new inquiry from MDS community platform.</div>
              </br></br>
              <div>From:</div>
              </br>
              <div>${body.email}</div>
              </br></br>
              <div>Message:</div>
              </br>
              <div>${body.message}</div>
              </br></br>
              <div>Thank You</div>`,
    };

    await sendEmailAdmin(mail_data);

    if (contactUser) {
      res.status(200).json({
        status: true,
        message: "User data added successfully!",
        data: contactUser,
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getContactUserData = async (req, res) => {
  try {
    const contactUserList = await contactUsUser.find({});

    if (contactUserList) {
      res.status(200).json({
        status: true,
        message: "User data retive successfully!",
        data: contactUserList,
      });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.addBaseInProfile = async (req, res) => {
  try {
    const AllUser = await airtable_sync.find({});
    AllUser?.forEach(async (item) => {
      if (item.profileImg === process.env.AWS_IMG_VID_PATH) {
        await airtable_sync.findOneAndUpdate(
          { _id: new ObjectId(item._id) },
          { profileImg: "" },
          { new: true }
        );
      } else if (
        item.profileImg !== null &&
        !item.profileImg.startsWith("https://mds-community.s3.amazonaws.com/")
      ) {
        await airtable_sync.findOneAndUpdate(
          { _id: new ObjectId(item._id) },
          { profileImg: process.env.AWS_IMG_VID_PATH + item.profileImg },
          { new: true }
        );
      }
    });
    return res
      .status(200)
      .json({ status: true, message: `Updated all profile IMG.` });
  } catch (error) {
    return res
      .status(200)
      .json({ status: false, message: `Something went wrong. ${error}` });
  }
};

// Admin export user data API
exports.exportUser = async (req, res) => {
  try {
    const AllUsers = await airtable_sync.find(
      { isDelete: false, auth0Id: { $nin: ["", null] } },
      {
        _id: 1,
        email: "$Preferred Email",
        otherdetail: 1,
        migrate_user_status: 1,
        // migrate_user: 1,
        userEvents: 1,
      }
    );

    if (AllUsers) {
      return res
        .status(200)
        .json({ status: true, message: "User data retrive.", data: AllUsers });
    } else {
      return res.status(401).json({
        status: false,
        message: `Something went wrong ${error.message}`,
      });
    }
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: `Internal server error! ${err.message}`,
    });
  }
};

// Admin import user data API
exports.importUser = async (req, res) => {
  try {
    const body = req.body;
    const allUser = body.allUser;
    allUser?.forEach(async (userData, i) => {
      await airtable_sync.findOneAndUpdate(
        { _id: new ObjectId(userData._id) },
        {
          migrate_user_status: userData.migrate_user_status,
          migrate_user: userData.migrate_user,
          otherdetail: userData.otherdetail,
          userEvents: userData.userEvents,
        },
        { new: true }
      );
    });
    return res
      .status(200)
      .json({ status: true, message: "User data successfully updated." });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: `Internal server error! ${err.message}`,
    });
  }
};

// add and remove device token API
exports.addNremoveDeviceToken = async (req, res) => {
  try {
    const body = req.body;
    const { authUserId } = req;

    if (body.isLogin === true) {
      let allUser = await airtable_sync
        .find({
          isDelete: false,
          deviceToken: { $in: body.deviceToken },
          auth0Id: { $nin: ["", null] },
        })
        .lean();
      if (allUser.length > 0) {
        allUser.forEach(async (userData) => {
          await airtable_sync.findOneAndUpdate(
            { _id: userData._id, isDelete: false },
            { $pull: { deviceToken: body.deviceToken } }
          );
        });
      }

      let unReadCount = await checkIfMsgReadSocket(authUserId);
      let userDeviceToken = await airtable_sync.findOne(
        { _id: authUserId },
        { deviceToken: 1 }
      );
      if (userDeviceToken.deviceToken.length > 0) {
        let successdata = {
          notification: "",
          description: "",
          device_token: userDeviceToken.deviceToken,
          collapse_key: "",
          badge_count: unReadCount,
          notification_data: {
            type: "",
            content: [],
          },
        };
        send_notification(successdata);
      }
      await airtable_sync.findOneAndUpdate(
        { _id: authUserId, isDelete: false },
        {
          $addToSet: {
            ...(body.deviceToken != null && { deviceToken: body.deviceToken }),
          },
        },
        { new: true }
      );

      return res.status(200).json({
        status: true,
        message: "User device token successfully updated.",
      });
    } else {
      let userData = await airtable_sync
        .findOne({ _id: authUserId, isDelete: false })
        .select("deviceToken");
      if (userData.deviceToken.length > 0 && userData.deviceToken) {
        let successdata = {
          notification: "",
          description: "",
          device_token: userData.deviceToken,
          collapse_key: "",
          badge_count: 0,
          notification_data: {
            type: "",
            content: [],
          },
        };
        send_notification(successdata);
      }
      await airtable_sync.findOneAndUpdate(
        { _id: authUserId, isDelete: false },
        { $pull: { deviceToken: body.deviceToken } }
      );

      return res
        .status(200)
        .json({ status: true, message: "User Logout successfully." });
    }
  } catch (err) {
    console.log(err, "err");
    return res.status(500).json({
      status: false,
      message: `Internal server error! ${err.message}`,
    });
  }
};

// get all users and attendees
exports.getAllValidUserAndAttendees = async (req, res) => {
  try {
    let match = {
      email: { $ne: "admin@gmail.com" },
      isDelete: false,
      $or: [
        { auth0Id: { $exists: true } },
        { attendeeDetail: { $exists: true } },
      ],
    };

    const userData = await airtable_sync.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: "chat_users",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$userid", "$$userId"],
                },
              },
            },
          ],
          as: "userChat",
        },
      },
      {
        $addFields: {
          onlineStatus: {
            $cond: [
              { $gt: [{ $size: "$userChat" }, 0] },
              "$userChat.online",
              false,
            ],
          },
        },
      },
      {
        $project: {
          email: 1,
          otherdetail: 1,
          profileImg: 1,
          thumb_profileImg: 1,
          onlineStatus: 1,
          auth0Id: 1,
          attendeeDetail: {
            name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
            photo: "$attendeeDetail.photo" ? "$attendeeDetail.photo" : "",
          },
        },
      },
    ]);

    userData?.map((user) => {
      if (Array.isArray(user.onlineStatus)) {
        user.onlineStatus = user.onlineStatus[0];
      } else {
        user.onlineStatus = user.onlineStatus;
      }
    });

    const sortedUsers = userData.sort((a, b) => {
      if (a.auth0Id !== "" && b.auth0Id !== "" && a.otherdetail && b.otherdetail && a.otherdetail[process.env.USER_FN_ID] && b.otherdetail[process.env.USER_FN_ID]) {
        return a.otherdetail[process.env.USER_FN_ID].localeCompare(
          b.otherdetail[process.env.USER_FN_ID]
        );
      } else {
        return a;
      }
    });

    if (sortedUsers)
      return res.status(200).json({
        status: true,
        message: `All Valid User list retrive successfully!`,
        data: sortedUsers,
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getAllUsersMembersAndAttendees = async (req, res) => {
  try {
    const allUsersMembersAndAttendees = await airtable_sync.find({
      $or: [{ isDelete: false }, { isDelete: { $exists: false } }],
      $or: [{ attendeeDetail: { $ne: null } }, { auth0Id: { $nin: ["", null] } }]
    }, {
      "Preferred Email": 1,
      email: 1,
      attendeeDetail: 1,
      otherdetail: 1,
      profileImg: 1,
      speakerIcon: 1,
      guestIcon: 1,
      partnerIcon: 1
    })
    if (allUsersMembersAndAttendees)
      return res.status(200).send(allUsersMembersAndAttendees);
    else
      return res.status(200).send([]);
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const authUserId = req.authUserId;
    const userData = await airtable_sync.findOne({ _id: ObjectId(authUserId) });
    if (userData !== null) {
      if (!userData.otherdetail) {
        let name = userData.attendeeDetail.name;
        let userName = name.split(" ");
        userData.profileImg = userData.profileImg !== null && userData.profileImg !== "" ? userData.profileImg : userData.profileImg === undefined ? "" : userData.guestIcon === undefined ? "" : userData.guestIcon;
        userData = { ...userData, email: userData["Preferred Email"].toLowerCase() ? userData["Preferred Email"].toLowerCase() : "" };
        userData = { ...userData, otherdetail: { [`${process.env.USER_FN_ID}`]: userName[0] ? userName[0] : "", [`${process.env.USER_LN_ID}`]: userName[1] ? userName[1] : "" } };
      }

      return res.status(201).send({ status: true, message: "User data retrive successfully.", data: userData });
    } else {
      return res.status(401).send({ status: false, message: "User details not found!" });
    }
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({ status: false, message: `Internal server error. ${error}` });
  }
};
/** code by SJ end **/


// update single users attendee details for event sync up fields
exports.airTableEventSyncUpForSingleUser = async (req, res) => {
  try {
    const authUserId = req.authUserId;
    let matchedEvents = []
    let unMatchedEvents = []
    if (req.body.localDate) {
      var localDate = new Date(req.body.localDate);
      localDate = moment(localDate, "YYYY-MM-DD").toDate();
      const activeUser = await airtable_sync.findById(ObjectId(authUserId), { _id: 1, otherdetail: 1, auth0Id: 1, "Preferred Email": 1, "Upcoming Events Registered": 1, attendeeDetail: 1 }).lean();
      if (activeUser) {
        const allEventList = await event.aggregate([
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
          }, {
            $match: {
              isDelete: false,
              Date: { $gt: localDate },
            }
          }, {
            $project: {
              _id: 1,
              title: 1,
              airTableEventName: { $ifNull: ["$airTableEventName", ""] },
            }
          }])

        if (activeUser["Upcoming Events Registered"] && activeUser["Upcoming Events Registered"] !== undefined && activeUser["Upcoming Events Registered"] !== null && activeUser["Upcoming Events Registered"] !== "" && activeUser["Upcoming Events Registered"].length > 0) {

          const attendetailExists = activeUser.attendeeDetail
            && Object.keys(activeUser.attendeeDetail).length > 0 ? true : false

          const eventDataExists = activeUser.attendeeDetail
            && Object.keys(activeUser.attendeeDetail).length > 0 && activeUser.attendeeDetail.evntData ? true : false

          var eventData = activeUser.attendeeDetail
            && Object.keys(activeUser.attendeeDetail).length > 0
            && activeUser.attendeeDetail.evntData ? activeUser.attendeeDetail.evntData : []

          var eventAttended = activeUser["Upcoming Events Registered"]

          allEventList.map((event) => {
            const eventMatch = eventAttended.filter(item => {
              let tmpItem = item.replaceAll('"', "").trim()
              return tmpItem === event.airTableEventName.trim()

            })
            if (eventMatch.length > 0) {
              matchedEvents.push({
                event: event._id,
                privateProfile: false,
                member: true,
                speaker: false,
                partner: false,
                guest: false,
                partnerOrder: 0
              })
            } else {
              unMatchedEvents.push(event)

            }
          })

          if (matchedEvents.length > 0) {
            if ((attendetailExists) && eventDataExists) {
              let memberEventDetails = activeUser.attendeeDetail;
              matchedEvents.map(matchEvnt => {
                let userAttendeeExists = eventData.filter(eventObject => eventObject.event.toString() === matchEvnt.event.toString())
                if (userAttendeeExists.length === 0) {
                  memberEventDetails.evntData.push(matchEvnt)
                }
              })
              const upDateAttendeeData = await airtable_sync.findByIdAndUpdate(activeUser._id, { $set: { attendeeDetail: memberEventDetails } })
            } else {
              if ((attendetailExists) && !eventDataExists) {
                let memberEventDetails = activeUser.attendeeDetail
                memberEventDetails.evntData = matchedEvents
                const upDateAttendeeData = await airtable_sync.findByIdAndUpdate(activeUser._id, { $set: { attendeeDetail: memberEventDetails } })
              } else {
                let firstname = activeUser.otherdetail ? activeUser.otherdetail[process.env.USER_FN_ID] ? activeUser.otherdetail[process.env.USER_FN_ID] : "" : ""
                let lastname = activeUser.otherdetail ? activeUser.otherdetail[process.env.USER_LN_ID] ? activeUser.otherdetail[process.env.USER_LN_ID] : "" : ""
                let fullname = firstname + lastname
                const upDateAttendeeData = await airtable_sync.findByIdAndUpdate(activeUser._id, {
                  $set: {
                    attendeeDetail:
                    {
                      email: activeUser["Preferred Email"], name: fullname, firstName: firstname, lastName: lastname, auth0Id: activeUser.auth0Id, evntData: matchedEvents
                    }
                  }
                })

              }
            }
          }

          if (unMatchedEvents.length > 0) {
            let resDeleteEvents = unMatchedEvents.map(async event => {
              const userUnRegisteredEvent = await airtable_sync.findOneAndUpdate({
                _id: ObjectId(authUserId), "attendeeDetail.evntData": {
                  $elemMatch: { event: event._id }
                }
              }, { $pull: { "attendeeDetail.evntData": { event: event._id } } }, { new: true })
            })
            await Promise.all([...resDeleteEvents]);
          }

          return res.status(200).json({ status: true, message: "Attendees details updated." });
        } else {
          const allEventListWithOutAirTable = await event.aggregate([
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
            }, {
              $match: {
                isDelete: false,
                Date: { $gt: localDate },
              }
            }, {
              $project: {
                _id: 1,

              }
            }])

          allEventListWithOutAirTable.map(async (event) => {
            const userUnRegisteredEvent = await airtable_sync.findOneAndUpdate({
              _id: ObjectId(authUserId), "attendeeDetail.evntData": {
                $elemMatch: { event: event._id }
              }
            }, { $pull: { "attendeeDetail.evntData": { event: event._id } } }, { new: true })
          })

          return res.status(200).json({ status: true, message: "Attendees details updated." });
        }
      } else {
        return res.status(200).json({ status: false, message: "No user found!" });
      }
    } else {
      return res.status(200).json({ status: false, message: "Date query parameter are missing!" });

    }

  } catch (e) {
    return res.status(500).json({ status: false, message: `Internal server error. ${e}` });
  }
}


/** user collaborator exists */
exports.userCollaboratorResources = async (req, res) => {
  try {

    const authUserId = req.authUserId;
    var user = await airtable_sync.findById(ObjectId(authUserId)).lean();

    if (user) {

      const InviteCollaborator = await inviteCollaborator.findOne({
        email: user["Preferred Email"],
        isDelete: false,
      }, { _id: 1, memberShipPlanDetails: 1 }).lean();

      if (InviteCollaborator) {
        const planDetails = await MembershipPlan.findOne({ _id: InviteCollaborator.memberShipPlanDetails.planId }).populate("accessResources");
        const accessResourceList = planDetails.accessResources ? planDetails.accessResources : [];
        if (accessResourceList.length > 0) {
          return res.status(200).json({ status: true, message: "Access resources list fetched", accessResourceList });
        } else {
          return res.status(200).json({ status: false, message: "Acces resources are not available for this user." });
        }
      } else {
        return res.status(200).json({ status: false, message: "Collaborator not exists." });
      }

    } else {
      return res.status(200).json({ status: false, message: "user not exist." });
    }

  } catch (e) {
    console.log(e, "error");
    return res.status(200).json({ status: false, message: "Something went wrong!" });
  }
};

