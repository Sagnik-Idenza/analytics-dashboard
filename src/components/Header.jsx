// src/components/Header.js
import React from 'react';

export const Header = () => {
  return (
    <div className="header bg-blue-600 shadow-md py-4">
      <div className="container mx-auto grid grid-cols-3 items-center">
        
        {/* Left Section: Logo and Idenza */}
        <div className="flex items-center space-x-2">
          <img
            src="/android-chrome-192x192.png"
            alt="Idenza Logo"
            className="logo w-5 h-5"
            style={{height: "5vh", marginRight: "10px"}}
          />
          <span className="text-white text-xl font-semibold">Idenza</span>
        </div>

        {/* Center Section: Fraud Rules Management */}
        <div className="flex justify-center" style= {{paddingLeft: "3rem"}}>
          <h1 className="text-white text-2xl font-semibold">
          </h1>
        </div>

        {/* Right Section: Empty for balance */}
        <div></div>
        
      </div>
    </div>
  );
};


