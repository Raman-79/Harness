'use client';
interface Props {
  onClose: () => void;
  onAdded: () => void;
}
export function AddCustomServerModal({ onClose, onAdded }: Props) {
  return (
    <div data-testid="add-custom-modal-stub">
      <button onClick={onClose}>cancel</button>
      <button onClick={onAdded}>ok</button>
    </div>
  );
}
