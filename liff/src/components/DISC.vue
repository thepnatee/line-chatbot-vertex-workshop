<template>
    <div class="container mt-5">
        <h2>แบบสอบถาม DISC Model</h2>
        <div v-if="loading" class="loading-spinner">
            <!-- You can use a spinner component or a simple message -->
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
        <form v-else @submit.prevent="handleSubmit">
            <div v-for="(question, index) in questions" :key="index" class="mb-3">
                <label :for="'question-' + index" class="form-label">{{ question.text }}</label>
                <div v-for="(option, idx) in question.options" :key="idx" class="form-check">
                    <input :id="'question-' + index + '-option-' + idx" type="radio" v-model="responses[index]"
                        :value="option" class="form-check-input">
                    <label :for="'question-' + index + '-option-' + idx" class="form-check-label">{{ option }}</label>
                </div>
            </div>
            <button type="submit" class="btn btn-primary">Submit</button>
        </form>
    </div>
</template>
<script>
import axios from 'axios';
import liff from "@line/liff";
export default {
    data() {
        return {
            loading: true,
            idToken: null,
            profile: null,
            context: null,
            groupId: null,
            questions: [
                {
                    "text": "1. เมื่อต้องทำงานภายใต้ความกดดันเวลา คุณมักจะ",
                    "options": ["A. ทำงานได้อย่างมีประสิทธิภาพยิ่งขึ้น", "B. รู้สึกกังวลและต้องการความช่วยเหลือ", "C. พยายามรักษาความสงบและหาทางแก้ไขปัญหาอย่างมีเหตุผล", "D. ตรวจสอบรายละเอียดทุกอย่างอย่างละเอียดถี่ถ้วน"]
                },
                {
                    "text": "2. ในการประชุม คุณมักจะ",
                    "options": ["A. เป็นคนแรกที่เสนอความคิดเห็น", "B. สนับสนุนความคิดเห็นของผู้อื่น", "C. รอฟังความคิดเห็นของคนอื่นก่อน", "D. ตรวจสอบความถูกต้องของข้อมูลที่นำเสนอ"]
                },
                {
                    "text": "3. เมื่อต้องตัดสินใจในสถานการณ์ที่ไม่แน่นอน คุณมักจะ",
                    "options": ["A. ตัดสินใจอย่างรวดเร็ว", "B. ขอคำแนะนำจากผู้อื่น", "C. รวบรวมข้อมูลให้ครบถ้วนก่อนตัดสินใจ", "D. เลื่อนการตัดสินใจออกไป"]
                },
                {
                    "text": "4. ในการทำงานกลุ่ม คุณมักจะ",
                    "options": ["A. เป็นผู้นำและกำหนดทิศทางของกลุ่ม", "B. สร้างความสัมพันธ์ที่ดีในกลุ่ม", "C. ปฏิบัติตามคำแนะนำของผู้นำ", "D. ตรวจสอบความถูกต้องของงานที่กลุ่มทำ"]
                },
                {
                    "text": "5. เมื่อต้องเผชิญกับความผิดพลาด คุณมักจะ",
                    "options": ["A. มองหาสาเหตุของปัญหาและแก้ไข", "B. โทษตัวเอง", "C. โทษปัจจัยภายนอก", "D. ปล่อยผ่านไป"]
                },

                {
                    "text": "6. คุณชอบทำงานในสภาพแวดล้อมแบบไหนมากที่สุด",
                    "options": ["A. สภาพแวดล้อมที่เปลี่ยนแปลงอยู่เสมอ", "B. สภาพแวดล้อมที่เป็นระเบียบและมีโครงสร้าง", "C. สภาพแวดล้อมที่ทำงานร่วมกับผู้อื่น", "D. สภาพแวดล้อมที่เงียบสงบและเป็นส่วนตัว"]
                },
                {
                    "text": "7. คุณให้ความสำคัญกับอะไรมากที่สุดในการทำงาน",
                    "options": ["A. ผลลัพธ์ที่ได้", "B. ความสัมพันธ์กับเพื่อนร่วมงาน", "C. ความถูกต้องแม่นยำของงาน", "D. การเรียนรู้สิ่งใหม่ๆ"]
                },
                {
                    "text": "8. คุณรู้สึกอย่างไรเมื่อต้องทำสิ่งที่ไม่เคยทำมาก่อน",
                    "options": ["A. ตื่นเต้นและอยากลอง", "B. กังวลและไม่มั่นใจ", "C. ขอคำแนะนำจากคนอื่นก่อน", "D. วางแผนอย่างละเอียดก่อนลงมือทำ"]
                },
                {
                    "text": "9. คุณชอบที่จะได้รับคำชมเกี่ยวกับ",
                    "options": ["A. ความสามารถในการทำงาน", "B. ความเป็นมิตรและเข้ากับคนง่าย", "C. ความรอบคอบและความละเอียด", "D. ความคิดสร้างสรรค์"]
                },
                {
                    "text": "10. คุณมักจะ",
                    "options": ["A. เป็นคนริเริ่มและเสนอไอเดียใหม่ๆ", "B. เป็นคนกลางที่ช่วยประสานงาน", "C. เป็นคนคอยตรวจสอบและแก้ไขข้อผิดพลาด", "D. เป็นคนปฏิบัติตามคำสั่ง"]
                },
                {
                    "text": "11. เมื่อต้องนำเสนองานต่อกลุ่มคน คุณมักจะ",
                    "options": ["A. พูดอย่างมั่นใจและชัดเจน", "B. เน้นสร้างความสัมพันธ์ที่ดีกับผู้ฟัง", "C. เตรียมข้อมูลมาอย่างละเอียด", "D. กังวลและตื่นเต้น"]
                },
                {
                    "text": "12. เมื่อต้องทำงานกับคนที่มีความคิดเห็นแตกต่าง คุณมักจะ",
                    "options": ["A. ยืนยันในความคิดเห็นของตนเอง", "B. พยายามหาข้อตกลงร่วมกัน", "C. ปล่อยให้เรื่องผ่านไป", "D. ขอให้คนอื่นตัดสิน"]
                },
                {
                    "text": "13. คุณรู้สึกอย่างไรเมื่อต้องเผชิญกับความท้าทาย",
                    "options": ["A. ตื่นเต้นและอยากลอง", "B. กังวลและไม่มั่นใจ", "C. ขอความช่วยเหลือจากคนอื่น", "D. หลีกเลี่ยงความท้าทาย"]
                },
                {
                    "text": "14. คุณชอบที่จะทำงานคนเดียวหรือทำงานเป็นทีม",
                    "options": ["A. ชอบทำงานคนเดียว", "B. ชอบทำงานเป็นทีม", "C. ขึ้นอยู่กับประเภทของงาน", "D. ไม่ชอบทั้งสองแบบ"]
                },
                {
                    "text": "15. คุณชอบเรียนรู้สิ่งใหม่ๆ ผ่านทาง",
                    "options": ["A. การปฏิบัติจริง", "B. การอ่านหนังสือ", "C. การฟังบรรยาย", "D. การพูดคุยกับผู้อื่น"]
                },
                {
                    "text": "16. คุณให้ความสำคัญกับอะไรมากที่สุดในการตัดสินใจ",
                    "options": ["A. สัญชาตญาณ", "B. ข้อมูลและหลักฐาน", "C. ความคิดเห็นของผู้อื่น", "D. ผลประโยชน์ส่วนตัว"]
                },
                {
                    "text": "17. คุณคิดว่าทักษะอะไรสำคัญที่สุดในการทำงาน",
                    "options": ["A. ทักษะการสื่อสาร", "B. ทักษะการแก้ปัญหา", "C. ทักษะการทำงานเป็นทีม", "D. ทักษะการคิดวิเคราะห์"]
                },
                {
                    "text": "18. คุณชอบการทำงานในรูปแบบใด",
                    "options": ["A. การทำงานที่เน้นผลลัพธ์", "B. การทำงานร่วมกับทีม", "C. การทำงานที่มีโครงสร้างชัดเจน", "D. การทำงานที่มีความยืดหยุ่น"]
                },
                {
                    "text": "19. คุณชอบที่จะเป็นคน",
                    "options": ["A. เริ่มต้นโครงการใหม่ๆ", "B. สร้างความสัมพันธ์ที่ดีกับคนรอบข้าง", "C. ทำงานตามขั้นตอนและรายละเอียด", "D. วิเคราะห์ข้อมูลและแก้ไขปัญหา"]
                },
                {
                    "text": "20. คุณชอบความสำเร็จในลักษณะใด",
                    "options": ["A. ความสำเร็จที่ได้ผลลัพธ์ตามเป้าหมาย", "B. ความสำเร็จที่ทุกคนในทีมมีความสุข", "C. ความสำเร็จที่มาจากการวางแผนและจัดการอย่างดี", "D. ความสำเร็จที่ช่วยสร้างโอกาสในอนาคต"]
                }
            ],
            responses: [
                "A. ทำงานได้อย่างมีประสิทธิภาพยิ่งขึ้น",
                "A. เป็นคนแรกที่เสนอความคิดเห็น",
                "A. ตัดสินใจอย่างรวดเร็ว",
                "A. เป็นผู้นำและกำหนดทิศทางของกลุ่ม",
                "A. มองหาสาเหตุของปัญหาและแก้ไข",
                "A. สภาพแวดล้อมที่เปลี่ยนแปลงอยู่เสมอ",
                "A. ผลลัพธ์ที่ได้",
                "A. ตื่นเต้นและอยากลอง",
                "A. ความสามารถในการทำงาน",
                "A. เป็นคนริเริ่มและเสนอไอเดียใหม่ๆ",
                "A. พูดอย่างมั่นใจและชัดเจน",
                "A. ยืนยันในความคิดเห็นของตนเอง",
                "A. ตื่นเต้นและอยากลอง",
                "A. ชอบทำงานคนเดียว",
                "A. การปฏิบัติจริง",
                "A. สัญชาตญาณ",
                "A. ทักษะการสื่อสาร",
                "A. การทำงานที่เน้นผลลัพธ์",
                "A. เริ่มต้นโครงการใหม่ๆ",
                "A. ความสำเร็จที่ได้ผลลัพธ์ตามเป้าหมาย"
            ]
        };
    },
    beforeCreate() {
    liff
      .init({
        liffId: '2006821515-Jjz3YnBr'
      })
      .then(() => {
        this.message = "LIFF init succeeded.";
      })
      .catch((e) => {
        this.message = "LIFF init failed.";
        this.error = `${e}`;
      });
  },
    async mounted() {
        await this.checkLiffLogin()
    },
    methods: {
        async checkLiffLogin() {
            await liff.ready.then(async () => {
                if (!liff.isLoggedIn()) {
                    liff.login({ redirectUri: window.location })
                } else {

                    this.idToken = await liff.getIDToken();
                    this.context = await liff.getContext();
                    this.groupId = this.$route.query.groupId
                    console.log(this.context.type);

                    this.loading = false

                }
            })
        },
        async handleSubmit() {
            this.loading = true
            if (this.hasUnansweredQuestions()) {
                alert("กรุณาตอบคำถามให้ครบทุกข้อ");
                this.loading = false
                return;
            }


            const answerData = {
                answers: Array.from(this.responses),
            };
            try {
                const response = await axios.post(`https://2ac11d0f0326.ngrok.app/line-chatbot-vertex-workshop/asia-northeast1/service`,
                    answerData,
                    {
                        headers: {
                            Authorization: `${this.idToken}`,
                            GroupId: this.groupId,
                        },
                    }
                );
                if (liff.isInClient()) {
                     let message = `ฉันได้ประเมินเรียบร้อยแล้ว`
                    if (this.context.type === "utou") {
                         message = `ฉันได้ประเมินเรียบร้อยแล้ว ฉันได้กลุ่ม ${response.data.data.model}`
                    }

                    await liff.sendMessages([
                        {
                            type: "text",
                            text: message,
                        },
                    ]).then(() => {
                        liff.closeWindow()
                        this.loading = false

                    }).catch((err) => {
                        console.log("error", err);
                    });
                } else {

                    alert(`ผลที่ได้คือคุณเป็นกลุ่ม: ${response.data.data.model}`)
                    this.loading = false

                }

            } catch (error) {
                this.loading = false
                throw new Error(`handleSubmit: ${error}`);
            }

            // ทำการประมวลผลข้อมูลที่ได้จากแบบสอบถาม
        },
        hasUnansweredQuestions() {
            return this.responses.length < this.questions.length || this.responses.includes(undefined);
        }



    },
};
</script>

<style>
.error {
    color: red;
}
</style>