# PocketLedger: เส้นทางจาก Sprint 1 ไปสู่ Final Delivery

## Destination

กำหนด PocketLedger ให้เป็นผลิตภัณฑ์ที่ทำครบ Theme 7 ผ่านสาม sprints และใช้ accepted releases เดียวกันต่อเนื่องใน Deliverable 1, Labs 5–7, Deliverable 2 และ Final Delivery โดยตัดสินเรื่องที่เปลี่ยนผลลัพธ์ก่อนเริ่ม implementation ของงานนั้น

## Notes

- ผู้ขับเคลื่อนแผน: Wisit; ผู้ร่วมตัดสินใจ: Wisit และ Natthawat
- ใช้ local Markdown tracker ใน [ทะเบียนการตัดสินใจ](decisions.md) เป็นคำตอบหลัก; GitHub Issues/Project ใช้ติดตาม bounded work และอ้างกลับมาที่ contract/decision แทนการทำสำเนาหลายชุด
- สถานะและ dependency อยู่ที่ทะเบียนเดียว แผนนี้ชี้ไปยังคำตอบ ไม่คัดลอกคำตอบทั้งชุด
- ใช้ `pdf`, `thai-study-assistant`, `wayfinder`, `domain-modeling` และ `tdd` ตามหน้าที่ใน [คู่มือ course project](https://github.com/Palapluem/cpe334-software-engineer-2026/blob/main/project/README.md)
- ผู้เรียนอนุมัติชื่อ PocketLedger, nested independent repo และการเตรียมงานถึง Final แล้ว รอบนี้ทำเอกสาร/แม่แบบ/การตั้งค่า repo ได้; ยังไม่ลงมือ financial implementation หรือ billing/IAM/database ของ GCP
- [Assessment plan](../assessment-plan.md) เก็บกำหนดส่ง rubric และหลักฐานทั้งหกงาน; อย่าคัดลอกสถานะผ่านก่อนเกิดการรันจริง
- ข้อความที่เขียนว่า “เสนอ” หรือ “ยังไม่ยืนยัน” ไม่ใช่ stakeholder decision และไม่ใช่ผลตรวจว่าระบบผ่านแล้ว

## Decisions so far

- [ตรวจแหล่งข้อมูลและยืนยันทีมกับหัวข้อ](decisions.md#ตรวจแหล่งข้อมูลและยืนยันทีมกับหัวข้อ): ตรวจไฟล์ต้นทางและแยกรูปแบบส่งของ Deliverable 1 กับ Lab 5; ทีมเลือก Theme 7 แล้ว
- [ยืนยัน PocketLedger และขอบเขต Git repository](decisions.md#ยืนยัน-pocketledger-และขอบเขต-git-repository): ชื่อ Product/repo และการแยก course/product ยืนยันแล้ว

## Not yet specified

- รายละเอียดที่ต้องตกลงอยู่ใน [ยืนยันข้อมูลกลุ่มและ stack](decisions.md#ยืนยันข้อมูลกลุ่มและ-stack) และ [ตกลงกติกาการเงินและขอบเขต Sprint 1](decisions.md#ตกลงกติกาการเงินและขอบเขต-sprint-1)
- รายละเอียด UI/API/schema และคำสั่งจริงจะกำหนดใน feature contracts หลังรู้ stack และกติกาที่เลือก
- GCP project/resource/บัญชีที่ใช้ trial และการแบ่งงาน cloud ยังไม่ยืนยัน; เตรียมรายการไว้ใน Lab 5 แต่ยังไม่สร้าง resource
- ใบ Lab 6/7 ฉบับละเอียด, independent UAT partner และ maintenance change ที่ TA อนุมัติยังไม่มี
- Final handout ขัดกันเรื่องวิดีโอ 10/4 นาที ต้องเก็บคำตอบจากอาจารย์ก่อน final recording

## Out of scope

- เปลี่ยน TokTickIT Lab 1–4 หรือใช้ repo รายบุคคลแทนแอปกลุ่มโดยอัตโนมัติ
- ลงมือทำแอปทั้งหมด สร้าง PR วนเพื่อบันทึก merge หรือเปลี่ยน billing/IAM/database ในรอบเตรียมงาน
- เลือกกติกาการเงินที่โจทย์ไม่ได้ระบุแทนสมาชิกทั้งสอง
- ทำรายงานฉบับส่งหรืออ้างว่าครบคะแนนก่อนมีแอป ผลทดสอบ และ release จริง
- เพิ่ม external bank integration, recurring transactions, period/shared budgets หรือระบบใหญ่ที่อยู่นอก Theme 7
