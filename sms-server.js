
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

// Initialize Twilio Client if keys are present
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('[SERVER] Twilio Client Initialized');
} else {
    console.log('[SERVER] Twilio keys not found. Using Textbelt fallback.');
}

if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[SERVER] WARNING: TWILIO_PHONE_NUMBER is missing. Twilio will be skipped.');
} else if (process.env.TWILIO_PHONE_NUMBER.startsWith('+91')) {
    console.warn('[SERVER] CRITICAL CONFIG WARNING:');
    console.warn('The TWILIO_PHONE_NUMBER starts with +91 (India).');
    console.warn('This is likely YOUR personal number. You cannot send FROM your own number.');
    console.warn('Please search "My Twilio Phone Number" in your Twilio Console (it usually starts with +1).');
    console.warn('Update your .env file with that number and restart the server.');
}

// DATABASE SETUP REMOVED - Using Firebase Firestore Direct Client Access
// This server now strictly handles 3rd party API secrets (Twilio/Textbelt)

// SMS ROUTES (Keep Existing)

// SMS ROUTES (Keep Existing)
app.post('/send-otp', async (req, res) => {
    const { mobile, otp } = req.body;
    console.log(`[SERVER] Request to send OTP ${otp} to ${mobile}`);

    if (!mobile || !otp) {
        return res.status(400).json({ success: false, error: 'Missing mobile or otp' });
    }

    // Format OTP for India/International
    let formattedNumber = mobile.replace(/\s+/g, '');
    if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+91' + formattedNumber; // Default to India
    }

    try {
        // STRATEGY 1: TWILIO (Premium/Reliable)
        if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {

            // Validation: Prevent sending FROM an Indian number (common user error)
            if (process.env.TWILIO_PHONE_NUMBER.startsWith('+91')) {
                const msg = 'CONFIG ERROR: You put your personal mobile as the Twilio Sender ID. You must use the "Twilio Phone Number" (US number) from your dashboard.';
                console.error(`[SERVER] ${msg}`);
                return res.json({ success: false, error: msg, provider: 'config_error', fallback: true });
            }

            try {
                console.log(`[SERVER] Sending via Twilio to ${formattedNumber}...`);
                const message = await twilioClient.messages.create({
                    body: `Your HealthSmart Verification Code is: ${otp}`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: formattedNumber
                });
                console.log(`[SERVER] Twilio Success: ${message.sid}`);
                return res.json({ success: true, provider: 'twilio', sid: message.sid });
            } catch (twilioError) {
                console.error('[SERVER] Twilio Failed:', twilioError.message);
                // CRITICAL: Return the actual Twilio error (e.g., Unverified Number) so the user knows what to fix.
                return res.json({ success: false, error: `Twilio Error: ${twilioError.message}`, provider: 'twilio' });
            }
        }

        // STRATEGY 2: TEXTBELT (Fallback only if Twilio is NOT configured)
        console.log('[SERVER] Twilio not configured. Attempting Textbelt...');
        const response = await fetch('https://textbelt.com/text', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: formattedNumber,
                message: `HealthSmart Code: ${otp}`,
                key: process.env.TEXTBELT_KEY || 'textbelt',
            }),
        });

        const data = await response.json();
        console.log('[SERVER] Textbelt Response:', data);

        if (data.success) {
            return res.json({ success: true, provider: 'textbelt' });
        } else {
            console.warn('[SERVER] Textbelt failed.');
            return res.json({ success: false, error: data.error || 'Textbelt Failed', fallback: true });
        }

    } catch (error) {
        console.error('[SERVER] SMS Error:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`SMS Server running on http://localhost:${PORT}`);
});
