import { MongoClient, Db, Collection, Document } from "mongodb";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
import { GoogleVertexAIEmbeddingsInput } from "@langchain/google-vertexai";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import * as gemini from "./gemini.util.js";
import * as context from "../context/context.js";
// MongoDB connection URI
const client = new MongoClient('xxxxx');

const model = new ChatVertexAI({
    // We will use the Gemini gemini-2.0-flash-exp model
    model: "gemini-2.0-flash-exp",
    // The maximum number of tokens to generate in the response
    maxOutputTokens: 500,
    // The temperature parameter controls the randomness of the output — the higher the value, the more random the output
    temperature: 0.5,
    // The topP parameter controls the diversity of the output — the higher the value, the more diverse the output
    topP: 0.9,
    // The topK parameter controls the diversity of the output — the higher the value, the more diverse the output
    topK: 20,
});

/** ✅ เพิ่มข้อมูลเวกเตอร์ลง MongoDB */
export async function insertVector(data: any[]): Promise<void> {
    try {
        await client.connect();
        const db: Db = client.db("developer");
        const collection: Collection = db.collection("disc_embeddings");
        const indexName: string = "vector_index";

        await Promise.all(data.map(async (item) => {
            const existingDoc = await collection.findOne({ type: item.type });
            const embedding = await gemini.getEmbedding(`${item.description} 
                ${item.strengths} ${item.weaknesses} ${item.work_style}`);
            if (!embedding) return;

            if (!existingDoc) {
                await collection.insertOne({
                    type: item.type,
                    description: item.description,
                    strengths: item.strengths,
                    weaknesses: item.weaknesses,
                    work_style: item.work_style,
                    embedding: embedding
                });
                console.log(`✅ Stored embedding for: ${item.type}`);
            } 
        }));

        const existingIndexes = await collection.listSearchIndexes().toArray();
        const indexExists = existingIndexes.some(idx => idx.name === indexName);

        if (!indexExists) {
            const index = {
                name: indexName,
                type: "vectorSearch",
                definition: {
                    "fields": [
                        {
                            "type": "vector",
                            "path": "embedding",
                            "similarity": "cosine",
                            "numDimensions": 768
                        }
                    ]
                }
            };
            const result = await collection.createSearchIndex(index);
            console.log("✅ Created new index:", result);
        } else {
            console.log("✅ Index 'vector_index' already exists. Skipping creation.");
        }
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
    }
}

/** ✅ ค้นหาข้อมูลโดยใช้เวกเตอร์ */
export async function vectorSearchQuery(query: string): Promise<Document[]> {
    console.log(query);
    try {
        await client.connect();
        const db = client.db('developer');
        const collection = db.collection('disc_embeddings');
        const indexName: string = "vector_index";

        const queryEmbedding = await gemini.getEmbedding(query);
        if (!queryEmbedding) {
            console.error("❌ Failed to generate embedding for query");
            return [];
        }

        const results = await collection.aggregate([
            {
                $vectorSearch: {
                    index: indexName,
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: 1000,
                    limit: 10
                }
            },
            {
                $project: {
                    type: 1,
                    description: 1,
                    strengths: 1,
                    weaknesses: 1,
                    work_style: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ]).toArray();

        console.log("✅ Search results:", results);
        return results;
    } catch (err) {
        console.error("❌ Search Error:", err);
        return [];
    } finally {
        await client.close();
    }
}


// ฟังก์ชันสำหรับแปลงข้อความเป็น Embedding
export async function getEmbedding(text: string): Promise<number[]> {
    try {
        // ✅ ใช้ GoogleVertexAIEmbeddings พร้อมกับ GoogleVertexAIEmbeddingsInput เป็น config
        const embeddingConfig: GoogleVertexAIEmbeddingsInput = {
            model: "text-embedding-004", // หรือใช้โมเดลที่รองรับเวกเตอร์ฝังตัว
        };

        const embeddings = new VertexAIEmbeddings(embeddingConfig);
        const embedding = await embeddings.embedQuery(text);
        // console.log("✅ Embedding สำเร็จ:", embedding);
        return embedding;
    } catch (error) {
        console.error("❌ Error in getEmbedding:", error);
        throw error;
    }
}


/** ✅ ค้นหาข้อมูลเวกเตอร์โดยใช้ Gemini */
export async function vectorSearchQueryGemini(query: string, jsonStatus: boolean): Promise<string> {


    try {
        await client.connect();
        const db = client.db('developer');
        const collection = db.collection('disc_embeddings');


        const embeddingConfig: GoogleVertexAIEmbeddingsInput = {
            model: "text-embedding-004",
        };

        const embeddings = new VertexAIEmbeddings(embeddingConfig);

        const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
            collection,
            indexName: 'vector_index',
            textKey: 'text',
            embeddingKey: 'embedding',
        });
        const vectorStoreRetriever = vectorStore.asRetriever();

        const history: BaseLanguageModelInput = getChatHistory();

        const retrievedContext = await vectorStoreRetriever.invoke(query);

        // จัดรูปแบบ Context ที่ได้จาก retrievedContext
        let formattedContext = '';
        if (retrievedContext && retrievedContext.length > 0) {
            formattedContext = retrievedContext.map(doc => {
                const meta = doc.metadata;
                return `
                Type: ${meta.type}
                Description: ${meta.description}
                Strengths: ${meta.strengths}
                Weaknesses: ${meta.weaknesses}
                Work Style: ${meta.work_style}
                  `;
            }).join('\n');
        } else {
            console.error("❌ No relevant context found.");
        }

        let prompt
        if (formattedContext) {
            prompt = `User question: ${query}\n\nBased on the following context:\n${formattedContext}\n\nAnswer concisely:`;
        } else {
            prompt = `User question: ${query}`;
        }

        console.log("Processing query with model...");
        const modelResponse = await model.invoke([...history, prompt]);
        const textResponse = modelResponse?.content;

        return jsonStatus ? textResponse.toString().replace(/json/g, "").replace(/```/g, "").trim() : textResponse.toString();

    } catch (error) {
        console.error('Error in vectorSearchQueryGemini:', error);
        return 'An unexpected error occurred.';
    } finally {
        // Ensure the MongoDB client is closed after the operation
        await client.close();
    }
}


/** ✅ ปิดการเชื่อมต่อ MongoDB */
export async function disconnectDB(): Promise<void> {
    try {
        await client.close();
        console.log("✅ MongoDB Disconnected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Disconnection Error:", error);
    }
}

/** ✅ อัปเดตหรือเพิ่มข้อมูล */
export async function upsertAnswersByUserId(userId: string, groupId: string, data: any): Promise<Document | null> {
    try {
        await client.connect();
        const db = client.db('developer');
        const collection = db.collection('groups');

        // ค้นหาโดยใช้ userId และ groupId
        const filter = { userId, groupId };
        // อัปเดตข้อมูล โดยใช้ $set เพื่ออัปเดตเฉพาะฟิลด์ที่ส่งมา
        const updateData = {
            $set: {
                ...data,                
                updatedAt: new Date()   
            }
        };
        const result = await collection.findOneAndUpdate(filter, updateData, {
            returnDocument: "after",
            upsert: true
        });

        // console.log("✅ Upsert Success:", result);
        return result;
    } catch (error) {
        console.error("❌ Upsert Error:", error);
        throw error;
    }
}

/** ✅ ค้นหาข้อมูลของผู้ใช้ */
export async function getAnswersByUserId(userId: string, groupId?: string): Promise<Document | null> {
    try {
        await client.connect();
        const db = client.db('developer');
        const collection = db.collection('groups');

        const filter: any = { userId };
        if (groupId) {
            filter.groupId = groupId;
        }

        const result = await collection.findOne(filter);

        if (!result) {
            console.log(`⚠️ No document found for userId: ${userId}, groupId: ${groupId || "N/A"}`);
            return null;
        }
        return result;
    } catch (error) {
        console.error("❌ FindOne Error:", error);
        throw error;
    }
}

export async function insertGroupWithUsers(groupId: string): Promise<Document | null> {

    console.log("groupId", groupId);
    try {
        await client.connect();
        const db = client.db('developer');
        const collection = db.collection('groups');

        const result = await collection.findOneAndUpdate(
            { groupId },
            {
                $setOnInsert: {
                    type: 'group',
                    createdAt: new Date()
                }
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );

        console.log(`✅ Inserted document with groupId: ${groupId} into 'groups' collection`);
        return result;
    } catch (error) {
        console.error("❌ InsertGroupWithUsers Error:", error);
        throw error;
    } finally {
        await disconnectDB();
    }
}
export async function insertUserIdWithGroup(userid: string, groupId: string): Promise<Document | null> {

    console.log("groupId", groupId);
    try {
        await client.connect();
        const db = client.db('developer');
        const collection = db.collection('groups');

        const result = await collection.findOneAndUpdate(
            { groupId, userid },
            {
                $setOnInsert: {
                    type: 'user',
                    createdAt: new Date()
                }
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );

        console.log(`✅ Inserted document with groupId: ${groupId} and userid: ${userid} into 'groups' collection`);
        return result;
    } catch (error) {
        console.error("❌ InsertGroupWithUsers Error:", error);
        throw error;
    } finally {
        await disconnectDB();
    }
}

/** ✅ ลบข้อมูลตาม groupId */
export async function deleteByGroupId(groupId: string): Promise<Document | null> {
    try {
        await client.connect();
        const db = client.db('developer');
        const collection = db.collection('groups');

        const result = await collection.deleteMany({ groupId });

        console.log(`✅ Deleted ${result.deletedCount} documents in groupId: ${groupId}`);
        return result;
    } catch (error) {
        console.error("❌ DeleteByGroupId Error:", error);
        throw error;
    } finally {
        await disconnectDB();
    }
}

export async function getUserIdsByModels(groupId: string, userId: string, goodModels: string[]): Promise<string[]> {
    try {
        await client.connect();
        const db = client.db('developer');
        const collection = db.collection('groups');

        // ใช้ aggregate เพื่อค้นหา userId โดยใช้ goodModels และ badModels
        const groupData = await collection.aggregate([
            {
                $match: {
                    groupId: groupId,
                    userId: { $ne: userId },
                    model: {
                        $in: goodModels,
                    },
                }
            },
            {
                $project: {
                    _id: 0,  // ไม่ต้องการ _id
                    userId: 1  // เอาเฉพาะ userId
                }
            }
        ]).toArray();

        console.log("groupData", groupData);
        // ดึง userId มาเป็น Array ของ String
        const userIds = groupData.map(doc => doc.userId);

        return userIds;
    } catch (error) {
        console.error("❌ Error in getUserIdsByModels:", error);
        throw error;
    } finally {
        await disconnectDB();
    }
}


function getChatHistory(): any[] {
    return [
        {
            type: "system",
            content: `คุณเป็นผู้เชี่ยวชาญด้านการวิเคราะห์บุคลิกภาพตามหลัก DISC Model 
                    หน้าที่ของคุณคือการวิเคราะห์และอธิบายรูปแบบพฤติกรรมของมนุษย์โดยใช้แนวคิดของ DISC
                
                    DISC Model แบ่งบุคลิกภาพออกเป็น 4 ประเภทหลัก:
                    
                    1️⃣ **D (Dominance) - ผู้นำที่มุ่งเน้นเป้าหมาย**: มีความเด็ดขาด กล้าตัดสินใจ มีความมั่นใจสูง และเน้นผลลัพธ์
                    2️⃣ **I (Influence) - นักสร้างสัมพันธ์**: เป็นคนสนุกสนาน มีมนุษยสัมพันธ์ดี โน้มน้าวเก่ง และคิดนอกกรอบ
                    3️⃣ **S (Steadiness) - ผู้สนับสนุน**: ใจดี อดทน ซื่อสัตย์ และรักความสงบ
                    4️⃣ **C (Conscientiousness) - นักวิเคราะห์**: ละเอียดรอบคอบ มีเหตุผล เป็นระบบ และให้ความสำคัญกับข้อเท็จจริง
                
                    โปรดวิเคราะห์บุคลิกภาพของผู้ใช้ตาม DISC Model และให้คำแนะนำที่เหมาะสมโดยใช้หลักจิตวิทยา
                    กรุณาให้คำตอบที่แม่นยำและสอดคล้องกับแนวทาง DISC Model เท่านั้น หลีกเลี่ยงการคาดเดาหรือให้คำตอบที่ไม่มีข้อมูลสนับสนุน
                    
                    🔹 **ประเภทที่ควรทำงานด้วยกัน (Good Match):**
                    - **D (Dominance) + I (Influence)**: เกิดความสมดุลระหว่างความเด็ดขาด (D) และการสื่อสารที่ดี (I) ทำให้ทีมเดินหน้าได้อย่างรวดเร็วและมีพลังงานบวก
                    - **D (Dominance) + C (Conscientiousness)**: D ผลักดันงาน ส่วน C คอยตรวจสอบรายละเอียดและความถูกต้อง
                    - **I (Influence) + S (Steadiness)**: I สร้างบรรยากาศที่ดี ส่วน S ช่วยสร้างความมั่นคงและสามัคคี
                    - **C (Conscientiousness) + S (Steadiness)**: งานจะมีความละเอียดและมั่นคง ทำงานได้อย่างต่อเนื่อง
                
                    🔻 **ประเภทที่ไม่ควรทำงานด้วยกัน (Potential Conflicts):**
                    - **D (Dominance) + D (Dominance)**: ขัดแย้งเพราะต้องการเป็นผู้นำและควบคุมสถานการณ์
                    - **I (Influence) + I (Influence)**: พูดมากทั้งคู่ ทำให้งานไม่คืบหน้า
                    - **C (Conscientiousness) + D (Dominance)**: D ต้องการความรวดเร็ว ส่วน C ต้องการรายละเอียด ทำให้เกิดความขัดแย้ง
                    - **S (Steadiness) + D (Dominance)**: D ต้องการความเร็วและเปลี่ยนแปลง ส่วน S ต้องการความมั่นคง
                
                    🔄 **แนวทางการปรับตัว:**
                    - **D + C หรือ D + S:** D ควรเปิดใจฟัง C หรือ S ที่ต้องการความละเอียดและขั้นตอน
                    - **I + C หรือ I + S:** I ควรเคารพการทำงานอย่างเป็นระบบของ C หรือ S
                    - **S + D:** S ควรปรับตัวให้ทันกับการตัดสินใจที่รวดเร็วของ D
                    - **C + I:** C ควรเปิดใจรับความคิดเห็นใหม่ๆ จาก I
                    
                    ใช้หลักการนี้ในการวิเคราะห์และให้คำแนะนำที่เหมาะสมตามบุคลิกภาพและการทำงานเป็นทีม`
        },
        { type: "human", content: "ฉันอยากรู้ว่าฉันมีบุคลิกภาพอะไร?" },
        { type: "assistant", content: `ฉันมีคำถามดังนี้ ${JSON.stringify(context.disc())}` },
        { type: "human", content: "ผมเป็นคนที่ชอบการแข่งขันและรับความท้าทายเสมอ ผมมักจะทำงานอย่างอิสระและต้องการผลลัพธ์ที่ชัดเจน" },
        { type: "assistant", content: "จากคำอธิบายของคุณ บุคลิกภาพของคุณมีแนวโน้มที่จะเป็น **Dominance (D)**..." },
        { type: "human", content: "ฉันชอบเข้าสังคมและพูดคุยกับคนอื่น ฉันชอบสร้างแรงบันดาลใจให้กับทีมและคิดไอเดียใหม่ ๆ" },
        { type: "assistant", content: "คุณมีลักษณะบุคลิกภาพที่ตรงกับ **Influence (I)**..." },
        { type: "human", content: "ฉันเป็นคนที่ทำงานอย่างเป็นระบบและให้ความสำคัญกับรายละเอียด ฉันมักจะตรวจสอบข้อมูลทุกครั้งก่อนตัดสินใจ" },
        { type: "assistant", content: "จากข้อมูลของคุณ บุคลิกภาพของคุณเข้ากับ **Conscientiousness (C)**..." },
        { type: "human", content: "ฉันเป็นคนที่ให้ความสำคัญกับทีมและความสัมพันธ์ ฉันชอบทำงานในสภาพแวดล้อมที่สงบและมั่นคง" },
        { type: "assistant", content: "คุณมีบุคลิกภาพที่เข้ากับ **Steadiness (S)**..." }
    ];
}
