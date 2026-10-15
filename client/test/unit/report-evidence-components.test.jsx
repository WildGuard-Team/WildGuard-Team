import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import EvidenceUploader from '../../src/features/community-reports/components/EvidenceUploader.jsx';
import EvidencePreviewCard from '../../src/features/community-reports/components/EvidencePreviewCard.jsx';
import EvidenceGallery from '../../src/features/community-reports/components/EvidenceGallery.jsx';
import ReviewAttachments from '../../src/features/community-reports/components/ReviewAttachments.jsx';

beforeEach(() => {
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`); URL.revokeObjectURL = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false; });
});
const image = (name = 'elephant.png') => new File(['pixels'], name, { type: 'image/png', lastModified: 1 });

describe('evidence selection and previews', () => {
  it('adds dropped or chosen files, rejects unsupported/duplicate input and removes a selection', () => {
    function Wrapper() { const [files, setFiles] = useState([]); return <EvidenceUploader files={files} onChange={setFiles} />; }
    const { container } = render(<Wrapper />);
    const zone = container.querySelector('.evidence-drop-zone');
    fireEvent.dragEnter(zone); expect(zone.classList.contains('is-drag-active')).toBe(true);
    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone); expect(zone.classList.contains('is-drag-active')).toBe(false);
    const chosen = image();
    fireEvent.drop(zone, { dataTransfer: { files: [chosen, new File(['x'], 'script.js', { type: 'text/javascript' })] } });
    expect(screen.getByText('Selected files (1 of 3)')).toBeTruthy();
    expect(screen.getByText('Only JPG, PNG, WEBP, and MP4 files are allowed.')).toBeTruthy();
    fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [chosen] } });
    expect(screen.getByText('This file has already been selected.')).toBeTruthy();
    expect(container.querySelector('input[type=file]').value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Remove elephant.png' }));
    expect(screen.getByText('Selected files (0 of 3)')).toBeTruthy();
    expect(screen.queryByText('This file has already been selected.')).toBeNull();
    const inputClick = vi.spyOn(container.querySelector('input[type=file]'), 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Browse Files' })); expect(inputClick).toHaveBeenCalledTimes(1);
  });

  it('image and video previews use temporary blob URLs, release replaced URLs, and tolerate unrecovered metadata', () => {
    const remove = vi.fn();
    const view = render(<EvidencePreviewCard file={image()} onRemove={remove} />);
    expect(screen.getByRole('img', { name: 'Preview of elephant.png' }).getAttribute('src')).toBe('blob:elephant.png');
    fireEvent.click(screen.getByRole('button', { name: 'Remove elephant.png' })); expect(remove).toHaveBeenCalledTimes(1);
    const video = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
    view.rerender(<EvidencePreviewCard file={video} compact onRemove={remove} />);
    expect(screen.getByLabelText('Preview clip.mp4').tagName).toBe('VIDEO');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:elephant.png');
    view.rerender(<EvidencePreviewCard file={video} />);
    expect(screen.getByText('▶')).toBeTruthy();
    view.rerender(<EvidencePreviewCard file={{ name: '', type: 'image/png' }} />);
    expect(screen.queryByRole('img')).toBeNull(); expect(screen.queryByRole('button')).toBeNull();
    view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:clip.mp4');
  });

  it('review attachments show restoring, recovery, warning, empty and full-file states with working actions', () => {
    const edit = vi.fn(); const skip = vi.fn(); const remove = vi.fn();
    const props = { files: [], onEdit: edit, onSkip: skip, onRemove: remove };
    const view = render(<ReviewAttachments {...props} isRestoring />);
    expect(screen.getByRole('status').textContent).toContain('Restoring attached evidence');
    view.rerender(<ReviewAttachments {...props} recoveryRequired />);
    expect(screen.getByText(/evidence files could not be recovered/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select evidence again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue without evidence' }));
    expect(edit).toHaveBeenCalledTimes(1); expect(skip).toHaveBeenCalledTimes(1);
    view.rerender(<ReviewAttachments {...props} warning="Refresh recovery unavailable" />);
    expect(screen.getByRole('status').textContent).toBe('Refresh recovery unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Add Evidence' }));
    view.rerender(<ReviewAttachments {...props} files={[image()]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add File' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove elephant.png' }));
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ name: 'elephant.png' }));
    view.rerender(<ReviewAttachments {...props} files={[image(), image('deer.png'), image('park.png')]} />);
    expect(screen.queryByRole('button', { name: 'Add File' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit evidence' })); expect(edit).toHaveBeenCalledTimes(4);
  });
});

describe('submitted report evidence gallery', () => {
  it.each([undefined, null, [], {}])('shows empty evidence for %j', (evidence) => {
    render(<EvidenceGallery evidence={evidence} />);
    expect(screen.getByText('No evidence was attached to this report.')).toBeTruthy();
  });

  it.each([
    undefined, '', 'not a url', 'http://files.example.com/photo.jpg', 'javascript:alert(1)',
    'https://user:password@files.example.com/photo.jpg', 'https://localhost/photo.jpg',
    'https://files.local/photo.jpg', 'https://files.internal/photo.jpg', 'https://foo.localhost/photo.jpg',
    'https://0.0.0.1/photo.jpg', 'https://10.0.0.1/photo.jpg', 'https://127.0.0.1/photo.jpg',
    'https://224.0.0.1/photo.jpg', 'https://169.254.1.1/photo.jpg', 'https://172.16.0.1/photo.jpg',
    'https://192.168.1.1/photo.jpg', 'https://100.64.0.1/photo.jpg', 'https://198.18.0.1/photo.jpg', 'https://198.19.0.1/photo.jpg',
  ])('never renders a navigable unsafe evidence URL: %s', (secureUrl) => {
    render(<EvidenceGallery evidence={[{ secureUrl, mimeType: 'image/png', originalName: 'Sensitive file' }]} />);
    expect(screen.getByText('File unavailable')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull(); expect(screen.queryByRole('button')).toBeNull();
  });

  it('supports unnamed non-image evidence with a safe external file link', () => {
    render(<EvidenceGallery evidence={[null, { secureUrl: 'https://files.example.com/clip.mp4', mimeType: 'video/mp4' }, { secureUrl: 'https://8.8.8.8/file', originalName: 'Public document' }]} />);
    expect(screen.getByText('Evidence file 1')).toBeTruthy(); expect(screen.getByText('Evidence file 2')).toBeTruthy();
    const links = screen.getAllByRole('link', { name: /Open file/ });
    expect(links).toHaveLength(2); expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
  });

  it.each(['close', 'escape', 'backdrop'])('opens a real image preview and restores focus after %s', async (action) => {
    const { container } = render(<EvidenceGallery evidence={[{ secureUrl: 'https://files.example.com/deer.png', resourceType: 'image', originalName: 'Deer' }]} />);
    const trigger = screen.getByRole('button', { name: 'Preview image: Deer' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Deer' });
    expect(dialog.open).toBe(true); expect(screen.getByRole('img', { name: 'Evidence: Deer' })).toBeTruthy();
    fireEvent.click(screen.getByRole('heading', { name: 'Deer' })); expect(dialog.open).toBe(true);
    if (action === 'close') fireEvent.click(screen.getByRole('button', { name: 'Close image preview' }));
    if (action === 'escape') fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    if (action === 'backdrop') fireEvent.click(dialog);
    await waitFor(() => expect(container.querySelector('dialog').open).toBe(false));
    expect(document.activeElement).toBe(trigger);
  });

  it('a broken thumbnail falls back to a file; a broken full-size preview stays closable with original-file access', async () => {
    const { container } = render(<EvidenceGallery evidence={[{ secureUrl: 'https://files.example.com/one.png', mimeType: 'IMAGE/PNG', originalName: 'One' }, { secureUrl: 'https://files.example.com/two.png', mimeType: 'image/png', originalName: 'Two' }]} />);
    fireEvent.error(container.querySelector('img'));
    expect(screen.queryByRole('button', { name: 'Preview image: One' })).toBeNull();
    expect(screen.getByText('Image preview unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Preview image: Two' }));
    fireEvent.error(screen.getByRole('img', { name: 'Evidence: Two' }));
    expect(screen.queryByRole('button', { name: 'Preview image: Two' })).toBeNull();
    expect(screen.getByRole('link', { name: /Open original file/ }).getAttribute('href')).toBe('https://files.example.com/two.png');
    fireEvent.click(screen.getByRole('button', { name: 'Close image preview' }));
    await waitFor(() => expect(document.activeElement.getAttribute('href')).toBe('https://files.example.com/two.png'));
  });
});
