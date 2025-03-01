import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import * as line from "../util/line.util.js";
import * as context from "../context/context.js";
import * as mongo from "../util/mongo.util.js";
import * as gemini from "../util/gemini.util.js";

// **Firebase Cloud Function Global Options**
setGlobalOptions({
    region: "asia-northeast1",
    memory: "1GiB",
    concurrency: 40
});

// Create Data Source and Eembeddings
export const createVector = onRequest({ cors: true, invoker: "public" }, async (request: Request, response: Response): Promise<void> => {
    await mongo.insertVector(context.discDetail());
    response.end();
    return
});

// Webhook
export const receive = onRequest({ invoker: "public" }, async (request: Request, response: Response): Promise<void> => {
    if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
    }

    if (!line.verifySignature(request.headers["x-line-signature"] as string, request.body)) {
        response.status(401).send("Unauthorized");
        return
    }

    const events: any[] = request.body.events;

    for (const event of events) {

        console.log(event.type);

        if (event.type === "join") {

            await mongo.insertGroupWithUsers(event.source.groupId);
            await line.reply(event.replyToken, [{
                "type": "text",
                "text": "สวัสดีทุกค๊นน มารวมกันทำแบบสอบถามกันเถอะ \r\n หากต้องการเริ่มทำแบบสอบถามใหม่ \n เพียง tag ชื่อ @disc ได้เลย ",
                "quickReply": {
                    "items": [{
                        "type": "action",
                        "action": {
                            "type": "uri",
                            "label": "เริ่มทำแบบทดสอบ",
                            "uri": process.env.LINE_LIFF_DISC + "?groupId=" + event.source.groupId
                        }
                    },
                    {
                        "type": "action",
                        "action": {
                            "type": "message",
                            "label": "Type",
                            "text": "Type"
                        }
                    }
                    ]
                }
            }])
            response.end();
            return
        }
        if (event.type === "memberJoined") {

            for (let member of event.joined.members) {
                if (member.type === "user") {

                    await mongo.insertUserIdWithGroup(member.userId, event.source.groupId);

                    await line.reply(event.replyToken, [{
                        "type": "textV2",
                        "text": "สวัสดีคุณ {user1}! ยินดีต้อนรับ \n ทุกคน {everyone} มีเพื่อนใหม่เข้ามาอย่าลืมทักทายกันนะ!",
                        "quickReply": {
                            "items": [{
                                "type": "action",
                                "action": {
                                    "type": "uri",
                                    "label": "เริ่มทำแบบทดสอบ",
                                    "uri": process.env.LINE_LIFF_DISC + "?groupId=" + event.source.groupId
                                }
                            },
                            {
                                "type": "action",
                                "action": {
                                    "type": "message",
                                    "label": "Type",
                                    "text": "Type"
                                }
                            }
                            ]
                        },
                        "substitution": {
                            "user1": {
                                "type": "mention",
                                "mentionee": {
                                    "type": "user",
                                    "userId": member.userId
                                }
                            },
                            "everyone": {
                                "type": "mention",
                                "mentionee": {
                                    "type": "all"
                                }
                            }
                        }
                    }])
                }
            }

        }

        if (event.type === "message" && event.message.type === "text") {

            if (event.source.type === "group") {

                if (event.message.text === "ฉันได้ประเมินเรียบร้อยแล้ว" || event.message.text === "Type") {

                    // ค้นหาข้อมูลของ userId ที่ส่งมา
                    const userData = await mongo.getAnswersByUserId(event.source.userId, event.source.groupId);
                    console.log(userData);
                    if (userData) {
                        await line.reply(event.replyToken, [{
                            "type": "textV2",
                            "text": `คุณ {user1} คุณอยู่ในกลุ่ม ${userData.model} \r\n\r\n รายละเอียด ${userData.description}`,
                            "quoteToken": event.message.quoteToken,
                            "quickReply": {
                                "items": [{
                                    "type": "action",
                                    "action": {
                                        "type": "uri",
                                        "label": "ทำแบบทดสอบ",
                                        "uri": process.env.LINE_LIFF_DISC + "?groupId=" + event.source.groupId
                                    }
                                },
                                {
                                    "type": "action",
                                    "action": {
                                        "type": "message",
                                        "label": "Type",
                                        "text": "Type"
                                    }
                                }
                                ]
                            },
                            "substitution": {
                                "user1": {
                                    "type": "mention",
                                    "mentionee": {
                                        "type": "user",
                                        "userId": event.source.userId
                                    }
                                }
                            }
                        }]);
                    } else {
                        await line.reply(event.replyToken, [{
                            "type": "textV2",
                            "text": "สวัสดีครับ {user1} เรามาเริ่มทำแบบทดสอบกันดีกว่า",
                            "quoteToken": event.message.quoteToken,
                            "quickReply": {
                                "items": [{
                                    "type": "action",
                                    "action": {
                                        "type": "uri",
                                        "label": "เริ่มทำแบบทดสอบ",
                                        "uri": process.env.LINE_LIFF_DISC + "?groupId=" + event.source.groupId
                                    }
                                },
                                {
                                    "type": "action",
                                    "action": {
                                        "type": "message",
                                        "label": "Type",
                                        "text": "Type"
                                    }
                                }
                                ]
                            },
                            "substitution": {
                                "user1": {
                                    "type": "mention",
                                    "mentionee": {
                                        "type": "user",
                                        "userId": event.source.userId
                                    }
                                }
                            }
                        }]);
                    }



                }
                if (event.message.text === "วิเคราะห์") {

                    // ค้นหาข้อมูลของ userId ที่ส่งมา
                    const userData = await mongo.getAnswersByUserId(event.source.userId, event.source.groupId);
                    
                    const model = userData?.model;

                    const analysisResult = await gemini.assistant(model);
                    
                    const cleanedString = analysisResult.replace(/json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanedString);
                    const goodModels = parsed.good;

                    const userids = await mongo.getUserIdsByModels(event.source.groupId, event.source.userId, goodModels);
                    if (userids.length === 0) {
                        await line.reply(event.replyToken, [{
                            "type": "textV2",
                            "text": "ขออภัยครับยังไม่พบ คนที่เหมาะกับการทำงานร่วมกับคุณ",
                            "quickReply": {
                                "items": [{
                                    "type": "action",
                                    "action": {
                                        "type": "uri",
                                        "label": "ทำแบบทดสอบ",
                                        "uri": process.env.LINE_LIFF_DISC + "?groupId=" + event.source.groupId
                                    }
                                },
                                {
                                    "type": "action",
                                    "action": {
                                        "type": "message",
                                        "label": "Type",
                                        "text": "Type"
                                    }
                                }
                                ]
                            }
                        }]);
                    } else {
                        // สร้าง List ของรายชื่อจาก userids
                        const userMentions = userids.map((userId, index) => ({
                            [`user${index + 1}`]: {
                                "type": "mention",
                                "mentionee": {
                                    "type": "user",
                                    "userId": userId
                                }
                            }
                        }));

                        // สร้างข้อความแบบ List
                        const userListText = userids.map((_, index) => `{user${index + 1}}`).join("\n");

                        // Combine กับข้อความหลัก
                        const messageText = `ผลลัพธ์ของคุณคือ ${model} จาก คู่ไกด์ไลน์นี้
                        \n🔹 **ประเภทที่ควรทำงานด้วยกัน (Good Match):**
                        \n- **D (Dominance) + I (Influence)**: เกิดความสมดุลระหว่างความเด็ดขาด (D) และการสื่อสารที่ดี (I) ทำให้ทีมเดินหน้าได้อย่างรวดเร็วและมีพลังงานบวก
                        \n- **D (Dominance) + C (Conscientiousness)**: D ผลักดันงาน ส่วน C คอยตรวจสอบรายละเอียดและความถูกต้อง
                        \n- **I (Influence) + S (Steadiness)**: I สร้างบรรยากาศที่ดี ส่วน S ช่วยสร้างความมั่นคงและสามัคคี
                        \n- **C (Conscientiousness) + S (Steadiness)**: งานจะมีความละเอียดและมั่นคง ทำงานได้อย่างต่อเนื่อง
                        \nทางเราคิดว่าคุณควรทำงานร่วมกับ:\n${userListText}! {emoji1} \n`;
                        // Combine Substitution
                        const substitution = {
                            ...userMentions.reduce((acc, curr) => ({ ...acc, ...curr }), {}),
                            "emoji1": {
                                "type": "emoji",
                                "productId": "5ac2280f031a6752fb806d65",
                                "emojiId": "001"
                            },
                            "everyone": {
                                "type": "mention",
                                "mentionee": {
                                    "type": "all"
                                }
                            }
                        };

                        // ส่งข้อความผ่าน LINE
                        await line.reply(event.replyToken, [{
                            "type": "textV2",
                            "text": messageText,
                            "substitution": substitution
                        }]);

                    }


                }

                if (event.message.mention && event.message.mention.mentionees) {

                    for (let mentionee of event.message.mention.mentionees) {
                        if (mentionee.isSelf === true || mentionee.type === "all") {

                            await line.reply(event.replyToken, [{
                                "type": "textV2",
                                "text": "สวัสดีครับ {user1} เรามาเริ่มทำแบบทดสอบกันดีกว่า",
                                "quickReply": {
                                    "items": [{
                                        "type": "action",
                                        "action": {
                                            "type": "uri",
                                            "label": "เริ่มทำแบบทดสอบ",
                                            "uri": process.env.LINE_LIFF_DISC + "?groupId=" + event.source.groupId
                                        }
                                    },
                                    {
                                        "type": "action",
                                        "action": {
                                            "type": "message",
                                            "label": "Type",
                                            "text": "Type"
                                        }
                                    }
                                    ]
                                },
                                "substitution": {
                                    "user1": {
                                        "type": "mention",
                                        "mentionee": {
                                            "type": "user",
                                            "userId": event.source.userId
                                        }
                                    }
                                }
                            }]);
                        }
                    }
                }
            }
        }

        // **Handle different LINE event types**
        if (event.type === "leave") {
            await mongo.deleteByGroupId(event.source.groupId);
            response.end();
            return
        }
    }

    response.end();
    return
});

// API Service
export const service = onRequest({ cors: true, invoker: "public" }, async (request: Request, response: Response): Promise<void> => {

    if (request.method !== "POST") {
        response.status(200).send("Method Not Allowed");
        return
    }

    const groupId = request.headers.groupid as string;

    const profile = await line.getProfileByIDToken(request.headers.authorization as string);
    if (!profile || !profile.sub) {
        response.status(401).json({ error: "Invalid LINE ID Token" });
        return
    }

    const { answers } = request.body;
    if (!answers || !Array.isArray(answers)) {
        response.status(400).json({ error: "Invalid answers format" });
        return
    }

    const answersMapIndex = answers.map((answer: string, index: number) => `${index}.${answer.charAt(0)}`);


    // **Create Prompt for Gemini AI**
    const prompt1 = `จากคำตอบนี้ ${JSON.stringify(answersMapIndex)}
    ช่วยพิจารณาว่าฉันเป็นกลุ่มใดใน DISC Model โดยให้คำตอบที่โดดเด่นที่สุด 1 Model 
    และอยู่ในรูปแบบ JSON ตัวอย่าง: 
    { "model": "Dominance", "description": "คนประเภท D มักมีลักษณะเป็นผู้นำ ชอบควบคุมสถานการณ์ และรับผิดชอบในการตัดสินใจ พวกเขามักจะมุ่งมั่นและมีจุดยืนที่ชัดเจน" }`;

    const searchResults = await mongo.vectorSearchQueryGemini(prompt1, true);
    let res = JSON.parse(searchResults)
    const model = res.model;
    const description = res.description;

    const userAnswerObject = {
        userId: profile.sub,
        groupId: groupId,
        model: model,
        description: description,
        answers: answers,
    };

    await mongo.upsertAnswersByUserId(profile.sub, groupId, userAnswerObject);

    console.log({
        message: "User answer saved successfully",
        data: userAnswerObject,
    });
    response.status(200).json({
        message: "User answer saved successfully",
        data: userAnswerObject,
    });
    return
});
