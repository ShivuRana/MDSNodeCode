const axios = require("axios");
const admin = require("firebase-admin");
const serviceAccount = require("../mds-community-app-firebase-adminsdk-g4ad3-798110c124.json");

// send notification from the backend using
exports.send_notification = async (
  data = {
    notification,
    description,
    icon,
    device_token,
    collapse_key,
    badge_count,
    sub_title,
    notification_data,
  }
) => {
  try {
    // Define the FCM server key and the list of device tokens
    const serverKey =
      "AAAAnE2h5m0:APA91bFK2flZ0ZZSUX2jojsBrdg7b7YwKgAaLDtUcmowTj6GutDlIvMpAEk3KAsuHLgcbAtMKe9nuznK55kcpRo0ftAFqRGpFAUPVe3DT2Xsg0hHcJdCniW-uMac2cTQFal4xNaGlsWN";
    const deviceTokens = data.device_token;
    const profileImageURL = data.icon;
    const collapse = data.collapse_key;
    const badge = data.badge_count;

    // Define the push notification payload
    const payload = {
      registration_ids: deviceTokens,
      notification: {
        title: data.notification,
        body: data.description,
        mutable_content: true,
        content_available: true,
        collapse_key: collapse,
        badge: badge,
        subtitle: data.sub_title,
        tag: collapse,
        "apns-collapse-id": collapse,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: data.notification_data.type,
        content: data.notification_data.content,
      },
    };

    // Set the headers for the API request
    const headers = {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    };

    // Send the push notification
    axios
      .post("https://fcm.googleapis.com/fcm/send", payload, { headers })
      .then((response) => {
        console.log("Push notification sent successfully:", response.data);
        if (response.status == 200) {
          return true;
        } else {
          return false;
        }
      })
      .catch((error) => {
        console.error("Error sending push notification:", error);
        return false;
      });
  } catch (error) {
    console.log(error);
    return {
      status: false,
      message: `Internal Server Error: ${error.message}`,
    };
  }
};

// templete of notification
exports.notification_template = {
  send_one_on_one_msg: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `${data.message}`,
      },
    };
  },
  send_one_on_one_msg_replay: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Replied: ${data.message}`,
      },
    };
  },
  send_one_on_one_media: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Sent a 📷 media.`,
      },
    };
  },
  send_one_on_one_file: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Sent an 📄 attachment.`,
      },
    };
  },
  send_msg_into_group: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `${data.message}`,
      },
    };
  },
  send_msg_into_group_replay: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Replied: ${data.message}`,
      },
    };
  },
  send_media_into_group: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Sent a 📷 media.`,
      },
    };
  },
  send_file_into_group: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Sent an 📄 attachment.`,
      },
    };
  },
  add_member_group: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `You are added in "${data.recipentName}" group`,
      },
    };
  },
  user_event_reminder: async (data) => {
    return {
      template: {
        title: `Reminder`,
        body: `Your event "${data.eventName}" is starting in 15 minutes.`,
      },
    };
  },
  user_session_reminder: async (data) => {
    return {
      template: {
        title: `Reminder`,
        body: `"${data.sessionName}" is starting in 15 minutes.`,
      },
    };
  },
  user_activity_reminder: async (data) => {
    return {
      template: {
        title: `Reminder`,
        body: `"${data.activityName}" is starting in 15 minutes.`,
      },
    };
  },
  admin_session_reminder: async (data) => {
    return {
      template: {
        title: `Reminder`,
        body: `"${data.sessionName}" is starting in ${data.scheduleNotifyTime}`,
      },
    };
  },
  admin_activity_reminder: async (data) => {
    return {
      template: {
        title: `Reminder`,
        body: `"${data.activityName}" is starting in ${data.scheduleNotifyTime}`,
      },
    };
  },
  user_mention_member_group: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `mentioned you in group "${data.recipentName}"`,
      },
    };
  },
  user_mention_member_channel: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `mentioned you in channel "${data.recipentName}"`,
      },
    };
  },
  send_msg_into_channel: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `${data.message}`,
      },
    };
  },
  send_msg_into_channel_replay: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Replied: ${data.message}`,
      },
    };
  },
  send_media_into_channel: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Sent a 📷 media.`,
      },
    };
  },
  send_file_into_channel: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Sent an 📄 attachment.`,
      },
    };
  },
  add_member_channel: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `You are added in "${data.recipentName}" channel`,
      },
    };
  },
  notify_user_for_update: async (data) => {
    return {
      template: {
        title: `${data.eventName}`,
        body: `${data.notifyMsg}`,
      },
    };
  },
  notify_user_for_mds_only_census_expiry_14: async () => {
    return {
      template: {
        title: `#MDSOnly access expires soon!`,
        body: `Update now.`,
      },
    };
  },
  notify_user_for_mds_only_census_expiry_1: async () => {
    return {
      template: {
        title: `#MDSOnly access expires Tomorrow!`,
        body: `Update now.`,
      },
    };
  },
  send_msg_to_reacted_user: async (data) => {
    return {
      template: {
        title: `${data.senderName}`,
        body: `Reacted ${data.emojiId} to ${data.message}`,
      },
    };
  },
};

// code for schedule firebase notification
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

exports.addTime = async (date, hour, minutes) => {
  return new Date(date.getTime() + (hour * 60000 * 60 + minutes * 60000));
};

exports.subtractTime = async (date, hour, minutes) => {
  return new Date(date.getTime() - (hour * 60000 * 60 + minutes * 60000));
};

exports.firebaseAdmin = async (payload) => {
  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    tokens: payload.tokens,
    data: payload.data || {},
  };
  return admin.messaging().sendMulticast(message);
};
