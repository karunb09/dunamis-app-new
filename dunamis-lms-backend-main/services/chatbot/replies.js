const PHONE_DISPLAY = "+91 93982 46083";
const PHONE_HREF = "tel:+919398246083";
const WHATSAPP_HREF = "https://wa.me/+919398246083";
const EMAIL = "contact@dunamisindia.co.in";

const MAX_CHIPS = 8;
const MAX_CARDS = 6;

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SESSION_LABEL = { standard: "Group (up to 4)", premium: "Individual (1:1)" };

const rupees = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;
const listText = (items) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const formatTime = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return raw;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
};

const formatDays = (days) => {
  const indexes = [...new Set((days || []).map((day) => DAY_ORDER.indexOf(String(day).toLowerCase())))]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (!indexes.length) return "";
  if (indexes.length === 7) return "every day";
  const contiguous = indexes.every((index, i) => i === 0 || index === indexes[i - 1] + 1);
  if (contiguous && indexes.length >= 3) {
    return `${DAY_SHORT[indexes[0]]}–${DAY_SHORT[indexes[indexes.length - 1]]}`;
  }
  return indexes.map((index) => DAY_SHORT[index]).join(", ");
};

const branchHours = (branch) =>
  branch.timings.length === 2 ? `${formatTime(branch.timings[0])} – ${formatTime(branch.timings[1])}` : "";

const chip = (label, intent, ids = {}) => ({ label, action: { intent, ...ids } });

const MENU_CHIPS = [
  chip("Explore courses", "courses.list"),
  chip("Fees & plans", "course.fees"),
  chip("Centres near you", "branches.list"),
  chip("Meet our instructors", "instructors.forCourse"),
  chip("Book a free demo", "demo.book"),
  chip("Talk to us", "contact.human"),
];

// Logged-in students get their personal questions first.
const STUDENT_MENU_CHIPS = [
  chip("Next class", "me.nextClass"),
  chip("My fees", "me.fees"),
  chip("My homework", "me.homework"),
  chip("My instructor", "me.instructor"),
  chip("Explore courses", "courses.list"),
  chip("Talk to us", "contact.human"),
];

const menuFor = (scope) => (scope.viewer ? STUDENT_MENU_CHIPS : MENU_CHIPS);

const whatsappAction = { type: "link", label: "Chat on WhatsApp", href: WHATSAPP_HREF };
const contactPageAction = { type: "link", label: "Contact us", href: "/contact-us" };

function courseCard(course, knowledge) {
  const fees = course.fees.map((fee) => fee.monthlyFee);
  return {
    id: course.id,
    name: course.name,
    href: `/courses/${course.slug}`,
    category: knowledge.categoryById.get(course.categoryId)?.name || "",
    mode: course.mode,
    level: course.level,
    fromMonthly: fees.length ? Math.min(...fees) : null,
  };
}

function branchCard(branch) {
  return {
    id: branch.id,
    name: branch.name,
    href: `/centers/${branch.slug}`,
    city: branch.cityName,
    location: branch.location,
    hours: branchHours(branch),
    days: formatDays(branch.openDays),
  };
}

function instructorCard(instructor, knowledge, preferredCourseId) {
  const courseId = instructor.courseIds.includes(preferredCourseId) ? preferredCourseId : instructor.courseIds[0];
  const course = knowledge.courseById.get(courseId);
  return {
    id: instructor.id,
    name: instructor.name,
    photo: instructor.photo,
    expertise: instructor.expertise,
    experienceYears: instructor.experienceYears,
    languages: instructor.languages,
    mode: instructor.mode,
    city: instructor.city,
    rating: instructor.rating > 0 ? Math.round(instructor.rating * 10) / 10 : null,
    courseId,
    courseName: course?.name || "",
    href: course ? `/courses/${course.slug}` : "",
  };
}

const emptyReply = () => ({
  text: "",
  courses: [],
  branches: [],
  instructors: [],
  quickReplies: [],
  actions: [],
});

function respond(intent, scope, fields, { matched = true, context } = {}) {
  return {
    intent,
    matched,
    reply: { ...emptyReply(), ...fields },
    context: context || {
      courseId: scope.courseId || null,
      cityId: scope.cityId || null,
      branchId: scope.branchId || null,
      instructorId: scope.instructorId || null,
      categoryId: scope.categoryId || null,
    },
  };
}

// Asks which course, keeping the visitor's question so the next tap answers it.
function askCourse(intent, scope, knowledge, question) {
  const candidates = scope.topicCourseIds?.length
    ? scope.topicCourseIds.map((id) => knowledge.courseById.get(id)).filter(Boolean)
    : knowledge.courses;

  if (!knowledge.courses.length) {
    return respond(intent, scope, {
      text: "Our courses are being updated right now. Leave your number and we'll call you with the details.",
      actions: [whatsappAction, contactPageAction],
    });
  }

  if (candidates.length <= MAX_CHIPS || !knowledge.categories.length) {
    return respond(intent, scope, {
      text: question,
      quickReplies: candidates
        .slice(0, MAX_CHIPS)
        .map((course) => chip(course.name, intent, { courseId: course.id })),
    });
  }

  return respond(intent, scope, {
    text: `${question} Pick a category, or type the course name.`,
    quickReplies: knowledge.categories
      .slice(0, MAX_CHIPS)
      .map((category) => chip(category.name, "courses.byCategory", { categoryId: category.id, followIntent: intent })),
  });
}

function courseChips(course) {
  return [
    chip("Fees & plans", "course.fees", { courseId: course.id }),
    chip("Instructors", "instructors.forCourse", { courseId: course.id }),
    ...(course.mode === "offline" && course.branchIds.length
      ? [chip("Centres", "branches.list", { courseId: course.id })]
      : []),
    chip("Book a free demo", "demo.book", { courseId: course.id }),
  ];
}

const handlers = {
  greeting: (scope) =>
    respond("greeting", scope, {
      text: scope.viewer
        ? "Hi! Ask me about your next class, fees, homework or instructor — or anything about our courses."
        : "Hi! I'm the Dunamis assistant. I can help with courses, fees, centres, instructors and free demos. What would you like to know?",
      quickReplies: menuFor(scope),
    }),

  menu: (scope) =>
    respond("menu", scope, { text: "Here's what I can help with:", quickReplies: menuFor(scope) }),

  thanks: (scope) =>
    respond("thanks", scope, {
      text: "You're welcome! Anything else I can help with?",
      quickReplies: [chip("Ask something else", "menu"), chip("No, I'm done", "chat.end", { reason: "visitor" })],
    }),

  goodbye: (scope) =>
    respond("goodbye", scope, {
      text: "Before you go — anything else I can help with?",
      quickReplies: [chip("Ask something else", "menu"), chip("No, I'm done", "chat.end", { reason: "visitor" })],
    }),

  "courses.list": (scope, knowledge) => {
    if (scope.categoryId) return handlers["courses.byCategory"](scope, knowledge);
    if (!knowledge.categories.length || knowledge.courses.length <= MAX_CARDS) {
      return respond("courses.list", scope, {
        text: `We offer ${knowledge.courses.length} course${knowledge.courses.length === 1 ? "" : "s"}:`,
        courses: knowledge.courses.slice(0, MAX_CARDS).map((course) => courseCard(course, knowledge)),
        quickReplies: knowledge.courses
          .slice(0, MAX_CHIPS)
          .map((course) => chip(course.name, "course.info", { courseId: course.id })),
      });
    }
    return respond("courses.list", scope, {
      text: `We offer ${knowledge.courses.length} courses across ${listText(
        knowledge.categories.map((category) => category.name)
      )}. Which area interests you?`,
      quickReplies: knowledge.categories
        .slice(0, MAX_CHIPS)
        .map((category) => chip(category.name, "courses.byCategory", { categoryId: category.id })),
    });
  },

  "courses.byCategory": (scope, knowledge, action) => {
    const category = knowledge.categoryById.get(scope.categoryId);
    if (!category) return handlers["courses.list"]({ ...scope, categoryId: null }, knowledge);
    const courses = knowledge.courses.filter((course) => course.categoryId === category.id);
    const followIntent = handlers[action?.followIntent] ? action.followIntent : "course.info";
    return respond("courses.byCategory", scope, {
      text:
        followIntent === "course.info"
          ? `${category.name} courses:`
          : `Which ${category.name} course?`,
      courses: courses.slice(0, MAX_CARDS).map((course) => courseCard(course, knowledge)),
      quickReplies: courses
        .slice(0, MAX_CHIPS)
        .map((course) => chip(course.name, followIntent, { courseId: course.id })),
    });
  },

  "course.info": (scope, knowledge) => {
    const course = knowledge.courseById.get(scope.courseId);
    if (!course) return askCourse("course.info", scope, knowledge, "Which course would you like to know about?");
    const described = course.level
      ? `${/^[aeiou]/i.test(course.level) ? "an" : "a"} ${course.level} course`
      : "a course";
    const parts = [
      `${course.name} is ${described} taught ${course.mode === "offline" ? "at our centres" : "online in live classes"}.`,
      course.languages.length ? `Classes are in ${listText(course.languages)}.` : "",
      `Each level runs ${course.termMonths} months${course.certified ? " and ends with a certificate" : ""}.`,
    ];
    return respond("course.info", scope, {
      text: parts.filter(Boolean).join(" "),
      courses: [courseCard(course, knowledge)],
      quickReplies: courseChips(course),
      actions: [{ type: "link", label: "View course page", href: `/courses/${course.slug}` }],
    });
  },

  "course.fees": (scope, knowledge) => {
    const course = knowledge.courseById.get(scope.courseId);
    if (!course) return askCourse("course.fees", scope, knowledge, "Which course would you like fees for?");
    if (!course.fees.length) {
      return respond("course.fees", scope, {
        text: `Fees for ${course.name} aren't listed online yet. Request a callback and our team will share them.`,
        actions: [{ type: "callback", label: "Request a callback", courseId: course.id }, whatsappAction],
      });
    }
    const lines = course.fees.map((fee) => {
      let line = `• ${SESSION_LABEL[fee.sessionType] || "Classes"}: ${rupees(fee.monthlyFee)}/month`;
      if (fee.primaryMonths) line += ` on the ${fee.primaryMonths}-month plan`;
      const others = fee.plans
        .filter((plan) => plan.months !== fee.primaryMonths)
        .map((plan) => `${plan.months} months at ${rupees(plan.monthlyFee)}/month`);
      if (others.length) line += `. Also: ${others.join(", ")}`;
      if (fee.maxFullPaymentDiscount > 0) line += `. Pay in full and save up to ${fee.maxFullPaymentDiscount}%`;
      if (fee.offers.length) {
        line += `. Offers: ${fee.offers.map((offer) => `${offer.name} (${rupees(offer.fullPayment)})`).join(", ")}`;
      }
      return `${line}.`;
    });
    return respond("course.fees", scope, {
      text: [`Fees for ${course.name}:`, ...lines].join("\n"),
      courses: [courseCard(course, knowledge)],
      quickReplies: [
        chip("Book a free demo", "demo.book", { courseId: course.id }),
        chip("Instructors", "instructors.forCourse", { courseId: course.id }),
        chip("How to enrol", "enroll.how", { courseId: course.id }),
      ],
      actions: [{ type: "link", label: "See full fee structure", href: `/courses/${course.slug}` }],
    });
  },

  "course.modes": (scope, knowledge) => {
    const course = knowledge.courseById.get(scope.courseId);
    if (course) {
      const branches = course.branchIds.map((id) => knowledge.branchById.get(id)).filter(Boolean);
      return respond("course.modes", scope, {
        text:
          course.mode === "offline"
            ? `${course.name} is taught in person at ${branches.length === 1 ? "our centre" : `${branches.length} of our centres`}.`
            : `${course.name} is taught online in live classes, so you can join from anywhere.`,
        branches: branches.slice(0, MAX_CARDS).map(branchCard),
        quickReplies: courseChips(course),
      });
    }
    const online = knowledge.courses.filter((item) => item.mode === "online").length;
    const offline = knowledge.courses.filter((item) => item.mode === "offline").length;
    const cities = knowledge.cities.map((city) => city.name);
    return respond("course.modes", scope, {
      text: [
        online ? `${online} course${online === 1 ? " is" : "s are"} taught online in live classes you join from home.` : "",
        offline
          ? `${offline} course${offline === 1 ? " is" : "s are"} taught in person${cities.length ? ` at our centres in ${listText(cities)}` : ""}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      quickReplies: [chip("Explore courses", "courses.list"), chip("Centres near you", "branches.list")],
    });
  },

  "course.languages": (scope, knowledge) => {
    const course = knowledge.courseById.get(scope.courseId);
    if (course) {
      return respond("course.languages", scope, {
        text: `${course.name} is taught in ${listText(course.languages.length ? course.languages : ["English"])}.`,
        quickReplies: courseChips(course),
      });
    }
    if (scope.language) {
      const courses = knowledge.courses.filter((item) => item.languages.includes(scope.language));
      return respond("course.languages", scope, {
        text: courses.length
          ? `These courses are taught in ${scope.language}:`
          : `We don't have a course taught in ${scope.language} right now.`,
        courses: courses.slice(0, MAX_CARDS).map((item) => courseCard(item, knowledge)),
        quickReplies: courses.length
          ? [chip(`${scope.language}-speaking instructors`, "instructors.byLanguage", { language: scope.language })]
          : [chip("Explore courses", "courses.list")],
      });
    }
    const languages = [...new Set(knowledge.courses.flatMap((item) => item.languages))];
    return respond("course.languages", scope, {
      text: `Our classes are taught in ${listText(languages.length ? languages : ["English"])}. Which course are you interested in?`,
      quickReplies: [chip("Explore courses", "courses.list")],
    });
  },

  "branches.list": (scope, knowledge) => {
    if (scope.branchId) return handlers["branch.timings"](scope, knowledge);
    if (scope.freshCity) return handlers["branches.inCity"](scope, knowledge);
    if (!knowledge.branches.length) {
      return respond("branches.list", scope, {
        text: "We don't have a centre open yet — all our courses are available online.",
        quickReplies: [chip("Explore courses", "courses.list")],
      });
    }
    const course = scope.freshCourse ? knowledge.courseById.get(scope.courseId) : null;
    if (course) {
      const branches = course.branchIds.map((id) => knowledge.branchById.get(id)).filter(Boolean);
      return respond("branches.list", scope, {
        text: branches.length
          ? `${course.name} is taught at:`
          : `${course.name} is taught online, so you can join from anywhere.`,
        branches: branches.slice(0, MAX_CARDS).map(branchCard),
        quickReplies: [chip("Book a free demo", "demo.book", { courseId: course.id })],
      });
    }
    if (knowledge.cities.length > 1) {
      return respond("branches.list", scope, {
        text: `We have ${knowledge.branches.length} centres in ${listText(knowledge.cities.map((city) => city.name))}. Which city?`,
        quickReplies: knowledge.cities
          .slice(0, MAX_CHIPS)
          .map((city) => chip(city.name, "branches.inCity", { cityId: city.id })),
      });
    }
    return respond("branches.list", scope, {
      text: "Our centres:",
      branches: knowledge.branches.slice(0, MAX_CARDS).map(branchCard),
      quickReplies: knowledge.branches
        .slice(0, MAX_CHIPS)
        .map((branch) => chip(branch.name, "branch.timings", { branchId: branch.id })),
    });
  },

  "branches.inCity": (scope, knowledge) => {
    const city = knowledge.cityById.get(scope.cityId);
    if (!city) return handlers["branches.list"]({ ...scope, freshCity: false }, knowledge);
    const branches = knowledge.branches.filter((branch) => branch.cityId === city.id);
    return respond("branches.inCity", scope, {
      text: `Our centre${branches.length === 1 ? "" : "s"} in ${city.name}:`,
      branches: branches.slice(0, MAX_CARDS).map(branchCard),
      quickReplies: branches
        .slice(0, MAX_CHIPS)
        .map((branch) => chip(`${branch.name} details`, "branch.timings", { branchId: branch.id })),
    });
  },

  "branch.timings": (scope, knowledge) => {
    const branch = knowledge.branchById.get(scope.branchId);
    if (!branch) {
      if (knowledge.cityById.has(scope.cityId)) return handlers["branches.inCity"](scope, knowledge);
      return handlers["branches.list"]({ ...scope, freshCity: false, freshCourse: false }, knowledge);
    }
    const courses = branch.courseIds.map((id) => knowledge.courseById.get(id)).filter(Boolean);
    const days = formatDays(branch.openDays);
    const hours = branchHours(branch);
    return respond("branch.timings", scope, {
      text: [
        `${branch.name}${branch.location ? `, ${branch.location}` : ""}.`,
        days || hours ? `Open ${[days, hours].filter(Boolean).join(", ")}.` : "",
        courses.length ? `Courses here: ${listText(courses.map((course) => course.name))}.` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      branches: [branchCard(branch)],
      quickReplies: [
        chip("Instructors here", "instructors.atBranch", { branchId: branch.id }),
        ...courses.slice(0, 3).map((course) => chip(`Demo: ${course.name}`, "demo.book", { courseId: course.id })),
      ],
    });
  },

  "instructors.forCourse": (scope, knowledge) => {
    const courseIds = scope.courseId ? [scope.courseId] : scope.topicCourseIds || [];
    if (!courseIds.length) {
      if (scope.language) return handlers["instructors.byLanguage"](scope, knowledge);
      return askCourse("instructors.forCourse", scope, knowledge, "Which course are you looking for an instructor for?");
    }
    const courseName = scope.courseId
      ? knowledge.courseById.get(scope.courseId)?.name
      : knowledge.topicById.get(scope.topicId)?.name;
    const teaching = knowledge.instructors.filter((instructor) =>
      instructor.courseIds.some((id) => courseIds.includes(id))
    );
    const inLanguage = scope.language
      ? teaching.filter((instructor) => instructor.languages.includes(scope.language))
      : teaching;
    const shown = inLanguage.length ? inLanguage : teaching;

    let text;
    if (!teaching.length) text = `Instructors for ${courseName} will be listed soon. Book a demo and we'll match you with one.`;
    else if (scope.language && !inLanguage.length) text = `No ${courseName} instructor teaches in ${scope.language} right now. These instructors teach ${courseName}:`;
    else text = `${shown.length} instructor${shown.length === 1 ? " teaches" : "s teach"} ${courseName}${scope.language ? ` in ${scope.language}` : ""}:`;

    return respond("instructors.forCourse", scope, {
      text,
      instructors: shown.slice(0, MAX_CARDS).map((instructor) => instructorCard(instructor, knowledge, scope.courseId)),
      quickReplies: scope.courseId ? [chip("Book a free demo", "demo.book", { courseId: scope.courseId })] : [],
    });
  },

  "instructor.info": (scope, knowledge) => {
    const instructor = knowledge.instructorById.get(scope.instructorId);
    if (!instructor) {
      if (scope.courseId || scope.topicCourseIds?.length) return handlers["instructors.forCourse"](scope, knowledge);
      return askCourse("instructors.forCourse", scope, knowledge, "Which instructor? Type their name, or pick a course to see who teaches it.");
    }
    const courses = instructor.courseIds.map((id) => knowledge.courseById.get(id)).filter(Boolean);
    const card = instructorCard(instructor, knowledge, scope.courseId);
    const details = [
      instructor.experienceYears ? `${instructor.experienceYears} years of experience` : "",
      instructor.qualification,
    ].filter(Boolean);
    return respond(
      "instructor.info",
      scope,
      {
        text: [
          `${instructor.name}${instructor.expertise ? ` — ${instructor.expertise}` : ""}.`,
          details.length ? `${details.join(", ")}.` : "",
          instructor.languages.length ? `Teaches in ${listText(instructor.languages)}.` : "",
          courses.length ? `Courses: ${listText(courses.map((course) => course.name))}.` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        instructors: [card],
        quickReplies: card.courseId
          ? [chip(`Book demo with ${instructor.firstName || instructor.name}`, "demo.book", {
              courseId: card.courseId,
              instructorId: instructor.id,
            })]
          : [],
      },
      {
        context: {
          courseId: card.courseId || null,
          cityId: scope.cityId || null,
          branchId: scope.branchId || null,
          instructorId: instructor.id,
          categoryId: scope.categoryId || null,
        },
      }
    );
  },

  "instructors.byLanguage": (scope, knowledge) => {
    if (scope.courseId || scope.topicCourseIds?.length) return handlers["instructors.forCourse"](scope, knowledge);
    if (!scope.language) {
      const languages = [...new Set(knowledge.instructors.flatMap((instructor) => instructor.languages))];
      return respond("instructors.byLanguage", scope, {
        text: "Which language would you like classes in?",
        quickReplies: languages
          .slice(0, MAX_CHIPS)
          .map((language) => chip(language, "instructors.byLanguage", { language })),
      });
    }
    const matches = knowledge.instructors.filter((instructor) => instructor.languages.includes(scope.language));
    return respond("instructors.byLanguage", scope, {
      text: matches.length
        ? `These instructors teach in ${scope.language}:`
        : `None of our instructors teach in ${scope.language} right now.`,
      instructors: matches.slice(0, MAX_CARDS).map((instructor) => instructorCard(instructor, knowledge)),
      quickReplies: matches.length ? [] : [chip("Meet our instructors", "instructors.forCourse")],
    });
  },

  "instructors.atBranch": (scope, knowledge) => {
    const branch = knowledge.branchById.get(scope.branchId);
    if (!branch) return handlers["branches.list"]({ ...scope, freshCourse: false }, knowledge);
    const instructors = knowledge.instructors.filter((instructor) => instructor.branchIds.includes(branch.id));
    return respond("instructors.atBranch", scope, {
      text: instructors.length
        ? `Instructors at ${branch.name}:`
        : `Instructors for ${branch.name} will be listed soon.`,
      instructors: instructors.slice(0, MAX_CARDS).map((instructor) => instructorCard(instructor, knowledge)),
      quickReplies: [chip(`${branch.name} timings`, "branch.timings", { branchId: branch.id })],
    });
  },

  "demo.book": (scope, knowledge) => {
    const course = knowledge.courseById.get(scope.courseId);
    if (!course) return askCourse("demo.book", scope, knowledge, "Great! Which course would you like a free demo for?");
    const instructor = knowledge.instructorById.get(scope.instructorId);
    const withInstructor = instructor?.courseIds.includes(course.id) ? instructor : null;
    return respond("demo.book", scope, {
      text: `Book a free demo class for ${course.name}${withInstructor ? ` with ${withInstructor.name}` : ""} — pick a time that suits you.`,
      actions: [
        {
          type: "bookDemo",
          label: "Book free demo",
          courseId: course.id,
          instructorId: withInstructor?.id || null,
        },
        { type: "callback", label: "Call me instead", courseId: course.id },
      ],
    });
  },

  "enroll.how": (scope, knowledge) => {
    const course = knowledge.courseById.get(scope.courseId);
    return respond("enroll.how", scope, {
      text: [
        "Enrolling takes a few minutes:",
        "1. Open the course page and tap Enroll.",
        "2. Choose online or offline, your instructor and a class schedule.",
        "3. Pick a plan (3, 6 or 12 months; pay monthly or in full) and pay securely online.",
        "Not sure yet? Start with a free demo class.",
      ].join("\n"),
      actions: course
        ? [
            { type: "link", label: `Enrol in ${course.name}`, href: `/courses/${course.slug}` },
            { type: "bookDemo", label: "Book free demo", courseId: course.id, instructorId: null },
          ]
        : [{ type: "link", label: "Browse courses", href: "/courses" }],
      quickReplies: course ? [] : [chip("Book a free demo", "demo.book")],
    });
  },

  "contact.human": (scope, knowledge) => {
    const course = knowledge.courseById.get(scope.courseId);
    return respond("contact.human", scope, {
      text: `You can reach our team on ${PHONE_DISPLAY} (call or WhatsApp) or at ${EMAIL}.`,
      actions: [
        ...(course ? [{ type: "callback", label: "Request a callback", courseId: course.id }] : []),
        whatsappAction,
        { type: "link", label: "Call us", href: PHONE_HREF },
        contactPageAction,
      ],
    });
  },
};

function faqReply(faq, scope) {
  return {
    ...respond(`faq.${faq.id}`, scope, {
      text: faq.body || faq.title,
      quickReplies: [chip("Ask something else", "menu")],
    }),
    faqId: faq.id,
  };
}

function fallbackReply(scope, knowledge) {
  const course = knowledge.courseById.get(scope.courseId);
  return respond(
    null,
    scope,
    {
      text: "Sorry, I didn't catch that. Try one of these, or ask our team directly.",
      quickReplies: menuFor(scope),
      actions: [
        ...(course ? [{ type: "callback", label: "Request a callback", courseId: course.id }] : []),
        whatsappAction,
      ],
    },
    { matched: false }
  );
}

function loginPromptReply(intent, scope) {
  return respond(intent, scope, {
    text: "Log in to see your classes, fees and progress. I can still help with courses, fees and centres.",
    actions: [{ type: "link", label: "Log in", href: "/login" }],
    quickReplies: MENU_CHIPS,
  });
}

function endReply(action = {}) {
  const text =
    action.outcome === "demo"
      ? "Your demo request is in — our team will confirm the slot soon. Thanks for chatting!"
      : action.outcome === "callback"
        ? "We'll call you back soon. Thanks for chatting!"
        : "Thanks for chatting with Dunamis! Start a new chat any time.";
  return { ...emptyReply(), text };
}

function buildReply(intent, scope, knowledge, action) {
  if (intent === "chat.end") {
    return { intent, matched: true, reply: endReply(action), context: {} };
  }
  if (intent?.startsWith("faq.")) {
    const faq = knowledge.faqById.get(intent.slice(4));
    return faq ? faqReply(faq, scope) : fallbackReply(scope, knowledge);
  }
  const handler = handlers[intent];
  return handler ? handler(scope, knowledge, action) : fallbackReply(scope, knowledge);
}

module.exports = {
  buildReply,
  endReply,
  loginPromptReply,
  respond,
  chip,
  formatTime,
  rupees,
  listText,
};
