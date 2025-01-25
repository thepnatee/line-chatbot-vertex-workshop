const axios = require("axios");

/*
#Display a loading animation
https://developers.line.biz/en/reference/messaging-api/#send-broadcast-message
*/
exports.isAnimationLoading = async (userId) => {
    try {

        const accessToken = await issueStatelessAccessToken();

        const url = `${process.env.LINE_MESSAGING_API}/chat/loading/start`;
        const response = await axios.post(url, {
            "chatId": `${userId}`,
            "loadingSeconds": 10 // The default value is 20.
            // Number of seconds to display a loading animation. You can specify a any one of 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, or 60.
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 202) {
            return response.data;
        } else {
            throw new Error(`Failed to send Animation loading. API responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error sending Animation loading:', error.message);
        throw error;
    }
};


/*Reply Long Live Token*/
exports.reply = async (token, payload) => {
    const url = `${process.env.LINE_MESSAGING_API}/message/reply`;
    const response = await axios.post(url, {
        replyToken: token,
        messages: payload
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.LINE_MESSAGING_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 200) {
        return response.data;
    } else {
        throw new Error(`Failed to send reply. API responded with status: ${response.status}`);
    }
};
