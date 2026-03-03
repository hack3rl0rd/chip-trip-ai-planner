import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <span className="text-8xl block">🗺️</span>
          <h1 className="text-5xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">Oops! Trang này không tồn tại</p>
          <p className="text-sm text-muted-foreground">Có vẻ bạn đã lạc đường rồi, nhưng đừng lo!</p>
          <Link to="/">
            <Button variant="hero" size="lg" className="mt-4">
              Quay về trang chủ 🏠
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
