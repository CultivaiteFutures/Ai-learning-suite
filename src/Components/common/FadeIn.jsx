import { useState, useEffect } from "react";

export default function FadeIn({ children, watch }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(timer);
  }, [watch]);

  return (
    <div className={`h-full transition-opacity duration-300 ease-out ${visible ? "opacity-100" : "opacity-0"}`}>
      {children}
    </div>
  );
}