/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FFFDF9",
          100: "#FDF8EF",
          200: "#FBF1DE",
          300: "#F5E6C8",
        },
        sage: {
          50: "#F3F6F1",
          100: "#E4EBDE",
          200: "#C9D8BE",
          300: "#AEC59F",
          400: "#8FAF7C",
          500: "#729760",
          600: "#5A7A4B",
          700: "#465F3B",
        },
        terracotta: {
          50: "#FBF0EA",
          100: "#F5DCCC",
          200: "#E9B698",
          300: "#DD9066",
          400: "#D0703F",
          500: "#BC5A2C",
          600: "#984923",
          700: "#75381B",
        },
        ink: {
          50: "#F7F6F4",
          100: "#E9E6E1",
          400: "#8A8477",
          600: "#5C574C",
          800: "#332F28",
          900: "#211F1A",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
      borderRadius: {
        card: "24px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
