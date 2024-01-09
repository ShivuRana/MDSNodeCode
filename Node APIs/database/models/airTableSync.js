const mongoose = require("mongoose");
const validator = require("validator");

const config = require("config");
const user_role = config.get("user");

const fieldSchema = mongoose.Schema(
  {
    title: { type: String, },
    photo: { type: String, },
    name: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    email: { type: String, lowercase: true, default: "" },
    company: { type: String, default: "" },
    profession: { type: String, default: "" },
    phone: { type: String, default: "" },
    facebook: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    auth0Id: { type: String, default: "" },
    description: { type: String, default: "" },
    offer: { type: String, default: "" },
    contactPartnerName: { type: String, default: "" },
    evntData: [{
      event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
      privateProfile: { type: Boolean, default: false },
      member: { type: Boolean, default: false },
      speaker: { type: Boolean, default: false },
      partner: { type: Boolean, default: false },
      guest: { type: Boolean, default: false },
      partnerOrder: { type: Number, default: 0 },
    }],
  },
  { _id: false }
);

const airTableSyncSchema = new mongoose.Schema(
  {
    "# Number of Documents Submitted": {
      "$numberInt": {
        type: Date
      }
    },
    "# Number of In Person Events Attended": {
      "$numberInt": {
        type: Date
      }
    },
    "# Number of In Virtual": {
      "$numberInt": {
        type: String
      }
    },
    "# Number of MoM/MVP Posts": {
      "$numberInt": {
        type: Date
      }
    },
    "# Number of Roles in MDS": {
      "$numberInt": {
        type: Date
      }
    },
    "# Number of Virtual Calls Hosted": {
      "$numberInt": {
        type: Date
      }
    },
    "# of Chapter Events - Past 365 days": {
      "$numberInt": {
        type: Date
      }
    },
    "# of Chapter Events - Softr": {
      "$numberInt": {
        type: Date
      }
    },
    "# of Days Ago Last Virtual Call Attended": {
      "$numberInt": {
        type: Date
      }
    },
    "# of Days Since MDS Only Census": {
      "$numberInt": {
        type: Date
      }
    },
    "# of Days Since Standard Census": {
      "$numberInt": {
        type: Date
      }
    },
    "# of Months for Member": {
      "$numberInt": {
        type: Date
      }
    },
    "# of Products": {
      type: [
        mongoose.Mixed
      ]
    },
    "# of Quarters for Member": {
      "$numberInt": {
        type: String
      }
    },
    "# of Recent Document Requests": {
      "$numberInt": {
        type: Date
      }
    },
    "# of Years for Member": {
      "$numberInt": {
        type: Date
      }
    },
    "#Loss": {
      type: [
        mongoose.Mixed
      ]
    },
    "#ValueAdd - OLD": {
      type: Boolean
    },
    "#ValueAdd-New": {
      type: String
    },
    "#Wins": {
      type: [
        mongoose.Mixed
      ]
    },
    "%  in Other Asia Manufacture": {
      type: [
        String
      ]
    },
    "% in Canada Manufacture": {
      type: [
        String
      ]
    },
    "% in China Manufacture": {
      type: [
        String
      ]
    },
    "% in Europe Manufacture": {
      type: [
        String
      ]
    },
    "% in India Manufacture": {
      type: [
        String
      ]
    },
    "% in Other Manufacture": {
      type: [
        String
      ]
    },
    "% in USA Manufacture": {
      type: [
        String
      ]
    },
    "2020 Revenue Increase": {
      type: mongoose.Mixed
    },
    "2021 Revenue Increase": {
      type: mongoose.Mixed
    },
    "2019 Revenue per Census": {
      type: mongoose.Mixed
    },
    "2020 Revenue per Census": {
      "$numberDouble": {
        type: String
      }
    },
    "2021 Revenue per Census": {
      type: mongoose.Mixed
    },
    "> 20% Rev Off Amazon - per census/application": {
      type: [
        String
      ]
    },
    "AT Database Status": {
      type: String
    },
    "AT Database Status (Member or Not)": {
      type: String
    },
    "About Me": {
      type: String
    },
    "About Me - Character Count - OLD": {
      "$numberInt": {
        type: Date
      }
    },
    "Access": {
      type: [
        String
      ]
    },
    "Access (Code)": {
      type: Date
    },
    "Access - Date last changed": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Access Count": {
      "$numberInt": {
        type: Date
      }
    },
    "Actual Bday Alert": {
      type: mongoose.Mixed
    },
    "Actual Birthday v2": {
      type: Date
    },
    "Actual Birthday v2 copy": {
      type: Date
    },
    "Actual Event Attendance - Virtual": {
      type: [
        String
      ]
    },
    "Add to List": {
      type: Boolean
    },
    "Added to FB chat": {
      type: Boolean
    },
    "Added to WA group": {
      type: Boolean
    },
    "Address Last Updated": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Address Status": {
      type: String
    },
    "Address Status copy": {
      type: String
    },
    "Address-Old": {
      type: mongoose.Mixed
    },
    "Admin Sync": {
      type: String
    },
    "Advisory Council Check": {
      type: mongoose.Mixed
    },
    "Age": {
      "$numberInt": {
        type: Date
      }
    },
    "Aliases": {
      type: [
        String
      ]
    },
    "All Events Registered": {
      type: "Array"
    },
    "All Time revenue increase": {
      type: mongoose.Mixed
    },
    "Amazon Advertising Manager": {
      type: mongoose.Mixed
    },
    "Amazon Canada & % of Revenue": {
      type: [
        String
      ]
    },
    "Amazon EU & % of Revenue": {
      type: [
        String
      ]
    },
    "Amazon US & % of Revenue": {
      type: [
        String
      ]
    },
    "Amount to Invoice": {
      type: mongoose.Mixed
    },
    "Annual Census Groups": {
      type: mongoose.Mixed
    },
    "Annual Investment $ Expectations": {
      "$numberInt": {
        type: Date
      }
    },
    "Annual Payment": {
      "$numberInt": {
        type: Date
      }
    },
    "Annual Reminder Date": {
      type: Date
    },
    "Annual Revenue Tier": {
      type: String
    },
    "Annual Revenue Tier - Numerical": {
      "$numberInt": {
        type: String
      }
    },
    "App Access": {
      type: mongoose.Mixed
    },
    "App Verification Support Form": {
      type: String
    },
    "Application Date": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Archive Submissions": {
      type: mongoose.Mixed
    },
    "Area of Expertise": {
      type: mongoose.Mixed
    },
    "Arts/ Crafts/ Toys & Games": {
      type: mongoose.Mixed
    },
    "Ask Post - OLD": {
      type: String
    },
    "Ask Post Check - OLD": {
      type: Boolean
    },
    "Attachment": {
      type: mongoose.Mixed
    },
    "Attended Virtual Call": {
      type: String
    },
    "Attended Virtual Call Last 90 Days": {
      type: String
    },
    "Attended WC - OLD": {
      type: String
    },
    "Attended Welcome Call - OLD": {
      type: Boolean
    },
    "Attended call in last 30 days": {
      type: "Array"
    },
    "Attended call in last 90 days": {
      type: "Array"
    },
    "Auth0 User ID": {
      type: mongoose.Mixed
    },
    "Automotive": {
      type: mongoose.Mixed
    },
    "Average/2021 Growth": {
      "$numberInt": {
        type: Date
      }
    },
    "Baby": {
      type: mongoose.Mixed
    },
    "Be on Podcast - OLD": {
      type: Boolean
    },
    "Best Value Add - Past Events": {
      "$numberInt": {
        type: Date
      }
    },
    "Birthdate": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Birthday": {
      "$numberInt": {
        type: Date
      }
    },
    "Birthday Merch Sent": {
      type: Boolean
    },
    "Birthday Status": {
      type: String
    },
    "Bookkeeper": {
      type: mongoose.Mixed
    },
    "Bought a business": {
      type: [
        mongoose.Mixed
      ]
    },
    "Brains Reviews": {
      type: [
        String
      ]
    },
    "Brains Submissions": {
      type: mongoose.Mixed
    },
    "Brand Management and/or Agency": {
      type: mongoose.Mixed
    },
    "Brand(s) URL / Name(s)": {
      type: mongoose.Mixed
    },
    "Buddy": {
      type: mongoose.Mixed
    },
    "Building Team": {
      type: mongoose.Mixed
    },
    "Business Model": {
      type: [
        String
      ]
    },
    "Business Model NEW": {
      type: mongoose.Mixed
    },
    "Business Model Values": {
      type: String
    },
    "Business Partners With": {
      type: mongoose.Mixed
    },
    "Calculation": {
      "$numberInt": {
        type: Date
      }
    },
    "Categories": {
      type: [
        String
      ]
    },
    "Category": {
      type: [
        String
      ]
    },
    "Category NEW": {
      type: [
        String
      ]
    },
    "Category Values": {
      type: String
    },
    "Chapter Affiliation": {
      type: [
        String
      ]
    },
    "Chapter Affiliation Status": {
      type: String
    },
    "Chapter Content Score": {
      type: mongoose.Mixed
    },
    "Chapter Dues": {
      "$numberInt": {
        type: Date
      }
    },
    "Chapter Events": {
      type: "Array"
    },
    "Chapter Events in last 12 months Status": {
      type: String
    },
    "Chapter Events within last 12 mnths": {
      type: "Array"
    },
    "Chapter Lead Check": {
      type: mongoose.Mixed
    },
    "Chapter NPS Value": {
      type: mongoose.Mixed
    },
    "Chapter Notes": {
      type: "Array"
    },
    "Chapters Fee": {
      type: mongoose.Mixed
    },
    "Checked-In": {
      type: Boolean
    },
    "City": {
      type: String
    },
    "Clothing & Accessories": {
      type: [
        String
      ]
    },
    "Coffee Date Set - OLD": {
      type: Boolean
    },
    "Coffee/Lunch Status": {
      type: String
    },
    "Commission Log Revenue": {
      "$numberInt": {
        type: Date
      }
    },
    "Communication Preferences": {
      type: [
        String
      ]
    },
    "Community Content Site Feedback": {
      type: String
    },
    "Community Site Migration": {
      type: Boolean
    },
    "Community Site Migration Email": {
      type: Boolean
    },
    "Community Site Password Migration": {
      type: String
    },
    "Consumer Electronics": {
      type: mongoose.Mixed
    },
    "Contact Checkpoint": {
      type: Boolean
    },
    "Containers Imported": {
      type: [
        mongoose.Mixed
      ]
    },
    "Council": {
      type: Boolean
    },
    "Country": {
      type: String
    },
    "Creative Director": {
      type: mongoose.Mixed
    },
    "Customer Service": {
      type: mongoose.Mixed
    },
    "Date Added (from Document Submissions)": {
      type: mongoose.Mixed
    },
    "Date Chapter Affiliation Last Changed": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Date Entered Pending Entrance": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Date Record Created": {
      type: Date
    },
    "Date Slack Channels Last Changed": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Date submitted - MDSonly Census": {
      type: mongoose.Mixed
    },
    "Date submitted - Standard Census": {
      type: [
        String
      ]
    },
    "Day": {
      "specialValue": {
        type: String
      }
    },
    "Day (Stripe)": {
      "specialValue": {
        type: String
      }
    },
    "Days Since FB Join": {
      "$numberInt": {
        type: Date
      }
    },
    "Days Since Payment": {
      "$numberInt": {
        type: Date
      }
    },
    "Days Waited to Join FB": {
      "specialValue": {
        type: String
      }
    },
    "Desired Investments": {
      type: [
        String
      ]
    },
    "Director of Marketing": {
      type: mongoose.Mixed
    },
    "Director of Operations": {
      type: mongoose.Mixed
    },
    "Do you still have any e-commerce revenue from new brands?": {
      type: mongoose.Mixed
    },
    "Document Submissions": {
      type: mongoose.Mixed
    },
    "Done": {
      type: Boolean
    },
    "EOS Business": {
      type: [
        String
      ]
    },
    "Email Profile First Name": {
      type: String
    },
    "Email Routing": {
      type: mongoose.Mixed
    },
    "Emails-OLD": {
      type: String
    },
    "Engagement + Virtual MMYY": {
      type: String
    },
    "Engagement IDs": {
      type: [
        String
      ]
    },
    "Engagement MMYY": {
      type: [
        String
      ]
    },
    "Engagement Points": {
      type: mongoose.Mixed
    },
    "Event Access": {
      type: [
        String
      ]
    },
    "Event Agenda (MDS days)": {
      type: mongoose.Mixed
    },
    "Event Expenses": {
      type: mongoose.Mixed
    },
    "Event Revenue - All Time": {
      "$numberInt": {
        type: Date
      }
    },
    "Event Revenue - Last 12 Months": {
      "$numberInt": {
        type: Date
      }
    },
    "Event Roster": {
      type: mongoose.Mixed
    },
    "Events": {
      type: mongoose.Mixed
    },
    "Events Attended": {
      type: Array
    },
    "Events Hosted": {
      type: mongoose.Mixed
    },
    "Events copy": {
      type: mongoose.Mixed
    },
    "FB Groups": {
      type: [
        String
      ]
    },
    "FB Join Date": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "FB Subgroup Status Count": {
      "$numberInt": {
        type: Date
      }
    },
    "Facebook Event Registration": {
      type: [
        String
      ]
    },
    "Facebook Join Date - Scraped": {
      type: [
        String
      ]
    },
    "Facebook Photo": {
      type: mongoose.Mixed
    },
    "Facebook Posts Link": {
      type: [
        String
      ]
    },
    "Facebook Profile Link": {
      type: Date
    },
    "Facilitate Amazon Advertising": {
      type: [
        String
      ]
    },
    "Facilitate Facebook/Instagram": {
      type: [
        String
      ]
    },
    "Facilitate Google/Youtube Ads - per census": {
      type: [
        String
      ]
    },
    "Facilitate Other Ad Platforms (Tiktok, Pinterest, etc)": {
      type: [
        String
      ]
    },
    "Facilitate PR/Influencers": {
      type: [
        String
      ]
    },
    "Facilitate Podcast/Other Radio": {
      type: [
        String
      ]
    },
    "Facilitate SMS/Email Marketing": {
      type: [
        String
      ]
    },
    "Facilitate TV": {
      type: [
        String
      ]
    },
    "Favorite Tool / Service Provider - per census": {
      type: [
        String
      ]
    },
    "Fetch Auth0 User ID timestamp": {
      type: mongoose.Mixed
    },
    "Filter": {
      type: mongoose.Mixed
    },
    "First Event Attended Date": {
      type: Date
    },
    "First Event Registration": {
      type: Date
    },
    "First Name": {
      type: String
    },
    "Follow up email sent": {
      type: Boolean
    },
    "Food/ Beverage/ and other Consumables (Non-Supplement)": {
      type: mongoose.Mixed
    },
    "Forms": {
      type: mongoose.Mixed
    },
    "Forms 2": {
      type: mongoose.Mixed
    },
    "Forms 3": {
      type: mongoose.Mixed
    },
    "Franky MDS Calendar": {
      type: mongoose.Mixed
    },
    "Fulfillment By Amazon Warehouse": {
      type: [
        String
      ]
    },
    "Full Name": {
      type: String
    },
    "Full Time Employees": {
      type: mongoose.Mixed
    },
    "Full Time Staff": {
      type: [
        mongoose.Mixed
      ]
    },
    "Gender": {
      type: String
    },
    "Geocode cache": {
      type: String
    },
    "Give Post - OLD": {
      type: String
    },
    "Give Post Check - OLD": {
      type: Boolean
    },
    "Goals": {
      type: mongoose.Mixed
    },
    "Goals - per census/application": {
      type: [
        String
      ]
    },
    "Graphic Designer": {
      type: mongoose.Mixed
    },
    "Growth % per Census": {
      type: [
        mongoose.Mixed
      ]
    },
    "Gsuite Email": {
      type: [
        String
      ]
    },
    "Gsuite Email - Last Submitted Date": {
      type: Date
    },
    "Gsuite Email - Last Submitted Email": {
      type: [
        String
      ]
    },
    "Gsuite Emails": {
      type: [
        String
      ]
    },
    "Handle Bookkeeping": {
      type: [
        String
      ]
    },
    "Handle Customer Service": {
      type: [
        String
      ]
    },
    "Handle Graphic Design - per census": {
      type: [
        String
      ]
    },
    "Handle Marketplace Listing Creation": {
      type: [
        String
      ]
    },
    "Handle New Product Launches": {
      type: [
        String
      ]
    },
    "Handle Photography": {
      type: [
        String
      ]
    },
    "Handle Product Development": {
      type: [
        String
      ]
    },
    "Handle Web Design/Software": {
      type: [
        String
      ]
    },
    "Health/ Beauty/ & Supplements (Consumables)": {
      type: mongoose.Mixed
    },
    "Highest Level of Education - per census": {
      type: [
        String
      ]
    },
    "Highest Revenue Increase": {
      type: mongoose.Mixed
    },
    "Hobbies": {
      type: [
        String
      ]
    },
    "Hobbies Status": {
      type: String
    },
    "Host Virtual Call - OLD": {
      type: Boolean
    },
    "Hosted Virtual Event Call": {
      type: String
    },
    "Housewares/ Office/ & Pet Products (Non-Consumable)": {
      type: [
        String
      ]
    },
    "How Do You Source Products": {
      type: mongoose.Mixed
    },
    "How many brands do you currently have?": {
      type: [
        String
      ]
    },
    "Human Resources Manager": {
      type: mongoose.Mixed
    },
    "ID (from Podcast -Member only )": {
      "$numberInt": {
        type: Date
      }
    },
    "In-House Warehouse": {
      type: mongoose.Mixed
    },
    "Inspire Code": {
      type: String
    },
    "Inspire Code Url": {
      type: String
    },
    "Interacting on FB Chat - OLD": {
      type: Boolean
    },
    "Intercom User ID": {
      type: "ObjectId"
    },
    "Intercomm Sync": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Intercomm Sync Check": {
      type: Boolean
    },
    "Intro-Post": {
      type: Boolean
    },
    "Investments Committed to": {
      type: mongoose.Mixed
    },
    "Investments Expressed Interest in": {
      type: [
        String
      ]
    },
    "Invoice Trigger": {
      "label": {
        type: String
      },
      "url": {
        type: String
      }
    },
    "Invoices - Account Balance": {
      "$numberInt": {
        type: Date
      }
    },
    "Knowledge bases": {
      type: [
        String
      ]
    },
    "Last Active Date": {
      type: mongoose.Mixed
    },
    "Last Engagement": {
      type: mongoose.Mixed
    },
    "Last Event Registration": {
      type: Date
    },
    "Last In Person Event Attended Date": {
      type: mongoose.Mixed
    },
    "Last Modified Time": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Last Modified Time community site": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Last Name": {
      type: String
    },
    "Last Non Active - Count of Notice": {
      type: mongoose.Mixed
    },
    "Last Non Active - Discussion": {
      type: mongoose.Mixed
    },
    "Last Non Active - Ignored Date": {
      type: mongoose.Mixed
    },
    "Last Virtual Call Attended": {
      type: Date
    },
    "Latest Perk Request": {
      type: mongoose.Mixed
    },
    "Lead Comments": {
      type: mongoose.Mixed
    },
    "Level": {
      type: Date
    },
    "Link to Attachments": {
      type: String
    },
    "Link to Chapters": {
      type: [
        String
      ]
    },
    "Link to Member Actions": {
      type: [
        String
      ]
    },
    "Link to Member Leads": {
      type: mongoose.Mixed
    },
    "MAP": {
      type: mongoose.Mixed
    },
    "MDS All Star Check": {
      type: mongoose.Mixed
    },
    "MDS Inspire Las Vegas Access": {
      type: mongoose.Mixed
    },
    "MDS Inspire, Las Vegas Rollup": {
      type: "Array"
    },
    "MDS Takeover Miami": {
      type: mongoose.Mixed
    },
    "MDS Takeover Miami Rollup": {
      type: "Array"
    },
    "MDSONLY Legal & Census - Date": {
      type: Date
    },
    "Main Niche": {
      type: mongoose.Mixed
    },
    "Marketplace Manager": {
      type: mongoose.Mixed
    },
    "Meetup Lookup": {
      type: mongoose.Mixed
    },
    "Member Actions": {
      type: mongoose.Mixed
    },
    "Member Actions 2": {
      type: mongoose.Mixed
    },
    "Member Activity Status": {
      type: mongoose.Mixed
    },
    "Member Approved Date": {
      type: mongoose.Mixed
    },
    "Member Declined Date ": {
      type: mongoose.Mixed
    },
    "Member Event Cost - Last 12 Months": {
      "$numberInt": {
        type: Date
      }
    },
    "Member Forms": {
      type: [
        String
      ]
    },
    "Member Join Date - For Dashboard": {
      type: Date
    },
    "Member Join Month - For Dashboard": {
      type: Date
    },
    "Member LTV (Membership + Event Revenue)": {
      "$numberDouble": {
        type: String
      }
    },
    "Member Paid Date - For Dashboard": {
      type: Date
    },
    "Member Paid Date - For Dashboard (Month Only)": {
      type: Date
    },
    "Member Paid Date - For Dashboard (Year Only)": {
      type: String
    },
    "Member Removed Date": {
      type: mongoose.Mixed
    },
    "Member Score": {
      type: [
        mongoose.Mixed
      ]
    },
    "Member Score - OLD": {
      "$numberDouble": {
        type: String
      }
    },
    "Member Score Card 60 Day Check": {
      "$numberInt": {
        type: Date
      }
    },
    "Member Year 1 Profit": {
      "$numberDouble": {
        type: Date
      }
    },
    "Members": {
      type: mongoose.Mixed
    },
    "Members with Current Census Score": {
      "$numberInt": {
        type: Date
      }
    },
    "Membership Fee": {
      "$numberInt": {
        type: Date
      }
    },
    "Membership Fee - For Dashboard": {
      "$numberInt": {
        type: Date
      }
    },
    "Membership Fee - For Dashboard - Monthly": {
      "$numberDouble": {
        type: String
      }
    },
    "Membership Fee-Old": {
      "$numberInt": {
        type: Date
      }
    },
    "Migration Email Last Modified Time": {
      type: mongoose.Mixed
    },
    "Million Dollar Squads": {
      type: [
        String
      ]
    },
    "Month": {
      "specialValue": {
        type: String
      }
    },
    "Month (stripe)": {
      "specialValue": {
        type: String
      }
    },
    "Month of New Member - For Groups": {
      type: mongoose.Mixed
    },
    "Monthly KPI Summary": {
      type: [
        String
      ]
    },
    "Most Recent MDSonly Census": {
      type: [
        String
      ]
    },
    "Most Recent Revenue": {
      type: [
        mongoose.Mixed
      ]
    },
    "Most Recent Revenue Source/Date": {
      type: mongoose.Mixed
    },
    "Most Recent Standard Census": {
      type: [
        String
      ]
    },
    "Multiple #Valueadds - OLD": {
      type: Boolean
    },
    "Multiple Value Adds - OLD": {
      type: String
    },
    "Net Annual Member Profit": {
      "$numberInt": {
        type: Date
      }
    },
    "New Product Launches": {
      type: [
        mongoose.Mixed
      ]
    },
    "New Product Launches in the last 12 months": {
      type: mongoose.Mixed
    },
    "New Renewal Date": {
      type: Date
    },
    "New Renewal Date (Stripe)": {
      type: Date
    },
    "Next Renewal Payment Due Date": {
      type: Date
    },
    "Niche Status": {
      type: String
    },
    "Niche-WA": {
      type: [
        String
      ]
    },
    "Notes": {
      type: mongoose.Mixed
    },
    "Notes - Softr": {
      type: mongoose.Mixed
    },
    "Notes for Invoice": {
      type: mongoose.Mixed
    },
    "Notes on Renewal ": {
      type: mongoose.Mixed
    },
    "OEM Design & Development": {
      type: mongoose.Mixed
    },
    "Onboarding Call - OLD": {
      type: Boolean
    },
    "One Year Ago from Today": {
      type: Date
    },
    "Order Date": {
      type: Date
    },
    "Orders Shipped in last 12 months": {
      type: mongoose.Mixed
    },
    "Other Amazon Marketplaces & % of Revenue": {
      type: [
        String
      ]
    },
    "Other Places Selling - per census/application": {
      type: [
        String
      ]
    },
    "Oversized Tools/ Home Improvement/ & other Patio/Outdoor": {
      type: mongoose.Mixed
    },
    "Own Website & % of Revenue": {
      type: [
        String
      ]
    },
    "Paid Media Buyer": {
      type: mongoose.Mixed
    },
    "Parsed auth 0 User ID": {
      type: mongoose.Mixed
    },
    "Part Time Employees": {
      type: mongoose.Mixed
    },
    "Part Time Staff (from Member Forms)": {
      type: [
        mongoose.Mixed
      ]
    },
    "Partner Leads & Research copy": {
      type: mongoose.Mixed
    },
    "Partner Records": {
      type: mongoose.Mixed
    },
    "Partner Records copy": {
      type: mongoose.Mixed
    },
    "Payment Cycle": {
      type: String
    },
    "Payment Date": {
      type: mongoose.Mixed
    },
    "Payment Frequency": {
      type: String
    },
    "Payment made for 2021": {
      type: Boolean
    },
    "Perks": {
      type: mongoose.Mixed
    },
    "Perks Used in last 12 mths": {
      type: String
    },
    "Photo": {
      type: mongoose.Mixed
    },
    "Picture URL": {
      type: [
        String
      ]
    },
    "Podcast -Member only ": {
      type: mongoose.Mixed
    },
    "Podcast Status": {
      type: String
    },
    "Position with MDS": {
      type: "Array"
    },
    "Possible Exit / Sell - per census": {
      type: [
        mongoose.Mixed
      ]
    },
    "Preferred Email": {
      type: String
    },
    "Preferred Phone Number": {
      type: String
    },
    "Private Label": {
      type: [
        String
      ]
    },
    "Profile First Name": {
      type: String
    },
    "Profile Image Status": {
      type: String
    },
    "Profile Name": {
      type: String
    },
    "Profile Photo": {
      type: mongoose.Mixed
    },
    "Profile picture Url": {
      type: mongoose.Mixed
    },
    "Projected FTM Revenue": {
      type: [
        mongoose.Mixed
      ]
    },
    "Projected FTM Revenue copy": {
      type: [
        mongoose.Mixed
      ]
    },
    "Prosper Referral Email": {
      type: Boolean
    },
    "Referral fee": {
      "$numberDouble": {
        type: String
      }
    },
    "Referral fee paid": {
      type: Boolean
    },
    "Referred By": {
      type: mongoose.Mixed
    },
    "Referred By Grouping": {
      type: mongoose.Mixed
    },
    "Referred by Member": {
      type: [
        String
      ]
    },
    "Referred by Partner": {
      type: mongoose.Mixed
    },
    "Referred by from call notes": {
      type: mongoose.Mixed
    },
    "Referred by-Old": {
      type: mongoose.Mixed
    },
    "Registered for In Person Event within 12 months": {
      type: String
    },
    "Registered for In Person Event within 12 months copy": {
      type: String
    },
    "Registered for MULTIPLE Chapter Event within 12 months": {
      type: String
    },
    "Registered for MULTIPLE In Person Event within 18 months": {
      type: String
    },
    "Registered for MULTIPLE Virtual Events within 12 months": {
      type: String
    },
    "Registered for MULTIPLE Virtual Events within 12 months copy": {
      type: String
    },
    "Removal Reason": {
      type: mongoose.Mixed
    },
    "Removed Member Score": {
      type: mongoose.Mixed
    },
    "Renewal Date Accurate ": {
      type: Boolean
    },
    "Renewal Pending": {
      type: mongoose.Mixed
    },
    "Responsibilities in Company - per census/application": {
      type: [
        String
      ]
    },
    "Retrieve Auth0 User ID": {
      type: Boolean
    },
    "Revenue Screenshot - Lookup": {
      type: mongoose.Mixed
    },
    "Revenue Screenshot - Manual": {
      type: mongoose.Mixed
    },
    "Revenue Screenshot Confirmation #- Lookup": {
      type: mongoose.Mixed
    },
    "Revenue Screenshot Confirmation #- Manual": {
      type: mongoose.Mixed
    },
    "Revenue Tier - Per Census": {
      type: String
    },
    "Revenue Tier Status": {
      type: String
    },
    "Riverbend ASIN Appeal Requests In Past 90 Days": {
      "$numberInt": {
        type: Date
      }
    },
    "Riverbend Perk Feedback Count": {
      "$numberInt": {
        type: Date
      }
    },
    "Riverbend Perk Requests": {
      "$numberInt": {
        type: Date
      }
    },
    "Role in MDS": {
      type: String
    },
    "SKU Count - per census/application": {
      type: [
        mongoose.Mixed
      ]
    },
    "Score Bar": {
      type: [
        String
      ]
    },
    "Score Card at time of removal": {
      type: mongoose.Mixed
    },
    "Sell Brand?": {
      type: [
        String
      ]
    },
    "Service Provider Big Impact": {
      type: [
        String
      ]
    },
    "Slack Channels": {
      type: [
        String
      ]
    },
    "Slack Channels Values": {
      type: String
    },
    "Slack Channels- Beta Request Form": {
      type: [
        String
      ]
    },
    "Slack Chat Beta Request": {
      type: [
        String
      ]
    },
    "Slack Email for Invite - Calculated": {
      type: [
        mongoose.Mixed
      ]
    },
    "Slack Invite Email": {
      type: mongoose.Mixed
    },
    "Slack Invite Email - Beta Request Form": {
      type: [
        mongoose.Mixed
      ]
    },
    "Slack Status": {
      type: mongoose.Mixed
    },
    "Slack User ID": {
      type: String
    },
    "Social Media Manager": {
      type: mongoose.Mixed
    },
    "Sold a business": {
      type: [
        mongoose.Mixed
      ]
    },
    "Sports/ Outdoors/ and other Health (Non-Consumable)": {
      type: mongoose.Mixed
    },
    "Squads Status": {
      type: String
    },
    "Staff Notes": {
      type: mongoose.Mixed
    },
    "Staff located": {
      type: [
        String
      ]
    },
    "Standard Legal & Census - Date": {
      type: Date
    },
    "Started Selling": {
      type: mongoose.Mixed
    },
    "State": {
      type: String
    },
    "Status Changed": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "Street Address": {
      type: String
    },
    "Submission ID": {
      type: Date
    },
    "Submitted Document to Vault": {
      type: String
    },
    "Submitted Document to Vault copy": {
      type: String
    },
    "Subscription Cycle - M#": {
      type: Date
    },
    "Subscription Cycle - MN": {
      type: String
    },
    "Subscription Cycle - Summary": {
      type: Date
    },
    "Supply Chain Manager": {
      type: mongoose.Mixed
    },
    "Syn to Main DB": {
      type: [
        String
      ]
    },
    "TTM Revenue/Employee": {
      "$numberInt": {
        type: String
      }
    },
    "Temp": {
      type: Boolean
    },
    "Temp 2": {
      type: Boolean
    },
    "Third Party Logistics": {
      type: [
        String
      ]
    },
    "Total Employee Count": {
      "$numberInt": {
        type: Date
      }
    },
    "Total Points": {
      type: mongoose.Mixed
    },
    "Total TTM Revenue": {
      type: [
        mongoose.Mixed
      ]
    },
    "Unit #": {
      type: mongoose.Mixed
    },
    "Update Last Modified Time": {
      type: mongoose.Mixed
    },
    "VAs/Offshore Employees": {
      type: [
        mongoose.Mixed
      ]
    },
    "Value Adds - All Past Events": {
      type: mongoose.Mixed
    },
    "Verification URL": {
      type: String
    },
    "Verified Account": {
      type: Boolean
    },
    "Video Archives": {
      type: mongoose.Mixed
    },
    "Virtual Event Database": {
      type: mongoose.Mixed
    },
    "Virtual Event Database 2": {
      type: mongoose.Mixed
    },
    "Virtual Event MMYY": {
      type: [
        String
      ]
    },
    "WA Access Value": {
      type: String
    },
    "WA Chapter Value": {
      type: String
    },
    "WA Contact Creation Date": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "WA Invoices": {
      type: [
        String
      ]
    },
    "WA Last Login Date": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "WA Level Changed": {
      type: Date
    },
    "WA Member Since Date": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "WA Membership Level ID": {
      "$numberInt": {
        type: String
      }
    },
    "WA Profile Last Updated Date": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "WA Renewal Date": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "WA Renewal Date Last Changed": {
      "$date": {
        "$numberLong": {
          type: String
        }
      }
    },
    "WA User ID": {
      "$numberInt": {
        type: String
      }
    },
    "WA Values Formula": {
      type: String
    },
    "Walmart": {
      "com & % of Revenue": {
        type: [
          String
        ]
      }
    },
    "Warehouse": {
      type: [
        String
      ]
    },
    "Warehouse NEW": {
      type: mongoose.Mixed
    },
    "Warehouse Values": {
      type: String
    },
    "Wayfair/Overstock/Target & % of Revenue": {
      type: [
        String
      ]
    },
    "Website Event Registration - In Person": {
      type: [
        String
      ]
    },
    "Website Profile Complete - Current Member - OLD": {
      type: String
    },
    "Website Profile Complete - New Member - OLD": {
      type: String
    },
    "Website Profile Complete - OLD": {
      type: Boolean
    },
    "Website Troubleshooting Feedback URL": {
      type: String
    },
    "What is your Instagram handle?": {
      type: mongoose.Mixed
    },
    "What is your favorite beverage? ": {
      type: String
    },
    "What is your favorite candy?": {
      type: String
    },
    "What is your favorite food? ": {
      type: String
    },
    "What is your favorite place to travel to? ": {
      type: String
    },
    "What is your favorite snack?": {
      type: String
    },
    "What is your lifelong goal?": {
      type: String
    },
    "What is your shirt size? ": {
      type: String
    },
    "What is your shoe size? ": {
      type: String
    },
    "When did you sell your brand?": {
      type: mongoose.Mixed
    },
    "Wholesale (Big Box/Large Client) & % of Revenue - per census": {
      type: [
        String
      ]
    },
    "Wholesale (Independent/Mom & Pop) & % of Revenue": {
      type: [
        String
      ]
    },
    "Wholesale and/or Arbitrage": {
      type: mongoose.Mixed
    },
    "Why they joined": {
      type: mongoose.Mixed
    },
    "Work experience prior to Amazon": {
      type: [
        String
      ]
    },
    "Worked Best For You": {
      type: mongoose.Mixed
    },
    "Year": {
      "$numberInt": {
        type: Date
      }
    },
    "Year (Stripe)": {
      "$numberInt": {
        type: Date
      }
    },
    "Year Joined": {
      type: Date
    },
    "Zip": {
      type: Date
    },
    "autonumber": {
      "$numberInt": {
        type: Date
      }
    },
    "lasvegas": {
      type: mongoose.Mixed
    },
    "look": {
      "$numberInt": {
        type: Date
      }
    },
    "miami": {
      type: mongoose.Mixed
    },
    "zRaw WA Level Changed": {
      type: Date
    },
    email: { type: String },
    passcode: { type: String, default: "" },
    secondary_email: {
      type: String,
      lowercase: true,
      validate: async (value) => {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email address");
        }
      },
    },
    facebookLinkedinId: { type: String, default: "" },
    otherdetail: { type: Object, default: {} },
    auth0Id: { type: String, default: "" },
    socialauth0id: { type: String, default: "" },
    profileImg: { type: String, default: "" },
    thumb_profileImg: { type: String, default: "" },
    profileCover: { type: String, default: "" },
    active: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    savePosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post", default: [] }],
    saveVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "contentArchive_video", default: [] }],
    token: { type: String, default: "" },
    provider: { type: String, default: "auth0", default: "auth0", enum: ["auth0", "facebook", "linkedin", "apple"] },
    isSocial: { type: Boolean, default: false },
    payment_id: { type: mongoose.Schema.Types.ObjectId, ref: "payment" },
    purchased_plan: { type: mongoose.Schema.Types.ObjectId, ref: "membership_plan" },
    accessible_groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "group", default: [] }],
    last_login: { type: Date, default: "" },
    last_activity_log: { type: Date, default: Date.now() },
    isDelete: { type: Boolean, default: false },
    register_status: { type: Boolean, default: false },
    personalDetail_status: { type: Boolean, default: false },
    payment_status: { type: Boolean, default: false },
    QA_status: { type: Boolean, default: false },
    user_role: { type: mongoose.Schema.Types.ObjectId, ref: "userrole", default: user_role.role_id },
    forgot_ticket: { type: String, default: "" },
    blocked_chat: [{ type: mongoose.Schema.Types.ObjectId, default: [] }],
    blocked_by_who_chat: [{ type: mongoose.Schema.Types.ObjectId, default: [], }],
    clear_chat_data: [{
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
      deleteConversation: { type: Boolean, default: false },
      type: { type: String, default: "" },
      date: { type: Date, default: Date.now }
    }],
    deleted_group_of_user: [{ type: mongoose.Schema.Types.ObjectId, default: [], }],
    star_chat: [{ type: mongoose.Schema.Types.ObjectId, default: [] }],
    latitude: { type: String, default: "0" },
    longitude: { type: String, default: "0" },
    migrate_user_status: { type: Boolean, default: false },
    migrate_user: { type: Object, default: {} },
    userEvents: { type: Object, default: {} },
    video_history_data: [{
      video_id: { type: mongoose.Schema.Types.ObjectId, required: true },
      history_date: { type: Date, default: "" },
    }],
    muteNotification: {
      type: Array
    },
    deactivate_account_request: { type: Boolean, default: false },
    deviceToken: { type: [{ type: String }], default: [] },
    attendeeDetail: {
      type: fieldSchema,
    },
    notificationFor: [{
      id: { type: mongoose.Schema.Types.ObjectId, },
      type: { type: String, default: "" },
      setBy: { type: String, default: "" },
    }],
    speakerIcon: { type: String, default: "" },
    guestIcon: { type: String, default: "" },
    partnerIcon: { type: String, default: "" },
    "Upcoming Events": { type: Array, default: [] },
    "Upcoming Events Registered": { type: Array, default: [] },
    isCollaborator: { type: Boolean, default: false, },
  },
  { timestamps: true }
);

module.exports = mongoose.model("airtable-syncs", airTableSyncSchema);
