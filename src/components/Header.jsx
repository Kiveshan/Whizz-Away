import React, { useEffect, useState } from "react";

const Header = ({ title }) => {
  const [user, setUser] = useState({ name: "", surname: "" });
  
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("http://localhost:5000/user-info", {
          credentials: "include", // Ensure session cookie is sent
        });

        const data = await response.json();

        if (response.ok) {
          setUser({ name: data.name, surname: data.surname });
        } else {
          setUser({ name: "Guest", surname: "" }); // Default to guest if no session
          console.error("Error fetching user info:", data.error);
        }
      } catch (error) {
        console.error("Network error:", error);
        setUser({ name: "Guest", surname: "" }); // Fallback to guest on error
      }
    };

    fetchUserInfo();
  }, []); // Empty array ensures it runs only once when the component mounts

  return (
    <header className="header">
      <div className="logo-container">
        <img src="/images/whizz-away.jpeg" className="logo-img" alt="Business Logo" />
      </div>
      <h1>{title}</h1>
      <div className="user-info">
        <img src="/images/lady.jpg" className="user-img" alt={`${user.name} ${user.surname}`} />
        <span>{user.name && user.surname ? `${user.name} ${user.surname}` : "Guest"}</span>
      </div>
    </header>
  );
};

export default Header;
