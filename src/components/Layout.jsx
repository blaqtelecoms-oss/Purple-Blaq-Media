import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/pb/Header";
import Footer from "@/components/pb/Footer";

export default function Layout() {
  const location = useLocation();
  return (
    <div style={{ background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <main style={{ flex: 1 }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}