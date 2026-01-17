import "./globals.css";
import { Press_Start_2P } from "next/font/google";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html>
      <body className={pixelFont.className}>
        {children}
      </body>
    </html>
  );
}
