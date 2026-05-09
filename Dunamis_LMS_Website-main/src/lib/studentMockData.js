export const dashboardStyleCourses = [
  {
    id: "keyboard-fundamentals",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=640&h=360",
    category: "Music",
    level: "Beginner",
    title: "Keyboard Fundamentals",
    instructor: "Ramya Veda",
    progress: 50,
  },
  {
    id: "spanish-for-business",
    image:
      "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=640&h=360",
    category: "Language",
    level: "Advanced",
    title: "Spanish For Business",
    instructor: "Pedro Avenz",
    progress: 60,
  },
  {
    id: "bharatnatyam-beginners",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=640&h=360",
    category: "Dance",
    level: "Intermediate",
    title: "Bharatnatyam for Beginners",
    instructor: "Keerthi Ramakrishnan",
    progress: 20,
  },
];

export const homeworkByCourse = {
  "keyboard-fundamentals": [
    {
      id: 1,
      date: "25 May 2025",
      title: "Keyboard Fundamentals",
      tag: "Music",
      homework: "Video Submission Homework",
      homeworkDesc: "Record a video of yourself playing the C major scale",
      feedback: "Practice finger placement based on the chart in the textbook.",
      lesson: "2.2.1",
      status: "upcoming",
      dueDate: "Today, 11:59 PM",
    },
    {
      id: 2,
      date: "22 May 2025",
      title: "Keyboard Fundamentals",
      tag: "Music",
      homework: "Practice Exercise",
      homeworkDesc: "Complete the finger exercises from lesson 2.1",
      feedback: "Great progress. Keep practicing the hand positioning.",
      lesson: "2.1.3",
      status: "completed",
    },
  ],
  "spanish-for-business": [
    {
      id: 1,
      date: "25 May 2025",
      title: "Spanish For Business",
      tag: "Language",
      homework: "Business Email Homework",
      homeworkDesc: "Write a formal business email in Spanish",
      feedback: "Good vocabulary usage. Work on grammar structure.",
      lesson: "3.1.2",
      status: "upcoming",
      dueDate: "Tomorrow, 5:00 PM",
    },
  ],
  "bharatnatyam-beginners": [
    {
      id: 1,
      date: "25 May 2025",
      title: "Bharatnatyam for Beginners",
      tag: "Dance",
      homework: "Basic Steps Practice",
      homeworkDesc: "Practice the basic adavus from lesson 1",
      feedback: "Good posture. Focus on hand gestures.",
      lesson: "1.2.1",
      status: "upcoming",
      dueDate: "Today, 6:00 PM",
    },
  ],
};

export const performanceByCourse = {
  "keyboard-fundamentals": {
    feedback: [
      {
        date: "16 June 2025",
        feedback:
          "Excellent improvement in finger placement and consistency. Keep practicing the scale-pattern exercises.",
      },
      {
        date: "01 June 2025",
        feedback:
          "Great job completing your practice log and steady rhythm. Try to increase your tempo gradually.",
      },
    ],
  },
  "spanish-for-business": {
    feedback: [
      {
        date: "15 June 2025",
        feedback:
          "Well done with conversation exercises. Fluency is steadily rising. Continue daily vocabulary.",
      },
    ],
  },
  "bharatnatyam-beginners": {
    feedback: [
      {
        date: "15 June 2025",
        feedback:
          "Excellent posture and expressions. Focus on mudra precision for the upcoming assessment.",
      },
    ],
  },
};

export const monthlyPerformance = [
  { month: "Jan", Homework: 4, Practice: 5, Speed: 7, Performance: 4 },
  { month: "Feb", Homework: 6, Practice: 6, Speed: 6, Performance: 7 },
  { month: "Mar", Homework: 8, Practice: 5, Speed: 7, Performance: 7 },
  { month: "Apr", Homework: 7, Practice: 6, Speed: 7, Performance: 6 },
  { month: "May", Homework: 6, Practice: 7, Speed: 6, Performance: 7 },
  { month: "Jun", Homework: 8, Practice: 5, Speed: 9, Performance: 4 },
];
