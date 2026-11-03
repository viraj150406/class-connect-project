import { useState } from "react";
import "./Auth.css";

const API_URL = "/api";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint = isLogin
        ? "auth/login"
        : "auth/register";

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Something went wrong.");
        return;
      }

      if (isLogin) {
        onLogin({
          name: data.user.name,
          token: data.token,
          role: data.user.role || "student"
        });
      } else {
        setMessage("Registration successful! Please login.");
        setIsLogin(true);
        setName("");
        setEmail("");
        setPassword("");
        setRole("student");
      }

    } catch (error) {
      setMessage("Backend connection failed. Check your server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h1>ClassConnect</h1>

        <h2>
          {isLogin ? "Welcome Back!" : "Create Your Account"}
        </h2>

        <p>
          {isLogin
            ? "Login to your ClassConnect account."
            : "Join ClassConnect as a Teacher or Student."}
        </p>

        <form onSubmit={handleSubmit}>

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              <label htmlFor="role">Select Your Role</label>

              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </>
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isLogin
                ? "Login"
                : "Register"}
          </button>

        </form>

        {message && (
          <p role="status">{message}</p>
        )}

        <p>
          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}
        </p>

        <button
          type="button"
          className="toggle-btn"
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage("");
          }}
        >
          {isLogin ? "Create Account" : "Login Here"}
        </button>

      </div>
    </div>
  );
}

export default Auth;
