# ทะเบียนการตัดสินใจ

ทะเบียน local Markdown นี้ใช้ชื่อเรื่องเป็นตัวอ้างอิง สถานะ OPEN เป็นคำถามที่ยังต้องตอบ ไม่ใช่ GitHub Issue ที่เปิดไว้แล้ว

| เรื่อง | ชนิด | สถานะ | ผู้ตัดสินใจ / ผู้รับผิดชอบ | ขึ้นกับ |
| --- | --- | --- | --- | --- |
| [ตรวจแหล่งข้อมูลและยืนยันทีมกับหัวข้อ](#ตรวจแหล่งข้อมูลและยืนยันทีมกับหัวข้อ) | wayfinder:research | DONE | Wisit | — |
| [ยืนยัน PocketLedger และขอบเขต Git repository](#ยืนยัน-pocketledger-และขอบเขต-git-repository) | wayfinder:research | DONE | Wisit | ตรวจแหล่งข้อมูลและยืนยันทีมกับหัวข้อ |
| [ยืนยันข้อมูลกลุ่มและ stack](#ยืนยันข้อมูลกลุ่มและ-stack) | wayfinder:grilling | OPEN | Wisit + Natthawat | ยืนยัน PocketLedger และขอบเขต Git repository |
| [ตกลงกติกาการเงินและขอบเขต Sprint 1](#ตกลงกติกาการเงินและขอบเขต-sprint-1) | wayfinder:grilling | OPEN | Wisit + Natthawat | ตรวจแหล่งข้อมูลและยืนยันทีมกับหัวข้อ |

Frontier ตอนนี้คือสองเรื่องที่ OPEN: ตอบร่วมกันได้ก่อนสร้าง contract ฉบับอนุมัติ การจัดเอกสาร/แตก ZIP ไม่ติด dependency นี้

## ตรวจแหล่งข้อมูลและยืนยันทีมกับหัวข้อ

**Status:** DONE, 3 พฤศจิกายน 2026 · **Assignee:** Wisit

### Question

มีเอกสารใดอยู่จริง แต่ละเอกสารใช้กำหนดอะไร และทีม/หัวข้อของงานกลุ่มคืออะไร?

### Resolution

ใช้ข้อเท็จจริงและลิงก์ต้นทางที่ [course project index](https://github.com/Palapluem/cpe334-software-engineer-2026/blob/main/project/README.md): master, Deliverable 1, Deliverable 2, Final และ Lab 5 handout อ่านครบ; Workflow Guide อ่านเนื้อหาภาษาอังกฤษครบ; Lecture 11 ตรวจหน้าที่เกี่ยวกับ SDD/release/workflow/smoke; Student Guide ตรวจ overview, cloud-ready, merge gate และ persistence/rollback ตลอดจน README และจุดปรับ CI ของ starter kit ยังไม่ได้ทำ walkthrough ทุกหน้าของคู่มือ 105 หน้า

สมาชิกและ Theme 7 ยืนยันจากคำตอบของผู้เรียนแล้ว สำเนา PDF ทั้งสี่ใน course `project/` ตรงกับชุด Week 10 ทุกไบต์ Starter ZIP ตรวจ CRC และเทียบข้อมูลหลังแตกครบ 23 ไฟล์ก่อนลบต้นฉบับ รายละเอียดอยู่ที่ [course Lab 5](https://github.com/Palapluem/cpe334-software-engineer-2026/blob/main/labs/Lab05/README.md)

Deliverable 1 ต้องมี complete engineering content ใน PDF ตาม handout §4; Lab 5 ใช้ concise evidence index ตาม handout §12 ความแตกต่างนี้เป็นข้อกำหนดของแต่ละงาน ไม่ใช่เลือก report format เดียวใช้แทนทุกงาน

Lab 6/7 ยังไม่มี PDF ในโฟลเดอร์ที่ผู้เรียนเตรียม จึงใช้ master §10 เป็น preparation เท่านั้น Deliverable 2 §4 ยืนยันเวลา 23:59; Final §2 กับ §3.5 ขัดกันเรื่อง 10/4 นาที บันทึกข้อขัดแย้งไว้ใน [assessment plan](../assessment-plan.md)

## ยืนยัน PocketLedger และขอบเขต Git repository

**Status:** DONE, 3 พฤศจิกายน 2026 · **Assignee:** Wisit

### Question

ชื่อ Product, repo และที่เก็บ source ของงานกลุ่มคืออะไร และป้องกันการ push ปนกับ course อย่างไร?

### Resolution

ผู้เรียนเลือก **PocketLedger**, ใช้ `Palapluem/pocket-ledger` และ local checkout `project/pocket-ledger/` ภายใต้ course workspace โฟลเดอร์นี้มี Git root แยกและ course `.gitignore` ตัดทั้งโฟลเดอร์ ไม่ใช่ submodule

Product specifications/code/tests/configuration อยู่ที่ product repo; ใบงาน/lecture/คู่มือเตรียมและ PDF ฉบับส่งอยู่ที่ course repo ตรวจ root/remote/status ก่อนทุก Git write ตาม `AGENTS.md` การ bootstrap เป็นเอกสารและการตั้งค่า ไม่ใช่ accepted Sprint 1 release

## ยืนยันข้อมูลกลุ่มและ stack

**Status:** OPEN · **Type:** wayfinder:grilling · **Decision owners:** Wisit + Natthawat

ติดตามงาน: [Confirm team metadata, runtime and authentication design](https://github.com/Palapluem/pocket-ledger/issues/2)

### Question

ทีมใช้ชื่อ/เลขกลุ่ม section และ stack ใด วิธี auth/session เป็นอย่างไร และทั้งสองคนยืนยันการเข้าถึง/review ได้หรือยัง?

### ข้อมูลที่ต้องเติม

| รายการ | คำตอบของทีม |
| --- | --- |
| ชื่อกลุ่ม / เลขกลุ่ม / section | |
| ชื่อผลิตภัณฑ์และบริบทผู้ใช้ที่เจาะจง | PocketLedger; บริบทเพิ่มเติมรอทีม |
| Product repository URL และเจ้าของ repo | https://github.com/Palapluem/pocket-ledger · Palapluem |
| Sprint staging branch และรูปแบบ branch/Issue | `sprint-1-staging`; ดู CONTRIBUTING.md |
| UI / API / database / migration / test tooling | |
| Runtime version ที่ใช้ตรงกันใน local, CI และ image | |
| วิธี session/token, logout และ disabling a user | |
| ผู้เริ่ม feature แรก / ผู้ review และรอบสลับหน้าที่ | |

ข้อเสนอที่เปลี่ยนได้: ใช้ stack ที่ทีมคุ้นเคยและ architecture ขนาดเล็กซึ่งทำ UI → API → persistent DB ได้จริง เลือก container runtime version เดียวกัน ไม่ต้องเพิ่ม microservices หรือหลาย server ให้ครบจำนวนชั้น

### Done when

ทีมตอบรายการข้างต้นพร้อมเหตุผลที่จำเป็น, repo เข้าถึงได้ตามข้อกำหนด และเขียน System-Level SDS ได้โดยไม่ต้องเดา environment/commands

## ตกลงกติกาการเงินและขอบเขต Sprint 1

**Status:** OPEN · **Type:** wayfinder:grilling · **Decision owners:** Wisit + Natthawat

ติดตามงาน: [Agree the financial rules and Sprint 1 vertical slice](https://github.com/Palapluem/pocket-ledger/issues/1)

### Question

จะเปลี่ยน Theme 7 ให้เป็นกติกาการเงินที่ตรวจผลได้อย่างไร และ Sprint 1 จะทำ vertical slice ใดให้ครบจริงภายใน 8 พฤศจิกายน?

### ส่วนที่โจทย์กำหนดไว้แล้ว

ใช้ [Theme 7 coverage และ proposed sprint allocation](../assessment-plan.md#whole-product-coverage-and-proposed-sprint-allocation) และ [GLOSSARY](../../GLOSSARY.md) เป็นฐาน ไม่ลด scope เหลือ generic expense CRUD หรือให้ Administrator อ่านข้อมูลการเงิน

### เรื่องที่ต้องตัดสินก่อนเขียน contract

| เรื่อง | ประเด็นที่ต้องระบุและกรณีทดสอบ |
| --- | --- |
| เงินและสกุลเงิน | สกุลเงินที่รองรับ, precision/scale, จำนวนสูงสุด, zero/negative amount และวิธีจัดการเศษ ห้ามปล่อยให้ floating-point rounding เป็นกติกาโดยบังเอิญ |
| Balance convention | Cash, Loan Given, Loan Taken, Income, Expense แสดงยอดและเครื่องหมายอย่างไร; opening balances ของแต่ละประเภทมีผลอย่างไร |
| Allocation compatibility | แต่ละ transaction form ใช้ source/destination account ประเภทใดได้; ทุกบัญชีที่อ้างต้องเป็นของผู้ใช้; sum(lines) ต้องเท่ากับ total |
| Atomicity | หากบรรทัดหนึ่งผิดหรือบันทึกล้มเหลว ต้องไม่มีบางยอด/บางบรรทัดถูกเขียนค้าง ตรวจผลผ่าน API ที่อ่าน balances และ history ได้ |
| Opening balance | วันที่ที่มีผล, อนุญาตแก้เมื่อมีรายการแล้วหรือไม่ และทำให้ยอดถูกต้องโดยไม่นับเป็น Income/Expense อย่างไร |
| Dates and summaries | รูปแบบวันที่/time zone, วันอนาคต/ย้อนหลังที่อนุญาต, ขอบเขตช่วงรายงานและวันที่ตัดยอด |
| Correction | แก้ธุรกรรมเดิมหรือใช้ reversal/replacement; รักษาประวัติและผลต่อยอดอย่างไร; จัดไว้ sprint ใด |
| Duplicate and retries | การ Duplicate ให้แก้ไข/ยืนยันเมื่อใด; แยกการทำรายการซ้ำโดยตั้งใจจาก retry ของ request; กำหนด policy เท่าที่ contract จำเป็น |
| Administration | การเปิด/ปิดผู้ใช้มีผลต่อ session อย่างไร; ขั้นต่ำที่ทำให้ Admin role มีงานจริง; financial APIs ต้องปฏิเสธ Admin ด้วย |
| Sprint boundary | บัญชี/transaction types ใดมี UI ครบใน Sprint 1 และส่วนใดใช้ reproducible seed; สิ่งที่เหลือต้องลง Sprint 2/3 ไม่หายจาก inventory |
| Test seams | public domain interface, HTTP API + real test DB และ UI journeys ใดจะตรวจจริง; ยืนยันก่อนเขียน executable tests |

### ตัวอย่างช่วยตรวจความหมาย

**คำอธิบายเสริม: ชุดตัวเลขเสนอเพื่อใช้ทดสอบ ไม่ใช่ข้อมูลจากอาจารย์หรือ policy ที่ทีมอนุมัติแล้ว** สมมติเป็นเงินสกุลเดียวและรายการทั้งหมดอยู่ในช่วงรายงานเดียวกัน

| ขั้นตอน | Bank balance | Credit-card debt | Income | Expense |
| --- | ---: | ---: | ---: | ---: |
| ตั้ง opening bank balance 10,000 | 10,000 | 0 | 0 | 0 |
| รับเงินเดือน 20,000 เข้าธนาคาร | 30,000 | 0 | 20,000 | 0 |
| ซื้อด้วยบัตรเครดิต 1,200: dining 700 + groceries 500 | 30,000 | 1,200 | 20,000 | 1,200 |
| ชำระบัตร 500 จากธนาคาร | 29,500 | 700 | 20,000 | 1,200 |

ควรอ่านรายการที่บันทึกกลับมาได้ ปฏิเสธ allocation เช่น 700 + 400 ที่ไม่เท่ากับ total 1,200 โดยไม่เปลี่ยนยอด และปฏิเสธ User B หรือ Administrator ที่พยายามอ่าน/เปลี่ยน financial records ของ User A Expected values ใช้ตัวเลขอิสระที่ตกลงกัน ไม่คำนวณซ้ำด้วย algorithm เดียวกับโค้ดเพื่อให้ test ผ่านเอง

### Done when

เขียนคำตอบที่เลือกลง SRS/System SDS/feature contracts พร้อม expected results และเหตุผลของข้อยกเว้น ทีมทั้งสองคนอธิบายได้ จึงเปลี่ยนงานถัดไปเป็น bounded implementation task ได้ ยังไม่ต้องออกแบบทุก endpoint ของ Sprint 3 ให้ตายตัวก่อนเริ่ม Sprint 1
