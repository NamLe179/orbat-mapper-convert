import Interaction from "ol/interaction/Interaction";
import MapBrowserEvent from "ol/MapBrowserEvent";
import { click } from "ol/events/condition";

/**
 * Chức năng: Custom interactions cho OpenLayers
 *    Class MapCtrlClick: xử lý sự kiện Ctrl+Click
 *    Dùng cho chọn nhiều đối tượng hoặc mở context menu
 */

// Hàm helper kiểm tra phím Ctrl/Meta (Command trên Mac)
const ctrlKeyOnly = function (mapBrowserEvent: MapBrowserEvent<any>) {
  const originalEvent = mapBrowserEvent.originalEvent;
  return (
    (originalEvent.metaKey || originalEvent.ctrlKey) &&
    !originalEvent.shiftKey &&
    !originalEvent.altKey
  );
};

export interface MapCtrlClickOptions {
  handleCtrlClickEvent?: (
    mapBrowserEvent: MapBrowserEvent<PointerEvent>,
  ) => boolean | void;
}

/**
 * Custom Interaction để xử lý sự kiện Ctrl + Click trên bản đồ.
 * Thường dùng để chọn nhiều đối tượng hoặc menu ngữ cảnh.
 */
export class MapCtrlClick extends Interaction {
  // Định nghĩa lại type cho callback để TS hiểu rõ hơn
  private handleCtrlClickCallback: (mapBrowserEvent: MapBrowserEvent<PointerEvent>) => boolean | void;

  constructor(options: MapCtrlClickOptions = {}) {
    super();
    if (options.handleCtrlClickEvent) {
      this.handleCtrlClickCallback = options.handleCtrlClickEvent;
    } else {
        // Default impl
        this.handleCtrlClickCallback = (evt) => {
            console.log("Ctrl click triggered", evt);
        };
    }
  }

  /**
   * Hàm này được OpenLayers gọi tự động mỗi khi có sự kiện trên map.
   * @override
   */
  handleEvent(mapBrowserEvent: MapBrowserEvent<any>): boolean {
    let stopEvent = false;
    
    // Kiểm tra điều kiện: Giữ Ctrl và Click chuột
    if (ctrlKeyOnly(mapBrowserEvent) && click(mapBrowserEvent)) {
      // Gọi callback xử lý custom
      // Ép kiểu mapBrowserEvent sang UIEvent/PointerEvent nếu cần thiết
      const result = this.handleCtrlClickCallback(mapBrowserEvent as MapBrowserEvent<PointerEvent>);
      
      // Nếu callback trả về false hoặc void, ta chặn sự kiện lan tiếp (stop propagation)
      stopEvent = result ?? true; 
    }
    
    // Trả về false nghĩa là "dừng xử lý sự kiện này tại đây, không cho các interaction khác xử lý nữa"
    // Trả về true nghĩa là "tiếp tục cho phép các interaction khác xử lý"
    return !stopEvent;
  }
}