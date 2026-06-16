import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearError, registerUser } from "../../redux/authSlice";
import { Link, useNavigate } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Grab the auth state from Redux to handle user feedback tracking
  const { token, loading, error } = useSelector((state) => state.auth);

  // If registration succeeds and a token is registered, instantly reroute to the chat workspace
  useEffect(() => {
    if (token) {
      navigate("/chat");
    }
  }, [token, navigate]);
  useEffect(() => {
    dispatch(clearError());
  }, []);
  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(registerUser(formData));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <h2 className="text-3xl font-bold text-white text-center mb-6">
          Create Account
        </h2>

        {/* Error Banner to handle explicit validation mapping from Laravel */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500 text-rose-400 p-3 rounded-lg text-sm mb-4">
            {typeof error === "object" ? Object.values(error)[0][0] : error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">
              Email Address{" "}
            </label>
            <input
              type="email"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password_confirmation: e.target.value,
                })
              }
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition dynamic-btn duration-200 mt-2"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>
        <p className="text-slate-400 text-sm text-center mt-4">
          {" "}
          Already have an account?{" "}
          <Link to="/login" className="text-violet-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
