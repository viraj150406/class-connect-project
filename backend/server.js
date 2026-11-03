const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// ========================
// USER SCHEMA
// ========================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["teacher", "student"],
      default: "student"
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// ========================
// CLASSROOM SCHEMA
// ========================

const classroomSchema = new mongoose.Schema(
  {
    classroomId: {
      type: String,
      required: true,
      unique: true
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    teacherName: {
      type: String,
      required: true
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // ANNOUNCEMENTS
    announcements: [
      {
        message: {
          type: String,
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ASSIGNMENTS
    assignments: [
      {
        title: {
          type: String,
          required: true
        },

        description: {
          type: String,
          required: true
        },

        dueDate: {
          type: Date,
          required: true
        },

        createdAt: {
          type: Date,
          default: Date.now
        },

        // STUDENT SUBMISSIONS
        submissions: [
          {
            student: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true
            },

            answer: {
              type: String,
              required: true
            },
submittedAt: {
  type: Date,
  default: Date.now
},

marks: {
  type: Number,
  default: null
},

feedback: {
  type: String,
  default: ""
},

gradedAt: {
  type: Date,
  default: null
}

          }
        ]
      }
    ]
  },
  { timestamps: true }
);

const Classroom = mongoose.model("Classroom", classroomSchema);

// ========================
// JWT AUTHENTICATION
// ========================

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Access denied. Please login."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

// ========================
// ROLE AUTHORIZATION
// ========================

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized for this action"
      });
    }

    next();
  };
};

// ========================
// HOME API
// ========================

app.get("/", (req, res) => {
  res.send("Welcome to ClassConnect Backend!");
});

// ========================
// HEALTH API
// ========================

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "ClassConnect Backend Running"
  });
});

// ========================
// REGISTER API
// ========================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    if (role && !["teacher", "student"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "student"
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Registration failed"
    });
  }
});

// ========================
// LOGIN API
// ========================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Login failed"
    });
  }
});

// ========================
// CREATE CLASSROOM
// TEACHER ONLY
// ========================

app.post(
  "/api/classrooms",
  authenticateToken,
  allowRoles("teacher"),
  async (req, res) => {
    try {
      const classroomId =
        "CLASS-" +
        Math.random().toString(36).substring(2, 8).toUpperCase();

      const classroom = await Classroom.create({
        classroomId,
        teacher: req.user._id,
        teacherName: req.user.name
      });

      res.status(201).json({
        message: "Classroom created successfully",
        classroom
      });

    } catch (error) {
      console.error("Create classroom error:", error.message);

      res.status(500).json({
        message: "Classroom creation failed"
      });
    }
  }
);

// ========================
// JOIN CLASSROOM
// STUDENT ONLY
// ========================

app.post(
  "/api/classrooms/join",
  authenticateToken,
  allowRoles("student"),
  async (req, res) => {
    try {
      const { classroomId } = req.body;

      if (!classroomId) {
        return res.status(400).json({
          message: "Classroom ID is required"
        });
      }

      const classroom = await Classroom.findOne({
        classroomId: classroomId.trim().toUpperCase()
      });

      if (!classroom) {
        return res.status(404).json({
          message: "Classroom not found"
        });
      }

      const alreadyJoined = classroom.students.some(
        (studentId) =>
          studentId.toString() === req.user._id.toString()
      );

      if (!alreadyJoined) {
        classroom.students.push(req.user._id);
        await classroom.save();
      }

      res.json({
        message: alreadyJoined
          ? "You have already joined this classroom"
          : "Successfully joined classroom",

        classroom: {
          classroomId: classroom.classroomId,
          teacherName: classroom.teacherName,
          studentCount: classroom.students.length
        }
      });

    } catch (error) {
      console.error("Join classroom error:", error.message);

      res.status(500).json({
        message: "Unable to join classroom"
      });
    }
  }
);

// ========================
// GET TEACHER CLASSROOMS
// TEACHER ONLY
// ========================

app.get(
  "/api/classrooms/my-classrooms",
  authenticateToken,
  allowRoles("teacher"),
  async (req, res) => {
    try {
      const classrooms = await Classroom.find({
        teacher: req.user._id
      }).populate("students", "name email");

      res.json({
        classrooms
      });

    } catch (error) {
      res.status(500).json({
        message: "Unable to fetch classrooms"
      });
    }
  }
);

// ========================
// GET CLASSROOM DETAILS
// TEACHER OR JOINED STUDENT
// ========================

app.get(
  "/api/classrooms/:classroomId",
  authenticateToken,
  async (req, res) => {
    try {
      const classroom = await Classroom.findOne({
        classroomId: req.params.classroomId.toUpperCase()
      }).populate("students", "name email");

      if (!classroom) {
        return res.status(404).json({
          message: "Classroom not found"
        });
      }

      const isTeacher =
        classroom.teacher.toString() === req.user._id.toString();

      const isStudent = classroom.students.some(
        (student) =>
          student._id.toString() === req.user._id.toString()
      );

      if (!isTeacher && !isStudent) {
        return res.status(403).json({
          message: "You are not a member of this classroom"
        });
      }

      // Convert Mongoose document to plain object
      const classroomResponse = classroom.toObject();

      // Students can only see their own submissions
      if (!isTeacher) {
        classroomResponse.assignments =
          classroomResponse.assignments.map((assignment) => ({
            ...assignment,
            submissions: (assignment.submissions || []).filter(
              (submission) =>
                String(submission.student) === String(req.user._id)
            )
          }));
      }

      res.json({
        classroom: classroomResponse
      });

    } catch (error) {
      console.error("Get classroom error:", error.message);

      res.status(500).json({
        message: "Unable to fetch classroom details"
      });
    }
  }
);

// ========================
// CREATE ANNOUNCEMENT
// TEACHER ONLY
// ========================

app.post(
  "/api/classrooms/:classroomId/announcements",
  authenticateToken,
  allowRoles("teacher"),
  async (req, res) => {
    try {
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          message: "Announcement message is required"
        });
      }

      const classroom = await Classroom.findOne({
        classroomId: req.params.classroomId.toUpperCase(),
        teacher: req.user._id
      });

      if (!classroom) {
        return res.status(404).json({
          message: "Classroom not found or you are not its teacher"
        });
      }

      classroom.announcements.push({
        message: message.trim()
      });

      await classroom.save();

      res.status(201).json({
        message: "Announcement created successfully",
        announcements: classroom.announcements
      });

    } catch (error) {
      console.error("Announcement error:", error.message);

      res.status(500).json({
        message: "Unable to create announcement"
      });
    }
  }
);

// ========================
// CREATE ASSIGNMENT
// TEACHER ONLY
// ========================

app.post(
  "/api/classrooms/:classroomId/assignments",
  authenticateToken,
  allowRoles("teacher"),
  async (req, res) => {
    try {
      const { title, description, dueDate } = req.body;

      if (
        !title?.trim() ||
        !description?.trim() ||
        !dueDate
      ) {
        return res.status(400).json({
          message: "Title, description and due date are required"
        });
      }

      const parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          message: "Invalid due date"
        });
      }

      const classroom = await Classroom.findOne({
        classroomId: req.params.classroomId.toUpperCase(),
        teacher: req.user._id
      });

      if (!classroom) {
        return res.status(404).json({
          message: "Classroom not found or you are not its teacher"
        });
      }

      classroom.assignments.push({
        title: title.trim(),
        description: description.trim(),
        dueDate: parsedDueDate
      });

      await classroom.save();

      res.status(201).json({
        message: "Assignment created successfully",
        assignments: classroom.assignments
      });

    } catch (error) {
      console.error("Create assignment error:", error.message);

      res.status(500).json({
        message: "Unable to create assignment"
      });
    }
  }
);

// ========================
// SUBMIT ASSIGNMENT
// STUDENT ONLY
// ========================

app.post(
  "/api/classrooms/:classroomId/assignments/:assignmentId/submit",
  authenticateToken,
  allowRoles("student"),
  async (req, res) => {
    try {
      const { answer } = req.body;

      if (!answer || !answer.trim()) {
        return res.status(400).json({
          message: "Answer is required"
        });
      }

      const classroom = await Classroom.findOne({
        classroomId: req.params.classroomId.toUpperCase(),
        students: req.user._id
      });

      if (!classroom) {
        return res.status(404).json({
          message: "Classroom not found or you have not joined"
        });
      }

      const assignment = classroom.assignments.id(
        req.params.assignmentId
      );

      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found"
        });
      }

      if (assignment.dueDate < new Date()) {
        return res.status(400).json({
          message: "Assignment submission deadline has passed"
        });
      }

      const existingSubmission = assignment.submissions.find(
        (submission) =>
          submission.student.toString() === req.user._id.toString()
      );

      if (existingSubmission) {
        existingSubmission.answer = answer.trim();
        existingSubmission.submittedAt = new Date();
      } else {
        assignment.submissions.push({
          student: req.user._id,
          answer: answer.trim()
        });
      }

      await classroom.save();

      res.json({
        message: "Assignment submitted successfully"
      });

    } catch (error) {
      console.error("Submit assignment error:", error.message);

      res.status(500).json({
        message: "Unable to submit assignment"
      });
    }
  }
);

// ========================
// VIEW ASSIGNMENT SUBMISSIONS
// TEACHER ONLY
// ========================

app.get(
  "/api/classrooms/:classroomId/assignments/:assignmentId/submissions",
  authenticateToken,
  allowRoles("teacher"),
  async (req, res) => {
    try {
      const classroom = await Classroom.findOne({
        classroomId: req.params.classroomId.toUpperCase(),
        teacher: req.user._id
      });

      if (!classroom) {
        return res.status(404).json({
          message: "Classroom not found"
        });
      }

      const assignment = classroom.assignments.id(
        req.params.assignmentId
      );

      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found"
        });
      }

      await classroom.populate(
        "assignments.submissions.student",
        "name email"
      );

      const updatedAssignment = classroom.assignments.id(
        req.params.assignmentId
      );

      res.json({
        assignment: {
          title: updatedAssignment.title,
          submissions: updatedAssignment.submissions
        }
      });

    } catch (error) {
      console.error("Fetch submissions error:", error.message);

      res.status(500).json({
        message: "Unable to fetch submissions"
      });
    }
  }
);
// ========================
// GRADE STUDENT ASSIGNMENT
// TEACHER ONLY
// ========================

app.put(
  "/api/classrooms/:classroomId/assignments/:assignmentId/submissions/:submissionId/grade",
  authenticateToken,
  allowRoles("teacher"),
  async (req, res) => {
    try {
      const { marks, feedback } = req.body;

      if (
        marks === undefined ||
        !Number.isFinite(Number(marks)) ||
        Number(marks) < 0 ||
        Number(marks) > 100
      ) {
        return res.status(400).json({
          message: "Marks must be between 0 and 100"
        });
      }

      if (typeof feedback !== "string") {
        return res.status(400).json({
          message: "Feedback must be text"
        });
      }

      const classroom = await Classroom.findOne({
        classroomId: req.params.classroomId.toUpperCase(),
        teacher: req.user._id
      });

      if (!classroom) {
        return res.status(404).json({
          message: "Classroom not found"
        });
      }

      const assignment = classroom.assignments.id(
        req.params.assignmentId
      );

      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found"
        });
      }

      const submission = assignment.submissions.id(
        req.params.submissionId
      );

      if (!submission) {
        return res.status(404).json({
          message: "Submission not found"
        });
      }

      submission.marks = Number(marks);
      submission.feedback = feedback.trim();
      submission.gradedAt = new Date();

      await classroom.save();

      res.json({
        message: "Assignment graded successfully!",
        submission
      });

    } catch (error) {
      console.error("Grading error:", error.message);

      res.status(500).json({
        message: "Unable to grade assignment"
      });
    }
  }
);

// ========================
// STUDENT VIEW OWN SUBMISSION AND GRADE
// STUDENT ONLY
// ========================

app.get(
  "/api/classrooms/:classroomId/assignments/:assignmentId/my-grade",
  authenticateToken,
  allowRoles("student"),
  async (req, res) => {
    try {
      const classroom = await Classroom.findOne({
        classroomId: req.params.classroomId.toUpperCase(),
        students: req.user._id
      });

      if (!classroom) {
        return res.status(404).json({
          message: "Classroom not found"
        });
      }

      const assignment = classroom.assignments.id(
        req.params.assignmentId
      );

      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found"
        });
      }

      const submission = assignment.submissions.find(
        (item) =>
          item.student.toString() === req.user._id.toString()
      );

      if (!submission) {
        return res.json({
          submitted: false,
          title: assignment.title,
          message: "Assignment not submitted yet"
        });
      }

      res.json({
        submitted: true,
        title: assignment.title,
        answer: submission.answer,
        submittedAt: submission.submittedAt,
        marks: submission.marks,
        feedback: submission.feedback,
        gradedAt: submission.gradedAt,
        graded: submission.marks !== null
      });

    } catch (error) {
      console.error("Student grade error:", error.message);

      res.status(500).json({
        message: "Unable to fetch submission"
      });
    }
  }
);

// ========================
// START SERVER
// ========================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
      throw new Error("MONGODB_URI and JWT_SECRET are required");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log(`ClassConnect Backend running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
