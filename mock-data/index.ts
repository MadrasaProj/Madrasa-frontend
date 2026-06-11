// Mock Students
export const students = [
  {
    id: "S001",
    admissionNumber: "MDA-2024-001",
    name: "Ahmed Bin Abdullah",
    gender: "male",
    dateOfBirth: "2014-03-12",
    address: "12, Mosque Road, Calicut",
    photo: null,
    class: "Class 4",
    division: "A",
    joiningDate: "2024-06-01",
    parentId: "P001",
    fatherName: "Abdullah Rahman",
    motherName: "Fathima Bivi",
    phone: "9876543210",
  },
  {
    id: "S002",
    admissionNumber: "MDA-2024-002",
    name: "Ibrahim Khaleel",
    gender: "male",
    dateOfBirth: "2013-08-22",
    address: "45, Palm Street, Calicut",
    photo: null,
    class: "Class 4",
    division: "A",
    joiningDate: "2024-06-01",
    parentId: "P002",
    fatherName: "Khaleel Ahmed",
    motherName: "Mariam Beevi",
    phone: "9876543211",
  },
  {
    id: "S003",
    admissionNumber: "MDA-2024-003",
    name: "Yusuf Salim",
    gender: "male",
    dateOfBirth: "2014-01-05",
    address: "78, Green Lane, Calicut",
    photo: null,
    class: "Class 4",
    division: "A",
    joiningDate: "2024-06-01",
    parentId: "P003",
    fatherName: "Salim Mohammed",
    motherName: "Zainab Beevi",
    phone: "9876543212",
  },
  {
    id: "S004",
    admissionNumber: "MDA-2024-004",
    name: "Fatima Zahra",
    gender: "female",
    dateOfBirth: "2014-05-15",
    address: "33, Rose Garden, Calicut",
    photo: null,
    class: "Class 4",
    division: "B",
    joiningDate: "2024-06-01",
    parentId: "P004",
    fatherName: "Zakariya Hassan",
    motherName: "Khadija Beevi",
    phone: "9876543213",
  },
  {
    id: "S005",
    admissionNumber: "MDA-2024-005",
    name: "Aisha Siddiqui",
    gender: "female",
    dateOfBirth: "2013-11-30",
    address: "22, Crescent Avenue, Calicut",
    photo: null,
    class: "Class 4",
    division: "B",
    joiningDate: "2024-06-01",
    parentId: "P005",
    fatherName: "Siddique Ali",
    motherName: "Ruqaiya Beevi",
    phone: "9876543214",
  },
  {
    id: "S006",
    admissionNumber: "MDA-2024-006",
    name: "Umar Farooq",
    gender: "male",
    dateOfBirth: "2015-02-18",
    address: "56, Hilal Street, Calicut",
    photo: null,
    class: "Class 3",
    division: "A",
    joiningDate: "2024-06-01",
    parentId: "P001",
    fatherName: "Abdullah Rahman",
    motherName: "Fathima Bivi",
    phone: "9876543210",
  },
  {
    id: "S007",
    admissionNumber: "MDA-2024-007",
    name: "Maryam Noor",
    gender: "female",
    dateOfBirth: "2015-07-09",
    address: "90, Jasmine Road, Calicut",
    photo: null,
    class: "Class 3",
    division: "A",
    joiningDate: "2024-06-01",
    parentId: "P006",
    fatherName: "Noor Mohammed",
    motherName: "Hafsa Beevi",
    phone: "9876543215",
  },
  {
    id: "S008",
    admissionNumber: "MDA-2024-008",
    name: "Hamza Rashid",
    gender: "male",
    dateOfBirth: "2016-04-25",
    address: "14, Olive Street, Calicut",
    photo: null,
    class: "Class 2",
    division: "A",
    joiningDate: "2024-06-01",
    parentId: "P007",
    fatherName: "Rashid Ahmed",
    motherName: "Sumaiya Beevi",
    phone: "9876543216",
  },
];

// Mock Teachers
export const teachers = [
  {
    id: "T001",
    name: "Usthad Abdul Kareem",
    phone: "9988776655",
    email: "kareem@madrasa.com",
    subject: "Quran & Islamic Studies",
    classes: ["Class 4", "Class 3"],
    joiningDate: "2020-06-01",
    qualification: "B.A Islamic Studies",
  },
  {
    id: "T002",
    name: "Usthada Zubeda",
    phone: "9988776644",
    email: "zubeda@madrasa.com",
    subject: "Arabic",
    classes: ["Class 4", "Class 2"],
    joiningDate: "2021-06-01",
    qualification: "M.A Arabic",
  },
  {
    id: "T003",
    name: "Usthad Rasheed",
    phone: "9988776633",
    email: "rasheed@madrasa.com",
    subject: "Fiqh & Hadith",
    classes: ["Class 3"],
    joiningDate: "2019-06-01",
    qualification: "Dars Graduation",
  },
];

// Mock Parents
export const parents = [
  {
    id: "P001",
    fatherName: "Abdullah Rahman",
    motherName: "Fathima Bivi",
    phone: "9876543210",
    email: "abdullah@email.com",
    password: "parent123",
    children: ["S001", "S006"],
  },
  {
    id: "P002",
    fatherName: "Khaleel Ahmed",
    motherName: "Mariam Beevi",
    phone: "9876543211",
    email: "khaleel@email.com",
    password: "parent123",
    children: ["S002"],
  },
  {
    id: "P003",
    fatherName: "Salim Mohammed",
    motherName: "Zainab Beevi",
    phone: "9876543212",
    email: "salim@email.com",
    password: "parent123",
    children: ["S003"],
  },
  {
    id: "P004",
    fatherName: "Zakariya Hassan",
    motherName: "Khadija Beevi",
    phone: "9876543213",
    email: "zakariya@email.com",
    password: "parent123",
    children: ["S004"],
  },
  {
    id: "P005",
    fatherName: "Siddique Ali",
    motherName: "Ruqaiya Beevi",
    phone: "9876543214",
    email: "siddique@email.com",
    password: "parent123",
    children: ["S005"],
  },
];

// Mock Attendance Records  (status: present | absent | late | excused)
export const attendanceRecords = [
  // ── Class 4 ──
  { date:"2026-03-17", classId:"Class 4", records:[
    { studentId:"S001", status:"present", remark:"" },
    { studentId:"S002", status:"present", remark:"" },
    { studentId:"S003", status:"absent",  remark:"Sick" },
    { studentId:"S004", status:"present", remark:"" },
    { studentId:"S005", status:"late",    remark:"Bus delay" },
  ]},
  { date:"2026-03-14", classId:"Class 4", records:[
    { studentId:"S001", status:"present", remark:"" },
    { studentId:"S002", status:"present", remark:"" },
    { studentId:"S003", status:"absent",  remark:"Sick" },
    { studentId:"S004", status:"present", remark:"" },
    { studentId:"S005", status:"present", remark:"" },
  ]},
  { date:"2026-03-13", classId:"Class 4", records:[
    { studentId:"S001", status:"present", remark:"" },
    { studentId:"S002", status:"absent",  remark:"Family event" },
    { studentId:"S003", status:"present", remark:"" },
    { studentId:"S004", status:"present", remark:"" },
    { studentId:"S005", status:"absent",  remark:"" },
  ]},
  { date:"2026-03-12", classId:"Class 4", records:[
    { studentId:"S001", status:"present", remark:"" },
    { studentId:"S002", status:"present", remark:"" },
    { studentId:"S003", status:"late",    remark:"Late arrival" },
    { studentId:"S004", status:"absent",  remark:"Medical" },
    { studentId:"S005", status:"present", remark:"" },
  ]},
  { date:"2026-03-11", classId:"Class 4", records:[
    { studentId:"S001", status:"present", remark:"" },
    { studentId:"S002", status:"present", remark:"" },
    { studentId:"S003", status:"excused", remark:"Doctor appointment" },
    { studentId:"S004", status:"present", remark:"" },
    { studentId:"S005", status:"present", remark:"" },
  ]},
  { date:"2026-03-10", classId:"Class 4", records:[
    { studentId:"S001", status:"present", remark:"" },
    { studentId:"S002", status:"late",    remark:"" },
    { studentId:"S003", status:"absent",  remark:"" },
    { studentId:"S004", status:"present", remark:"" },
    { studentId:"S005", status:"present", remark:"" },
  ]},
  { date:"2026-03-07", classId:"Class 4", records:[
    { studentId:"S001", status:"present", remark:"" },
    { studentId:"S002", status:"present", remark:"" },
    { studentId:"S003", status:"present", remark:"" },
    { studentId:"S004", status:"present", remark:"" },
    { studentId:"S005", status:"absent",  remark:"" },
  ]},
  { date:"2026-03-06", classId:"Class 4", records:[
    { studentId:"S001", status:"present", remark:"" },
    { studentId:"S002", status:"present", remark:"" },
    { studentId:"S003", status:"absent",  remark:"Sick" },
    { studentId:"S004", status:"late",    remark:"" },
    { studentId:"S005", status:"present", remark:"" },
  ]},
  // ── Class 3 ──
  { date:"2026-03-17", classId:"Class 3", records:[
    { studentId:"S006", status:"present", remark:"" },
    { studentId:"S007", status:"absent",  remark:"Sick" },
  ]},
  { date:"2026-03-14", classId:"Class 3", records:[
    { studentId:"S006", status:"present", remark:"" },
    { studentId:"S007", status:"present", remark:"" },
  ]},
  { date:"2026-03-13", classId:"Class 3", records:[
    { studentId:"S006", status:"late",    remark:"" },
    { studentId:"S007", status:"present", remark:"" },
  ]},
  // ── Class 2 ──
  { date:"2026-03-17", classId:"Class 2", records:[
    { studentId:"S008", status:"present", remark:"" },
  ]},
  { date:"2026-03-14", classId:"Class 2", records:[
    { studentId:"S008", status:"absent",  remark:"Sick" },
  ]},
];

export const attendanceSummary = [
  { month: "Oct", present: 22, absent: 2 },
  { month: "Nov", present: 20, absent: 4 },
  { month: "Dec", present: 18, absent: 6 },
  { month: "Jan", present: 23, absent: 1 },
  { month: "Feb", present: 21, absent: 3 },
  { month: "Mar", present: 12, absent: 3 },
];

// Mock Homework
export const homeworkList = [
  {
    id: "HW001",
    type: "daily",
    title: "Memorize Surah Al-Asr",
    description: "Memorize Surah Al-Asr with proper tajweed. Focus on makhraj of ع and ص.",
    assignedDate: "2026-03-14",
    dueDate: "2026-03-15",
    class: "Class 4",
    teacherId: "T001",
    subject: "Quran",
    priority: "high",
    studentStatuses: [
      { studentId: "S001", status: "green",  parentConfirmed: true,  teacherVerified: true,  feedback: "Excellent tajweed!", note: "" },
      { studentId: "S002", status: "yellow", parentConfirmed: true,  teacherVerified: false, feedback: "", note: "Almost there, check ص makhraj" },
      { studentId: "S003", status: "red",    parentConfirmed: false, teacherVerified: false, feedback: "", note: "" },
      { studentId: "S004", status: "green",  parentConfirmed: true,  teacherVerified: true,  feedback: "Perfect recitation", note: "" },
      { studentId: "S005", status: "yellow", parentConfirmed: true,  teacherVerified: false, feedback: "", note: "" },
    ],
  },
  {
    id: "HW002",
    type: "long",
    title: "Memorize Surah Al-Kahf (1-20)",
    description: "Memorize first 20 ayahs of Surah Al-Kahf with tarteel. Weekly check every Friday.",
    assignedDate: "2026-03-10",
    dueDate: "2026-03-20",
    class: "Class 4",
    teacherId: "T001",
    subject: "Quran",
    priority: "high",
    studentStatuses: [
      { studentId: "S001", status: "green",  parentConfirmed: true,  teacherVerified: true,  progress: 100, feedback: "Completed ahead of schedule!", note: "" },
      { studentId: "S002", status: "yellow", parentConfirmed: true,  teacherVerified: false, progress: 60,  feedback: "", note: "Keep consistent daily revision" },
      { studentId: "S003", status: "red",    parentConfirmed: false, teacherVerified: false, progress: 0,   feedback: "", note: "Needs immediate attention" },
      { studentId: "S004", status: "yellow", parentConfirmed: true,  teacherVerified: false, progress: 80,  feedback: "", note: "" },
      { studentId: "S005", status: "red",    parentConfirmed: false, teacherVerified: false, progress: 20,  feedback: "", note: "Struggling – recommend extra session" },
    ],
  },
  {
    id: "HW003",
    type: "daily",
    title: "Arabic Vocabulary Exercise",
    description: "Complete vocabulary exercises on page 45-46. Write 5 sentences using new words.",
    assignedDate: "2026-03-14",
    dueDate: "2026-03-15",
    class: "Class 4",
    teacherId: "T002",
    subject: "Arabic",
    priority: "medium",
    studentStatuses: [
      { studentId: "S001", status: "yellow",   parentConfirmed: true,  teacherVerified: false, feedback: "", note: "" },
      { studentId: "S002", status: "green",    parentConfirmed: true,  teacherVerified: true,  feedback: "Good work", note: "" },
      { studentId: "S003", status: "yellow",   parentConfirmed: true,  teacherVerified: false, feedback: "", note: "" },
      { studentId: "S004", status: "red",      parentConfirmed: false, teacherVerified: false, feedback: "", note: "" },
      { studentId: "S005", status: "returned", parentConfirmed: true,  teacherVerified: true,  feedback: "Re-submitted with corrections", note: "" },
    ],
  },
  {
    id: "HW004",
    type: "daily",
    title: "Fiqh – Rules of Wudu",
    description: "Write down the 6 fardh of wudu from memory and explain each step briefly.",
    assignedDate: "2026-03-13",
    dueDate: "2026-03-14",
    class: "Class 4",
    teacherId: "T001",
    subject: "Fiqh",
    priority: "medium",
    studentStatuses: [
      { studentId: "S001", status: "green",  parentConfirmed: true,  teacherVerified: true,  feedback: "All 6 correct!", note: "" },
      { studentId: "S002", status: "green",  parentConfirmed: true,  teacherVerified: true,  feedback: "Well done", note: "" },
      { studentId: "S003", status: "red",    parentConfirmed: false, teacherVerified: false, feedback: "", note: "3rd consecutive miss" },
      { studentId: "S004", status: "yellow", parentConfirmed: true,  teacherVerified: false, feedback: "", note: "" },
      { studentId: "S005", status: "green",  parentConfirmed: true,  teacherVerified: true,  feedback: "Good effort", note: "" },
    ],
  },
  {
    id: "HW005",
    type: "daily",
    title: "Islamic Studies – Pillars of Islam",
    description: "Write a short paragraph on each of the 5 pillars of Islam with evidence from Quran/Hadith.",
    assignedDate: "2026-03-12",
    dueDate: "2026-03-13",
    class: "Class 4",
    teacherId: "T001",
    subject: "Islamic Studies",
    priority: "low",
    studentStatuses: [
      { studentId: "S001", status: "green",    parentConfirmed: true,  teacherVerified: true,  feedback: "Outstanding research", note: "" },
      { studentId: "S002", status: "returned", parentConfirmed: true,  teacherVerified: true,  feedback: "Returned after correction", note: "" },
      { studentId: "S003", status: "red",      parentConfirmed: false, teacherVerified: false, feedback: "", note: "" },
      { studentId: "S004", status: "green",    parentConfirmed: true,  teacherVerified: true,  feedback: "Excellent references", note: "" },
      { studentId: "S005", status: "yellow",   parentConfirmed: true,  teacherVerified: false, feedback: "", note: "" },
    ],
  },
  {
    id: "HW006",
    type: "long",
    title: "Arabic Essay – My Madrasa",
    description: "Write a 10-line essay in Arabic about your madrasa experience. Due before Friday prayer.",
    assignedDate: "2026-03-10",
    dueDate: "2026-03-14",
    class: "Class 3",
    teacherId: "T002",
    subject: "Arabic",
    priority: "medium",
    studentStatuses: [
      { studentId: "S006", status: "green",  parentConfirmed: true,  teacherVerified: true,  progress: 100, feedback: "Beautifully written!", note: "" },
      { studentId: "S007", status: "yellow", parentConfirmed: true,  teacherVerified: false, progress: 70,  feedback: "", note: "" },
    ],
  },
  {
    id: "HW007",
    type: "daily",
    title: "Quran Revision – Juz Amma",
    description: "Recite the last 10 surahs of Juz Amma to a parent and get signature.",
    assignedDate: "2026-03-15",
    dueDate: "2026-03-16",
    class: "Class 3",
    teacherId: "T001",
    subject: "Quran",
    priority: "high",
    studentStatuses: [
      { studentId: "S006", status: "red",    parentConfirmed: false, teacherVerified: false, feedback: "", note: "" },
      { studentId: "S007", status: "yellow", parentConfirmed: true,  teacherVerified: false, feedback: "", note: "" },
    ],
  },
  {
    id: "HW008",
    type: "daily",
    title: "Fiqh – Rules of Salah",
    description: "List the conditions that invalidate salah and memorize the short dua after salah.",
    assignedDate: "2026-03-10",
    dueDate: "2026-03-11",
    class: "Class 2",
    teacherId: "T001",
    subject: "Fiqh",
    priority: "low",
    studentStatuses: [
      { studentId: "S008", status: "green", parentConfirmed: true, teacherVerified: true, feedback: "Good effort for first try!", note: "" },
    ],
  },
];

// Mock Diary Entries
export const diaryEntries = [
  {
    id: "D001",
    date: "2026-03-14",
    class: "Class 4",
    teacherId: "T001",
    type: "class",
    title: "Surah Rahman Revision",
    content: "Today students revised Surah Rahman verses 1-30. Overall recitation was good. Please revise again at home with proper tajweed focus on makhraj.",
    targetStudentId: null,
  },
  {
    id: "D002",
    date: "2026-03-14",
    class: "Class 4",
    teacherId: "T001",
    type: "student",
    title: "Special Note – Ahmed",
    content: "Ahmed showed excellent improvement in tajweed today. His makhraj for 'ain and ghayn are now correct. Encourage him to continue.",
    targetStudentId: "S001",
  },
  {
    id: "D003",
    date: "2026-03-13",
    class: "Class 4",
    teacherId: "T001",
    type: "class",
    title: "New Lesson Started",
    content: "Started new chapter on Surah Al-Kahf. Students were given first 5 ayahs for home memorization. Please ensure daily revision.",
    targetStudentId: null,
  },
];

// Mock Exam Records
export const exams = [
  // ─── Class 4 Exams ───────────────────────────────────────────────────────
  {
    id: "EX001",
    name: "First Semester Exam",
    type: "semester",
    date: "2026-01-20",
    class: "Class 4",
    subjects: ["Quran", "Arabic", "Fiqh", "Islamic Studies"],
    totalMarks: 100,
    status: "published",   // draft | marks_entered | published
    results: [
      { studentId: "S001", marks: { Quran: 92, Arabic: 88, Fiqh: 85, "Islamic Studies": 90 }, total: 355, grade: "A+", rank: 1 },
      { studentId: "S002", marks: { Quran: 78, Arabic: 82, Fiqh: 75, "Islamic Studies": 80 }, total: 315, grade: "B+", rank: 3 },
      { studentId: "S003", marks: { Quran: 65, Arabic: 70, Fiqh: 60, "Islamic Studies": 72 }, total: 267, grade: "C",  rank: 5 },
      { studentId: "S004", marks: { Quran: 88, Arabic: 90, Fiqh: 82, "Islamic Studies": 86 }, total: 346, grade: "A",  rank: 2 },
      { studentId: "S005", marks: { Quran: 80, Arabic: 76, Fiqh: 78, "Islamic Studies": 82 }, total: 316, grade: "B+", rank: 4 },
    ],
  },
  {
    id: "EX002",
    name: "Monthly Test – March",
    type: "class_test",
    date: "2026-03-10",
    class: "Class 4",
    subjects: ["Quran", "Arabic"],
    totalMarks: 50,
    status: "published",
    results: [
      { studentId: "S001", marks: { Quran: 47, Arabic: 46 }, total: 93,  grade: "A+", rank: 1 },
      { studentId: "S002", marks: { Quran: 38, Arabic: 40 }, total: 78,  grade: "B",  rank: 3 },
      { studentId: "S003", marks: { Quran: 30, Arabic: 32 }, total: 62,  grade: "C",  rank: 5 },
      { studentId: "S004", marks: { Quran: 44, Arabic: 45 }, total: 89,  grade: "A",  rank: 2 },
      { studentId: "S005", marks: { Quran: 40, Arabic: 38 }, total: 78,  grade: "B",  rank: 3 },
    ],
  },
  {
    id: "EX003",
    name: "Monthly Test – February",
    type: "class_test",
    date: "2026-02-10",
    class: "Class 4",
    subjects: ["Quran", "Arabic"],
    totalMarks: 50,
    status: "published",
    results: [
      { studentId: "S001", marks: { Quran: 45, Arabic: 44 }, total: 89,  grade: "A+", rank: 1 },
      { studentId: "S002", marks: { Quran: 36, Arabic: 38 }, total: 74,  grade: "B",  rank: 3 },
      { studentId: "S003", marks: { Quran: 28, Arabic: 30 }, total: 58,  grade: "C",  rank: 5 },
      { studentId: "S004", marks: { Quran: 42, Arabic: 43 }, total: 85,  grade: "A",  rank: 2 },
      { studentId: "S005", marks: { Quran: 38, Arabic: 36 }, total: 74,  grade: "B",  rank: 3 },
    ],
  },
  {
    id: "EX004",
    name: "Hifz Assessment – Q1",
    type: "hifz",
    date: "2026-03-05",
    class: "Class 4",
    subjects: ["Memorization", "Tajweed"],
    totalMarks: 100,
    status: "marks_entered",
    results: [
      { studentId: "S001", marks: { Memorization: 95, Tajweed: 90 }, total: 185, grade: "A+", rank: 1 },
      { studentId: "S002", marks: { Memorization: 80, Tajweed: 78 }, total: 158, grade: "B+", rank: 3 },
      { studentId: "S003", marks: { Memorization: 62, Tajweed: 60 }, total: 122, grade: "C",  rank: 5 },
      { studentId: "S004", marks: { Memorization: 92, Tajweed: 88 }, total: 180, grade: "A+", rank: 2 },
      { studentId: "S005", marks: { Memorization: 75, Tajweed: 72 }, total: 147, grade: "B",  rank: 4 },
    ],
  },
  // ─── Class 3 Exams ───────────────────────────────────────────────────────
  {
    id: "EX005",
    name: "First Semester Exam",
    type: "semester",
    date: "2026-01-22",
    class: "Class 3",
    subjects: ["Quran", "Arabic", "Fiqh", "Islamic Studies"],
    totalMarks: 100,
    status: "published",
    results: [
      { studentId: "S006", marks: { Quran: 85, Arabic: 80, Fiqh: 78, "Islamic Studies": 82 }, total: 325, grade: "A",  rank: 1 },
      { studentId: "S007", marks: { Quran: 72, Arabic: 68, Fiqh: 70, "Islamic Studies": 74 }, total: 284, grade: "B",  rank: 2 },
    ],
  },
  {
    id: "EX006",
    name: "Monthly Test – March",
    type: "class_test",
    date: "2026-03-12",
    class: "Class 3",
    subjects: ["Quran"],
    totalMarks: 50,
    status: "draft",
    results: [],
  },
  // ─── Class 2 Exams ───────────────────────────────────────────────────────
  {
    id: "EX007",
    name: "First Semester Exam",
    type: "semester",
    date: "2026-01-24",
    class: "Class 2",
    subjects: ["Quran", "Arabic", "Islamic Studies"],
    totalMarks: 100,
    status: "published",
    results: [
      { studentId: "S008", marks: { Quran: 88, Arabic: 85, "Islamic Studies": 90 }, total: 263, grade: "A+", rank: 1 },
    ],
  },
  {
    id: "EX008",
    name: "Monthly Test – March",
    type: "class_test",
    date: "2026-03-14",
    class: "Class 2",
    subjects: ["Quran"],
    totalMarks: 50,
    status: "draft",
    results: [],
  },
];

// Mock Ibadah Records
export const ibadahRecords = [
  {
    studentId: "S001",
    date: "2026-03-14",
    fajr: "jama",
    zuhr: "jama",
    asr: "individual",
    maghrib: "jama",
    isha: "jama",
    memorization: 95,
    behavior: 5,
    swalaathCount: 5,
    remarks: "Excellent student, very focused",
  },
  {
    studentId: "S002",
    date: "2026-03-14",
    fajr: "individual",
    zuhr: "jama",
    asr: "jama",
    maghrib: "individual",
    isha: "jama",
    memorization: 80,
    behavior: 4,
    swalaathCount: 5,
    remarks: "",
  },
  {
    studentId: "S003",
    date: "2026-03-14",
    fajr: "missed",
    zuhr: "individual",
    asr: "individual",
    maghrib: "jama",
    isha: "individual",
    memorization: 60,
    behavior: 3,
    swalaathCount: 4,
    remarks: "Needs improvement in fajr",
  },
  {
    studentId: "S004",
    date: "2026-03-14",
    fajr: "jama",
    zuhr: "jama",
    asr: "jama",
    maghrib: "jama",
    isha: "jama",
    memorization: 90,
    behavior: 5,
    swalaathCount: 5,
    remarks: "Best student this week",
  },
  {
    studentId: "S005",
    date: "2026-03-14",
    fajr: "jama",
    zuhr: "individual",
    asr: "missed",
    maghrib: "jama",
    isha: "jama",
    memorization: 75,
    behavior: 4,
    swalaathCount: 4,
    remarks: "",
  },
];

// ── Student Ibadah Submissions (submitted by parent on behalf of student) ──
export const studentIbadahSubmissions = [
  // S001 – Ahmed Bin Abdullah – 3 days
  {
    id: "IBS001-1", studentId: "S001", date: "2026-03-17",
    fajr: "jama", zuhr: "jama", asr: "individual", maghrib: "jama", isha: "jama",
    tahajjud: "no", ishraq: "yes", duha: "yes", awwabin: "yes",
    tilawah: "yes", hifz: "yes", tajweed: "partial", revision: "yes",
    tilawahPages: 3, hifzLines: 5,
    subhanallah: 3, alhamdulillah: 3, allahuakbar: 3, istighfar: 2, durood: 2,
    punctual: "yes", respectful: "yes", helpful: "yes", honest: "yes",
    remarks: "Alhamdulillah, completed all prayers on time today.",
    submittedAt: "2026-03-17T20:30:00",
  },
  {
    id: "IBS001-2", studentId: "S001", date: "2026-03-16",
    fajr: "jama", zuhr: "individual", asr: "jama", maghrib: "jama", isha: "jama",
    tahajjud: "no", ishraq: "yes", duha: "partial", awwabin: "yes",
    tilawah: "yes", hifz: "partial", tajweed: "yes", revision: "yes",
    tilawahPages: 2, hifzLines: 3,
    subhanallah: 3, alhamdulillah: 2, allahuakbar: 3, istighfar: 2, durood: 1,
    punctual: "yes", respectful: "yes", helpful: "partial", honest: "yes",
    remarks: "Missed Duha due to school timing.",
    submittedAt: "2026-03-16T21:00:00",
  },
  {
    id: "IBS001-3", studentId: "S001", date: "2026-03-15",
    fajr: "individual", zuhr: "jama", asr: "jama", maghrib: "jama", isha: "individual",
    tahajjud: "no", ishraq: "no", duha: "yes", awwabin: "yes",
    tilawah: "yes", hifz: "yes", tajweed: "yes", revision: "partial",
    tilawahPages: 2, hifzLines: 4,
    subhanallah: 2, alhamdulillah: 2, allahuakbar: 2, istighfar: 1, durood: 2,
    punctual: "partial", respectful: "yes", helpful: "yes", honest: "yes",
    remarks: "",
    submittedAt: "2026-03-15T20:45:00",
  },
  {
    id: "IBS001-4", studentId: "S001", date: "2026-03-14",
    fajr: "jama", zuhr: "jama", asr: "missed", maghrib: "jama", isha: "jama",
    tahajjud: "no", ishraq: "yes", duha: "yes", awwabin: "no",
    tilawah: "partial", hifz: "yes", tajweed: "yes", revision: "yes",
    tilawahPages: 1, hifzLines: 5,
    subhanallah: 3, alhamdulillah: 3, allahuakbar: 3, istighfar: 3, durood: 3,
    punctual: "yes", respectful: "yes", helpful: "yes", honest: "yes",
    remarks: "Missed Asr, was travelling.",
    submittedAt: "2026-03-14T21:15:00",
  },
  {
    id: "IBS001-5", studentId: "S001", date: "2026-03-13",
    fajr: "jama", zuhr: "jama", asr: "jama", maghrib: "jama", isha: "jama",
    tahajjud: "yes", ishraq: "yes", duha: "yes", awwabin: "yes",
    tilawah: "yes", hifz: "yes", tajweed: "yes", revision: "yes",
    tilawahPages: 4, hifzLines: 6,
    subhanallah: 3, alhamdulillah: 3, allahuakbar: 3, istighfar: 3, durood: 3,
    punctual: "yes", respectful: "yes", helpful: "yes", honest: "yes",
    remarks: "Excellent day! All ibadah complete. 🌟",
    submittedAt: "2026-03-13T20:00:00",
  },
  // S006 – Umar Farooq – 3 days
  {
    id: "IBS006-1", studentId: "S006", date: "2026-03-17",
    fajr: "individual", zuhr: "jama", asr: "jama", maghrib: "jama", isha: "jama",
    tahajjud: "no", ishraq: "partial", duha: "yes", awwabin: "no",
    tilawah: "yes", hifz: "partial", tajweed: "yes", revision: "yes",
    tilawahPages: 2, hifzLines: 2,
    subhanallah: 2, alhamdulillah: 2, allahuakbar: 2, istighfar: 1, durood: 1,
    punctual: "partial", respectful: "yes", helpful: "yes", honest: "yes",
    remarks: "Fajr prayed alone at home.",
    submittedAt: "2026-03-17T21:30:00",
  },
  {
    id: "IBS006-2", studentId: "S006", date: "2026-03-16",
    fajr: "jama", zuhr: "jama", asr: "individual", maghrib: "jama", isha: "jama",
    tahajjud: "no", ishraq: "yes", duha: "no", awwabin: "yes",
    tilawah: "yes", hifz: "yes", tajweed: "partial", revision: "partial",
    tilawahPages: 1, hifzLines: 3,
    subhanallah: 3, alhamdulillah: 2, allahuakbar: 3, istighfar: 2, durood: 2,
    punctual: "yes", respectful: "partial", helpful: "yes", honest: "yes",
    remarks: "",
    submittedAt: "2026-03-16T20:50:00",
  },
  {
    id: "IBS006-3", studentId: "S006", date: "2026-03-15",
    fajr: "missed", zuhr: "jama", asr: "jama", maghrib: "individual", isha: "jama",
    tahajjud: "no", ishraq: "no", duha: "partial", awwabin: "no",
    tilawah: "partial", hifz: "yes", tajweed: "yes", revision: "yes",
    tilawahPages: 1, hifzLines: 2,
    subhanallah: 1, alhamdulillah: 1, allahuakbar: 1, istighfar: 1, durood: 1,
    punctual: "partial", respectful: "yes", helpful: "partial", honest: "yes",
    remarks: "Not feeling well, missed Fajr.",
    submittedAt: "2026-03-15T22:00:00",
  },
];

// Mock Fees Records
export const feesRecords = [
  // ── March 2026 ──
  { id:"F001", studentId:"S001", month:"March 2026",    amount:500, status:"paid",    paidDate:"2026-03-05", receiptNumber:"RCP-MAR-001", paymentProof:"proof_s001_mar.jpg" },
  { id:"F002", studentId:"S002", month:"March 2026",    amount:500, status:"pending", paidDate:null,         receiptNumber:null,           paymentProof:"proof_s002_mar.jpg" },
  { id:"F003", studentId:"S003", month:"March 2026",    amount:500, status:"unpaid",  paidDate:null,         receiptNumber:null,           paymentProof:null },
  { id:"F004", studentId:"S004", month:"March 2026",    amount:500, status:"paid",    paidDate:"2026-03-03", receiptNumber:"RCP-MAR-002", paymentProof:"proof_s004_mar.jpg" },
  { id:"F005", studentId:"S005", month:"March 2026",    amount:500, status:"paid",    paidDate:"2026-03-07", receiptNumber:"RCP-MAR-003", paymentProof:"proof_s005_mar.jpg" },
  { id:"F006", studentId:"S006", month:"March 2026",    amount:400, status:"paid",    paidDate:"2026-03-04", receiptNumber:"RCP-MAR-004", paymentProof:"proof_s006_mar.jpg" },
  { id:"F007", studentId:"S007", month:"March 2026",    amount:400, status:"unpaid",  paidDate:null,         receiptNumber:null,           paymentProof:null },
  { id:"F008", studentId:"S008", month:"March 2026",    amount:300, status:"pending", paidDate:null,         receiptNumber:null,           paymentProof:"proof_s008_mar.jpg" },
  // ── February 2026 ──
  { id:"F009", studentId:"S001", month:"February 2026", amount:500, status:"paid",    paidDate:"2026-02-04", receiptNumber:"RCP-FEB-001", paymentProof:"proof_s001_feb.jpg" },
  { id:"F010", studentId:"S002", month:"February 2026", amount:500, status:"paid",    paidDate:"2026-02-06", receiptNumber:"RCP-FEB-002", paymentProof:"proof_s002_feb.jpg" },
  { id:"F011", studentId:"S003", month:"February 2026", amount:500, status:"paid",    paidDate:"2026-02-10", receiptNumber:"RCP-FEB-003", paymentProof:"proof_s003_feb.jpg" },
  { id:"F012", studentId:"S004", month:"February 2026", amount:500, status:"paid",    paidDate:"2026-02-03", receiptNumber:"RCP-FEB-004", paymentProof:"proof_s004_feb.jpg" },
  { id:"F013", studentId:"S005", month:"February 2026", amount:500, status:"unpaid",  paidDate:null,         receiptNumber:null,           paymentProof:null },
  { id:"F014", studentId:"S006", month:"February 2026", amount:400, status:"paid",    paidDate:"2026-02-05", receiptNumber:"RCP-FEB-005", paymentProof:"proof_s006_feb.jpg" },
  { id:"F015", studentId:"S007", month:"February 2026", amount:400, status:"paid",    paidDate:"2026-02-08", receiptNumber:"RCP-FEB-006", paymentProof:"proof_s007_feb.jpg" },
  { id:"F016", studentId:"S008", month:"February 2026", amount:300, status:"paid",    paidDate:"2026-02-07", receiptNumber:"RCP-FEB-007", paymentProof:"proof_s008_feb.jpg" },
  // ── January 2026 ──
  { id:"F017", studentId:"S001", month:"January 2026",  amount:500, status:"paid",    paidDate:"2026-01-05", receiptNumber:"RCP-JAN-001", paymentProof:"proof_s001_jan.jpg" },
  { id:"F018", studentId:"S002", month:"January 2026",  amount:500, status:"paid",    paidDate:"2026-01-07", receiptNumber:"RCP-JAN-002", paymentProof:"proof_s002_jan.jpg" },
  { id:"F019", studentId:"S003", month:"January 2026",  amount:500, status:"unpaid",  paidDate:null,         receiptNumber:null,           paymentProof:null },
  { id:"F020", studentId:"S004", month:"January 2026",  amount:500, status:"paid",    paidDate:"2026-01-04", receiptNumber:"RCP-JAN-003", paymentProof:"proof_s004_jan.jpg" },
  { id:"F021", studentId:"S005", month:"January 2026",  amount:500, status:"paid",    paidDate:"2026-01-09", receiptNumber:"RCP-JAN-004", paymentProof:"proof_s005_jan.jpg" },
  { id:"F022", studentId:"S006", month:"January 2026",  amount:400, status:"paid",    paidDate:"2026-01-06", receiptNumber:"RCP-JAN-005", paymentProof:"proof_s006_jan.jpg" },
  { id:"F023", studentId:"S007", month:"January 2026",  amount:400, status:"pending", paidDate:null,         receiptNumber:null,           paymentProof:"proof_s007_jan.jpg" },
  { id:"F024", studentId:"S008", month:"January 2026",  amount:300, status:"paid",    paidDate:"2026-01-08", receiptNumber:"RCP-JAN-006", paymentProof:"proof_s008_jan.jpg" },
];

// Mock Notifications
export const notifications = [
  {
    id: "N001",
    type: "attendance",
    title: "Attendance Marked",
    message: "Ahmed was marked present today (14 March 2026)",
    timestamp: "2026-03-14T09:30:00",
    read: false,
    parentId: "P001",
  },
  {
    id: "N002",
    type: "homework",
    title: "New Homework Assigned",
    message: "Memorize Surah Al-Asr – Due tomorrow",
    timestamp: "2026-03-14T08:00:00",
    read: false,
    parentId: "P001",
  },
  {
    id: "N003",
    type: "homework",
    title: "Homework Pending",
    message: "Arabic Vocabulary Exercise is still pending for Umar",
    timestamp: "2026-03-14T07:00:00",
    read: true,
    parentId: "P001",
  },
  {
    id: "N004",
    type: "exam",
    title: "Exam Results Published",
    message: "March Monthly Test results are now available",
    timestamp: "2026-03-12T14:00:00",
    read: true,
    parentId: "P001",
  },
  {
    id: "N005",
    type: "fee",
    title: "Fee Reminder",
    message: "March 2026 fee of ₹500 is due. Please pay at the earliest.",
    timestamp: "2026-03-10T10:00:00",
    read: true,
    parentId: "P001",
  },
  {
    id: "N006",
    type: "diary",
    title: "Diary Entry",
    message: "Teacher note: Surah Rahman revision – Please revise again at home",
    timestamp: "2026-03-14T10:30:00",
    read: false,
    parentId: "P001",
  },
];

// Mock Seat Arrangement
export const seatArrangements = [
  {
    id: "SA001",
    examName: "First Semester Exam",
    hall: "Main Hall",
    totalBenches: 20,
    layout: [
      { benchId: 1, row: 1, col: 1, studentId: "S001", studentName: "Ahmed Bin Abdullah", class: "Class 4", gender: "male" },
      { benchId: 2, row: 1, col: 2, studentId: "S006", studentName: "Umar Farooq", class: "Class 3", gender: "male" },
      { benchId: 3, row: 1, col: 3, studentId: "S008", studentName: "Hamza Rashid", class: "Class 2", gender: "male" },
      { benchId: 4, row: 2, col: 1, studentId: "S002", studentName: "Ibrahim Khaleel", class: "Class 4", gender: "male" },
      { benchId: 5, row: 2, col: 2, studentId: "S003", studentName: "Yusuf Salim", class: "Class 4", gender: "male" },
      { benchId: 6, row: 3, col: 1, studentId: "S004", studentName: "Fatima Zahra", class: "Class 4", gender: "female" },
      { benchId: 7, row: 3, col: 2, studentId: "S005", studentName: "Aisha Siddiqui", class: "Class 4", gender: "female" },
      { benchId: 8, row: 3, col: 3, studentId: "S007", studentName: "Maryam Noor", class: "Class 3", gender: "female" },
    ],
  },
];

// Analytics data
export const parentCooperationData = [
  { name: "Active", value: 18, color: "#10b981" },
  { name: "Moderate", value: 8, color: "#f59e0b" },
  { name: "Inactive", value: 4, color: "#ef4444" },
];

export const homeworkCompletionData = [
  { week: "Week 1", completed: 85, pending: 10, missing: 5 },
  { week: "Week 2", completed: 78, pending: 15, missing: 7 },
  { week: "Week 3", completed: 90, pending: 7, missing: 3 },
  { week: "Week 4", completed: 82, pending: 12, missing: 6 },
];

export const monthlyAttendanceData = [
  { month: "Oct", rate: 92 },
  { month: "Nov", rate: 88 },
  { month: "Dec", rate: 85 },
  { month: "Jan", rate: 95 },
  { month: "Feb", rate: 91 },
  { month: "Mar", rate: 94 },
];

export const feeCollectionData = [
  { month: "Oct", collected: 12000, pending: 2500 },
  { month: "Nov", collected: 13500, pending: 1500 },
  { month: "Dec", collected: 11000, pending: 4000 },
  { month: "Jan", collected: 14000, pending: 1000 },
  { month: "Feb", collected: 13000, pending: 2000 },
  { month: "Mar", collected: 10500, pending: 4500 },
];

export const performanceRankingData = [
  { studentId: "S001", name: "Ahmed Bin Abdullah", examScore: 92, ibadah: 95, homework: 98, memorization: 95, total: 380, crown: true, gender: "male" },
  { studentId: "S004", name: "Fatima Zahra", examScore: 88, ibadah: 98, homework: 90, memorization: 92, total: 368, crown: true, gender: "female" },
  { studentId: "S005", name: "Aisha Siddiqui", examScore: 80, ibadah: 85, homework: 82, memorization: 78, total: 325, crown: false, gender: "female" },
  { studentId: "S002", name: "Ibrahim Khaleel", examScore: 78, ibadah: 80, homework: 75, memorization: 80, total: 313, crown: false, gender: "male" },
  { studentId: "S003", name: "Yusuf Salim", examScore: 65, ibadah: 65, homework: 60, memorization: 62, total: 252, crown: false, gender: "male" },
];

export const madrasaConfig = {
  name: "Smart Madrasa",
  samasthaRegNumber: "SMT-KL-2019-4521",
  divisionEnabled: true,
  teachingModel: "subject_based",
  feeEnabled: true,
  feeType: "monthly",
  monthlyFeeAmount: 500,
  classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"],
  divisions: ["A", "B"],
  address: "Masjid Complex, Calicut, Kerala – 673001",
  phone: "0495-2345678",
  email: "info@smartmadrasa.app",
};

export const adminStats = {
  totalStudents: 142,
  totalTeachers: 8,
  totalParents: 130,
  presentToday: 128,
  absentToday: 14,
  feesCollectedThisMonth: 45500,
  feesPending: 26000,
  homeworkCompletionRate: 84,
};

// ── Other Payments (Exam Fees, Book Orders, Fund Campaigns) ─────────────────
export type OtherPaymentCategory =
  | "exam-fees"
  | "book-fees"
  | "samstha-fund"
  | "keithang-charity"
  | "muallim-charity"
  | "other-campaign";

export const otherPaymentCategories = [
  { id: "exam-fees",        label: "Exam Fees",          icon: "GraduationCap", color: "blue"   },
  { id: "book-fees",        label: "Book Order Fees",    icon: "BookOpen",      color: "purple" },
  { id: "samstha-fund",     label: "Samstha Fund",       icon: "Building2",     color: "teal"   },
  { id: "keithang-charity", label: "Keithang Charity",   icon: "Heart",         color: "rose"   },
  { id: "muallim-charity",  label: "Muallim Charity",    icon: "HandHeart",     color: "orange" },
  { id: "other-campaign",   label: "Other Campaigns",    icon: "Megaphone",     color: "amber"  },
];

export const otherPaymentRecords = [
  // Exam Fees
  { id:"OP001", studentId:"S001", category:"exam-fees",        amount:250, status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-10", note:"Term 2 Exam Fee" },
  { id:"OP002", studentId:"S002", category:"exam-fees",        amount:250, status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-12", note:"Term 2 Exam Fee" },
  { id:"OP003", studentId:"S003", category:"exam-fees",        amount:250, status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Term 2 Exam Fee" },
  { id:"OP004", studentId:"S004", category:"exam-fees",        amount:250, status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Term 2 Exam Fee" },
  { id:"OP005", studentId:"S005", category:"exam-fees",        amount:250, status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-15", note:"Term 2 Exam Fee" },
  { id:"OP006", studentId:"S006", category:"exam-fees",        amount:200, status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-11", note:"Term 2 Exam Fee" },
  { id:"OP007", studentId:"S007", category:"exam-fees",        amount:200, status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Term 2 Exam Fee" },
  { id:"OP008", studentId:"S008", category:"exam-fees",        amount:150, status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-09", note:"Term 2 Exam Fee" },
  // Book Order Fees
  { id:"OP009", studentId:"S001", category:"book-fees",        amount:500, status:"paid",    dueDate:"2026-02-28", paidDate:"2026-02-10", note:"Annual book set" },
  { id:"OP010", studentId:"S002", category:"book-fees",        amount:500, status:"paid",    dueDate:"2026-02-28", paidDate:"2026-02-12", note:"Annual book set" },
  { id:"OP011", studentId:"S003", category:"book-fees",        amount:500, status:"pending", dueDate:"2026-02-28", paidDate:null,          note:"Annual book set" },
  { id:"OP012", studentId:"S004", category:"book-fees",        amount:500, status:"paid",    dueDate:"2026-02-28", paidDate:"2026-02-14", note:"Annual book set" },
  { id:"OP013", studentId:"S005", category:"book-fees",        amount:500, status:"pending", dueDate:"2026-02-28", paidDate:null,          note:"Annual book set" },
  { id:"OP014", studentId:"S006", category:"book-fees",        amount:400, status:"paid",    dueDate:"2026-02-28", paidDate:"2026-02-11", note:"Annual book set" },
  { id:"OP015", studentId:"S007", category:"book-fees",        amount:400, status:"paid",    dueDate:"2026-02-28", paidDate:"2026-02-13", note:"Annual book set" },
  { id:"OP016", studentId:"S008", category:"book-fees",        amount:350, status:"pending", dueDate:"2026-02-28", paidDate:null,          note:"Annual book set" },
  // Samstha Fund
  { id:"OP017", studentId:"S001", category:"samstha-fund",     amount:100, status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-05", note:"Annual Samstha contribution" },
  { id:"OP018", studentId:"S002", category:"samstha-fund",     amount:100, status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Annual Samstha contribution" },
  { id:"OP019", studentId:"S003", category:"samstha-fund",     amount:100, status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Annual Samstha contribution" },
  { id:"OP020", studentId:"S004", category:"samstha-fund",     amount:100, status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-06", note:"Annual Samstha contribution" },
  { id:"OP021", studentId:"S005", category:"samstha-fund",     amount:100, status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-07", note:"Annual Samstha contribution" },
  // Keithang Charity
  { id:"OP022", studentId:"S001", category:"keithang-charity", amount:50,  status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-08", note:"Keithang charity drive 2026" },
  { id:"OP023", studentId:"S002", category:"keithang-charity", amount:50,  status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-09", note:"Keithang charity drive 2026" },
  { id:"OP024", studentId:"S003", category:"keithang-charity", amount:50,  status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Keithang charity drive 2026" },
  { id:"OP025", studentId:"S004", category:"keithang-charity", amount:50,  status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Keithang charity drive 2026" },
  { id:"OP026", studentId:"S005", category:"keithang-charity", amount:50,  status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-10", note:"Keithang charity drive 2026" },
  { id:"OP027", studentId:"S006", category:"keithang-charity", amount:50,  status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-10", note:"Keithang charity drive 2026" },
  // Muallim Charity
  { id:"OP028", studentId:"S001", category:"muallim-charity",  amount:75,  status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-11", note:"Muallim welfare fund" },
  { id:"OP029", studentId:"S002", category:"muallim-charity",  amount:75,  status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Muallim welfare fund" },
  { id:"OP030", studentId:"S003", category:"muallim-charity",  amount:75,  status:"pending", dueDate:"2026-03-31", paidDate:null,          note:"Muallim welfare fund" },
  { id:"OP031", studentId:"S004", category:"muallim-charity",  amount:75,  status:"paid",    dueDate:"2026-03-31", paidDate:"2026-03-12", note:"Muallim welfare fund" },
  // Other Campaign
  { id:"OP032", studentId:"S001", category:"other-campaign",   amount:200, status:"paid",    dueDate:"2026-04-15", paidDate:"2026-03-20", note:"Madrasa Building Fund" },
  { id:"OP033", studentId:"S002", category:"other-campaign",   amount:200, status:"pending", dueDate:"2026-04-15", paidDate:null,          note:"Madrasa Building Fund" },
  { id:"OP034", studentId:"S005", category:"other-campaign",   amount:200, status:"pending", dueDate:"2026-04-15", paidDate:null,          note:"Madrasa Building Fund" },
];

// ── Student ID Cards ──────────────────────────────────────────────────────────
export const idCardSettings = {
  madrasaName: "Smart Madrasa",
  madrasaAddress: "Mosque Road, Calicut, Kerala – 673001",
  madrasaPhone: "0495-2765432",
  academicYear: "2025–2026",
  primaryColor: "#059669",
  logoText: "SM",
};

// ── SKSBV Student Union ───────────────────────────────────────────────────────
export const sksbvData = {
  name: "SKSBV",
  fullName: "Sunni Kuttikalude Sanghatana Balan Vedi",
  established: "2019",
  motto: "Knowledge, Faith & Service",
  executive: [
    { id:"EX01", studentId:"S001", name:"Ahmed Bin Abdullah", role:"President",          class:"Class 4", photo:null },
    { id:"EX02", studentId:"S004", name:"Fatima Zahra",       role:"Vice President",     class:"Class 4", photo:null },
    { id:"EX03", studentId:"S002", name:"Ibrahim Khaleel",    role:"General Secretary",  class:"Class 4", photo:null },
    { id:"EX04", studentId:"S005", name:"Aisha Siddiqui",     role:"Treasurer",          class:"Class 4", photo:null },
    { id:"EX05", studentId:"S006", name:"Umar Farooq",        role:"Class Rep – Class 3",class:"Class 3", photo:null },
    { id:"EX06", studentId:"S007", name:"Maryam Noor",        role:"Class Rep – Class 3",class:"Class 3", photo:null },
    { id:"EX07", studentId:"S008", name:"Hamza Rashid",       role:"Class Rep – Class 2",class:"Class 2", photo:null },
  ],
  programs: [
    {
      id:"SK001", title:"Quran Recitation Competition", category:"Academic",
      date:"2026-04-10", status:"upcoming", venue:"Main Hall",
      description:"Inter-class Quran recitation with tajweed evaluation.",
      participants:40, coordinator:"Usthad Abdul Kareem", budget:2000,
    },
    {
      id:"SK002", title:"Islamic Quiz Bowl", category:"Academic",
      date:"2026-03-20", status:"completed", venue:"Classroom Block",
      description:"20-team quiz on Fiqh, Hadith, and Seerah. Winners get certificates.",
      participants:80, coordinator:"Usthad Rasheed", budget:1500, winner:"Class 4A",
    },
    {
      id:"SK003", title:"Charity Collection – Ramadan", category:"Charity",
      date:"2026-03-15", status:"completed", venue:"School Premises",
      description:"Students collected donations for needy families during Ramadan.",
      participants:142, coordinator:"Usthada Zubeda", budget:0, collected:8500,
    },
    {
      id:"SK004", title:"Nasheeds & Madh Night", category:"Cultural",
      date:"2026-05-02", status:"upcoming", venue:"School Auditorium",
      description:"Evening of Islamic nasheeds, poetry, and qasidas by students.",
      participants:60, coordinator:"Usthad Abdul Kareem", budget:3000,
    },
    {
      id:"SK005", title:"Sports & Games Day", category:"Sports",
      date:"2026-05-15", status:"upcoming", venue:"School Ground",
      description:"Cricket, football, and track events for all classes.",
      participants:142, coordinator:"Usthad Rasheed", budget:2500,
    },
    {
      id:"SK006", title:"Annual Picnic & Outing", category:"Outing",
      date:"2026-02-28", status:"completed", venue:"Calicut Beach Park",
      description:"Annual recreational outing for all students and staff.",
      participants:120, coordinator:"Usthada Zubeda", budget:5000,
    },
    {
      id:"SK007", title:"Parents Interaction Day", category:"Community",
      date:"2026-04-25", status:"upcoming", venue:"Main Hall",
      description:"SKSBV-organised event for parents to interact with union leaders.",
      participants:50, coordinator:"Usthad Abdul Kareem", budget:1000,
    },
    {
      id:"SK008", title:"Blood Donation Drive", category:"Charity",
      date:"2026-01-10", status:"completed", venue:"School Premises",
      description:"Community blood donation drive organised by SKSBV in collaboration with local hospital.",
      participants:25, coordinator:"Usthad Rasheed", budget:500, collected:0,
    },
  ],
  stats: {
    totalMembers: 142, executiveCount: 7,
    programsThisYear: 8, completedPrograms: 4,
    totalBudget: 15500, fundsRaised: 8500,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTIONS MODULE
// ─────────────────────────────────────────────────────────────────────────────

// Election Type 1: Parent Portal Vote (one vote per parent per election)
// Election Type 2: Class Vote via Teacher (teacher opens session, students vote)

export type ElectionType = "parent_vote" | "class_vote";
export type ElectionStatus = "draft" | "active" | "closed" | "results_published";
export type VoteStatus = "not_voted" | "voted";

// Category determines the post being contested
export type ElectionCategory =
  | "madrasa_leader"
  | "sksbv_chairman"
  | "sksbv_convener"
  | "sksbv_secretary"
  | "sksbv_president"
  | "sksbv_treasurer"
  | "class_monitor"
  | "best_student"
  | "ibadah_champion"
  | "quran_reciter"
  | "custom";

export const CATEGORY_META: Record<ElectionCategory, { label: string; label_ml: string; color: string; bg: string; emoji: string; group: string }> = {
  madrasa_leader:   { label: "Madrasa Leader",   label_ml: "മദ്‌റസ ലീഡർ",          color: "text-emerald-700", bg: "bg-emerald-100", emoji: "🏫", group: "Madrasa"  },
  sksbv_chairman:   { label: "SKSBV Chairman",    label_ml: "SKSBV ചെയർമാൻ",        color: "text-teal-700",    bg: "bg-teal-100",    emoji: "👑", group: "SKSBV"    },
  sksbv_convener:   { label: "SKSBV Convener",    label_ml: "SKSBV കൺവീനർ",         color: "text-teal-700",    bg: "bg-teal-100",    emoji: "📋", group: "SKSBV"    },
  sksbv_secretary:  { label: "SKSBV Secretary",   label_ml: "SKSBV സെക്രട്ടറി",     color: "text-teal-700",    bg: "bg-teal-100",    emoji: "✍️", group: "SKSBV"    },
  sksbv_president:  { label: "SKSBV President",   label_ml: "SKSBV പ്രസിഡൻ്റ്",    color: "text-purple-700",  bg: "bg-purple-100",  emoji: "🎖️", group: "SKSBV"    },
  sksbv_treasurer:  { label: "SKSBV Treasurer",   label_ml: "SKSBV ട്രഷറർ",         color: "text-blue-700",    bg: "bg-blue-100",    emoji: "💰", group: "SKSBV"    },
  class_monitor:    { label: "Class Monitor",     label_ml: "ക്ലാസ് മോണിറ്റർ",     color: "text-orange-700",  bg: "bg-orange-100",  emoji: "📌", group: "Class"    },
  best_student:     { label: "Best Student",      label_ml: "മികച്ച വിദ്യാർത്ഥി",   color: "text-amber-700",   bg: "bg-amber-100",   emoji: "🌟", group: "Class"    },
  ibadah_champion:  { label: "Ibadah Champion",   label_ml: "ഇബാദത്ത് ചാമ്പ്യൻ",   color: "text-green-700",   bg: "bg-green-100",   emoji: "🌙", group: "Class"    },
  quran_reciter:    { label: "Quran Reciter",     label_ml: "ഖുർആൻ പാരായണം",       color: "text-rose-700",    bg: "bg-rose-100",    emoji: "📖", group: "Madrasa"  },
  custom:           { label: "Custom",            label_ml: "ഇഷ്ടാനുസൃതം",          color: "text-gray-700",    bg: "bg-gray-100",    emoji: "⚙️", group: "Custom"   },
};

export interface ElectionCandidate {
  id: string;
  name: string;
  class: string;
  position: string;
  photo: string | null;
  bio: string;
  bio_ml: string;
  voteCount: number;
  symbol: string;
}

export interface ParentVoteRecord {
  parentId: string;
  studentId: string;    // which child they voted for/from
  candidateId: string;
  votedAt: string;
}

export interface ClassVoteRecord {
  studentId: string;
  candidateId: string;
  votedAt: string;
}

export interface Election {
  id: string;
  type: ElectionType;
  category: ElectionCategory;
  madrasaId?: string;          // for multi-madrasa support
  madrasaName?: string;
  title: string;
  title_ml: string;
  description: string;
  description_ml: string;
  position: string;
  position_ml: string;
  status: ElectionStatus;
  startDate: string;
  endDate: string;
  class: string | "all";
  teacherId?: string;
  candidates: ElectionCandidate[];
  totalEligibleVoters: number;
  totalVotesCast: number;
  parentVotes?: ParentVoteRecord[];
  classVotes?: ClassVoteRecord[];
  winnerCandidateId?: string;
  sessionOpenedAt?: string;
  sessionClosedAt?: string;
}

export const elections: Election[] = [
  // ── TYPE 1: Parent Vote Elections ──────────────────────────────────────
  {
    id: "EL001",
    type: "parent_vote",
    category: "madrasa_leader",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "Madrasa School Leader Election 2026",
    title_ml: "മദ്‌റസ സ്‌കൂൾ ലീഡർ തിരഞ്ഞെടുപ്പ് 2026",
    description: "Parents vote to elect the School Leader for the academic year 2026. Each parent gets one vote for one candidate.",
    description_ml: "2026 അദ്ധ്യയന വർഷത്തെ സ്‌കൂൾ ലീഡറെ തിരഞ്ഞെടുക്കാൻ രക്ഷിതാക്കൾ വോട്ട് ചെയ്യുന്നു. ഓരോ രക്ഷിതാവിനും ഒരു സ്ഥാനാർത്ഥിക്ക് ഒരു വോട്ട് ചെയ്യാം.",
    position: "School Leader",
    position_ml: "സ്‌കൂൾ ലീഡർ",
    status: "active",
    startDate: "2026-04-01",
    endDate: "2026-04-10",
    class: "all",
    totalEligibleVoters: 8,
    totalVotesCast: 5,
    candidates: [
      {
        id: "EC001",
        name: "Ahmed Bin Abdullah",
        class: "Class 4",
        position: "School Leader",
        photo: null,
        symbol: "⭐",
        bio: "Dedicated student with excellent academic record. Has been class representative for 2 years. Committed to improving madrasa activities.",
        bio_ml: "മികച്ച അക്കാദമിക് റെക്കോർഡുള്ള സമർപ്പിത വിദ്യാർത്ഥി. 2 വർഷം ക്ലാസ് റെപ്രസന്റേറ്റിവ് ആയിരുന്നു.",
        voteCount: 3,
      },
      {
        id: "EC002",
        name: "Ibrahim Khaleel",
        class: "Class 4",
        position: "School Leader",
        photo: null,
        symbol: "🌙",
        bio: "Active in Islamic activities and Quran competitions. Wants to organise more community events and strengthen ibadah culture.",
        bio_ml: "ഇസ്‌ലാമിക് പ്രവർത്തനങ്ങളിലും ഖുർആൻ മത്സരങ്ങളിലും സജീവം. കൂടുതൽ കമ്മ്യൂണിറ്റി ഇവൻ്റുകൾ സംഘടിപ്പിക്കാൻ ആഗ്രഹിക്കുന്നു.",
        voteCount: 2,
      },
      {
        id: "EC003",
        name: "Yusuf Salim",
        class: "Class 4",
        position: "School Leader",
        photo: null,
        symbol: "📖",
        bio: "Top student in Arabic and Quran studies. Believes in disciplined learning and wants to build a stronger homework culture.",
        bio_ml: "അറബിക്, ഖുർആൻ പഠനത്തിൽ മുൻനിര വിദ്യാർത്ഥി. അച്ചടക്കമുള്ള പഠനത്തിൽ വിശ്വസിക്കുന്നു.",
        voteCount: 0,
      },
    ],
    parentVotes: [
      { parentId: "P001", studentId: "S001", candidateId: "EC001", votedAt: "2026-04-02T09:15:00" },
      { parentId: "P002", studentId: "S002", candidateId: "EC002", votedAt: "2026-04-02T10:30:00" },
      { parentId: "P003", studentId: "S003", candidateId: "EC001", votedAt: "2026-04-03T08:45:00" },
      { parentId: "P004", studentId: "S004", candidateId: "EC002", votedAt: "2026-04-03T11:00:00" },
      { parentId: "P005", studentId: "S005", candidateId: "EC001", votedAt: "2026-04-04T09:00:00" },
    ],
  },
  {
    id: "EL002",
    type: "parent_vote",
    category: "quran_reciter",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "Best Quran Reciter Award 2026",
    title_ml: "മികച്ച ഖുർആൻ പാരായണക്കാർക്കുള്ള അവാർഡ് 2026",
    description: "Parents nominate the best Quran reciter from their child's class. Results will be announced at Annual Day.",
    description_ml: "രക്ഷിതാക്കൾ അവരുടെ കുട്ടിയുടെ ക്ലാസ്സിൽ നിന്ന് മികച്ച ഖുർആൻ പാരായണക്കാരനെ നോമിനേറ്റ് ചെയ്യുന്നു.",
    position: "Best Quran Reciter",
    position_ml: "മികച്ച ഖുർആൻ പാരായണക്കാർ",
    status: "closed",
    startDate: "2026-03-01",
    endDate: "2026-03-20",
    class: "all",
    totalEligibleVoters: 8,
    totalVotesCast: 8,
    winnerCandidateId: "EC005",
    candidates: [
      {
        id: "EC004",
        name: "Fatima Zahra",
        class: "Class 4",
        position: "Best Quran Reciter",
        photo: null,
        symbol: "🌸",
        bio: "Memorised 5 Juz of Quran. Melodious voice and precise tajweed. Won 1st place in district-level competition.",
        bio_ml: "ഖുർആനിലെ 5 ജുസ്ഉ് ഹിഫ്ദ് ചെയ്തു. ജില്ലാ മത്സരത്തിൽ ഒന്നാം സ്ഥാനം.",
        voteCount: 3,
      },
      {
        id: "EC005",
        name: "Aisha Siddiqui",
        class: "Class 4",
        position: "Best Quran Reciter",
        photo: null,
        symbol: "🌟",
        bio: "Completed Hifz of 10 Juz. Known for beautiful and accurate recitation with proper maqamat.",
        bio_ml: "10 ജുസ്ഉ് ഹിഫ്ദ് പൂർത്തിയാക്കി. ഒഴുക്കുള്ള ഓത്ത് ശൈലിക്ക് പ്രശസ്തി.",
        voteCount: 5,
      },
    ],
    parentVotes: [
      { parentId: "P001", studentId: "S001", candidateId: "EC005", votedAt: "2026-03-05T09:00:00" },
      { parentId: "P002", studentId: "S002", candidateId: "EC004", votedAt: "2026-03-06T10:00:00" },
      { parentId: "P003", studentId: "S003", candidateId: "EC005", votedAt: "2026-03-07T09:30:00" },
      { parentId: "P004", studentId: "S004", candidateId: "EC004", votedAt: "2026-03-08T11:00:00" },
      { parentId: "P005", studentId: "S005", candidateId: "EC004", votedAt: "2026-03-09T09:00:00" },
      { parentId: "P006", studentId: "S007", candidateId: "EC005", votedAt: "2026-03-10T08:00:00" },
      { parentId: "P007", studentId: "S008", candidateId: "EC005", votedAt: "2026-03-11T10:30:00" },
      { parentId: "P008", studentId: "S008", candidateId: "EC005", votedAt: "2026-03-12T09:45:00" },
    ],
  },

  // ── TYPE 2: Class Vote via Teacher ─────────────────────────────────────
  {
    id: "EL003",
    type: "class_vote",
    category: "class_monitor",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "Class 4-A Monitor Election",
    title_ml: "ക്ലാസ് 4-A മോണിറ്റർ തിരഞ്ഞെടുപ്പ്",
    description: "Students of Class 4-A vote to elect their class monitor for the term.",
    description_ml: "ക്ലാസ് 4-A-ലെ വിദ്യാർത്ഥികൾ അവരുടെ ക്ലാസ് മോണിറ്ററെ തിരഞ്ഞെടുക്കുന്നു.",
    position: "Class Monitor",
    position_ml: "ക്ലാസ് മോണിറ്റർ",
    status: "active",
    startDate: "2026-04-02",
    endDate: "2026-04-02",
    class: "Class 4",
    teacherId: "T001",
    sessionOpenedAt: "2026-04-02T09:00:00",
    totalEligibleVoters: 5,
    totalVotesCast: 3,
    candidates: [
      {
        id: "EC006",
        name: "Ahmed Bin Abdullah",
        class: "Class 4",
        position: "Class Monitor",
        photo: null,
        symbol: "🏅",
        bio: "Responsible and punctual. Always helps classmates.",
        bio_ml: "ഉത്തരവാദിത്തമുള്ള, ക്ലാസ്‌മേറ്റ്‌സിനെ സഹായിക്കുന്ന വിദ്യാർത്ഥി.",
        voteCount: 2,
      },
      {
        id: "EC007",
        name: "Fatima Zahra",
        class: "Class 4",
        position: "Class Monitor",
        photo: null,
        symbol: "🌺",
        bio: "Excellent in studies and discipline. Great communication skills.",
        bio_ml: "പഠനത്തിലും അച്ചടക്കത്തിലും മികച്ചവൾ.",
        voteCount: 1,
      },
    ],
    classVotes: [
      { studentId: "S001", candidateId: "EC006", votedAt: "2026-04-02T09:10:00" },
      { studentId: "S002", candidateId: "EC006", votedAt: "2026-04-02T09:12:00" },
      { studentId: "S003", candidateId: "EC007", votedAt: "2026-04-02T09:14:00" },
    ],
  },
  {
    id: "EL004",
    type: "class_vote",
    category: "best_student",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "Class 3 Best Student Award",
    title_ml: "ക്ലാസ് 3 മികച്ച വിദ്യാർത്ഥി അവാർഡ്",
    description: "Class 3 students vote for the most hardworking and disciplined student of the term.",
    description_ml: "ക്ലാസ് 3 വിദ്യാർത്ഥികൾ ഏറ്റവും കഠിനാധ്വാനിയും അച്ചടക്കമുള്ളവനുമായ വിദ്യാർത്ഥിക്ക് വോട്ട് ചെയ്യുന്നു.",
    position: "Best Student",
    position_ml: "മികച്ച വിദ്യാർത്ഥി",
    status: "results_published",
    startDate: "2026-03-15",
    endDate: "2026-03-15",
    class: "Class 3",
    teacherId: "T003",
    sessionOpenedAt: "2026-03-15T10:00:00",
    sessionClosedAt: "2026-03-15T10:30:00",
    totalEligibleVoters: 2,
    totalVotesCast: 2,
    winnerCandidateId: "EC008",
    candidates: [
      {
        id: "EC008",
        name: "Umar Farooq",
        class: "Class 3",
        position: "Best Student",
        photo: null,
        symbol: "🥇",
        bio: "Consistent top scorer. Never absent. Helps peers with studies.",
        bio_ml: "സ്ഥിരമായി ഒന്നാം സ്ഥാനം. ഒരിക്കലും ഗൈർഹാജർ ആകില്ല.",
        voteCount: 2,
      },
      {
        id: "EC009",
        name: "Maryam Noor",
        class: "Class 3",
        position: "Best Student",
        photo: null,
        symbol: "🌈",
        bio: "Creative student with excellent Quran memorisation and artistic talents.",
        bio_ml: "ഖുർആൻ ഹിഫ്ദും കലാ കഴിവുകളും ഉള്ള സർഗ്ഗശേഷിയുള്ള വിദ്യാർത്ഥി.",
        voteCount: 0,
      },
    ],
    classVotes: [
      { studentId: "S006", candidateId: "EC008", votedAt: "2026-03-15T10:05:00" },
      { studentId: "S007", candidateId: "EC008", votedAt: "2026-03-15T10:08:00" },
    ],
  },
  {
    id: "EL005",
    type: "class_vote",
    category: "ibadah_champion",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "Class 2 Ibadah Champion",
    title_ml: "ക്ലാസ് 2 ഇബാദത്ത് ചാമ്പ്യൻ",
    description: "Class 2 students vote for the student who has shown the best ibadah consistency this term.",
    description_ml: "ക്ലാസ് 2 വിദ്യാർത്ഥികൾ ഈ ടേം മികച്ച ഇബാദത്ത് കാണിച്ച വിദ്യാർത്ഥിക്ക് വോട്ട് ചെയ്യുന്നു.",
    position: "Ibadah Champion",
    position_ml: "ഇബാദത്ത് ചാമ്പ്യൻ",
    status: "draft",
    startDate: "2026-04-10",
    endDate: "2026-04-10",
    class: "Class 2",
    teacherId: "T002",
    totalEligibleVoters: 1,
    totalVotesCast: 0,
    candidates: [
      {
        id: "EC010",
        name: "Hamza Rashid",
        class: "Class 2",
        position: "Ibadah Champion",
        photo: null,
        symbol: "🌙",
        bio: "Never missed a single day of Fard prayers tracking. Perfect ibadah score.",
        bio_ml: "ഒരു ദിവസം പോലും ഫർദ് നമസ്‌കാരം ഒഴിവാക്കിയിട്ടില്ല. പൂർണ ഇബാദത്ത് സ്‌കോർ.",
        voteCount: 0,
      },
    ],
    classVotes: [],
  },

  // ── SKSBV Elections ─────────────────────────────────────────────────────
  {
    id: "EL006",
    type: "parent_vote",
    category: "sksbv_chairman",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "SKSBV Chairman Election 2026",
    title_ml: "SKSBV ചെയർമാൻ തിരഞ്ഞെടുപ്പ് 2026",
    description: "Parents elect the SKSBV (Student Union) Chairman for the academic year 2026-27. The Chairman leads all student union activities and represents students to the management.",
    description_ml: "2026-27 അദ്ധ്യയന വർഷത്തേക്ക് SKSBV (വിദ്യാർത്ഥി യൂണിയൻ) ചെയർമാനെ തിരഞ്ഞെടുക്കാൻ രക്ഷിതാക്കൾ വോട്ട് ചെയ്യുന്നു. ചെയർമാൻ എല്ലാ വിദ്യാർത്ഥി യൂണിയൻ പ്രവർത്തനങ്ങളും നയിക്കും.",
    position: "SKSBV Chairman",
    position_ml: "SKSBV ചെയർമാൻ",
    status: "active",
    startDate: "2026-04-01",
    endDate: "2026-04-15",
    class: "all",
    totalEligibleVoters: 8,
    totalVotesCast: 6,
    candidates: [
      {
        id: "EC011",
        name: "Ahmed Bin Abdullah",
        class: "Class 4",
        position: "SKSBV Chairman",
        photo: null,
        symbol: "👑",
        bio: "Strong leadership skills. Organised 3 major events. Committed to making SKSBV more inclusive and active.",
        bio_ml: "ശക്തമായ നേതൃത്വ കഴിവുകൾ. 3 പ്രധാന ഇവൻ്റുകൾ സംഘടിപ്പിച്ചു. SKSBV-യെ കൂടുതൽ ഉൾക്കൊള്ളുന്നതും സജീവവും ആക്കാൻ പ്രതിജ്ഞാബദ്ധൻ.",
        voteCount: 4,
      },
      {
        id: "EC012",
        name: "Ibrahim Khaleel",
        class: "Class 4",
        position: "SKSBV Chairman",
        photo: null,
        symbol: "🌟",
        bio: "Experienced class representative with excellent communication. Plans to strengthen inter-class bonding and Islamic culture.",
        bio_ml: "മികച്ച ആശയ വിനിമയ ശേഷിയുള്ള പരിചയസമ്പന്ന ക്ലാസ് പ്രതിനിധി. ക്ലാസ്സ് ബന്ധവും ഇസ്‌ലാമിക് സംസ്‌കാരവും ശക്തിപ്പെടുത്താൻ ആഗ്രഹിക്കുന്നു.",
        voteCount: 2,
      },
    ],
    parentVotes: [
      { parentId: "P001", studentId: "S001", candidateId: "EC011", votedAt: "2026-04-02T09:00:00" },
      { parentId: "P002", studentId: "S002", candidateId: "EC012", votedAt: "2026-04-02T10:00:00" },
      { parentId: "P003", studentId: "S003", candidateId: "EC011", votedAt: "2026-04-03T09:30:00" },
      { parentId: "P004", studentId: "S004", candidateId: "EC011", votedAt: "2026-04-03T11:00:00" },
      { parentId: "P005", studentId: "S005", candidateId: "EC012", votedAt: "2026-04-04T09:00:00" },
      { parentId: "P006", studentId: "S007", candidateId: "EC011", votedAt: "2026-04-04T10:00:00" },
    ],
  },
  {
    id: "EL007",
    type: "parent_vote",
    category: "sksbv_convener",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "SKSBV Convener Election 2026",
    title_ml: "SKSBV കൺവീനർ തിരഞ്ഞെടുപ്പ് 2026",
    description: "Parents elect the SKSBV Convener who will coordinate meetings, plan agendas and ensure smooth functioning of the student union activities throughout the year.",
    description_ml: "യോഗങ്ങൾ ഏകോപിപ്പിക്കുകയും അജണ്ട ആസൂത്രണം ചെയ്യുകയും വർഷം മുഴുവൻ വിദ്യാർത്ഥി യൂണിയൻ പ്രവർത്തനങ്ങൾ സുഗമമായി നടത്തിക്കൊണ്ടുപോകുകയും ചെയ്യുന്ന SKSBV കൺവീനറെ രക്ഷിതാക്കൾ തിരഞ്ഞെടുക്കുന്നു.",
    position: "SKSBV Convener",
    position_ml: "SKSBV കൺവീനർ",
    status: "active",
    startDate: "2026-04-01",
    endDate: "2026-04-15",
    class: "all",
    totalEligibleVoters: 8,
    totalVotesCast: 5,
    candidates: [
      {
        id: "EC013",
        name: "Fatima Zahra",
        class: "Class 4",
        position: "SKSBV Convener",
        photo: null,
        symbol: "📋",
        bio: "Detail-oriented and organised. Has successfully coordinated 5 inter-class events. Excellent at follow-up and documentation.",
        bio_ml: "ആസൂത്രണ കഴിവ് മികച്ചത്. 5 ഇൻ്റർ-ക്ലാസ് ഇവൻ്റുകൾ ഏകോപിപ്പിച്ചു. ഡോക്യുമെൻ്റേഷനിൽ മികവ്.",
        voteCount: 3,
      },
      {
        id: "EC014",
        name: "Aisha Siddiqui",
        class: "Class 4",
        position: "SKSBV Convener",
        photo: null,
        symbol: "🌸",
        bio: "Active in all school committees. Strong planner with a track record of completing projects on time.",
        bio_ml: "എല്ലാ സ്കൂൾ കമ്മിറ്റികളിലും സജീവം. സമയബന്ധിതമായി പ്രോജക്‌ടുകൾ പൂർത്തിയാക്കുന്ന ശക്തമായ ആസൂത്രകൻ.",
        voteCount: 2,
      },
    ],
    parentVotes: [
      { parentId: "P001", studentId: "S001", candidateId: "EC013", votedAt: "2026-04-02T09:10:00" },
      { parentId: "P002", studentId: "S002", candidateId: "EC014", votedAt: "2026-04-02T10:10:00" },
      { parentId: "P003", studentId: "S003", candidateId: "EC013", votedAt: "2026-04-03T09:40:00" },
      { parentId: "P004", studentId: "S004", candidateId: "EC013", votedAt: "2026-04-03T11:10:00" },
      { parentId: "P005", studentId: "S005", candidateId: "EC014", votedAt: "2026-04-04T09:10:00" },
    ],
  },
  {
    id: "EL008",
    type: "parent_vote",
    category: "sksbv_secretary",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "SKSBV Secretary Election 2026",
    title_ml: "SKSBV സെക്രട്ടറി തിരഞ്ഞെടുപ്പ് 2026",
    description: "Parents elect the SKSBV Secretary responsible for maintaining records, minutes of meetings, correspondence and official documentation of the student union.",
    description_ml: "രേഖകൾ, മിനിറ്റ്‌സ്, കത്തിടപാടുകൾ, ഔദ്യോഗിക ഡോക്യുമെൻ്റേഷൻ എന്നിവ സൂക്ഷിക്കേണ്ട SKSBV സെക്രട്ടറിയെ രക്ഷിതാക്കൾ തിരഞ്ഞെടുക്കുന്നു.",
    position: "SKSBV Secretary",
    position_ml: "SKSBV സെക്രട്ടറി",
    status: "draft",
    startDate: "2026-04-05",
    endDate: "2026-04-18",
    class: "all",
    totalEligibleVoters: 8,
    totalVotesCast: 0,
    candidates: [
      {
        id: "EC015",
        name: "Yusuf Salim",
        class: "Class 4",
        position: "SKSBV Secretary",
        photo: null,
        symbol: "✍️",
        bio: "Excellent writing skills. Always punctual with submissions. Has maintained class diary perfectly for 2 years.",
        bio_ml: "മികച്ച എഴുത്ത് കഴിവ്. സമർപ്പണത്തിൽ കൃത്യനിഷ്ഠ. 2 വർഷം ക്ലാസ് ഡയറി മികവോടെ സൂക്ഷിച്ചു.",
        voteCount: 0,
      },
      {
        id: "EC016",
        name: "Maryam Noor",
        class: "Class 3",
        position: "SKSBV Secretary",
        photo: null,
        symbol: "📝",
        bio: "Creative writer with excellent memory and organisational skills. Represented school in essay competitions.",
        bio_ml: "മികച്ച മെമ്മറി, ഓർഗനൈസേഷൻ സ്‌കിൽ. ഉപന്യാസ മത്സരങ്ങളിൽ സ്‌കൂളിനെ പ്രതിനിധീകരിച്ചു.",
        voteCount: 0,
      },
    ],
    parentVotes: [],
  },
  {
    id: "EL009",
    type: "parent_vote",
    category: "sksbv_president",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "SKSBV President Election 2026",
    title_ml: "SKSBV പ്രസിഡൻ്റ് തിരഞ്ഞെടുപ്പ് 2026",
    description: "Parents elect the SKSBV President — the highest student office bearer who will represent the student body at all official functions and liaise with teachers and management.",
    description_ml: "ഏറ്റവും ഉയർന്ന വിദ്യാർത്ഥി ഓഫീസ് ഹോൾഡർ — SKSBV പ്രസിഡൻ്റ് — എല്ലാ ഔദ്യോഗിക ചടങ്ങുകളിലും വിദ്യാർത്ഥി സമൂഹത്തെ പ്രതിനിധീകരിക്കും.",
    position: "SKSBV President",
    position_ml: "SKSBV പ്രസിഡൻ്റ്",
    status: "closed",
    startDate: "2026-03-10",
    endDate: "2026-03-25",
    class: "all",
    totalEligibleVoters: 8,
    totalVotesCast: 8,
    winnerCandidateId: "EC017",
    candidates: [
      {
        id: "EC017",
        name: "Umar Farooq",
        class: "Class 3",
        position: "SKSBV President",
        photo: null,
        symbol: "🎖️",
        bio: "Charismatic leader. Organised the Annual Day programme with great success. Known for fairness and approachability.",
        bio_ml: "ആകർഷകനായ നേതാവ്. വാർഷിക ദിന പരിപാടി വിജയകരമായി സംഘടിപ്പിച്ചു. നേർമയ്ക്കും സൗഹൃദ സ്വഭാവത്തിനും പ്രശസ്തൻ.",
        voteCount: 5,
      },
      {
        id: "EC018",
        name: "Hamza Rashid",
        class: "Class 2",
        position: "SKSBV President",
        photo: null,
        symbol: "⚡",
        bio: "Energetic and passionate about madrasa improvement. Has a concrete 5-point plan for student welfare.",
        bio_ml: "മദ്‌റസ വികസനത്തിൽ ഊർജ്ജസ്വലനും ആവേശഭരിതനും. വിദ്യാർത്ഥി ക്ഷേമത്തിനായി 5 പോയിൻ്റ് പ്ലാൻ.",
        voteCount: 3,
      },
    ],
    parentVotes: [
      { parentId: "P001", studentId: "S001", candidateId: "EC017", votedAt: "2026-03-12T09:00:00" },
      { parentId: "P002", studentId: "S002", candidateId: "EC018", votedAt: "2026-03-12T10:00:00" },
      { parentId: "P003", studentId: "S003", candidateId: "EC017", votedAt: "2026-03-13T09:30:00" },
      { parentId: "P004", studentId: "S004", candidateId: "EC017", votedAt: "2026-03-13T11:00:00" },
      { parentId: "P005", studentId: "S005", candidateId: "EC018", votedAt: "2026-03-14T09:00:00" },
      { parentId: "P006", studentId: "S007", candidateId: "EC017", votedAt: "2026-03-14T10:00:00" },
      { parentId: "P007", studentId: "S008", candidateId: "EC018", votedAt: "2026-03-15T09:00:00" },
      { parentId: "P008", studentId: "S008", candidateId: "EC017", votedAt: "2026-03-15T11:00:00" },
    ],
  },
  {
    id: "EL010",
    type: "parent_vote",
    category: "sksbv_treasurer",
    madrasaId: "MDA001",
    madrasaName: "Noor ul Islam Madrasa",
    title: "SKSBV Treasurer Election 2026",
    title_ml: "SKSBV ട്രഷറർ തിരഞ്ഞെടുപ്പ് 2026",
    description: "Parents elect the SKSBV Treasurer who will manage student union funds, maintain accounts and ensure transparent financial operations of all student activities.",
    description_ml: "വിദ്യാർത്ഥി യൂണിയൻ ഫണ്ടുകൾ കൈകാര്യം ചെയ്യുകയും അക്കൗണ്ടുകൾ സൂക്ഷിക്കുകയും എല്ലാ വിദ്യാർത്ഥി പ്രവർത്തനങ്ങളുടെ സുതാര്യമായ സാമ്പത്തിക കാര്യങ്ങൾ ഉറപ്പുവരുത്തുകയും ചെയ്യുന്ന SKSBV ട്രഷററെ രക്ഷിതാക്കൾ തിരഞ്ഞെടുക്കുന്നു.",
    position: "SKSBV Treasurer",
    position_ml: "SKSBV ട്രഷറർ",
    status: "results_published",
    startDate: "2026-03-01",
    endDate: "2026-03-15",
    class: "all",
    totalEligibleVoters: 8,
    totalVotesCast: 7,
    winnerCandidateId: "EC019",
    candidates: [
      {
        id: "EC019",
        name: "Ahmed Bin Abdullah",
        class: "Class 4",
        position: "SKSBV Treasurer",
        photo: null,
        symbol: "💰",
        bio: "Math topper for 3 consecutive years. Transparent and trustworthy. Has managed class fund collection with zero discrepancy.",
        bio_ml: "തുടർച്ചയായി 3 വർഷം ഗണിതത്തിൽ ഒന്നാം സ്ഥാനം. ക്ലാസ് ഫണ്ട് ശേഖരണം കൃത്യതയോടെ നടത്തി.",
        voteCount: 5,
      },
      {
        id: "EC020",
        name: "Ibrahim Khaleel",
        class: "Class 4",
        position: "SKSBV Treasurer",
        photo: null,
        symbol: "📊",
        bio: "Excellent in Mathematics and accounting basics. Has proposed a digital tracking system for student union funds.",
        bio_ml: "ഗണിതം, അക്കൗണ്ടിംഗ് ബേസിക്‌സ്. ഡിജിറ്റൽ ട്രാക്കിംഗ് സിസ്‌റ്റം നിർദ്ദേശിച്ചു.",
        voteCount: 2,
      },
    ],
    parentVotes: [
      { parentId: "P001", studentId: "S001", candidateId: "EC019", votedAt: "2026-03-03T09:00:00" },
      { parentId: "P002", studentId: "S002", candidateId: "EC020", votedAt: "2026-03-04T10:00:00" },
      { parentId: "P003", studentId: "S003", candidateId: "EC019", votedAt: "2026-03-05T09:30:00" },
      { parentId: "P004", studentId: "S004", candidateId: "EC019", votedAt: "2026-03-06T11:00:00" },
      { parentId: "P005", studentId: "S005", candidateId: "EC020", votedAt: "2026-03-07T09:00:00" },
      { parentId: "P006", studentId: "S007", candidateId: "EC019", votedAt: "2026-03-08T10:00:00" },
      { parentId: "P007", studentId: "S008", candidateId: "EC019", votedAt: "2026-03-09T09:00:00" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Committee Dashboard Data
// ─────────────────────────────────────────────────────────────────────────────

export interface CommitteeFeeMonth {
  month: string;
  month_ml: string;
  collected: number;
  target: number;
}

export interface CommitteeAttendanceWeek {
  day: string;
  day_ml: string;
  present: number;
  absent: number;
}

export interface CommitteeClassStat {
  className: string;
  students: number;
  attendancePct: number;
  avgScore: number;
  hwCompletion: number;
}

export interface CommitteeAnnouncement {
  id: string;
  title: string;
  title_ml: string;
  date: string;
  priority: "high" | "medium" | "low";
}

export type ExpenseCategoryId =
  | "infrastructure"
  | "programs"
  | "salaries"
  | "maintenance"
  | "utilities"
  | "stationery";

export interface ExpenseCategory {
  id: ExpenseCategoryId;
  label: string;
  label_ml: string;
  budget: number;
  spent: number;
  color: string;
  icon: string;
}

export interface ExpenseItem {
  id: string;
  category: ExpenseCategoryId;
  title: string;
  title_ml: string;
  amount: number;
  date: string;
  paidTo: string;
  paidTo_ml: string;
  status: "paid" | "pending";
  note?: string;
}

export interface CommitteeExpenseMonth {
  month: string;
  month_ml: string;
  amount: number;
}

export interface CommitteeTopStudent {
  name: string;
  class: string;
  achievement: string;
  achievement_ml: string;
  score?: number;
}

export interface CommitteeSummary {
  madrasa: {
    name: string;
    name_ml: string;
    established: string;
    location: string;
    location_ml: string;
    session: string;
  };
  overview: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    activeSince: string;
  };
  fees: {
    totalAnnualTarget: number;
    collectedSoFar: number;
    pendingAmount: number;
    paidStudents: number;
    unpaidStudents: number;
    collectionPct: number;
    monthlyTrend: CommitteeFeeMonth[];
  };
  attendance: {
    overallPct: number;
    todayPresent: number;
    todayAbsent: number;
    weeklyTrend: CommitteeAttendanceWeek[];
    lowAttendanceStudents: number;
    staff: {
      totalStaff: number;
      presentToday: number;
      absentToday: number;
      onLeaveToday: number;
      overallPct: number;
      weeklyTrend: CommitteeAttendanceWeek[];
      staffList: {
        id: string;
        name: string;
        role: string;
        role_ml: string;
        subject: string;
        subject_ml: string;
        todayStatus: "present" | "absent" | "leave";
        attendancePct: number;
      }[];
    };
  };
  academic: {
    lastExamAvgScore: number;
    passRate: number;
    topStudents: CommitteeTopStudent[];
    classStats: CommitteeClassStat[];
  };
  ibadah: {
    quranCompletionPct: number;
    prayerTrackedStudents: number;
    ibadahChampions: { name: string; class: string; score: number }[];
  };
  elections: {
    activeCount: number;
    completedCount: number;
    sksbvUnionMembers: { post: string; post_ml: string; name: string }[];
  };
  expenses: {
    annualBudget: number;
    totalSpent: number;
    balance: number;
    spentPct: number;
    categories: ExpenseCategory[];
    recentExpenses: ExpenseItem[];
    monthlyTrend: CommitteeExpenseMonth[];
  };
  announcements: CommitteeAnnouncement[];
}

export const committeeSummary: CommitteeSummary = {
  madrasa: {
    name: "Smart Madrasa",
    name_ml: "സ്മാർട്ട് മദ്‌റസ",
    established: "1998",
    location: "Malappuram, Kerala",
    location_ml: "മലപ്പുറം, കേരള",
    session: "2025–2026",
  },
  overview: {
    totalStudents: 124,
    totalTeachers: 8,
    totalClasses: 7,
    activeSince: "June 2025",
  },
  fees: {
    totalAnnualTarget: 372000,
    collectedSoFar: 289600,
    pendingAmount: 82400,
    paidStudents: 98,
    unpaidStudents: 26,
    collectionPct: 78,
    monthlyTrend: [
      { month: "Oct", month_ml: "ഒക്ടോ", collected: 41200,  target: 31000 },
      { month: "Nov", month_ml: "നവം",   collected: 38800,  target: 31000 },
      { month: "Dec", month_ml: "ഡിസ",   collected: 29400,  target: 31000 },
      { month: "Jan", month_ml: "ജനു",   collected: 52000,  target: 31000 },
      { month: "Feb", month_ml: "ഫെബ്",  collected: 68200,  target: 62000 },
      { month: "Mar", month_ml: "മാർ",   collected: 60000,  target: 62000 },
    ],
  },
  attendance: {
    overallPct: 87,
    todayPresent: 108,
    todayAbsent: 16,
    weeklyTrend: [
      { day: "Sat",  day_ml: "ശനി", present: 112, absent: 12 },
      { day: "Sun",  day_ml: "ഞായർ", present: 109, absent: 15 },
      { day: "Mon",  day_ml: "തിങ്ക", present: 118, absent: 6  },
      { day: "Tue",  day_ml: "ചൊവ്വ", present: 115, absent: 9  },
      { day: "Wed",  day_ml: "ബുധൻ", present: 113, absent: 11 },
      { day: "Thu",  day_ml: "വ്യാഴം", present: 108, absent: 16 },
    ],
    lowAttendanceStudents: 7,
    staff: {
      totalStaff: 8,
      presentToday: 7,
      absentToday: 1,
      onLeaveToday: 0,
      overallPct: 93,
      weeklyTrend: [
        { day: "Sat",  day_ml: "ശനി",   present: 8, absent: 0 },
        { day: "Sun",  day_ml: "ഞായർ",  present: 7, absent: 1 },
        { day: "Mon",  day_ml: "തിങ്ക", present: 8, absent: 0 },
        { day: "Tue",  day_ml: "ചൊവ്വ", present: 8, absent: 0 },
        { day: "Wed",  day_ml: "ബുധൻ",  present: 7, absent: 1 },
        { day: "Thu",  day_ml: "വ്യാഴം", present: 7, absent: 1 },
      ],
      staffList: [
        { id: "T001", name: "Usthad Abdul Kareem",  role: "Senior Teacher",   role_ml: "സീനിയർ ടീച്ചർ",  subject: "Quran & Islamic Studies", subject_ml: "ഖുർആൻ & ഇസ്ലാമിക്", todayStatus: "present", attendancePct: 97 },
        { id: "T002", name: "Usthada Zubeda",        role: "Teacher",          role_ml: "ടീച്ചർ",          subject: "Arabic",                  subject_ml: "അറബിക്",             todayStatus: "present", attendancePct: 95 },
        { id: "T003", name: "Usthad Rasheed",        role: "Teacher",          role_ml: "ടീച്ചർ",          subject: "Fiqh & Hadith",           subject_ml: "ഫിഖ്ഹ് & ഹദീസ്",    todayStatus: "absent",  attendancePct: 88 },
        { id: "T004", name: "Usthada Naseema",       role: "Teacher",          role_ml: "ടീച്ചർ",          subject: "Malayalam & General",     subject_ml: "മലയാളം & ജനറൽ",     todayStatus: "present", attendancePct: 92 },
        { id: "T005", name: "Usthad Hamid",          role: "Teacher",          role_ml: "ടീച്ചർ",          subject: "Mathematics",             subject_ml: "ഗണിതം",              todayStatus: "present", attendancePct: 98 },
        { id: "T006", name: "Usthada Ruhana",        role: "Teacher",          role_ml: "ടീച്ചർ",          subject: "Islamic History",         subject_ml: "ഇസ്ലാമിക ചരിത്രം",  todayStatus: "present", attendancePct: 90 },
        { id: "T007", name: "Usthad Basheer",        role: "Quran Teacher",    role_ml: "ഖുർആൻ ടീച്ചർ",   subject: "Quran Recitation",        subject_ml: "ഖുർആൻ പാരായണം",    todayStatus: "present", attendancePct: 96 },
        { id: "T008", name: "Usthada Shaheena",      role: "Asst. Teacher",    role_ml: "അസി. ടീച്ചർ",    subject: "General Studies",         subject_ml: "ജനറൽ പഠനം",         todayStatus: "present", attendancePct: 85 },
      ],
    },
  },
  academic: {
    lastExamAvgScore: 74,
    passRate: 91,
    topStudents: [
      { name: "Fathima Noor",   class: "Class 7", achievement: "1st Rank – 95%",     achievement_ml: "1-ആം സ്ഥാനം – 95%" },
      { name: "Ahmed Siraj",    class: "Class 6", achievement: "2nd Rank – 92%",     achievement_ml: "2-ആം സ്ഥാനം – 92%" },
      { name: "Zainab Kareem",  class: "Class 5", achievement: "3rd Rank – 90%",     achievement_ml: "3-ആം സ്ഥാനം – 90%" },
      { name: "Ibrahim Hamza",  class: "Class 7", achievement: "Best Quran – 98%",   achievement_ml: "മികച്ച ഖുർആൻ – 98%" },
    ],
    classStats: [
      { className: "Class 1", students: 18, attendancePct: 91, avgScore: 78, hwCompletion: 88 },
      { className: "Class 2", students: 20, attendancePct: 89, avgScore: 76, hwCompletion: 85 },
      { className: "Class 3", students: 19, attendancePct: 84, avgScore: 72, hwCompletion: 80 },
      { className: "Class 4", students: 17, attendancePct: 88, avgScore: 75, hwCompletion: 83 },
      { className: "Class 5", students: 16, attendancePct: 90, avgScore: 80, hwCompletion: 90 },
      { className: "Class 6", students: 18, attendancePct: 86, avgScore: 71, hwCompletion: 79 },
      { className: "Class 7", students: 16, attendancePct: 83, avgScore: 74, hwCompletion: 82 },
    ],
  },
  ibadah: {
    quranCompletionPct: 68,
    prayerTrackedStudents: 98,
    ibadahChampions: [
      { name: "Ibrahim Hamza",  class: "Class 7", score: 98 },
      { name: "Mariam Salih",   class: "Class 6", score: 95 },
      { name: "Yusuf Ali",      class: "Class 5", score: 93 },
    ],
  },
  elections: {
    activeCount: 4,
    completedCount: 6,
    sksbvUnionMembers: [
      { post: "President",  post_ml: "പ്രസിഡൻ്റ്",  name: "Bilal Hassan" },
      { post: "Chairman",   post_ml: "ചെയർമാൻ",     name: "Omar Farouk" },
      { post: "Convener",   post_ml: "കൺവീനർ",      name: "Hamza Nabil" },
      { post: "Secretary",  post_ml: "സെക്രട്ടറി",   name: "Pending Election" },
      { post: "Treasurer",  post_ml: "ട്രഷറർ",       name: "Salman Rafiq" },
    ],
  },
  expenses: {
    annualBudget: 480000,
    totalSpent: 312400,
    balance: 167600,
    spentPct: 65,
    categories: [
      {
        id: "salaries",
        label: "Staff Salaries",        label_ml: "ഉസ്താദ് ശമ്പളം",
        budget: 240000, spent: 200000,
        color: "violet", icon: "Users",
      },
      {
        id: "infrastructure",
        label: "Infrastructure",        label_ml: "ഇൻഫ്രാസ്ട്രക്ചർ",
        budget: 80000,  spent: 52400,
        color: "blue",  icon: "Building2",
      },
      {
        id: "programs",
        label: "Programs & Events",     label_ml: "പ്രോഗ്രാം & ഇവൻ്റ്",
        budget: 60000,  spent: 38000,
        color: "rose",  icon: "Star",
      },
      {
        id: "maintenance",
        label: "Maintenance",           label_ml: "അറ്റകുറ്റ പണി",
        budget: 40000,  spent: 12000,
        color: "amber", icon: "Wrench",
      },
      {
        id: "utilities",
        label: "Utilities",             label_ml: "യൂട്ടിലിറ്റി",
        budget: 30000,  spent: 7200,
        color: "teal",  icon: "Zap",
      },
      {
        id: "stationery",
        label: "Stationery & Books",    label_ml: "സ്റ്റേഷനറി & പുസ്തകം",
        budget: 30000,  spent: 2800,
        color: "emerald", icon: "BookOpen",
      },
    ],
    recentExpenses: [
      // ── Salaries ──
      { id: "EX001", category: "salaries",       title: "Staff Salaries – March 2026",       title_ml: "ഉസ്താദ് ശമ്പളം – മാർ 2026",          amount: 40000, date: "2026-03-31", paidTo: "All 8 Ustads",          paidTo_ml: "8 ഉസ്താദ്",              status: "paid"    },
      { id: "EX002", category: "salaries",       title: "Staff Salaries – February 2026",    title_ml: "ഉസ്താദ് ശമ്പളം – ഫെബ് 2026",         amount: 40000, date: "2026-02-28", paidTo: "All 8 Ustads",          paidTo_ml: "8 ഉസ്താദ്",              status: "paid"    },
      { id: "EX003", category: "salaries",       title: "Staff Salaries – April 2026",       title_ml: "ഉസ്താദ് ശമ്പളം – ഏപ്രിൽ 2026",       amount: 40000, date: "2026-04-30", paidTo: "All 8 Ustads",          paidTo_ml: "8 ഉസ്താദ്",              status: "pending" },
      // ── Infrastructure ──
      { id: "EX004", category: "infrastructure", title: "New Benches & Desks – Class 1–3",  title_ml: "പുതിയ ബെഞ്ച് & ഡെസ്ക് – ക്ലാ 1–3",  amount: 18500, date: "2026-02-10", paidTo: "Al-Ameen Furniture",    paidTo_ml: "അൽ-അമീൻ ഫർണ്ണിച്ചർ",   status: "paid"    },
      { id: "EX005", category: "infrastructure", title: "Whiteboard Replacement – 4 Rooms", title_ml: "വൈറ്റ്ബോർഡ് – 4 ക്ലാസ്",             amount: 9200,  date: "2026-01-25", paidTo: "National Stationery",   paidTo_ml: "നാഷണൽ സ്റ്റേഷനറി",      status: "paid"    },
      { id: "EX006", category: "infrastructure", title: "Chairs for Staff Room",             title_ml: "സ്റ്റാഫ് റൂം ചെയർ",                  amount: 6800,  date: "2026-01-18", paidTo: "Al-Ameen Furniture",    paidTo_ml: "അൽ-അമീൻ ഫർണ്ണിച്ചർ",   status: "paid"    },
      { id: "EX007", category: "infrastructure", title: "Notice Board – 2 units",            title_ml: "നോട്ടീസ് ബോർഡ് – 2 എണ്ണം",           amount: 3200,  date: "2026-01-10", paidTo: "City Hardware",         paidTo_ml: "സിറ്റി ഹാർഡ്‌വെയർ",     status: "paid"    },
      { id: "EX008", category: "infrastructure", title: "Steel Almirahs – Library",          title_ml: "ലൈബ്രറി അൽമേറ",                       amount: 14700, date: "2026-03-05", paidTo: "National Stationery",   paidTo_ml: "നാഷണൽ സ്റ്റേഷനറി",      status: "paid"    },
      // ── Programs ──
      { id: "EX009", category: "programs",       title: "Nabidhinam Celebration 2026",       title_ml: "നബിദിനം ആഘോഷം 2026",                  amount: 22000, date: "2026-09-05", paidTo: "Event Committee",       paidTo_ml: "ഇവൻ്റ് കമ്മിറ്റി",       status: "paid"    },
      { id: "EX010", category: "programs",       title: "Annual Day Programme",              title_ml: "വാർഷിക ദിന പ്രോഗ്രാം",                amount: 8000,  date: "2026-04-10", paidTo: "Event Committee",       paidTo_ml: "ഇവൻ്റ് കമ്മിറ്റി",       status: "pending" },
      { id: "EX011", category: "programs",       title: "Quran Competition – Prizes",        title_ml: "ഖുർആൻ മത്സര സമ്മാനം",               amount: 4500,  date: "2026-04-20", paidTo: "Purchase Committee",    paidTo_ml: "വാങ്ങൽ കമ്മിറ്റി",       status: "pending" },
      { id: "EX012", category: "programs",       title: "Republic Day Programme",            title_ml: "റിപ്പബ്ലിക് ദിന പ്രോഗ്രാം",          amount: 3500,  date: "2026-01-26", paidTo: "Event Committee",       paidTo_ml: "ഇവൻ്റ് കമ്മിറ്റി",       status: "paid"    },
      // ── Maintenance ──
      { id: "EX013", category: "maintenance",    title: "Classroom Fan Repairs",             title_ml: "ക്ലാസ്‌ ഫാൻ നന്നാക്കൽ",              amount: 3200,  date: "2026-02-15", paidTo: "Electro Service",       paidTo_ml: "ഇലക്‌ട്രോ സർവ്വീസ്",    status: "paid"    },
      { id: "EX014", category: "maintenance",    title: "Toilet Block Renovation",           title_ml: "ടോയ്‌ലറ്റ് നവീകരണം",                amount: 5800,  date: "2026-03-12", paidTo: "P.M. Builders",         paidTo_ml: "P.M. ബിൽഡേഴ്‌സ്",        status: "paid"    },
      { id: "EX015", category: "maintenance",    title: "Roof Leak Repair",                  title_ml: "മേൽക്കൂര ചോർച്ച നന്നാക്കൽ",          amount: 3000,  date: "2026-02-20", paidTo: "P.M. Builders",         paidTo_ml: "P.M. ബിൽഡേഴ്‌സ്",        status: "paid"    },
      // ── Utilities ──
      { id: "EX016", category: "utilities",      title: "Electricity Bill – Q2 2026",        title_ml: "കറൻ്റ് ബിൽ – Q2 2026",                amount: 3600,  date: "2026-03-15", paidTo: "KSEB",                  paidTo_ml: "KSEB",                    status: "paid"    },
      { id: "EX017", category: "utilities",      title: "Water Charges – Q2 2026",           title_ml: "ജലനിരക്ക് – Q2 2026",                 amount: 1200,  date: "2026-03-15", paidTo: "KWA",                   paidTo_ml: "KWA",                     status: "paid"    },
      { id: "EX018", category: "utilities",      title: "Internet & Broadband",              title_ml: "ഇൻ്റർനെറ്റ്",                         amount: 2400,  date: "2026-03-01", paidTo: "BSNL",                  paidTo_ml: "BSNL",                    status: "paid"    },
      // ── Stationery ──
      { id: "EX019", category: "stationery",     title: "Notebooks & Pens – Term 2",         title_ml: "നോട്ട്ബുക്ക് & പേന – ടേം 2",         amount: 1800,  date: "2026-01-05", paidTo: "National Stationery",   paidTo_ml: "നാഷണൽ സ്റ്റേഷനറി",      status: "paid"    },
      { id: "EX020", category: "stationery",     title: "Printer Ink & A4 Paper",            title_ml: "പ്രിൻ്റർ ഇങ്ക് & പേപ്പർ",            amount: 1000,  date: "2026-02-10", paidTo: "City Computers",        paidTo_ml: "സിറ്റി കമ്പ്യൂട്ടേഴ്‌സ്", status: "paid"    },
    ],
    monthlyTrend: [
      { month: "Oct",  month_ml: "ഒക്ടോ", amount: 44000 },
      { month: "Nov",  month_ml: "നവം",   amount: 41200 },
      { month: "Dec",  month_ml: "ഡിസ",   amount: 39600 },
      { month: "Jan",  month_ml: "ജനു",   amount: 58800 },
      { month: "Feb",  month_ml: "ഫെബ്",  amount: 71400 },
      { month: "Mar",  month_ml: "മാർ",   amount: 57400 },
    ],
  },
  announcements: [
    { id: "AN001", title: "Annual Day Preparations",          title_ml: "വാർഷിക ദിന തയ്യാറെടുപ്പ്",     date: "2026-04-05", priority: "high"   },
    { id: "AN002", title: "Fee Payment Deadline – April 15",  title_ml: "ഫീസ് അടക്കൽ – ഏപ്രിൽ 15",    date: "2026-04-02", priority: "high"   },
    { id: "AN003", title: "SKSBV Secretary Election Opens",   title_ml: "SKSBV സെക്രട്ടറി തിരഞ്ഞെടുപ്പ്", date: "2026-04-03", priority: "medium" },
    { id: "AN004", title: "Quran Competition – April 20",     title_ml: "ഖുർആൻ മത്സരം – ഏപ്രിൽ 20",   date: "2026-04-01", priority: "medium" },
    { id: "AN005", title: "Mid-term Exams Schedule Released", title_ml: "മിഡ്‌ടേം പരീക്ഷ ഷെഡ്യൂൾ",    date: "2026-03-28", priority: "low"    },
  ],
};
