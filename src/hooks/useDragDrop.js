import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom drag-and-drop hook using pointer events.
 * Creates a ghost element that follows the cursor.
 * Drop zones are identified by `data-drop-zone` attributes.
 * Click is preserved if movement < 5px.
 */
export function useDragDrop({ onDrop }) {
  const [dragging, setDragging] = useState(null); // { id, sourceZone }
  const [dragOver, setDragOver] = useState(null); // zone id
  const ghostRef = useRef(null);
  const startPos = useRef(null);
  const moved = useRef(false);

  // Create ghost element
  useEffect(() => {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.display = 'none';
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    return () => { ghost.remove(); };
  }, []);

  const handlePointerDown = useCallback((e, id, sourceZone, text) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    moved.current = false;

    const ghost = ghostRef.current;
    if (ghost) {
      ghost.textContent = text || '';
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
    }

    // Set pointer capture for cross-element tracking
    e.currentTarget.setPointerCapture(e.pointerId);

    setDragging({ id, sourceZone });
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    if (!moved.current && Math.abs(dx) + Math.abs(dy) > 5) {
      moved.current = true;
      if (ghostRef.current) {
        ghostRef.current.style.display = 'block';
      }
    }

    if (moved.current && ghostRef.current) {
      ghostRef.current.style.left = e.clientX + 'px';
      ghostRef.current.style.top = e.clientY + 'px';
    }

    // Find drop zone under cursor
    if (moved.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const dropZone = el?.closest?.('[data-drop-zone]');
      setDragOver(dropZone?.dataset?.dropZone || null);
    }
  }, [dragging]);

  const handlePointerUp = useCallback((e) => {
    if (ghostRef.current) {
      ghostRef.current.style.display = 'none';
    }

    if (dragging && moved.current && dragOver) {
      onDrop?.(dragging.id, dragging.sourceZone, dragOver);
    }

    // Release pointer capture
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    setDragging(null);
    setDragOver(null);
    startPos.current = null;
  }, [dragging, dragOver, onDrop]);

  const makeDraggable = useCallback((id, sourceZone, text) => ({
    onPointerDown: (e) => handlePointerDown(e, id, sourceZone, text),
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    style: dragging?.id === id ? { opacity: 0.5 } : undefined,
    'data-dragging': dragging?.id === id || undefined,
  }), [handlePointerDown, handlePointerMove, handlePointerUp, dragging]);

  const makeDropZone = useCallback((zone) => ({
    'data-drop-zone': zone,
    'data-drag-over': dragOver === zone ? 'true' : undefined,
  }), [dragOver]);

  return {
    dragging,
    dragOver,
    makeDraggable,
    makeDropZone,
    isDragging: moved.current && !!dragging,
  };
}
