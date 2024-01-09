const airtable_sync = require("../../database/models/airTableSync");
const User = require("../../database/models/user");
const Event = require("../../database/models/event");

//merge user table users into airtable-syncs
exports.mergeUsers = async (req, res) => {
    try {
        const allUsers = await User.find({ isDelete: false });
        if (allUsers) {
            for (var index = 0; index < allUsers.length; index++) {
                const userExist = await airtable_sync.findOne({
                    "Preferred Email": allUsers[index].email,
                });
                if (userExist) {
                    const updatedUserDetail = await airtable_sync.findOneAndUpdate(
                        { "Preferred Email": allUsers[index].email },
                        {
                            email: allUsers[index].email ?? "",
                            secondary_email: allUsers[index].secondary_email ?? "",
                            facebookLinkedinId: allUsers[index].facebookLinkedinId ?? "",
                            otherdetail: allUsers[index].otherdetail ?? {},
                            auth0Id: allUsers[index].auth0Id ?? "",
                            profileImg: allUsers[index].profileImg ?? "",
                            thumb_profileImg: allUsers[index].thumb_profileImg ?? "",
                            profileCover: allUsers[index].profileCover ?? "",
                            active: allUsers[index].active ?? false,
                            blocked: allUsers[index].blocked ?? false,
                            verified: allUsers[index].verified ?? false,
                            following: allUsers[index].following ?? [],
                            followers: allUsers[index].followers ?? [],
                            savePosts: allUsers[index].savePosts ?? [],
                            saveVideos: allUsers[index].saveVideos ?? [],
                            token: allUsers[index].token ?? "",
                            provider: allUsers[index].provider ?? "auth0",
                            isSocial: allUsers[index].isSocial ?? false,
                            payment_id: allUsers[index].payment_id,
                            purchased_plan: allUsers[index].purchased_plan,
                            accessible_groups: allUsers[index].accessible_groups ?? [],
                            last_login: allUsers[index].last_login ?? "",
                            last_activity_log: allUsers[index].last_activity_log,
                            isDelete: allUsers[index].isDelete ?? false,
                            register_status: allUsers[index].register_status ?? false,
                            personalDetail_status:
                                allUsers[index].personalDetail_status ?? false,
                            payment_status: allUsers[index].payment_status ?? false,
                            QA_status: allUsers[index].QA_status ?? false,
                            user_role: allUsers[index].user_role,
                            forgot_ticket: allUsers[index].forgot_ticket,
                            blocked_chat: allUsers[index].blocked_chat ?? [],
                            blocked_by_who_chat: allUsers[index].blocked_by_who_chat ?? [],
                            clear_chat_data: allUsers[index].clear_chat_data ?? [],
                            deleted_group_of_user:
                                allUsers[index].deleted_group_of_user ?? [],
                            star_chat: allUsers[index].star_chat ?? [],
                            latitude: allUsers[index].latitude ?? "0",
                            longitude: allUsers[index].longitude ?? "0",
                            migrate_user_status: allUsers[index].migrate_user_status ?? false,
                            migrate_user: allUsers[index].migrate_user ?? {},
                            userEvents: allUsers[index].userEvents ?? {},
                            video_history_data: allUsers[index].video_history_data ?? [],
                            deactivate_account_request:
                                allUsers[index].deactivate_account_request ?? false,
                            deviceToken: allUsers[index].deviceToken ?? "",
                            createAt: allUsers[index].createAt ?? new Date(),
                        },
                        { new: true }
                    );
                } else {
                    const newUser = new airtable_sync({
                        "Preferred Email": allUsers[index].email ?? "",
                        email: allUsers[index].email ?? "",
                        secondary_email:
                            allUsers[index].secondary_email ?? allUsers[index].email,
                        facebookLinkedinId: allUsers[index].facebookLinkedinId ?? "",
                        otherdetail: allUsers[index].otherdetail ?? {},
                        auth0Id: allUsers[index].auth0Id ?? "",
                        profileImg: allUsers[index].profileImg ?? "",
                        thumb_profileImg: allUsers[index].thumb_profileImg ?? "",
                        profileCover: allUsers[index].profileCover ?? "",
                        active: allUsers[index].active ?? false,
                        blocked: allUsers[index].blocked ?? false,
                        verified: allUsers[index].verified ?? false,
                        following: allUsers[index].following ?? [],
                        followers: allUsers[index].followers ?? [],
                        savePosts: allUsers[index].savePosts ?? [],
                        saveVideos: allUsers[index].saveVideos ?? [],
                        token: allUsers[index].token ?? "",
                        provider: allUsers[index].provider ?? "auth0",
                        isSocial: allUsers[index].isSocial ?? false,
                        payment_id: allUsers[index].payment_id,
                        purchased_plan: allUsers[index].purchased_plan,
                        accessible_groups: allUsers[index].accessible_groups ?? [],
                        last_login: allUsers[index].last_login ?? "",
                        last_activity_log: allUsers[index].last_activity_log,
                        isDelete: allUsers[index].isDelete ?? false,
                        register_status: allUsers[index].register_status ?? false,
                        personalDetail_status:
                            allUsers[index].personalDetail_status ?? false,
                        payment_status: allUsers[index].payment_status ?? false,
                        QA_status: allUsers[index].QA_status ?? false,
                        user_role: allUsers[index].user_role,
                        forgot_ticket: allUsers[index].forgot_ticket,
                        blocked_chat: allUsers[index].blocked_chat ?? [],
                        blocked_by_who_chat: allUsers[index].blocked_by_who_chat ?? [],
                        clear_chat_data: allUsers[index].clear_chat_data ?? [],
                        deleted_group_of_user: allUsers[index].deleted_group_of_user ?? [],
                        star_chat: allUsers[index].star_chat ?? [],
                        latitude: allUsers[index].latitude ?? "0",
                        longitude: allUsers[index].longitude ?? "0",
                        migrate_user_status: allUsers[index].migrate_user_status ?? false,
                        migrate_user: allUsers[index].migrate_user ?? {},
                        userEvents: allUsers[index].userEvents ?? {},
                        video_history_data: allUsers[index].video_history_data ?? [],
                        deactivate_account_request:
                            allUsers[index].deactivate_account_request ?? false,
                        deviceToken: allUsers[index].deviceToken ?? "",
                        createAt: allUsers[index].createAt ?? new Date(),
                    });
                    const newUserEntry = await newUser.save();
                }
            }
        }
        const allSyncUsers = await airtable_sync.find({ isDelete: false, $ne: { auth0Id: "" } });

        if (allSyncUsers)
            return res.status(200).json({ status: true, data: allSyncUsers });
        else
            return res
                .status(200)
                .json({
                    status: false,
                    message: "Something went wrong while merging users!",
                });
    } catch (err) {
        return res
            .status(500)
            .json({
                status: false,
                message: `Internal server error! ${err.message}`,
            });
    }
};

//update registration detail of logged in user on dashboard
exports.updateRegistrationDetailOnDashboard = async (req, res) => {
    try {
        const userData = await airtable_sync.findById(req.authUserId, { isDelete: false }).lean();
        if (userData) {
            var otherDetailChange = {}
            if (userData.otherdetail)
                otherDetailChange = {
                    ...userData.otherdetail,
                    [process.env.USER_FN_ID]: userData["First Name"] ?? userData.otherdetail[process.env.USER_FN_ID],
                    [process.env.USER_LN_ID]: userData["Last Name"] ?? userData.otherdetail[process.env.USER_LN_ID],
                    [process.env.USER_EMAIL_ID]: userData["Preferred Email"] ?? userData.otherdetail[process.env.USER_EMAIL_ID],
                    [process.env.USER_PHONE_ID]: userData["Preferred Phone Number"] ?? userData.otherdetail[process.env.USER_PHONE_ID],
                }
            else
                otherDetailChange = {
                    [process.env.USER_FN_ID]: userData["First Name"],
                    [process.env.USER_LN_ID]: userData["Last Name"],
                    [process.env.USER_EMAIL_ID]: userData["Preferred Email"],
                    [process.env.USER_PHONE_ID]: userData["Preferred Phone Number"],
                }
            const updatedUserRecord = await airtable_sync.findByIdAndUpdate(req.authUserId, {
                email: userData["Preferred Email"],
                otherdetail: otherDetailChange
            }, { new: true })
            if (updatedUserRecord) {
                return res.status(200).json({ status: true, message: "User details updated successfully!", data: updatedUserRecord });
            } else {
                return res.status(200).json({ status: false, message: "Something went wrong while updating user detail!" });
            }
        } else {
            return res.status(200).json({ status: false, message: "Something went wrong while getting user data!" })
        }
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
};

//function to update all users registration detail with respective fields 
async function updateAllUsersRegistrationDetails() {
    try {
        const allActiveUsers = await airtable_sync.find({ isDelete: false, auth0Id: { $nin: ["", null] } }).lean();
        const allUsersUpdatedData = [];
        if (allActiveUsers) {
            for (let index = 0; index < allActiveUsers.length; index++) {
                if (userData.otherdetail)
                    otherDetailChange = {
                        ...userData.otherdetail,
                        [process.env.USER_FN_ID]: userData["First Name"] ?? userData.otherdetail[process.env.USER_FN_ID],
                        [process.env.USER_LN_ID]: userData["Last Name"] ?? userData.otherdetail[process.env.USER_LN_ID],
                        [process.env.USER_EMAIL_ID]: userData["Preferred Email"] ?? userData.otherdetail[process.env.USER_EMAIL_ID],
                        [process.env.USER_PHONE_ID]: userData["Preferred Phone Number"] ?? userData.otherdetail[process.env.USER_PHONE_ID],
                    }
                else
                    otherDetailChange = {
                        [process.env.USER_FN_ID]: userData["First Name"],
                        [process.env.USER_LN_ID]: userData["Last Name"],
                        [process.env.USER_EMAIL_ID]: userData["Preferred Email"],
                        [process.env.USER_PHONE_ID]: userData["Preferred Phone Number"],
                    }
                const updatedUserRecord = await airtable_sync.findByIdAndUpdate(allActiveUsers[index]._id, {
                    email: allActiveUsers[index]["Preferred Email"] ?? allActiveUsers[index].email,
                    otherdetail: otherDetailChange
                }, { new: true })
                allUsersUpdatedData.push(updatedUserRecord);
                if (index === allActiveUsers.length - 1) {
                    return { status: true, message: "Users registration details updated successfully!", data: allUsersUpdatedData }
                }
            }
        } else {
            return { status: false, message: "No user found!" }
        }
    } catch (e) {
        return { status: false, message: "Something went wrong!", error: e }
    }
};

exports.updateAllUsersRegistrationDetailsOnCron = () => {
    updateAllUsersRegistrationDetails();
};

//update all users registration detail with respective fields using api
exports.updateAllUsersRegistrationDetailsForAPI = async (req, res) => {
    try {
        const resultOfUpdatedUsers = await updateAllUsersRegistrationDetails()
        return res.status(200).json(resultOfUpdatedUsers);

    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
};

// update all users attendee details for event sync up fields
exports.airTableEventSyncUp = async () => {
    try {
        const allActiveUsers = await airtable_sync.find({ isDelete: false, auth0Id: { $nin: ["", null] } }, { _id: 1, otherdetail:1, auth0Id : 1, "Preferred Email" : 1 , "Events Attended": 1, attendeeDetail: 1 }).lean();
        const allEventList = await Event.find({ isDelete: false, airTableEventName: { $nin: ["", null] } }, { _id: 1, airTableEventName: 1 }).lean();
        const allUsersUpdatedData = [];
        if (allActiveUsers) {

            for (let index = 0; index < allActiveUsers.length; index++) {

                let activeUser = allActiveUsers[index]
                if (activeUser && activeUser["Events Attended"] && activeUser["Events Attended"] !== undefined && activeUser["Events Attended"].length > 0  && activeUser["Events Attended"] !== null && activeUser["Events Attended"] !== "") {

                        const attendetailExists = activeUser.attendeeDetail
                            && Object.keys(activeUser.attendeeDetail).length > 0 ? true : false

                        const eventDataExists = activeUser.attendeeDetail
                            && Object.keys(activeUser.attendeeDetail).length > 0 && activeUser.attendeeDetail.evntData ? true : false

                            var eventData = activeUser.attendeeDetail
                                && Object.keys(activeUser.attendeeDetail).length > 0
                                && activeUser.attendeeDetail.evntData ? activeUser.attendeeDetail.evntData : []

                            var eventAttended = activeUser["Events Attended"]
                            
                            let testAll = allEventList.map(async event => {
                                const eventMatch = eventAttended.filter(item => {
                                        let tmpItem = item.replaceAll('"',"").trim()
                                        return tmpItem === event.airTableEventName.trim()
                                        
                                })
                                
                                if (eventMatch.length > 0) {
                                    
                                    if (attendetailExists && eventDataExists) {

                                        let userAttendeeExists = eventData.filter(eventObject => eventObject.event.toString() === event._id.toString())
                                        if (userAttendeeExists.length === 0 ) 
                                        {
                                            const eventDetails = {
                                                event: event._id ,
                                                privateProfile: false,
                                                member: true,
                                                speaker: false,
                                                partner: false,
                                                guest: false,
                                                partnerOrder: 0
                                            }
                                           
                                            let memberEventDetails =  activeUser.attendeeDetail ;
                                            memberEventDetails.evntData.push(eventDetails)
                                            
                                            const upDateAttendeeData = await airtable_sync.findByIdAndUpdate(activeUser._id, {$set:{ attendeeDetail :  memberEventDetails} })
                                            return memberEventDetails
                                        }
                                     }else
                                     {
                                        if (attendetailExists && !eventDataExists)
                                        {
                                            const eventDetails = {
                                                event: event._id ,
                                                privateProfile: false,
                                                member: true,
                                                speaker: false,
                                                partner: false,
                                                guest: false,
                                                partnerOrder: 0
                                            }
                                            let memberEventDetails =  activeUser.attendeeDetail
                                            memberEventDetails.evntData = [eventDetails]
                                            
                                            const upDateAttendeeData = await airtable_sync.findByIdAndUpdate(activeUser._id, {$set : {attendeeDetail : memberEventDetails}} )

                                            return memberEventDetails

                                        }else
                                        {
                                            
                                            const eventDetails = {
                                                event: event._id ,
                                                privateProfile: false,
                                                member: true,
                                                speaker: false,
                                                partner: false,
                                                guest: false,
                                                partnerOrder: 0
                                            }
                                           
                                            let firstname = activeUser.otherdetail ? activeUser.otherdetail[process.env.USER_FN_ID] ? activeUser.otherdetail[process.env.USER_FN_ID] : "" : ""
                                            let lastname = activeUser.otherdetail ? activeUser.otherdetail[process.env.USER_LN_ID] ? activeUser.otherdetail[process.env.USER_LN_ID] : "" : ""
                                            let fullname = firstname + lastname
                                           
                                            const upDateAttendeeData = await airtable_sync.findByIdAndUpdate(activeUser._id, { $set : {  attendeeDetail: 
                                                { email: activeUser["Preferred Email"], name: fullname  , firstName: firstname, lastName: lastname, auth0Id: activeUser.auth0Id, evntData: eventDetails
                                                }
                                            }
                                            } )

                                           return eventDetails

                                        }
                                     }
                                }

                            });
                       
                            await Promise.all([...testAll]);
                    //}
                }
            }
            return { status: true, message: "Attendees details updated." }
         } else {
            return { status: false, message: "No user found!" }
        }
    } catch (e) {
        return { status: false, message: "Something went wrong!" }
    }
}