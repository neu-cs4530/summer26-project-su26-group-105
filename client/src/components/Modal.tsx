import "./Modal.css";

type ModalProps = React.PropsWithChildren<{
  close: () => void;
}>;

/**
 * Component for displaying a modal dialog.
 * @param close Function to call when the modal should be closed
 * @param children The content to display inside the modal
 */
export default function Modal({ close, children }: ModalProps) {
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  return (
    <div className="overlay" onClick={onOverlayClick}>
      <div className="modal">{children}</div>
    </div>
  );
}
