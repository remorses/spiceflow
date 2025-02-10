"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button(props: ButtonProps) {
  const className = `px-2 py-1 rounded-md transition-colors ${props.className || ""}`;

  return (
    <button
      {...props}
      className={className}
    />
  );
}

