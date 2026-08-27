import type { PptContent } from "@/lib/types";

export async function downloadPptx(fileName: string, subtitle: string, ppt: any) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_16x9";

  deck.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: { color: "F8F9FA" },
    objects: [
      { rect: { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: "0F172A" } } },
      { rect: { x: 0, y: "97%", w: "100%", h: 0.15, fill: { color: "3B82F6" } } },
    ],
  });

  const slides = Array.isArray(ppt) ? ppt : ppt.slides || [];

  // Title Slide
  const titleSlide = deck.addSlide();
  titleSlide.background = { color: "0F172A" };
  titleSlide.addText(fileName.replace(/_/g, " "), {
    x: 1, y: 2.2, w: 8, h: 1.5,
    fontSize: 44, bold: true, color: "FFFFFF", fontFace: "Segoe UI", align: "center"
  });
  if (subtitle) {
    titleSlide.addText(subtitle, {
      x: 1, y: 3.8, w: 8, h: 0.8,
      fontSize: 22, color: "94A3B8", fontFace: "Segoe UI", align: "center"
    });
  }
  titleSlide.addShape("rect", { x: 4.5, y: 3.5, w: 1, h: 0.05, fill: { color: "3B82F6" } });

  slides.forEach((slide: any) => {
    const s = deck.addSlide("MASTER_SLIDE");
    
    // Slide Title
    s.addText(slide.title || "Slide", {
      x: 0.6, y: 0.4, w: 8.8, h: 0.8,
      fontSize: 32, bold: true, color: "0F172A", fontFace: "Segoe UI"
    });

    const points = slide.bullets || slide.points || [];
    const layout = slide.layout || "standard";

    if (points.length) {
      if (layout === "process_flow") {
        // Process Flow Layout
        const boxWidth = 2.2;
        const boxSpacing = 0.5;
        const startX = 0.6;
        
        points.forEach((p: string, idx: number) => {
          const isLast = idx === points.length - 1;
          const xPos = startX + (idx * (boxWidth + boxSpacing));
          
          // Draw Box
          s.addShape("rect", {
            x: xPos, y: 2, w: boxWidth, h: 1.8,
            fill: { color: "FFFFFF" },
            line: { color: "3B82F6", width: 2, dashType: "solid" },
            shadow: { type: "outer", opacity: 0.2, blur: 5, offset: 3, angle: 45 }
          });
          
          // Add text inside box
          s.addText(p.replace(/\*\*/g, ""), {
            x: xPos + 0.1, y: 2.1, w: boxWidth - 0.2, h: 1.6,
            fontSize: 14, color: "1E293B", fontFace: "Segoe UI", align: "center", valign: "middle"
          });
          
          // Draw Arrow to next box
          if (!isLast && idx < 3) {
            s.addShape("rightArrow", {
              x: xPos + boxWidth + 0.1, y: 2.7, w: boxSpacing - 0.2, h: 0.3,
              fill: { color: "94A3B8" }
            });
          }
        });
      } 
      else {
        // Standard or Image Right Layout
        const isImageRight = layout === "image_right" && slide.visualPrompt;
        const textWidth = isImageRight ? 4.2 : 8.8;

        const textArray = points.flatMap((p: string) => {
          const parts = p.split(/(\*\*.*?\*\*)/g).filter(Boolean);
          const chunks: any[] = [];
          parts.forEach((part, idx) => {
            const isBold = part.startsWith("**") && part.endsWith("**");
            const cleanText = isBold ? part.slice(2, -2) : part;
            const options: any = { bold: isBold, fontFace: "Segoe UI", color: "334155" };
            if (idx === 0) options.bullet = { color: "3B82F6" };
            if (idx === parts.length - 1) options.breakLine = true;
            chunks.push({ text: cleanText, options });
          });
          if (chunks.length === 0) chunks.push({ text: " ", options: { bullet: true, breakLine: true } });
          return chunks;
        });

        s.addText(textArray, {
          x: 0.6, y: 1.5, w: textWidth, h: 3.5,
          fontSize: 18, color: "334155", lineSpacingMultiple: 1.2, valign: "top"
        });

        if (isImageRight) {
          const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(slide.visualPrompt)}?width=800&height=600&nologo=true`;
          s.addImage({
            x: 5.2, y: 1.5, w: 4.2, h: 3.5,
            path: imgUrl,
            sizing: { type: "cover" }
          });
        }
      }
    }

    const notes = slide.script || slide.notes;
    if (notes) {
      s.addNotes(notes);
    }
  });

  await deck.writeFile({ fileName: `${fileName}.pptx` });
}
