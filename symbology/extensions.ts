// Nếu bạn có cài @types/milsymbol thì import, nếu không thì dùng any
// import ms from 'milsymbol'; 

/**
 * Extension for milsymbol to add SigInt and Reinforced modifiers.
 * * @param this - The milsymbol Symbol instance context
 * @param ms - The milsymbol library instance
 */
export function testExtension(this: any, ms: any) {
  const drawArray1: any[] = [];
  const drawArray2: any[] = [];
  
  // Tạo BBox mới dựa trên BBox hiện tại
  const bbox_org = ms.BBox(this.bbox);
  const this_bbox = ms.BBox(this.bbox);
  
  // Lấy màu khung dựa trên phe phái (affiliation)
  const frameColor = this.colors.frameColor[this.metadata.affiliation];

  // Nếu không có geometry cơ sở hoặc không có màu khung thì không vẽ gì thêm
  if (this.metadata.baseGeometry.g && frameColor) {
    let spacing = 18;
    
    // Logic tính khoảng cách (giữ nguyên từ file gốc)
    if (
      this.metadata.affiliation == "Unknown" ||
      (this.metadata.affiliation == "Hostile" && this.metadata.dimension != "Subsurface")
    ) {
      spacing = 18;
    }

    // 1. Vẽ ký hiệu Reinforced (Gia cường) - Bên phải
    if (this.options.reinforced != undefined && this.options.reinforced != "") {
      drawArray2.push({
        type: "text",
        text: this.options.reinforced,
        x: bbox_org.x2 + spacing,
        y: 65,
        fill: frameColor,
        fontfamily: this.style.fontfamily,
        fontsize: 30,
        fontweight: "bold",
        textanchor: "middle",
      });
      // Mở rộng bounding box
      this_bbox.merge({ x2: bbox_org.x2 + spacing + 22, y1: 65 - 40 });
    }

    // 2. Vẽ ký hiệu Signature (!) - Bên phải
    if (this.options.signature == "!") {
      drawArray2.push({
        type: "text",
        text: "!",
        x: bbox_org.x2 + spacing,
        y: 170,
        fill: frameColor,
        fontfamily: this.style.fontfamily,
        fontsize: 50,
        fontweight: "bold",
        textanchor: "middle",
      });
      this_bbox.merge({
        x2: bbox_org.x2 + spacing + 22,
        y1: 170 - 25,
        y2: 170,
      });
    }

    // 3. Vẽ Special Headquarter (Sở chỉ huy đặc biệt) - Ở giữa
    if (
      this.options.specialheadquarter != undefined &&
      this.options.specialheadquarter != ""
    ) {
      let size = 42;
      const fontFamily = this.style.fontfamily;
      
      // Xác định màu chữ (ưu tiên infoColor -> iconColor)
      const fontColor =
        (typeof this.style.infoColor === "object"
          ? this.style.infoColor[this.metadata.affiliation]
          : this.style.infoColor) ||
        this.colors.iconColor[this.metadata.affiliation] ||
        this.colors.iconColor["Friend"];

      let y = 115;
      const str = this.options.specialheadquarter;
      
      // Điều chỉnh kích thước chữ tùy độ dài
      if (str.length == 1) {
        size = 45;
        y = 115;
      } else if (str.length == 3) {
        size = 35;
        y = 110;
      } else if (str.length >= 4) {
        size = 32;
        y = 110;
      }

      drawArray2.push({
        type: "text",
        text: this.options.specialheadquarter,
        x: 100,
        y: y,
        textanchor: "middle",
        fontsize: size,
        fontfamily: fontFamily,
        fill: fontColor,
        stroke: false,
        fontweight: "bold",
      });
    }

    // 4. Vẽ Outline (Viền) nếu có
    if (this.style.outlineWidth > 0) {
      const outlineColor = typeof this.style.outlineColor === "object"
        ? this.style.outlineColor[this.metadata.affiliation]
        : this.style.outlineColor;

      drawArray1.push(
        ms.outline(
          drawArray2,
          this.style.outlineWidth,
          this.style.strokeWidth,
          outlineColor
        )
      );
    }
  }

  return { pre: drawArray1, post: drawArray2, bbox: this_bbox };
}