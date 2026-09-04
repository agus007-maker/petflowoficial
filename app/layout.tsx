import type { Metadata } from "next";
import "./globals.css";
import "./petflow-additions.css";

export const metadata: Metadata = {
  title: "PetFlow · Gestión para pet shops",
  description: "Operación diaria, ventas, turnos e inventario para pet shops.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
