import { useEffect, useState } from "react";

import {
LayoutDashboard,
BookOpen,
Users,
Settings,
LogOut,
Plus,
Copy,
GraduationCap,
UserCircle,
Megaphone,
ClipboardList
} from "lucide-react";

import Auth from "./Auth";
import "./App.css";

const API_URL = "/api";

function App() {
const [isAuthenticated, setIsAuthenticated] = useState(
Boolean(localStorage.getItem("token"))
);

const [userName, setUserName] = useState(
localStorage.getItem("userName") || ""
);

const [role, setRole] = useState(
localStorage.getItem("role") || "student"
);

const [classrooms, setClassrooms] = useState([]);
const [classroom, setClassroom] = useState(null);

const [joinId, setJoinId] = useState("");
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);

const [announcementText, setAnnouncementText] = useState("");

// ASSIGNMENT STATES
const [assignmentTitle, setAssignmentTitle] = useState("");
const [assignmentDescription, setAssignmentDescription] = useState("");
const [assignmentDueDate, setAssignmentDueDate] = useState("");
const [submissionAnswers, setSubmissionAnswers] = useState({});
const [selectedSubmissions, setSelectedSubmissions] = useState(null);
const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

// LOGIN
const handleLogin = (userData) => {
localStorage.setItem("token", userData.token);
localStorage.setItem("userName", userData.name);
localStorage.setItem("role", userData.role);

setUserName(userData.name);
setRole(userData.role);
setIsAuthenticated(true);
setMessage("Login successful!");

};

// LOGOUT
const handleLogout = () => {
localStorage.removeItem("token");
localStorage.removeItem("userName");
localStorage.removeItem("role");
localStorage.removeItem("classroomId");

setIsAuthenticated(false);
setUserName("");
setRole("student");
setClassrooms([]);
setClassroom(null);
setJoinId("");
setMessage("");
setSelectedSubmissions(null);

};

// API HEADERS
const getHeaders = () => ({
"Content-Type": "application/json",
Authorization: `Bearer ${localStorage.getItem("token")}`
});

// API REQUEST
const apiRequest = async (url, options = {}) => {
const response = await fetch(`${API_URL}${url}`, {
...options,
headers: {
...getHeaders(),
...options.headers
}
});

const data = await response.json();
if (response.status === 401) {
  handleLogout();
  throw new Error("Session expired. Please login again.");
}
if (!response.ok) {
  throw new Error(data.message || "Something went wrong.");
}
return data;

};

// LOAD TEACHER CLASSROOMS
const loadTeacherClassrooms = async () => {
try {
const data = await apiRequest("/classrooms/my-classrooms");
setClassrooms(data.classrooms || []);
} catch (error) {
setMessage(error.message);
}
};

// LOAD STUDENT CLASSROOM
const loadStudentClassroom = async () => {
const savedId = localStorage.getItem("classroomId");

if (!savedId) return;
try {
  const data = await apiRequest(
    `/classrooms/${encodeURIComponent(savedId)}`
  );
  setClassroom(data.classroom || data);
} catch (error) {
  setMessage(error.message);
}

};

// LOAD DATA AFTER LOGIN
useEffect(() => {
if (!isAuthenticated) return;

if (role === "teacher") {
  loadTeacherClassrooms();
} else {
  loadStudentClassroom();
}

}, [isAuthenticated, role]);

// CREATE CLASSROOM
const createClassroom = async () => {
try {
setLoading(true);
setMessage("");

  const data = await apiRequest("/classrooms", {
    method: "POST"
  });
  setClassroom(data.classroom);
  await loadTeacherClassrooms();
  setMessage(data.message || "Classroom created successfully!");
} catch (error) {
  setMessage(error.message);
} finally {
  setLoading(false);
}

};

// JOIN CLASSROOM
const joinClassroom = async () => {
if (!joinId.trim()) {
setMessage("Please enter classroom ID.");
return;
}

try {
  setLoading(true);
  setMessage("");
  const classroomId = joinId.trim();
  const data = await apiRequest("/classrooms/join", {
    method: "POST",
    body: JSON.stringify({ classroomId })
  });
  localStorage.setItem("classroomId", classroomId);
  setJoinId("");
  const details = await apiRequest(
    `/classrooms/${encodeURIComponent(classroomId)}`
  );
  setClassroom(details.classroom || details);
  setMessage(data.message || "Joined classroom successfully!");
} catch (error) {
  setMessage(error.message);
} finally {
  setLoading(false);
}

};

// VIEW CLASSROOM
const viewClassroom = async (classroomId) => {
try {
setLoading(true);

  const data = await apiRequest(
    `/classrooms/${encodeURIComponent(classroomId)}`
  );
  setClassroom(data.classroom || data);
  setSelectedSubmissions(null);
  setMessage("");
} catch (error) {
  setMessage(error.message);
} finally {
  setLoading(false);
}

};

// COPY CLASSROOM ID
const copyClassroomId = async (id) => {
try {
await navigator.clipboard.writeText(id);
setMessage("Classroom ID copied!");
} catch {
setMessage("Unable to copy classroom ID.");
}
};

// CREATE ANNOUNCEMENT
const createAnnouncement = async () => {
if (!classroom || !announcementText.trim()) {
setMessage("Please enter an announcement.");
return;
}

try {
  setLoading(true);
  await apiRequest(
    `/classrooms/${encodeURIComponent(classroom.classroomId)}/announcements`,
    {
      method: "POST",
      body: JSON.stringify({
        message: announcementText.trim()
      })
    }
  );
  setAnnouncementText("");
  await viewClassroom(classroom.classroomId);
  setMessage("Announcement published!");
} catch (error) {
  setMessage(error.message);
} finally {
  setLoading(false);
}

};

// CREATE ASSIGNMENT
const createAssignment = async () => {
if (
!classroom ||
!assignmentTitle.trim() ||
!assignmentDescription.trim() ||
!assignmentDueDate
) {
setMessage("Please fill all assignment fields.");
return;
}

try {
  setLoading(true);
  await apiRequest(
    `/classrooms/${encodeURIComponent(classroom.classroomId)}/assignments`,
    {
      method: "POST",
      body: JSON.stringify({
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim(),
        dueDate: new Date(assignmentDueDate).toISOString()
      })
    }
  );
  setAssignmentTitle("");
  setAssignmentDescription("");
  setAssignmentDueDate("");
  await viewClassroom(classroom.classroomId);
  setMessage("Assignment created successfully!");
} catch (error) {
  setMessage(error.message);
} finally {
  setLoading(false);
}

};

// SUBMIT ASSIGNMENT
const submitAssignment = async (assignmentId) => {
const answer = submissionAnswers[assignmentId];

if (!answer || !answer.trim()) {
  setMessage("Please enter your answer.");
  return;
}
try {
  setLoading(true);
  await apiRequest(
    `/classrooms/${encodeURIComponent(classroom.classroomId)}/assignments/${assignmentId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({
        answer: answer.trim()
      })
    }
  );
  setSubmissionAnswers((previous) => ({
    ...previous,
    [assignmentId]: ""
  }));
  await viewClassroom(classroom.classroomId);
  setMessage("Assignment submitted successfully!");
} catch (error) {
  setMessage(error.message);
} finally {
  setLoading(false);
}

};

// VIEW ASSIGNMENT SUBMISSIONS
const viewSubmissions = async (assignmentId) => {
try {
setLoading(true);

  const data = await apiRequest(
    `/classrooms/${encodeURIComponent(classroom.classroomId)}/assignments/${assignmentId}/submissions`
  );
  setSelectedSubmissions({
  ...data.assignment,
  assignmentId: assignmentId
});
setSelectedAssignmentId(assignmentId);
setMessage("");
} catch (error) {
  setMessage(error.message);
} finally {
  setLoading(false);
}

};

// GRADE STUDENT ASSIGNMENT
const gradeSubmission = async (submissionId, marks, feedback) => {
  try {
    setLoading(true);

    await apiRequest(
     `/classrooms/${encodeURIComponent(classroom.classroomId)}/assignments/${selectedSubmissions.assignmentId}/submissions/${submissionId}/grade`,
      {
        method: "PUT",
        body: JSON.stringify({
          marks: Number(marks),
          feedback: feedback
        })
      }
    );

    setMessage("Assignment graded successfully!");

    // Refresh submissions
     await viewSubmissions(selectedSubmissions.assignmentId);

  } catch (error) {
    setMessage(error.message);
  } finally {
    setLoading(false);
  }
};

// AUTHENTICATION
if (!isAuthenticated) {
  return <Auth onLogin={handleLogin} />;
}

// DASHBOARD
return (
  <>
  {/* SIDEBAR */}
  <aside className="sidebar">
    <h2>
      <GraduationCap size={28} />
      ClassConnect
    </h2>
    <nav>
      <a className="active" href="#dashboard">
        <LayoutDashboard size={20} />
        Dashboard
      </a>
      <a href="#classrooms">
        <BookOpen size={20} />
        Classrooms
      </a>
      <a href="#students">
        <Users size={20} />
        {role === "teacher" ? "My Students" : "My Class"}
      </a>
      <a href="#announcements">
        <Megaphone size={20} />
        Announcements
      </a>
      <a href="#assignments">
        <ClipboardList size={20} />
        Assignments
      </a>
      <a href="#settings">
        <Settings size={20} />
        Settings
      </a>
    </nav>
    <button className="logout" onClick={handleLogout}>
      <LogOut size={18} />
      Logout
    </button>
  </aside>
  {/* MAIN */}
  <main className="main">
    {/* HEADER */}
    <header className="dashboard-header">
      <div>
        <h1>
          {role === "teacher"
            ? "Teacher Dashboard"
            : "Student Dashboard"}
        </h1>
        <p>Welcome to your ClassConnect workspace.</p>
      </div>
      <div className="user-profile">
        <UserCircle size={22} />
        <span>{userName}</span>
        <span className="role-badge">{role}</span>
      </div>
    </header>
    {/* WELCOME */}
    <section className="welcome-section" id="dashboard">
      <h2>Welcome back, {userName}!</h2>
      <p>
        {role === "teacher"
          ? "Create classrooms, manage students and share announcements."
          : "Join classrooms, connect with your teacher and view announcements."}
      </p>
    </section>
    {/* STATISTICS */}
    <section className="stats-container">
      <div className="stat-card">
        <BookOpen />
        <h3>
          {role === "teacher"
            ? classrooms.length
            : classroom ? 1 : 0}
        </h3>
        <p>
          {role === "teacher"
            ? "Classrooms Created"
            : "Joined Classrooms"}
        </p>
      </div>
      <div className="stat-card">
        <Users />
        <h3>
          {role === "teacher"
            ? classrooms.reduce(
                (total, item) =>
                  total + (item.students?.length || 0),
                0
              )
            : classroom?.students?.length || 0}
        </h3>
        <p>Students Connected</p>
      </div>
      <div className="stat-card">
        <ClipboardList />
        <h3>{classroom?.assignments?.length || 0}</h3>
        <p>Assignments</p>
      </div>
    </section>
    {/* TEACHER SECTION */}
    {role === "teacher" && (
      <section className="classroom-section" id="classrooms">
        <h2>Teacher Classroom Management</h2>
        <div className="classroom-container">
          <div className="classroom-card">
            <div className="card-icon">
              <Plus size={28} />
            </div>
            <h3>Create Classroom</h3>
            <p>
              Create a classroom and share its unique ID with students.
            </p>
            <button
              onClick={createClassroom}
              disabled={loading}
            >
              {loading ? "Please wait..." : "Create Classroom"}
            </button>
          </div>
        </div>
        <h2>My Classrooms</h2>
        <div className="classroom-container">
          {classrooms.map((item) => (
            <div className="classroom-card" key={item._id}>
              <h3>Classroom</h3>
              <p>
                Classroom ID: <strong>{item.classroomId}</strong>
              </p>
              <p>
                Students: {item.students?.length || 0}
              </p>
              <button
                onClick={() => copyClassroomId(item.classroomId)}
              >
                <Copy size={16} /> Copy ID
              </button>
              <button
                onClick={() => viewClassroom(item.classroomId)}
                disabled={loading}
              >
                View Classroom
              </button>
            </div>
          ))}
          {classrooms.length === 0 && (
            <p>You have not created any classroom yet.</p>
          )}
        </div>
      </section>
    )}
    {/* STUDENT SECTION */}
    {role === "student" && (
      <section className="classroom-section" id="classrooms">
        <h2>Student Classroom</h2>
        <div className="classroom-container">
          <div className="classroom-card">
            <div className="card-icon">
              <Users size={28} />
            </div>
            <h3>Join Classroom</h3>
            <p>
              Enter the classroom ID shared by your teacher.
            </p>
            <input
              type="text"
              placeholder="Enter Classroom ID"
              value={joinId}
              onChange={(event) => setJoinId(event.target.value)}
            />
            <button
              onClick={joinClassroom}
              disabled={loading}
            >
              {loading ? "Please wait..." : "Join Now"}
            </button>
          </div>
        </div>
        {classroom && (
          <div className="classroom-card">
            <h3>My Classroom</h3>
            <p>
              Classroom ID: <strong>{classroom.classroomId}</strong>
            </p>
            <p>
              Teacher: {classroom.teacherName || "Teacher"}
            </p>
            <p>
              Students: {classroom.students?.length || 0}
            </p>
          </div>
        )}
      </section>
    )}
    {/* STUDENTS LIST */}
    {role === "teacher" && classroom && (
      <section className="classroom-section" id="students">
        <h2>Students in {classroom.classroomId}</h2>
        {classroom.students?.length > 0 ? (
          classroom.students.map((student) => (
            <div className="stat-card" key={student._id}>
              <UserCircle />
              <h3>{student.name}</h3>
              <p>{student.email}</p>
            </div>
          ))
        ) : (
          <p>No students have joined this classroom yet.</p>
        )}
      </section>
    )}
    {/* ANNOUNCEMENTS */}
    <section className="classroom-section" id="announcements">
      <h2>
        <Megaphone size={22} /> Announcements
      </h2>
      {role === "teacher" && classroom && (
        <div className="classroom-card">
          <h3>Publish Announcement</h3>
          <textarea
            placeholder="Write an announcement..."
            value={announcementText}
            onChange={(event) =>
              setAnnouncementText(event.target.value)
            }
          />
          <button
            onClick={createAnnouncement}
            disabled={loading}
          >
            Publish
          </button>
        </div>
      )}
      {classroom?.announcements?.length > 0 ? (
        classroom.announcements.map((item, index) => (
          <div className="classroom-card" key={item._id || index}>
            <h3>Announcement</h3>
            <p>{item.message || item.text}</p>
          </div>
        ))
      ) : (
        <p>No announcements available.</p>
      )}
    </section>
    {/* ASSIGNMENTS */}
    <section className="classroom-section" id="assignments">
      <h2>
        <ClipboardList size={22} /> Assignments
      </h2>
      {!classroom && (
        <p>Please open or join a classroom to view assignments.</p>
      )}
      {/* TEACHER CREATE ASSIGNMENT */}
      {role === "teacher" && classroom && (
        <div className="classroom-card">
          <h3>Create New Assignment</h3>
          <input
            type="text"
            placeholder="Assignment Title"
            value={assignmentTitle}
            onChange={(event) =>
              setAssignmentTitle(event.target.value)
            }
          />
          <textarea
            placeholder="Assignment Description"
            value={assignmentDescription}
            onChange={(event) =>
              setAssignmentDescription(event.target.value)
            }
          />
          <label>Due Date</label>
          <input
            type="datetime-local"
            value={assignmentDueDate}
            onChange={(event) =>
              setAssignmentDueDate(event.target.value)
            }
          />
          <button
            onClick={createAssignment}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Assignment"}
          </button>
        </div>
      )}
      {/* ASSIGNMENT LIST */}
      {classroom?.assignments?.length > 0 ? (
        classroom.assignments.map((assignment) => (
          <div className="classroom-card" key={assignment._id}>
            <h3>{assignment.title}</h3>
            <p>{assignment.description}</p>
            <p>
              <strong>Due:</strong>{" "}
              {new Date(assignment.dueDate).toLocaleString()}
            </p>
            {/* STUDENT SUBMISSION */}
            {role === "student" && (
              <div>
                <textarea
                  placeholder="Write your assignment answer here..."
                  value={submissionAnswers[assignment._id] || ""}
                  onChange={(event) =>
                    setSubmissionAnswers((previous) => ({
                      ...previous,
                      [assignment._id]: event.target.value
                    }))
                  }
                />
                <button
                  onClick={() => submitAssignment(assignment._id)}
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Assignment"}
                </button>
              </div>
            )}
            {/* TEACHER VIEW SUBMISSIONS */}
            {role === "teacher" && (
              <button
                onClick={() => viewSubmissions(assignment._id)}
                disabled={loading}
              >
                View Submissions
              </button>
            )}
          </div>
        ))
      ) : (
        classroom && <p>No assignments available yet.</p>
      )}
      {/* SUBMISSIONS RESULT */}
{role === "teacher" && selectedSubmissions && (
  <div className="classroom-card">
    <h3>Submissions: {selectedSubmissions.title}</h3>

    {selectedSubmissions.submissions?.length > 0 ? (
      selectedSubmissions.submissions.map((submission, index) => (
        <div className="stat-card" key={submission._id || index}>
          <h3>{submission.student?.name || "Student"}</h3>

          <p>{submission.student?.email || ""}</p>

          <p>
            <strong>Answer:</strong> {submission.answer}
          </p>

          <p>
            Submitted: {submission.submittedAt
              ? new Date(submission.submittedAt).toLocaleString()
              : "N/A"}
          </p>

          <hr />

          <h4>Grade Assignment</h4>

          <input
            type="number"
            min="0"
            max="100"
            placeholder="Enter marks (0-100)"
            id={`marks-${submission._id}`}
          />

          <textarea
            placeholder="Enter feedback"
            id={`feedback-${submission._id}`}
          />

          <button
            disabled={loading}
            onClick={() =>
              gradeSubmission(
                submission._id,
                document.getElementById(`marks-${submission._id}`).value,
                document.getElementById(`feedback-${submission._id}`).value
              )
            }
          >
            {loading ? "Saving..." : "Submit Grade"}
          </button>

          {submission.marks !== null &&
            submission.marks !== undefined && (
              <p>
                <strong>Current Marks:</strong> {submission.marks}/100
              </p>
            )}

          {submission.feedback && (
            <p>
              <strong>Feedback:</strong> {submission.feedback}
            </p>
          )}
        </div>
      ))
    ) : (
      <p>No submissions received yet.</p>
    )}
  </div>
)}
    </section>
  </main>
  </>
);
}
export default App;
