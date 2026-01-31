export const sendOTP = async (mobileNumber: string, otp: string): Promise<boolean> => {
    console.log(`%c[SMS UTILITY] Initiating SMS to ${mobileNumber}...`, 'color: #3B82F6; font-weight: bold;');

    try {
        // Call our local Backend Server (which handles the Textbelt API call)
        // This avoids CORS issues completely.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch('http://localhost:3005/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: mobileNumber, otp }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.success) {
            console.log(`%c[SMS UTILITY] SMS Sent Successfully!`, 'color: #10B981; font-weight: bold;');
            return true;
        } else {
            console.warn(`[SMS UTILITY] Server reported delivery status:`, data.error);
            console.error(`[SMS UTILITY] SMS Verification Failed: ${data.error}`);

            // If the real SMS failed (quota exceeded usually), we fallback
            console.log(`%c[SMS FALBACK] Use this code: ${otp}`, 'color: #F59E0B; font-weight: bold; font-size: 18px; padding: 4px; border: 2px dashed #F59E0B;');
            return true;
        }

    } catch (error) {
        console.error('[SMS UTILITY] Backend Server unavailable. Is "node sms-server.js" running?', error);

        // Fallback if server is down
        console.log(`%c[SMS FALLBACK] Use this code: ${otp}`, 'color: #F59E0B; font-weight: bold; font-size: 18px; padding: 4px; border: 2px dashed #F59E0B;');
        return true;
    }
};
