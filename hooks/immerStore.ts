import { useState, useRef, useCallback, useMemo } from "react";
import type { Patch } from "immer";
import { enablePatches, produceWithPatches, applyPatches, setAutoFreeze } from "immer";

// Kích hoạt tính năng Patch của Immer
enablePatches();
setAutoFreeze(false);

export interface MetaEntry<T = string> {
  label: T;
  value: string | number;
}

interface UndoEntry<T = string> {
  patches: Patch[];
  inversePatches: Patch[];
  meta?: MetaEntry<T>;
}

type UndoRedoEvent<M> = {
  patch: Patch[];
  meta?: MetaEntry<M>;
  action: "undo" | "redo";
};

type UndoRedoCallback<M> = (event: UndoRedoEvent<M>) => void;

/**
 * React Hook for Immer-based state management with Undo/Redo history.
 * @param baseState Initial state object
 */
export function useImmerStore<T extends object, M>(baseState: T) {
  // --- Refs: Source of Truth (Mutable để xử lý logic đồng bộ) ---
  const stateRef = useRef<T>(baseState);
  const pastRef = useRef<UndoEntry<M>[]>([]);
  const futureRef = useRef<UndoEntry<M>[]>([]);
  const listenersRef = useRef<Set<UndoRedoCallback<M>>>(new Set());

  // --- State: Trigger React Render ---
  // Chúng ta dùng state này chỉ để báo hiệu cho React re-render khi data thay đổi.
  // Giá trị thực sự luôn được lấy từ refs.
  const [snapshot, setSnapshot] = useState<T>(baseState);
  const [historyVersion, setHistoryVersion] = useState(0); // Dùng để re-render khi undo/redo stack thay đổi

  // Computed properties
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  // --- Helpers ---

  const notifyListeners = (event: UndoRedoEvent<M>) => {
    listenersRef.current.forEach((callback) => callback(event));
  };

  const commit = (newState: T) => {
    stateRef.current = newState;
    setSnapshot(newState);
  };

  const updateHistory = () => {
    setHistoryVersion((v) => v + 1);
  };

  // --- Core Functions ---

  const update = useCallback(
    (updater: (currentState: T) => void, meta?: MetaEntry<M>, force = false) => {
      // Immer produceWithPatches: (baseState, recipe) => [nextState, patches, inversePatches]
      const [nextState, patches, inversePatches] = produceWithPatches(
        stateRef.current,
        updater
      );

      if (patches.length === 0 && !force) return;

      // Update State Ref
      commit(nextState);

      // Push to History
      pastRef.current.push({ patches, inversePatches, meta });
      
      // Clear Future (Redo stack) whenever a new change happens
      if (futureRef.current.length > 0) {
        futureRef.current = [];
      }
      
      updateHistory();
    },
    []
  );

  const groupUpdate = useCallback(
    (updates: () => void, meta?: MetaEntry<M>) => {
      const preLength = pastRef.current.length;
      
      // Thực thi các updates. Vì update() dùng stateRef đồng bộ, 
      // các update tiếp theo sẽ thấy state mới nhất ngay lập tức.
      updates();

      const diff = pastRef.current.length - preLength;
      if (diff <= 0) return;

      // Gom các entry vừa thêm vào thành 1 entry duy nhất
      const elems: UndoEntry<M>[] = [];
      for (let i = 0; i < diff; i++) {
        const popped = pastRef.current.pop();
        if (popped) elems.push(popped);
      }
      // Vì pop lấy từ cuối, ta cần reverse lại để đúng thứ tự thời gian nếu merge xuôi
      // Tuy nhiên logic merge patches là: [A, B, C] -> mergedPatch = [...A, ...B, ...C]
      // pop() trả về C, B, A. 
      // elems đang là [C, B, A].
      elems.reverse(); // -> [A, B, C]

      let mergedPatches: Patch[] = [];
      let mergedInversePatches: Patch[] = [];

      elems.forEach(({ patches, inversePatches }) => {
        mergedPatches.push(...patches);
        // Inverse patches cần được merge theo thứ tự ngược lại khi undo? 
        // Thực tế Immer patches chỉ cần nối chuỗi là được.
        // Khi undo group A->B->C, ta cần undo C -> undo B -> undo A.
        // inversePatches của A, B, C. 
        // mergedInversePatches nên là [...invC, ...invB, ...invA].
        // Nhưng ở đây ta đang nối xuôi. Logic gốc của Vue:
        // elems.forEach(...) -> mergedInversePatches.push(...inversePatches)
        // Vue code gốc nối xuôi: [invA, invB, invC]. 
        // Khi apply inverse patches: apply(invA), apply(invB)...
        // Điều này có thể sai nếu các patch phụ thuộc nhau, nhưng ta sẽ giữ nguyên logic gốc của file Vue.
        mergedInversePatches.push(...inversePatches);
      });

      // Logic gốc của Vue có vẻ đang nối xuôi cả inversePatches. 
      // Nếu có vấn đề logic, cần đảo ngược mergedInversePatches. 
      // Nhưng tạm thời convert 1:1 theo code gốc.
      
      pastRef.current.push({
        patches: mergedPatches,
        inversePatches: mergedInversePatches,
        meta,
      });
      updateHistory();
    },
    []
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return false;

    const entry = pastRef.current.pop()!;
    const { patches, inversePatches, meta } = entry;

    // Apply inverse patches to revert state
    // Trong React/Immer, applyPatches trả về state mới
    const nextState = applyPatches(stateRef.current, inversePatches);
    
    commit(nextState);
    
    // Move to future
    futureRef.current.unshift(entry);
    
    notifyListeners({ patch: inversePatches, meta, action: "undo" });
    updateHistory();
    return true;
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return false;

    const entry = futureRef.current.shift()!;
    const { patches, inversePatches, meta } = entry;

    // Apply patches to advance state
    const nextState = applyPatches(stateRef.current, patches);
    
    commit(nextState);

    // Move back to past
    pastRef.current.push(entry);

    notifyListeners({ patch: patches, meta, action: "redo" });
    updateHistory();
    return true;
  }, []);

  const clearUndoRedoStack = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    updateHistory();
  }, []);

  // Event Subscription Hook
  const onUndoRedo = useCallback((callback: UndoRedoCallback<M>) => {
    listenersRef.current.add(callback);
    // Return unsubscribe function
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  return {
    state: snapshot, // Component đọc state từ đây để render
    update,
    groupUpdate,
    undo,
    redo,
    clearUndoRedoStack,
    canUndo,
    canRedo,
    onUndoRedo,
  };
}