import type { PptContent } from "@/lib/types";

export async function downloadPptx(fileName: string, subtitle: string, ppt: any) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const deck = new PptxGenJS();
  deck.layout = "LAYOUT_16x9";

  const slides = Array.isArray(ppt) ? ppt : ppt.slides || [];

  slides.forEach((slide: any, index: number) => {
    const s = deck.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.22, fill: { color: "3F4BD6" } });
    s.addText(slide.title || "Slide", {
      x: 0.6,
      y: 0.55,
      w: 8.8,
      h: 0.9,
      fontSize: index === 0 ? 34 : 26,
      bold: true,
      color: "1B1F3B",
      fontFace: "Calibri",
    });
    if (index === 0 && subtitle) {
      s.addText(subtitle, { x: 0.6, y: 1.4, w: 8.8, fontSize: 16, color: "5A6080" });
    }
    const points = slide.bullets || slide.points;
    if (points?.length) {
      s.addText(
        points.map((p: string) => ({ text: p, options: { bullet: true, breakLine: true } })),
        { x: 0.7, y: index === 0 ? 2.1 : 1.6, w: 8.6, h: 3.2, fontSize: 16, color: "2C3050", lineSpacingMultiple: 1.2 },
      );
    }
    const notes = slide.script || slide.notes;
    if (notes) s.addNotes(notes);
  });

  await deck.writeFile({ fileName: `${fileName}.pptx` });
}
