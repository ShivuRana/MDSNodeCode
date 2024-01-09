const PlanResource = require("../../database/models/plan_resource");
const MembershipPlan = require("../../database/models/membershipPlanManagement/membership_plan");
const Group = require("../../database/models/group");
const User = require("../../database/models/airTableSync");
const Payment = require("../../database/models/payment");
const moment = require("moment");
const config = require("config");
const stripe_sk = config.get("stripe");
const ObjectId = require("mongoose").Types.ObjectId;
const stripe = require("stripe")(stripe_sk.secret_key);

// create membership plan
exports.createMembershipPlan = async (req, res) => {
    try {
        const body = req.body;
        if (!body)
            return res.status(200).json({ status: false, message: "Please provie data." });
        var interval_count = body.recurring_timeframe === "quarter" ? 3 : 1;
        
        const validGroup = await Group.find({ _id: { $in: body.group_ids } });
        if (validGroup.length < 0)
            return res.status(200).json({ status: false, message: "Not a valid group" });

        const product = await stripe.products.create({
            name: body.plan_name,
            description: "Product|" + body.plan_description,
            active: body.plan_status === "Active" ? true : false,
        });

        const price = await stripe.prices.create({
            currency: "usd",
            unit_amount_decimal: body.plan_price * 100,
            recurring: { interval: body.recurring_timeframe, interval_count },
            product: product.id,
        });

        const updateProduct = await stripe.products.update(price.product, {
            default_price: price.id,
        });

        var resource_data = new PlanResource({ ...body });
        var save_resource = await resource_data.save();

        const planData = new MembershipPlan({
            ...body,
            plan_resource: save_resource._id,
            stripe_price_id: price.id,
            stripe_product_id: updateProduct.id,
        });

        if (!planData) {
            return res.status(200).json({ status: false, message: "Smothing went wrong while creating membership plan!!" });
        }

        const savedMemberShip = await planData.save();
        return res.status(200).json({ status: true, message: "Membership plan created successfully!", data: savedMemberShip, plan_save_inStripe: "update_product", });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// edit membership plan
exports.editMembershipPlan = async (req, res) => {
    try {
        const body = req.body;
        if (!body)
            return res.status(200).json({ status: false, message: "Please provie data." });

        const { planId } = req.params;
        var archivePlan = await MembershipPlan.findOne({
            _id: planId,
            isDelete: true,
        });
        if (archivePlan)
            return res.status(200).json({ status: false, message: "Membership plan is in archive and can not be edited.", });

        var getPlan = await MembershipPlan.findById(planId);
        if (!getPlan)
            return res.status(200).json({ status: false, message: "Membership plan not found !!" });

        var old_resource = await PlanResource.findById(getPlan.plan_resource);
        var errstatus = false;
        var temp = body?.group_ids.map(async (id) => {
            const grp = await Group.findById(id).select("groupTitle");
            if (!grp) errstatus = true;
        });
        await Promise.all([...temp]);
        if (errstatus)
            return res
                .status(200)
                .json({ status: false, message: `Group not found.` });
        
        const updated_resource = await PlanResource.findByIdAndUpdate(
            getPlan.plan_resource,
            { ...body },
            { new: true }
        );
        // update plan and products into stripe
        await stripe.products.update(
            getPlan.stripe_product_id,
            {
                name: body.plan_name ?? getPlan.plan_name,
                description: body.plan_description ?? getPlan.plan_description,
                active: body.plan_status ? body.plan_status === "Active" ? true : false : getPlan.plan_status === "Active" ? true : false,
            }
        );

        const updateData = await MembershipPlan.findOneAndUpdate(
            { _id: planId },
            {
                plan_name: body.plan_name || getPlan.plan_name,
                plan_price: body.plan_price ? body.plan_price : 0,
                plan_description: body.plan_description,
                plan_status: body.plan_status ?? getPlan.plan_status,
                auth0_plan_id: body.auth0_plan_id ?? getPlan.auth0_plan_id,
                isTeamMate: body.isTeamMate ? body.isTeamMate : getPlan.isTeamMate === undefined ? false : getPlan.isTeamMate,
                no_of_team_mate: body.no_of_team_mate ? body.no_of_team_mate : getPlan.no_of_team_mate === undefined ? "0" : getPlan.no_of_team_mate,
                accessResources: body.accessResources ? body.accessResources : getPlan.accessResources === undefined ? [] : getPlan.accessResources,
            },
            { runValidators: true, new: true }
        ).populate("plan_resource");

        //************************************************************************************************ */
        //**
        //*    here find all those users who has purchased this plan and update group ids from their assign groups field
        //**
        //************************************************************************************************ */
    
        var new_grp_id = body.group_ids.map((x) => x.toString());
        var old_grp_id = old_resource.group_ids.map((x) => x.toString());
        let remove_grp_id = old_grp_id.filter((x) => !new_grp_id.includes(x));
        let add_grp_id = new_grp_id.filter((x) => !old_grp_id.includes(x));

        if (
            getPlan.total_member_who_purchased_plan.length > 0 &&
            new_grp_id.join() != old_grp_id.join()
        ) {
            //console.log("test", new_grp_id, old_grp_id, remove_grp_id, add_grp_id);
            // return
            var temp1 = getPlan.total_member_who_purchased_plan.map(
                async (user_id) => {
                    var user_data = await User.findById(user_id).select(
                        "accessible_groups"
                    );
                    var arr1 = user_data.accessible_groups.map((x) => x.toString());

                    if (remove_grp_id.length > 0) {
                        var idsToDeleteSet = new Set(remove_grp_id);

                        var newArr = arr1.filter((id) => {
                            return !idsToDeleteSet.has(id);
                        });

                        await User.findByIdAndUpdate(
                            user_id,
                            { accessible_groups: newArr },
                            { new: true }
                        );
                    }
                    if (add_grp_id.length > 0) {
                        var final_group_ids = [...new Set([...arr1, ...add_grp_id])];
                        await User.findOneAndUpdate(
                            { _id: user_id },
                            { $set: { accessible_groups: final_group_ids } }
                        );
                    }
                }
            );
            await Promise.all([...temp1]);
        }


        return res.status(200).json({ status: true, message: "Membership plan updated succesfully.", data: updateData, });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// get all membership plan list
exports.getAllMembershipPlanList = async (req, res) => {
    try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skip = (page - 1) * limit;

        var match = {
            isDelete: false,
        };

        var search = "";
        if (req.query.search) {
            search = req.query.search;
            match = {
                ...match,
                plan_name: { $regex: ".*" + search + ".*", $options: "i" },
            };
        }

        const result = await MembershipPlan.find(match).sort({ updatedAt: -1 }).limit(limit).skip(skip).populate("plan_resource");
        const count = await MembershipPlan.countDocuments(match);

        if (result.length > 0 && count) {
            return res.status(200).json({
                status: true, message: `All membership plan retrive successfully.`,
                data: {
                    plans: result,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        } else {
            return res.status(200).json({
                status: true, message: `Membership plan list not found!`,
                data: {
                    plans: [],
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get all membership plan for drop down
exports.getAllPlanList = async (req, res) => {
    try {
        const result = await MembershipPlan.find({ isDelete: false }, { accessResources: 0, _id: 1, plan_name: 1, }).sort({ updatedAt: -1 }).populate("plan_resource");

        return res.status(200).json({ status: true, message: "Membership plan retrieve successfully.", data: result });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get all membership plan list
exports.getAllMembershipPlanListAtReg = async (req, res) => {
    try {
        const result = await MembershipPlan.find({ plan_status: "Active", isDelete: false, auth0_plan_id: { $eq: "" } }).sort({ updatedAt: -1 }).populate("plan_resource");
        return res.status(200).json({ status: true, message: "All membership plan.", data: result });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get one membership plan
exports.getMembershipPlan = async (req, res) => {
    try {
        const result = await MembershipPlan.findOne({
            _id: req.params.planId,
            isDelete: false,
        }).sort({ updatedAt: -1 }).populate("plan_resource");

        return res.status(200).json({ status: true, message: "Membership plan.", data: result });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// soft delete membership plan
exports.deleteMembershipPlan = async (req, res) => {
    try {
        const { planId } = req.params;
        var getPlan = await MembershipPlan.findById(planId);
        if (!getPlan)
            return res.status(200).json({ status: false, message: "Membership plan not found !!" });

        if (getPlan.total_member_who_purchased_plan.length > 0) {
            return res.status(200).json({ status: true, message: `"${getPlan.plan_name}" plan is purchased by many users so can't delete.`, });
        } else {
            const updateData = await MembershipPlan.findOneAndUpdate(
                { _id: planId },
                { $set: { isDelete: true, plan_status: "Deactive" } },
                { new: true, runValidators: true }
            );
            await stripe.products.update(getPlan.stripe_product_id, {
                active: false,
            });
            return res.status(200).json({ status: true, message: `"${getPlan.plan_name}" plan is deleted and move to stripe product archive.`, data: updateData, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get login user subscription plan details
exports.getloginUserSubscription_planDetails = async (req, res) => {
    try {
        const { authUserId } = req;
        const data = await User.findById(authUserId).select("purchased_plan payment_id").populate("payment_id", " card_number expire_date").lean();
        if (data?.purchased_plan) {
            const result = await MembershipPlan.findById(data.purchased_plan).select("-__v -total_member_who_purchased_plan").lean();
            const billing_info = await Payment.find({ user_id: authUserId }).select(" membership_plan_id createdAt").populate("membership_plan_id", "plan_price recurring_timeframe").lean();
            return res.status(200).json({
                status: true, message: `User purchased plan.`,
                data: {
                    ...result,
                    payment_info: data.payment_id,
                    billing_info: billing_info,
                },
            });
        } else {
            return res.status(200).json({ status: true, message: `User haven't purchase any plan yet.`, data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// cancel subscription
exports.cancelSubscription = async (req, res) => {
    try {
        const { authUserId } = req;
        //get subscription id from payment table for this user
        const user_data = await User.findById(authUserId);
        const payment_data = await Payment.findById(user_data.payment_id).select("-__v -createdAt -updatedAt").populate({ path: "membership_plan_id" });
        if (!payment_data) {
            return res.status(200).json({ status: false, message: "User donn't have active subscription", });
        }
        if (payment_data.cancel_subscription) {
            return res.status(200).json({ status: false, message: "User already cancel subscription." });
        }

        let cancel_subscriptions_instripe = await stripe.subscriptions.update(
            payment_data.subscriptionId,
            { cancel_at_period_end: true }
        );
        if (!cancel_subscriptions_instripe) {
            return res.status(200).json({ status: false, message: "Something wrong while cancel subscription.", });
        }

        const update_cancel_status = await Payment.findByIdAndUpdate(
            user_data.payment_id,
            { cancel_subscription: true },
            { new: true }
        );
        if (!update_cancel_status) {
            return res.status(200).json({ status: false, message: "Something wrong while updating cancel subscription status.", });
        }

        return res.status(200).json({ status: true, message: "Subscription canceled successfully." });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// webhook
exports.webhook = async (req, res) => {
    try {
        let data;
        let eventType;
        let event;
        const webhooksecret = process.env.STRIPE_WEBHOOKSECRET_KEY;
        if (webhooksecret) {
            let signature = req.headers["stripe-signature"];
            try {
                event = await stripe.webhooks.constructEvent(
                    req.body,
                    signature,
                    webhooksecret
                );
            } catch (err) {
                console.log(err.message);
                console.log(`Webhook signature verification failed.`);
                return res.status(200).json({ status: false, message: "Webhook signature verification failed", });
            }
            data = event.data;
            eventType = event.type;
        } else {
            data = req.body.data;
            eventType = req.body.type;
        }
        // Handle the event
        switch (eventType) {
            case "invoice.paid":
                let subscription_id = data.object.subscription;
                let payment_data = await Payment.find({
                    subscriptionId: subscription_id,
                }).populate("membership_plan_id", "recurring_timeframe").sort("updateAt");
                if (!payment_data)
                    return res.status(200).json({ status: false, message: "Not match subscription id with list of payments.", });
                if (payment_data[payment_data.length - 1].cancel_subscription) {
                    return res.status(200).json({ status: false, message: "This user has cancel subscription.", });
                } else {

                    var expire_date = new Date();
                    if (payment_data[payment_data.length - 1].membership_plan_id.recurring_timeframe === "day") {
                        expire_date = moment().add(1, "days");
                    } else if (payment_data[payment_data.length - 1].membership_plan_id.recurring_timeframe === "month") {
                        expire_date = moment().add(1, "months");
                    } else if (payment_data[payment_data.length - 1].membership_plan_id.recurring_timeframe === "year") {
                        expire_date = moment().add(1, "years");
                    }

                    const payment_entry = new Payment({
                        membership_plan_id:
                            payment_data[payment_data.length - 1].membership_plan_id._id,
                        user_id: payment_data[payment_data.length - 1].user_id,
                        name_on_card: payment_data[payment_data.length - 1].name_on_card,
                        country: payment_data[payment_data.length - 1].country,
                        postal_code: payment_data[payment_data.length - 1].postal_code,
                        subscriptionId: subscription_id.id,
                        paymentMethodId:
                            payment_data[payment_data.length - 1].paymentMethodId,
                        customerId: payment_data[payment_data.length - 1].customerId,
                        card_number: payment_data[payment_data.length - 1].card_number,
                        card_expiry_date:
                            payment_data[payment_data.length - 1].card_expiry_date,
                        card_brand: payment_data[payment_data.length - 1].card_brand,
                        invoice_payment_intent_status: "succeeded",
                        expire_date: expire_date,
                    });

                    if (!payment_entry)
                        return res.status(200).json({ status: false, message: "Something went wrong !!" });
                    const savedEntry = await payment_entry.save();

                    // const update_data = await Payment.findByIdAndUpdate(payment_data._id, { expire_date: expire_date }, { new: true })
                    if (!savedEntry)
                        return res.status(201).json({ status: false, message: "Something wrong while updating payment data.", });
                }
                break;
            default:
                console.log(`Unhandled event type ${eventType}`);
                break;
        }
        return res.status(200).json({ status: true, message: "Subscription expire date updated." });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// failed webhook
exports.payment_failed_webhook = async (req, res) => {
    try {
        let data;
        let eventType;
        let event;
        const webhooksecret = process.env.STRIPE_WEBHOOKSECRET_KEY;
        if (webhooksecret) {
            let signature = req.headers["stripe-signature"];
            try {
                event = await stripe.webhooks.constructEvent(
                    req.body,
                    signature,
                    webhooksecret
                );
            } catch (err) {
                console.log(err.message);
                console.log(`Webhook signature verification failed.`);
                return res.status(200).json({ status: false, message: "Webhook signature verification failed", });
            }
            data = event.data;
            eventType = event.type;
        } else {
            data = req.body.data;
            eventType = req.body.type;
        }
        // Handle the event
        switch (eventType) {
            case "invoice.payment.failed":
                let subscription_id = data.object.subscription;
                let payment_data = await Payment.find({
                    subscriptionId: subscription_id,
                }).populate("membership_plan_id", "recurring_timeframe").sort("updateAt");
                if (!payment_data) {
                    return res.status(200).json({ status: false, message: "Not match subscription id with list of payments.", });
                }
                if (payment_data[payment_data.length - 1].cancel_subscription) {
                    return res.status(200).json({ status: false, message: "This user has cancel subscription.", });
                } else {
                    const update_payment = await Payment.findByIdAndUpdate(
                        payment_data[payment_data.length - 1]._id,
                        { cancel_subscription: false }
                    );
                    const user_data = await User.findById(payment_data.user_id);
                    if (!update_payment) {
                        return res.status(200).json({ status: false, message: "Something went wrong !!" });
                    }
                }
                break;
            default:
                console.log(`Unhandled event type ${eventType}`);
                break;
        }
        return res.status(200).json({ status: true, message: "Subscription expire date updated." });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// subscription expiring webhook
exports.subscription_expiring_webhook = async (req, res) => {
    try {
        let data;
        let eventType;
        let event;
        const webhooksecret = process.env.STRIPE_WEBHOOKSECRET_KEY;
        if (webhooksecret) {
            let signature = req.headers["stripe-signature"];
            try {
                event = await stripe.webhooks.constructEvent(
                    req.body,
                    signature,
                    webhooksecret
                );
            } catch (err) {
                console.log(err.message);
                console.log(`Webhook signature verification failed.`);
                return res.status(200).json({ status: false, message: "Webhook signature verification failed", });
            }
            data = event.data;
            eventType = event.type;
        } else {
            data = req.body.data;
            eventType = req.body.type;
        }
        // Handle the event
        switch (eventType) {
            case "subscription_schedule.expiring":
                let subscription_id = data.object.subscription;
                let payment_data = await Payment.find({
                    subscriptionId: subscription_id,
                }).populate("membership_plan_id", "recurring_timeframe").sort("updateAt");
                if (!payment_data) {
                    return res.status(200).json({ status: false, message: "Not match subscription id with list of payments.", });
                }
                if (payment_data[payment_data.length - 1].cancel_subscription) {
                    return res.status(200).json({ status: false, message: "This user has cancel subscription.", });
                } else {
                    const update_payment = await Payment.findByIdAndUpdate(
                        payment_data[payment_data.length - 1]._id,
                        { cancel_subscription: false }
                    );

                    if (!update_payment) {
                        return res.status(201).json({ status: false, message: "Something wrong while updating payment data.", });
                    }
                }
                break;
            default:
                console.log(`Unhandled event type ${eventType}`);
                break;
        }
        return res.status(200).json({ status: true, message: "Subscription expire date updated." });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// upgrade the subscription
exports.upgradeSubscriptionPlan = async (req, res) => {
    try {
        let { plan_id } = req.body;
        const { authUserId } = req;

        const planData = await MembershipPlan.findById(plan_id);
        const userData = await User.findById(authUserId).select("payment_status accessible_groups").populate("payment_id").populate("purchased_plan");
        if (!userData.payment_status) {
            return res.status(200).json({ status: false, message: "User hasn't purchased any plan." });
        }

        const paymentMethod = await stripe.paymentMethods.retrieve(
            userData.payment_id.paymentMethodId
        );
        if (!paymentMethod) {
            return res.status(200).json({ status: false, message: "Payment method not found." });
        }

        const subscription = await stripe.subscriptions.retrieve(
            userData.payment_id.subscriptionId
        );
        if (!subscription) {
            return res.status(200).json({ status: false, message: "Subscription not found." });
        }

        const customer = await stripe.customers.update(subscription.customer, {
            invoice_settings: { default_payment_method: paymentMethod.id },
        });
        if (!customer) {
            return res.status(200).json({ status: false, message: "Customer not updated." });
        }

        let updatedSubscription = await stripe.subscriptions.update(
            userData.payment_id.subscriptionId,
            {
                cancel_at_period_end: false,
                proration_behavior: "create_prorations",
                items: [
                    {
                        id: subscription.items.data[0].id,
                        price: planData.stripe_price_id,
                    },
                ],
                default_payment_method: paymentMethod.id,
            }
        );
        if (!updatedSubscription)
            return res.status(200).json({ status: false, message: "Subscription not updated." });

        await MembershipPlan.findByIdAndUpdate(userData.purchased_plan._id, {
            $pull: { total_member_who_purchased_plan: authUserId },
        });
        await MembershipPlan.findByIdAndUpdate(plan_id, {
            $push: { total_member_who_purchased_plan: authUserId },
        });

        var old_payment_detail = await Payment.findById(userData.payment_id._id);
        var expire_date = new Date();
        if (planData.recurring_timeframe === "day") {
            expire_date = moment().add(1, "days");
        } else if (planData.recurring_timeframe === "month") {
            expire_date = moment().add(1, "months");
        } else if (planData.recurring_timeframe === "year") {
            expire_date = moment().add(1, "years");
        }

        const paymentEntry = new Payment({
            membership_plan_id: plan_id,
            user_id: authUserId,
            name_on_card: old_payment_detail.name_on_card,
            country: old_payment_detail.country,
            postal_code: old_payment_detail.postal_code,
            subscriptionId: updatedSubscription.id,
            paymentMethodId: old_payment_detail.paymentMethodId,
            customerId: old_payment_detail.customerId,
            card_number: old_payment_detail.card_number,
            card_expiry_date: old_payment_detail.card_expiry_date,
            card_brand: old_payment_detail.card_brand,
            invoice_payment_intent_status: "succeeded",
            expire_date: expire_date,
        });

        if (!paymentEntry) {
            return res.status(200).json({ status: false, message: "Something went wrong !!" });
        }
        const savedEntry = await paymentEntry.save();
        await User.findByIdAndUpdate(
            authUserId,
            {
                purchased_plan: plan_id,
                payment_id: savedEntry._id,
            },
            { new: true }
        );
        return res.status(200).json({ status: true, message: "User data.", data: userData });
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get user in app plan details
exports.getUserInAppPlanDetails = async (req, res) => {
    try {
        const { authUserId } = req;
        const data = await User.findById(authUserId).select("payment_id").populate("payment_id", " card_number expire_date").lean();
        if (data?.payment_id) {
            const billing_info = await Payment.findOne({ _id: data?.payment_id?._id, user_id: authUserId }).select("_id membership_plan_id user_id name_on_card subscriptionId paymentMethodId customerId invoice_payment_intent_status card_numbe card_expiry_date card_brand country postal_code expire_date cancel_subscription inAppProductId originalTransactionId autoRenewProductId originalStartDate startDate createdAt updatedAt").lean();
            return res.status(200).json({
                status: true, message: `User purchased plan.`,
                data: {
                    user_paymentId: data?.payment_id?._id,
                    payment_info: billing_info,
                },
            });
        } else {
            return res.status(200).json({ status: false, message: `User haven't purchase any plan yet.`, data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: error.message });
    }
};

// get user list from plan details
exports.getUserListFromPlanDetails = async (req, res) => {
    try {
        const planId = ObjectId(req.params.id);
        const data = await User.find({ purchased_plan: planId, isDelete: false }, {
            _id: 1,
            PreferredEmail: "$Preferred Email",
            auth0Id: 1,
            otherdetail: 1,
            attendeeDetail: {
                name: "$attendeeDetail.name" ? "$attendeeDetail.name" : "",
                firstName: "$attendeeDetail.firstName" ? "$attendeeDetail.firstName" : "",
                lastName: "$attendeeDetail.lastName" ? "$attendeeDetail.lastName" : "",
            },
            purchased_plan: 1,
        }).lean();
        if (data.length > 0) {
            return res.status(200).json({ status: true, message: `User list retrived succesfully.`, data: data, });
        } else {
            return res.status(401).json({ status: false, message: `User haven't purchase any plan yet.`, data: [], });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
