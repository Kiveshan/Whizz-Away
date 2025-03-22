import React from "react";
import { FaCog } from "react-icons/fa";

const Header = ({ title }) => {
  return (
    <header className="header">
      <div className="logo-container">
        <img src="/images/whizz-awaylogo.png" className="logo-img" alt="Business Logo" />
      </div>
      <h1>{title}</h1>  
      <div className="user-info">
        <img src="/images/lady.jpg" className="user-img" alt="Amanda Smith" />
        <span>Amanda Smith</span>
      </div>
    </header>
  );
};

export default Header;

