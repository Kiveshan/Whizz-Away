"use client";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";
import api from "../api";
import PlansModal from "./billing/PlansModal";

const Header = ({ title }) => {
  const [user, setUser] = useState({ name: "", surname: "", subscription_tier: null });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  useEffect(() => {
    // Try to get user info from localStorage first (faster)
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({
          name: parsedUser.name || "",
          surname: parsedUser.surname || "",
          subscription_tier: parsedUser.subscription_tier || null,
        });
        setIsLoggedIn(true);
        return; // Exit early if we have user data in localStorage
      } catch (error) {
        console.error("Error parsing stored user data:", error);
      }
    }

    // If no localStorage data, fetch from API using the token
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUser({ name: "Guest", surname: "" });
          setIsLoggedIn(false);
          return;
        }

        const response = await api.get("/user-info");

        setUser({ name: response.data.name, surname: response.data.surname, subscription_tier: response.data.subscription_tier || null });
        setIsLoggedIn(true);

        // Store user info in localStorage for future use
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: response.data.name,
            surname: response.data.surname,
            roleid: response.data.roleid,
            subscription_tier: response.data.subscription_tier || null,
          })
        );
      } catch (error) {
        console.error("Network error:", error);
        setUser({ name: "Guest", surname: "" });
        setIsLoggedIn(false);
      }
    };

    fetchUserInfo();
  }, []); // Empty array ensures it runs only once when the component mounts

  return (
    <>
      <header className="header">
        <div className="logo-container">
          <img
            src="/images/whizz-away.jpeg"
            className="logo-img"
            alt="Business Logo"
          />
        </div>
        <h1>{title}</h1>
        <div className="user-info">
          <img
            src={isLoggedIn ? "/images/lady.jpg" : "/images/mann.jpg"}
            className="user-img"
            alt={`${user.name} ${user.surname}`}
          />
          <div className="user-name-block">
            <span className="user-name">
              {user.name && user.surname ? `${user.name} ${user.surname}` : "Guest"}
            </span>
            {user.subscription_tier && (
              <button
                className="user-plan user-plan--clickable"
                onClick={() => setShowPlansModal(true)}
                title="View all plans"
              >
                {user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)} Plan
              </button>
            )}
          </div>
          {/* {isLoggedIn && <LogoutButton />} */}
        </div>
      </header>
      {showPlansModal && <PlansModal onClose={() => setShowPlansModal(false)} />}
    </>
  );
};

export default Header;
