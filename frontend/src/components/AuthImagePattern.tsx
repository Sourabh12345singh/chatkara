import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Props = {
  title: string;
  subtitle: string;
};

const COLORS = ["bg-primary", "bg-secondary", "bg-accent", "bg-primary/80", "bg-secondary/80", "bg-accent/80", "bg-primary/60", "bg-secondary/60", "bg-accent/60"];

const AuthImagePattern = ({ title, subtitle }: Props) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [randomColors, setRandomColors] = useState(COLORS);

  useEffect(() => {
    setRandomColors([...COLORS].sort(() => 0.5 - Math.random()));
  }, []);

  return (
    <div className="relative hidden items-center justify-center overflow-hidden bg-base-200 p-12 lg:flex">
      <div className="absolute inset-0 overflow-hidden opacity-50">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/30"
            initial={{ x: `${Math.random() * 100 - 50}%`, y: `${Math.random() * 100 - 50}%`, width: Math.random() * 100 + 50, height: Math.random() * 100 + 50 }}
            animate={{ x: [`${Math.random() * 100 - 50}%`, `${Math.random() * 100 - 50}%`, `${Math.random() * 100 - 50}%`], y: [`${Math.random() * 100 - 50}%`, `${Math.random() * 100 - 50}%`, `${Math.random() * 100 - 50}%`] }}
            transition={{ duration: Math.random() * 20 + 10, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
          />
        ))}
      </div>
      <div className="z-10 max-w-md text-center">
        <motion.div className="mb-8 grid grid-cols-3 gap-3" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.div
              key={i}
              className={`relative aspect-square cursor-pointer rounded-2xl ${randomColors[i % randomColors.length]}`}
              whileHover={{ scale: 1.1, rotate: Math.random() * 10 - 5, zIndex: 10 }}
              animate={{ scale: i % 2 === 0 ? [1, 1.05, 1] : 1, rotate: i % 3 === 0 ? [0, 2, 0, -2, 0] : 0 }}
              transition={{ duration: i % 2 === 0 ? 2 : 0, repeat: i % 2 === 0 ? Number.POSITIVE_INFINITY : 0, repeatType: "reverse", ease: "easeInOut", delay: i * 0.1 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === i && <motion.div className="absolute inset-0 flex items-center justify-center font-bold text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{i + 1}</motion.div>}
            </motion.div>
          ))}
        </motion.div>
        <motion.h2 className="mb-4 text-2xl font-bold" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>{title}</motion.h2>
        <motion.p className="text-base-content/60" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>{subtitle}</motion.p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
