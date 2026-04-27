import { Anton, Bricolage_Grotesque, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./fire.css";

const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono-jb",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-inst",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export default function NewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${anton.variable} ${bricolage.variable} ${jetbrains.variable} ${instrumentSerif.variable}`}>
      {children}
    </div>
  );
}
