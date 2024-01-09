const airtable_sync = require("../../database/models/airTableSync");
const Notification = require("../../database/models/notification");
const {
  send_notification,
  notification_template,
} = require("../../utils/notification");
// get days since mds only census for particular user
exports.getDaysSinceMDSOnlyCensus = async (req, res) => {
  try {
    const userDaysSinceMDSOnlyCensus = await airtable_sync.findById(
      req.authUserId,
      {
        "Preferred Email" : 1,
        "# of Days Since MDS Only Census": 1,
        migrate_user: 1
      }
    ).lean();
    if (!userDaysSinceMDSOnlyCensus)
      return res
        .status(200)
        .json({ status: false, message: "User not found!" });
    const userDaysSinceMDSOnlyCensusData ={...userDaysSinceMDSOnlyCensus, "# of Days Since MDS Only Census": userDaysSinceMDSOnlyCensus["migrate_user"] && userDaysSinceMDSOnlyCensus["migrate_user"].plan_id === "Staff" ? 1 : userDaysSinceMDSOnlyCensus["# of Days Since MDS Only Census"] && typeof
    userDaysSinceMDSOnlyCensus["# of Days Since MDS Only Census"] !== "object" ? userDaysSinceMDSOnlyCensus["# of Days Since MDS Only Census"] : "" }
    
    return res
      .status(200)
      .json({
        status: true,
        message: "User days since MDS only census.",
        data: userDaysSinceMDSOnlyCensusData,
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};
// getting all users having mds only census greater than 350 
exports.getUsersMDSOnlyCensusExpiryNearAPI = async (req, res) => {
  try {
    const usersMDSOnlyCensusExpiryNear = await airtable_sync.find(
      { "# of Days Since MDS Only Census": { $gt: 350 } },
      {
        "# of Days Since MDS Only Census": 1,
        deviceToken: 1,
      }
    );
    if (!usersMDSOnlyCensusExpiryNear)
      return res
        .status(200)
        .json({ status: false, message: "Users not found!" });

    return res
      .status(200)
      .json({
        status: true,
        message: "Users expiry MDS only census.",
        data: usersMDSOnlyCensusExpiryNear,
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};
// notification for all users whose mds only census expired or 14 days remaining or 1 day remaining
exports.getUsersMDSOnlyCensusExpiryNear = async () => {
  try {
    const usersMDSOnlyCensusExpiryNear = await airtable_sync.find(
      { "# of Days Since MDS Only Census": { $eq: 351 } },
      {
        "# of Days Since MDS Only Census": 1,
        deviceToken: 1,
        migrate_user: 1
      }
    );
    const usersMDSOnlyCensusExpiryTomorrow = await airtable_sync.find(
        { "# of Days Since MDS Only Census": { $eq: 365 } },
        {
          "# of Days Since MDS Only Census": 1,
          deviceToken: 1,
          migrate_user: 1
        }
      );
    const usersMDSOnlyCensusExpiried = await airtable_sync.find(
      { "# of Days Since MDS Only Census": { $eq: 366 } },
      {
        "# of Days Since MDS Only Census": 1,
        deviceToken: 1,
        migrate_user: 1
      }
    );
    if(usersMDSOnlyCensusExpiryNear)
    {
        let notificationTemplate =
        await notification_template.notify_user_for_mds_only_census_expiry_14();
      usersMDSOnlyCensusExpiryNear.forEach(async (member) => {
        if (member !== null) {
          if(!(member["migrate_user"] && member["migrate_user"].plan_id === "Staff"))
          {
            if (member.deviceToken.length !== 0 ) {
              console.log("notification going for 14 day", member._id)
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: process.env.ADMIN_ID,
                createdFor: member._id,
                role: "user",
              }).save();
    
              let data = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: member.deviceToken,
                collapse_key: member._id,
                badge_count: 0,
                sub_title: "",
                notification_data: {
                  type: "notify_user_for_mds_only_census_expiry_14",
                  content: [],
                },
              };
              send_notification(data);
            }
          }
         
        }
      });
    }
    if(usersMDSOnlyCensusExpiryTomorrow)
    {
        let notificationTemplate =
        await notification_template.notify_user_for_mds_only_census_expiry_1();
        usersMDSOnlyCensusExpiryTomorrow.forEach(async (member) => {
        if (member !== null) {
          if(!(member["migrate_user"] && member["migrate_user"].plan_id === "Staff"))
          {
            if (member.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: process.env.ADMIN_ID,
                createdFor: member._id,
                role: "user",
              }).save();
    
              let data = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: member.deviceToken,
                collapse_key: member._id,
                badge_count: 0,
                sub_title: "",
                notification_data: {
                  type: "notify_user_for_mds_only_census_expiry_1",
                  content: [],
                },
              };
              send_notification(data);
            }
          }
         
        }
      });
    }
    if(usersMDSOnlyCensusExpiried)
    {
        let notificationTemplate =
        await notification_template.notify_user_for_mds_only_census_expiried();
        usersMDSOnlyCensusExpiried.forEach(async (member) => {
        if (member !== null) {
          if(!(member["migrate_user"] && member["migrate_user"].plan_id === "Staff"))
          {
            if (member.deviceToken.length !== 0) {
              await new Notification({
                title: notificationTemplate?.template?.title,
                body: notificationTemplate?.template?.body,
                createdBy: process.env.ADMIN_ID,
                createdFor: member._id,
                role: "user",
              }).save();
    
              let data = {
                notification: notificationTemplate?.template?.title,
                description: notificationTemplate?.template?.body,
                device_token: member.deviceToken,
                collapse_key: member._id,
                badge_count: 0,
                sub_title: "",
                notification_data: {
                  type: "notify_user_for_mds_only_census_expiried",
                  content: [],
                },
              };
              send_notification(data);
            }
          }
        }
      });
    }
    return {
      status: true,
      message: "Notifications sent.",
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
};
