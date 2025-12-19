import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-mono transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-aether-100 text-aether-900 hover:bg-white hover:shadow-[0_0_20px_rgba(232,228,217,0.3)] hover:text-gray-700",
    secondary: "bg-aether-800 text-aether-100 border border-aether-700 hover:border-aether-100",
    outline: "bg-transparent border border-aether-100 text-aether-100 hover:bg-aether-100/10",
    ghost: "text-aether-100/60 hover:text-aether-100 hover:bg-white/5",
  };

  const sizes = {
    sm: "px-3 py-1 text-xs",
    md: "px-6 py-3 text-sm tracking-wider uppercase",
    lg: "px-8 py-4 text-base tracking-widest uppercase font-bold",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};