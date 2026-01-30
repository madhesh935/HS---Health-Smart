import 'dotenv/config';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
    console.error("Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in .env file");
    process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log("Checking for Twilio numbers...");

try {
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });
    if (incomingPhoneNumbers.length > 0) {
        console.log("SUCCESS! Found these numbers:");
        incomingPhoneNumbers.forEach(n => console.log(`NUMBER: ${n.phoneNumber}`));
    } else {
        console.log("NO_NUMBERS_FOUND: You have not 'Bought' a number yet (it is free on trial).");
    }
} catch (error) {
    console.error("ERROR_CONNECTING:", error.message);
}
