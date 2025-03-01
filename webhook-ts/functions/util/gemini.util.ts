import { GoogleGenerativeAI,ChatSession } from "@google/generative-ai";
// Initialize Gemini AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);


export const assistant = async (prompt: string): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const chat: ChatSession = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "สวัสดีจ้า" }],
                },
                {
                    role: "model",
                    parts: [{ text: generateDISCExplanation() }],
                },
                {
                    role: "user",
                    parts: [{ text: "ตอนนี้ฉันเป็น Type" + prompt + "อยากรู้ว่าฉันต้องทำงานร่วมกับ Type ไหน ช่วยตอบเป็น Dominance , Influence ,Steadiness, Compliance และ ไม่ควรทำงานกับ Type ไหน ช่วยตอบเป็น json array ให้หน่อย โดยตอบเฉพาะ type เท่านั้นแยก good กับ bad" }],
                }
            ],
        });

        const result = await chat.sendMessage(prompt);
        return result.response.text();
    } catch (error: any) {
        console.error("❌ Error generating response:", error.message);
        throw error;
    }
};




/**
 * Generates an embedding vector for the given text using Gemini AI.
 * @param data - The text content to embed.
 * @returns A vector embedding array.
 */
export const getEmbedding = async (data: string): Promise<number[]> => {
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(data);
        return result.embedding.values;
    } catch (error: any) {
        console.error("❌ Error generating embedding:", error.message);
        throw error;
    }
};

/**
 * Generates a detailed explanation of DISC personality types.
 * @returns A formatted string explaining the DISC model.
 */
const generateDISCExplanation = (): string => {
    return (
        "การวิเคราะห์แบบ DISC เป็นกระบวนการที่ใช้เพื่อทำความเข้าใจลักษณะพฤติกรรมและบุคลิกภาพของบุคคลตามโมเดล DISC ซึ่งแบ่งออกเป็นสี่ประเภทหลักคือ:\n\n" +
        "**1. Dominance (D) - ผู้นำ มุ่งมั่น ตัดสินใจเด็ดขาด**\n" +
        "- ลักษณะเด่น: เป็นคนกล้าตัดสินใจ รักความท้าทาย มีเป้าหมายชัดเจน ชอบการแข่งขันและควบคุมสถานการณ์\n" +
        "- จุดแข็ง: ตัดสินใจรวดเร็ว มุ่งเน้นผลลัพธ์ มีภาวะผู้นำสูง และมีความมุ่งมั่นในการทำงาน\n" +
        "- จุดอ่อน: อาจขาดความอดทนและไม่ค่อยใส่ใจกับรายละเอียดมากนัก มักเน้นไปที่เป้าหมายมากกว่าความรู้สึกของคนรอบข้าง\n" +
        "- วิธีการทำงานร่วมกับ D: ควรเน้นเป้าหมายชัดเจน ตรงไปตรงมา และให้พวกเขามีอิสระในการตัดสินใจ\n\n" +

        "**2. Influence (I) - นักสื่อสาร ชอบเข้าสังคม มีพลังบวก**\n" +
        "- ลักษณะเด่น: เป็นคนร่าเริง มองโลกในแง่ดี มีความคิดสร้างสรรค์สูง และมีพลังในการสร้างบรรยากาศที่ดี\n" +
        "- จุดแข็ง: มีทักษะการสื่อสารที่ดี สร้างแรงบันดาลใจให้ผู้อื่น และเป็นมิตรกับทุกคน\n" +
        "- จุดอ่อน: มักขาดความเป็นระบบ ขาดความรอบคอบ และอาจวอกแวกได้ง่าย\n" +
        "- วิธีการทำงานร่วมกับ I: ควรเปิดโอกาสให้พวกเขาได้แสดงความคิดเห็นและมีปฏิสัมพันธ์กับผู้อื่น เพื่อดึงศักยภาพสูงสุดออกมา\n\n" +

        "**3. Steadiness (S) - คนใจเย็น ซื่อสัตย์ มั่นคง**\n" +
        "- ลักษณะเด่น: มีความอดทน ซื่อสัตย์ ใจเย็น และชอบช่วยเหลือผู้อื่น\n" +
        "- จุดแข็ง: เป็นผู้ฟังที่ดี มีความเสมอต้นเสมอปลาย และเป็นกำลังสำคัญของทีม\n" +
        "- จุดอ่อน: อาจไม่กล้าตัดสินใจในสถานการณ์ที่ต้องเปลี่ยนแปลงเร็ว และมักไม่ชอบความขัดแย้ง\n" +
        "- วิธีการทำงานร่วมกับ S: ควรให้ความมั่นใจ สนับสนุนทางอารมณ์ และอธิบายเป้าหมายให้ชัดเจน เพื่อให้พวกเขาปรับตัวได้ง่ายขึ้น\n\n" +

        "**4. Compliance (C) - นักวิเคราะห์ เจ้าระเบียบ ละเอียดรอบคอบ**\n" +
        "- ลักษณะเด่น: มีความพิถีพิถัน ชอบข้อมูลที่ชัดเจน และให้ความสำคัญกับความถูกต้อง\n" +
        "- จุดแข็ง: มีความแม่นยำ วิเคราะห์เก่ง และมีมาตรฐานการทำงานสูง\n" +
        "- จุดอ่อน: มักใช้เวลานานกับรายละเอียด อาจลังเลในการตัดสินใจ และต้องการข้อมูลที่ครบถ้วนก่อนดำเนินการ\n" +
        "- วิธีการทำงานร่วมกับ C: ควรให้ข้อมูลที่ชัดเจน ใช้เหตุผลที่เป็นตรรกะ และกำหนดขอบเขตงานให้แน่นอน\n\n" +
        "การทำการวิเคราะห์แบบ DISC จะช่วยให้เราเข้าใจลักษณะทางพฤติกรรมของบุคคลในด้านต่างๆ ซึ่งสามารถนำไปใช้ในการพัฒนาทักษะการทำงานทีม การจัดการทรัพยากรบุคคล หรือการสร้างสภาพแวดล้อมทำงานที่เหมาะสมกับแต่ละบุคคลได้ดีขึ้น"
    );
};
