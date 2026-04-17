import "./globals.css";
import { Inter } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { UuidProvider } from "@/components/UuidProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Last Pay Wins",
  description:
    "Pay the invoice to reset the timer. If the timer hits zero before someone else pays, you win the jackpot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UuidProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </UuidProvider>
      </body>
    </html>
  );
}
