// Sample phrases per intent. %course%, %category%, %city%, %branch%,
// %instructor% and %language% stand for any matching name from the database;
// nlp.js swaps a recognised name in the visitor's text for the same token.
// Add a phrase here (or teach one from the dashboard) when a question misses.
const CORPUS = {
  greeting: [
    "hi", "hello", "hey", "hey there", "good morning", "good evening", "namaste",
    "hello anyone there", "hi i have a question", "hii",
  ],
  thanks: [
    "thanks", "thank you", "thanks a lot", "great thanks", "that helps",
    "ok thanks", "dhanyavad", "shukriya", "awesome thank you", "cool thanks",
  ],
  goodbye: [
    "bye", "goodbye", "see you", "that's all", "nothing else", "i am done",
    "no that's it", "ok bye", "talk later", "chalo bye",
  ],
  menu: [
    "help", "menu", "what can you do", "show options", "what can i ask",
    "main menu", "start over", "options please", "how can you help me",
  ],
  "courses.list": [
    "what courses do you offer", "which courses are available", "list of courses",
    "show me all courses", "what can i learn here", "what do you teach",
    "courses available", "kaun se courses hai", "what classes do you have",
    "do you have classes for kids", "what are your programs",
  ],
  "courses.byCategory": [
    "%category% courses", "show %category% classes", "what %category% courses do you have",
    "courses in %category%", "i want to learn %category%", "%category% ke courses",
    "which %category% classes are available", "options for %category%",
  ],
  "course.info": [
    "tell me about %course%", "what is the %course% course", "details of %course%",
    "%course% course details", "i want to learn %course%", "%course% classes",
    "do you teach %course%", "%course% ke baare mein batao", "is %course% available",
    "what will i learn in %course%", "%course% syllabus", "how long is the %course% course",
  ],
  "course.fees": [
    "how much is %course%", "%course% fees", "price of %course%", "cost of %course% classes",
    "%course% ki fees kitni hai", "what are the fees", "how much does it cost",
    "fee structure", "monthly fees", "what is the price", "fees kitni hai",
    "is there any discount", "payment plans", "installment options", "charges for %course%",
    "how much per month",
  ],
  "course.modes": [
    "is %course% online or offline", "do you have online classes", "offline classes available",
    "can i learn from home", "are classes online", "is there an offline batch",
    "online ya offline", "can i attend in person", "do you have classroom sessions",
  ],
  "course.languages": [
    "which language is %course% taught in", "classes in %language%", "do you teach in %language%",
    "is %course% taught in %language%", "medium of instruction", "which languages do you teach in",
    "can i learn in %language%", "%language% mein classes hai",
  ],
  "branches.list": [
    "where are your centres", "list of branches", "do you have a centre near me",
    "centre locations", "where is your branch", "centre kahan hai", "your address",
    "which cities are you in", "where are you located", "branch list", "center locations",
  ],
  "branches.inCity": [
    "centres in %city%", "branches in %city%", "do you have a centre in %city%",
    "%city% branch", "is there a center in %city%", "%city% mein centre hai",
    "classes in %city%", "any branch in %city%",
  ],
  "branch.timings": [
    "%branch% timings", "when is %branch% open", "what are the timings", "opening hours",
    "%branch% address", "what time do you open", "is the centre open on sunday",
    "%branch% kab khulta hai", "working days", "centre timings",
  ],
  "instructors.forCourse": [
    "who teaches %course%", "%course% teachers", "%course% instructors", "who is the %course% trainer",
    "show me instructors", "meet the teachers", "who are your teachers", "faculty for %course%",
    "%course% ke teacher kaun hai", "list of instructors",
  ],
  "instructor.info": [
    "tell me about %instructor%", "who is %instructor%", "%instructor% experience",
    "%instructor% qualification", "is %instructor% good", "%instructor% ke baare mein batao",
    "profile of %instructor%", "what does %instructor% teach",
  ],
  "instructors.byLanguage": [
    "teacher who speaks %language%", "%language% speaking instructor", "instructor in %language%",
    "%course% teacher in %language%", "any teacher who teaches in %language%",
    "%language% bolne wale teacher", "i want a %language% teacher",
  ],
  "instructors.atBranch": [
    "who teaches at %branch%", "teachers at %branch%", "instructors at %branch% centre",
    "%branch% faculty", "which teachers are in %branch%",
  ],
  "demo.book": [
    "book a demo", "free demo", "i want a trial class", "can i try a class", "demo class chahiye",
    "book a free trial", "schedule a demo for %course%", "demo for %course%", "trial session",
    "is the demo free", "book demo with %instructor%",
  ],
  "enroll.how": [
    "how do i enroll", "how to join", "admission process", "how can i register",
    "i want to join %course%", "sign up for %course%", "admission kaise le", "enrollment steps",
    "how to pay", "how do i start",
  ],
  "contact.human": [
    "talk to a person", "call me", "i want to speak to someone", "contact number",
    "phone number", "email address", "customer care", "request a callback", "whatsapp number",
    "baat karni hai", "connect me to your team",
  ],

  // Personal questions. Logged-in students get answers from their own records;
  // guests are asked to log in.
  "me.nextClass": [
    "when is my next class", "my next class", "what time is my class", "is my class today",
    "my class schedule", "when do i have class", "meri class kab hai", "aaj class hai kya",
    "class join link", "how do i join my class", "my timetable",
  ],
  "me.fees": [
    "what do i owe", "how much do i have to pay", "my fees", "my pending fees", "my due amount",
    "when is my next payment", "is my fee overdue", "pay my fees", "my instalment due",
    "kitni fees baaki hai", "mera payment kab due hai", "outstanding balance", "my dues",
  ],
  "me.attendance": [
    "my attendance", "how many classes did i attend", "attendance percentage", "did i miss any class",
    "meri attendance kitni hai", "show my attendance", "classes i missed",
  ],
  "me.homework": [
    "my homework", "what is my homework", "homework for today", "latest homework",
    "mera homework kya hai", "what should i practice", "practice for this week",
  ],
  "me.assignments": [
    "my assignments", "pending assignment", "assignment due date", "do i have any assignment",
    "submit my assignment", "mera assignment", "open assignments",
  ],
  "me.assessment": [
    "my assessment", "my test", "my exam", "assessment result", "my score", "how did i do in the test",
    "when is my assessment", "mera test kab hai", "my evaluation",
  ],
  "me.certificates": [
    "my certificate", "download my certificate", "did i get a certificate", "where is my certificate",
    "mera certificate", "my certificates", "show my certificates",
  ],
  "me.courses": [
    "my courses", "which courses am i enrolled in", "my enrollment", "what am i learning",
    "mere courses", "is my course paused", "my course status",
  ],
  "me.instructor": [
    "who is my teacher", "my instructor", "my trainer", "message my teacher", "contact my instructor",
    "mera teacher kaun hai", "talk to my instructor", "my faculty",
  ],
};

const INTENTS = Object.keys(CORPUS);

module.exports = { CORPUS, INTENTS };
