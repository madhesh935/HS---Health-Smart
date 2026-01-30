
import 'dotenv/config'; // Load env vars
import fs from 'fs';
import twilio from 'twilio';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Credentials from your .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
    console.error("Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in .env file");
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function setup() {
    console.log("🔍 Checking for existing Twilio numbers...");

    try {
        // 1. Check if we already have a number
        const existing = await client.incomingPhoneNumbers.list({ limit: 1 });
        let myNumber = '';

        if (existing.length > 0) {
            myNumber = existing[0].phoneNumber;
            console.log(`✅ Found existing number: ${myNumber}`);
        } else {
            console.log("⚠️ No numbers found. Purchasing a new 'Free' Trial Number...");

            // 2. Search for a US number (cheapest/standard for trial)
            const available = await client.availablePhoneNumbers('US').local.list({ limit: 1 });
            if (!available || available.length === 0) {
                console.error("❌ No available numbers found to buy!");
                return;
            }
            const numberToBuy = available[0].phoneNumber;
            console.log(`🛒 Purchasing ${numberToBuy}...`);

            // 3. Buy it
            const purchased = await client.incomingPhoneNumbers.create({
                phoneNumber: numberToBuy
            });
            myNumber = purchased.phoneNumber;
            console.log(`🎉 SUCCESS! Purchased: ${myNumber}`);
        }

        // 4. Update .env file
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Regex to replace the TWILIO_PHONE_NUMBER line
        const regex = /^TWILIO_PHONE_NUMBER=.*$/m;
        const newLine = `TWILIO_PHONE_NUMBER=${myNumber}`;

        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, newLine);
        } else {
            envContent += `\n${newLine}`;
        }

        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Updated .env file with ${myNumber}`);
        console.log("🚀 You are ready to send SMS!");

    } catch (error) {
        console.error("\n❌ ERROR:", error.message);
        console.log("------------------------------------------");
        console.log("Detailed Error:", error);
    }
}

setup();
