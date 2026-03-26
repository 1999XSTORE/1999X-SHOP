import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useEffect, useRef } from "react";

const queryClient = new QueryClient();

// Smooth mouse-following glow
function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const cur = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const raf = useRef<number>();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);

    const animate = () => {
      // Smooth lerp — lower = slower/smoother
      cur.current.x += (pos.current.x - cur.current.x) * 0.06;
      cur.current.y += (pos.current.y - cur.current.y) * 0.06;
      if (glowRef.current) {
        glowRef.current.style.transform =
          `translate(${cur.current.x - 300}px, ${cur.current.y - 300}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 600,
        height: 600,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0,
        background:
          "radial-gradient(circle, rgba(99,70,255,0.07) 0%, rgba(70,45,200,0.04) 35%, transparent 70%)",
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
