/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "fade-in-out": {
          "0%": { opacity: "0", transform: "translate(-50%, 10px)" },
          "20%": { opacity: "1", transform: "translate(-50%, 0)" },
          "80%": { opacity: "1", transform: "translate(-50%, 0)" },
          "100%": { opacity: "0", transform: "translate(-50%, -10px)" },
        },
      },
      animation: {
        "fade-in-out": "fade-in-out 1s ease-in-out forwards",
      },
    },
  },
  plugins: [],
};
