// --- 1. Event Bus Utility (Pure TS) ---

type Listener<T = any> = (data: T) => void;
type Unsubscribe = () => void;

interface EventHook<T = any> {
  on: (listener: Listener<T>) => Unsubscribe;
  trigger: (data: T) => void;
}

/**
 * Tạo một Event Hook đơn giản (Observer Pattern).
 * Thay thế cho createEventHook của VueUse.
 */
function createEventHook<T = any>(): EventHook<T> {
  const listeners = new Set<Listener<T>>();

  const on = (listener: Listener<T>): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const trigger = (data: T) => {
    listeners.forEach((listener) => listener(data));
  };

  return { on, trigger };
}

// --- 2. Global Instances (Singleton) ---
// Khởi tạo các event bus ngay tại module level.
// Chúng sẽ tồn tại suốt vòng đời ứng dụng (như Global Store).

const unitSelectHook = createEventHook<any>();
const featureSelectHook = createEventHook<any>();
const layerSelectHook = createEventHook<any>();
const imageLayerSelectHook = createEventHook<any>();
const eventSelectHook = createEventHook<any>();
const placeSelectHook = createEventHook<any>();
const scenarioActionHook = createEventHook<any>();

// --- 3. Hook Export ---

export function useSearchActions() {
  return {
    // Listeners (Dùng trong các component bản đồ/xử lý)
    onUnitSelect: unitSelectHook.on,
    onFeatureSelect: featureSelectHook.on,
    onLayerSelect: layerSelectHook.on,
    onImageLayerSelect: imageLayerSelectHook.on,
    onEventSelect: eventSelectHook.on,
    onPlaceSelect: placeSelectHook.on,
    onScenarioAction: scenarioActionHook.on,

    // Triggers (Dùng trong thanh tìm kiếm - Search Bar)
    // Tôi expose thêm các hàm này để bạn có thể gọi khi user click vào kết quả tìm kiếm
    triggerUnitSelect: unitSelectHook.trigger,
    triggerFeatureSelect: featureSelectHook.trigger,
    triggerLayerSelect: layerSelectHook.trigger,
    triggerImageLayerSelect: imageLayerSelectHook.trigger,
    triggerEventSelect: eventSelectHook.trigger,
    triggerPlaceSelect: placeSelectHook.trigger,
    triggerScenarioAction: scenarioActionHook.trigger,
  };
}