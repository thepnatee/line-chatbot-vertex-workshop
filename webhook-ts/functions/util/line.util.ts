import axios from "axios";
import crypto from "crypto";

/*
# Verify Signature
https://developers.line.biz/en/docs/messaging-api/receiving-messages/#verify-signature
https://medium.com/linedevth/7a94d9548f34

When your bot server receives a request, verify the request sender.
To make sure the request is from the LINE Platform, make your bot server verify the signature in the x-line-signature request header.
*/

export const verifySignature = (originalSignature: string, body: object): boolean => {
    const signature = crypto
        .createHmac("SHA256", process.env.LINE_MESSAGING_CHANNEL_SECRET as string)
        .update(JSON.stringify(body))
        .digest("base64");

    return signature === originalSignature;
};

/*
# Display a loading animation
https://developers.line.biz/en/reference/messaging-api/#send-broadcast-message
*/

export const isAnimationLoading = async (userId: string): Promise<any> => {
    try {
        const accessToken = process.env.LINE_MESSAGING_ACCESS_TOKEN as string;
        const url = `${process.env.LINE_MESSAGING_API}/chat/loading/start`;

        const response = await axios.post(
            url,
            {
                chatId: userId,
                loadingSeconds: 10, // Default is 20, Allowed: 5 to 60 (increments of 5)
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.status === 202) {
            return response.data;
        } else {
            throw new Error(`Failed to send animation loading. API responded with status: ${response.status}`);
        }
    } catch (error: any) {
        console.error("Error sending animation loading:", error.message);
        throw error;
    }
};

/*
# Get Profile Information from an ID Token
https://developers.line.biz/en/docs/line-login/verify-id-token/#get-profile-info-from-id-token
*/

export const getProfileByIDToken = async (idToken: string): Promise<any | false> => {
    try {
        const response = await axios.post(
            process.env.LINE_ENDPOINT_API_VERIFY as string,
            {
                id_token: idToken,
                client_id: process.env.LINE_LIFF_CHANNEL_ID as string,
            },
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        if (response.status !== 200) {
            throw new Error(`Failed to fetch user profile. API responded with status: ${response.status}`);
        }

        console.info(`[getProfileByIDToken]: User profile retrieved successfully.`, response.data);
        return response.data;
    } catch (error: any) {
        console.error("Error fetching user profile:", error.response ? error.response.data : error.message);
        return false;
    }
};

/*
# Reply to User with Long Live Token
https://developers.line.biz/en/reference/messaging-api/#send-reply-message
*/

export const reply = async (token: string, payload: any): Promise<any> => {
    try {
        const url = `${process.env.LINE_MESSAGING_API}/message/reply`;
        const response = await axios.post(
            url,
            {
                replyToken: token,
                messages: payload,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.LINE_MESSAGING_ACCESS_TOKEN as string}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Failed to send reply. API responded with status: ${response.status}`);
        }
    } catch (error: any) {
        console.error("Error sending reply:", error.message);
        throw error;
    }
};
