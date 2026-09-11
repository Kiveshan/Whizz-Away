"use client";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";
import api from "../api";
import { roleName } from "../config/routeRoles";

const Header = ({ title }) => {
  const [user, setUser] = useState({ name: "", surname: "", roleid: null });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Try to get user info from localStorage first (faster)
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({
          name: parsedUser.name || "",
          surname: parsedUser.surname || "",
          roleid: parsedUser.roleid ?? null,
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
          setUser({ name: "Guest", surname: "", roleid: null });
          setIsLoggedIn(false);
          return;
        }

        const response = await api.get("/user-info");

        setUser({
          name: response.data.name,
          surname: response.data.surname,
          roleid: response.data.roleid,
        });
        setIsLoggedIn(true);

        // Store user info in localStorage for future use
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: response.data.name,
            surname: response.data.surname,
            roleid: response.data.roleid,
          })
        );
      } catch (error) {
        console.error("Network error:", error);
        setUser({ name: "Guest", surname: "", roleid: null });
        setIsLoggedIn(false);
      }
    };

    fetchUserInfo();
  }, []); // Empty array ensures it runs only once when the component mounts

  return (
    <header className="header">
      <div className="logo-container">
        <img
          src="/images/whizz-away.jpeg"
          className="logo-img"
          alt="Business Logo"
        />
        <span className="brand-name">Whizz Away</span>
      </div>
      <h1>{title}</h1>
      <div className="user-info">
        <div className="user-details">
          <span className="user-name">
            {user.name && user.surname ? `${user.name} ${user.surname}` : "Guest"}
          </span>
          {isLoggedIn && roleName(user.roleid) && (
            <span className="user-role">{roleName(user.roleid)}</span>
          )}
        </div>
        {isLoggedIn && <LogoutButton />}
      </div>
    </header>
  );
};

export default Header;
