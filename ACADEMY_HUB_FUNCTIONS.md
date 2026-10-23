# Academy Hub - Toan bo chuc nang va dac ta trai nghiem nguoi hoc

> Tai lieu nay mo ta Academy Hub tu goc nhin nguoi hoc. Noi dung duoc doi chieu voi frontend hien tai, dong thoi tach ro chuc nang da co, chuc nang dang mock va capability can phat trien de tro thanh san pham hoan chinh.

## 1. Tong quan

### 1.1. Academy Hub la gi?

Academy Hub la khong gian hoc tap ca nhan trong Prism Studio. Nguoi hoc co the:

- Quan ly khoa hoc, bai giang va tai lieu.
- Doc va xem truoc courseware trong nhieu dinh dang.
- Dat cau hoi cho AI Tutor dua tren tai lieu hoc tap.
- Tao bai kiem tra, quiz va flashcard theo chuong hoc.
- Nop bai lap trinh de nhan phan tich rubric.
- Tim kiem ngu nghia tren kho courseware da vector hoa.
- Theo doi tien do, muc do nam vung va khoang trong kien thuc.
- Dieu chinh cach AI Tutor day hoc, muc tieu hoc tap va thong bao.

### 1.2. Doi tuong su dung

| Doi tuong | Nhu cau chinh | Khu vuc su dung |
| --- | --- | --- |
| Sinh vien | Hoc bai, hoi dap, luyen quiz, xem tien do | Toan bo Academy Hub |
| Nguoi tu hoc ky thuat | Tim kiem tai lieu va giai thich code | Documents, Conversations, Socratic Tutor |
| Nguoi chuan bi thi | Tao de, lam bai, xem giai thich va diem | Quizzes, Exam Prep, Analytics |
| Nguoi nop bai lab | Kiem tra test case, Big-O va rubric | Assignment Grader |

### 1.3. Route va entry point

- Route chinh: `/academy-hub`.
- `Overview` dieu huong nguoi dung vao Academy Hub.
- Academy Hub la man hinh doc lap, khong nam trong `Layout` chung.
- Session duoc doc tu `localStorage` qua key `rag_session`.
- `workspaceId` duoc lay tu session; neu khong co thi dung workspace mac dinh.

### 1.4. Trang thai trien khai hien tai

| Ky hieu | Y nghia |
| --- | --- |
| `UI` | Giao dien va tuong tac da duoc dung trong frontend |
| `API` | Da co ket noi API hoac hop dong API ro rang |
| `LOCAL` | Luu trong React state/localStorage, chua co persistence server |
| `MOCK` | Du lieu hard-coded de minh hoa luong |
| `PLACEHOLDER` | Nut/giao dien co mat nhung chua thuc thi day du |
| `PROPOSED` | De xuat capability cho phien ban hoan chinh |

> Trong implementation hien tai, `Documents` la khu vuc co ket noi API ro rang nhat. Courses, Quizzes, Analytics, Conversations va cac workspace AI van co nhieu du lieu mock, local state hoac hanh vi mo phong.

## 2. Shell dung chung

### 2.1. EduSidebar

**Muc dich:** Dieu huong giua cac khu vuc hoc tap va mo cac AI tool.

**Thanh phan:**

- Brand Prism Studio va nhan `EDU`.
- Nut thu gon sidebar thanh rail 58px.
- Quick Search voi phim tat hien thi `Ctrl+K`.
- Menu: Home, Courses, Documents, Edu Tools, Conversations, Quizzes, Analytics, Settings.
- Accordion con cua Edu Tools:
  - Socratic Code Tutor.
  - Exam & Quiz Prep.
  - Assignment Grader.
  - Courseware RAG Index.
- Profile pill o cuoi sidebar.
- Click profile de quay ve Hub Matrix `/overview`.

**Hanh vi:**

1. Chon tab se thay doi noi dung chinh.
2. Chon Edu Tools se mo danh sach tool neu dang o workspace.
3. Chon sub-tool se mo workspace full-screen va tu dong thu gon sidebar.
4. Click brand de thu gon/mo rong sidebar.
5. Khi dang o workspace, nut Back to Edu Tools se quay lai catalog tool.
6. Khi chuyen khoi tab Tools, sub-tool dang mo se duoc reset.

**Trang thai can co:**

- Active tab va active sub-tool.
- Collapsed rail co tooltip day du.
- Mobile drawer thay cho sidebar co dinh.
- Disabled/loading neu dang tai danh sach menu tu server.
- Permission state neu sau nay co course private hoac workspace rieng.

**Trang thai hien tai:** `UI`, navigation la local state; quick search hien tai dieu huong sang Documents, chua phai global search thuc su.

### 2.2. EduNavbar

**Thanh phan:**

- Breadcrumb: Prism Studio / Academy Hub / tab hien tai.
- Streak metric: `7 Days Streak`.
- Vectorized metric: `42 Syllabus Vectorized`.
- Nut `Upload Courseware`.

**Kha nang mong muon:**

- Breadcrumb co the click de quay ve Home/Overview.
- Metric lay tu analytics that.
- Upload mo modal chon file, course, visibility va indexing options.
- Hien thi indexing progress thay vi chi hien nut upload.

**Trang thai hien tai:** `UI` + `MOCK`; nut Upload Courseware dang goi `alert`.

## 3. Home / Dashboard

### 3.1. Muc tieu

Home la diem vao hang ngay, giup nguoi hoc biet can hoc gi tiep theo va truy cap nhanh den hoat dong phu hop.

### 3.2. Cac thanh phan

#### A. Continue Learning banner

- Hien thi khoa hoc, module va chu de dang hoc.
- Vi du hien tai: `CS204 - Algorithms & Complexity - Module 4`.
- Mo ta buoc hoc tiep theo: Dijkstra/Shortest Path.
- Nut `Resume with Tutor` mo Socratic Tutor.

#### B. KPI cards

- `Active Courses`: so khoa hoc dang theo hoc.
- `Average Mastery`: muc do nam vung trung binh.
- `Quizzes Solved`: so quiz da giai.
- `Study Time`: thoi gian hoc trong thang.
- Moi KPI nen co period, trend va link xem chi tiet.

#### C. Current Syllabus Progress

Moi course row co:

- Ma mon hoc.
- Ten mon hoc.
- Phan tram tien do.
- Progress bar.
- Bai/module tiep theo.
- Link `All courses` den Courses.

#### D. Instant AI Drill & Mock Exam

- Goi y quiz nhanh tu cac chu de yeu.
- Hien thi so cau, thoi gian uoc tinh va adaptive difficulty.
- Goi y nop bai lab de nhan rubric.
- Mo Exam Prep hoac Assignment Grader.

### 3.3. Hanh trinh nguoi hoc

1. Mo Home.
2. Xem bai dang hoc do dang.
3. Chon Resume with Tutor.
4. Hoi dap voi Socratic Tutor.
5. Quay lai Home va nhan drill tu diem yeu.
6. Xem ket qua tren Quizzes va Analytics.

### 3.4. Trang thai can co

- Chua co khoa hoc: onboarding `Join Course`.
- Chua co lich su hoc: empty state va goi y upload tai lieu.
- Dang tai KPI/course progress.
- Loi khi analytics khong san sang.
- Khong co goi y drill: thong bao da hoan thanh muc tieu.
- Streak sap mat: nhac hoc trong ngay.

**Trang thai hien tai:** `UI`, du lieu courses/KPI/goi y dang `MOCK`.

## 4. Courses

### 4.1. Muc tieu

Cho phep nguoi hoc quan ly danh sach mon hoc da tham gia, xem tien do va mo tai lieu/tac vu hoc tap theo tung course.

### 4.2. Danh sach khoa hoc

Moi course card hien thi:

- Course code, vi du `CS204`.
- Ten course.
- Hoc ky.
- Giang vien.
- So luong tai lieu.
- Phan tram tien do.
- Thanh progress mini.
- Trang thai co the suy ra: in progress, almost done, completed.

### 4.3. Tim kiem va bo loc

- Tim theo ten khoa hoc.
- Tim theo course code.
- `All`.
- `In Progress`.
- `Almost Done`.
- Nen bo sung `Completed`, `Archived`, hoc ky va giang vien.
- Ket qua rong can hien ly do va nut xoa bo loc.

### 4.4. Course detail

Khi chon mot course, nguoi hoc xem:

- Course title, instructor, semester.
- So file course material.
- So module da hoan thanh/tren tong so module.
- Trang thai hoc ky, vi du `On Track`.
- Danh sach syllabus file.
- Ten tai lieu, kich thuoc, ngay them, trang thai indexing.

### 4.5. Hanh dong hoc tap

- `Ask Tutor`: mo Socratic Tutor cho course dang chon.
- `Practice Exam`: mo Exam Prep voi course mac dinh.
- `Upload Material`: them tai lieu vao course.
- `Download`: tai file.
- `Options`: menu doi ten, gan tag, xoa, xem chi tiet.
- `Join Course`: tham gia bang course code/invite code.
- Mo mot file de xem Documents voi filter course.

### 4.6. Chuc nang nen co them

- Tao course plan tu syllabus.
- Danh dau module da hoc.
- Dat deadline va milestone.
- Course calendar.
- Phan quyen owner/member.
- Dong bo course voi lop hoc.
- Version tai lieu va thong bao tai lieu moi.

**Trang thai hien tai:** `UI` + `MOCK`; nut upload/download/options/join chua co flow day du va chua noi course API.

## 5. Documents

### 5.1. Muc tieu

Documents la kho tai lieu hoc tap va man hinh doc tai lieu theo mo hinh master-detail.

### 5.2. Upload

Nguoi hoc co the upload:

- PDF.
- DOC/DOCX.
- XLS/XLSX.
- PPT/PPTX.
- Markdown.
- TXT.

Flow hien tai:

1. Click `Upload Material`.
2. Chon file tu may.
3. Goi `documentApi.upload(file, workspaceId, "GEN")`.
4. Tai lai danh sach tai lieu.
5. Chon tai lieu moi.
6. Hien loading trong luc upload.

Capability nen co them:

- Chon course code truoc khi upload.
- Gioi han dung luong va validate MIME type.
- Upload nhieu file.
- Hien tien do upload.
- Hien tien do parsing/chunking/embedding.
- Retry file that bai.
- Huy upload.
- Hien ly do indexing error.

### 5.3. Danh sach va filter

- Tim theo title/filename.
- Tim theo course code.
- Filter `All`, `PDF`, `DOCX`, `XLSX`, `PPTX`, `MD`.
- Hien icon theo dinh dang.
- Hien kich thuoc, course tag va trang thai `Ready`.
- Hien tong so file.
- Chon mot file de xem preview.
- Xoa file voi confirm dialog.

### 5.4. Preview

| Dinh dang | Hanh vi hien tai |
| --- | --- |
| PDF | iframe tu preview URL |
| DOC/DOCX | Tai blob va render bang `docx-preview` |
| MD/TXT | Fetch text va hien trong `pre/code` |
| XLS/XLSX/PPT/PPTX | Hien fallback, cho download offline |
| Khac | Fallback download |

Thanh cong cu preview co:

- Ten file, kich thuoc, ngay upload.
- Zoom out/in tu 70% den 150%.
- `Ask Tutor` voi tai lieu dang chon.
- Download file.

### 5.5. API hien tai

- `GET /documents?workspaceId=...&fileType=...`.
- `POST /documents/upload`.
- `DELETE /documents/{id}`.
- Preview: `/documents/{id}/preview`.
- Download: `/documents/{id}/download`.
- `GET /documents/{id}` va `POST /documents` da co helper nhung chua duoc su dung trong man hinh nay.

### 5.6. Trang thai can co

- Loading danh sach.
- Empty kho tai lieu.
- Khong co ket qua theo search/filter.
- Uploading.
- Upload thanh cong.
- Upload that bai.
- Indexing.
- Indexing that bai.
- Preview dang tai.
- Preview khong ho tro.
- Mat quyen truy cap.
- File bi xoa boi nguoi khac.

### 5.7. Dong bo voi Conversations

Sau khi tai danh sach, Documents luu `academy_hub_documents` vao localStorage. Conversations doc key nay de hien tai lieu cho modal attach. Can thay bang shared document store/API trong production de tranh lech du lieu giua hai man hinh.

**Trang thai hien tai:** `API` cho list/upload/delete/preview/download; localStorage la cau noi tam thoi voi Conversations; XLSX/PPTX chua preview noi dung.

## 6. Conversations

### 6.1. Muc tieu

Cho phep nguoi hoc duy tri cac phien hoc voi AI, tim lai hoi dap cu va gui cau hoi co context tu tai lieu.

### 6.2. Conversation history

Moi session card co:

- Course code.
- Tool name.
- Tieu de.
- Preview tin nhan gan nhat.
- Thoi gian.
- So luong message.
- Nut xoa session.

Hanh dong:

- Tim session theo title/course code.
- Chon session de xem chi tiet.
- Tao `New Tutoring Session`.
- Restart topic.
- Xoa session.
- Bao cao session da xoa va chon session ke tiep.

### 6.3. Chat viewport

- Header co course code, tieu de, engine va so exchanges.
- Phan biet message cua AI va nguoi hoc.
- Hien avatar, sender va timestamp.
- Ho tro text message.
- Hien file dinh kem trong message nguoi dung.
- Hien RAG citation.
- Hien code block.
- Copy code va hien feedback `Copied`.

### 6.4. Composer

- Textarea nhap cau hoi.
- Enter de gui.
- Shift+Enter de xuong dong.
- Nut attach document.
- Hien danh sach file dang gan.
- Xoa tung file dinh kem.
- Disable send neu khong co text va khong co file.
- Gui message kem danh sach file.

### 6.5. Attach document modal

Tab `Existing Documents`:

- Hien so document trong kho.
- Tim theo title/course.
- Chon bo nhieu file.
- Hien type, course, size, chunks.
- Toggle selected/unselected.

Tab `Upload New from Computer`:

- Mo file picker.
- Ho tro PDF, DOCX, XLSX, PPTX, MD.
- Tao document local.
- Luu vao localStorage.
- Tu dong gan file moi vao prompt.

### 6.6. AI response production nen co

- Streaming token.
- Cancel generation.
- Retry response.
- Regenerate.
- Feedback thumbs up/down.
- Citation click de mo dung page/paragraph.
- Citation confidence va source list.
- Markdown/code rendering an toan.
- Context window warning.
- Bao loi retrieval/generation.
- Luu session server-side theo user/workspace.

**Trang thai hien tai:** `UI` + `LOCAL` + `MOCK`; message AI duoc tao local, chua goi chat backend trong component nay.

## 7. Quizzes va Assessments

### 7.1. Muc tieu

Giup nguoi hoc luyen tap, kiem tra muc do nho hieu va nhan giai thich dua tren courseware.

### 7.2. Assessment list

Moi quiz co:

- Course code va course title.
- Tieu de/chuyen de.
- So cau hoi.
- Thoi luong.
- Difficulty: Easy/Medium/Hard.
- Status: New/In Progress/Completed.
- Diem gan nhat.
- Thoi diem lam gan nhat.

Tim kiem va filter:

- Tim theo title/course code.
- All.
- Completed.
- Unattempted.
- Nen bo sung In Progress, difficulty, score range va due date.

### 7.3. Sample question preview

- Hien vi tri cau hoi `1 / total`.
- Hien RAG source va page.
- Hien noi dung cau hoi.
- Hien cac lua chon A/B/C/D.
- Cho phep chon mot dap an.
- Disable verify neu chua chon.
- `Verify Answer & View AI Rationale`.
- To mau dap an dung/sai.
- Hien explanation.
- `Retry Question`.

### 7.4. Full assessment can co

1. Xac nhan quiz va rules.
2. Bat dau timer.
3. Dieu huong cau truoc/cau sau.
4. Luu dap an tam thoi.
5. Flag cau hoi.
6. Autosave.
7. Submit confirmation.
8. Cham diem.
9. Hien review tung cau.
10. Hien citation va explanation.
11. Tao drill tiep theo tu cau sai.
12. Cap nhat Analytics va knowledge gaps.

**Trang thai hien tai:** `UI` + `MOCK`; sample question co tuong tac, nhung chua co attempt lifecycle, scoring persistence hay AI generation that.

## 8. Analytics

### 8.1. Muc tieu

Analytics bien du lieu hoc tap thanh hanh dong tiep theo, khong chi hien diem so.

### 8.2. Time range

- 7 Days.
- 30 Days.
- Full Term.
- Nen co custom range, timezone va filter theo course/tool.

### 8.3. KPI

- Overall Mastery Score.
- Socratic Tutoring Hours.
- Assessment Accuracy.
- Identified Knowledge Gaps.
- Nen co them streak, study minutes, completion rate va trend so voi ky truoc.

### 8.4. Technical Competency Breakdown

Moi skill row co:

- Course code.
- Ten ky nang.
- Mastery percentage.
- Status: Advanced, Proficient, Needs Practice.
- Progress bar.
- Link toi drill/tutor theo skill.

### 8.5. Knowledge gaps

Moi gap nen co:

- Topic.
- Course.
- Impact: High/Medium/Low.
- Ly do duoc phat hien.
- Evidence tu cau sai/bai chua nop.
- Suggested tool.
- Nut `Practice now`.
- Dismiss/snooze gap.

### 8.6. Recent scores

- Ten bai test.
- Diem.
- Ngay lam.
- Delta so voi lan truoc.
- Mo review assessment.
- Tao drill tu cau sai.

**Trang thai hien tai:** `UI` + `MOCK`; cac metrics/skills/gaps/scores dang hard-coded, time range chi thay doi local state.

## 9. Settings

### 9.1. Student Profile

Nguoi hoc co the chinh sua:

- Ho ten.
- Email.
- Truong/don vi.
- Student ID/MSSV.
- Major/chuyen nganh.
- Nam hoc.

Nen co them:

- Avatar.
- Timezone.
- Mui gio hoc.
- Mat khau/bao mat.
- Xac minh email.

### 9.2. AI Tutor Preferences

- Explanation approach:
  - Guided Learning.
  - Comprehensive Direct Answers.
- Tone:
  - Encouraging & Supportive.
  - Friendly & Casual.
  - Academic & Formal.
- Auto quiz sau khi giai thich.
- Language preference: Vietnamese, English, bilingual.
- Nen co temperature/verbosity, citation policy, code language va safe completion settings.

### 9.3. Study Goals & Focus

- Daily Study Target: 15-180 phut.
- Weekly Quiz Target.
- Auto-generate flashcards.
- Focus Mode.
- Nen co muc tieu theo course, deadline, weekly review plan va preferred study slots.

### 9.4. Reminders & Alerts

- Daily Study Reminders.
- Course Deadline Alerts.
- Study Streak Keeper.
- Weekly Learning Summary.
- Nen co notification channel, quiet hours va lich thong bao.

### 9.5. Save va persistence

- Nut Save Changes.
- Feedback `Saved Changes` trong 2.5 giay.
- Production can luu theo user profile qua API.
- Can co dirty state, unsaved changes warning, validation va rollback.

**Trang thai hien tai:** `UI` + `LOCAL`; state chi ton tai trong component, refresh trang se mat thay doi.

## 10. Edu Tools catalog

Catalog hien co 4 tool:

| Tool | Muc tieu | Input chinh | Output chinh | Trang thai |
| --- | --- | --- | --- | --- |
| Socratic Code Tutor | Hoc theo cau hoi dan dat | Code/module/cau hoi | Hint, giai thich, doi thoai | `UI` + `MOCK` |
| Exam & Quiz Prep | Tao bai luyen thich ung | Course, chapter, difficulty, so cau | Practice assessment | `UI` + `MOCK` |
| Assignment Grader | Tu dong review bai nop | Source code/submission | Scorecard, tests, rubric | `UI` + `MOCK` |
| Courseware RAG Index | Tim kiem courseware | Query nghia, filters | Chunks, citations, graph links | `UI` + `MOCK` |

## 11. Socratic Code Tutor workspace

### 11.1. Giao dien

- Header co Back to Edu Tools.
- Badge `SOCRATIC AI`.
- Course/module breadcrumb.
- Code canvas voi file name va code.
- Chat panel voi `Socratic Mentoring Assistant`.
- Tutor mode `Guiding Mode`.
- Quick hint `Compare with BFS Queue`.
- Input tra loi/hoi them.

### 11.2. Hanh vi hoc tap

1. Tutor chi ra dong code hoac concept.
2. Dat cau hoi dan dat.
3. Nguoi hoc tra loi.
4. AI phan hoi hint tiep theo.
5. Nguoi hoc co the yeu cau giai thich truc tiep.
6. Luu transcript vao Conversations.
7. Tao quiz tu concept dang hoc.

### 11.3. Capability nen co

- Chon code range.
- Highlight dong dang thao luan.
- Explain line/function/algorithm.
- Compare implementation.
- Run code sandbox an toan.
- Hint levels tu nhe den chi tiet.
- Phat hien nguoi hoc dang bi mac.
- Citation toi lecture page.
- Resume dung module cu.

**Trang thai hien tai:** chat response la local mock, code canvas read-only, chua co streaming/AI backend.

## 12. Exam & Quiz Prep workspace

### 12.1. Cau hinh

- Chon course material.
- Nhap chapter/concepts.
- Chon difficulty Easy/Medium/Hard.
- Chon so cau hoi 5-25.
- Generate Practice Drill.
- Hien processing `Synthesizing RAG Questions...`.

### 12.2. Preview

- Tieu de generated assessment.
- So luong cau.
- Nguon PDF da vector hoa.
- Cau hoi single-choice.
- Lua chon dap an.
- Preview dap an dung.

### 12.3. Capability nen co

- Chon question types: MCQ, true/false, short answer, coding.
- Random seed/khong lap cau.
- Phan bo do kho.
- Tieu chi learning objectives.
- Generate lai tung cau.
- Luu assessment.
- Start attempt.
- Cham diem va update analytics.
- Tao flashcard tu cau sai.

**Trang thai hien tai:** control difficulty/number co local state; course/concept va generated pool chua noi generator that.

## 13. Assignment Grader workspace

### 13.1. Giao dien

- Header Back to Edu Tools.
- Badge `AUTO RUBRIC`.
- Submission file.
- Code canvas.
- Nut `Run Automated Rubric`.
- Score ring `95/100`.
- Overall evaluation.
- Functional unit tests.
- Time complexity.
- Clean code/comments warning.

### 13.2. Luong production

1. Upload file hoac chon submission.
2. Chon assignment/rubric.
3. Validate language va dependency.
4. Chay trong sandbox khong co quyen nguy hiem.
5. Chay hidden/public tests.
6. Phan tich correctness, complexity, style va security.
7. Tao scorecard co evidence.
8. Cho nguoi hoc request regrade neu rubric sai.
9. Luu ket qua vao history va Analytics.

### 13.3. Yeu cau an toan

- Container isolation.
- CPU/memory/time limit.
- Khong network neu khong can.
- Khong truy cap secret/file host.
- Gioi han output.
- Log audit.
- Khong thuc thi code tren client.

**Trang thai hien tai:** ket qua rubric dang mock, nut grade chi mo phong loading bang `setTimeout`.

## 14. Courseware RAG & Knowledge Graph Explorer

### 14.1. Tim kiem

- Nhap natural-language query.
- Nut `Query RAG Index`.
- Tim tren tat ca syllabus da vector hoa.
- Nen co filter course, document, page, date, score va node type.

### 14.2. Ket qua

Moi citation card co:

- Ten document.
- Cosine match score.
- Page/paragraph.
- Snippet.
- `View in Neo4j Graph`.
- `Open PDF Page`.

### 14.3. Capability nen co

- Hybrid dense + keyword retrieval.
- Reranking.
- Multi-hop graph traversal.
- Highlight chunk trong tai lieu.
- Hien parent/child concept.
- Explain tai sao ket qua duoc chon.
- Ghim citation vao conversation.
- Query history.
- Export citations.
- Fallback khi index chua san sang.

**Trang thai hien tai:** query/results hard-coded; hai nut citation chua co handler thuc te.

## 15. Ma tran man hinh va chuc nang

| Man hinh | Hoc | Tim kiem | Upload | AI | Theo doi | Persistence hien tai |
| --- | --- | --- | --- | --- | --- | --- |
| Home | Resume, progress | Khong | Shortcut | Tutor, drill | KPI | Mock |
| Courses | Course progress, syllabus | Course search | Placeholder | Tutor, exam | Progress | Mock |
| Documents | Doc preview | Title/type/course | API upload | Ask Tutor | Index status | API + localStorage |
| Conversations | Chat session | History search | Attach/upload | RAG reply mock | Session count | Local state |
| Quizzes | Sample drill | Quiz search/filter | Khong | Rationale mock | Score mock | Mock |
| Analytics | Skill remediation | Time range | Khong | Suggested tool | Mastery/gaps | Mock |
| Settings | Goals/preferences | Khong | Khong | Tutor behavior | Streak/reminders | Local state |
| Tutor | Guided coding | Khong | Chua | Socratic chat mock | Transcript | Local state |
| Exam Prep | Practice assessment | Khong | Chua | Question synthesis mock | Attempt | Local state |
| Grader | Submission review | Khong | Chua | Rubric mock | Scorecard | Local state |
| RAG Explorer | Courseware Q&A | Semantic query | Khong | Retrieval mock | Query history | Local state |

## 16. Learner journey de xuat

### Journey A: Hoc bai moi

1. Vao Academy Hub.
2. Home goi y course/module tiep theo.
3. Mo Courses de xem syllabus.
4. Mo Documents va doc lecture.
5. Chon Ask Tutor.
6. Hoc bang hint Socratic.
7. Lam quiz tu chapter.
8. Xem ket qua va knowledge gap.

### Journey B: Upload tai lieu va hoi dap

1. Upload courseware.
2. Chon course code.
3. Theo doi parsing/chunking/indexing.
4. Xac nhan trang thai Ready.
5. Mo preview.
6. Ask Tutor voi tai lieu dang chon.
7. Xem citation ve dung page.
8. Luu conversation.

### Journey C: Chuan bi thi

1. Chon course va chapter.
2. Tao adaptive drill.
3. Lam full assessment co timer.
4. Xem review tung cau.
5. Tao flashcard tu cau sai.
6. Xem Analytics va lap lich on tap.

### Journey D: Nop bai lab

1. Mo Assignment Grader.
2. Upload submission.
3. Chon rubric.
4. Chay sandbox tests.
5. Xem scorecard va evidence.
6. Sua bai.
7. Submit lai.
8. Theo doi tien bo qua Analytics.

## 17. Gap va backlog uu tien

### P0 - Can co de dung production

- Ket noi chat AI that va streaming.
- Persistence cho courses, sessions, quiz attempts, settings va analytics.
- Authentication/authorization theo user va workspace.
- Upload/indexing pipeline co status va retry.
- Quiz attempt lifecycle va scoring server-side.
- Secure code execution cho grader.
- Error handling thong nhat, khong dung `alert` cho flow chinh.
- Validate file type/size va permission.

### P1 - Nang chat luong hoc tap

- Citation click toi page/paragraph.
- Adaptive difficulty dua tren lich su lam bai.
- Knowledge gap model co evidence.
- Flashcard va spaced repetition.
- Course calendar/deadline.
- Multi-file upload.
- Markdown rendering an toan.
- Responsive mobile layout.
- Accessibility keyboard/focus/ARIA.

### P2 - Mo rong san pham

- Knowledge graph explorer day du.
- Peer study/group workspace.
- Instructor feedback.
- Course recommendation.
- Export report/transcript.
- Offline reading.
- Gamification va streak rules.
- Custom rubric cho assignment.

## 18. Acceptance criteria tong quat

### Data va persistence

- Reload trang khong lam mat settings, sessions, attempts hay progress.
- Du lieu cua user A khong the doc du lieu user B.
- Moi mutation co loading, success, error va retry.

### Documents va RAG

- File upload co validate, progress va indexing status.
- Tai lieu Ready moi duoc dung lam context.
- Moi AI answer co citation neu co source.
- Xoa file cap nhat Documents, attachment picker va RAG index.

### Quizzes

- Moi attempt co id, status, start time, answers, submit time va score.
- Timer khong bi reset khi refresh.
- Ket qua cap nhat Analytics va knowledge gaps.
- Explanation chi hien sau khi submit/verify theo rule da chon.

### Grader

- Code khong chay truc tiep tren browser/backend process khong sandbox.
- Ket qua co test evidence, timeout state va rubric version.
- Khong co diem mock hien khi chua co submission that.

### UX va accessibility

- Moi nut co label/tooltip ro rang.
- Keyboard co the di qua navigation, modal, quiz va composer.
- Khong mat du lieu khi doi tab neu dang co draft.
- Mobile khong bi tran noi dung.
- Empty/error state luon co hanh dong tiep theo.

## 19. Phan loai theo implementation

### Da co UI tuong doi day du

- Navigation va sub-tool routing.
- Home dashboard layout.
- Course master-detail.
- Document master-detail va preview co ban.
- Conversation history/chat layout.
- Quiz sample interaction.
- Analytics presentation.
- Settings forms.
- Bốn workspace layout.

### Da co API ro rang

- List documents theo workspace.
- Upload document.
- Delete document.
- Preview document.
- Download document.

### Dang local/mock

- Course data.
- Home KPI va recommendations.
- Conversation sessions va AI response.
- Quiz catalog, score va rationale.
- Analytics data.
- Settings persistence.
- Tutor response.
- Exam generation.
- Grader result.
- RAG result va graph/PDF action.

### Dang placeholder

- Navbar `Upload Courseware`.
- Course `Join Course`.
- Course upload/options.
- Citation `View in Neo4j Graph`.
- Citation `Open PDF Page`.
- Real-time AI generation.
- Secure assignment execution.

## 20. File tham chieu trong codebase

- `frontend/src/App.jsx` - route `/academy-hub`.
- `frontend/src/pages/academy-hub/AcademyHub.jsx` - shell va tab state.
- `frontend/src/pages/academy-hub/components/EduSidebar.jsx` - navigation.
- `frontend/src/pages/academy-hub/components/EduNavbar.jsx` - breadcrumb va metrics.
- `frontend/src/pages/academy-hub/tabs/home/EduHome.jsx` - dashboard.
- `frontend/src/pages/academy-hub/tabs/courses/Courses.jsx` - courses.
- `frontend/src/pages/academy-hub/tabs/documents/Documents.jsx` - document management.
- `frontend/src/api/documents.js` - document API.
- `frontend/src/pages/academy-hub/tabs/conversations/Conversation.jsx` - chat sessions.
- `frontend/src/pages/academy-hub/tabs/quizzes/Quizzes.jsx` - assessments.
- `frontend/src/pages/academy-hub/tabs/analytics/Analytics.jsx` - learning analytics.
- `frontend/src/pages/academy-hub/tabs/settings/Setting.jsx` - preferences.
- `frontend/src/pages/academy-hub/tabs/tools/EduTools.jsx` - tool catalog.
- `frontend/src/pages/academy-hub/tabs/tools/workspaces/SocraticTutorWorkspace.jsx` - tutor workspace.
- `frontend/src/pages/academy-hub/tabs/tools/workspaces/ExamPrepWorkspace.jsx` - exam preparation.
- `frontend/src/pages/academy-hub/tabs/tools/workspaces/AssignmentGraderWorkspace.jsx` - assignment grader.
- `frontend/src/pages/academy-hub/tabs/tools/workspaces/CoursewareRAGWorkspace.jsx` - RAG explorer.
