import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Gilroy", "Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { 
          DEFAULT: '#EB595F', 
          hover: '#d44f55', 
          light: '#fdf2f2',
          foreground: "#FFFFFF"
        },
        secondary: { 
          DEFAULT: '#603E5E', 
          hover: '#4e3249', 
          light: '#f3eef3',
          foreground: "#FFFFFF"
        },
        accent: { 
          DEFAULT: '#ECD3CD', 
          hover: '#e0c4bc',
          foreground: '#603E5E'
        },
        brand: {
          surface: '#F8F4F3',
          dark: '#1A1A2E',
          muted: '#6B7280'
        },
        livspace: {
          orange: {
            DEFAULT: "#EB595F", // Use primary
            hover: "#d44f55",
            light: "#fdf2f2",
          },
          dark: "#1A1A2E",
          blue: "#603E5E", // Use secondary
          gray: {
            800: "#2D2D2D",
            600: "#6B6B6B",
            400: "#A8A8A8",
            200: "#E8E8E8",
            100: "#F5F5F5",
          },
          success: "#27AE60",
          warning: "#F39C12",
          error: "#E74C3C",
          info: "#2980B9",
        },
        priority: {
          p0: "#E74C3C",
          p1: "#F39C12",
          p2: "#27AE60",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
