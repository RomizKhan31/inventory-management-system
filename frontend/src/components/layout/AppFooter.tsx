"use client";

import React from "react";
import Image from "next/image";

/**
 * AppFooter Component:
 * Clean, minimal enterprise footer for Walton Hi-Tech Industries PLC.
 * Displays the official Walton logo, copyright notices, and minimal system details.
 */
export const AppFooter = () => {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto mt-0 px-4 sm:px-6 lg:px-8 pt-[30px] pb-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-slate-500">
        <span>Developed by Romiz Khan</span>
      </div>
    </footer>
  );
};
