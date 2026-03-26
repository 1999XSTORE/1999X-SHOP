import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();
const GLOW_SIZE = 600;

function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const cur = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const raf = useRef<number>();

  useEffect(() => {
    if (
      window.matchMedia("(hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const onMove = ({ clientX, clientY }: MouseEvent) => {
      pos.current = { x: clientX, y: clientY };
    };

    const animate = () => {
      cur.current.x += (pos.current.x - cur.current.x) * 0.06;
      cur.current.y += (pos.current.y - cur.current.y) * 0.06;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${cur.current.x - GLOW_SIZE / 2}px, ${cur.current.y - GLOW_SIZE / 2}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      ref={glowRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: GLOW_SIZE,
        height: GLOW_SIZE,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0,
        background:
          "radial-gradient(circle, rgba(80,55,220,0.055) 0%, rgba(55,35,180,0.025) 40%, transparent 68%)",
        willChange: "transform",
        mixBlendMode: "screen",
      }}
    />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <MouseGlow />
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pay" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
